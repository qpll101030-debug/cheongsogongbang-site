// 광고로 들어온 방문자가 페이지를 떠날 때 체류시간을 기록합니다.
(function () {
  var m = document.cookie.match(/(?:^|; )cg_vid=([^;]+)/);
  if (!m || !navigator.sendBeacon) return;
  var vid = m[1], sent = 0;
  function send() {
    var n = Date.now();
    if (n - sent < 1000) return;
    sent = n;
    try { navigator.sendBeacon('/api/ad-beacon', vid); } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
  window.addEventListener('pagehide', send);
})();
