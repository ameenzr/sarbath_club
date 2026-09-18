import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('local Worker + D1 anonymous play flow with official Turnstile test verification',async({page})=>{
  // Only widget acquisition is replaced. The Worker really calls Cloudflare
  // siteverify with its official public testing secret and a dummy test token.
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,opts)=>{opts.callback("XXXX.DUMMY.TOKEN.XXXX");return 1},remove:()=>{}}'}));
  await page.goto('/');
  // Anonymous play — no form fields before play
  await page.getByRole('button',{name:/let.s play/i}).click();
  await expect(page.getByRole('button',{name:/GET READY/})).toBeVisible({timeout:20000});
  // Early tap — should show result with replay option
  await page.getByRole('button',{name:/GET READY/}).click();
  await expect(page.getByText('tapped before',{exact:false})).toBeVisible();
  // Play again — immediate replay
  await page.getByRole('button',{name:/play again/i}).click();
  await page.getByRole('button',{name:/let.s play/i}).click();
  await expect(page.getByRole('button',{name:/GET READY/})).toBeVisible({timeout:20000});
  await page.evaluate(()=>{
    const observer=new MutationObserver(()=>{
      const target=document.querySelector('.play-field.flash');
      if(!target)return; observer.disconnect(); setTimeout(()=>target.click(),250);
    });
    observer.observe(document.getElementById('root'),{childList:true,subtree:true,attributes:true});
  });
  await expect(page.getByLabel('Your name')).toBeVisible({timeout:20000});
  await page.getByLabel('Your name').fill('Synthetic live customer');
  // Synthetic unique phone avoids reusing the previous run's seven-day lock.
  const phone='9'+String(Date.now()).slice(-9);
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByRole('button',{name:/claim reward/i}).click();
  await expect(page.locator('.coupon strong')).toHaveText(/^JB-[A-Z2-9]{5}$/,{timeout:20000});
  const code=await page.locator('.coupon strong').innerText();
  await page.reload();
  await expect(page.locator('.coupon strong')).toHaveText(code);
  await page.getByRole('button',{name:/play again/i}).click();
  await expect(page.getByText(`Previously claimed code: ${code}`)).toBeVisible();
});

test('initial local timing comparison at a scripted 300 ms interval',async({page})=>{
  test.setTimeout(60000);
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,opts)=>{opts.callback("XXXX.DUMMY.TOKEN.XXXX");return 1},remove:()=>{}}'}));
  const measurements=[];
  for(let i=0;i<5;i++){
    await page.goto('/');await page.evaluate(()=>sessionStorage.clear());await page.reload();
    await page.evaluate(()=>{
      const observer=new MutationObserver(()=>{
        const target=document.querySelector('.play-field.flash');
        if(!target) return;observer.disconnect();const start=performance.now();
        setTimeout(()=>{window.testLocalInterval=performance.now()-start;target.click();},300);
      });observer.observe(document.getElementById('root'),{childList:true,subtree:true,attributes:true,characterData:true});
    });
    await page.getByRole('button',{name:/let.s play/i}).click();
    await expect(page.locator('.time-value')).toBeVisible({timeout:20000});
    const estimated=Number((await page.locator('.time-value').innerText()).split('ms')[0].trim());
    const local=await page.evaluate(()=>window.testLocalInterval);
    measurements.push({localMs:Math.round(local),estimatedMs:estimated,errorMs:Math.round(estimated-local)});
  }
  await writeFile('test-results/timing-local.json',JSON.stringify({environment:'Local desktop Chromium; scripted interval, no physical display measurement',trials:measurements},null,2));
  console.log('Local timing comparison:',JSON.stringify(measurements));
});

test('desktop and all fixture outcomes stay readable',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.route('**/api/config',r=>r.fulfill({json:{enabled:true,prize:{label:'Demo',terms:'Synthetic'}}}));
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,opts)=>{opts.callback("test");return 1},remove:()=>{}}'}));
  await page.goto('/');await page.screenshot({path:'test-results/customer-desktop.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const status of ['lost','expired','too_early','won']){
    await page.route('**/api/result',r=>r.fulfill({json:{status,reactionMs:status==='expired'?null:status==='lost'?500:300,code:status==='won'?'JB-ABCDE':null,expiresAt:Date.now()+86400000,prize:{label:'Demo',terms:'Synthetic'}}}));
    await page.evaluate(()=>sessionStorage.setItem('sarbath-play',JSON.stringify({credential:crypto.randomUUID()})));
    await page.reload();await expect(page.getByText(status==='won'?'YOU DID IT!':'THANKS FOR PLAYING')).toBeVisible();
    await page.unroute('**/api/result');
  }
});
