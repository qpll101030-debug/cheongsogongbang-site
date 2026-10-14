/* =====================================================================
   사례 게시판 화면 만들기 (서버와 브라우저가 같이 씀)
   - 서버(Netlify 함수): 완성된 HTML을 내려줘서 네이버·구글이 글을 바로 읽음
   - 브라우저(case.html / cases.html): 함수를 쓰지 않는 배포일 때 같은 화면을 그림
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CASES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SITE = '청소공방 아카데미';
  const PER_PAGE = 12;
  const CATS = ['작업 사례', '교육 사례'];
  const TALK = 'https://talk.naver.com/profile/wenjgv6';
  const TEL = '010-8833-0999';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const url = u => { u = String(u || '').trim(); return /^(https?:\/\/|\/|img\/)/i.test(u) ? esc(u) : ''; };
  const arr = v => Array.isArray(v) ? v.filter(x => x != null && String(x).trim() !== '') : [];
  const paras = t => String(t || '').split(/\n{2,}|\r\n\r\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
  const kst = d => new Date(new Date(d).getTime() + 9 * 3600e3);
  const fmtDate = d => { if (!d) return ''; const k = kst(d); return `${k.getUTCFullYear()}.${String(k.getUTCMonth() + 1).padStart(2, '0')}.${String(k.getUTCDate()).padStart(2, '0')}`; };
  const isoDate = d => d ? new Date(d).toISOString() : '';
  const CAT_KEY = { '작업 사례': 'work', '교육 사례': 'edu' };
  const RESERVED = ['work', 'edu', 'p', 'page', 'index'];
  const path = slug => '/cases/' + encodeURIComponent(slug) + '/';
  const listPath = (cat, page) => '/cases/' + (CAT_KEY[cat] ? CAT_KEY[cat] + '/' : '') + (page > 1 ? 'p/' + page + '/' : '');
  const parseListPath = p => {
    const m = String(p || '').match(/^\/cases\/?(?:(work|edu)\/?)?(?:p\/(\d+)\/?)?$/);
    if (!m) return null;
    const cat = m[1] ? Object.keys(CAT_KEY).find(k => CAT_KEY[k] === m[1]) : '';
    return { cat, page: Math.max(1, parseInt(m[2], 10) || 1) };
  };
  const ldJson = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
  const plain = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

  /* ---------- 스타일 ---------- */
  const CSS = `
.cx-wrap{max-width:900px;margin:0 auto;padding:28px 20px 80px}
.cx-wrap.wide{max-width:1160px}
.cx-crumb{display:flex;flex-wrap:wrap;gap:6px;font-size:14px;color:var(--muted);margin-bottom:18px}
.cx-crumb a{text-decoration:none}.cx-crumb a:hover{color:var(--blue)}
.cx-head{display:grid;gap:12px;margin-bottom:26px}
.cx-head h1{font-size:clamp(25px,3.6vw,36px);font-weight:900;letter-spacing:-.03em;line-height:1.35}
.cx-meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:var(--muted);font-size:14px}
.cx-chip{display:inline-flex;align-items:center;font:600 13px/1 var(--body);padding:7px 11px;border-radius:99px;background:var(--blue-soft);color:var(--blue);text-decoration:none}
.cx-chip.m{background:var(--mint-soft);color:var(--mint-dk)}
.cx-chip.g{background:var(--bg);color:var(--muted);border:1px solid var(--line)}
.cx-sum{background:var(--bg);border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:12px;padding:20px 22px;display:grid;gap:14px;margin-bottom:26px}
.cx-sum h2{font-size:15px;font-weight:800;color:var(--blue);letter-spacing:.02em}
.cx-sum dl{display:grid;grid-template-columns:96px 1fr;gap:10px 14px;margin:0}
.cx-sum dt{font-weight:700;color:var(--ink);font-size:14.5px}
.cx-sum dd{margin:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:15px}
.cx-tip{border:1px dashed #b9c6d8;border-radius:12px;padding:16px 18px;margin-bottom:30px;font-size:15px;color:var(--text)}
.cx-tip b{color:var(--ink)}
.cx-tip a{color:var(--blue);font-weight:700}
.cx-sec{margin:40px 0 0;padding:0}
.cx-rel{padding:0}
.cx-sec p:last-child{margin-bottom:0}
.cx-sec>h2{font-size:clamp(21px,2.6vw,26px);font-weight:900;letter-spacing:-.02em;margin-bottom:14px;display:flex;align-items:center;gap:10px}
.cx-sec>h2:before{content:"";width:5px;height:22px;border-radius:3px;background:var(--mint)}
.cx-sec p{margin:0 0 12px;font-size:16.5px;line-height:1.85}
.cx-steps{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:s}
.cx-steps li{counter-increment:s;display:flex;gap:14px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:16px}
.cx-steps li:before{content:counter(s);flex:none;width:30px;height:30px;border-radius:50%;background:var(--blue);color:#fff;display:grid;place-items:center;font:800 14px var(--display)}
.cx-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:12px}
.cx-gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:var(--bg)}
.cx-warn{background:var(--warn);color:var(--warn-ink);border-radius:12px;padding:16px 18px;font-size:15.5px}
.cx-faq details{border:1px solid var(--line);border-radius:12px;background:#fff;margin-bottom:10px}
.cx-faq summary{cursor:pointer;padding:15px 18px;font-weight:700;color:var(--ink);list-style:none;display:flex;justify-content:space-between;gap:12px}
.cx-faq summary::-webkit-details-marker{display:none}
.cx-faq summary:after{content:"+";color:var(--blue);font-weight:800}
.cx-faq details[open] summary:after{content:"–"}
.cx-faq details p{padding:0 18px 16px;margin:0;font-size:15.5px;color:var(--text)}
.cx-cta{margin-top:48px;background:var(--navy);color:#fff;border-radius:18px;padding:30px 26px;display:grid;gap:14px;text-align:center;justify-items:center}
.cx-cta h2{color:#fff;font-size:clamp(21px,2.8vw,27px);font-weight:900}
.cx-cta p{margin:0;color:#c9d6ea;font-size:15.5px}
.cx-cta .acts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.cx-cta .btn-line{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}
.cx-rel{margin-top:54px}
.cx-rel>h2{font-size:22px;font-weight:900;margin-bottom:16px}
.cx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:20px}
.cx-card{display:grid;align-content:start;gap:0;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:box-shadow .2s,transform .2s}
.cx-card:hover{box-shadow:0 12px 30px rgba(13,35,64,.12);transform:translateY(-2px)}
.cx-card .im{position:relative;aspect-ratio:4/3;background:var(--bg)}
.cx-card .im img{width:100%;height:100%;object-fit:cover}
.cx-card .im .cx-chip{position:absolute;left:10px;top:10px;background:rgba(255,255,255,.95)}
.cx-card .bd{padding:14px 16px 16px;display:grid;gap:8px}
.cx-card h3{font-size:16.5px;font-weight:800;line-height:1.45;letter-spacing:-.01em}
.cx-card .tg{display:flex;flex-wrap:wrap;gap:6px}
.cx-card time{font-size:13px;color:var(--muted)}
.cx-filter{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}
.cx-filter a{padding:9px 16px;border-radius:99px;border:1.5px solid var(--line);text-decoration:none;font:600 14.5px var(--body);color:var(--ink);background:#fff}
.cx-filter a[aria-current=true]{background:var(--blue);border-color:var(--blue);color:#fff}
.cx-pg{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:34px}
.cx-pg a,.cx-pg span{min-width:40px;height:40px;display:grid;place-items:center;padding:0 12px;border-radius:9px;border:1.5px solid var(--line);text-decoration:none;font-weight:600;color:var(--ink);background:#fff}
.cx-pg [aria-current=page]{background:var(--blue);border-color:var(--blue);color:#fff}
.cx-empty{padding:60px 20px;text-align:center;color:var(--muted);background:var(--bg);border-radius:14px}
@media (max-width:560px){.cx-sum dl{grid-template-columns:1fr;gap:4px}.cx-sum dt{margin-top:8px}}
/* 전·후 슬라이더 */
.ba{margin:0;display:grid;gap:12px;justify-items:center}
.ba-box{position:relative;width:100%;max-width:820px;aspect-ratio:var(--ar,4/3);border-radius:16px;overflow:hidden;background:#0d2340;box-shadow:0 10px 30px rgba(13,35,64,.18);touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:ew-resize}
.ba-box img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none}
.ba-box .ba-before{clip-path:inset(0 calc(100% - var(--p,50%)) 0 0)}
.ba-box .ba-after{clip-path:inset(0 0 0 var(--p,50%))}
.ba-lbl{position:absolute;top:14px;z-index:2;font:800 12px/1 "IBM Plex Sans KR",sans-serif;letter-spacing:.06em;color:#fff;padding:7px 11px;border-radius:6px;pointer-events:none}
.ba-lbl.b{left:14px;background:rgba(40,40,40,.78)}.ba-lbl.a{right:14px;background:rgba(20,176,154,.92)}
.ba-bar{position:absolute;top:0;bottom:0;left:var(--p,50%);width:3px;margin-left:-1.5px;background:#fff;z-index:3;box-shadow:0 0 8px rgba(0,0,0,.35);pointer-events:none}
.ba-knob{position:absolute;top:50%;left:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.35);display:grid;place-items:center;color:#0d2340}
.ba-box:focus-visible{outline:3px solid #14b09a;outline-offset:3px}
.ba-box.drag .ba-knob{transform:scale(1.08)}
.ba figcaption{text-align:center;color:#5b6b80;font-size:14px}
`;

  const KNOB = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg>';

  function slider(r) {
    const b = url(r.before_url), a = url(r.after_url);
    if (!b || !a) return '';
    return `<figure class="ba"><div class="ba-box" role="slider" tabindex="0" aria-label="${esc(r.title)} 작업 전후 비교. 좌우 화살표 키로 움직입니다" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
<img class="ba-after" src="${a}" alt="${esc(r.title)} 작업 후" decoding="async">
<img class="ba-before" src="${b}" alt="${esc(r.title)} 작업 전" decoding="async">
<span class="ba-lbl b">BEFORE</span><span class="ba-lbl a">AFTER</span>
<div class="ba-bar"><div class="ba-knob" aria-hidden="true">${KNOB}</div></div></div>
<figcaption>← 드래그하여 작업 전·후를 비교해 보세요 →</figcaption></figure>`;
  }

  const chips = (list, cls) => arr(list).map(x => `<span class="cx-chip ${cls || ''}">${esc(x)}</span>`).join('');

  /* ---------- 글 한 편 ---------- */
  function postHTML(r, related) {
    const faq = (Array.isArray(r.faq) ? r.faq : []).filter(f => f && f.q && f.a);
    const steps = arr(r.steps), extra = arr(r.extra_urls).map(url).filter(Boolean);
    const spec = [];
    if (r.target) spec.push(['대상', `<span>${esc(r.target)}</span>`]);
    if (arr(r.problems).length) spec.push(['상태', chips(r.problems, 'g')]);
    if (arr(r.works).length) spec.push(['적용 작업', chips(r.works, 'm')]);
    if (r.summary) spec.push(['핵심 요약', `<span>${esc(r.summary)}</span>`]);
    const rel = (related || []).slice(0, 3);
    return `<article class="cx-wrap" itemscope itemtype="https://schema.org/Article">
<nav class="cx-crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><a href="/cases/">사례</a><span>›</span><a href="${listPath(r.category, 1)}">${esc(r.category)}</a></nav>
<header class="cx-head">
  <div class="cx-meta"><span class="cx-chip ${r.category === '교육 사례' ? 'm' : ''}">${esc(r.category)}</span>${chips(r.tags)}</div>
  <h1 itemprop="headline">${esc(r.title)}</h1>
  <div class="cx-meta"><time datetime="${esc(isoDate(r.created_at))}" itemprop="datePublished">${esc(fmtDate(r.created_at))}</time></div>
</header>
${spec.length ? `<section class="cx-sum" aria-label="작업 요약"><h2>작업 요약</h2><dl>${spec.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>` : ''}
<aside class="cx-tip"><b>상담 팁</b> · 비슷한 상태의 견적은 사진 3장(전체, 가까이, 문제 부위)을 <a href="${TALK}" target="_blank" rel="noopener">네이버 톡톡</a>이나 <a href="tel:${TEL.replace(/-/g, '')}">전화(${TEL})</a>로 보내 주시면 바로 안내해 드립니다.</aside>
${slider(r) ? `<section class="cx-sec" style="margin-top:0"><h2>작업 전·후 비교</h2>${slider(r)}</section>` : ''}
${r.problem ? `<section class="cx-sec"><h2>문제 상황</h2>${paras(r.problem)}</section>` : ''}
${steps.length ? `<section class="cx-sec"><h2>작업 순서</h2><ol class="cx-steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>` : ''}
${r.result ? `<section class="cx-sec"><h2>작업 후 변화</h2>${paras(r.result)}</section>` : ''}
${extra.length ? `<section class="cx-sec"><h2>추가 사진</h2><div class="cx-gal">${extra.map((u, i) => `<img src="${u}" alt="${esc(r.title)} 사진 ${i + 1}" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}
${r.caution ? `<section class="cx-sec"><h2>관리 시 주의사항</h2><div class="cx-warn">${paras(r.caution)}</div></section>` : ''}
${faq.length ? `<section class="cx-sec cx-faq"><h2>자주 묻는 질문</h2>${faq.map(f => `<details><summary>Q. ${esc(f.q)}</summary><p>A. ${esc(f.a)}</p></details>`).join('')}</section>` : ''}
${url(r.blog_url) ? `<p style="margin-top:28px"><a class="btn btn-line" href="${url(r.blog_url)}" target="_blank" rel="noopener">네이버 블로그 작업 기록·추가 사진 보기</a></p>` : ''}
<section class="cx-cta"><h2>${r.category === '교육 사례' ? '직접 배워서 시작해 보세요' : '비슷한 고민이 있으신가요?'}</h2><p>${r.category === '교육 사례' ? '최대 4인 소수정예, 현장 장비 전부로 직접 실습합니다.' : '사진만 보내 주시면 상태를 보고 안내해 드립니다.'}</p>
<div class="acts"><a class="btn btn-mint" href="/consult.html">무료 상담 신청</a><a class="btn btn-line" href="${TALK}" target="_blank" rel="noopener">네이버 톡톡</a><a class="btn btn-line" href="tel:${TEL.replace(/-/g, '')}">${TEL}</a></div></section>
${rel.length ? `<section class="cx-rel"><h2>관련 사례</h2><div class="cx-grid">${rel.map(card).join('')}</div></section>` : ''}
</article>`;
  }

  function pickRelated(rows, category) { return rows.slice().sort((a, b) => (b.category === category) - (a.category === category)).slice(0, 3); }

  function card(r) {
    const im = url(r.after_url) || url(r.before_url) || arr(r.extra_urls).map(url).find(Boolean) || '';
    return `<a class="cx-card" href="${path(r.slug)}"><div class="im">${im ? `<img src="${im}" alt="${esc(r.title)}" loading="lazy" decoding="async">` : ''}<span class="cx-chip ${r.category === '교육 사례' ? 'm' : ''}">${esc(r.category)}</span></div>
<div class="bd"><h3>${esc(r.title)}</h3><div class="tg">${chips(r.tags)}</div><time datetime="${esc(isoDate(r.created_at))}">${esc(fmtDate(r.created_at))}</time></div></a>`;
  }

  /* ---------- 목록 ---------- */
  function listHTML(rows, o) {
    o = o || {};
    const cat = o.cat || '', page = o.page || 1, total = o.total || rows.length, pages = Math.max(1, Math.ceil(total / PER_PAGE));
    const qs = (c, p) => listPath(c, p);
    const filter = ['', ...CATS].map(c => `<a href="${qs(c, 1)}" ${c === cat ? 'aria-current="true"' : ''}>${c || '전체'}</a>`).join('');
    let pg = '';
    if (pages > 1) {
      const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
      pg = '<nav class="cx-pg" aria-label="페이지">' + (page > 1 ? `<a href="${qs(cat, page - 1)}" rel="prev">‹</a>` : '') +
        nums.map((n, i) => (i && n - nums[i - 1] > 1 ? '<span>…</span>' : '') + (n === page ? `<span aria-current="page">${n}</span>` : `<a href="${qs(cat, n)}">${n}</a>`)).join('') +
        (page < pages ? `<a href="${qs(cat, page + 1)}" rel="next">›</a>` : '') + '</nav>';
    }
    return `<section class="cx-wrap wide">
<nav class="cx-crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><span>사례</span>${cat ? `<span>›</span><span>${esc(cat)}</span>` : ''}</nav>
<header class="cx-head" style="max-width:720px"><span class="cx-chip" style="justify-self:start">CASES</span><h1>${cat ? esc(cat) : '교육·작업 사례'}</h1>
<p style="color:var(--muted);font-size:17px;margin:0">청소공방의 실제 작업과 교육 현장을 사진으로 기록합니다. 작업 전·후 사진은 화면을 좌우로 끌어서 직접 비교해 보세요.</p></header>
<div class="cx-filter" role="group" aria-label="사례 분류">${filter}</div>
${rows.length ? `<div class="cx-grid">${rows.map(card).join('')}</div>` : '<div class="cx-empty">아직 등록된 사례가 없습니다.</div>'}
${pg}
</section>`;
  }

  /* ---------- 검색엔진용 정보 ---------- */
  function postMeta(r, origin) {
    const u = origin + path(r.slug);
    const abs = x => { x = String(x || '').trim(); return /^https?:\/\//i.test(x) ? x : (/^\/|^img\//i.test(x) ? origin + (x[0] === '/' ? '' : '/') + x : ''); };
    const img = [r.after_url, r.before_url].map(abs).filter(Boolean);
    const desc = plain(r.summary || r.problem || r.title, 150);
    const org = { '@type': 'Organization', name: SITE };
    const ld = [
      { '@context': 'https://schema.org', '@type': 'Article', headline: r.title, description: desc, image: img, datePublished: isoDate(r.created_at), dateModified: isoDate(r.updated_at || r.created_at), mainEntityOfPage: u, author: org, publisher: org, articleSection: r.category },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: '사례', item: origin + '/cases/' },
        { '@type': 'ListItem', position: 3, name: r.title, item: u }] }
    ];
    const faq = (Array.isArray(r.faq) ? r.faq : []).filter(f => f && f.q && f.a);
    if (faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    return { title: `${r.title} | ${SITE}`, desc, canonical: u, image: img[0] || '', ld: ld.map(ldJson).join('') };
  }
  function listMeta(o, origin) {
    const name = o.cat || '교육·작업 사례';
    return { title: `${name}${o.page > 1 ? ' ' + o.page + '페이지' : ''} | ${SITE}`, desc: '청소공방의 에어컨·매트리스·소파 청소 작업 사례와 교육 현장 기록. 작업 전·후 사진을 직접 비교해 보세요.', canonical: origin + listPath(o.cat || '', o.page || 1), image: '', ld: '' };
  }

  function viewScript(slug) {
    return `<script>(function(){try{var k='cv_'+${JSON.stringify(slug)};if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,1)}catch(e){}
if(window.SITE_CFG)fetch(SITE_CFG.url+'/rest/v1/rpc/inc_case_view',{method:'POST',headers:{apikey:SITE_CFG.key,'Content-Type':'application/json'},body:JSON.stringify({p_slug:${JSON.stringify(slug)}})}).catch(function(){})})();</script>`;
  }

  /* ---------- 템플릿에 끼우기 ---------- */
  function fill(tpl, meta, main) {
    const head = `<link rel="canonical" href="${esc(meta.canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="${SITE}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.desc)}"><meta property="og:url" content="${esc(meta.canonical)}">${meta.image ? `<meta property="og:image" content="${esc(meta.image)}">` : ''}<meta name="twitter:card" content="summary_large_image">${meta.ld}`;
    return tpl.replace('{{TITLE}}', esc(meta.title)).replace('{{DESC}}', esc(meta.desc)).replace('{{HEAD}}', () => head).replace('{{MAIN}}', () => main).replace('{{SCRIPTS}}', () => meta.scripts || '');
  }

  return { CAT_KEY, RESERVED, listPath, parseListPath, viewScript, pickRelated, esc, CSS, PER_PAGE, CATS, path, postHTML, listHTML, card, postMeta, listMeta, fill, fmtDate };
});
