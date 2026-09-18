import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { phoneNumber, customerName, playDate, outcome, couponCode, digest, csvCell, reserve, finalize, claim, redeem, loadSession, incrementLimit, cleanup } from '../server/core.js';
import { onRequest } from '../functions/api/[[path]].js';

test('normalization, date boundary, prize boundaries and export escaping', async () => {
  assert.equal(phoneNumber('0091 98765-43210'), '+919876543210');
  assert.equal(phoneNumber('+91 (98765) 43210'), '+919876543210');
  assert.throws(() => phoneNumber('1234567890'));
  assert.equal(customerName('  =Name  '), '=Name');
  assert.throws(() => customerName('a'.repeat(81)));
  assert.equal(playDate(Date.parse('2026-09-18T18:29:59Z')), '2026-09-18');
  assert.equal(playDate(Date.parse('2026-09-18T18:30:00Z')), '2026-09-19');
  assert.deepEqual([119,120,449,450].map(v => outcome(v)), ['too_early','won','won','lost']);
  assert.equal(outcome(300,120,450,true),'too_early');
  for(let i=0;i<100;i++) assert.match(couponCode(), /^JB-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
  assert.equal(csvCell(' =SUM(1,2)'), '"\' =SUM(1,2)"');
  assert.equal(csvCell('a"b'), '"a""b"');
});

async function database() {
  const mf = new Miniflare({ modules:true, script:'export default {fetch(){return new Response("ok")}}', compatibilityDate:'2026-08-06', d1Databases:['DB'] });
  const db = await mf.getD1Database('DB');
  const sql = (await Promise.all(['0001_initial.sql','0002_maintenance.sql','0003_prize.sql','0004_retention.sql','0005_play_then_claim.sql'].map(file=>readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8')))).join('\n');
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run();
  const config = await db.prepare('SELECT * FROM config WHERE id=1').first();
  assert.equal(config.prize_label,'One free sarbath');
  assert.equal(config.coupon_validity_ms,604800000);
  assert.equal(config.retention_days,30);
  return { mf, db, config };
}

test('anonymous reservation, tap finalization and coupon claim lifecycle', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now(), token = await digest(crypto.randomUUID());
    // Anonymous reserve — new signature: (db, token, config, baseline, now)
    const play = await reserve(db, token, config, 50, now);
    assert.equal(play.status, 'reserved');
    assert.ok(play.waiting_delay_ms >= 1500 && play.waiting_delay_ms <= 4500);
    // Idempotent retry returns same play
    const same = await reserve(db, token, config, 50, now);
    assert.equal(same.id, play.id);
    // Finalize with a winning reaction
    const tapTime = play.flash_issued_ms + play.waiting_delay_ms + play.latency_baseline_ms + 300;
    const result = await finalize(db, token, tapTime);
    assert.equal(result.status, 'won');
    assert.equal(result.code, null); // No coupon until claim
    // Claim with identity
    const claimed = await claim(db, token, 'Test User', '+919876543210', tapTime + 1000);
    assert.equal(claimed.status, 'won');
    assert.ok(claimed.code);
    assert.equal(claimed.expires_at, tapTime + 1000 + config.coupon_validity_ms);
    // Idempotent claim returns same coupon
    const retry = await claim(db, token, 'Test User', '+919876543210', tapTime + 2000);
    assert.equal(retry.code, claimed.code);
    // Redeem
    const redemption = await redeem(db, claimed.id, tapTime + 5000);
    assert.equal(redemption.alreadyRedeemed, false);
    const dup = await redeem(db, claimed.id, tapTime + 6000);
    assert.equal(dup.alreadyRedeemed, true);
  } finally { await mf.dispose(); }
});

test('concurrent reservations create separate anonymous plays', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now();
    const tokenA = await digest(crypto.randomUUID()), tokenB = await digest(crypto.randomUUID());
    // Both should succeed since plays are anonymous (no phone uniqueness on plays)
    const [a, b] = await Promise.all([reserve(db, tokenA, config, 50, now), reserve(db, tokenB, config, 50, now)]);
    assert.notEqual(a.id, b.id);
    assert.equal(a.status, 'reserved');
    assert.equal(b.status, 'reserved');
  } finally { await mf.dispose(); }
});

