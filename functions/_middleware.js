// 1) www.cleanateliers.com → cleanateliers.com 영구 이동(301)
// 2) 네이버 파워링크 광고 방문(자동 추적 파라미터 n_* 가 붙은 방문)만 D1에 기록
//    오류가 나도 사이트는 항상 그대로 열리게 합니다.
const NAVER_PARAMS = ['n_media', 'n_query', 'n_rank', 'n_ad_group', 'n_ad', 'n_keyword_id', 'n_keyword', 'n_campaign_type', 'n_contract'];
const COOKIE = 'cg_vid';

function getCookie(req, name) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

export async function onRequest(context) {
  const { request, env } = context;
  let url;
  try {
    url = new URL(request.url);
    if (url.hostname === 'www.cleanateliers.com') {
      url.hostname = 'cleanateliers.com';
      return Response.redirect(url.toString(), 301);
    }
  } catch (e) { return context.next(); }

  let setCookie = '';
  let tracking = false;
  try {
    const isPage = request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html');
    if (isPage && env.DB && !url.pathname.startsWith('/api/')) {
      const hasAd = NAVER_PARAMS.some((k) => url.searchParams.has(k));
      const vid = getCookie(request, COOKIE);
      if (hasAd) {
        const id = crypto.randomUUID();
        const cf = request.cf || {};
        const now = Date.now();
        const p = (k) => (url.searchParams.get(k) || '').slice(0, 200);
        context.waitUntil(
          env.DB.prepare(
            'INSERT INTO ad_visits (id, ts, ip, country, region, city, ua, device, keyword, rank, media, landing, pages, dwell_sec, last_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,NULL,?)'
          ).bind(
            id, now,
            request.headers.get('CF-Connecting-IP') || '',
            cf.country || '', cf.region || '', cf.city || '',
            (request.headers.get('User-Agent') || '').slice(0, 300),
            /Mobi|Android|iPhone/i.test(request.headers.get('User-Agent') || '') ? 'mobile' : 'pc',
            p('n_keyword') || p('n_query'), p('n_rank'), p('n_media'),
            (url.pathname + url.search).slice(0, 500), now
          ).run().catch(() => {})
        );
        setCookie = `${COOKIE}=${id}; Path=/; Max-Age=1800; SameSite=Lax; Secure`;
        tracking = true;
      } else if (vid) {
        context.waitUntil(
          env.DB.prepare('UPDATE ad_visits SET pages = pages + 1 WHERE id = ?').bind(vid).run().catch(() => {})
        );
        tracking = true;
      }
    }
  } catch (e) { /* 기록 실패는 무시 */ }

  const res = await context.next();
  try {
    if (!tracking || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;
    const out = new Response(res.body, res);
    if (setCookie) out.headers.append('Set-Cookie', setCookie);
    return new HTMLRewriter()
      .on('body', { element(el) { el.append('<script src="/ad-track.js" defer></script>', { html: true }); } })
      .transform(out);
  } catch (e) { return res; }
}
