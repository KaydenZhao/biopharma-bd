-- BD之家 · 评论 / 论坛表
-- 在 Supabase SQL Editor 中执行本文件，启用「讨论区」云端同步。
-- 前端（news-detail.html）已按以下结构读写：news_id / user_id / user_email / content。

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  news_id     text not null,
  user_id     uuid,
  user_email  text,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists comments_news_id_idx on public.comments (news_id);

alter table public.comments enable row level security;

-- 任何人（含未登录）都可读取评论
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (true);

-- 已登录用户可插入自己的评论（user_id 必须等于当前登录用户）
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);

-- 用户只能删除自己的评论
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete using (auth.uid() = user_id);
