// 从微信公众号拉取已发布文章，写入 Supabase news 表
// 环境变量（放在 GitHub Actions secrets，切勿提交到仓库）：
//   WX_APPID, WX_APPSECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const WX_APPID = process.env.WX_APPID;
const WX_APPSECRET = process.env.WX_APPSECRET;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!WX_APPID || !WX_APPSECRET || !SB_URL || !SB_KEY) {
  console.error('缺少环境变量：WX_APPID / WX_APPSECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function getAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_APPSECRET}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.errcode) throw new Error(`获取 access_token 失败: ${j.errcode} ${j.errmsg}`);
  return j.access_token;
}

async function getPublishedArticles(token) {
  const url = `https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${token}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ no_content: 1, count: 20, offset: 0 })
  });
  const j = await r.json();
  if (j.errcode) throw new Error(`获取已发布文章失败: ${j.errcode} ${j.errmsg}`);
  return (j.item || []).map(it => {
    const a = (it.content && it.content.news_item && it.content.news_item[0]) || {};
    return {
      article_id: it.article_id,
      title: a.title,
      digest: a.digest,
      url: a.url,
      update_time: it.update_time
    };
  });
}

function classify(title) {
  const t = title || '';
  if (/授权|license|in-licens|引进|引入/i.test(t)) return 'License-in';
  if (/收购|并购|M&A|\bma\b|acquisition/i.test(t)) return 'M&A';
  if (/合作|联合开发|co-?dev|合作开发/i.test(t)) return 'Co-dev';
  return '公众号';
}

function toDateStr(unixSec) {
  const d = new Date((unixSec || Date.now() / 1000) * 1000);
  return d.toISOString().slice(0, 10);
}

async function getExistingIds() {
  const r = await fetch(`${SB_URL}/rest/v1/news?select=wx_article_id&wx_article_id=not.is.null`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  const rows = await r.json();
  return new Set((rows || []).map(x => x.wx_article_id));
}

async function insertRows(rows) {
  const r = await fetch(`${SB_URL}/rest/v1/news`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`写入 Supabase 失败: ${r.status} ${txt}`);
  }
}

(async () => {
  try {
    const token = await getAccessToken();
    const articles = await getPublishedArticles(token);
    console.log(`从公众号获取到 ${articles.length} 篇文章`);
    const rows = articles.map(a => ({
      title: a.title,
      category: classify(a.title),
      date: toDateStr(a.update_time),
      summary: a.digest || '',
      link: a.url || '',
      wx_article_id: a.article_id
    }));
    const existing = await getExistingIds();
    const fresh = rows.filter(r => r.wx_article_id && !existing.has(r.wx_article_id));
    if (fresh.length === 0) {
      console.log('没有新文章需要同步。');
      return;
    }
    await insertRows(fresh);
    console.log(`已同步 ${fresh.length} 篇新文章到 Supabase。`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
