// 네이버 검색광고 API로 키워드별 검색량·순위별 예상 입찰가를 받아 Supabase에 저장 (매일 GitHub Actions에서 실행)
// 필요한 비밀값(GitHub Secrets): NAVER_AD_API_KEY, NAVER_AD_SECRET, NAVER_AD_CUSTOMER_ID, SUPABASE_SERVICE_KEY
import crypto from 'node:crypto';

const API = process.env.NAVER_AD_API || 'https://api.searchad.naver.com';
const { NAVER_AD_API_KEY: KEY, NAVER_AD_SECRET: SECRET, NAVER_AD_CUSTOMER_ID: CID, SUPABASE_SERVICE_KEY: SB_KEY } = process.env;
const SB_URL = process.env.SUPABASE_URL || 'https://xkprrwwubwzpkgpmdsuq.supabase.co';
const POSITIONS = { PC: [1,2,3,4,5,6,7,8,9,10], MOBILE: [1,2,3,4,5,6,7,8,9,10] };
const DRY = process.argv.includes('--dry');

for (const [k, v] of Object.entries({ NAVER_AD_API_KEY: KEY, NAVER_AD_SECRET: SECRET, NAVER_AD_CUSTOMER_ID: CID, SUPABASE_SERVICE_KEY: SB_KEY }))
  if (!v) { console.error(`비밀값 ${k} 이(가) 없습니다. GitHub 저장소 Settings → Secrets and variables → Actions 에 넣어 주세요.`); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
function sign(ts, method, uri) { return crypto.createHmac('sha256', SECRET).update(`${ts}.${method}.${uri}`).digest('base64'); }
async function naver(method, uri, { query, body } = {}) {
  for (let attempt = 1; ; attempt++) {
    const ts = String(Date.now());
    const url = API + uri + (query ? '?' + new URLSearchParams(query) : '');
    const r = await fetch(url, { method, headers: { 'X-Timestamp': ts, 'X-API-KEY': KEY, 'X-Customer': String(CID), 'X-Signature': sign(ts, method, uri), ...(body ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.ok) return r.json();
    const t = await r.text();
    if ((r.status === 429 || r.status >= 500) && attempt < 4) { await sleep(1500 * attempt); continue; }
    throw new Error(`네이버 API ${method} ${uri} 실패: ${r.status} ${t.slice(0, 300)}`);
  }
}
const sbHeaders = SB_KEY.startsWith('sb_') ? { apikey: SB_KEY } : { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
async function sb(path, init = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...sbHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`Supabase ${path} 실패: ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}
const num = v => v == null ? null : typeof v === 'number' ? v : /</.test(String(v)) ? 5 : Number(String(v).replace(/[^0-9.]/g, '')) || 0;  // "< 10" → 5
const norm = s => String(s).replace(/\s+/g, '').toUpperCase();

const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
const kws = (await sb('ad_keywords?select=keyword,grp&active=eq.true&order=keyword')).map(r => r.keyword);
console.log(`${day} · 키워드 ${kws.length}개 수집 시작`);
const rows = Object.fromEntries(kws.map(k => [k, { day, keyword: k, pc_qc: null, mo_qc: null, pc_clk: null, mo_clk: null, comp: null, depth: null, pc_bid: {}, mo_bid: {} }]));

// 1) 검색량·클릭 (5개씩)
for (let i = 0; i < kws.length; i += 5) {
  const part = kws.slice(i, i + 5);
  const d = await naver('GET', '/keywordstool', { query: { hintKeywords: part.map(k => k.replace(/\s+/g, '')).join(','), showDetail: '1' } });
  for (const it of d.keywordList || []) {
    const k = part.find(x => norm(x) === norm(it.relKeyword)); if (!k) continue;
    Object.assign(rows[k], { pc_qc: num(it.monthlyPcQcCnt), mo_qc: num(it.monthlyMobileQcCnt), pc_clk: num(it.monthlyAvePcClkCnt), mo_clk: num(it.monthlyAveMobileClkCnt), comp: it.compIdx ?? null, depth: num(it.plAvgDepth) });
  }
  await sleep(400);
}
// 2) 순위별 예상 입찰가 (PC·모바일)
for (const [device, col] of [['PC', 'pc_bid'], ['MOBILE', 'mo_bid']]) {
  for (let i = 0; i < kws.length; i += 10) {
    const part = kws.slice(i, i + 10);
    const put = d => { for (const e of d.estimate || []) { const k = part.find(x => norm(x) === norm(e.keyword)); if (k) rows[k][col][e.position] = e.bid; } };
    try {
      put(await naver('POST', '/estimate/average-position-bid/keyword', { body: { device, items: part.flatMap(k => POSITIONS[device].map(position => ({ key: k, position }))) } }));
    } catch (err) {
      // 일부 순위를 지원하지 않으면 1~5위만 다시 요청
      console.log(`${device} 1~${POSITIONS[device].length}위 요청 실패 → 1~5위로 재시도: ${err.message}`);
      put(await naver('POST', '/estimate/average-position-bid/keyword', { body: { device, items: part.flatMap(k => [1,2,3,4,5].map(position => ({ key: k, position }))) } }));
    }
    await sleep(400);
  }
}
const out = Object.values(rows);
if (process.env.RESULT_FILE) (await import('node:fs')).writeFileSync(process.env.RESULT_FILE, JSON.stringify(out));
console.log(out.map(r => `${r.keyword}\t검색 ${r.pc_qc ?? '-'}/${r.mo_qc ?? '-'}\tPC1위 ${r.pc_bid[1] ?? '-'}원\t모바일1위 ${r.mo_bid[1] ?? '-'}원`).join('\n'));
if (DRY) { console.log('(--dry: 저장하지 않음)'); process.exit(0); }
await sb('ad_kw_daily?on_conflict=day,keyword', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(out) });
console.log(`저장 완료: ${out.length}개`);
