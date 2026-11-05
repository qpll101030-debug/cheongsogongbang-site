// 날짜별 광고 방문 기록 + 의심 패턴 분석. 비밀키(AD_LOG_KEY)가 있어야만 열립니다.
// 사용: /api/ad-log?date=2026-11-05  (헤더 Authorization: Bearer 비밀키 권장, ?key= 도 가능)
import { ensureTable } from '../_lib/adtable.js';
const j = (o, s = 200) => new Response(JSON.stringify(o, null, 1), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const kstHour = (ts) => new Date(ts + 9 * 3600e3).getUTCHours();
const kstStr = (ts) => new Date(ts + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const key = bearer || url.searchParams.get('key') || '';
  if (!env.AD_LOG_KEY || !same(key, env.AD_LOG_KEY)) return j({ error: 'unauthorized' }, 401);
  if (!env.DB) return j({ error: 'D1 binding(DB) missing' }, 500);

  await ensureTable(env.DB);
  const date = url.searchParams.get('date') || kstStr(Date.now()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return j({ error: 'date=YYYY-MM-DD' }, 400);
  const start = Date.parse(date + 'T00:00:00+09:00'), end = start + 86400e3;
  const { results } = await env.DB.prepare('SELECT * FROM ad_visits WHERE ts >= ? AND ts < ? ORDER BY ts').bind(start, end).all();
  const rows = results || [];

  const flags = [];
  const byIp = {};
  rows.forEach((r) => { (byIp[r.ip] = byIp[r.ip] || []).push(r); });

  for (const [ip, v] of Object.entries(byIp)) {
    if (v.length >= 3) flags.push({ rule: '같은IP_하루3회이상', ip, count: v.length, region: v[0].region, keywords: [...new Set(v.map((x) => x.keyword))] });
    const quick = v.filter((x) => x.dwell_sec === null || x.dwell_sec <= 3);
    if (quick.length >= 2) flags.push({ rule: '체류0~3초_반복', ip, count: quick.length, of: v.length, note: '체류 기록 없음(스크립트 미실행)도 포함' });
    if (v.length >= 3) {
      const gaps = []; for (let i = 1; i < v.length; i++) gaps.push((v[i].ts - v[i - 1].ts) / 1000);
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
      if (mean > 0 && sd / mean < 0.2) flags.push({ rule: '일정간격_반복유입', ip, count: v.length, avg_gap_sec: Math.round(mean) });
    }
  }
  const night = rows.filter((r) => kstHour(r.ts) < 6);
  if (night.length >= 3 && night.length / rows.length >= 0.4)
    flags.push({ rule: '새벽(0~6시)_몰림', count: night.length, of: rows.length, ips: [...new Set(night.map((x) => x.ip))] });

  return j({
    date, total: rows.length, unique_ip: Object.keys(byIp).length,
    suspicious_ips: [...new Set(flags.filter((f) => f.ip).map((f) => f.ip))],
    flags,
    rows: rows.map((r) => ({ time: kstStr(r.ts), ip: r.ip, region: [r.country, r.region, r.city].filter(Boolean).join(' '), device: r.device, keyword: r.keyword, rank: r.rank, media: r.media, landing: r.landing, dwell_sec: r.dwell_sec, pages: r.pages, ua: r.ua })),
  });
}