test('active coupon blocks new claim for same phone until expiry', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now();
    const t1 = await digest(crypto.randomUUID()), t2 = await digest(crypto.randomUUID());
    const p1 = await reserve(db, t1, config, 20, now);
    const p2 = await reserve(db, t2, config, 20, now);
    // Win both
    await finalize(db, t1, p1.flash_issued_ms + p1.waiting_delay_ms + p1.latency_baseline_ms + 300);
    await finalize(db, t2, p2.flash_issued_ms + p2.waiting_delay_ms + p2.latency_baseline_ms + 300);
    // Claim first
    const c1 = await claim(db, t1, 'User', '+919876543210', now + 1000);
    assert.ok(c1.code);
    // Second claim for same phone should fail
    await assert.rejects(claim(db, t2, 'User', '+919876543210', now + 2000), err => err.key === 'active_coupon');
    // After expiry, same phone can claim
    const t3 = await digest(crypto.randomUUID());
    const p3 = await reserve(db, t3, config, 20, c1.expires_at + 1);
    await finalize(db, t3, p3.flash_issued_ms + p3.waiting_delay_ms + p3.latency_baseline_ms + 300);
    const c3 = await claim(db, t3, 'User', '+919876543210', c1.expires_at + 2000);
    assert.ok(c3.code);
    assert.notEqual(c3.code, c1.code);
  } finally { await mf.dispose(); }
});

test('claim requires a winning play — losses and reserved cannot claim', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now();
    // Loss
    const tLost = await digest(crypto.randomUUID());
    const pLost = await reserve(db, tLost, config, 20, now);
    await finalize(db, tLost, pLost.flash_issued_ms + pLost.waiting_delay_ms + pLost.latency_baseline_ms + 500);
    await assert.rejects(claim(db, tLost, 'User', '+919876543210', now + 1000), err => err.key === 'win_required');
    // Reserved (not yet tapped)
    const tRes = await digest(crypto.randomUUID());
    await reserve(db, tRes, config, 20, now);
    await assert.rejects(claim(db, tRes, 'User', '+919876543211', now + 1000), err => err.key === 'win_required');
    // Too early
    const tEarly = await digest(crypto.randomUUID());
    await reserve(db, tEarly, config, 20, now);
    await finalize(db, tEarly, now + 50, true);
    await assert.rejects(claim(db, tEarly, 'User', '+919876543212', now + 1000), err => err.key === 'win_required');
  } finally { await mf.dispose(); }
});

test('coupon code collision retries and exhaustion', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now();
    const t1 = await digest(crypto.randomUUID()), t2 = await digest(crypto.randomUUID());
    const p1 = await reserve(db, t1, config, 20, now);
    const p2 = await reserve(db, t2, config, 20, now);
    await finalize(db, t1, p1.flash_issued_ms + p1.waiting_delay_ms + p1.latency_baseline_ms + 300);
    await finalize(db, t2, p2.flash_issued_ms + p2.waiting_delay_ms + p2.latency_baseline_ms + 300);
    // First claim with fixed code
    await claim(db, t1, 'A', '+919876543221', now + 1000, () => 'JB-ABCDE');
    // Second claim with collision then success
    let calls = 0;
    const c2 = await claim(db, t2, 'B', '+919876543222', now + 1000, () => ++calls === 1 ? 'JB-ABCDE' : 'JB-ABCDF');
    assert.equal(calls, 2);
    assert.equal(c2.code, 'JB-ABCDF');
    // Exhausted collisions
    const t3 = await digest(crypto.randomUUID());
    const p3 = await reserve(db, t3, config, 20, now);
    await finalize(db, t3, p3.flash_issued_ms + p3.waiting_delay_ms + p3.latency_baseline_ms + 300);
    await assert.rejects(claim(db, t3, 'C', '+919876543223', now + 1000, () => 'JB-ABCDE'), err => err.key === 'temporarily_unavailable');
  } finally { await mf.dispose(); }
});

