/**
 * 网盘资源分享站前端逻辑
 * 依赖：assets/vendor/qrcode.min.js（本地二维码生成，无外网依赖）、data/resources.js（数据源）
 */
(function () {
  'use strict';

  var CONFIG = window.SITE_CONFIG || {};
  var PAN_MAP = window.PAN_MAP || {};
  var RESOURCES = Array.isArray(window.RESOURCES) ? window.RESOURCES.slice() : [];

  var ALL = '全部';
  var state = { category: ALL, pan: ALL, q: '', sort: 'date' };

  var el = {
    siteTitle: document.getElementById('siteTitle'),
    siteSubtitle: document.getElementById('siteSubtitle'),
    heroStats: document.getElementById('heroStats'),
    notice: document.getElementById('notice'),
    footerNote: document.getElementById('footerNote'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    sortSelect: document.getElementById('sortSelect'),
    categoryChips: document.getElementById('categoryChips'),
    panChips: document.getElementById('panChips'),
    grid: document.getElementById('grid'),
    empty: document.getElementById('empty'),
    resetFilters: document.getElementById('resetFilters'),
    modal: document.getElementById('modal'),
    qrBox: document.getElementById('qrBox'),
    modalTitle: document.getElementById('modalTitle'),
    modalDesc: document.getElementById('modalDesc'),
    modalTags: document.getElementById('modalTags'),
    modalUrl: document.getElementById('modalUrl'),
    metaPan: document.getElementById('metaPan'),
    metaCode: document.getElementById('metaCode'),
    metaSize: document.getElementById('metaSize'),
    metaDate: document.getElementById('metaDate'),
    btnOpen: document.getElementById('btnOpen'),
    btnCopyLink: document.getElementById('btnCopyLink'),
    btnCopyAll: document.getElementById('btnCopyAll'),
    btnSaveQr: document.getElementById('btnSaveQr'),
    toast: document.getElementById('toast')
  };

  /* ---------------- 工具函数 ---------------- */

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function panOf(key) {
    return PAN_MAP[key] || PAN_MAP.other || { name: key || '其他', color: '#6b7280' };
  }

  /** 把 "8.6 GB" 之类的文本换算成 MB，用于排序 */
  function sizeToMb(text) {
    if (!text) return 0;
    var m = String(text).match(/([\d.]+)\s*(TB|GB|MB|KB)/i);
    if (!m) return 0;
    var n = parseFloat(m[1]);
    var unit = m[2].toUpperCase();
    if (unit === 'TB') return n * 1024 * 1024;
    if (unit === 'GB') return n * 1024;
    if (unit === 'MB') return n;
    return n / 1024;
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.hidden = true; }, 1800);
  }

  function copyText(text) {
    if (!text) return Promise.reject(new Error('empty'));
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  /* ---------------- 数据筛选 ---------------- */

  function itemText(r) {
    return [r.title, r.desc, r.category, (r.tags || []).join(' '), panOf(r.pan).name, r.url]
      .join(' ').toLowerCase();
  }

  function matchQuery(r, q) {
    if (!q) return true;
    return itemText(r).indexOf(q.toLowerCase()) !== -1;
  }

  function visible() {
    return RESOURCES.filter(function (r) {
      if (state.category !== ALL && r.category !== state.category) return false;
      if (state.pan !== ALL && String(r.pan) !== state.pan) return false;
      return matchQuery(r, state.q);
    });
  }

  function sorted(list) {
    var arr = list.slice();
    arr.sort(function (a, b) {
      if (!!b.top !== !!a.top) return b.top ? 1 : -1;
      if (state.sort === 'title') return String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
      if (state.sort === 'size') return sizeToMb(b.size) - sizeToMb(a.size);
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    return arr;
  }

  /* ---------------- 渲染 ---------------- */

  function applyConfig() {
    if (CONFIG.title) {
      el.siteTitle.textContent = CONFIG.title;
      document.title = CONFIG.title;
    }
    if (CONFIG.subtitle) el.siteSubtitle.textContent = CONFIG.subtitle;
    if (CONFIG.notice) { el.notice.textContent = CONFIG.notice; el.notice.hidden = false; }
    if (CONFIG.footerNote) el.footerNote.textContent = CONFIG.footerNote;
  }

  function renderStats() {
    var pans = {};
    RESOURCES.forEach(function (r) { pans[String(r.pan || 'other')] = 1; });
    var latest = RESOURCES.map(function (r) { return r.date || ''; }).sort().pop() || '-';
    var data = [
      { num: RESOURCES.length, label: '资源总数' },
      { num: Object.keys(pans).length, label: '接入网盘' },
      { num: latest, label: '最近更新' }
    ];
    el.heroStats.innerHTML = data.map(function (d) {
      return '<div class="stat"><span class="stat-num">' + escapeHtml(d.num) +
        '</span><span class="stat-label">' + escapeHtml(d.label) + '</span></div>';
    }).join('');
  }

  function countBy(field, list) {
    var map = {};
    list.forEach(function (r) {
      var k = String(r[field] || '');
      if (field === 'category' && !k) k = '未分类';
      if (!k) k = 'other';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }

  function renderChips(container, field, current, deps) {
    var counts = countBy(field, RESOURCES.filter(function (r) {
      return deps.every(function (d) { return d(r); }) && matchQuery(r, state.q);
    }));
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var html = '<button type="button" class="chip' + (current === ALL ? ' active' : '') +
      '" data-value="' + ALL + '">' + ALL +
      '<span class="count">' + RESOURCES.filter(function (r) {
        return deps.every(function (d) { return d(r); }) && matchQuery(r, state.q);
      }).length + '</span></button>';
    html += keys.map(function (k) {
      var label = field === 'pan' ? panOf(k).name : k;
      return '<button type="button" class="chip' + (current === k ? ' active' : '') +
        '" data-value="' + escapeHtml(k) + '">' + escapeHtml(label) +
        '<span class="count">' + counts[k] + '</span></button>';
    }).join('');
    container.innerHTML = html;
  }

  function renderFilters() {
    renderChips(el.categoryChips, 'category', state.category, [
      function (r) { return state.pan === ALL || String(r.pan) === state.pan; }
    ]);
    renderChips(el.panChips, 'pan', state.pan, [
      function (r) { return state.category === ALL || r.category === state.category; }
    ]);
  }

  function cardHtml(r) {
    var p = panOf(r.pan);
    var tags = (r.tags || []).slice(0, 3).map(function (t) {
      return '<span class="tag">' + escapeHtml(t) + '</span>';
    }).join('');
    var metas = [];
    if (r.size) metas.push(escapeHtml(r.size));
    if (r.category) metas.push(escapeHtml(r.category));
    return '' +
      '<article class="card" tabindex="0" role="button" data-id="' + escapeHtml(r.id || '') + '">' +
        '<div class="card-top">' +
          '<span class="badge" style="background:' + escapeHtml(p.color) + '">' + escapeHtml(p.name) + '</span>' +
          (r.top ? '<span class="pin">置顶</span>' : '<span class="card-date">' + escapeHtml(r.date || '') + '</span>') +
        '</div>' +
        '<h3 class="card-title">' + escapeHtml(r.title) + '</h3>' +
        '<p class="card-desc">' + escapeHtml(r.desc || '暂无简介') + '</p>' +
        '<div class="tags">' + tags + '</div>' +
        '<div class="card-foot">' +
          '<span class="card-meta">' + metas.join(' · ') + '</span>' +
          '<button class="btn-arrow" type="button">查看二维码 &rarr;</button>' +
        '</div>' +
      '</article>';
  }

  function renderGrid() {
    var list = sorted(visible());
    el.grid.innerHTML = list.map(cardHtml).join('');
    el.empty.hidden = list.length > 0;
    Array.prototype.forEach.call(el.grid.querySelectorAll('.card'), function (c) {
      c.addEventListener('click', function () { openModal(c.getAttribute('data-id')); });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(c.getAttribute('data-id')); }
      });
    });
  }

  function render() {
    renderFilters();
    renderGrid();
  }

  /* ---------------- 弹窗与二维码 ---------------- */

  var current = null;

  function buildQr(text) {
    try {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return { svg: qr.createSvgTag({ cellSize: 6, margin: 3, scalable: true }), qr: qr };
    } catch (e) {
      return { svg: '', qr: null };
    }
  }

  function openModal(id) {
    var r = null;
    for (var i = 0; i < RESOURCES.length; i++) {
      if (String(RESOURCES[i].id) === String(id)) { r = RESOURCES[i]; break; }
    }
    if (!r) return;

    current = r;
    var p = panOf(r.pan);

    el.modalTitle.textContent = r.title || '未命名资源';
    el.modalDesc.textContent = r.desc || '暂无简介';
    el.modalUrl.textContent = r.url || '';

    el.metaPan.innerHTML = '<span class="meta-badge" style="background:' + escapeHtml(p.color) + '">' +
      escapeHtml(p.name) + '</span>';
    el.metaCode.textContent = r.code || '无需提取码';
    el.metaSize.textContent = r.size || '未标注';
    el.metaDate.textContent = r.date || '未标注';

    el.modalTags.innerHTML = (r.tags || []).map(function (t) {
      return '<span class="tag">' + escapeHtml(t) + '</span>';
    }).join('');

    if (r.qrImage) {
      el.qrBox.innerHTML = '<img src="' + escapeHtml(r.qrImage) + '" alt="二维码" />';
      el.btnSaveQr.disabled = true;
    } else if (r.url) {
      var built = buildQr(r.url);
      el.qrBox.innerHTML = built.svg || '<p style="color:#8b94a3;font-size:13px">二维码生成失败</p>';
      el.btnSaveQr.disabled = !built.qr;
    } else {
      el.qrBox.innerHTML = '<p style="color:#8b94a3;font-size:13px">未提供链接</p>';
      el.btnSaveQr.disabled = true;
    }

    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    el.modal.hidden = true;
    el.qrBox.innerHTML = '';
    current = null;
    document.body.style.overflow = '';
  }

  function saveQrImage() {
    if (!current || !current.url) return;
    try {
      var qr = qrcode(0, 'M');
      qr.addData(current.url);
      qr.make();
      var a = document.createElement('a');
      a.href = qr.createDataURL(8, 3);
      a.download = (current.title || 'qrcode') + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('二维码已保存到下载目录');
    } catch (e) {
      toast('保存失败，请改用截图');
    }
  }

  /* ---------------- 事件绑定 ---------------- */

  el.searchInput.addEventListener('input', function () {
    state.q = this.value.trim();
    el.clearSearch.hidden = !state.q;
    render();
  });

  el.clearSearch.addEventListener('click', function () {
    state.q = '';
    el.searchInput.value = '';
    el.clearSearch.hidden = true;
    render();
  });

  el.sortSelect.addEventListener('change', function () {
    state.sort = this.value;
    renderGrid();
  });

  function bindChips(container, key) {
    container.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      state[key] = chip.getAttribute('data-value');
      render();
    });
  }

  bindChips(el.categoryChips, 'category');
  bindChips(el.panChips, 'pan');

  el.resetFilters.addEventListener('click', function () {
    state.category = ALL;
    state.pan = ALL;
    state.q = '';
    el.searchInput.value = '';
    el.clearSearch.hidden = true;
    render();
  });

  Array.prototype.forEach.call(el.modal.querySelectorAll('[data-close]'), function (n) {
    n.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.modal.hidden) closeModal();
  });

  el.btnOpen.addEventListener('click', function () {
    if (current && current.url) window.open(current.url, '_blank', 'noopener');
  });

  el.btnCopyLink.addEventListener('click', function () {
    if (!current) return;
    copyText(current.url).then(function () { toast('链接已复制'); })
      .catch(function () { toast('复制失败，请手动选中链接'); });
  });

  el.btnCopyAll.addEventListener('click', function () {
    if (!current) return;
    var text = current.code ? current.url + '\n提取码：' + current.code : current.url;
    copyText(text).then(function () { toast('链接与提取码已复制'); })
      .catch(function () { toast('复制失败，请手动选中'); });
  });

  el.btnSaveQr.addEventListener('click', saveQrImage);

  window.addEventListener('hashchange', function () {
    var id = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (id) openModal(id);
  });

  /* ---------------- 启动 ---------------- */

  applyConfig();
  renderStats();
  render();

  var initialId = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (initialId) openModal(initialId);
})();
