/* ai.js — BD之家 DeepSeek + 联网搜索
 * 用户自填 Key（仅存浏览器 localStorage），纯前端、零后端。
 * - callDeepSeek: 调用 DeepSeek Chat Completions（api.deepseek.com）
 * - webSearch: 通过 jina.ai 代理抓取 DuckDuckGo 搜索结果（免 key，绕过跨域）
 * - mdToHtml: 把 AI 返回的 markdown 安全渲染为 HTML
 * - 配置弹层注入右下角浮动按钮
 */
(function () {
  'use strict';
  var LS_KEY = 'bd_deepseek_key', LS_MODEL = 'bd_deepseek_model', LS_PROXY = 'bd_deepseek_proxy';
  function g(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function s(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  function configured(){ return !!g(LS_KEY); }
  function esc(s){ return (s == null ? '' : String(s)).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // ===== DeepSeek 调用 =====
  async function callDeepSeek(messages, opts){
    opts = opts || {};
    var key = g(LS_KEY);
    if(!key) throw new Error('NO_KEY');
    var model = g(LS_MODEL) || 'deepseek-chat';
    var endpoint = 'https://api.deepseek.com/v1/chat/completions';
    var url = (g(LS_PROXY) === '1') ? ('https://corsproxy.io/?url=' + encodeURIComponent(endpoint)) : endpoint;
    var body = { model: model, messages: messages, temperature: (opts.temperature != null ? opts.temperature : 0.7), stream: false };
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
    var r = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    if(!r.ok){ var t = await r.text().catch(function(){ return ''; }); throw new Error('DeepSeek 返回 ' + r.status + '：' + t.slice(0,300)); }
    var data = await r.json();
    if(data.error) throw new Error('DeepSeek 错误：' + (data.error.message || JSON.stringify(data.error)));
    if(!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('DeepSeek 返回格式异常');
    return data.choices[0].message.content;
  }

  // ===== 联网搜索（DuckDuckGo via jina.ai，免 key）=====
  function realUrl(u){
    try { var m = u.match(/[?&]uddg=([^&]+)/); if(m) return decodeURIComponent(m[1]); } catch(e){}
    return u;
  }
  async function webSearch(query, n){
    n = n || 6;
    var ddg = 'https://duckduckgo.com/html/?q=' + encodeURIComponent(query) + '&kl=cn-zh';
    var url = 'https://r.jina.ai/' + ddg;
    var r = await fetch(url, { headers: { 'Accept': 'text/plain' } }).catch(function(e){ throw new Error('联网搜索请求失败：' + e.message); });
    if(!r.ok) throw new Error('联网搜索返回 ' + r.status);
    var text = await r.text();
    var results = [];
    var re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, m;
    while((m = re.exec(text)) && results.length < n){
      var title = m[1].trim();
      var href = realUrl(m[2].trim());
      if(!/^https?:\/\/(www\.)?(duckduckgo\.com|html\.duckduckgo\.com)/.test(href)){
        if(title && href.indexOf('http') === 0 && !results.some(function(x){ return x.href === href; })){
          results.push({ title: title, href: href });
        }
      }
    }
    return { results: results, raw: text };
  }

  // ===== markdown -> 安全 HTML =====
  function inline(s){
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-navy-500 hover:underline">$1</a>');
  }
  function mdToHtml(md){
    if(!md) return '';
    var lines = esc(md).split(/\r?\n/);
    var html = '', inList = false;
    function closeList(){ if(inList){ html += '</ul>'; inList = false; } }
    for(var i=0;i<lines.length;i++){
      var line = lines[i];
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if(h){ closeList(); var lv = h[1].length; html += '<h'+(lv+2)+' class="text-navy-800 font-bold mt-4 mb-2 text-sm">'+h[2]+'</h'+(lv+2)+'>'; continue; }
      var li = line.match(/^\s*[-*]\s+(.*)$/);
      if(li){ if(!inList){ html += '<ul class="list-disc pl-5 space-y-1 my-2">'; inList = true; } html += '<li class="text-sm text-gray-700 leading-relaxed">'+inline(li[1])+'</li>'; continue; }
      if(!line.trim()){ closeList(); continue; }
      closeList();
      html += '<p class="text-sm text-gray-700 leading-relaxed my-2">'+inline(line)+'</p>';
    }
    closeList();
    return html;
  }

  // ===== UI 注入 =====
  function refreshLabel(){ var l = document.getElementById('aiConfigLabel'); if(l) l.textContent = configured() ? 'AI 已配置' : 'AI 未配置'; }
  function openConfig(){ var m = document.getElementById('aiConfigModal'); if(m) m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; syncForm(); }
  function closeConfig(){ var m = document.getElementById('aiConfigModal'); if(m) m.classList.add('hidden'); document.body.style.overflow = ''; }
  function syncForm(){
    var k = document.getElementById('aiKeyInput'), mm = document.getElementById('aiModelSelect'), px = document.getElementById('aiProxyCheck');
    if(k) k.value = g(LS_KEY) || '';
    if(mm) mm.value = g(LS_MODEL) || 'deepseek-chat';
    if(px) px.checked = g(LS_PROXY) === '1';
  }
  function bindModal(modal){
    modal.addEventListener('click', function(e){ if(e.target === modal) closeConfig(); });
    var close = modal.querySelector('[data-close]'); if(close) close.onclick = closeConfig;
    var save = modal.querySelector('[data-save]'); if(save) save.onclick = function(){
      var k = document.getElementById('aiKeyInput').value.trim();
      if(!k){ alert('请填写 DeepSeek API Key'); return; }
      s(LS_KEY, k);
      s(LS_MODEL, document.getElementById('aiModelSelect').value);
      s(LS_PROXY, document.getElementById('aiProxyCheck').checked ? '1' : '0');
      refreshLabel(); closeConfig();
      alert('已保存。Key 仅存于你当前浏览器本地，不会上传任何服务器。');
    };
  }
  function injectUI(){
    if(document.getElementById('aiConfigBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'aiConfigBtn';
    btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> <span id="aiConfigLabel">AI 未配置</span>';
    btn.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:70;display:flex;align-items:center;gap:6px;padding:10px 14px;background:#1e3a5f;color:#fff;border:none;border-radius:999px;font-size:13px;font-weight:600;box-shadow:0 6px 20px rgba(30,58,95,.3);cursor:pointer;font-family:inherit;';
    btn.onclick = openConfig;
    document.body.appendChild(btn);

    var modal = document.createElement('div');
    modal.id = 'aiConfigModal';
    modal.className = 'hidden fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm';
    modal.innerHTML =
      '<div class="modal-card w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">' +
        '<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">' +
          '<h3 class="text-lg font-bold text-navy-800">DeepSeek AI 配置</h3>' +
          '<button data-close class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="关闭"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>' +
        '</div>' +
        '<div class="p-6 space-y-4">' +
          '<p class="text-xs text-gray-400 leading-relaxed">配置仅保存在你当前浏览器（localStorage），不会上传到任何服务器。刷新不丢失，换设备 / 换浏览器需重新填写。</p>' +
          '<div><label class="block text-sm font-medium text-gray-700 mb-1.5">DeepSeek API Key</label>' +
            '<input id="aiKeyInput" type="password" placeholder="sk-..." class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm input-focus"></div>' +
          '<div><label class="block text-sm font-medium text-gray-700 mb-1.5">模型</label>' +
            '<select id="aiModelSelect" class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm input-focus bg-white">' +
              '<option value="deepseek-chat">deepseek-chat（V3，推荐）</option>' +
              '<option value="deepseek-reasoner">deepseek-reasoner（R1，深度推理）</option>' +
            '</select></div>' +
          '<label class="flex items-center gap-2 text-sm text-gray-600"><input id="aiProxyCheck" type="checkbox" class="rounded border-gray-300"> 使用 CORS 代理（浏览器跨域被拦时勾选）</label>' +
          '<button data-save class="w-full px-6 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-all">保存配置</button>' +
          '<p class="text-xs text-gray-400">申请 Key：platform.deepseek.com → API Keys</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    bindModal(modal);
    refreshLabel();
  }

  function ensureConfig(cb){ if(configured()){ cb(); } else { openConfig(); } }

  window.BD_AI = {
    configured: configured,
    callDeepSeek: callDeepSeek,
    webSearch: webSearch,
    mdToHtml: mdToHtml,
    openConfig: openConfig,
    ensureConfig: ensureConfig,
    g: g
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI);
  else injectUI();
})();
