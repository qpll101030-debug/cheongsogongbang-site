/* =====================================================================
   청소공방 아카데미 · 데이터 연결 (모든 페이지 공용)
   Supabase 프로젝트를 만든 뒤 아래 두 값만 넣으면 실제 접수·게시가 시작됩니다.
   (Supabase 대시보드 → Project Settings → API 에서 복사)
   ===================================================================== */
window.SITE_CFG = {
  url: 'https://xkprrwwubwzpkgpmdsuq.supabase.co',
  key: 'sb_publishable_9fabTR8mplneUdoXj3io-A_haxfJ_6N'   // 공개 키 (홈페이지에 노출돼도 되는 키)
};

(function () {
  const C = window.SITE_CFG, on = !!(C.url && C.key);
  const H = C.key.startsWith('sb_') ? { apikey: C.key } : { apikey: C.key, Authorization: 'Bearer ' + C.key };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function get(q) {
    const r = await fetch(`${C.url}/rest/v1/${q}`, { headers: H });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
    return r.json();
  }
  async function add(table, row) {
    const r = await fetch(`${C.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
  }

  // 폼 전송 공통: 연결 전이면 안내 문구만, 연결 후면 저장
  async function send(table, row, o) {
    const { msg, btn, form, ok, demo } = o;
    msg.classList.remove('ok');
    if (!on) { msg.textContent = demo || '시안 화면입니다. 실제 접수는 관리자 페이지와 연결한 뒤 작동합니다.'; msg.hidden = false; return false; }
    const label = btn.textContent; btn.disabled = true; btn.textContent = '보내는 중…';
    try {
      await add(table, row);
      msg.textContent = ok; msg.classList.add('ok'); msg.hidden = false;
      form && form.reset();
      return true;
    } catch (e) {
      console.error(e);
      msg.textContent = '전송에 실패했습니다. 잠시 후 다시 시도하시거나 전화(010-8833-0999), 네이버 톡톡으로 문의해 주세요.';
      msg.hidden = false; return false;
    } finally { btn.disabled = false; btn.textContent = label; }
  }

  // 화면 조각 (메인·상세 페이지 공용)
  const newsLi = p => `<li><span><span class="c">[${esc(p.cat)}]</span><a href="notice.html#p${p.id}" style="text-decoration:none;color:inherit">${esc(p.title)}</a></span><time>${esc(p.date)}</time></li>`;
  const reviewCard = r => `<article class="pr"><div class="stars" style="color:#f5b301;letter-spacing:2px">${'★'.repeat(r.stars)}${'<span style="color:#d5dce6">★</span>'.repeat(5 - r.stars)}</div><p>${esc(r.body)}</p><b style="font-size:14px;color:var(--ink)">${esc(r.name)} · ${esc(r.course)}</b></article>`;

  window.DB = { on, get, add, send, esc, newsLi, reviewCard };
})();
