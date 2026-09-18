PRAGMA foreign_keys = ON;
CREATE TABLE config (
 id INTEGER PRIMARY KEY CHECK(id=1), prize_label TEXT NOT NULL, prize_terms TEXT NOT NULL,
 minimum_reaction_ms INTEGER NOT NULL DEFAULT 120 CHECK(minimum_reaction_ms>=0),
 win_threshold_ms INTEGER NOT NULL DEFAULT 450 CHECK(win_threshold_ms>minimum_reaction_ms),
 coupon_validity_ms INTEGER NOT NULL CHECK(coupon_validity_ms>0), retention_days INTEGER NOT NULL CHECK(retention_days>=1),
 deletion_contact TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN(0,1)), version INTEGER NOT NULL DEFAULT 1
);
INSERT INTO config VALUES(1,'Demo reward','Local test only — no real prize',120,450,86400000,30,'Not configured',0,1);
CREATE TABLE attempts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, request_key TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL, completed_at INTEGER, play_date TEXT NOT NULL,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80), phone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN('reserved','won','lost','too_early','expired')),
 reaction_ms INTEGER, win_threshold_ms INTEGER NOT NULL, minimum_reaction_ms INTEGER NOT NULL,
 prize_label TEXT NOT NULL, prize_terms TEXT NOT NULL, config_version INTEGER NOT NULL,
 coupon_validity_ms INTEGER NOT NULL, code TEXT UNIQUE, expires_at INTEGER,
 redeemed INTEGER NOT NULL DEFAULT 0 CHECK(redeemed IN(0,1)), redeemed_at INTEGER,
 CHECK((status='won' AND code IS NOT NULL AND expires_at IS NOT NULL) OR (status!='won' AND code IS NULL)),
 CHECK((redeemed=0 AND redeemed_at IS NULL) OR (redeemed=1 AND redeemed_at IS NOT NULL AND status='won')),
 UNIQUE(phone,play_date)
);
CREATE INDEX attempts_phone ON attempts(phone,created_at DESC);
CREATE TABLE sessions (
 token TEXT PRIMARY KEY, attempt_id INTEGER NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
 flash_issued_ms INTEGER NOT NULL, latency_baseline_ms INTEGER NOT NULL CHECK(latency_baseline_ms BETWEEN 0 AND 1000),
 waiting_delay_ms INTEGER NOT NULL CHECK(waiting_delay_ms BETWEEN 1500 AND 4500), expires_at_ms INTEGER NOT NULL,
 used INTEGER NOT NULL DEFAULT 0 CHECK(used IN(0,1)), created_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at_ms);
CREATE TABLE measurements (
 token TEXT PRIMARY KEY, owner TEXT NOT NULL, issued_ms INTEGER NOT NULL, duration_ms INTEGER
);
CREATE INDEX measurements_owner ON measurements(owner,issued_ms);
CREATE TABLE staff_sessions (token TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, password_version TEXT NOT NULL);
CREATE TABLE rate_limits (window_key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
