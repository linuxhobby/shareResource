(function () {
  'use strict';

  var dataEl = document.getElementById('list-data');
  var items = dataEl ? JSON.parse(dataEl.textContent) : [];
  var listEl = document.getElementById('list');
  var moreEl = document.getElementById('more');
  var input = document.getElementById('q');
  var resultsEl = document.getElementById('results');
  var NEWEST = 6;   // 与构建端保持一致：前 6 条打「最新」角标
  var PAGE = parseInt(moreEl && moreEl.getAttribute('data-page-size'), 10) || 36;
  var MAX_HITS = 120;
  var shown = PAGE;
  var globalIndex = null;
  var globalLoading = false;
  var timer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** 命中片段高亮：只在标题里标出用户真正输入的关键词 */
  function highlight(text, tokens) {
    var html = esc(text);
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (!t) continue;
      html = html.replace(new RegExp(escapeRegExp(t), 'gi'), function (m) {
        return '<mark>' + m + '</mark>';
      });
    }
    return html;
  }

  function cardHtml(it, isNew, tokens) {
    return '<li class="tile-item"><a class="tile" href="' + esc(it.href) + '">' +
      '<span class="tile__poster">' +
        '<img class="tile__img" src="' + esc(it.card || it.thumb) + '" width="240" height="360" alt="' + esc(it.title) + '" loading="lazy">' +
        (isNew ? '<span class="tile__new">最新</span>' : '') +
      '</span>' +
      '<span class="tile__title">' + (tokens && tokens.length ? highlight(it.title, tokens) : esc(it.title)) + '</span>' +
      '<span class="tile__meta">' + esc(it.category) + (it.date ? ' · ' + esc(it.date) : '') + '</span>' +
    '</a></li>';
  }

  function renderMore() {
    shown = Math.min(shown + PAGE, items.length);
    listEl.innerHTML = items.slice(0, shown).map(function (it, i) { return cardHtml(it, i < NEWEST); }).join('');
    if (moreEl) {
      moreEl.hidden = shown >= items.length;
      moreEl.textContent = '加载更多（剩余 ' + (items.length - shown) + '）';
    }
  }

  /**
   * 相关度打分：标题命中优先于标签、简介；完整词优先于拼音前缀
   */
  function score(it, tokens) {
    var title = (it.title || '').toLowerCase();
    var tags = (it.tags || []).join(' ').toLowerCase();
    var desc = (it.desc || '').toLowerCase();
    var py = (it.py || '').toLowerCase();
    var py1 = (it.py1 || '').toLowerCase();
    var total = 0;

    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var s = 0;
      if (title === t) s = 100;
      else if (title.indexOf(t) === 0) s = 60;
      else if (title.indexOf(t) !== -1) s = 40;
      else if (tags.indexOf(t) !== -1) s = 22;
      else if (desc.indexOf(t) !== -1) s = 12;
      else if (py && py.indexOf(t) !== -1) s = py.indexOf(t) === 0 ? 30 : 18;
      else if (py1 && py1.indexOf(t) !== -1) s = py1.indexOf(t) === 0 ? 26 : 14;
      if (s === 0) return 0;      // 任一分词未命中即排除
      total += s;
    }
    return total;
  }

  function search(query) {
    var q = query.trim().toLowerCase();
    if (!q) return null;
    var tokens = q.split(/\s+/);
    var source = globalIndex || items;
    var hits = [];
    for (var i = 0; i < source.length; i++) {
      var sc = score(source[i], tokens);
      if (sc > 0) hits.push({ item: source[i], score: sc });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, MAX_HITS).map(function (h) { return h.item; });
  }

  function renderResults(query) {
    var q = query.trim();
    var hits = search(query);
    if (!hits) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      listEl.hidden = false;
      if (moreEl) moreEl.hidden = shown >= items.length;
      return;
    }
    listEl.hidden = true;
    if (moreEl) moreEl.hidden = true;
    resultsEl.hidden = false;
    var tokens = q.toLowerCase().split(/\s+/);
    resultsEl.innerHTML = hits.length
      ? '<div class="results__hint">找到 ' + hits.length + ' 个资源（按相关度排序）</div>' +
        '<ul class="grid">' + hits.map(function (it) { return cardHtml(it, false, tokens); }).join('') + '</ul>'
      : '<p class="empty">没有匹配「' + esc(q) + '」的资源，试试更短的关键词或拼音首字母</p>';
  }

  // 输入防抖：避免每敲一个字就重排上百个卡片
  function scheduleSearch(value) {
    clearTimeout(timer);
    timer = setTimeout(function () { renderResults(value); }, 120);
  }

  function loadGlobalIndex(cb) {
    if (globalIndex || globalLoading) return cb && cb();
    globalLoading = true;
    fetch('search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { globalIndex = data; globalLoading = false; cb && cb(); })
      .catch(function () { globalLoading = false; cb && cb(); });
  }

  if (moreEl) moreEl.addEventListener('click', renderMore);

  if (input) {
    input.addEventListener('input', function () {
      var v = input.value;
      scheduleSearch(v);
      syncUrl(v);
      if (v.trim() && !globalIndex) {
        loadGlobalIndex(function () { if (input.value.trim()) renderResults(input.value); });
      }
    });
    input.addEventListener('focus', function () { if (!globalIndex) loadGlobalIndex(); });

    // Esc 清空搜索，回到列表
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        input.value = '';
        renderResults('');
        syncUrl('');
        input.blur();
      }
    });

    // 支持从 /?q=关键词 直接进来（也对应结构化数据里的 SearchAction）
    var params = new URLSearchParams(location.search);
    var q0 = params.get('q');
    if (q0) {
      input.value = q0;
      renderResults(q0);
      loadGlobalIndex(function () { if (input.value.trim()) renderResults(input.value); });
    }
  }

  function syncUrl(value) {
    if (!history.replaceState) return;
    var url = value.trim() ? '?q=' + encodeURIComponent(value.trim()) : location.pathname;
    history.replaceState(null, '', url);
  }

  // 快捷键：Ctrl/⌘ + K 或 / 聚焦搜索框
  document.addEventListener('keydown', function (e) {
    if (!input) return;
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea';
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
      return;
    }
    if (e.key === '/' && !typing) {
      e.preventDefault();
      input.focus();
    }
  });

  // 复制链接 / 提取码
  document.addEventListener('click', function (e) {
    var copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      var text = copyBtn.getAttribute('data-copy');
      var done = function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        setTimeout(function () { copyBtn.textContent = old; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
      return;
    }

    var qrBtn = e.target.closest('.qrbtn');
    if (qrBtn) {
      var img = document.getElementById('qrImg');
      var cap = document.getElementById('qrCap');
      if (img) img.src = qrBtn.getAttribute('data-qr');
      if (cap) cap.textContent = qrBtn.getAttribute('data-cap');
      var btns = document.querySelectorAll('.qrbtn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('is-on');
      qrBtn.classList.add('is-on');
    }
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }
})();
