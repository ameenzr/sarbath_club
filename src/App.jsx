import { useEffect, useRef, useState } from 'react';
import { api, sampleConnection } from './api.js';

function Turnstile({ onToken, generation }) {
  const target = useRef(null);
  useEffect(() => {
    let widget, stopped = false;
    function render() {
      if (stopped || !window.turnstile || !target.current) return;
      widget = window.turnstile.render(target.current, { sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA', action: 'play', size: target.current.clientWidth < 300 ? 'compact' : 'flexible', callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') });
    }
    let script = document.getElementById('turnstile-script');
    if (window.turnstile) render();
    else {
      if (!script) { script = document.createElement('script'); script.id = 'turnstile-script'; script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; document.head.appendChild(script); }
      script.addEventListener('load', render);
    }
    return () => { stopped = true; script?.removeEventListener('load', render); if (widget !== undefined) window.turnstile?.remove(widget); };
  }, [onToken, generation]);
  return <div className="verification" ref={target} />;
}
function Brand() { return <a className="brand" href="/"><img src="/logo-backgroundless.webp" width="40" height="40" alt="" /><span>Sarbath Club<small>PURELY REFRESHING</small></span></a>; }
function Shell({ children, staff = false }) {
  return <div className="site"><header><Brand />{staff && <a className="nav-link" href="/">Let’s play!🧋</a>}</header>{children}<footer><a href="/privacy">Privacy</a></footer></div>;
}
function LaunchScreen({ onDone }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const launchTimer = setTimeout(onDone, reducedMotion ? 250 : 2400);
    return () => clearTimeout(launchTimer);
  }, [onDone]);
  return <div className="launch-screen" role="status" aria-label="Opening Sarbath Club">
    <div className="launch-glow" />
    <img className="launch-logo" src="/logo-backgroundless.webp" alt="Sarbath Club — Purely Refreshing" />
    <div className="launch-wave launch-wave-gold" />
    <div className="launch-wave launch-wave-sarbath" />
    <div className="launch-splashes" aria-hidden="true"><i /><i /><i /><i /></div>
  </div>;
}
function CustomerExperience() {
  const [launching, setLaunching] = useState(true);
  const [page, setPage] = useState('games');
  const finishLaunch = useRef(() => setLaunching(false)).current;
  return launching ? <LaunchScreen onDone={finishLaunch} /> : page === 'games' ? <GamesHub onPlay={() => setPage('quick-sip')} /> : <Game onGames={() => setPage('games')} />;
}
function GamesHub({ onPlay }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => {
    if (!rulesOpen) return;
    const closeOnEscape = event => { if (event.key === 'Escape') setRulesOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [rulesOpen]);
  return <Shell><main className="games-page"><section className="games-intro"><h1>Pick a game.<br /><span>Win a sip.</span></h1></section><section className="game-list" aria-label="Available games"><article className="game-choice"><div className="game-choice-art" aria-hidden="true"><span>🧋</span></div><div className="game-choice-copy"><button className="game-details-button" onClick={() => setRulesOpen(true)} aria-label="View Quick Sip rules" title="Game rules">i</button><span className="eyebrow">QUICK SIP CHALLENGE</span><h2>Tap fast. Sip free.</h2><p>Wait for blue, then tap quickly. 120–449 ms wins.</p><button className="game-choice-button" onClick={onPlay}>Play <span aria-hidden="true">▶</span></button></div></article></section></main>{rulesOpen && <div className="rules-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setRulesOpen(false); }}><section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title"><button className="rules-close" onClick={() => setRulesOpen(false)} aria-label="Close rules" autoFocus>×</button><span className="eyebrow">QUICK SIP CHALLENGE</span><h2 id="rules-title">How to play</h2><ol><li>Tap <strong>Play</strong>, then wait for the screen to turn blue.</li><li>Tap anywhere as quickly as you can. A reaction from <strong>120–449 ms</strong> wins.</li><li>If you win, enter your name and Indian mobile number to claim your coupon.</li><li>Each phone number may hold one unredeemed coupon at a time.</li><li>After staff redeem it, the same number can claim another win. Unredeemed coupons expire after seven days.</li></ol><button className="rules-done" onClick={() => setRulesOpen(false)}>Got it</button></section></div>}</Shell>;
}
const readStored = () => { try { return JSON.parse(sessionStorage.getItem('sarbath-play')); } catch { return null; } };
const readCoupon = () => { try { return JSON.parse(sessionStorage.getItem('sarbath-coupon')); } catch { return null; } };
function Game({ onGames }) {
  const [screen, setScreen] = useState('welcome'), [name, setName] = useState(''), [phone, setPhone] = useState(''), [verification, setVerification] = useState('');
  const [config, setConfig] = useState(null), [data, setData] = useState(null), [error, setError] = useState(''), [generation, setGeneration] = useState(0);
  const [savedCoupon, setSavedCoupon] = useState(readCoupon);
  const [copied, setCopied] = useState(false);
  const credential = useRef(null), lock = useRef(false), timer = useRef(null), flashAt = useRef(null), samples = useRef([]), diag = useRef(null);
  const isDiagnostic = import.meta.env.DEV && new URLSearchParams(location.search).has('diagnostic');
  useEffect(() => {
    api('config').then(setConfig).catch(e => setError(e.message));
    const stored = readStored();
    if (stored?.credential) {
      credential.current = stored.credential;
      setScreen('recovering');
      api('result', undefined, stored.credential).then(r => {
        setData(r);
        if (r.status === 'reserved') { setScreen('interrupted'); }
        else if (r.status === 'won' && !r.code) { setScreen('claim'); }
        else { setScreen('result'); }
      }).catch(e => { setError(e.message); setScreen('interrupted'); });
    }
    return () => clearTimeout(timer.current);
  }, []);
  function newPlay() {
    if (data?.code) {
      sessionStorage.setItem('sarbath-coupon', JSON.stringify(data));
      setSavedCoupon(data);
    }
    // Reset for a new play — fresh UUID, clear credential.
    clearTimeout(timer.current);
    credential.current = null;
    flashAt.current = null; diag.current = null;
    setVerification(''); setGeneration(x => x + 1);
    setData(null); setError(''); setScreen('welcome');
    sessionStorage.removeItem('sarbath-play');
  }
  async function copyCoupon() {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
    } catch {
      const input = document.createElement('textarea');
      input.value = data.code; input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }
  async function start() {
    if (lock.current) return;
    lock.current = true; setError(''); setScreen('checking');
    try {
      samples.current = await sampleConnection();
      if (!credential.current) credential.current = crypto.randomUUID();
      sessionStorage.setItem('sarbath-play', JSON.stringify({ credential: credential.current }));
      const result = await api('flash', {}, credential.current);
      setData(result);
      if (result.status !== 'reserved') {
        // Recovered an existing finalized play.
        if (result.status === 'won' && !result.code) { setScreen('claim'); }
        else { setScreen('result'); }
        return;
      }
      setScreen('waiting'); lock.current = false;
      timer.current = setTimeout(() => { flashAt.current = performance.now(); setScreen('flash'); }, result.waitingDelayMs);
    } catch (e) {
      setError(e.message);
      if (e.key === 'network_error' || e.key === 'temporarily_unavailable') setScreen('interrupted');
      else { sessionStorage.removeItem('sarbath-play'); credential.current = null; setScreen('welcome'); }
    } finally { if (screen !== 'submitting') lock.current = false; }
  }
  async function tap(early = false) {
    if (lock.current) return; lock.current = true; clearTimeout(timer.current);
    const localMs = flashAt.current ? Math.round(performance.now() - flashAt.current) : null;
    setScreen('submitting');
    try {
      const r = await api('tap', { early }, credential.current);
      setData(r); diag.current = { samples: samples.current, localMs, serverMs: r.reactionMs, differenceMs: localMs === null ? null : r.reactionMs - localMs };
      if (r.status === 'won' && !r.code) { setScreen('claim'); }
      else { setScreen('result'); }
    }
    catch (e) { setError(e.message); setScreen('interrupted'); }
    finally { lock.current = false; }
  }
  async function submitClaim(event) {
    event.preventDefault();
    if (lock.current) return; lock.current = true; setError(''); setScreen('claiming');
    try {
      const r = await api('claim', { name, phone, turnstileToken: verification }, credential.current);
      setData(r); setScreen('result');
    } catch (e) {
      setError(e.message);
      if (e.key === 'active_coupon') { setScreen('active_coupon'); }
      else { setScreen('claim'); setVerification(''); setGeneration(x => x + 1); }
    } finally { lock.current = false; }
  }
  async function recover() {
    if (lock.current) return; lock.current = true; setError('');
    try {
      const r = await api('result', undefined, credential.current);
      setData(r);
      if (r.status === 'reserved') { setScreen('interrupted'); setError('This play is still pending. Wait a few seconds, then check again.'); }
      else if (r.status === 'won' && !r.code) { setScreen('claim'); }
      else { setScreen('result'); }
    }
    catch (e) {
      setError(e.message);
      if (e.key === 'invalid_session') { newPlay(); setError('No reserved play was found. You can start a new one.'); }
    } finally { lock.current = false; }
  }
  if (screen === 'waiting' || screen === 'flash') return <button className={`play-field ${screen}`} onPointerDown={e => { e.preventDefault(); tap(screen === 'waiting'); }} onClick={e => { if (e.detail === 0) tap(screen === 'waiting'); }}><span className="field-brand">Sarbath Club</span><strong>{screen === 'waiting' ? 'GET READY…' : 'TAP NOW!'}</strong><span>{screen === 'waiting' ? 'Wait for blue.' : 'Tap anywhere.'}</span><span className="field-bottom">{screen === 'waiting' ? 'Early tap? You can try again.' : '120–449 ms wins'}</span></button>;
  const resultTitle = { won: 'You won.', lost: 'Too slow.', too_early: 'Too early.', expired: 'Play expired.' };
  const claimPanel = <div className="claim-backdrop"><section className="claim-dialog" role="dialog" aria-modal="true" aria-labelledby="claim-title"><h2 id="claim-title">Claim your coupon</h2><p>You won. Add your details to claim.</p>{data?.reactionMs != null && <div className="time-value">{data.reactionMs}<span>ms · estimated reaction</span></div>}<form onSubmit={submitClaim}><label htmlFor="name">Your name</label><input id="name" autoComplete="given-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Name" /><label htmlFor="phone">Mobile number</label><div className="phone-input"><span>+91</span><input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" required pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile" /></div><Turnstile onToken={setVerification} generation={generation} /><button className="primary" disabled={!verification}>Claim reward</button><button className="claim-play-again" type="button" onClick={newPlay}>Play again</button><p className="privacy-note">We use your name and phone only to issue and verify your coupon. <a href="/privacy">Privacy details</a></p></form></section></div>;
  return <Shell><main className="game-layout"><button className="back-to-games" onClick={onGames}><span aria-hidden="true">▦</span>All games</button><section className="intro"><h1>Quick sip challenge</h1><p>120–449 ms to win · Unlimited plays</p></section><section className="game-card" aria-live="polite">
    {screen === 'welcome' && <><h2>Tap fast. Sip free.</h2><p>Wait for blue, then tap anywhere.<br />Win first. Enter your details after.</p>{config && <div className="prize-strip"><strong>{config.prize.label}</strong><small>Coupon valid for 7 days.</small></div>}<button className="primary" disabled={!config?.enabled} onClick={start}>Let's play</button><div className="card-foot">One unredeemed coupon per phone</div></>}
    {(screen === 'checking' || screen === 'submitting' || screen === 'recovering' || screen === 'claiming') && <div className="status-screen"><h2>{screen === 'checking' ? 'Checking connection…' : screen === 'submitting' ? 'Saving result…' : screen === 'claiming' ? 'Claiming coupon…' : 'Finding your play…'}</h2><p>This may take a few seconds.</p></div>}
    {screen === 'claim' && null}
    {screen === 'result' && <div className="result-screen"><div className="eyebrow">{data.status === 'won' ? 'YOU DID IT!' : 'THANKS FOR PLAYING'}</div><h2 className="result-title">{resultTitle[data.status]}</h2>{data.reactionMs !== null && <div className="time-value">{data.reactionMs}<span>ms · estimated reaction</span></div>}{data.status === 'won' ? <><p>You earned <strong>{data.prize.label}</strong>.</p><div className="coupon"><span>Coupon code</span><div className="coupon-code"><strong>{data.code}</strong><button type="button" onClick={copyCoupon} aria-label={copied ? 'Coupon code copied' : 'Copy coupon code'} title={copied ? 'Copied' : 'Copy coupon code'}>{copied ? <span aria-hidden="true">✓</span> : <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}</button></div><small>{data.prize.terms}</small><small>Valid until {new Date(data.expiresAt).toLocaleString('en-IN')}</small></div><p>Show this code at the counter.</p><a className="store-location" href="https://maps.app.goo.gl/wRiGJTGCmUnWQVrq9" target="_blank" rel="noreferrer"><span aria-hidden="true">⌖</span><span>Sarbath Club store location</span></a><button className="primary" onClick={newPlay}>Play again</button></> : <><p>{data.status === 'too_early' ? 'You tapped before the blue screen appeared or faster than the eligible 120 ms minimum.' : data.status === 'expired' ? 'This play expired before you tapped.' : 'Keep those reflexes fresh.'}</p><button className="primary" onClick={newPlay}>Play again</button></>}<div className="card-foot">One unredeemed coupon per phone</div>{isDiagnostic && diag.current && <pre className="diagnostic">{JSON.stringify(diag.current, null, 2)}</pre>}</div>}
    {screen === 'active_coupon' && <div className="status-screen"><h2>Coupon already active</h2><p>Redeem your current coupon or wait for it to expire, then this number can claim again.</p><button className="primary" onClick={newPlay}>Play again</button></div>}
    {screen === 'interrupted' && <div className="status-screen"><div className="status-symbol">◷</div><h2>Recover your play</h2><p>Check your saved result, or clear the interrupted play and begin again.</p><button className="primary" onClick={recover}>Check result</button><button className="text-button start-new-game" onClick={newPlay}>Start a new game</button></div>}
    {savedCoupon && <details className="coupon"><summary>Previously claimed code: {savedCoupon.code}</summary><p>{savedCoupon.prize.label}</p><small>{savedCoupon.prize.terms}</small><small>Valid until {new Date(savedCoupon.expiresAt).toLocaleString('en-IN')}. Staff will confirm validity and redemption status.</small></details>}
    {error && <p className="error" role="alert">{error}</p>}
  </section></main>{screen === 'claim' && claimPanel}</Shell>;
}
function Staff() {
  const [signed, setSigned] = useState(false), [password, setPassword] = useState(''), [query, setQuery] = useState(''), [rows, setRows] = useState([]), [view, setView] = useState('recent'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  async function run(fn) { if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); try { await fn(); } catch(e) { setMessage(e.message); if (e.key === 'unauthorized') setSigned(false); } finally { lock.current = false; setBusy(false); } }
  async function loadCoupons(nextView) { const r = await api('staff/coupons', { view: nextView }); setRows(r.results); setView(nextView); if (!r.results.length) setMessage(nextView === 'redeemed' ? 'No redeemed coupons yet.' : 'No recent wins waiting for redemption.'); }
  async function search() { const r = await api('staff/search', { query }); setRows(r.results); setView('search'); if (!r.results.length) setMessage('No matching coupon found.'); }
  async function refreshRows() { if (view === 'search') await search(); else await loadCoupons(view); }
  async function redeem(row) { const r = await api('staff/redeem', { id: row.id }); await refreshRows(); setMessage(r.alreadyRedeemed ? 'Already redeemed. Do not hand over another prize.' : 'Redemption confirmed. Hand over the prize now.'); }
  const listTitle = view === 'redeemed' ? 'Redeemed coupons' : view === 'search' ? 'Search results' : 'Recent wins';
  return <Shell staff><main className="staff-main"><h1>Staff counter</h1><p>Confirm redemption before handing over the prize.</p><section className="staff-card">{!signed ? <form onSubmit={e => { e.preventDefault(); run(async () => { await api('staff/login', { password }); setPassword(''); setSigned(true); await loadCoupons('recent'); }); }}><h2>Staff sign in</h2><input className="staff-password-input" id="password" aria-label="Staff password" placeholder="Enter password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><button className="primary" disabled={busy}>Sign in</button></form> : <><div className="staff-toolbar" aria-label="Coupon views"><button className={view === 'recent' ? 'active' : ''} disabled={busy} onClick={() => run(() => loadCoupons('recent'))}>Recent wins</button><button className={view === 'redeemed' ? 'active' : ''} disabled={busy} onClick={() => run(() => loadCoupons('redeemed'))}>Redeemed coupons</button></div><form className="staff-search" onSubmit={e => { e.preventDefault(); run(search); }}><label htmlFor="search">Find a coupon</label><div><input id="search" value={query} onChange={e => setQuery(e.target.value)} required maxLength={40} placeholder="Code or mobile number" /><button disabled={busy}>Find</button></div></form><div className="staff-section-head"><h2>{listTitle}</h2><span>{rows.length}</span></div><div className="staff-results">{rows.map(row => { const expired = row.expires_at <= Date.now(); const daysLeft = Math.max(0, Math.ceil((row.expires_at - Date.now()) / 86400000)); return <article key={row.id}><div className="row-head"><strong>{row.code}</strong><span>{row.redeemed ? 'Redeemed' : expired ? 'Expired' : 'Ready'}</span></div><p className="staff-game">{row.game_name || 'Quick Sip Challenge'}</p><h3>{row.name}</h3><p className="staff-coupon-meta"><a href={`tel:${row.phone}`} aria-label={`Call ${row.phone}`}>{row.phone}</a><span>{row.reaction_ms} ms</span></p><p className="staff-prize"><strong>{row.prize_label}</strong></p><small>Won {new Date(row.created_at).toLocaleString('en-IN')}<br />Expires {new Date(row.expires_at).toLocaleString('en-IN')} · <strong>{expired ? 'Expired' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}</strong></small>{!!row.redeemed && <p className="redeemed-date">Redeemed {new Date(row.redeemed_at).toLocaleString('en-IN')}</p>}{!row.redeemed && <button className="redeem-button" disabled={busy || expired} onClick={() => run(() => redeem(row))}>{expired ? 'Expired' : 'Redeem'}</button>}</article>; })}</div><button className="text-button staff-signout" disabled={busy} onClick={() => run(async () => { await api('staff/logout', {}); setRows([]); setView('recent'); setSigned(false); })}>Sign out</button></>}{message && <p role="status" className="notice">{message}</p>}</section></main></Shell>;
}
function Privacy() {
  const [config, setConfig] = useState(null); useEffect(() => { api('config').then(setConfig).catch(() => {}); }, []);
  return <Shell><main className="privacy-page"><h1>Privacy</h1><section className="staff-card"><h2>What we collect</h2><p>You can play the challenge without entering any personal information. If you win, we ask for your name and mobile number to issue a coupon. We also record your estimated reaction time and any coupon/redemption record. We do not use your details for marketing.</p><h2>One coupon at a time</h2><p>Each mobile number may hold one unredeemed coupon at a time. After staff redeem it, the same number can claim another winning coupon immediately. Unredeemed coupons expire seven days after issuance.</p><h2>How long we keep it</h2><p>{config ? `We retain your details for ${config.retentionDays} days after your coupon is issued, then remove them automatically during our regular cleanup.` : 'Your details are retained for 30 days after your coupon is issued, then removed automatically during our regular cleanup.'}</p><h2>Who can see it</h2><p>Authorized staff can search coupons. The owner can manage and export operational records. Cloudflare provides hosting, database, and bot verification infrastructure.</p><h2>Browser storage</h2><p>A temporary session credential lets this tab recover your result. Short-lived security cookies support connection checks and staff access. No third-party marketing analytics are installed.</p><a href="/">Back to play</a></section></main></Shell>;
}
export default function App() {
  const isStaff = location.pathname === '/staff';
  document.title = isStaff ? 'Admin' : 'Let’s play! 🧋';
  return isStaff ? <Staff /> : location.pathname === '/privacy' ? <Privacy /> : <CustomerExperience />;
}
