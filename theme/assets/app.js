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
  var shown = PAGE;
  var globalIndex = null;
  var globalLoading = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cardHtml(it, isNew) {
    return '<a class="tile" href="' + esc(it.href) + '">' +
      '<span class="tile__poster">' +
        '<img class="tile__img" src="' + esc(it.card || it.thumb) + '" width="240" height="360" alt="' + esc(it.title) + '" loading="lazy">' +
        (isNew ? '<span class="tile__new">最新</span>' : '') +
      '</span>' +
      '<span class="tile__title">' + esc(it.title) + '</span>' +
      '<span class="tile__meta">' + esc(it.category) + (it.date ? ' · ' + esc(it.date) : '') + '</span>' +
    '</a>';
  }

  function renderMore() {
    shown = Math.min(shown + PAGE, items.length);
    listEl.innerHTML = items.slice(0, shown).map(function (it, i) { return cardHtml(it, i < NEWEST); }).join('');
    if (moreEl) {
      moreEl.hidden = shown >= items.length;
      moreEl.textContent = '加载更多（剩余 ' + (items.length - shown) + '）';
    }
  }

  function haystack(it) {
    return (it.title + ' ' + it.category + ' ' + (it.tags || []).join(' ') + ' ' + (it.desc || '')).toLowerCase();
  }

  function search(query) {
    var q = query.trim().toLowerCase();
    if (!q) return null;
    var tokens = q.split(/\s+/);
    var source = globalIndex || items;
    return source.filter(function (it) {
      var s = haystack(it);
      return tokens.every(function (t) { return s.indexOf(t) !== -1; });
    });
  }

  function renderResults(query) {
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
    resultsEl.innerHTML = hits.length
      ? '<div class="results__hint">找到 ' + hits.length + ' 个资源</div>' +
        '<div class="grid">' + hits.slice(0, 200).map(function (it) { return cardHtml(it, false); }).join('') + '</div>'
      : '<p class="empty">没有匹配的资源</p>';
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
      renderResults(v);
      if (v.trim() && !globalIndex) {
        loadGlobalIndex(function () { if (input.value.trim()) renderResults(input.value); });
      }
    });
    input.addEventListener('focus', function () { if (!globalIndex) loadGlobalIndex(); });
  }

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
