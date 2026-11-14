// Token Radar — the page. No network: every byte it renders comes from data.js,
// written beside the page by main.ts from the same sealed snapshot.
//
// Views: ?view=detail&slug=X opens one protocol's detail; ?filter=TEXT pre-fills
// the search box; ?scope=watchlist|early and ?sort=value|tvl|growth|age|name
// pre-set the toolbar. Clicking a column header sorts by that column.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.getElementById('rows').innerHTML = '<tr class="empty"><td colspan="8">No radar data found beside this page.</td></tr>'; return; }
  var watch = {};
  D.watchlist.forEach(function (s) { watch[s] = true; });

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var money = function (n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  };
  var pct = function (n) {
    if (n == null) return '<span class="flat">n/a</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  };
  var age = function (days) {
    if (days == null) return '—';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return days + 'd';
  };

  // ---- header stats
  var top = D.rows[0];
  $('stats').innerHTML =
    '<div><dt>Protocols ranked</dt><dd>' + D.board_size + '</dd></div>' +
    '<div><dt>Watchlist</dt><dd>' + D.watchlist_size + '</dd></div>' +
    '<div><dt>Early finds</dt><dd>' + D.early_size + '</dd></div>' +
    '<div><dt>Top implied value</dt><dd>' + money(top ? top.implied_value_usd : 0) + '</dd></div>';
  $('asof').textContent = D.as_of;

  // ---- toolbar options
  var cats = {}, chains = {};
  D.rows.forEach(function (r) {
    if (r.category) cats[r.category] = 1;
    r.chains.forEach(function (c) { chains[c] = 1; });
  });
  Object.keys(cats).sort().forEach(function (c) {
    $('cat').appendChild(new Option(c, c));
  });
  Object.keys(chains).sort().forEach(function (c) {
    $('chain').appendChild(new Option(c, c));
  });

  // ---- state from the URL
  var params = new URLSearchParams(location.search);
  var state = {
    q: params.get('filter') || params.get('q') || '',
    cat: params.get('cat') || '',
    chain: params.get('chain') || '',
    scope: params.get('scope') || 'all',
    sort: params.get('sort') || 'value',
    dir: -1,
  };
  $('q').value = state.q;
  $('cat').value = state.cat;
  $('chain').value = state.chain;
  $('scope').value = state.scope;
  $('sort').value = state.sort;

  var SORTS = {
    rank: function (a, b) { return a.rank - b.rank; },
    value: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
    tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
    growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
    age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
    name: function (a, b) { return a.name.localeCompare(b.name); },
    category: function (a, b) { return String(a.category || '').localeCompare(String(b.category || '')); },
    chains: function (a, b) { return (a.chains[0] || '').localeCompare(b.chains[0] || ''); },
    change: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
  };

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = D.rows.filter(function (r) {
      if (state.scope === 'watchlist' && !watch[r.slug]) return false;
      if (state.scope === 'early' && watch[r.slug]) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort === 'rank' ? 'rank' : state.sort;
    list.sort(SORTS[key] || SORTS.value);
    if (state.dir === 1 && key !== 'rank') list.reverse();
    return list;
  }

  function renderBoard() {
    var list = filtered();
    $('count').textContent = list.length + ' of ' + D.board_size + ' protocols';
    if (list.length === 0) {
      $('rows').innerHTML = '<tr class="empty"><td colspan="8">Nothing matches this filter — clear the search or widen the scope.</td></tr>';
      return;
    }
    $('rows').innerHTML = list.map(function (r) {
      var badge = watch[r.slug] ? '<span class="badge wl">Watchlist</span>' : '<span class="badge early">Early</span>';
      return '<tr data-slug="' + esc(r.slug) + '" tabindex="0">' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span> <span class="sub">' + esc(r.slug) + ' ' + badge + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td>' +
        '</tr>';
    }).join('');
  }

  function showDetail(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) { showView('board'); return; }
    var badge = watch[r.slug] ? '<span class="badge wl">Watchlist</span>' : '<span class="badge early">Early find</span>';
    $('detail').innerHTML =
      '<h2>' + esc(r.name) + ' ' + badge + '</h2>' +
      '<p class="meta">Rank #' + r.rank + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · tracked since ' + esc(r.listed_at || 'unknown') + ' (' + age(r.age_days) + ') · records no token in the snapshot.</p>' +
      '<div class="kpis">' +
      '<div class="kpi"><div class="k">Implied value</div><div class="v">' + money(r.implied_value_usd) + '</div></div>' +
      '<div class="kpi"><div class="k">TVL</div><div class="v">' + money(r.tvl_usd) + '</div></div>' +
      '<div class="kpi"><div class="k">7-day change</div><div class="v">' + pct(r.change_7d) + '</div></div>' +
      '<div class="kpi"><div class="k">Chains</div><div class="v">' + r.chains.length + '</div></div>' +
      '</div>' +
      '<h3>How the value is built</h3>' +
      '<table class="factors"><thead><tr><th>Factor</th><th class="num">Value</th><th>What it means</th></tr></thead><tbody>' +
      '<tr><td>Base (TVL × 0.30)</td><td class="num">' + money(r.tvl_usd * D.model.base_multiple) + '</td><td>Capital the protocol already holds, at thirty cents on the dollar.</td></tr>' +
      '<tr><td>Growth ×' + r.growth_factor.toFixed(2) + '</td><td class="num">' + pct(r.change_7d) + ' / 7d</td><td>TVL momentum, clamped so one wild week cannot dominate.</td></tr>' +
      '<tr><td>Maturity ×' + r.maturity_factor.toFixed(2) + '</td><td class="num">' + age(r.age_days) + '</td><td>Survival since first tracked; the square root rewards early years most.</td></tr>' +
      '<tr><td>Breadth ×' + r.breadth_factor.toFixed(2) + '</td><td class="num">' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</td><td>Each extra chain adds 4%, capped at +20%.</td></tr>' +
      '</tbody></table>' +
      '<h3>Farm plan — 7 steps</h3>' +
      '<ol>' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="hint">This plan is generated from the protocol\'s own record (category, chains, TVL, age). It is a farming guide, not a promise: a token may never be issued.</p>';
    showView('detail');
  }

  function renderLive() {
    $('live-rows').innerHTML = D.live.map(function (r) {
      return '<tr><td><span class="name">' + esc(r.name) + '</span> <span class="sub">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num"><b>' + money(r.mcap_usd) + '</b></td>' +
        '<td class="num">' + pct(r.change_7d) + '</td></tr>';
    }).join('');
  }

  function renderModel() {
    var m = D.model;
    $('model-card').innerHTML =
      '<h2>How the model works — ' + esc(D.model_version) + '</h2>' +
      '<p>The board ranks pre-token protocols by an <b>implied value</b>: what a token would be worth if the protocol issued one and its record stayed as it is. The value follows only from the snapshot\'s own figures — no protocol name is ever special-cased.</p>' +
      '<pre>implied = TVL × ' + m.base_multiple + ' × growth × maturity × breadth\n' +
      'growth   = 1 + clamp(7d change, ' + m.growth_floor + '%, ' + m.growth_cap + '%) / 100 × ' + m.growth_weight + '\n' +
      'maturity = ' + m.maturity_floor + ' + ' + m.maturity_range + ' × sqrt(min(age, ' + m.maturity_days + 'd) / ' + m.maturity_days + 'd)\n' +
      'breadth  = 1 + ' + m.breadth_step + ' × min(chains − 1, ' + m.breadth_max_extra + ')</pre>' +
      '<p><b>Separation.</b> A protocol is pre-token when its snapshot record carries no market cap, no CoinGecko id and no symbol. Protocols whose token already trades are set aside in the <b>Already trading</b> tab at the market\'s own value — never ranked against launches that have not happened.</p>' +
      '<p><b>Coverage.</b> The board holds all ' + D.watchlist_size + ' watchlist protocols (TVL at or above the $' + (D.floor_usd / 1e6) + 'M floor) plus ' + D.early_size + ' early finds below the floor, the highest-TVL pre-token protocols the watchlist leaves out. The floor is a starting line, not a ceiling.</p>' +
      '<p><b>Farm plans.</b> Every row carries a seven-step plan built from that protocol\'s own category, chains, TVL and age: the capital, the hold time and the weekly rhythm all scale with the record, not with a hand-kept list.</p>';
  }

  // ---- views and tabs
  var VIEWS = ['board', 'detail', 'live', 'model'];
  function setUrl(url) { try { history.pushState(null, '', url); } catch (e) { /* file:// has no history to push */ } }
  function showView(v) {
    VIEWS.forEach(function (x) { $('view-' + x).hidden = x !== v; });
    $('toolbar').style.display = v === 'board' ? '' : 'none';
    $('tab-board').classList.toggle('active', v === 'board' || v === 'detail');
    $('tab-live').classList.toggle('active', v === 'live');
    $('tab-model').classList.toggle('active', v === 'model');
    window.scrollTo(0, 0);
  }
  $('tab-board').addEventListener('click', function () { setUrl(location.pathname); showView('board'); });
  $('tab-live').addEventListener('click', function () { renderLive(); showView('live'); });
  $('tab-model').addEventListener('click', function () { renderModel(); showView('model'); });
  $('back').addEventListener('click', function () { setUrl(location.pathname); showView('board'); });

  // ---- toolbar events
  var rerender = function () { renderBoard(); };
  $('q').addEventListener('input', function () { state.q = $('q').value; rerender(); });
  $('cat').addEventListener('change', function () { state.cat = $('cat').value; rerender(); });
  $('chain').addEventListener('change', function () { state.chain = $('chain').value; rerender(); });
  $('scope').addEventListener('change', function () { state.scope = $('scope').value; rerender(); });
  $('sort').addEventListener('change', function () { state.sort = $('sort').value; state.dir = -1; rerender(); });
  document.querySelectorAll('#board thead th').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) { state.dir = -state.dir; } else { state.sort = key; state.dir = -1; }
      var sel = $('sort');
      if (['value', 'tvl', 'growth', 'age', 'name'].indexOf(key) >= 0) sel.value = key;
      rerender();
    });
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) { setUrl('?view=detail&slug=' + encodeURIComponent(tr.getAttribute('data-slug'))); showDetail(tr.getAttribute('data-slug')); }
  });
  $('rows').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var tr = e.target.closest('tr[data-slug]');
    if (tr) { setUrl('?view=detail&slug=' + encodeURIComponent(tr.getAttribute('data-slug'))); showDetail(tr.getAttribute('data-slug')); }
  });

  renderBoard();
  if (params.get('view') === 'detail' && params.get('slug')) showDetail(params.get('slug'));
})();
