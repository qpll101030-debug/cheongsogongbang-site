/* 공통 메뉴: 모바일 상단 메뉴 줄에서 하위 메뉴 펼치기 */
(function(){
  var btns = document.querySelectorAll('.mrow [data-sub]'), subs = document.querySelectorAll('.msub');
  function closeAll(){ btns.forEach(function(x){ x.setAttribute('aria-expanded','false'); }); subs.forEach(function(x){ x.classList.remove('on'); }); }
  btns.forEach(function(b){ b.addEventListener('click', function(){
    var open = b.getAttribute('aria-expanded') !== 'true'; closeAll();
    if (open) { b.setAttribute('aria-expanded','true'); var s = document.getElementById('sub-' + b.dataset.sub); if (s) s.classList.add('on'); }
  }); });
  subs.forEach(function(s){ s.addEventListener('click', function(e){ if (e.target.closest('a')) closeAll(); }); });
})();

/* 방문자 집계 (관리자 페이지 '방문자' 탭에서 확인) */
(() => {
  try {
    const h = location.hostname;
    if (!/(^|\.)cleanateliers\.com$/.test(h) || /^\/admin/.test(location.pathname) || navigator.webdriver) return;
    let vid = '';
    try { vid = localStorage.getItem('cg_vid') || ''; if (!vid) { vid = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem('cg_vid', vid); } } catch (e) { vid = 's-' + Math.random().toString(36).slice(2); }
    let ref = '';
    try { const r = document.referrer ? new URL(document.referrer).hostname : ''; ref = /cleanateliers\.com$/.test(r) ? '' : r.replace(/^www\.|^m\./, ''); } catch (e) {}
    try { const q = new URLSearchParams(location.search), ad = q.get('ad'), kw = q.get('n_keyword') || q.get('n_query') || q.get('kw') || ''; if (ad || q.has('n_media')) ref = ('ad:' + (ad || 'naver') + (kw ? ':' + kw : '')).slice(0, 100); } catch (e) {}
    const path = (location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/');
    const device = (matchMedia('(max-width:860px)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent)) ? 'mobile' : 'pc';
    fetch('https://xkprrwwubwzpkgpmdsuq.supabase.co/rest/v1/rpc/log_view', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_9fabTR8mplneUdoXj3io-A_haxfJ_6N' },
      body: JSON.stringify({ p_path: path, p_ref: ref, p_device: device, p_vid: vid })
    }).catch(() => {});
  } catch (e) {}
})();

/* 퀵메뉴 전화 상담 팝업 */
(() => {
  const b = document.getElementById('qCall'), p = document.getElementById('qPop'); if (!b || !p) return;
  b.addEventListener('click', e => { e.stopPropagation(); const open = p.hidden; p.hidden = !open; b.setAttribute('aria-expanded', open); });
  document.addEventListener('click', e => { if (!e.target.closest('.quick')) { p.hidden = true; b.setAttribute('aria-expanded', false); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { p.hidden = true; b.setAttribute('aria-expanded', false); } });
})();
