CREATE TABLE IF NOT EXISTS ad_visits (
  id TEXT PRIMARY KEY, ts INTEGER NOT NULL, ip TEXT, country TEXT, region TEXT, city TEXT,
  ua TEXT, device TEXT, keyword TEXT, rank TEXT, media TEXT, landing TEXT,
  pages INTEGER DEFAULT 1, dwell_sec INTEGER, last_ts INTEGER
);
CREATE INDEX IF NOT EXISTS idx_ad_visits_ts ON ad_visits(ts);
CREATE INDEX IF NOT EXISTS idx_ad_visits_ip ON ad_visits(ip, ts);
