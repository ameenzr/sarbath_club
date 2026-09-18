import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { phoneNumber, customerName, playDate, outcome, couponCode, digest, csvCell, reserve, finalize, redeem, loadSession, incrementLimit, cleanup } from '../server/core.js';
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
  const sql = (await Promise.all(['0001_initial.sql','0002_maintenance.sql','0003_prize.sql','0004_retention.sql'].map(file=>readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8')))).join('\n');
  // Test migration statements individually; SQL contains no procedural statements.
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run();
  const config = await db.prepare('SELECT * FROM config WHERE id=1').first();
  assert.equal(config.prize_label,'One free sarbath');
  assert.equal(config.coupon_validity_ms,604800000);
  assert.equal(config.retention_days,30);
  return { mf, db, config };
}
test('real D1 reservation races, tap races, redemption races and collision rollback', async () => {
  const {mf,db,config} = await database();
  try {
    const now = Date.now(), token = await digest(crypto.randomUUID()), other = await digest(crypto.randomUUID());
    const starts = await Promise.allSettled([reserve(db,token,'Test','+919876543210',config,50,now), reserve(db,other,'Test','+919876543210',config,50,now)]);
    assert.equal(starts.filter(s => s.status==='fulfilled').length,1);
    assert.equal(starts.find(s => s.status==='rejected').reason.key,'already_played');
    const winner = starts.find(s => s.status==='fulfilled').value;
    const key = winner.request_key;
    const same = await reserve(db,key,'Test','+919876543210',config,50,now);
    assert.equal(same.id,winner.id);
    const tapTime = winner.flash_issued_ms + winner.waiting_delay_ms + winner.latency_baseline_ms + 300;
    const taps = await Promise.all([finalize(db,key,tapTime),finalize(db,key,tapTime+500)]);
    assert.equal(taps[0].status,taps[1].status); assert.equal(taps[0].code,taps[1].code);
    // Whichever request wins must be the sole authoritative result.
    const saved = await loadSession(db,key); assert.equal(saved.used,1);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM attempts').first()).n,1);
    if (saved.status==='won') {
      const redemptions = await Promise.all([redeem(db,saved.id,tapTime+1000),redeem(db,saved.id,tapTime+1000)]);
      assert.equal(redemptions.filter(r => !r.alreadyRedeemed).length,1);
      assert.equal(redemptions[0].redeemedAt,redemptions[1].redeemedAt);
    }
    const a = await reserve(db,'a','A','+919876543211',config,20,now);
    const b = await reserve(db,'b','B','+919876543212',config,20,now);
    await finalize(db,'a',now+a.waiting_delay_ms+320,false,()=> 'JB-ABCDE');
    let calls=0;
    const result=await finalize(db,'b',now+b.waiting_delay_ms+320,false,()=> ++calls===1?'JB-ABCDE':'JB-ABCDF');
    assert.equal(calls,2); assert.equal(result.code,'JB-ABCDF'); assert.equal(result.used,1);
    assert.equal(result.expires_at,now+b.waiting_delay_ms+320+604800000);
    assert.equal(result.prize_label,'One free sarbath');
    const c = await reserve(db,'c','C','+919876543213',config,20,now);
    await assert.rejects(finalize(db,'c',now+c.waiting_delay_ms+320,false,()=> 'JB-ABCDE'), /temporarily_unavailable/);
    assert.equal((await loadSession(db,'c')).status,'reserved'); assert.equal((await loadSession(db,'c')).used,0);
    await assert.rejects(db.batch([db.prepare("UPDATE attempts SET name='Changed' WHERE request_key='c'"),db.prepare("INSERT INTO config(id) VALUES(1)") ]));
    assert.equal((await loadSession(db,'c')).name,'C');
    const fail=await reserve(db,'fail','Atomic failure','+919876543217',config,20,now);
    await db.prepare("CREATE TRIGGER fail_session BEFORE UPDATE OF used ON sessions WHEN NEW.token='fail' BEGIN SELECT RAISE(ABORT,'Injected finalization failure'); END").run();
    await assert.rejects(finalize(db,'fail',now+fail.waiting_delay_ms+320),/Injected/);
    assert.equal((await loadSession(db,'fail')).status,'reserved');assert.equal((await loadSession(db,'fail')).code,null);assert.equal((await loadSession(db,'fail')).used,0);
    await db.prepare('DROP TRIGGER fail_session').run();
  } finally {await mf.dispose();}
});

test('expiry, early play, limits and cleanup preserve active coupons and today eligibility', async () => {
  const {mf,db,config} = await database();
  try {
    const now=Date.now();
    const a=await reserve(db,'a','Early','+919876543214',config,20,now);
    assert.equal((await finalize(db,'a',now+100,true)).status,'too_early');
    await assert.rejects(redeem(db,a.id,now+200),/invalid_coupon/);
    const b=await reserve(db,'b','Expired','+919876543215',config,20,now);
    assert.equal((await finalize(db,'b',b.expires_at_ms+1)).status,'expired');
    const requests = await Promise.allSettled(Array.from({length:11},()=>incrementLimit(db,'limit',10,now)));
    assert.equal(requests.filter(r=>r.status==='rejected').length,1);
    await cleanup(db,now+180000);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM rate_limits').first()).n,0);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM attempts').first()).n,2);
    const old=await reserve(db,'old','Old coupon','+919876543216',config,0,now-40*86400000);
    // Extend validity to verify retention does not erase an outstanding coupon.
    await db.prepare('UPDATE attempts SET coupon_validity_ms=? WHERE id=?').bind(60*86400000,old.id).run();
    await finalize(db,'old',old.flash_issued_ms+old.waiting_delay_ms+300);
    await cleanup(db,now);
    assert.ok(await db.prepare('SELECT id FROM attempts WHERE id=?').bind(old.id).first());
    const remove=await reserve(db,'remove','Old expired record','+919876543218',config,0,now-31*86400000);
    await finalize(db,'remove',remove.expires_at_ms+1);
    const keep=await reserve(db,'keep','Recent record','+919876543219',config,0,now-29*86400000);
    await finalize(db,'keep',keep.expires_at_ms+1);
    await cleanup(db,now);
    assert.equal(await db.prepare('SELECT id FROM attempts WHERE id=?').bind(remove.id).first(),null);
    assert.ok(await db.prepare('SELECT id FROM attempts WHERE id=?').bind(keep.id).first());
  }finally{await mf.dispose();}
});