test('expiry, early play, limits and cleanup preserve active coupons', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now();
    // Too early tap
    const tEarly = await digest(crypto.randomUUID());
    const a = await reserve(db, tEarly, config, 20, now);
    assert.equal((await finalize(db, tEarly, now+100, true)).status, 'too_early');
    // Expired play
    const tExpired = await digest(crypto.randomUUID());
    const b = await reserve(db, tExpired, config, 20, now);
    assert.equal((await finalize(db, tExpired, b.expires_at_ms+1)).status, 'expired');
    // Rate limits
    const requests = await Promise.allSettled(Array.from({length:11}, () => incrementLimit(db, 'limit', 10, now)));
    assert.equal(requests.filter(r => r.status === 'rejected').length, 1);
    await cleanup(db, now+180000);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM rate_limits').first()).n, 0);
    // Old play with active coupon — should survive cleanup
    const tOld = await digest(crypto.randomUUID());
    const old = await reserve(db, tOld, config, 0, now - 40*86400000);
    // Make it win
    await db.prepare("UPDATE plays SET status='won',completed_at=?,reaction_ms=300 WHERE id=?").bind(now - 40*86400000 + 1, old.id).run();
    // Issue a coupon with long validity so it's still active
    await db.prepare("INSERT INTO coupons(play_id,name,phone,code,created_at,expires_at,prize_label,prize_terms) VALUES(?,?,?,?,?,?,?,?)").bind(old.id, 'Old User', '+919876543230', 'JB-OLDXX', now - 40*86400000, now + 20*86400000, config.prize_label, config.prize_terms).run();
    await cleanup(db, now);
    // Play survives because it has an active coupon referencing it
    assert.ok(await db.prepare('SELECT id FROM plays WHERE id=?').bind(old.id).first());
    // Old expired play without coupon — should be cleaned
    const tRemove = await digest(crypto.randomUUID());
    const remove = await reserve(db, tRemove, config, 0, now - 31*86400000);
    await finalize(db, tRemove, remove.expires_at_ms+1);
    await cleanup(db, now);
    assert.equal(await db.prepare('SELECT id FROM plays WHERE id=?').bind(remove.id).first(), null);
    // Recent play — should survive
    const tKeep = await digest(crypto.randomUUID());
    const keep = await reserve(db, tKeep, config, 0, now - 29*86400000);
    await finalize(db, tKeep, keep.expires_at_ms+1);
    await cleanup(db, now);
    assert.ok(await db.prepare('SELECT id FROM plays WHERE id=?').bind(keep.id).first());
  } finally { await mf.dispose(); }
});

