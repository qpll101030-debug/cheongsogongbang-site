// 상담 신청이 접수될 때 호출: 신청자의 접속 경로(광고 방문 번호, IP, 유입 주소)를 기록
import { ensureLeadTable } from '../_lib/adtable.js';
const ck = (req, n) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + n + '=([^;]+)')); return m ? m[1] : ''; };
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return new Response(null, { status: 204 });
    let b = {}; try { b = JSON.parse(await request.text()); } catch (e) {}
    const cf = request.cf || {}, ua = request.headers.get('User-Agent') || '';
    const vid = [ck(request, 'cg_ad'), ck(request, 'cg_vid')].find((v) => /^[0-9a-f-]{36}$/.test(v)) || '';
    const s = (v, n) => String(v || '').slice(0, n);
    await ensureLeadTable(env.DB);
    await env.DB.prepare('INSERT INTO lead_trace (id, ts, name, phone4, source, page, referrer, ip, region, device, ua, vid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), Date.now(), s(b.name, 40), s(b.phone, 20).replace(/\D/g, '').slice(-4), s(b.source, 60), s(b.page, 120), s(b.ref, 300),
        request.headers.get('CF-Connecting-IP') || '', [cf.country, cf.region, cf.city].filter(Boolean).join(' '),
        /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'pc', ua.slice(0, 300), vid).run();
  } catch (e) {}
  return new Response(null, { status: 204 });
}
