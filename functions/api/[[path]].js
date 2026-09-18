import { ApiError, digest, phoneNumber, customerName, primary, loadSession, reserve, finalize, claim, result, redeem, incrementLimit, cleanup } from '../../server/core.js';

const TEST_SECRET = '1x0000000000000000000000000000000AA';
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const cookies = request => Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(x => x.trim().split('=')).filter(x => x.length === 2));
const cookie = (request, name, value, age) => `${name}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
const local = request => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
async function body(request) {
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) throw new ApiError('invalid_input', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('invalid_input');
  let total = 0, chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > 4096) { await reader.cancel(); throw new ApiError('invalid_input', 413); } chunks.push(value); }
  try { const bytes = new Uint8Array(total); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; } const data = JSON.parse(new TextDecoder().decode(bytes)); if (!data || Array.isArray(data) || typeof data !== 'object') throw Error(); return data; } catch { throw new ApiError('invalid_input'); }
}
async function bearer(request) {
  const raw = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) throw new ApiError('invalid_session', 401);
  return digest(raw);
}
async function staff(request, env, db) {
  const token = cookies(request).staff;
  if (!token || !env.STAFF_PASSWORD) throw new ApiError('unauthorized', 401);
  const row = await db.prepare('SELECT * FROM staff_sessions WHERE token=? AND expires_at>? AND password_version=?').bind(await digest(token), Date.now(), await digest(env.STAFF_PASSWORD)).first();
  if (!row) throw new ApiError('unauthorized', 401);
}
async function verify(request, env, value) {
  if (!env.TURNSTILE_SECRET || (!local(request) && env.TURNSTILE_SECRET === TEST_SECRET)) throw new ApiError('configuration_required', 503);
  if (typeof value !== 'string' || !value || value.length > 2048) throw new ApiError('verification_failed');
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: value, idempotency_key: crypto.randomUUID() }) });
  const check = await response.json();
  if (!check.success || (!local(request) && (check.hostname !== new URL(request.url).hostname || check.action !== 'play'))) throw new ApiError('verification_failed');
}
export async function onRequest({ request, env }) {
  const received = Date.now();
  try {
    const path = new URL(request.url).pathname.replace('/api/', '');
    const expected = path === 'result' || path === 'config' ? 'GET' : 'POST';
    if (request.method !== expected) return json({ error: 'method_not_allowed' }, 405, { Allow: expected });
    if (request.method === 'POST') {
      const origin = request.headers.get('Origin');
      const url = new URL(request.url);
      // Vite development proxy forwards the browser origin on port 5173.
      const devOrigin = local(request) && ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin);
      if ((!origin && !local(request)) || (origin && origin !== url.origin && !devOrigin)) throw new ApiError('forbidden', 403);
    }
    if (!env.DB) throw new ApiError('configuration_required', 503);
    const db = primary(env.DB);
    const input = request.method === 'POST' ? await body(request) : {};
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const ipKey = await digest(ip);
    if (path === 'config') {
      const cfg = await db.prepare('SELECT prize_label,prize_terms,retention_days,approved FROM config WHERE id=1').first();
      return json({ prize: { label: cfg.prize_label, terms: cfg.prize_terms }, retentionDays: cfg.retention_days, enabled: local(request) || (env.GAME_ENABLED === 'true' && cfg.approved === 1) });
    }
    if (path === 'ping') {
      await incrementLimit(db, `ping:${ipKey}`, 180);
      let owner = cookies(request).sampling;
      if (!owner || !/^[a-f0-9]{64}$/.test(owner)) owner = await digest(crypto.randomUUID());
      if (input.challenge) {
        if (typeof input.challenge !== 'string' || input.challenge.length > 100) throw new ApiError('invalid_input');
        const sample = await db.prepare('UPDATE measurements SET duration_ms=?-issued_ms WHERE token=? AND owner=? AND duration_ms IS NULL AND issued_ms>? RETURNING duration_ms').bind(received, input.challenge, owner, received - 10000).first();
        if (!sample) throw new ApiError('invalid_sample');
        return json({ sample: sample.duration_ms });
      }
      const maintenance = await db.prepare('UPDATE maintenance SET last_run=? WHERE id=1 AND last_run<? RETURNING id').bind(received, received-60000).first();
      if (maintenance) await cleanup(db, received);
      const challenge = crypto.randomUUID();
      await db.prepare('INSERT INTO measurements(token,owner,issued_ms) VALUES(?,?,?)').bind(challenge, owner, Date.now()).run();
      return json({ challenge }, 200, { 'Set-Cookie': cookie(request, 'sampling', owner, 120) });
    }
    if (path === 'flash') {
      const token = await bearer(request);
      const existing = await loadSession(db, token);
      if (existing) return json(result(existing.status === 'reserved' && received > existing.expires_at_ms ? await finalize(db, token, received) : existing));
      await incrementLimit(db, `start:${ipKey}`, 60);
      const cfg = await db.prepare('SELECT * FROM config WHERE id=1').first();
      if (!local(request) && (env.GAME_ENABLED !== 'true' || !cfg.approved)) throw new ApiError('game_unavailable', 503);
      const samples = (await db.prepare('SELECT duration_ms FROM measurements WHERE owner=? AND duration_ms IS NOT NULL AND issued_ms>? ORDER BY issued_ms DESC LIMIT 3').bind(cookies(request).sampling || '', received - 120000).all()).results.map(x => x.duration_ms).sort((a,b) => a-b);
      if (samples.length !== 3) throw new ApiError('connection_check_required');
      if (samples[1] > 1000 || samples[2] - samples[0] > 150) throw new ApiError('high_latency');
      return json(result(await reserve(db, token, cfg, samples[1], Date.now())));
    }
    if (path === 'claim') {
      const token = await bearer(request);
      await incrementLimit(db, `claim:${ipKey}`, 30);
      const row = await loadSession(db, token);
      if (!row) throw new ApiError('invalid_session', 404);
      if (row.status !== 'won') throw new ApiError('win_required', 409);
      if (row.code) return json(result(row));
      const name = customerName(input.name), phone = phoneNumber(input.phone);
      await verify(request, env, input.turnstileToken);
      return json(result(await claim(db, token, name, phone, Date.now())));
    }
    if (path === 'tap' || path === 'result') {
      const token = await bearer(request);
      await incrementLimit(db, `result:${token}`, 60);
      const row = await loadSession(db, token);
      if (!row) throw new ApiError('invalid_session', 404);
      if (path === 'tap' && input.early !== undefined && typeof input.early !== 'boolean') throw new ApiError('invalid_input');
      return json(result(path === 'tap' || (row.status === 'reserved' && received > row.expires_at_ms) ? await finalize(db, token, received, input.early === true) : row));
    }
    if (path === 'staff/login') {
      await incrementLimit(db, `login:${ipKey}`, 10);
      if (!env.STAFF_PASSWORD || (!local(request) && env.STAFF_PASSWORD.startsWith('local-demo'))) throw new ApiError('configuration_required', 503);
      if (typeof input.password !== 'string' || input.password.length > 200 || await digest(input.password) !== await digest(env.STAFF_PASSWORD)) throw new ApiError('unauthorized', 401);
      const raw = crypto.randomUUID();
      await db.prepare('INSERT INTO staff_sessions(token,expires_at,password_version) VALUES(?,?,?)').bind(await digest(raw), received + 8 * 3600000, await digest(env.STAFF_PASSWORD)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, 'staff', raw, 8 * 3600) });
    }
    if (path.startsWith('staff/')) {
      await staff(request, env, db);
      await incrementLimit(db, `staff:${ipKey}`, 120);
      if (path === 'staff/logout') {
        await db.prepare('DELETE FROM staff_sessions WHERE token=?').bind(await digest(cookies(request).staff)).run();
        return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, 'staff', '', 0) });
      }
      if (path === 'staff/search') {
        if (typeof input.query !== 'string' || input.query.length > 40) throw new ApiError('invalid_input');
        const q = input.query.trim().toUpperCase();
        const code = /^JB-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(q);
        const rows = await db.prepare(`SELECT c.*,p.reaction_ms FROM coupons c JOIN plays p ON p.id=c.play_id WHERE c.${code ? 'code' : 'phone'}=? ORDER BY c.created_at DESC LIMIT 10`).bind(code ? q : phoneNumber(q)).all();
        return json({ results: rows.results });
      }
      if (path === 'staff/redeem') {
        if (!Number.isSafeInteger(input.id) || input.id < 1) throw new ApiError('invalid_input');
        return json(await redeem(db, input.id, received));
      }
    }
    throw new ApiError('not_found', 404);
  } catch (error) {
    // Do not log request bodies, tokens, passwords, phone numbers, or SQL parameters.
    return json({ error: error instanceof ApiError ? error.key : 'temporarily_unavailable' }, error instanceof ApiError ? error.status : 503);
  }
}
