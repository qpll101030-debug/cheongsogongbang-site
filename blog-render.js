/* 블로그 화면 만들기 (빌드 때 서버에서 실행) — 사례 게시판(cases-render.js)의 틀을 그대로 씁니다 */
const C = require('./cases-render.js');
const SITE = '청소공방', PER_PAGE = 12;
const TALK = 'https://talk.naver.com/ct/w5tas4', TEL = '010-8833-0999';
const esc = C.esc;
const path = slug => '/blog/' + encodeURIComponent(slug) + '/';
const listPath = page => '/blog/' + (page > 1 ? 'p/' + page + '/' : '');
const plain = (t, n) => { t = String(t || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const okUrl = u => /^(https?:\/\/|\/|img\/)/i.test(String(u || '').trim());

/* 허용한 태그만 남기는 정리기 */
const ALLOW = new Set(['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img', 'figure', 'figcaption']);
function clean(html) {
  html = String(html || '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  return html.split(/(<[^>]*>)/).map(tok => {
    if (!tok.startsWith('<')) return tok.replace(/>/g, '&gt;');
    const m = tok.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>$/);
    if (!m || !ALLOW.has(m[2].toLowerCase())) return '';
    const t = m[2].toLowerCase();
    if (m[1]) return t === 'br' || t === 'hr' || t === 'img' ? '' : `</${t}>`;
    const attr = n => { const r = m[3].match(new RegExp('\\s' + n + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i')); return r ? (r[2] != null ? r[2] : r[3]) : ''; };
    if (t === 'a') { const h = attr('href').trim(); return /^(https?:\/\/|\/|tel:|mailto:)/i.test(h) ? `<a href="${esc(h)}" target="_blank" rel="noopener">` : '<a>'; }
    if (t === 'img') { const s = attr('src').trim(); return okUrl(s) ? `<img src="${esc(s)}" alt="${esc(attr('alt'))}" loading="lazy" decoding="async">` : ''; }
    return t === 'br' || t === 'hr' ? `<${t}>` : `<${t}>`;
  }).join('');
}
const firstImg = h => { const m = String(h || '').match(/<img[^>]+src\s*=\s*"([^"]+)"/i); return m ? m[1] : ''; };
const cover = r => r.cover_url || firstImg(r.body_html) || '';

const CSS = `
.bl-body{font-size:17px;line-height:1.95;color:var(--text)}
.bl-body p{margin:0 0 18px}
.bl-body h2{font-size:clamp(22px,2.8vw,28px);font-weight:900;letter-spacing:-.02em;margin:44px 0 14px;color:var(--ink)}
.bl-body h3{font-size:19px;font-weight:800;margin:30px 0 10px;color:var(--ink)}
.bl-body img{max-width:100%;height:auto;border-radius:12px;display:block;margin:22px auto}
.bl-body figure{margin:22px 0}.bl-body figcaption{text-align:center;color:var(--muted);font-size:14px}
.bl-body blockquote{margin:22px 0;padding:14px 18px;border-left:4px solid var(--mint);background:var(--bg);border-radius:0 10px 10px 0}
.bl-body ul,.bl-body ol{margin:0 0 18px;padding-left:22px}.bl-body li{margin-bottom:6px}
.bl-body a{color:var(--blue);font-weight:600}
.bl-body hr{border:0;border-top:1px solid var(--line);margin:34px 0}
`;

function card(r) {
  const im = cover(r);
  return `<a class="cx-card" href="${path(r.slug)}"><div class="im">${im ? `<img src="${esc(im)}" alt="${esc(r.title)}" loading="lazy" decoding="async">` : ''}${r.category ? `<span class="cx-chip">${esc(r.category)}</span>` : ''}</div>
<div class="bd"><h3>${esc(r.title)}</h3>${r.summary ? `<p style="margin:0;color:var(--muted);font-size:14.5px;line-height:1.6">${esc(plain(r.summary, 80))}</p>` : ''}<time datetime="${esc(new Date(r.created_at).toISOString())}">${esc(C.fmtDate(r.created_at))}</time></div></a>`;
}

function listHTML(rows, o) {
  const page = o.page, total = o.total, pages = Math.max(1, Math.ceil(total / PER_PAGE));
  let pg = '';
  if (pages > 1) {
    const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
    pg = '<nav class="cx-pg" aria-label="페이지">' + (page > 1 ? `<a href="${listPath(page - 1)}" rel="prev">‹</a>` : '') +
      nums.map((n, i) => (i && n - nums[i - 1] > 1 ? '<span>…</span>' : '') + (n === page ? `<span aria-current="page">${n}</span>` : `<a href="${listPath(n)}">${n}</a>`)).join('') +
      (page < pages ? `<a href="${listPath(page + 1)}" rel="next">›</a>` : '') + '</nav>';
  }
  return `<section class="cx-wrap wide"><style>${CSS}</style>
<nav class="cx-crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><span>블로그</span></nav>
<header class="cx-head" style="max-width:720px"><span class="cx-chip" style="justify-self:start">BLOG</span><h1>청소공방 블로그</h1>
<p style="color:var(--muted);font-size:17px;margin:0">에어컨·매트리스·소파 청소 노하우와 교육·창업 이야기를 현장에서 직접 정리해 올립니다.</p></header>
${rows.length ? `<div class="cx-grid">${rows.map(card).join('')}</div>` : '<div class="cx-empty">아직 올라온 글이 없습니다.</div>'}
${pg}</section>`;
}

function postHTML(r, related) {
  const rel = (related || []).slice(0, 3);
  return `<article class="cx-wrap" itemscope itemtype="https://schema.org/BlogPosting"><style>${CSS}</style>
<nav class="cx-crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><a href="/blog/">블로그</a>${r.category ? `<span>›</span><span>${esc(r.category)}</span>` : ''}</nav>
<header class="cx-head">${r.category ? `<div class="cx-meta"><span class="cx-chip">${esc(r.category)}</span></div>` : ''}
<h1 itemprop="headline">${esc(r.title)}</h1>
<div class="cx-meta"><time datetime="${esc(new Date(r.created_at).toISOString())}" itemprop="datePublished">${esc(C.fmtDate(r.created_at))}</time><span>청소공방</span></div></header>
<div class="bl-body" itemprop="articleBody">${clean(r.body_html)}</div>
<section class="cx-cta"><h2>청소·교육 상담이 필요하신가요?</h2><p>사진만 보내 주시면 상태를 보고 안내해 드립니다.</p>
<div class="acts"><a class="btn btn-mint" href="${TALK}" target="_blank" rel="noopener">네이버 톡톡 문의</a><a class="btn btn-line" href="/consult.html">교육 상담 신청</a><a class="btn btn-line" href="tel:${TEL.replace(/-/g, '')}">${TEL}</a></div></section>
${rel.length ? `<section class="cx-rel"><h2>다른 글</h2><div class="cx-grid">${rel.map(card).join('')}</div></section>` : ''}
</article>`;
}

function postMeta(r, origin) {
  const u = origin + path(r.slug);
  const abs = x => { x = String(x || '').trim(); return /^https?:\/\//i.test(x) ? x : (x ? origin + (x[0] === '/' ? '' : '/') + x : ''); };
  const img = abs(cover(r));
  const desc = plain(r.summary || r.body_html || r.title, 150);
  const org = { '@type': 'Organization', name: SITE, url: origin + '/' };
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: r.title, description: desc, image: img ? [img] : undefined, datePublished: new Date(r.created_at).toISOString(), dateModified: new Date(r.updated_at || r.created_at).toISOString(), mainEntityOfPage: u, author: org, publisher: org, articleSection: r.category || undefined },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: origin + '/' },
      { '@type': 'ListItem', position: 2, name: '블로그', item: origin + '/blog/' },
      { '@type': 'ListItem', position: 3, name: r.title, item: u }] }
  ].map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  return { title: `${r.title} | ${SITE}`, desc, canonical: u, image: img, ld };
}
const listMeta = (o, origin) => ({ title: `청소공방 블로그${o.page > 1 ? ' ' + o.page + '페이지' : ''} | ${SITE}`, desc: '에어컨·매트리스·소파 청소 노하우와 교육·창업 이야기를 청소공방이 직접 정리해 올립니다.', canonical: origin + listPath(o.page || 1), image: '', ld: '' });

