export class ApiError extends Error {
  constructor(key, status = 400) { super(key); this.key = key; this.status = status; }
}
export function phoneNumber(value) {
  if (typeof value !== 'string' || value.length > 30) throw new ApiError('invalid_input');
  let p = value.replace(/[\s()-]/g, '');
  if (p.startsWith('0091')) p = p.slice(4);
  else if (p.startsWith('+91')) p = p.slice(3);
  if (!/^[6-9]\d{9}$/.test(p)) throw new ApiError('invalid_input');
  return `+91${p}`;
}
export function customerName(value) {
  if (typeof value !== 'string') throw new ApiError('invalid_input');
  const name = value.trim();
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) throw new ApiError('invalid_input');
  return name;
}
export function playDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function randomInt(min, max) {
  const range = max - min + 1, cutoff = Math.floor(4294967296 / range) * range;
  let v; do { v = crypto.getRandomValues(new Uint32Array(1))[0]; } while (v >= cutoff);
  return min + v % range;
}
export function couponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'JB-' + Array.from({ length: 5 }, () => chars[randomInt(0, chars.length - 1)]).join('');
}
export function outcome(reaction, minimum = 120, threshold = 450, early = false) {
  return early || reaction < minimum ? 'too_early' : reaction < threshold ? 'won' : 'lost';
}
export function csvCell(value) {
  const raw = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function primary(db) { return db.withSession ? db.withSession('first-primary') : db; }
export function result(row) {
  return { id: row.id, status: row.status, reactionMs: row.reaction_ms, code: row.code,
    prize: { label: row.prize_label, terms: row.prize_terms }, expiresAt: row.expires_at,
    waitingDelayMs: row.waiting_delay_ms, expiresAtMs: row.expires_at_ms };
}
export async function loadSession(db, token) {
  return db.prepare('SELECT a.*,c.code,c.expires_at,s.waiting_delay_ms,s.flash_issued_ms,s.latency_baseline_ms,s.expires_at_ms,s.used FROM plays a JOIN play_sessions s ON s.play_id=a.id LEFT JOIN coupons c ON c.play_id=a.id WHERE s.token=?').bind(token).first();
}
export async function reserve(db, token, config, baseline, now = Date.now()) {
  const delay = randomInt(1500, 4500), expiry = now + delay + baseline + 10000;
  try {
    await db.batch([
      db.prepare(`INSERT INTO plays(request_key,created_at,win_threshold_ms,minimum_reaction_ms,prize_label,prize_terms,config_version,coupon_validity_ms)
        VALUES(?,?,?,?,?,?,?,?)`).bind(token, now, config.win_threshold_ms, config.minimum_reaction_ms, config.prize_label, config.prize_terms, config.version, config.coupon_validity_ms),
      db.prepare('INSERT INTO play_sessions(token,play_id,flash_issued_ms,latency_baseline_ms,waiting_delay_ms,expires_at_ms,created_at) SELECT ?,id,?,?,?,?,? FROM plays WHERE request_key=?')
        .bind(token, now, baseline, delay, expiry, now, token)
    ]);
  } catch (error) {
    const existing = await loadSession(db, token);
    if (existing) return existing;
    throw error;
  }
  return loadSession(db, token);
}
export async function finalize(db, token, now = Date.now(), early = false) {
  const row = await loadSession(db, token);
  if (!row) throw new ApiError('invalid_session', 404);
  if (row.status !== 'reserved') return row;
  const reaction = Math.round(now - row.flash_issued_ms - row.latency_baseline_ms - row.waiting_delay_ms);
  const status = now > row.expires_at_ms ? 'expired' : outcome(reaction, row.minimum_reaction_ms, row.win_threshold_ms, early);
  await db.batch([
    db.prepare("UPDATE plays SET status=?,completed_at=?,reaction_ms=? WHERE id=? AND status='reserved'").bind(status, now, status === 'expired' ? null : reaction, row.id),
    db.prepare("UPDATE play_sessions SET used=1 WHERE token=? AND EXISTS(SELECT 1 FROM plays WHERE id=play_sessions.play_id AND status!='reserved')").bind(token)
  ]);
  return loadSession(db, token);
}
export async function claim(db, token, name, phone, now = Date.now(), makeCode = couponCode) {
  const row = await loadSession(db, token);
  if (!row) throw new ApiError('invalid_session', 404);
  if (row.status !== 'won') throw new ApiError('win_required', 409);
  if (row.code) return row;
  for (let i = 0; i < 5; i++) {
    try {
      await db.batch([
        db.prepare(`INSERT INTO coupons(play_id,name,phone,code,created_at,expires_at,prize_label,prize_terms)
          SELECT id,?,?,?,?,?,?,? FROM plays WHERE id=? AND status='won'
          AND NOT EXISTS(SELECT 1 FROM coupons WHERE play_id=?)
          AND NOT EXISTS(SELECT 1 FROM coupon_locks WHERE phone=? AND expires_at>?)`)
          .bind(name, phone, makeCode(), now, now + row.coupon_validity_ms, row.prize_label, row.prize_terms, row.id, row.id, phone, now),
        db.prepare(`INSERT INTO coupon_locks(phone,coupon_id,expires_at)
          SELECT phone,id,expires_at FROM coupons WHERE play_id=?
          ON CONFLICT(phone) DO UPDATE SET coupon_id=excluded.coupon_id,expires_at=excluded.expires_at
          WHERE coupon_locks.expires_at<=? OR coupon_locks.coupon_id=excluded.coupon_id`).bind(row.id, now)
      ]);
      const claimed = await loadSession(db, token);
      if (claimed.code) return claimed;
      throw new ApiError('active_coupon', 409);
    } catch (error) {
      if (!String(error).includes('coupons.code')) throw error;
    }
  }
  throw new ApiError('temporarily_unavailable', 503);
}
export async function redeem(db, id, now = Date.now()) {
  const [update] = await db.batch([
    db.prepare("UPDATE coupons SET redeemed=1,redeemed_at=? WHERE id=? AND redeemed=0 AND expires_at>?").bind(now, id, now),
    db.prepare('DELETE FROM coupon_locks WHERE coupon_id=? AND EXISTS(SELECT 1 FROM coupons WHERE id=? AND redeemed=1)').bind(id, id)
  ]);
  const row = await db.prepare('SELECT redeemed,redeemed_at,expires_at FROM coupons WHERE id=?').bind(id).first();
  if (!row) throw new ApiError('invalid_coupon', 404);
  if (!row.redeemed) throw new ApiError('coupon_expired', 409);
  return { ok: true, alreadyRedeemed: update.meta.changes === 0, redeemedAt: row.redeemed_at };
}
export async function incrementLimit(db, key, limit, now = Date.now()) {
  const window = Math.floor(now / 60000);
  const row = await db.prepare('INSERT INTO rate_limits(window_key,count,expires_at) VALUES(?,1,?) ON CONFLICT(window_key) DO UPDATE SET count=count+1 RETURNING count')
    .bind(`${key}:${window}`, (window + 2) * 60000).first();
  if (row.count > limit) throw new ApiError('too_many_requests', 429);
}
export async function cleanup(db, now = Date.now()) {
  const config = await db.prepare('SELECT retention_days FROM config WHERE id=1').first();
  await db.batch([
    db.prepare("UPDATE plays SET status='expired',completed_at=? WHERE status='reserved' AND id IN(SELECT play_id FROM play_sessions WHERE expires_at_ms<?)").bind(now, now),
    db.prepare("UPDATE play_sessions SET used=1 WHERE used=0 AND play_id IN(SELECT id FROM plays WHERE status!='reserved')"),
    db.prepare('DELETE FROM coupons WHERE created_at<? AND expires_at<=?').bind(now - config.retention_days * 86400000, now),
    db.prepare('DELETE FROM plays WHERE created_at<? AND NOT EXISTS(SELECT 1 FROM coupons WHERE coupons.play_id=plays.id)').bind(now - config.retention_days * 86400000),
    db.prepare("UPDATE attempts SET status='expired',completed_at=? WHERE status='reserved' AND id IN(SELECT attempt_id FROM sessions WHERE expires_at_ms<?)").bind(now, now),
    db.prepare("UPDATE sessions SET used=1 WHERE used=0 AND attempt_id IN(SELECT id FROM attempts WHERE status!='reserved')"),
    db.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now),
    db.prepare('DELETE FROM measurements WHERE issued_ms<?').bind(now - 120000),
    db.prepare('DELETE FROM staff_sessions WHERE expires_at<?').bind(now),
    db.prepare("DELETE FROM attempts WHERE created_at<? AND play_date<? AND (expires_at IS NULL OR expires_at<?)").bind(now - config.retention_days * 86400000, playDate(now), now),
    db.prepare('DELETE FROM sessions WHERE used=1 AND created_at<?').bind(now - 86400000)
  ]);
}
