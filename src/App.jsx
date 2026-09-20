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
  return <div className="form-group verification" ref={target} />;
}

function Brand({ staff = false }) { 
  return (
    <a className="brand" href="/" title={staff ? 'Go to game page' : undefined}>
      <img src="/logo-backgroundless.webp" alt="" />
      <div>
        <span>{staff ? 'Staff counter' : 'Sarbath Club'}</span>
        <small>{staff ? 'ADMIN' : 'PURELY REFRESHING'}</small>
      </div>
    </a>
  ); 
}

function Shell({ children, staff = false, className = '', headerAction = null }) {
  return (
    <div className={`app-container ${className}`.trim()}>
      <header className="app-header">
        <Brand staff={staff} />
        {headerAction}
      </header>
      {children}
      <footer className="app-footer">
        <a href="/privacy" className="text-muted">Privacy Policy</a>
      </footer>
    </div>
  );
}

function LaunchScreen({ onDone }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const launchTimer = setTimeout(onDone, reducedMotion ? 250 : 1500);
    return () => clearTimeout(launchTimer);
  }, [onDone]);
  return (
    <div className="launch-screen" role="status" aria-label="Opening Sarbath Club">
      <img className="launch-logo" src="/logo-backgroundless.webp" alt="Sarbath Club" />
    </div>
  );
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
  return (
    <Shell>
      <main className="app-main">
        <div className="mb-6">
          <h1 className="mb-2">Win a game.<br/><span style={{color: 'var(--color-primary)'}}>Win a drink.</span></h1>
          <p>Play our quick-sip challenge to win a free refreshing drink.</p>
        </div>
        <div aria-label="Available games">
          <div className="game-choice">
            <button className="btn-info" onClick={() => setRulesOpen(true)} aria-label="View Tap Fast. Sip Free. rules">i</button>
            <div className="game-choice-bg"></div>
            <div className="game-choice-content">
              <div className="kicker">Reaction Game</div>
              <h2>Tap Fast.<br/>Sip Free.</h2>
              <p>Wait for blue, then tap.</p>
              <div className="game-choice-meta">
                <span>⚡ 120–449 ms</span>
                <span>★ Free sarbath</span>
              </div>
              <button className="btn btn-secondary w-full" onClick={onPlay}>Play now</button>
            </div>
            <div className="game-choice-art" aria-hidden="true">🥤</div>
          </div>
        </div>
      </main>

      {rulesOpen && (
        <div className="bottom-sheet-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setRulesOpen(false); }}>
          <div className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <div className="sheet-handle"></div>
            <div className="flex-between mb-4">
              <h2 id="rules-title">How to play</h2>
              <button className="btn-icon-only" onClick={() => setRulesOpen(false)} aria-label="Close rules">✕</button>
            </div>
            <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
              <li className="mb-2">Tap <strong>Play</strong>, then wait for the screen to turn blue.</li>
              <li className="mb-2">Tap anywhere as quickly as you can. A reaction from <strong>120–449 ms</strong> wins.</li>
              <li className="mb-2">If you win, enter your name and Indian mobile number to claim your coupon.</li>
              <li className="mb-2">Each phone number may hold one unredeemed coupon at a time.</li>
              <li className="mb-2">After staff redeem it, the same number can claim another win. Unredeemed coupons expire after seven days.</li>
            </ol>
            <div className="mt-6">
              <button className="btn btn-primary" onClick={() => setRulesOpen(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
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
    clearTimeout(timer.current);
    credential.current = null;
    flashAt.current = null; diag.current = null;
    setVerification(''); setGeneration(x => x + 1);
    setData(null); setError(''); setScreen('welcome');
    sessionStorage.removeItem('sarbath-play');
  }

  async function copyCoupon() {
    if (!data?.code) return;
    try { await navigator.clipboard.writeText(data.code); } 
    catch {
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

  if (screen === 'waiting' || screen === 'flash') return (
    <button className={`play-field ${screen}`} onPointerDown={e => { e.preventDefault(); tap(screen === 'waiting'); }} onClick={e => { if (e.detail === 0) tap(screen === 'waiting'); }}>
      <div className="play-field-brand">Sarbath Club</div>
      <h1>{screen === 'waiting' ? 'GET READY…' : 'TAP NOW!'}</h1>
      <p>{screen === 'waiting' ? 'Wait for blue.' : 'Tap anywhere.'}</p>
      <div className="play-field-footer">{screen === 'waiting' ? 'Early tap? You can try again.' : '120–449 ms wins'}</div>
    </button>
  );

  const resultTitle = { won: 'You won!', lost: 'Too slow.', too_early: 'Too early.', expired: 'Play expired.' };
  const failureMessage = data?.status === 'too_early'
    ? 'You tapped before blue appeared or before 120 ms. Tap within 120–449 ms to win.'
    : data?.status === 'expired'
      ? 'This play expired. A reaction from 120–449 ms wins.'
      : `Your ${data?.reactionMs ?? ''} ms reaction was too slow. Tap within 120–449 ms to win.`;

  const claimPanel = (
    <div className="bottom-sheet-backdrop">
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="claim-title">
        <div className="sheet-handle"></div>
        <h2 id="claim-title" className="mb-2">Claim your coupon</h2>
        <p className="mb-4">You won! Add your details to claim.</p>
        {data?.reactionMs != null && <div className="text-sm font-display mb-4">⚡ {data.reactionMs} ms</div>}
        <form onSubmit={submitClaim}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Your name</label>
            <input className="input-field" id="name" autoComplete="given-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Mobile number</label>
            <div className="phone-input-wrap">
              <span className="phone-prefix">+91</span>
              <input className="input-field" id="phone" type="tel" inputMode="tel" autoComplete="tel-national" required pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile" />
            </div>
          </div>
          <Turnstile onToken={setVerification} generation={generation} />
          <div className="mt-6 flex-row">
            <button type="button" className="btn btn-outline" onClick={newPlay}>Cancel</button>
            <button className="btn btn-primary" disabled={!verification}>Claim reward</button>
          </div>
          <p className="text-xs text-muted text-center mt-4">We use this only to verify your coupon. <a href="/privacy">Privacy</a></p>
        </form>
      </div>
    </div>
  );

  return (
    <Shell>
      <main className="app-main">
        {screen === 'welcome' && (
          <>
            <button className="btn btn-ghost mb-4 w-full flex-row" style={{justifyContent: 'flex-start'}} onClick={onGames}>
              <span>←</span> All games
            </button>
            <div className="mb-6 intro">
              <span className="text-xs text-muted font-weight-bold" style={{letterSpacing: '1px'}}>REACTION GAME</span>
              <h1 className="mb-2">Tap fast.<br/><span style={{color: 'var(--color-primary)'}}>Sip free.</span></h1>
              <p>Wait for blue, then tap as fast as you can.</p>
            </div>
            
            <div className="card mb-4">
              <div className="flex-between mb-4">
                <div className="text-sm"><strong>⚡ 120–449 ms</strong> to win</div>
                <div className="text-sm">Unlimited plays</div>
              </div>
              {config && (
                <div className="list-tile" style={{background: 'var(--bg-elevated)', border: 'none'}}>
                  <div className="list-tile-content">
                    <div className="list-tile-title">{config.prize.label}</div>
                    <div className="list-tile-subtitle">Coupon valid for 7 days</div>
                  </div>
                  <div className="font-display text-xl" aria-hidden="true">🥤</div>
                </div>
              )}
            </div>

            {savedCoupon && (
              <div className="card mb-4">
                <div className="list-tile-title">Your saved coupon</div>
                <div className="text-sm mb-2">{savedCoupon.code} - {savedCoupon.prize.label}</div>
                <div className="text-xs text-muted">Valid until {new Date(savedCoupon.expiresAt).toLocaleString('en-IN')}</div>
              </div>
            )}

            {error && <div className="error notice mb-4" role="alert">{error}</div>}

            <div className="bottom-action-bar">
              <p className="text-xs text-center mb-2">One unredeemed coupon per phone</p>
              <button className="btn btn-primary" disabled={!config?.enabled} onClick={start}>Let’s play</button>
            </div>
          </>
        )}

        {(screen === 'checking' || screen === 'submitting' || screen === 'recovering' || screen === 'claiming') && (
          <div className="result-card">
            <h2 className="mb-2">{screen === 'checking' ? 'Checking connection…' : screen === 'submitting' ? 'Saving result…' : screen === 'claiming' ? 'Claiming coupon…' : 'Finding your play…'}</h2>
            <p>This may take a few seconds.</p>
          </div>
        )}

        {screen === 'result' && (
          <div className="result-card">
            <h2 className={data.status === 'won' ? '' : 'text-muted'}>{resultTitle[data.status]}</h2>
            
            {data.status === 'won' ? (
              <>
                <div className="coupon-ticket">
                  <div className="coupon-label">YOUR COUPON</div>
                  <div className="flex-row" style={{justifyContent: 'center', gap: '8px'}}>
                    <div className="coupon-code">{data.code}</div>
                    <button className="btn-icon-only" style={{width: '36px', height: '36px', minHeight: '36px'}} onClick={copyCoupon} title="Copy code">
                      {copied ? '✓' : '📋'}
                    </button>
                  </div>
                  <div className="text-sm mt-4 text-left">
                    <div className="mb-2"><strong>Show this code</strong> at the counter</div>
                    <div><strong>Valid for 7 days</strong> until {new Date(data.expiresAt).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
                
                <div className="warning-banner text-left">
                  <span aria-hidden="true">⚠️</span>
                  <div>Don’t lose the coupon code or share with strangers.</div>
                </div>

                <div className="bottom-action-bar">
                  <button className="btn btn-whatsapp" onClick={shareCoupon}>
                    <span aria-hidden="true">↗</span> Share coupon code
                  </button>
                  <a className="btn btn-outline" href="https://maps.app.goo.gl/wRiGJTGCmUnWQVrq9" target="_blank" rel="noreferrer">
                    Get directions
                  </a>
                  <button className="btn btn-ghost" onClick={newPlay}>Play again</button>
                </div>
              </>
            ) : (
              <>
                {data.reactionMs !== null && (
                  <div className="result-time">
                    {data.reactionMs}
                    <small>ms reaction</small>
                  </div>
                )}
                <p className="mb-6">{failureMessage}</p>
                <div className="bottom-action-bar">
                  <button className="btn btn-primary" onClick={newPlay}>Play again</button>
                </div>
              </>
            )}
            
            {isDiagnostic && diag.current && <pre className="notice text-left text-xs" style={{overflowX: 'auto'}}>{JSON.stringify(diag.current, null, 2)}</pre>}
          </div>
        )}

        {screen === 'active_coupon' && (
          <div className="result-card">
            <h2 className="mb-2">Coupon active</h2>
            <p className="mb-6">Redeem your current coupon or wait for it to expire, then this number can claim again.</p>
            <div className="bottom-action-bar">
              <button className="btn btn-primary" onClick={newPlay}>Play again</button>
            </div>
          </div>
        )}

        {screen === 'interrupted' && (
          <div className="result-card">
            <h2 className="mb-2">Recover play</h2>
            <p className="mb-6">Check your saved result, or clear the interrupted play and begin again.</p>
            {error && <div className="error notice mb-6">{error}</div>}
            <div className="bottom-action-bar">
              <button className="btn btn-primary mb-2" onClick={recover}>Check result</button>
              <button className="btn btn-outline" onClick={newPlay}>Start a new game</button>
            </div>
          </div>
        )}
      </main>
      
      {screen === 'claim' && claimPanel}
    </Shell>
  );
}

function Staff() {
  const [signed, setSigned] = useState(false), [password, setPassword] = useState(''), [query, setQuery] = useState(''), [rows, setRows] = useState([]), [view, setView] = useState('recent'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  
  async function run(fn) { if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); try { await fn(); } catch(e) { setMessage(e.message); if (e.key === 'unauthorized') setSigned(false); } finally { lock.current = false; setBusy(false); } }
  async function loadCoupons(nextView) { const r = await api('staff/coupons', { view: nextView }); setRows(r.results); setView(nextView); if (!r.results.length) setMessage(nextView === 'redeemed' ? 'No redeemed coupons yet.' : 'No recent wins waiting for redemption.'); }
  async function search() { const r = await api('staff/search', { query }); setRows(r.results); setView('search'); if (!r.results.length) setMessage('No matching coupon found.'); }
  async function redeem(row) { const r = await api('staff/redeem', { id: row.id }); setRows(current => current.map(item => item.id === row.id ? { ...item, redeemed: 1, redeemed_at: r.redeemedAt || Date.now() } : item)); setMessage(r.alreadyRedeemed ? 'Already redeemed. Do not hand over another prize.' : 'Redemption confirmed. Hand over the prize now.'); }
  async function signIn(payload) { await api('staff/login', payload); setPassword(''); setSigned(true); await loadCoupons('recent'); }
  async function signOut() { await run(async () => { await api('staff/logout', {}); setRows([]); setView('recent'); setSigned(false); }); }
  
  const localDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const listTitle = view === 'redeemed' ? 'Redeemed coupons' : view === 'search' ? 'Search results' : 'Recent wins';
  
  const signOutAction = signed ? <button className="btn btn-ghost" style={{minHeight: '44px', padding: '0'}} disabled={busy} onClick={signOut}>Sign out</button> : null;
  
  return (
    <Shell staff headerAction={signOutAction}>
      <main className="app-main">
        {!signed ? (
          <div className="card">
            <h2 className="mb-4">Staff sign in</h2>
            <form onSubmit={e => { e.preventDefault(); run(() => signIn({ password })); }}>
              {localDevelopment && (
                <>
                  <button className="btn btn-secondary mb-2" type="button" disabled={busy} onClick={() => run(() => signIn({ development: true }))}>Use local admin</button>
                  <p className="text-xs text-center text-muted mb-4">Development only</p>
                </>
              )}
              <div className="form-group">
                <input className="input-field" id="password" placeholder="Enter password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={busy}>Sign in</button>
            </form>
          </div>
        ) : (
          <>
            <form onSubmit={e => { e.preventDefault(); run(search); }} className="mb-4">
              <div className="flex-row">
                <input className="input-field" id="search" value={query} onChange={e => setQuery(e.target.value)} required maxLength={40} placeholder="Search code or mobile" />
                <button className="btn btn-primary" style={{width: 'auto', minWidth: '80px'}} disabled={busy}>Find</button>
              </div>
            </form>
            
            <div className="staff-toolbar">
              <button className={view === 'recent' ? 'active' : ''} disabled={busy} onClick={() => run(() => loadCoupons('recent'))}>Recent wins</button>
              <button className={view === 'redeemed' ? 'active' : ''} disabled={busy} onClick={() => run(() => loadCoupons('redeemed'))}>Redeemed</button>
            </div>
            
            <div className="flex-between mb-4">
              <h3 className="text-lg">{listTitle}</h3>
              <span className="badge badge-expired">{rows.length}</span>
            </div>
            
            <div className="staff-results">
              {rows.map(row => { 
                const expired = row.expires_at <= Date.now(); 
                const daysLeft = Math.max(0, Math.ceil((row.expires_at - Date.now()) / 86400000)); 
                const status = row.redeemed ? 'Redeemed' : expired ? 'Expired' : 'Ready'; 
                const statusClass = row.redeemed ? 'badge-redeemed' : expired ? 'badge-expired' : 'badge-ready';
                
                return (
                  <div key={row.id} className="card mb-4" style={{padding: '16px'}}>
                    <div className="flex-between mb-2">
                      <strong className="font-display" style={{fontSize: '18px', color: 'var(--color-primary)'}}>{row.code}</strong>
                      <span className={`badge coupon-status ${statusClass}`}>{status}</span>
                    </div>
                    <div className="text-xs text-muted mb-2 text-uppercase font-weight-bold">{row.game_name || 'Tap Fast. Sip Free.'}</div>
                    <div className="flex-between align-end mb-4">
                      <div>
                        <h3 style={{fontSize: '16px', marginBottom: '2px'}}>{row.name}</h3>
                        <div className="text-sm text-muted">
                          <a href={`tel:${row.phone}`}>{row.phone}</a> • {row.reaction_ms} ms
                        </div>
                      </div>
                    </div>
                    <div className="list-tile" style={{padding: '12px', background: 'var(--bg-elevated)', border: 'none', marginBottom: '16px'}}>
                      <div className="list-tile-content">
                        <div className="text-xs text-muted">PRIZE</div>
                        <div className="font-weight-bold text-sm">{row.prize_label}</div>
                      </div>
                    </div>
                    <div className="flex-between align-end">
                      <div className="text-xs text-muted">
                        <div>Won {new Date(row.created_at).toLocaleString('en-IN')}</div>
                        <div>Expires {new Date(row.expires_at).toLocaleString('en-IN')} ({expired ? 'Expired' : `${daysLeft} days left`})</div>
                        {!!row.redeemed && <div className="mt-1" style={{color: 'var(--status-success)'}}>Redeemed {new Date(row.redeemed_at).toLocaleString('en-IN')}</div>}
                      </div>
                      {!row.redeemed && (
                        <button className="btn btn-primary" style={{width: 'auto', minHeight: '36px', padding: '0 16px', fontSize: '13px'}} disabled={busy || expired} onClick={() => run(() => redeem(row))}>
                          {expired ? 'Expired' : 'Redeem'}
                        </button>
                      )}
                    </div>
                  </div>
                ); 
              })}
            </div>
          </>
        )}
        {message && <div className="notice" role="status">{message}</div>}
      </main>
    </Shell>
  );
}

function Privacy() {
  const [config, setConfig] = useState(null); useEffect(() => { api('config').then(setConfig).catch(() => {}); }, []);
  return (
    <Shell>
      <main className="app-main">
        <h1 className="mb-4">Privacy</h1>
        <div className="card">
          <h2 className="mb-2">What we collect</h2>
          <p className="mb-4">You can play the challenge without entering any personal information. If you win, we ask for your name and mobile number to issue a coupon. We also record your estimated reaction time and any coupon/redemption record. We do not use your details for marketing.</p>
          
          <h2 className="mb-2">One coupon at a time</h2>
          <p className="mb-4">Each mobile number may hold one unredeemed coupon at a time. After staff redeem it, the same number can claim another winning coupon immediately. Unredeemed coupons expire seven days after issuance.</p>
          
          <h2 className="mb-2">How long we keep it</h2>
          <p className="mb-4">{config ? `We retain your details for ${config.retentionDays} days after your coupon is issued, then remove them automatically during our regular cleanup.` : 'Your details are retained for 30 days after your coupon is issued, then removed automatically during our regular cleanup.'}</p>
          
          <h2 className="mb-2">Who can see it</h2>
          <p className="mb-4">Authorized staff can search coupons. The owner can manage and export operational records. Cloudflare provides hosting, database, and bot verification infrastructure.</p>
          
          <h2 className="mb-2">Browser storage</h2>
          <p className="mb-6">A temporary session credential lets this tab recover your result. Short-lived security cookies support connection checks and staff access. No third-party marketing analytics are installed.</p>
          
          <a href="/" className="btn btn-outline">Back to play</a>
        </div>
      </main>
    </Shell>
  );
}

export default function App() {
  const isStaff = location.pathname === '/staff';
  document.title = isStaff ? 'Admin' : 'Let’s play! 🧋';
  return isStaff ? <Staff /> : location.pathname === '/privacy' ? <Privacy /> : <CustomerExperience />;
}