test('API verification, lost Start response, result privacy, staff authentication and origin checks', async()=>{
  const {mf,db}=await database();
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async (_url,options)=>Response.json({success:JSON.parse(options.body).response==='valid-test'});
  try{
    const env={DB:db,TURNSTILE_SECRET:'1x0000000000000000000000000000000AA',STAFF_PASSWORD:crypto.randomUUID(),GAME_ENABLED:'false'};
    const credential=crypto.randomUUID(); let sampling=''; let staffCookie='';
    const request=async(path,input,options={})=>{
      const headers={...(input===undefined?{}:{'Content-Type':'application/json'}),...(options.bearer?{Authorization:`Bearer ${options.bearer}`}:{}) ,...(options.cookie?{Cookie:options.cookie}:{}) ,...(options.origin?{Origin:options.origin}:{})};
      const req=new Request(`${options.remote?'https://shop.example':'http://127.0.0.1:8788'}/api/${path}`,{method:input===undefined?'GET':'POST',headers,body:input===undefined?undefined:JSON.stringify(input)});
      const r=await onRequest({request:req,env}); return {response:r,data:await r.json()};
    };
    assert.equal((await request('staff/search',{query:'9876543210'})).response.status,401);
    assert.equal((await request('staff/login',{password:env.STAFF_PASSWORD},{origin:'https://evil.example'})).response.status,403);
    for(let i=0;i<3;i++){
      const c=await request('ping',{}, {cookie:sampling});sampling=c.response.headers.get('Set-Cookie').split(';')[0];
      assert.ok((await request('ping',{challenge:c.data.challenge},{cookie:sampling})).data.sample>=0);
    }
    const start={name:'Synthetic',phone:'9876543210',turnstileToken:'invalid'};
    const options={bearer:credential,cookie:sampling};
    assert.equal((await request('flash',start,options)).data.error,'verification_failed');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM attempts').first()).n,0);
    await db.prepare('UPDATE measurements SET duration_ms=1501').run();
    assert.equal((await request('flash',start,options)).data.error,'high_latency');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM attempts').first()).n,0);
    await db.prepare('UPDATE measurements SET duration_ms=20').run();
    start.turnstileToken='valid-test';
    const first=await request('flash',start,options);assert.equal(first.data.status,'reserved');
    start.turnstileToken='already-consumed';
    const retry=await request('flash',start,options);assert.equal(retry.data.id,first.data.id);
    assert.equal((await request('result',undefined,{bearer:crypto.randomUUID()})).response.status,404);
    // Place synthetic server timing at a qualifying reaction; never a public test endpoint.
    await db.prepare('UPDATE sessions SET flash_issued_ms=?-waiting_delay_ms-latency_baseline_ms WHERE token=?').bind(Date.now()-250,await digest(credential)).run();
    const tapped=await request('tap',{early:false},options);assert.equal(tapped.data.status,'won');
    const replay=await request('tap',{early:false},options);assert.equal(replay.data.code,tapped.data.code);
    assert.equal((await request('result',undefined,options)).data.code,tapped.data.code);
    const login=await request('staff/login',{password:env.STAFF_PASSWORD});assert.equal(login.response.status,200);
    staffCookie=login.response.headers.get('Set-Cookie').split(';')[0];
    const found=await request('staff/search',{query:tapped.data.code},{cookie:staffCookie});assert.equal(found.data.results.length,1);
    assert.equal((await request('staff/redeem',{id:first.data.id},{cookie:staffCookie})).data.alreadyRedeemed,false);
    assert.equal((await request('staff/redeem',{id:first.data.id},{cookie:staffCookie})).data.alreadyRedeemed,true);
    await request('staff/logout',{}, {cookie:staffCookie});assert.equal((await request('staff/search',{query:tapped.data.code},{cookie:staffCookie})).response.status,401);
    const login2=await request('staff/login',{password:env.STAFF_PASSWORD});const cookie2=login2.response.headers.get('Set-Cookie').split(';')[0];
    env.STAFF_PASSWORD=crypto.randomUUID();assert.equal((await request('staff/search',{query:tapped.data.code},{cookie:cookie2})).response.status,401);
    const login3=await request('staff/login',{password:env.STAFF_PASSWORD});const cookie3=login3.response.headers.get('Set-Cookie').split(';')[0];
    await db.prepare('UPDATE staff_sessions SET expires_at=0').run();
    assert.equal((await request('staff/search',{query:tapped.data.code},{cookie:cookie3})).response.status,401);
    assert.equal((await request('flash',start,{...options,remote:true,origin:'https://shop.example',bearer:crypto.randomUUID()})).data.error,'game_unavailable');
    assert.equal((await request('config')).response.headers.get('Cache-Control'),'no-store');
    const over=new Request('http://127.0.0.1:8788/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:'a'.repeat(5000)})});
    assert.equal((await onRequest({request:over,env})).status,413);
  }finally{globalThis.fetch=originalFetch;await mf.dispose();}
});
