-- 블로그 글 저장 테이블 (Supabase > SQL Editor 에서 한 번만 실행)
create table if not exists public.blog_posts (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  summary text,
  category text,
  body_html text not null default '',
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  views int not null default 0
);
alter table public.blog_posts enable row level security;
create policy blog_read on public.blog_posts for select using (published = true or is_admin());
create policy blog_ins  on public.blog_posts for insert with check (is_admin());
create policy blog_upd  on public.blog_posts for update using (is_admin()) with check (is_admin());
create policy blog_del  on public.blog_posts for delete using (is_admin());
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
create or replace function public.inc_blog_view(p_slug text) returns void
  language sql security definer set search_path = public as
  $$ update blog_posts set views = views + 1 where slug = p_slug and published = true $$;
grant execute on function public.inc_blog_view(text) to anon, authenticated;
