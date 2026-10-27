// 사례 게시판 자동 생성기
// Netlify가 배포할 때마다 실행됩니다. Supabase에서 공개된 글을 받아
//   · 글마다 완성된 페이지 (cases/글이름/index.html)
//   · 목록 페이지 (cases/, cases/sofa/, cases/aircon/, cases/edu/, 각 2쪽 이상)
//   · sitemap.xml, robots.txt
// 를 만들어 둡니다. 그래서 네이버·구글 로봇이 글 내용을 바로 읽습니다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const R = createRequire(import.meta.url)('./cases-render.js');
const SB_URL = process.env.SUPABASE_URL || 'https://xkprrwwubwzpkgpmdsuq.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_9fabTR8mplneUdoXj3io-A_haxfJ_6N';
const ORIGIN = (process.env.SITE_URL || 'https://cleanateliers.com').replace(/\/+$/, '');
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
  .filter(r => r.slug && !R.RESERVED.includes(r.slug))
  .map(r => ({ ...r, category: R.normCat(r.category) }));
console.log(`공개된 사례 ${rows.length}개`);

// 1) 글 페이지
for (const r of rows) {
  const rel = R.pickRelated(rows.filter(x => x.slug !== r.slug), r.category);
  const meta = R.postMeta(r, ORIGIN);
  meta.scripts = R.viewScript(r.slug);
  write(`cases/${r.slug}/index.html`, R.fill(tpl, meta, R.postHTML(r, rel)));
}

// 2) 목록 페이지 (전체 / 매트리스·소파 / 에어컨 / 교육, 12개씩)
const groups = [['', rows], ...R.CATS.map(c => [c, rows.filter(r => r.category === c)])];
const listUrls = [];
for (const [cat, list] of groups) {
  const pages = Math.max(1, Math.ceil(list.length / R.PER_PAGE));
  for (let p = 1; p <= pages; p++) {
    const slice = list.slice((p - 1) * R.PER_PAGE, p * R.PER_PAGE);
    const rel = R.listPath(cat, p).replace(/^\//, '') + 'index.html';
    write(rel, R.fill(tpl, R.listMeta({ cat, page: p }, ORIGIN), R.listHTML(slice, { cat, page: p, total: list.length })));
    // 주소 /cases/ 가 예전 cases.html 보다 뒤로 밀리지 않도록 같은 내용을 cases.html 에도 저장
    if (rel === 'cases/index.html') write('cases.html', R.fill(tpl, R.listMeta({ cat, page: p }, ORIGIN), R.listHTML(slice, { cat, page: p, total: list.length })));
    listUrls.push(R.listPath(cat, p));
  }
}

// 2-1) 메인 페이지: canonical·대표 이미지 주소를 사이트 전체 주소로 (네이버·카카오 미리보기용)
{
  const f = path.join(ROOT, 'index.html');
  if (fs.existsSync(f)) {
    let h = fs.readFileSync(f, 'utf8');
    h = h.replace('<link rel="canonical" href="/">', `<link rel="canonical" href="${ORIGIN}/">`)
         .replace('<meta property="og:image" content="img/', `<meta property="og:url" content="${ORIGIN}/"><meta property="og:image" content="${ORIGIN}/img/`);
    fs.writeFileSync(f, h);
  }
}


// 2-2) 블로그 (blog_posts 표가 아직 없거나 글이 없어도 빌드는 계속됨)
const B = createRequire(import.meta.url)('./blog-render.js');
let blogRows = [];
try { blogRows = (await sb('blog_posts?select=*&published=eq.true&order=created_at.desc&limit=1000')).filter(r => r.slug); }
catch (e) { console.log('블로그 건너뜀:', String(e.message).slice(0, 120)); }
console.log(`공개된 블로그 글 ${blogRows.length}개`);
const blogUrls = [];
for (const r of blogRows) {
  const meta = B.postMeta(r, ORIGIN); meta.scripts = '';
  write(`blog/${r.slug}/index.html`, R.fill(tpl, meta, B.postHTML(r, blogRows.filter(x => x.slug !== r.slug))));
  blogUrls.push({ loc: B.path(r.slug), mod: r.updated_at || r.created_at });
}
{
  const pages = Math.max(1, Math.ceil(blogRows.length / B.PER_PAGE));
  for (let p = 1; p <= pages; p++) {
    const slice = blogRows.slice((p - 1) * B.PER_PAGE, p * B.PER_PAGE);
    write(B.listPath(p).replace(/^\//, '') + 'index.html', R.fill(tpl, B.listMeta({ page: p }, ORIGIN), B.listHTML(slice, { page: p, total: blogRows.length })));
    blogUrls.push({ loc: B.listPath(p) });
  }
  write('blog/feed.xml', B.feed(blogRows, ORIGIN));
}

// 3) 사이트맵, robots.txt
const stat = ['/', '/course-regular', '/course-1on1', '/course-repair', '/service-aircon', '/course-mattress', '/academy', '/gallery', '/reviews', '/notice', '/consult', '/license'];
const urls = [...stat.map(s => `<url><loc>${ORIGIN}${s}</loc></url>`),
  ...listUrls.map(s => `<url><loc>${ORIGIN}${s}</loc></url>`),
  ...rows.map(r => `<url><loc>${ORIGIN}${R.path(r.slug)}</loc><lastmod>${new Date(r.updated_at || r.created_at).toISOString()}</lastmod></url>`),
  ...blogUrls.map(b => `<url><loc>${ORIGIN}${b.loc}</loc>${b.mod ? `<lastmod>${new Date(b.mod).toISOString()}</lastmod>` : ''}</url>`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
write('robots.txt', `#DaumWebMasterTool:f4889392d92099d9112012bd8d746494820257eff0eb447c6c320928f47618a2:vYXLWHUThEpl8+ynMNCRJQ==\n#AI 검색·답변 서비스의 로봇도 공개 페이지를 읽을 수 있게 허용\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nUser-agent: Applebot-Extended\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /_tpl\nDisallow: /ba-preview\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
console.log(`완료: 글 ${rows.length}개, 목록 ${listUrls.length}쪽, 사이트맵 ${urls.length}주소`);

// 4) Cloudflare Pages: 사이트 파일만 dist 폴더로 복사해 업로드
if (process.env.CF_PAGES || process.env.COPY_DIST) {
  const DIST = path.join(ROOT, 'dist');
  const skip = new Set(['dist', '.git', 'node_modules', '.github', 'netlify.toml', 'build.mjs', '.node-version', 'README.md', 'scripts', 'functions', 'sql']);
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  for (const n of fs.readdirSync(ROOT)) if (!skip.has(n)) fs.cpSync(path.join(ROOT, n), path.join(DIST, n), { recursive: true });
  console.log('dist 복사 완료');
}
