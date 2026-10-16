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
