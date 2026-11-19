// 표가 없으면 자동으로 만듭니다 (D1 콘솔에서 SQL을 직접 실행할 필요 없음)
let ready = null;
export function ensureTable(db) {
  if (!ready) ready = db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS ad_visits (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, ip TEXT, country TEXT, region TEXT, city TEXT, ua TEXT, device TEXT, keyword TEXT, rank TEXT, media TEXT, landing TEXT, pages INTEGER DEFAULT 1, dwell_sec INTEGER, last_ts INTEGER)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_ad_visits_ts ON ad_visits(ts)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_ad_visits_ip ON ad_visits(ip, ts)"),
  ]).catch((e) => { ready = null; throw e; });
  return ready;
}

// 상담 신청과 접속 경로를 잇는 표 (이름·번호 뒷4자리·IP·광고 방문 번호만 저장)
let leadReady = null;
export function ensureLeadTable(db) {
  if (!leadReady) leadReady = db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS lead_trace (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, name TEXT, phone4 TEXT, source TEXT, page TEXT, referrer TEXT, ip TEXT, region TEXT, device TEXT, ua TEXT, vid TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lead_trace_ts ON lead_trace(ts)"),
  ]).catch((e) => { leadReady = null; throw e; });
  return leadReady;
}
