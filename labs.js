// Capra Labs: the theme switch, the workflow's project switch, and the tree library's season, filters and search.
(function () {
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  // theme: follows the device until you press the switch
  var saved = store('labs-theme'); if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  var tb = document.querySelector('.themebtn');
  function dark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function paint() { if (tb) { tb.textContent = dark() ? '☀' : '☾'; tb.setAttribute('aria-label', dark() ? 'Switch to light' : 'Switch to dark'); } }
  if (tb) tb.addEventListener('click', function () { var t = dark() ? 'light' : 'dark'; root.setAttribute('data-theme', t); store('labs-theme', t); paint(); });
  paint();

  // workflow: pick the kind of project; the steps that apply stay lit
  var modes = document.querySelectorAll('[data-mode]');
  function setMode(m) {
    modes.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'); });
    document.querySelectorAll('li[data-modes]').forEach(function (li) {
      li.classList.toggle('dim', m !== 'all' && li.dataset.modes.split(' ').indexOf(m) < 0);
    });
  }
  modes.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });

  // trees: one season for every tree on the page
  var seasons = document.querySelectorAll('[data-season]');
  function setSeason(s) {
    seasons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.season === s ? 'true' : 'false'); });
    document.querySelectorAll('img[data-' + s + ']').forEach(function (img) { img.src = img.getAttribute('data-' + s); img.alt = img.dataset.name + ', ' + s; });
    store('labs-season', s);
  }
  seasons.forEach(function (b) { b.addEventListener('click', function () { setSeason(b.dataset.season); }); });
  if (seasons.length) setSeason(store('labs-season') || 'summer');

  // trees and assets: filter chips (one choice per row) and search
  var state = {};
  function apply() {
    var q = (document.querySelector('.search') || {}).value || ''; q = q.trim().toLowerCase();
    var shown = 0;
    document.querySelectorAll('.card[data-tags]').forEach(function (c) {
      var tags = c.dataset.tags.split(' ');
      var ok = Object.keys(state).every(function (k) { return state[k] === 'all' || tags.indexOf(state[k]) >= 0; });
      if (q && c.textContent.toLowerCase().indexOf(q) < 0) ok = false;
      c.hidden = !ok; if (ok) shown++;
    });
    var n = document.querySelector('.shown'); if (n) n.textContent = shown;
  }
  document.querySelectorAll('[data-filter]').forEach(function (b) {
    var row = b.dataset.filter; if (!(row in state)) state[row] = 'all';
    b.addEventListener('click', function () {
      state[row] = b.dataset.value;
      document.querySelectorAll('[data-filter="' + row + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply();
    });
  });
  var s = document.querySelector('.search'); if (s) s.addEventListener('input', apply);
  apply();

  // before / after sliders
  // drag anywhere on the picture (mouse or touch); the hidden range keeps it usable from the keyboard
  document.querySelectorAll('.compare').forEach(function (c) {
    var r = c.querySelector('input'), down = false;
    function set(p) { p = Math.max(0, Math.min(100, p)); c.style.setProperty('--pos', p + '%'); if (r) r.value = Math.round(p); }
    function at(e) { var b = c.getBoundingClientRect(); set((e.clientX - b.left) / b.width * 100); }
    c.addEventListener('pointerdown', function (e) { down = true; try { c.setPointerCapture(e.pointerId); } catch (x) {} at(e); });
    c.addEventListener('pointermove', function (e) { if (down) at(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { c.addEventListener(t, function () { down = false; }); });
    if (r) r.addEventListener('input', function () { set(+r.value); });
  });

  // the season engine: a day of the year blends the two nearest renders and moves the line on the calendar
  var day = document.getElementById('day');
  if (day) {
    var imgs = [].slice.call(document.querySelectorAll('.dayview img')).map(function (i) { return { el: i, d: +i.dataset.day }; }).sort(function (a, b) { return a.d - b.d; });
    var out = document.querySelector('.dayctl output'), line = document.querySelector('.calchart .dayline');
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function label(d) { var dt = new Date(Date.UTC(2026, 0, d)); return 'day ' + d + ' · ' + M[dt.getUTCMonth()] + ' ' + dt.getUTCDate(); }
    function setDay(d) {
      out.textContent = label(d);
      if (imgs.length) {
        var n = imgs.length, a = null, b = null;
        for (var i = 0; i < n; i++) { var p = imgs[i], q = imgs[(i + 1) % n]; var pd = p.d, qd = q.d <= pd ? q.d + 365 : q.d; var dd = d < pd ? d + 365 : d; if (dd >= pd && dd <= qd) { a = p; b = q; var t = (dd - pd) / Math.max(1, qd - pd); break; } }
        imgs.forEach(function (x) { x.el.style.opacity = 0; x.el.style.zIndex = 0; });
        if (a) { a.el.style.opacity = 1; a.el.style.zIndex = 1; b.el.style.opacity = t; b.el.style.zIndex = 2; }   // the next one always on top, also across the new year
      }
      if (line) {
        var row = document.querySelector('.calchart .calrow:not(.axisrow) svg') || document.querySelector('.calchart svg');
        if (row) { var r0 = row.getBoundingClientRect(), c0 = line.parentElement.getBoundingClientRect(); line.style.left = (r0.left - c0.left + r0.width * (d - 0.5) / 365) + 'px'; }
      }
    }
    day.addEventListener('input', function () { setDay(+day.value); });
    window.addEventListener('resize', function () { setDay(+day.value); });
    setDay(+day.value);
  }

  // the ground engine: the same aerial photo on three days
  document.querySelectorAll('[data-field]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-field]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('.fieldview img').forEach(function (i) { i.hidden = i.dataset.k !== b.dataset.field; });
    });
  });
})();
