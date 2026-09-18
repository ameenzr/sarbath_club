import { test, expect } from '@playwright/test';
test('customer preview, mobile layout, privacy and staff login', async ({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/THINK/})).toBeVisible();
  // New flow: no name/phone fields on welcome screen
  await expect(page.getByRole('button',{name:/LET.S PLAY/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/customer-light.png',fullPage:true});
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
  await page.screenshot({path:'test-results/customer-dark.png',fullPage:true});
  await page.goto('/privacy'); await expect(page.getByRole('heading',{name:'What we collect'})).toBeVisible();
  await page.goto('/staff'); await expect(page.getByLabel('Staff password')).toBeVisible();
  await page.screenshot({path:'test-results/staff.png',fullPage:true});
});
test('fixture API drives anonymous play, early tap, replay and winning claim',async({page})=>{
  let status='reserved';
  await page.route('**/api/config',r=>r.fulfill({json:{enabled:true,prize:{label:'Test topping',terms:'Synthetic only'}}}));
  await page.route('**/api/ping',r=>r.fulfill({json:r.request().postDataJSON().challenge?{sample:10}:{challenge:'test'}}));
  const fixture=()=>({status,waitingDelayMs:1500,reactionMs:status==='won'?300:30,code:null,prize:{label:'Test topping',terms:'Synthetic only'},expiresAt:Date.now()+86400000});
  const claimFixture=()=>({status:'won',reactionMs:300,code:'JB-ABCDE',prize:{label:'Test topping',terms:'Synthetic only'},expiresAt:Date.now()+86400000});
  await page.route('**/api/flash',r=>r.fulfill({json:fixture()}));
  await page.route('**/api/tap',r=>{status=r.request().postDataJSON().early?'too_early':'won';return r.fulfill({json:fixture()});});
  await page.route('**/api/claim',r=>r.fulfill({json:claimFixture()}));
  await page.route('**/api/result',r=>r.fulfill({json:fixture()}));
  // Turnstile is isolated in browser tests; real verification is separately gated.
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,opts)=>{opts.callback("test");return 1},remove:()=>{}}'}));
  // Anonymous start — no name/phone form before play
  await page.goto('/');
  await page.getByRole('button',{name:/LET.S PLAY/}).click();
  // Early tap
  await page.getByRole('button',{name:/GET READY/}).click();
  await expect(page.getByText('tapped before',{exact:false})).toBeVisible();
  // Replay
  await page.getByRole('button',{name:/PLAY AGAIN/}).click();
  status='reserved';
  await page.getByRole('button',{name:/LET.S PLAY/}).click();
  // Win — tap via keyboard
  await page.getByRole('button',{name:/TAP NOW/}).focus();await page.keyboard.press('Space');
  // Should show claim form after winning
  await expect(page.getByText('Claim your',{exact:false})).toBeVisible();
  await page.getByLabel('Your name').fill('Synthetic');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button',{name:/CLAIM REWARD/}).click();
  // Should show coupon code
  await expect(page.getByText('JB-ABCDE')).toBeVisible();
  await page.screenshot({path:'test-results/win.png',fullPage:true});
});