function feed(rows, origin) {
  const abs = x => /^https?:\/\//i.test(x) ? x : origin + (x[0] === '/' ? '' : '/') + x;
  const body = h => clean(h).replace(/(<img[^>]+src=")([^"]+)"/gi, (m, a, u) => a + esc(abs(u)) + '"').replace(/(<a[^>]+href=")(\/[^"]*)"/gi, (m, a, u) => a + esc(origin + u) + '"').replace(/]]>/g, ']]&gt;');
  const items = rows.slice(0, 30).map(r => `<item><title>${esc(r.title)}</title><link>${origin}${path(r.slug)}</link><guid isPermaLink="true">${origin}${path(r.slug)}</guid><pubDate>${new Date(r.created_at).toUTCString()}</pubDate>${r.category ? `<category>${esc(r.category)}</category>` : ''}<description>${esc(plain(r.summary || r.body_html, 200))}</description><content:encoded><![CDATA[${body(r.body_html)}]]></content:encoded></item>`).join('');
  const last = rows.length ? new Date(rows[0].updated_at || rows[0].created_at).toUTCString() : new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>청소공방 블로그</title><link>${origin}/blog/</link><atom:link href="${origin}/blog/feed.xml" rel="self" type="application/rss+xml"/><description>에어컨·매트리스·소파 청소 노하우와 교육·창업 이야기</description><language>ko</language><lastBuildDate>${last}</lastBuildDate>${items}</channel></rss>\n`;
}

module.exports = { clean, path, listPath, card, listHTML, postHTML, postMeta, listMeta, feed, PER_PAGE, CSS };
