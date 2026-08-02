-- BD之家 新闻表（支持从微信公众号自动同步）
create table if not exists public.news (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null default '公众号',
  date date not null default current_date,
  summary text not null default '',
  link text not null default '',
  wx_article_id text unique,
  created_at timestamptz not null default now()
);

-- 开启行级安全，并允许所有人（匿名访客）读取
alter table public.news enable row level security;
drop policy if exists "Public read news" on public.news;
create policy "Public read news"
  on public.news for select
  using (true);

-- 初始示例数据（之后脚本会自动追加，你也可在 Table Editor 手动增删）
insert into public.news (title, category, date, summary) values
('某 Biotech 与跨国药企达成 $850M 肿瘤 ADC 授权协议','License-in','2026-07-28','交易含首付款 $120M，里程碑最高 $730M，创国内 ADC 单笔交易新高。'),
('全球 Top10 药企完成细胞治疗 $3.2B 战略收购','M&A','2026-07-25','标的含两款临床 II 期 CAR-T 管线，覆盖实体瘤与血液瘤双适应症。'),
('基因编辑新锐与 Big Pharma 签 $1.5B 联合开发','Co-dev','2026-07-20','双方在体内基因编辑领域全球合作，首付 $200M，共享大中华区权益。');
