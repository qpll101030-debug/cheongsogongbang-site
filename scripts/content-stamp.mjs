// 공개된 사례·블로그 글의 "지문"을 계산합니다. 글이 추가·수정·삭제·공개전환되면 값이 바뀝니다.
import crypto from 'node:crypto';
const URL_ = process.env.SUPABASE_URL || 'https://xkprrwwubwzpkgpmdsuq.supabase.co';
const KEY = process.env.SUPABASE_KEY || 'sb_publishable_9fabTR8mplneUdoXj3io-A_haxfJ_6N';
const get = async q => { const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: { apikey: KEY } }); if (!r.ok) throw new Error(`${r.status} ${q}`); return r.json(); };
const blog = await get('blog_posts?select=slug,updated_at&published=eq.true&order=slug').catch(() => []);
const cases = await get('cases?select=slug,updated_at,created_at&published=eq.true&order=slug');
const raw = JSON.stringify([blog, cases]);
console.log(crypto.createHash('sha1').update(raw).digest('hex'));
