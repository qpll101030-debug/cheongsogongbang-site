// 사례 게시판 자동 생성기
// Netlify가 배포할 때마다 실행됩니다. Supabase에서 공개된 글을 받아
//   · 글마다 완성된 페이지 (cases/글이름/index.html)
//   · 목록 페이지 (cases/, cases/work/, cases/edu/, 각 2쪽 이상)
//   · sitemap.xml, robots.txt
// 를 만들어 둡니다. 그래서 네이버·구글 로봇이 글 내용을 바로 읽습니다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const R = createRequire(import.meta.url)('./cases-render.js');
const SB_URL = process.env.SUPABASE_URL || 'https://xkprrwwubwzpkgpmdsuq.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_9fabTR8mplneUdoXj3io-A_haxfJ_6N';
const ORIGIN = (process.env.SITE_URL || process.env.URL || 'http://localhost:4173').replace(/\/+$/, '');
const ROOT = process.env.OUT_DIR || path.dirname(new URL(import.meta.url).pathname);

const tpl = fs.readFileSync(path.join(ROOT, '_tpl.html'), 'utf8');

async function sb(query) {
  const r = await fetch(`${SB_URL}/rest/v1/${query}`, { headers: { apikey: SB_KEY } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

function write(rel, html) {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

const rows = (await sb('cases?select=*&published=eq.true&order=created_at.desc&limit=1000'))
  .filter(r => r.slug && !R.RESERVED.includes(r.slug));
console.log(`공개된 사례 ${rows.length}개`);

// 1) 글 페이지
for (const r of rows) {
  const rel = R.pickRelated(rows.filter(x => x.slug !== r.slug), r.category);
  const meta = R.postMeta(r, ORIGIN);
  meta.scripts = R.viewScript(r.slug);
  write(`cases/${r.slug}/index.html`, R.fill(tpl, meta, R.postHTML(r, rel)));
}

// 2) 목록 페이지 (전체 / 작업 사례 / 교육 사례, 12개씩)
const groups = [['', rows], ...R.CATS.map(c => [c, rows.filter(r => r.category === c)])];
const listUrls = [];
for (const [cat, list] of groups) {
  const pages = Math.max(1, Math.ceil(list.length / R.PER_PAGE));
  for (let p = 1; p <= pages; p++) {
    const slice = list.slice((p - 1) * R.PER_PAGE, p * R.PER_PAGE);
    const rel = R.listPath(cat, p).replace(/^\//, '') + 'index.html';
    write(rel, R.fill(tpl, R.listMeta({ cat, page: p }, ORIGIN), R.listHTML(slice, { cat, page: p, total: list.length })));
    listUrls.push(R.listPath(cat, p));
  }
}

// 3) 사이트맵, robots.txt
const stat = ['/', '/about.html', '/course-regular.html', '/course-1on1.html', '/course-repair.html', '/gallery.html', '/reviews.html', '/notice.html', '/consult.html'];
const urls = [...stat.map(s => `<url><loc>${ORIGIN}${s}</loc></url>`),
  ...listUrls.map(s => `<url><loc>${ORIGIN}${s}</loc></url>`),
  ...rows.map(r => `<url><loc>${ORIGIN}${R.path(r.slug)}</loc><lastmod>${new Date(r.updated_at || r.created_at).toISOString()}</lastmod></url>`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /_tpl.html\nDisallow: /ba-preview.html\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
console.log(`완료: 글 ${rows.length}개, 목록 ${listUrls.length}쪽, 사이트맵 ${urls.length}주소`);
