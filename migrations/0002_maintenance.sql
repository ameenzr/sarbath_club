CREATE TABLE maintenance (id INTEGER PRIMARY KEY CHECK(id=1), last_run INTEGER NOT NULL);
INSERT INTO maintenance VALUES(1,0);
CREATE INDEX attempts_retention ON attempts(created_at);
CREATE INDEX measurements_expiry ON measurements(issued_ms);
CREATE INDEX staff_expiry ON staff_sessions(expires_at);
CREATE INDEX rate_expiry ON rate_limits(expires_at);
