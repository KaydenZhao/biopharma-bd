/* site.js — BD之家 共享脚本
 * 负责：Supabase 初始化、移动端菜单、滚动入场动画、导航栏阴影、
 *       登录/注册弹窗、新闻卡片渲染工具。被 index / news / xuetang / tools 四页共同引用。
 */
(function () {
  'use strict';

  // ===== Supabase 初始化 =====
  var SUPABASE_URL = 'https://bzldnyqewtjxudrceoqg.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_5TupiplyGf0MydLr35NT9Q_WBFAsLqh';
  var sb = (typeof supabase !== 'undefined' && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // ===== 移动端菜单 =====
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  var menuIcon = document.getElementById('menuIcon');
  var menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    if (!mobileMenu || !menuIcon) return;
    mobileMenu.classList.toggle('hidden', !open);
    mobileMenu.classList.toggle('flex', open);
    menuIcon.innerHTML = open
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>';
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
  }
  if (mobileMenu) {
    mobileMenu.querySelectorAll('.mobile-link').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }

  // ===== 滚动入场动画 =====
  var fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up').forEach(function (el) { fadeObserver.observe(el); });
  window.fadeObserver = fadeObserver;

  // ===== 导航栏滚动阴影 =====
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        navbar.classList.add('shadow-md', 'bg-white/95');
        navbar.classList.remove('bg-white/85');
      } else {
        navbar.classList.remove('shadow-md', 'bg-white/95');
        navbar.classList.add('bg-white/85');
      }
    });
  }

  // ===== 登录注册弹窗 =====
  var authModal = document.getElementById('authModal');
  var loginBtn = document.getElementById('loginBtn');
  var registerBtn = document.getElementById('registerBtn');
  var loginForm = document.getElementById('loginForm');
  var registerForm = document.getElementById('registerForm');
  var authModalClose = document.getElementById('authModalClose');
  var authTabs = document.querySelectorAll('#authModal [data-tab]');
  var userArea = document.getElementById('userArea');
  var userName = document.getElementById('userName');
  var logoutBtn = document.getElementById('logoutBtn');
  var mobileLogin = document.getElementById('mobileLogin');
  var mobileRegister = document.getElementById('mobileRegister');
  var mobileUser = document.getElementById('mobileUser');
  var mobileUserName = document.getElementById('mobileUserName');
  var mobileLogout = document.getElementById('mobileLogout');
  var heroRegister = document.getElementById('heroRegister');

  function openAuth(mode) {
    switchAuth(mode);
    if (!authModal) return;
    authModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeAuth() {
    if (!authModal) return;
    authModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  function switchAuth(mode) {
    if (loginForm) loginForm.classList.toggle('hidden', mode !== 'login');
    if (registerForm) registerForm.classList.toggle('hidden', mode !== 'register');
    authTabs.forEach(function (t) {
      var active = t.dataset.tab === mode;
      t.classList.toggle('text-navy-700', active);
      t.classList.toggle('border-navy-600', active);
      t.classList.toggle('text-gray-400', !active);
      t.classList.toggle('border-transparent', !active);
    });
  }
  function renderUser(user) {
    var email = user && user.email ? user.email : null;
    if (email) {
      if (userArea) userArea.classList.remove('hidden');
      if (loginBtn) loginBtn.classList.add('hidden');
      if (registerBtn) registerBtn.classList.add('hidden');
      if (mobileLogin) mobileLogin.classList.add('hidden');
      if (mobileRegister) mobileRegister.classList.add('hidden');
      if (mobileUser) mobileUser.classList.remove('hidden');
      if (userName) userName.textContent = email;
      if (mobileUserName) mobileUserName.textContent = email;
    } else {
      if (userArea) userArea.classList.add('hidden');
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (registerBtn) registerBtn.classList.remove('hidden');
      if (mobileLogin) mobileLogin.classList.remove('hidden');
      if (mobileRegister) mobileRegister.classList.remove('hidden');
      if (mobileUser) mobileUser.classList.add('hidden');
    }
  }

  if (sb) {
    sb.auth.getUser().then(function (res) { renderUser(res.data && res.data.user); });
    sb.auth.onAuthStateChange(function (_event, session) {
      renderUser(session ? session.user : null);
    });
  }

  if (loginBtn) loginBtn.addEventListener('click', function () { openAuth('login'); });
  if (registerBtn) registerBtn.addEventListener('click', function () { openAuth('register'); });
  if (mobileLogin) mobileLogin.addEventListener('click', function () { openAuth('login'); });
  if (mobileRegister) mobileRegister.addEventListener('click', function () { openAuth('register'); });
  if (heroRegister) heroRegister.addEventListener('click', function () { openAuth('register'); });
  if (authModalClose) authModalClose.addEventListener('click', closeAuth);
  if (authModal) authModal.addEventListener('click', function (e) { if (e.target === authModal) closeAuth(); });
  authTabs.forEach(function (t) { t.addEventListener('click', function () { switchAuth(t.dataset.tab); }); });

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!sb) { alert('登录服务未连接，请检查网络后重试。'); return; }
      var email = document.getElementById('loginId').value.trim();
      var pwd = document.getElementById('loginPwd').value;
      var btn = loginForm.querySelector('button[type="submit"]');
      var original = btn.textContent;
      btn.disabled = true; btn.textContent = '登录中…';
      var r = await sb.auth.signInWithPassword({ email: email, password: pwd });
      btn.disabled = false; btn.textContent = original;
      if (r.error) { alert('登录失败：' + r.error.message); return; }
      closeAuth();
      loginForm.reset();
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!sb) { alert('注册服务未连接，请检查网络后重试。'); return; }
      var email = document.getElementById('regEmail').value.trim();
      var pwd = document.getElementById('regPwd').value;
      var pwd2 = document.getElementById('regPwd2').value;
      if (!email || !pwd) { alert('请填写所有字段。'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('邮箱格式不正确。'); return; }
      if (pwd.length < 6) { alert('密码至少 6 位。'); return; }
      if (pwd !== pwd2) { alert('两次输入的密码不一致。'); return; }
      var btn = registerForm.querySelector('button[type="submit"]');
      var original = btn.textContent;
      btn.disabled = true; btn.textContent = '注册中…';
      var r = await sb.auth.signUp({
        email: email,
        password: pwd,
        options: { emailRedirectTo: 'https://kaydenzhao.github.io/biopharma-bd/' }
      });
      btn.disabled = false; btn.textContent = original;
      if (r.error) { alert('注册失败：' + r.error.message); return; }
      closeAuth();
      registerForm.reset();
      if (r.data && r.data.session) {
        alert('注册成功，已自动登录！');
      } else {
        alert('注册成功！请前往 ' + email + ' 查收验证邮件，点击邮件中的链接完成激活后即可登录。');
      }
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', async function () { if (sb) await sb.auth.signOut(); });
  if (mobileLogout) mobileLogout.addEventListener('click', async function () { if (sb) await sb.auth.signOut(); });

  // ===== 新闻渲染工具 =====
  function escapeHtml(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var CAT_GRAD = {
    '肿瘤': 'from-navy-500 to-navy-700',
    '自免': 'from-emerald-500 to-teal-600',
    '代谢': 'from-amber-500 to-orange-600'
  };
  var CAT_BADGE = {
    '肿瘤': 'bg-navy-50 text-navy-600',
    '自免': 'bg-emerald-50 text-emerald-600',
    '代谢': 'bg-amber-50 text-amber-600'
  };
  function newsCard(n) {
    var idStr = String(n.id != null ? n.id : '');
    var idHref = encodeURIComponent(idStr);
    var grad = CAT_GRAD[n.category] || 'from-navy-500 to-navy-700';
    var badge = CAT_BADGE[n.category] || 'bg-navy-50 text-navy-600';
    var deal = [n.coop, (n.upfront ? ('首付 ' + n.upfront) : ''), (n.totalValue ? ('总额 ' + n.totalValue) : '')].filter(Boolean).join(' · ');
    var parties = [n.licenser, n.licensee].filter(Boolean).join(' → ');
    var sub = [n.productType, n.indication].filter(Boolean).join(' · ');
    var notes = n.notes ? '<p class="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-3">' + escapeHtml(n.notes) + '</p>' : '';
    // 卡片点击跳转到独立详情页（news-detail.html?id=xxx）
    return '' +
      '<a href="news-detail.html?id=' + idHref + '" data-id="' + escapeHtml(idStr) + '" class="news-card group fade-up card-hover block h-full bg-white rounded-xl border border-gray-200 overflow-hidden">' +
        '<div class="h-2 bg-gradient-to-r ' + grad + '"></div>' +
        '<div class="p-6 flex flex-col h-full">' +
          '<div class="flex items-center justify-between gap-2 mb-3">' +
            '<span class="px-2 py-0.5 rounded text-xs font-medium ' + badge + '">' + escapeHtml(n.category) + '</span>' +
            '<span class="text-xs text-gray-400">' + escapeHtml(n.date) + '</span>' +
          '</div>' +
          '<h3 class="text-base font-semibold text-navy-800 leading-snug">' + escapeHtml(n.product || '未披露产品') + '</h3>' +
          (sub ? '<p class="mt-1 text-xs text-gray-500">' + escapeHtml(sub) + '</p>' : '') +
          (n.stage ? '<span class="mt-3 inline-flex w-fit px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">' + escapeHtml(n.stage) + '</span>' : '') +
          (parties ? '<p class="mt-3 text-sm text-gray-700"><span class="font-medium">' + escapeHtml(parties) + '</span></p>' : '') +
          (deal ? '<p class="mt-1 text-xs text-gray-500">' + escapeHtml(deal) + '</p>' : '') +
          notes +
          '<div class="mt-auto pt-3"><span class="text-xs font-semibold text-navy-600 group-hover:underline">查看详情 →</span></div>' +
        '</div>' +
      '</a>';
  }
  function uniq(arr) { return Array.from(new Set(arr.filter(Boolean))); }
  function fillSelect(id, values) {
    var sel = document.getElementById(id);
    if (!sel) return;
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }
  function observeFade(root) {
    if (!root) return;
    root.querySelectorAll('.fade-up').forEach(function (el) { fadeObserver.observe(el); });
  }

  // ===== 新闻摘要（AI 汇总，基于结构化字段实时生成，不编造事实） =====
  function buildSummary(n) {
    var parts = [];
    var lic = (n.licenser || '').trim();
    var lee = (n.licensee || '').trim();
    var parties = [lic, lee].filter(Boolean).join(' 与 ');
    var deal = n.coop || '交易';
    var head;
    if (parties) {
      head = (n.date ? n.date + '，' : '') + parties + ' 就 ' + deal + '达成合作';
    } else {
      head = (n.date ? n.date + '，' : '') + '一笔 ' + deal + '交易完成';
    }
    parts.push(head + '。');
    var sub = [n.productType, n.indication].filter(Boolean).map(function (s) { return s.trim(); }).join('、');
    if (n.product) {
      parts.push('交易标的为 ' + n.product + (sub ? '（' + sub + '）' : '') + '。');
    }
    if (n.stage) parts.push('项目当前处于 ' + n.stage + ' 阶段。');
    var moneyBits = [];
    if (n.upfront) moneyBits.push('首付款 ' + n.upfront + (n.upfrontType ? '（' + n.upfrontType + '）' : ''));
    if (n.totalValue) moneyBits.push('潜在总交易额 ' + n.totalValue);
    if (moneyBits.length) parts.push(moneyBits.join('，') + '。');
    if (n.territory) parts.push('合作地域覆盖 ' + n.territory + '。');
    if (n.notes && n.notes.trim()) parts.push(n.notes.trim());
    return parts.join('');
  }

  // ===== 评论 / 论坛（Supabase 云端同步 + localStorage 本地预览兜底） =====
  // 详情页调用 window.BD.initComments(newsId)，由该函数接管评论区渲染与发帖。
  function initComments(newsId) {
    var listEl = document.getElementById('commentList');
    var form = document.getElementById('commentForm');
    var input = document.getElementById('commentInput');
    var loginPrompt = document.getElementById('commentLoginPrompt');
    var loginBtn = document.getElementById('commentLoginBtn');
    var countEl = document.getElementById('commentCount');
    var modeEl = document.getElementById('commentMode');
    if (!listEl) return;

    var mode = 'local';
    var currentUser = null;

    function fmtTime(iso) {
      if (!iso) return '';
      try {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
      } catch (e) { return ''; }
    }
    function esc(s) {
      return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function render(list) {
      if (!list || list.length === 0) {
        listEl.innerHTML = '<div class="text-sm text-gray-400 py-4">还没有评论，来抢沙发吧～</div>';
        if (countEl) countEl.textContent = '';
        return;
      }
      if (countEl) countEl.textContent = '（' + list.length + '）';
      listEl.innerHTML = list.map(function (c) {
        var email = c.user_email || '匿名用户';
        var initial = esc(email.slice(0, 1).toUpperCase());
        return '<div class="flex gap-3 py-4 border-b border-gray-100 last:border-0">' +
          '<div class="w-9 h-9 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center font-semibold shrink-0">' + initial + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-sm font-medium text-navy-800 break-all">' + esc(email) + '</span>' +
              '<span class="text-xs text-gray-400">' + fmtTime(c.created_at) + '</span>' +
            '</div>' +
            '<p class="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">' + esc(c.content) + '</p>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function loadLocal() {
      try {
        var raw = localStorage.getItem('bd_comments_' + newsId);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    function saveLocal(list) {
      try { localStorage.setItem('bd_comments_' + newsId, JSON.stringify(list)); } catch (e) {}
    }

    function load() {
      if (sb) {
        sb.from('comments').select('*').eq('news_id', newsId).order('created_at', { ascending: true })
          .then(function (r) {
            if (r.error) { mode = 'local'; if (modeEl) modeEl.textContent = '本地预览'; render(loadLocal()); }
            else { mode = 'cloud'; if (modeEl) modeEl.textContent = '云端同步'; render(r.data || []); }
          })
          .catch(function () { mode = 'local'; if (modeEl) modeEl.textContent = '本地预览'; render(loadLocal()); });
      } else {
        mode = 'local'; if (modeEl) modeEl.textContent = '本地预览'; render(loadLocal());
      }
    }

    function post(content) {
      content = (content || '').trim();
      if (!content) return;
      if (mode === 'cloud' && sb) {
        sb.from('comments').insert({
          news_id: newsId,
          user_id: currentUser ? currentUser.id : null,
          user_email: currentUser ? currentUser.email : null,
          content: content
        }).then(function (r) {
          if (r.error) { alert('评论发布失败：' + r.error.message); }
          else { input.value = ''; load(); }
        });
      } else {
        var list = loadLocal();
        list.push({
          id: 'local_' + Date.now(),
          news_id: newsId,
          user_id: currentUser ? currentUser.id : null,
          user_email: currentUser ? currentUser.email : '本地用户',
          content: content,
          created_at: new Date().toISOString()
        });
        saveLocal(list);
        input.value = '';
        render(list);
      }
    }

    function applySession(user) {
      currentUser = user;
      if (user) {
        if (loginPrompt) loginPrompt.classList.add('hidden');
        if (form) form.classList.remove('hidden');
      } else {
        if (loginPrompt) loginPrompt.classList.remove('hidden');
        if (form) form.classList.add('hidden');
      }
    }

    if (sb) {
      sb.auth.getUser().then(function (res) { applySession(res.data && res.data.user); });
      sb.auth.onAuthStateChange(function (_e, session) { applySession(session ? session.user : null); });
    } else {
      applySession(null);
    }

    if (loginBtn) loginBtn.addEventListener('click', function () { openAuth('login'); });

    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentUser) { openAuth('login'); return; }
      post(input.value);
    });

    load();
  }

  window.BD = {
    sb: sb,
    escapeHtml: escapeHtml,
    newsCard: newsCard,
    CAT_GRAD: CAT_GRAD,
    CAT_BADGE: CAT_BADGE,
    uniq: uniq,
    fillSelect: fillSelect,
    observeFade: observeFade,
    buildSummary: buildSummary,
    initComments: initComments,
    news: function () { return window.NEWS_DATA || []; }
  };
})();
