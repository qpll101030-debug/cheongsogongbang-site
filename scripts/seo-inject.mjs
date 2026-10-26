// 검색엔진·AI 인용용 정보 주입기: canonical, 공유 미리보기(og), 구조화 데이터(JSON-LD), FAQ
// 사용: node scripts/seo-inject.mjs   (여러 번 실행해도 같은 결과. 페이지 내용을 고친 뒤 다시 실행하면 FAQ도 최신으로 맞춰집니다)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ORIGIN = 'https://cleanateliers.com';
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// 공식 채널(같은 업체임을 검색엔진·AI에 알림). 새 채널이 생기면 여기에 추가 후 다시 실행
const SAME_AS = ['https://blog.naver.com/bluebubble-', 'https://www.youtube.com/channel/UCsSqMHhPrbAaLTXdZmp8e-Q', 'https://www.threads.com/@clean_atelier_master'];
const ADDR = { '@type': 'PostalAddress', streetAddress: '갈매중앙로 190 휴벨나인 D존 6073호', addressLocality: '구리시', addressRegion: '경기도', addressCountry: 'KR' };
const ORG = { '@type': 'LocalBusiness', '@id': ORIGIN + '/#business', name: '청소공방', url: ORIGIN + '/', telephone: '+82-10-8833-0999', address: ADDR, areaServed: ['서울', '경기'], image: ORIGIN + '/img/sofa_fabric.jpg', sameAs: SAME_AS };
const PROVIDER = { '@type': 'EducationalOrganization', name: '청소공방 아카데미', url: ORIGIN + '/academy', telephone: '+82-10-8833-0999', address: ADDR };

// slug → { img, ld(): 추가 구조화 데이터 }
const PAGES = {
  'index': { slug: '', img: 'sofa_fabric.jpg', ld: () => [ORG, { '@type': 'WebSite', name: '청소공방', url: ORIGIN + '/', inLanguage: 'ko' }] },
  'academy': { slug: 'academy', img: 'door_edu.jpg', ld: () => [{ ...PROVIDER, '@id': ORIGIN + '/academy#org', parentOrganization: { '@id': ORIGIN + '/#business' } }] },
  'course-regular': { slug: 'course-regular', img: 'ac_edu1.jpg', course: { name: '에어컨 분해세척 정기교육', mode: 'onsite' } },
  'course-1on1': { slug: 'course-1on1', img: 'ac_edu2.jpg', course: { name: '에어컨 1:1 종합실무과정', mode: 'onsite' } },
  'course-repair': { slug: 'course-repair', img: 'ac_parts.jpg', course: { name: '에어컨 수리 단과과정', mode: 'onsite' } },
  'course-mattress': { slug: 'course-mattress', img: 'f_shop.jpg', course: { name: '매트리스·소파 청소교육', mode: 'onsite' } },
  'service-aircon': { slug: 'service-aircon', img: 'ac_wall1.jpg', ld: () => [{ '@type': 'Service', name: '에어컨 분해청소', serviceType: '에어컨 분해세척', provider: { '@id': ORIGIN + '/#business' }, areaServed: ['서울', '경기'], url: ORIGIN + '/service-aircon' }] },
  'gallery': { slug: 'gallery', img: 'g_equip.jpg', desc: '청소공방 교육장과 에어컨·매트리스·소파 청소 작업 현장 사진. 실습 장비와 분해세척 과정을 직접 확인하세요.' },
  'reviews': { slug: 'reviews', img: 'ac_edu1.jpg', desc: '청소공방 아카데미 수료생이 직접 남긴 후기. 에어컨 분해세척·수리, 매트리스·소파 청소교육 수강 경험과 현장 사진을 확인하세요.' },
  'notice': { slug: 'notice', img: 'door_edu.jpg', desc: '청소공방 아카데미 교육 일정과 공지사항. 에어컨 분해세척·수리, 매트리스·소파 청소교육 개강 안내.' },
  'consult': { slug: 'consult', img: 'door_edu.jpg', desc: '청소공방 아카데미 교육 상담 신청. 전화(010-8833-0999), 네이버 톡톡, 신청서로 교육 일정과 과정을 상담받으세요.' },
  'license': { slug: 'license', img: 'e_all.jpg' },
  'privacy': { slug: 'privacy', img: 'door_edu.jpg' },
};

function block(html, name, f) {
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '청소공방';
  let desc = P.desc || (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  return { title, desc };
}

for (const [name, P0] of Object.entries(PAGES)) {
  const P = P0, f = path.join(ROOT, name + '.html');
  if (!fs.existsSync(f)) continue;
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/<!--seo-->[\s\S]*?<!--\/seo-->\n?/g, '');
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '청소공방';
  if (P.desc) h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(P.desc)}">`);
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const url = ORIGIN + '/' + P.slug;
  let add = '';
  // canonical: 이미 있으면 전체 주소로, 없으면 추가
  if (/<link rel="canonical"/.test(h)) h = h.replace(/<link rel="canonical" href="([^"]*)">/, (m, u) => name === 'index' ? m : `<link rel="canonical" href="${u.startsWith('http') ? u : url}">`);
  else add += `<link rel="canonical" href="${url}">\n`;
  if (!/og:title/.test(h)) add += `<meta property="og:type" content="website"><meta property="og:site_name" content="청소공방"><meta property="og:locale" content="ko_KR"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/img/${P.img}">\n<meta name="twitter:card" content="summary_large_image">\n`;
  const ld = [], hasLd = /application\/ld\+json/.test(h);  // 이미 직접 넣어 둔 구조화 데이터가 있으면 중복해서 넣지 않음
  if (P.ld && !hasLd) ld.push(...P.ld());
  if (P.course) ld.push({ '@type': 'Course', name: P.course.name, description: txt(desc), url, provider: PROVIDER, inLanguage: 'ko', hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'onsite', location: { '@type': 'Place', name: '청소공방 교육장', address: ADDR } } });
  // 페이지에 이미 보이는 FAQ만 구조화 (보이지 않는 내용은 넣지 않음)
  const faq = [...h.matchAll(/<details[^>]*><summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)].map(m => ({ '@type': 'Question', name: txt(m[1]), acceptedAnswer: { '@type': 'Answer', text: txt(m[2]) } })).filter(q => q.name && q.acceptedAnswer.text);
  if (faq.length && !/FAQPage/.test(h)) ld.push({ '@type': 'FAQPage', mainEntity: faq });
  if (P.slug) ld.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '청소공방', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: title.split('|')[0].trim(), item: url }] });
  if (ld.length) add += `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c')}</script>\n`;
  h = h.replace('</head>', `<!--seo-->\n${add}<!--/seo-->\n</head>`);
  fs.writeFileSync(f, h);
  console.log(name, '· FAQ', faq.length, '· JSON-LD', ld.length);
}
