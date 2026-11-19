// 상담 신청별 접속 경로 조회. 비밀키(AD_LOG_KEY) 필요. /api/lead-log?days=30
import { ensureTable, ensureLeadTable } from '../_lib/adtable.js';
const j = (o, s = 200) => new Response(JSON.stringify(o, null, 1), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const kst = (ts) => new Date(ts + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('key') || '';
  if (!env.AD_LOG_KEY || !same(key, env.AD_LOG_KEY)) return j({ error: 'unauthorized' }, 401);
  if (!env.DB) return j({ error: 'D1 binding(DB) missing' }, 500);
  await ensureTable(env.DB); await ensureLeadTable(env.DB);
  const days = Math.min(90, Math.max(1, +url.searchParams.get('days') || 30));
  const since = Date.now() - days * 864e5;
  const leads = (await env.DB.prepare('SELECT * FROM lead_trace WHERE ts >= ? ORDER BY ts').bind(since).all()).results || [];
  const out = [];
  for (const l of leads) {
    let v = null, how = '';
    if (l.vid) { v = await env.DB.prepare('SELECT * FROM ad_visits WHERE id = ?').bind(l.vid).first(); if (v) how = '광고방문번호 일치'; }
    if (!v && l.ip) { v = await env.DB.prepare('SELECT * FROM ad_visits WHERE ip = ? AND ts <= ? AND ts >= ? ORDER BY ts DESC LIMIT 1').bind(l.ip, l.ts, l.ts - 7 * 864e5).first(); if (v) how = '같은IP 7일내 광고방문'; }
    out.push({ time: kst(l.ts), name: l.name, phone_last4: l.phone4, source: l.source, page: l.page, referrer: l.referrer || '(직접 접속/없음)', ip: l.ip, region: l.region, device: l.device,
      ad: v ? { match: how, visit_time: kst(v.ts), keyword: v.keyword, rank: v.rank, media: v.media, landing: v.landing } : null });
  }
  return j({ days, count: out.length, leads: out });
}
