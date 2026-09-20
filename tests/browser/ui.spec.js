import { test, expect } from '@playwright/test';
test('customer preview, mobile layout, privacy and staff login', async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/Win a game\. Win a drink\./})).toBeVisible();
  await page.getByRole('button',{name:/^Play/}).click();
  await expect(page.locator('h1')).toContainText('Tap fast.');
  await expect(page.locator('h1')).toContainText('Sip free.');
  await expect(page.getByText('120–449 ms to win',{exact:true})).toBeVisible();
  await expect(page.getByText('Unlimited plays',{exact:true})).toBeVisible();
  // New flow: no name/phone fields on welcome screen
  await expect(page.getByRole('button',{name:/let.s play/i})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/customer-light.png',fullPage:true});
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
  await page.screenshot({path:'test-results/customer-dark.png',fullPage:true});
  await page.goto('/privacy'); await expect(page.getByRole('heading',{name:'What we collect'})).toBeVisible();
  await page.goto('/staff'); await expect(page.getByLabel('Staff password')).toBeVisible();
  await expect(page.getByRole('link',{name:/Staff counter/i})).toHaveAttribute('href','/');
  expect(await page.getByText(/Confirm redemption/i).count()).toBe(0);
  await expect(page.getByRole('button',{name:'Use local admin'})).toBeVisible();
  await page.getByRole('button',{name:'Use local admin'}).click();
  await expect(page.getByRole('heading',{name:'Recent wins'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Let’s play/i})).toHaveCount(0);
  expect(await page.getByText(/Confirm redemption/i).count()).toBe(0);
  await page.screenshot({path:'test-results/staff.png',fullPage:true});
});
test('fixture API drives anonymous play, early tap, replay and winning claim',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
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
  await page.getByRole('button',{name:/^Play/}).click();
  await page.getByRole('button',{name:/let.s play/i}).click();
  // Early tap
  await page.getByRole('button',{name:/GET READY/}).click();
  await expect(page.getByText('tapped before',{exact:false})).toBeVisible();
  await expect(page.getByText('Tap within 120–449 ms to win.',{exact:false})).toBeVisible();
  await expect(page.locator('.intro')).toHaveCount(0);
  // Replay
  await page.getByRole('button',{name:/play again/i}).click();
  status='reserved';
  await page.getByRole('button',{name:/let.s play/i}).click();
  // Win — tap via keyboard
  await page.getByRole('button',{name:/TAP NOW/}).focus();await page.keyboard.press('Space');
  // Should show claim form after winning
  await expect(page.getByText('Claim your',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Play again'}).click();
  await expect(page.getByRole('button',{name:/let.s play/i})).toBeVisible();
  status='reserved';
  await page.getByRole('button',{name:/let.s play/i}).click();
  await expect(page.getByRole('button',{name:/TAP NOW/})).toBeVisible();
  await page.getByRole('button',{name:/TAP NOW/}).focus();await page.keyboard.press('Space');
  await expect(page.getByText('Claim your',{exact:false})).toBeVisible();
  await page.getByLabel('Your name').fill('Synthetic');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button',{name:/claim reward/i}).click();
  // Should show coupon code
  await expect(page.getByText('JB-ABCDE')).toBeVisible();
  await page.getByRole('button',{name:'Copy coupon code'}).click();
  await expect(page.getByRole('button',{name:'Coupon code copied'})).toBeVisible();
  await expect(page.getByText('YOUR COUPON',{exact:true})).toBeVisible();
  await expect(page.getByText('Show this code',{exact:true})).toBeVisible();
  await expect(page.getByText('Valid for 7 days',{exact:true})).toBeVisible();
  await expect(page.getByText(/lose the coupon code or share with strangers/i)).toBeVisible();
  await expect(page.getByRole('button',{name:/Share coupon code/i})).toBeVisible();
  await expect(page.getByRole('link',{name:/Get directions/})).toHaveAttribute('href','https://maps.app.goo.gl/wRiGJTGCmUnWQVrq9');
  await expect(page.getByRole('button',{name:'Play again'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/win.png',fullPage:true});
});

test('minimal interface fits small phones, keeps start visible and verification accessible',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/config',r=>r.fulfill({json:{enabled:true,retentionDays:30,prize:{label:'One free sarbath',terms:'Synthetic'}}}));
  for(const width of [320,360,390,430,768]) {
    await page.setViewportSize({width,height:640});
    await page.goto('/');
    await page.getByRole('button',{name:/^Play/}).click();
    const start=page.getByRole('button',{name:/let.s play/i});
    const box=await start.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.y+box.height).toBeLessThanOrEqual(640);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.getByLabel('Your name')).toHaveCount(0);
    await expect(page.locator('#turnstile-script')).toHaveCount(0);
  }
  await page.setViewportSize({width:320,height:568});
  await page.goto('/');
  await page.getByRole('button',{name:/^Play/}).click();
  await page.screenshot({path:'test-results/minimal-mobile-320.png',fullPage:true});
  await page.route('**/api/result',r=>r.fulfill({json:{status:'won',reactionMs:300,code:null,prize:{label:'One free sarbath',terms:'Synthetic'}}}));
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,opts)=>{el.dataset.size=opts.size;const box=document.createElement("div");box.style.width=opts.size==="compact"?"150px":"300px";box.style.height=opts.size==="compact"?"140px":"65px";el.append(box);opts.callback("test");return 1},remove:()=>{}}'}));
  await page.evaluate(()=>sessionStorage.setItem('sarbath-play',JSON.stringify({credential:crypto.randomUUID()})));
  await page.reload();
  await page.getByRole('button',{name:/^Play/}).click();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.locator('.verification')).toHaveAttribute('data-size','compact');
  expect(await page.getByLabel('Mobile number').evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/minimal-claim-320.png',fullPage:true});
  await page.goto('/privacy');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/staff');
  const submit=page.getByRole('button',{name:/sign in/i});
  expect((await submit.boundingBox()).height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('staff keeps a redeemed coupon visible until the next refresh', async ({page}) => {
  const coupon = { id: 88, code: 'JB-READY', name: 'Test customer', phone: '+919876543210', reaction_ms: 243, prize_label: 'One free sarbath', created_at: Date.now() - 1000, expires_at: Date.now() + 86400000, redeemed: 0, redeemed_at: null };
  let couponLoads = 0;
  await page.route('**/api/staff/login', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/staff/redeem', route => route.fulfill({ json: { ok: true, alreadyRedeemed: false, redeemedAt: Date.now() } }));
  await page.route('**/api/staff/coupons', route => route.fulfill({ json: { results: ++couponLoads === 1 ? [coupon] : [] } }));
  await page.goto('/staff');
  await page.getByRole('button', { name: 'Use local admin' }).click();
  await expect(page.getByText('JB-READY', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redeem' }).click();
  await expect(page.locator('.coupon-status')).toHaveText('Redeemed');
  await expect(page.getByRole('button', { name: 'Redeem' })).toHaveCount(0);
  await expect(page.getByText('JB-READY', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Recent wins' }).click();
  await expect(page.getByText('JB-READY', { exact: true })).toHaveCount(0);
});
