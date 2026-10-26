// www.cleanateliers.com 으로 들어온 요청을 cleanateliers.com 으로 영구 이동(301)
// 같은 사이트가 두 주소로 열려 검색엔진이 중복으로 판단하는 문제를 막습니다.
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    if (url.hostname === 'www.cleanateliers.com') {
      url.hostname = 'cleanateliers.com';
      return Response.redirect(url.toString(), 301);
    }
  } catch (e) { /* 오류가 나도 사이트는 그대로 열리게 함 */ }
  return context.next();
}
