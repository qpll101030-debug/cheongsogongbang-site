/* =====================================================================
   작업 전·후 비교 슬라이더 (드래그 / 터치 / 키보드)
   사용법: BA.mount(document.getElementById('baList'), BA_ITEMS)
   사진은 전·후 두 장을 "같은 각도·같은 크기"로 찍어야 가장 잘 맞습니다.
   ===================================================================== */
(function () {
  const css = `
.ba{margin:0;display:grid;gap:12px;justify-items:center}
.ba-box{position:relative;width:100%;max-width:720px;aspect-ratio:var(--ar,4/3);border-radius:16px;overflow:hidden;background:#0d2340;box-shadow:0 10px 30px rgba(13,35,64,.18);touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:ew-resize}
.ba-box img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none}
.ba-box .ba-before{clip-path:inset(0 calc(100% - var(--p,50%)) 0 0)}
.ba-box .ba-after{clip-path:inset(0 0 0 var(--p,50%))}
.ba-lbl{position:absolute;top:14px;z-index:2;font:800 12px/1 "IBM Plex Sans KR",sans-serif;letter-spacing:.06em;color:#fff;padding:7px 11px;border-radius:6px;pointer-events:none}
.ba-lbl.b{left:14px;background:rgba(40,40,40,.78)}
.ba-lbl.a{right:14px;background:rgba(20,176,154,.92)}
.ba-bar{position:absolute;top:0;bottom:0;left:var(--p,50%);width:3px;margin-left:-1.5px;background:#fff;z-index:3;box-shadow:0 0 8px rgba(0,0,0,.35);pointer-events:none}
.ba-knob{position:absolute;top:50%;left:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.35);display:grid;place-items:center;color:#0d2340;font:700 15px/1 sans-serif;letter-spacing:-2px}
.ba-box:focus-visible{outline:3px solid #14b09a;outline-offset:3px}
.ba-box.drag .ba-knob{transform:scale(1.08)}
.ba figcaption{text-align:center;color:#5b6b80;font-size:14px}
.ba figcaption b{display:block;color:#0d2340;font:800 17px/1.4 "Noto Sans KR",sans-serif;margin-bottom:2px}
.ba-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:36px 28px;align-items:start}
.ba-grid.one{grid-template-columns:1fr}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function wire(box) {
    let id = null;
    const set = pct => { pct = Math.max(0, Math.min(100, pct)); box.style.setProperty('--p', pct + '%'); box.setAttribute('aria-valuenow', Math.round(pct)); };
    const at = e => { const r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    box.addEventListener('pointerdown', e => { id = e.pointerId; box.setPointerCapture(id); box.classList.add('drag'); at(e); });
    box.addEventListener('pointermove', e => { if (e.pointerId === id) at(e); });
    const end = e => { if (e.pointerId === id) { id = null; box.classList.remove('drag'); } };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    box.addEventListener('keydown', e => {
      const v = +box.getAttribute('aria-valuenow'); const step = e.shiftKey ? 20 : 5;
      if (e.key === 'ArrowLeft') { set(v - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { set(v + step); e.preventDefault(); }
      else if (e.key === 'Home') { set(0); e.preventDefault(); }
      else if (e.key === 'End') { set(100); e.preventDefault(); }
    });
    set(50);
  }

  function mount(el, items) {
    if (!el || !items || !items.length) return false;
    el.classList.add('ba-grid'); if (items.length === 1) el.classList.add('one');
    el.innerHTML = items.map(it => `
      <figure class="ba">
        <div class="ba-box" role="slider" tabindex="0" aria-label="${esc(it.title)} 작업 전후 비교. 좌우 화살표 키로 움직입니다" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"${it.ratio ? ` style="--ar:${esc(it.ratio)}"` : ''}>
          <img class="ba-after" src="${esc(it.after)}" alt="${esc(it.title)} 작업 후"${it.filterAfter ? ` style="filter:${esc(it.filterAfter)}"` : ''} loading="lazy" draggable="false">
          <img class="ba-before" src="${esc(it.before)}" alt="${esc(it.title)} 작업 전"${it.filterBefore ? ` style="filter:${esc(it.filterBefore)}"` : ''} loading="lazy" draggable="false">
          <span class="ba-lbl b">BEFORE</span><span class="ba-lbl a">AFTER</span>
          <div class="ba-bar"><div class="ba-knob" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></div></div>
        </div>
        <figcaption><b>${esc(it.title)}</b>${it.desc ? esc(it.desc) + '<br>' : ''}← 드래그하여 작업 전·후를 비교해 보세요 →</figcaption>
      </figure>`).join('');
    el.querySelectorAll('.ba-box').forEach(wire);
    return true;
  }
  function bind(root){ (root||document).querySelectorAll('.ba-box').forEach(b=>{ if(!b.__ba){ b.__ba=1; wire(b); } }); }
  window.BA = { mount, bind };
})();
