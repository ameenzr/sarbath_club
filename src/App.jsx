import { useEffect, useRef, useState } from 'react';
import { api, sampleConnection } from './api.js';

// Developed by AMEEN. Email: ameennazerpk7@gmail.com

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
function Brand({ staff = false }) { return <a className="brand" href={staff ? '/staff' : '/'}><img src="/logo-backgroundless.webp" width="40" height="40" alt="" /><span>{staff ? 'Staff counter' : 'Sarbath Club'}<small>{staff ? 'ADMIN' : 'PURELY REFRESHING'}</small></span></a>; }
function Shell({ children, staff = false, className = '' }) {
  return <div className={`site ${className}`.trim()}><header><Brand staff={staff} />{staff && <a className="nav-link" href="/">Let’s play!🧋</a>}</header>{children}<footer><a href="/privacy">Privacy</a></footer></div>;
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
    <div className="liquid-stage" aria-hidden="true">
      <div className="wave-wrap wave-wrap-gold">
        <svg className="wave-svg wave-gold-anim" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE28A" />
              <stop offset="35%" stopColor="#FCC845" />
              <stop offset="100%" stopColor="#E29F15" />
            </linearGradient>
          </defs>
          <path fill="url(#goldGrad)" d="M 0,45 C 150,10 300,75 450,40 C 525,22 575,32 600,45 C 750,10 900,75 1050,40 C 1125,22 1175,32 1200,45 L 1200,160 L 0,160 Z" />
          <path fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" d="M 0,45 C 150,10 300,75 450,40 C 525,22 575,32 600,45 C 750,10 900,75 1050,40 C 1125,22 1175,32 1200,45" />
        </svg>
        <svg className="wave-svg wave-gold-anim-2" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path fill="#F5BC32" opacity="0.6" d="M 0,55 C 120,75 280,25 420,60 C 510,80 570,65 600,55 C 720,75 880,25 1020,60 C 1110,80 1170,65 1200,55 L 1200,160 L 0,160 Z" />
        </svg>
      </div>

      <div className="wave-wrap wave-wrap-sarbath">
        <svg className="wave-svg wave-sarbath-anim" viewBox="0 0 1200 140" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sarbathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#B8550B" />
              <stop offset="25%" stopColor="#954103" />
              <stop offset="80%" stopColor="#6F2800" />
              <stop offset="100%" stopColor="#4E1A00" />
            </linearGradient>
          </defs>
          <path fill="url(#sarbathGrad)" d="M 0,35 C 140,65 290,10 440,40 C 520,55 570,45 600,35 C 740,65 890,10 1040,40 C 1120,55 1170,45 1200,35 L 1200,140 L 0,140 Z" />
          <path fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" d="M 0,35 C 140,65 290,10 440,40 C 520,55 570,45 600,35 C 740,65 890,10 1040,40 C 1120,55 1170,45 1200,35" />
        </svg>
        <svg className="wave-svg wave-sarbath-anim-2" viewBox="0 0 1200 140" preserveAspectRatio="none">
          <path fill="#7B3200" opacity="0.45" d="M 0,45 C 160,15 310,60 460,30 C 530,15 580,30 600,45 C 760,15 910,60 1060,30 C 1130,15 1180,30 1200,45 L 1200,140 L 0,140 Z" />
        </svg>

        <div className="bubble bb1" />
        <div className="bubble bb2" />
        <div className="bubble bb3" />
        <div className="bubble bb4" />
      </div>
    </div>
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
  return <Shell><main className="games-page"><section className="games-intro"><h1>Win a game.<br /><span>Win a drink.</span></h1></section><section className="game-list" aria-label="Available games">
      <article className="game-choice">
        <button className="game-details-button" onClick={() => setRulesOpen(true)} aria-label="View Tap Fast. Sip Free. rules" title="Game rules">i</button>
        <div className="game-choice-copy">
          <span className="game-choice-kicker">REACTION GAME</span>
          <div className="game-choice-title">
            <h2>Tap Fast.<br />Sip Free.</h2>
            <p>Wait for blue, then tap at the right moment.</p>
          </div>
          <div className="game-choice-meta">
            <span><b aria-hidden="true">⚡</b>120–449 ms</span>
            <span><b aria-hidden="true">★</b>Free sarbath</span>
          </div>
          <button className="game-choice-button" onClick={onPlay}>Play now <span aria-hidden="true">→</span></button>
        </div>
        <div className="game-choice-visual" aria-hidden="true">
          <svg viewBox="0 0 120 144">
            <path className="speed-line one" d="M18 34h26M10 52h23M20 70h20" />
            <path className="speed-line two" d="M83 21h20M90 39h17" />
            <path className="cup-lid" d="M44 42h48M51 33h34" />
            <path className="cup-body" d="M48 42h40l-5 73H53l-5-73Z" />
            <path className="straw" d="M72 33l8-22" />
            <path className="drink-wave" d="M52 68c9-7 20 7 32 0M53 84c8-7 20 7 30 0" />
            <path className="bolt" d="m35 46-10 19h10l-7 20 19-26H36l8-13Z" />
          </svg>
        </div>
      </article>
    </section></main>{rulesOpen && <div className="rules-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setRulesOpen(false); }}><section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title"><button className="rules-close" onClick={() => setRulesOpen(false)} aria-label="Close rules" autoFocus>×</button><span className="eyebrow">TAP FAST. SIP FREE.</span><h2 id="rules-title">How to play</h2><ol><li>Tap <strong>Play</strong>, then wait for the screen to turn blue.</li><li>Tap anywhere as quickly as you can. A reaction from <strong>120–449 ms</strong> wins.</li><li>If you win, enter your name and Indian mobile number to claim your coupon.</li><li>Each phone number may hold one unredeemed coupon at a time.</li><li>After staff redeem it, the same number can claim another win. Unredeemed coupons expire after seven days.</li></ol><button className="rules-done" onClick={() => setRulesOpen(false)}>Got it</button></section></div>}</Shell>;
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
  async function shareCoupon() {
    if (!data?.code) return;
    const shareText = `Here is my Sarbath Club coupon code: ${data.code}\nShow this code at the counter for one free sarbath! Valid for 7 days.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sarbath Club Coupon', text: shareText });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
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
  const showingCoupon = screen === 'result' && data?.status === 'won';
  const showGameIntro = screen === 'welcome';
  const failureMessage = data?.status === 'too_early'
    ? 'You tapped before blue appeared or before 120 ms. Tap within 120–449 ms to win.'
    : data?.status === 'expired'
      ? 'This play expired. A reaction from 120–449 ms wins.'
      : `Your ${data?.reactionMs ?? ''} ms reaction was too slow. Tap within 120–449 ms to win.`;
  return <Shell className="game-site"><main className={`game-layout${showingCoupon ? ' coupon-page' : ''}`}>{!showingCoupon && <button className="back-to-games" onClick={onGames}><span aria-hidden="true">&lt;</span>All games</button>}{showGameIntro && <section className="intro"><span className="eyebrow">REACTION GAME</span><h1>Tap fast. <span>Sip free.</span></h1><div className="game-lede"><p>Wait for blue, then tap as fast as you can.</p></div></section>}<section className="game-card" aria-live="polite">
    {screen === 'welcome' && <div className="game-welcome"><div className="game-stats"><strong>120–449 ms to win</strong><span>Unlimited plays</span></div>{config && <div className="game-prize"><svg aria-hidden="true" viewBox="0 0 64 64"><path d="M24 15h27l-4 39H27L24 15Z"/><path d="M20 10h34M42 15l4-11M12 23l7 1M16 12l5 4M15 35l7-2"/><circle cx="34" cy="34" r="4"/><circle cx="42" cy="43" r="4"/></svg><div><strong>{config.prize.label}</strong><small>Coupon valid for 7 days.</small></div></div>}<button className="primary game-start" disabled={!config?.enabled} onClick={start}><span>Let’s play</span><span aria-hidden="true">→</span></button><div className="card-foot">One unredeemed coupon per phone</div></div>}
    {(screen === 'checking' || screen === 'submitting' || screen === 'recovering' || screen === 'claiming') && <div className="status-screen"><h2>{screen === 'checking' ? 'Checking connection…' : screen === 'submitting' ? 'Saving result…' : screen === 'claiming' ? 'Claiming coupon…' : 'Finding your play…'}</h2><p>This may take a few seconds.</p></div>}
    {screen === 'claim' && null}
    {screen === 'result' && <div className={`result-screen${data.status === 'won' ? ' won-result' : ''}`}>{data.status === 'won' ? <><div className="coupon coupon-ticket"><span>YOUR COUPON</span><div className="coupon-code"><strong>{data.code}</strong><button type="button" onClick={copyCoupon} aria-label={copied ? 'Coupon code copied' : 'Copy coupon code'} title={copied ? 'Copied' : 'Copy coupon code'}>{copied ? <span aria-hidden="true">✓</span> : <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}</button></div><div className="coupon-divider" /><div className="coupon-details"><div className="coupon-detail"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9h16M6 9V6h12v3M5 9v9h14V9M9 9v9M15 9v9" /></svg><div><b>Show this code</b><small>at the counter</small></div></div><div className="coupon-detail"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4M16 4v4M4 11h16" /></svg><div><b>Valid for 7 days</b><small>Until {new Date(data.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</small></div></div></div></div><p className="coupon-warning"><span aria-hidden="true">⚠️</span> Don’t lose the coupon code or share with strangers.</p><div className="result-actions"><button type="button" className="share-coupon" onClick={shareCoupon}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg><span>Share coupon code</span><span className="action-arrow" aria-hidden="true">→</span></button><a className="store-location" href="https://maps.app.goo.gl/wRiGJTGCmUnWQVrq9" target="_blank" rel="noreferrer"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg><span>Get directions</span><span aria-hidden="true">→</span></a><button className="play-again" onClick={newPlay}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8v5h5M6.5 17a7 7 0 1 0-.5-8" /></svg><span>Play again</span><span className="action-arrow" aria-hidden="true">→</span></button></div></> : <><div className="eyebrow">THANKS FOR PLAYING</div><h2 className="result-title">{resultTitle[data.status]}</h2>{data.reactionMs !== null && <div className="time-value">{data.reactionMs}<span>ms · estimated reaction</span></div>}<p>{failureMessage}</p><button className="primary" onClick={newPlay}>Play again</button><div className="card-foot">One unredeemed coupon per phone</div></>}{isDiagnostic && diag.current && <pre className="diagnostic">{JSON.stringify(diag.current, null, 2)}</pre>}</div>}
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
  async function redeem(row) { const r = await api('staff/redeem', { id: row.id }); setRows(current => current.map(item => item.id === row.id ? { ...item, redeemed: 1, redeemed_at: r.redeemedAt || Date.now() } : item)); setMessage(r.alreadyRedeemed ? 'Already redeemed. Do not hand over another prize.' : 'Redemption confirmed. Hand over the prize now.'); }
  async function signIn(payload) { await api('staff/login', payload); setPassword(''); setSigned(true); await loadCoupons('recent'); }
  const localDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const listTitle = view === 'redeemed' ? 'Redeemed coupons' : view === 'search' ? 'Search results' : 'Recent wins';
  return <Shell staff><main className="staff-main"><p className="staff-intro">Confirm redemption before handing over the prize.</p><section className={`staff-card${signed ? ' staff-dashboard' : ''}`}>{!signed ? <form onSubmit={e => { e.preventDefault(); run(() => signIn({ password })); }}><h2>Staff sign in</h2>{localDevelopment && <><button className="local-admin-login" type="button" disabled={busy} onClick={() => run(() => signIn({ development: true }))}>Use local admin</button><p className="local-admin-note">Development only · available on this computer</p><div className="login-divider"><span>or use a password</span></div></>}<input className="staff-password-input" id="password" aria-label="Staff password" placeholder="Enter password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><button className="primary" disabled={busy}>Sign in</button></form> : <>
    <form className="staff-search" onSubmit={e => { e.preventDefault(); run(search); }}><label htmlFor="search">Find a coupon</label><div><input id="search" value={query} onChange={e => setQuery(e.target.value)} required maxLength={40} placeholder="Code or mobile number" /><button disabled={busy}>Find</button></div></form>
    <div className="staff-toolbar" role="tablist" aria-label="Coupon views"><button role="tab" aria-selected={view === 'recent'} className={view === 'recent' ? 'active' : ''} disabled={busy} onClick={() => run(() => loadCoupons('recent'))}>Recent wins</button><button role="tab" aria-selected={view === 'redeemed'} className={view === 'redeemed' ? 'active' : ''} disabled={busy} onClick={() => run(() => loadCoupons('redeemed'))}>Redeemed</button></div>
    <div className="staff-section-head"><h2>{listTitle}</h2><span>{rows.length}</span></div>
    <div className="staff-results">{rows.map(row => { const expired = row.expires_at <= Date.now(); const daysLeft = Math.max(0, Math.ceil((row.expires_at - Date.now()) / 86400000)); const status = row.redeemed ? 'Redeemed' : expired ? 'Expired' : 'Ready'; return <article key={row.id}>
      <div className="row-head"><strong>{row.code}</strong><span className={`coupon-status ${status.toLowerCase()}`}>{status}</span></div>
      <p className="staff-game">{row.game_name || 'Tap Fast. Sip Free.'}</p>
      <div className="staff-customer"><h3>{row.name}</h3><p className="staff-coupon-meta"><a href={`tel:${row.phone}`} aria-label={`Call ${row.phone}`}>{row.phone}</a><span>{row.reaction_ms} ms</span></p></div>
      <p className="staff-prize"><span>Prize</span><strong>{row.prize_label}</strong></p>
      <div className="staff-card-foot"><small><span>Won {new Date(row.created_at).toLocaleString('en-IN')}</span><span>Expires {new Date(row.expires_at).toLocaleString('en-IN')}</span><strong>{expired ? 'Expired' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}</strong></small>{!!row.redeemed && <p className="redeemed-date">Redeemed {new Date(row.redeemed_at).toLocaleString('en-IN')}</p>}{!row.redeemed && <button className="redeem-button" disabled={busy || expired} onClick={() => run(() => redeem(row))}>{expired ? 'Expired' : 'Redeem'}</button>}</div>
    </article>; })}</div>
    <button className="text-button staff-signout" disabled={busy} onClick={() => run(async () => { await api('staff/logout', {}); setRows([]); setView('recent'); setSigned(false); })}>Sign out</button>
  </>}{message && <p role="status" className="notice">{message}</p>}</section></main></Shell>;
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
