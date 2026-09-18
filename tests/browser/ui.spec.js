import { test, expect } from '@playwright/test';
test('customer preview, mobile layout, privacy and staff login', async ({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/THINK/})).toBeVisible();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByLabel('Mobile number')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/customer-light.png',fullPage:true});
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
  await page.screenshot({path:'test-results/customer-dark.png',fullPage:true});
  await page.goto('/privacy'); await expect(page.getByRole('heading',{name:'What we collect'})).toBeVisible();
  await page.goto('/staff'); await expect(page.getByLabel('Staff password')).toBeVisible();
  await page.screenshot({path:'test-results/staff.png',fullPage:true});
});
test('fixture API drives early tap, result recovery and winning coupon',async({page})=>{
  let status='reserved';
  await page.route('**/api/config',r=>r.fulfill({json:{enabled:true,prize:{label:'Test topping',terms:'Synthetic only'}}}));
  await page.route('**/api/ping',r=>r.fulfill({json:r.request().postDataJSON().challenge?{sample:10}:{challenge:'test'}}));
  const fixture=()=>({status,waitingDelayMs:1500,reactionMs:status==='won'?300:30,code:status==='won'?'JB-ABCDE':null,prize:{label:'Test topping',terms:'Synthetic only'},expiresAt:Date.now()+86400000});
  await page.route('**/api/flash',r=>r.fulfill({json:fixture()}));
  await page.route('**/api/tap',r=>{status=r.request().postDataJSON().early?'too_early':'won';return r.fulfill({json:fixture()});});
  await page.route('**/api/result',r=>r.fulfill({json:fixture()}));
  // Turnstile is isolated in browser tests; real verification is separately gated.
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,opts)=>{opts.callback("test");return 1},remove:()=>{}}'}));
  await page.goto('/'); await page.getByLabel('Your name').fill('Synthetic');await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button',{name:/LET.S PLAY/}).click();
  await page.getByRole('button',{name:/GET READY/}).click();await expect(page.getByText('Today’s play is used.',{exact:false})).toBeVisible();
  await page.reload();await expect(page.getByText('Today’s play is used.',{exact:false})).toBeVisible();
  await page.evaluate(()=>sessionStorage.clear());status='reserved';await page.reload();
  await page.getByLabel('Your name').fill('Synthetic');await page.getByLabel('Mobile number').fill('9876543210');await page.getByRole('button',{name:/LET.S PLAY/}).click();
  await page.getByRole('button',{name:/TAP NOW/}).focus();await page.keyboard.press('Space');await expect(page.getByText('JB-ABCDE')).toBeVisible();
  await page.screenshot({path:'test-results/win.png',fullPage:true});
});
