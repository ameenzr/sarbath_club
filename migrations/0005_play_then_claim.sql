-- Separate anonymous plays from verified coupon claims.
-- Existing attempts/coupons remain intact and are copied for compatibility.
CREATE TABLE plays (
 id INTEGER PRIMARY KEY AUTOINCREMENT, request_key TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL, completed_at INTEGER,
 status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN('reserved','won','lost','too_early','expired')),
 reaction_ms INTEGER, win_threshold_ms INTEGER NOT NULL, minimum_reaction_ms INTEGER NOT NULL,
 prize_label TEXT NOT NULL, prize_terms TEXT NOT NULL, config_version INTEGER NOT NULL,
 coupon_validity_ms INTEGER NOT NULL CHECK(coupon_validity_ms>0)
);
INSERT INTO plays SELECT id,request_key,created_at,completed_at,status,reaction_ms,win_threshold_ms,minimum_reaction_ms,prize_label,prize_terms,config_version,coupon_validity_ms FROM attempts;
CREATE INDEX plays_retention ON plays(created_at);
CREATE TABLE play_sessions (
 token TEXT PRIMARY KEY, play_id INTEGER NOT NULL UNIQUE REFERENCES plays(id) ON DELETE CASCADE,
 flash_issued_ms INTEGER NOT NULL, latency_baseline_ms INTEGER NOT NULL CHECK(latency_baseline_ms BETWEEN 0 AND 1000),
 waiting_delay_ms INTEGER NOT NULL CHECK(waiting_delay_ms BETWEEN 1500 AND 4500), expires_at_ms INTEGER NOT NULL,
 used INTEGER NOT NULL DEFAULT 0 CHECK(used IN(0,1)), created_at INTEGER NOT NULL
);
INSERT INTO play_sessions SELECT token,attempt_id,flash_issued_ms,latency_baseline_ms,waiting_delay_ms,expires_at_ms,used,created_at FROM sessions;
CREATE INDEX play_sessions_expiry ON play_sessions(expires_at_ms);
CREATE TABLE coupons (
 id INTEGER PRIMARY KEY AUTOINCREMENT, play_id INTEGER NOT NULL UNIQUE REFERENCES plays(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80), phone TEXT NOT NULL,
 code TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at>created_at),
 prize_label TEXT NOT NULL, prize_terms TEXT NOT NULL,
 redeemed INTEGER NOT NULL DEFAULT 0 CHECK(redeemed IN(0,1)), redeemed_at INTEGER,
 CHECK((redeemed=0 AND redeemed_at IS NULL) OR (redeemed=1 AND redeemed_at IS NOT NULL))
);
INSERT INTO coupons(id,play_id,name,phone,code,created_at,expires_at,prize_label,prize_terms,redeemed,redeemed_at)
 SELECT id,id,name,phone,code,COALESCE(completed_at,created_at),expires_at,prize_label,prize_terms,redeemed,redeemed_at FROM attempts WHERE status='won' AND code IS NOT NULL;
CREATE INDEX coupons_phone ON coupons(phone,created_at DESC);
CREATE INDEX coupons_retention ON coupons(created_at);
CREATE TABLE coupon_locks (
 phone TEXT PRIMARY KEY, coupon_id INTEGER NOT NULL UNIQUE REFERENCES coupons(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
-- Retain issued legacy coupons. Block new claims until the latest prior expiry.
INSERT INTO coupon_locks(phone,coupon_id,expires_at)
 SELECT c.phone,c.id,c.expires_at FROM coupons c
 WHERE c.id=(SELECT c2.id FROM coupons c2 WHERE c2.phone=c.phone ORDER BY c2.expires_at DESC,c2.id DESC LIMIT 1);
