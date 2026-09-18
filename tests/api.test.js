import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleConnection } from '../src/api.js';

async function withSamples(values, run) {
  const original=globalThis.fetch; let samples=0, requests=0;
  globalThis.fetch=async (_url,options)=>{
    requests++;
    const input=JSON.parse(options.body);
    return Response.json(input.challenge ? {sample:values[samples++]} : {challenge:'test'});
  };
  try { await run(()=>({samples,requests})); }
  finally { globalThis.fetch=original; }
}

test('connection check retries a transient spike until latest three stabilize', async ()=>{
  await withSamples([255,1843,197,223,284],async counts=>{
    assert.deepEqual(await sampleConnection(),[197,223,284]);
    assert.deepEqual(counts(),{samples:5,requests:10});
  });
});

test('connection check stops promptly on stable samples and bounds unstable retries', async ()=>{
  await withSamples([100,120,110],async counts=>{
    assert.deepEqual(await sampleConnection(),[100,120,110]);
    assert.equal(counts().samples,3);
  });
  await withSamples([200,1500,200,1500,200,1500,200,1500,200],async counts=>{
    await assert.rejects(sampleConnection(),e=>e.key==='high_latency');
    assert.deepEqual(counts(),{samples:9,requests:18});
  });
  await withSamples(Array(9).fill(1001),async ()=>{
    await assert.rejects(sampleConnection(),e=>e.key==='high_latency');
  });
});
