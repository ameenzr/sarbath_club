import { useEffect, useRef, useState } from 'react';
import { api, sampleConnection } from './api.js';

function Turnstile({ onToken, generation }) {
  const target = useRef(null);
  useEffect(() => {
    let widget, stopped = false;
    function render() {
      if (stopped || !window.turnstile || !target.current) return;
      widget = window.turnstile.render(target.current, { sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA', action: 'play', callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') });
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
function Brand() { return <a className="brand" href="/"><img src="/logo.png" alt="Sarbath Club" /><span>SARBATH CLUB<small>PURELY REFRESHING</small></span></a>; }
function Shell({ children, staff = false }) {
  return <div className="site"><header><Brand /><a className="nav-link" href={staff ? '/' : '/staff'}>{staff ? 'Back to the challenge ↗' : 'Staff counter ↗'}</a></header>{children}<footer><span>GOOD SIPS. QUICK REFLEXES.</span><a href="/privacy">Privacy</a><span>Made for a refreshing little break.</span></footer></div>;
}
const readStored = () => { try { return JSON.parse(sessionStorage.getItem('sarbath-play')); } catch { return null; } };
const readCoupon = () => { try { return JSON.parse(sessionStorage.getItem('sarbath-coupon')); } catch { return null; } };
function Game() {
  const [screen, setScreen] = useState('welcome'), [name, setName] = useState(''), [phone, setPhone] = useState(''), [verification, setVerification] = useState('');
  const [config, setConfig] = useState(null), [data, setData] = useState(null), [error, setError] = useState(''), [generation, setGeneration] = useState(0);
  const [savedCoupon, setSavedCoupon] = useState(readCoupon);
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
  if (screen === 'waiting' || screen === 'flash') return <button className={`play-field ${screen}`} onPointerDown={e => { e.preventDefault(); tap(screen === 'waiting'); }} onClick={e => { if (e.detail === 0) tap(screen === 'waiting'); }}><span className="field-brand">SARBATH CLUB / QUICK SIP CHALLENGE</span><span className="field-icon">{screen === 'waiting' ? '◷' : '↯'}</span><strong>{screen === 'waiting' ? 'GET READY…' : 'TAP NOW!'}</strong><span>{screen === 'waiting' ? 'Wait for the blue screen. Stay sharp.' : 'Your refreshing moment is here.'}</span><span className="field-bottom">{screen === 'waiting' ? 'Tapping now uses your play.' : 'One tap. Make it count.'}</span></button>;
  const resultTitle = { won: 'QUICK HANDS.\nGOOD TASTE.', lost: 'THAT WAS\nA CLOSE SIP.', too_early: 'A LITTLE\nTOO EAGER.', expired: 'TIME\nSLIPPED AWAY.' };
  return <Shell><main className="game-layout"><section className="intro"><div className="eyebrow"><span className="live-dot" /> THE QUICK SIP CHALLENGE</div><h1>THINK<br />FAST.<br /><span>SIP HAPPY.</span></h1><p className="lede">A little challenge. A refreshing reward.<br />How quick are your reflexes?</p><div className="intro-stamp">120–449<span>ms to win</span></div><div className="how"><span>01 <b>Tap play</b></span><span>02 <b>Wait for blue</b></span><span>03 <b>Tap fast</b></span></div></section><section className="game-card" aria-live="polite">
    {screen === 'welcome' && <><div className="card-top"><span>YOUR NEXT SIP STARTS HERE</span><span>↯</span></div><h2>Ready, steady,<br /><em>refresh.</em></h2><p>Tap play, wait for the screen to turn blue, then tap as fast as you can. A quick reaction earns a reward.</p>{config && <div className="prize-strip"><span>THE REWARD</span><strong>{config.prize.label}</strong><small>{config.prize.terms}</small></div>}<button className="primary" disabled={!config?.enabled} onClick={start}>LET'S PLAY <span>↗</span></button><div className="card-foot">UNLIMITED PLAYS · NO PURCHASE NEEDED</div></>}
    {(screen === 'checking' || screen === 'submitting' || screen === 'recovering' || screen === 'claiming') && <div className="status-screen"><div className="status-symbol">◷</div><h2>{screen === 'checking' ? 'Checking your connection' : screen === 'submitting' ? 'A moment for your result' : screen === 'claiming' ? 'Claiming your reward' : 'Finding your play'}</h2><p>Your play stays safe if the connection is interrupted.</p></div>}
    {screen === 'claim' && <><div className="card-top"><span>YOU WON!</span><span>↯</span></div><h2>Claim your<br /><em>reward.</em></h2><p>Enter your details to receive your coupon code.</p>{data?.reactionMs !== null && <div className="time-value">{data.reactionMs}<span>ms · estimated reaction</span></div>}<form onSubmit={submitClaim}><label htmlFor="name">Your name</label><input id="name" autoComplete="given-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" /><label htmlFor="phone">Mobile number</label><div className="phone-input"><span>+91</span><input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" required pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" /></div><Turnstile onToken={setVerification} generation={generation} /><button className="primary" disabled={!verification}>CLAIM REWARD <span>↗</span></button><p className="privacy-note">We use your name and phone only to issue and verify your coupon. <a href="/privacy">Privacy details</a></p></form></>}
    {screen === 'result' && <div className="result-screen"><div className="eyebrow">{data.status === 'won' ? 'YOU DID IT!' : 'THANKS FOR PLAYING'}</div><h2 className="result-title">{resultTitle[data.status]}</h2>{data.reactionMs !== null && <div className="time-value">{data.reactionMs}<span>ms · estimated reaction</span></div>}{data.status === 'won' ? <><p>You earned <strong>{data.prize.label}</strong>.</p><div className="coupon"><span>YOUR WINNING CODE</span><strong>{data.code}</strong><small>{data.prize.terms}</small><small>Valid until {new Date(data.expiresAt).toLocaleString('en-IN')}</small></div><p>Show this code to staff. They'll confirm it at the counter.</p><button className="primary" onClick={newPlay}>PLAY AGAIN <span>↗</span></button></> : <><p>{data.status === 'too_early' ? 'You tapped before the blue screen appeared or faster than the eligible 120 ms minimum.' : data.status === 'expired' ? 'This play expired before you tapped.' : 'Keep those reflexes fresh.'}</p><button className="primary" onClick={newPlay}>PLAY AGAIN <span>↗</span></button></>}<div className="card-foot">UNLIMITED PLAYS · ONE COUPON AT A TIME</div>{isDiagnostic && diag.current && <pre className="diagnostic">{JSON.stringify(diag.current, null, 2)}</pre>}</div>}
    {screen === 'active_coupon' && <div className="status-screen"><div className="status-symbol">✓</div><h2>You already have a coupon.</h2><p>Your phone has a coupon within its seven-day validity period. You can claim again after it expires, even if you redeem it sooner.</p><button className="primary" onClick={newPlay}>PLAY AGAIN <span>↗</span></button></div>}
    {screen === 'interrupted' && <div className="status-screen"><div className="status-symbol">◷</div><h2>Let's find your result.</h2><p>Your play stays the same. Recover it here, or ask staff to look up an issued coupon. Refreshing does not start another play.</p><button className="primary" onClick={recover}>CHECK THIS PLAY ↗</button></div>}
    {savedCoupon && <details className="coupon"><summary>Previously claimed code: {savedCoupon.code}</summary><p>{savedCoupon.prize.label}</p><small>{savedCoupon.prize.terms}</small><small>Valid until {new Date(savedCoupon.expiresAt).toLocaleString('en-IN')}. Staff will confirm validity and redemption status.</small></details>}
    {error && <p className="error" role="alert">{error}</p>}
  </section></main></Shell>;
}
function Staff() {
  const [signed, setSigned] = useState(false), [password, setPassword] = useState(''), [query, setQuery] = useState(''), [rows, setRows] = useState([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  async function run(fn) { if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); try { await fn(); } catch(e) { setMessage(e.message); if (e.key === 'unauthorized') setSigned(false); } finally { lock.current = false; setBusy(false); } }
  async function search() { const r = await api('staff/search', { query }); setRows(r.results); if (!r.results.length) setMessage('No matching coupon found.'); }
  return <Shell staff><main className="staff-main"><div className="eyebrow">THE COUNTER</div><h1>REDEEM A<br /><span>HAPPY SIP.</span></h1><p>Confirm redemption before handing over the prize.</p><section className="staff-card">{!signed ? <form onSubmit={e => { e.preventDefault(); run(async () => { await api('staff/login', { password }); setPassword(''); setSigned(true); }); }}><h2>Staff sign in</h2><label htmlFor="password">Staff password</label><input id="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><button className="primary" disabled={busy}>SIGN IN ↗</button></form> : <><form onSubmit={e => { e.preventDefault(); run(search); }}><label htmlFor="search">Coupon code or mobile number</label><input id="search" value={query} onChange={e => setQuery(e.target.value)} required maxLength={40} placeholder="JB-XXXXX or mobile number" /><button className="primary" disabled={busy}>FIND COUPON ↗</button></form><div className="staff-results">{rows.map(row => { const expired = row.expires_at <= Date.now(); return <article key={row.id}><div className="row-head"><strong>{row.code}</strong><span>{row.redeemed ? 'Redeemed' : expired ? 'Expired' : 'Ready to redeem'}</span></div><h3>{row.name}</h3><p>{row.phone} · {row.reaction_ms} ms</p><p><strong>{row.prize_label}</strong><br />{row.prize_terms}</p><small>Issued {new Date(row.created_at).toLocaleString('en-IN')}<br />Expires {new Date(row.expires_at).toLocaleString('en-IN')}</small>{!!row.redeemed && <p>Redeemed {new Date(row.redeemed_at).toLocaleString('en-IN')}</p>}<button className="primary" disabled={busy || !!row.redeemed || expired} onClick={() => run(async () => { const r = await api('staff/redeem', { id: row.id }); await search(); setMessage(r.alreadyRedeemed ? 'Already redeemed. Do not hand over another prize.' : 'Redemption confirmed. Hand over the prize now.'); })}>MARK REDEEMED ↗</button></article>; })}</div><button className="text-button" disabled={busy} onClick={() => run(async () => { await api('staff/logout', {}); setRows([]); setSigned(false); })}>Sign out</button></>}{message && <p role="status" className="notice">{message}</p>}</section></main></Shell>;
}
function Privacy() {
  const [config, setConfig] = useState(null); useEffect(() => { api('config').then(setConfig).catch(() => {}); }, []);
  return <Shell><main className="privacy-page"><div className="eyebrow">YOUR DETAILS</div><h1>A LITTLE<br /><span>PRIVACY NOTE.</span></h1><section className="staff-card"><h2>What we collect</h2><p>You can play the challenge without entering any personal information. If you win, we ask for your name and mobile number to issue a coupon. We also record your estimated reaction time and any coupon/redemption record. We do not use your details for marketing.</p><h2>One coupon at a time</h2><p>Each mobile number may hold one active coupon at a time. Once your coupon expires, you can win and claim again. Redeeming it earlier does not shorten the seven-day eligibility period. Coupon validity is seven days from issuance.</p><h2>How long we keep it</h2><p>{config ? `We retain your details for ${config.retentionDays} days after your coupon is issued, then remove them automatically during our regular cleanup.` : 'Your details are retained for 30 days after your coupon is issued, then removed automatically during our regular cleanup.'}</p><h2>Who can see it</h2><p>Authorized staff can search coupons. The owner can manage and export operational records. Cloudflare provides hosting, database, and bot verification infrastructure.</p><h2>Browser storage</h2><p>A temporary session credential lets this tab recover your result. Short-lived security cookies support connection checks and staff access. No third-party marketing analytics are installed.</p><a href="/">Back to the challenge ↗</a></section></main></Shell>;
}
export default function App() { return location.pathname === '/staff' ? <Staff /> : location.pathname === '/privacy' ? <Privacy /> : <Game />; }