test('API anonymous flash, claim, result recovery, staff authentication and origin checks', async () => {
  const {mf,db} = await database();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => Response.json({success: JSON.parse(options.body).response === 'valid-test'});
  try {
    const env = {DB:db, TURNSTILE_SECRET:'1x0000000000000000000000000000000AA', STAFF_PASSWORD:crypto.randomUUID(), GAME_ENABLED:'false'};
    const credential = crypto.randomUUID(); let sampling = ''; let staffCookie = '';
    const request = async (path, input, options = {}) => {
      const headers = {...(input === undefined ? {} : {'Content-Type':'application/json'}), ...(options.bearer ? {Authorization:`Bearer ${options.bearer}`} : {}), ...(options.cookie ? {Cookie:options.cookie} : {}), ...(options.origin ? {Origin:options.origin} : {})};
      const req = new Request(`${options.remote ? 'https://shop.example' : 'http://127.0.0.1:8788'}/api/${path}`, {method: input === undefined ? 'GET' : 'POST', headers, body: input === undefined ? undefined : JSON.stringify(input)});
      const r = await onRequest({request:req, env}); return {response:r, data:await r.json()};
    };
    // Staff auth check
    assert.equal((await request('staff/search', {query:'9876543210'})).response.status, 401);
    assert.equal((await request('staff/login', {password:env.STAFF_PASSWORD}, {origin:'https://evil.example'})).response.status, 403);
    // Connection sampling
    for (let i = 0; i < 3; i++) {
      const c = await request('ping', {}, {cookie:sampling}); sampling = c.response.headers.get('Set-Cookie').split(';')[0];
      assert.ok((await request('ping', {challenge:c.data.challenge}, {cookie:sampling})).data.sample >= 0);
    }
    // Flash is now anonymous — no name/phone/turnstile needed
    const options = {bearer:credential, cookie:sampling};
    await db.prepare('UPDATE measurements SET duration_ms=1501').run();
    assert.equal((await request('flash', {}, options)).data.error, 'high_latency');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM plays').first()).n, 0);
    await db.prepare('UPDATE measurements SET duration_ms=20').run();
    const first = await request('flash', {}, options); assert.equal(first.data.status, 'reserved');
    // Idempotent retry
    const retry = await request('flash', {}, options); assert.equal(retry.data.id, first.data.id);
    // Result with wrong credential
    assert.equal((await request('result', undefined, {bearer:crypto.randomUUID()})).response.status, 404);
    // Place synthetic timing at qualifying reaction
    await db.prepare('UPDATE play_sessions SET flash_issued_ms=?-waiting_delay_ms-latency_baseline_ms WHERE token=?').bind(Date.now()-250, await digest(credential)).run();
    const tapped = await request('tap', {early:false}, options); assert.equal(tapped.data.status, 'won');
    assert.equal(tapped.data.code, null); // No coupon yet
    // Tap replay returns same win, still no code
    const replay = await request('tap', {early:false}, options); assert.equal(replay.data.status, 'won'); assert.equal(replay.data.code, null);
    // Claim without verification fails
    const badClaim = await request('claim', {name:'Test',phone:'9876543210',turnstileToken:'invalid'}, options);
    assert.equal(badClaim.data.error, 'verification_failed');
    // Claim with valid verification succeeds
    const claimed = await request('claim', {name:'Test',phone:'9876543210',turnstileToken:'valid-test'}, options);
    assert.ok(claimed.data.code);
    // Idempotent claim returns same code
    const claimRetry = await request('claim', {name:'Test',phone:'9876543210',turnstileToken:'valid-test'}, options);
    assert.equal(claimRetry.data.code, claimed.data.code);
    // Result shows code
    assert.equal((await request('result', undefined, options)).data.code, claimed.data.code);
    // Staff search/redeem
    const login = await request('staff/login', {password:env.STAFF_PASSWORD}); assert.equal(login.response.status, 200);
    staffCookie = login.response.headers.get('Set-Cookie').split(';')[0];
    const found = await request('staff/search', {query:claimed.data.code}, {cookie:staffCookie}); assert.equal(found.data.results.length, 1);
    assert.equal((await request('staff/redeem', {id:found.data.results[0].id}, {cookie:staffCookie})).data.alreadyRedeemed, false);
    assert.equal((await request('staff/redeem', {id:found.data.results[0].id}, {cookie:staffCookie})).data.alreadyRedeemed, true);
    // Staff logout and re-auth
    await request('staff/logout', {}, {cookie:staffCookie}); assert.equal((await request('staff/search', {query:claimed.data.code}, {cookie:staffCookie})).response.status, 401);
    const login2 = await request('staff/login', {password:env.STAFF_PASSWORD}); const cookie2 = login2.response.headers.get('Set-Cookie').split(';')[0];
    env.STAFF_PASSWORD = crypto.randomUUID(); assert.equal((await request('staff/search', {query:claimed.data.code}, {cookie:cookie2})).response.status, 401);
    const login3 = await request('staff/login', {password:env.STAFF_PASSWORD}); const cookie3 = login3.response.headers.get('Set-Cookie').split(';')[0];
    await db.prepare('UPDATE staff_sessions SET expires_at=0').run();
    assert.equal((await request('staff/search', {query:claimed.data.code}, {cookie:cookie3})).response.status, 401);
    // Remote game check
    assert.equal((await request('flash', {}, {...options, remote:true, origin:'https://shop.example', bearer:crypto.randomUUID()})).data.error, 'game_unavailable');
    // Response headers
    assert.equal((await request('config')).response.headers.get('Cache-Control'), 'no-store');
    // Oversize body
    const over = new Request('http://127.0.0.1:8788/api/ping', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({x:'a'.repeat(5000)})});
    assert.equal((await onRequest({request:over, env})).status, 413);
  } finally { globalThis.fetch = originalFetch; await mf.dispose(); }
});
