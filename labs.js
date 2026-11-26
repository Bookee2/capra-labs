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

  // the season picker: the species on a property (up to eight), each its own render on the keyframe days either side of
  // the chosen day, blended; the mix and the day ride in the link (#mix=a.b.c&day=258) so a view can be sent
  var day = document.getElementById('day');
  var md = document.getElementById('mixdata');
  if (md && day) {
    var D = JSON.parse(md.textContent), view = document.querySelector('.mixview'), count = document.querySelector('.pickcount');
    var chips = [].slice.call(document.querySelectorAll('[data-sp]')), cells = [], MAX = 8;
    var sel = D.first.slice();
    var h = (location.hash || '').replace(/^#/, ''), q = {};
    h.split('&').forEach(function (p) { var kv = p.split('='); if (kv.length === 2) q[kv[0]] = decodeURIComponent(kv[1]); });
    if (q.mix) { var want = q.mix.split('.').filter(function (k) { return D.sp[k]; }).slice(0, MAX); if (want.length) sel = want; }
    if (q.day && +q.day >= 1 && +q.day <= 365) day.value = +q.day;
    if (q.mix || q.day) { var sec = document.getElementById('season'); if (sec) setTimeout(function () { sec.scrollIntoView(); }, 0); }
    function pad(d) { return ('00' + d).slice(-3); }
    function bracket(d) {
      var ds = D.days, n = ds.length;
      for (var i = 0; i < n; i++) {
        var p = ds[i], nx = ds[(i + 1) % n], qd = nx <= p ? nx + 365 : nx, dd = d < p ? d + 365 : d;
        if (dd >= p && dd <= qd) return [p, nx, (dd - p) / Math.max(1, qd - p)];
      }
      return [ds[0], ds[0], 0];
    }
    // each species is one strip of its keyframe days, left to right: two layers of it, each shifted to a day
    function pos(d) { var i = D.days.indexOf(d), n = D.days.length; return (n > 1 ? i / (n - 1) * 100 : 0) + '% 0'; }
    function cell(k) {
      var f = document.createElement('figure'), box = document.createElement('div'), cap = document.createElement('figcaption');
      f.className = 'mcell'; box.className = 'mbox'; box.setAttribute('role', 'img'); box.setAttribute('aria-label', D.sp[k].n);
      var a = document.createElement('div'), b = document.createElement('div');
      [a, b].forEach(function (x) { x.className = 'mframe'; x.style.backgroundImage = 'url(' + D.sp[k].src + ')'; x.style.backgroundSize = (D.days.length * 100) + '% 100%'; });
      box.appendChild(a); box.appendChild(b); cap.textContent = D.sp[k].n; f.appendChild(box); f.appendChild(cap);
      f._a = a; f._b = b; f._k = k; return f;
    }
    window.__mix = function (d) {
      var br = bracket(d);
      cells.forEach(function (c) { c._a.style.backgroundPosition = pos(br[0]); c._b.style.backgroundPosition = pos(br[1]); c._b.style.opacity = br[2]; });
      try { history.replaceState(null, '', '#mix=' + sel.join('.') + '&day=' + d); } catch (e) {}
    };
    function sync() {
      chips.forEach(function (b) { b.setAttribute('aria-pressed', sel.indexOf(b.dataset.sp) >= 0 ? 'true' : 'false'); });
      view.innerHTML = ''; cells = sel.map(cell); cells.forEach(function (c) { view.appendChild(c); });
      count.textContent = sel.length + ' of ' + MAX; count.classList.toggle('full', sel.length >= MAX);
      window.__mix(+day.value);
    }
    chips.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.sp, i = sel.indexOf(k);
        if (i >= 0) { if (sel.length > 1) sel.splice(i, 1); }
        else if (sel.length < MAX) sel.push(k);
        else { count.classList.remove('flash'); void count.offsetWidth; count.classList.add('flash'); return; }
        sync();
      });
    });
    sync();
  }

  // the season engine: a day of the year blends the two nearest renders and moves the line on the calendar
  if (day) {
    var imgs = [].slice.call(document.querySelectorAll('.dayview img')).map(function (i) { return { el: i, d: +i.dataset.day }; }).sort(function (a, b) { return a.d - b.d; });
    var out = document.querySelector('.dayctl output'), line = document.querySelector('.calchart .dayline');
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function label(d) { var dt = new Date(Date.UTC(2026, 0, d)); return 'day ' + d + ' · ' + M[dt.getUTCMonth()] + ' ' + dt.getUTCDate(); }
    function setDay(d) {
      out.textContent = label(d);
      if (window.__mix) window.__mix(d);
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
