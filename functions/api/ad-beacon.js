// 나갈 때 호출: 같은 방문 기록의 체류 초를 갱신 (페이지 수는 미들웨어가 올림)
export async function onRequestPost({ request, env }) {
  try {
    const vid = (await request.text()).trim();
    if (env.DB && /^[0-9a-f-]{36}$/.test(vid)) {
      const now = Date.now();
      await env.DB.prepare('UPDATE ad_visits SET dwell_sec = CAST(ROUND((? - ts) / 1000.0) AS INTEGER), last_ts = ? WHERE id = ?')
        .bind(now, now, vid).run();
    }
  } catch (e) {}
  return new Response(null, { status: 204 });
}
