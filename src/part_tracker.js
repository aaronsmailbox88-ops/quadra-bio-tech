/* Daily tracker: blood pressure and blood sugar. Saved privately per signed-in viewer (db capability) with a browser-storage fallback. */
(function(){
  var KEY = 'mp-tracker', MGDL = 18.016, DAY = 86400000;
  var state = { bp: [], gl: [], wt: [], hr: [], unit: 'mmol', wunit: 'kg' };
  var LB = 2.20462;
  var store = { mode: 'local', doc: null };
  var syncEl = document.getElementById('tk-sync');
  if (!syncEl) return;
  var $ = function(id){ return document.getElementById(id); };

  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function todayStr(){ var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nowStr(){ var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function parseDay(s){ var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayIdx(s){ return Math.round(parseDay(s).getTime() / DAY); }
  function fromIdx(i){ return new Date(i * DAY + 12 * 3600000); }
  function fmtIdx(i){ return fromIdx(i).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function fmtDay(s){ return parseDay(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function fmtTime(t){ if (!t) return ''; var p = t.split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' am' : ' pm'); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clean(o){
    return { bp: Array.isArray(o && o.bp) ? o.bp : [], gl: Array.isArray(o && o.gl) ? o.gl : [], wt: Array.isArray(o && o.wt) ? o.wt : [], hr: Array.isArray(o && o.hr) ? o.hr : [], unit: (o && o.unit === 'mgdl') ? 'mgdl' : 'mmol', wunit: (o && o.wunit === 'lb') ? 'lb' : 'kg' };
  }
  function loadLocal(){ try { var s = localStorage.getItem(KEY); if (s) state = clean(JSON.parse(s)); } catch (e) {} }
  function saveLocal(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function setSync(on, msg){ syncEl.className = 'sync' + (on ? ' on' : ''); syncEl.textContent = msg || (on ? 'Saved privately to your account' : 'Saved in this browser only'); }

  var writing = false, pending = false;
  function pushDb(){
    if (store.mode !== 'db') return;
    if (writing){ pending = true; return; }
    writing = true;
    store.doc.set({ v: 3, bp: state.bp, gl: state.gl, wt: state.wt, hr: state.hr, unit: state.unit, wunit: state.wunit })
      .then(function(){ setSync(true); }, function(){ setSync(false, 'Could not save to your account; kept in this browser.'); })
      .then(function(){ writing = false; if (pending){ pending = false; pushDb(); } });
  }
  function commit(){ saveLocal(); pushDb(); renderAll(); }

  function initDb(){
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){
      var db = r[0], user = r[1];
      if (!db || !user) return null;
      return user.id().then(function(id){
        if (!id) return null;
        var doc = db.doc('data/users/' + id + '/tracker');
        return doc.get().then(function(snap){
          if (snap.exists){ state = clean(snap.data()); saveLocal(); return doc; }
          if (state.bp.length || state.gl.length || state.wt.length || state.hr.length) return doc.set({ v: 3, bp: state.bp, gl: state.gl, wt: state.wt, hr: state.hr, unit: state.unit, wunit: state.wunit }).then(function(){ return doc; });
          return doc;
        });
      });
    }).then(function(doc){
      if (!doc) return;
      store.mode = 'db'; store.doc = doc; setSync(true); renderAll();
      doc.onSnapshot(function(s){
        if (!s.exists || s.metadata.hasPendingWrites || writing) return;
        var next = clean(s.data());
        if (JSON.stringify(next) !== JSON.stringify(state)){ state = next; saveLocal(); renderAll(); }
      }, function(){ store.mode = 'local'; setSync(false); });
    }).catch(function(){});
  }

  /* ---------- statistics ---------- */
  function readingsOf(kind){ return state[kind].slice().sort(function(a, b){ return (a.d + (a.t || '')) < (b.d + (b.t || '')) ? -1 : 1; }); }
  function meanIn(list, field, from, to){ var s = 0, n = 0; list.forEach(function(r){ var i = dayIdx(r.d); if (i >= from && i <= to && typeof r[field] === 'number'){ s += r[field]; n++; } }); return n ? { v: s / n, n: n } : null; }
  function daily(list, field){
    var m = {};
    list.forEach(function(r){ if (typeof r[field] !== 'number') return; var g = m[r.d] = m[r.d] || { d: r.d, s: 0, n: 0 }; g.s += r[field]; g.n++; });
    return Object.keys(m).sort().map(function(k){ return { d: k, x: dayIdx(k), v: m[k].s / m[k].n }; });
  }
  function slopePerWeek(pts){
    if (pts.length < 4 || pts[pts.length - 1].x - pts[0].x < 7) return null;
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function(p){ sx += p.x; sy += p.v; sxx += p.x * p.x; sxy += p.x * p.v; });
    var den = n * sxx - sx * sx; if (!den) return null;
    return (n * sxy - sx * sy) / den * 7;
  }
  function rolling(list, field, today){
    var out = [], days = daily(list, field).filter(function(p){ return p.x >= today - 55; });
    days.forEach(function(p){ var m = meanIn(list, field, p.x - 6, p.x); if (m) out.push({ x: p.x, y: m.v }); });
    return out;
  }
  function weekStart(dstr){ var dt = parseDay(dstr), wd = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - wd); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function weekly(list, fields){
    var m = {};
    list.forEach(function(r){
      var w = weekStart(r.d), g = m[w] = m[w] || { w: w, n: 0, s: {}, c: {} };
      g.n++;
      fields.forEach(function(f){ if (typeof r[f] === 'number'){ g.s[f] = (g.s[f] || 0) + r[f]; g.c[f] = (g.c[f] || 0) + 1; } });
    });
    return Object.keys(m).sort().reverse().slice(0, 8).map(function(k){
      var g = m[k], o = { w: k, n: g.n, avg: {} };
      fields.forEach(function(f){ o.avg[f] = g.c[f] ? g.s[f] / g.c[f] : null; });
      return o;
    });
  }
  function weekLabel(w){ var a = parseDay(w), b = new Date(a.getTime()); b.setDate(a.getDate() + 6); return fmtDay(w) + ' – ' + b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function trendHtml(slope, unit, thr, dec){
    if (slope === null) return '<div class="num" style="font-size:16px;color:var(--ink-3)">Needs more days</div><div class="lbl">4-week trend</div>';
    var cls = slope > thr ? 'trend-up' : (slope < -thr ? 'trend-down' : 'trend-flat');
    var arrow = slope > thr ? '↑' : (slope < -thr ? '↓' : '→');
    var word = slope > thr ? 'rising' : (slope < -thr ? 'falling' : 'steady');
    return '<div class="num ' + cls + '">' + arrow + ' ' + word + '</div><div class="lbl">' + (Math.abs(slope) < thr ? 'within ±' + thr + ' ' + unit + ' a week' : Math.abs(slope).toFixed(dec) + ' ' + unit + ' a week') + ', 4-week trend</div>';
  }

  /* ---------- chart ---------- */
  function drawChart(box, cfg){
    var svg = box.querySelector('svg'), W = box.clientWidth; if (!W) return;
    var H = 220, L = 40, R = 10, T = 14, B = 30, pw = W - L - R, ph = H - T - B;
    var today = dayIdx(todayStr()), x0 = today - 55, x1 = today + 1;
    function X(d){ return L + pw * (d - x0) / (x1 - x0); }
    function Y(v){ return T + ph * (1 - (v - cfg.ymin) / (cfg.ymax - cfg.ymin)); }
    var s = '';
    for (var v = cfg.ymin; v <= cfg.ymax + 1e-9; v += cfg.ystep){ var y = Y(v); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + cfg.fmt(v) + '</text>'; }
    for (var d = today; d >= x0; d -= 7){ var x = X(d); s += '<line x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (T + ph) + '" class="grid"/>'; if ((today - d) % 14 === 0) s += '<text x="' + x + '" y="' + (H - B + 16) + '" text-anchor="middle" class="ax">' + fmtIdx(d) + '</text>'; }
    cfg.refs.forEach(function(r){ if (r.y < cfg.ymin || r.y > cfg.ymax) return; var yr = Y(r.y); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yr + '" y2="' + yr + '" class="plat"/><text x="' + (L + 4) + '" y="' + (yr - 4) + '" class="plat-l">' + r.label + '</text>'; });
    var all = [];
    cfg.series.forEach(function(se){
      if (se.line.length > 1){ var p = ''; se.line.forEach(function(q, i){ p += (i ? ' L' : 'M') + X(q.x).toFixed(1) + ' ' + Y(q.y).toFixed(1); }); s += '<path d="' + p + '" class="' + se.lcls + '"/>'; }
      se.pts.forEach(function(q){ var px = X(q.x), py = Y(q.y); all.push({ px: px, py: py, label: q.label }); s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="4" class="' + se.cls + (q.hollow ? ' hollow' : '') + '"/>'; });
    });
    s += '<g class="hv" hidden><circle r="7" class="dot"/></g><rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '" fill="transparent"/>';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = s;
    box._pts = all; box._W = W;
  }
  function wireHover(box){
    var svg = box.querySelector('svg'), tip = box.querySelector('.tip');
    function hide(){ var g = svg.querySelector('.hv'); if (g) g.setAttribute('hidden', ''); tip.hidden = true; }
    function move(e){
      var pts = box._pts; if (!pts || !pts.length) return;
      var r = svg.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 1e9;
      pts.forEach(function(p){ var dd = (p.px - x) * (p.px - x) + (p.py - y) * (p.py - y); if (dd < bd){ bd = dd; best = p; } });
      if (!best || bd > 26 * 26){ hide(); return; }
      var g = svg.querySelector('.hv'); g.removeAttribute('hidden');
      var c = g.querySelector('circle'); c.setAttribute('cx', best.px); c.setAttribute('cy', best.py);
      tip.textContent = best.label; tip.hidden = false;
      var tw = tip.offsetWidth, left = best.px + 12; if (left + tw > box._W - 4) left = best.px - tw - 12; if (left < 0) left = 0;
      tip.style.left = left + 'px'; tip.style.top = Math.max(0, best.py - 34) + 'px';
    }
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', hide);
  }

  /* ---------- blood pressure ---------- */
  function renderBP(){
    var list = readingsOf('bp'), today = dayIdx(todayStr()), sum = $('bp-summary'), wrap = $('bp-chartwrap');
    if (!list.length){
      sum.innerHTML = '<p class="empty">No readings yet. Add the first one above.</p>';
      wrap.hidden = true; $('bp-weeks').innerHTML = ''; $('bp-list').innerHTML = '<p class="empty">Nothing logged yet.</p>'; return;
    }
    var tw = meanIn(list, 's', today - 6, today), twd = meanIn(list, 'di', today - 6, today);
    var lw = meanIn(list, 's', today - 13, today - 7), lwd = meanIn(list, 'di', today - 13, today - 7);
    var html = '<div class="summ">';
    html += '<div class="stat"><div class="num">' + (tw ? Math.round(tw.v) + '/' + Math.round(twd.v) : '—') + '</div><div class="lbl">' + (tw ? 'average of ' + tw.n + ' reading' + (tw.n > 1 ? 's' : '') + ' this week' : 'no readings in the last 7 days') + '</div></div>';
    html += '<div class="stat"><div class="num">' + (tw && lw ? (Math.round(tw.v - lw.v) > 0 ? '+' : '') + Math.round(tw.v - lw.v) + ' / ' + (Math.round(twd.v - lwd.v) > 0 ? '+' : '') + Math.round(twd.v - lwd.v) : '—') + '</div><div class="lbl">' + (tw && lw ? 'vs last week (' + Math.round(lw.v) + '/' + Math.round(lwd.v) + ')' : 'no comparison yet') + '</div></div>';
    html += '<div class="stat">' + trendHtml(slopePerWeek(daily(list, 's').filter(function(p){ return p.x >= today - 27; })), 'mmHg', 1, 1) + '</div>';
    html += '</div>';
    sum.innerHTML = html;
    var inWin = list.filter(function(r){ return dayIdx(r.d) >= today - 55; });
    var vals = []; inWin.forEach(function(r){ vals.push(r.s, r.di); });
    var ymin = Math.min(60, Math.floor((Math.min.apply(null, vals) - 5) / 10) * 10), ymax = Math.max(160, Math.ceil((Math.max.apply(null, vals) + 5) / 10) * 10);
    wrap.hidden = false;
    drawChart($('bp-chart'), {
      ymin: ymin, ymax: ymax, ystep: 20, fmt: function(v){ return v; },
      refs: [{ y: 130, label: '130 systolic' }, { y: 80, label: '80 diastolic' }],
      series: [
        { cls: 'pt', lcls: 'avg', line: rolling(list, 's', today), pts: inWin.map(function(r){ return { x: dayIdx(r.d) + (r.t ? (+r.t.split(':')[0]) / 24 : 0.5), y: r.s, label: fmtDay(r.d) + (r.t ? ' ' + fmtTime(r.t) : '') + ' · ' + r.s + '/' + r.di + (r.p ? ' · pulse ' + r.p : '') }; }) },
        { cls: 'pt2', lcls: 'avg2', line: rolling(list, 'di', today), pts: inWin.map(function(r){ return { x: dayIdx(r.d) + (r.t ? (+r.t.split(':')[0]) / 24 : 0.5), y: r.di, label: fmtDay(r.d) + (r.t ? ' ' + fmtTime(r.t) : '') + ' · ' + r.s + '/' + r.di + (r.p ? ' · pulse ' + r.p : '') }; }) }
      ]
    });
    var wk = weekly(list, ['s', 'di', 'p']), t = '<table class="weeks"><thead><tr><th>Week</th><th class="n">Average</th><th class="n">Pulse</th><th class="n">Readings</th></tr></thead><tbody>';
    wk.forEach(function(w){ t += '<tr><td>' + weekLabel(w.w) + '</td><td class="n">' + Math.round(w.avg.s) + '/' + Math.round(w.avg.di) + '</td><td class="n">' + (w.avg.p !== null ? Math.round(w.avg.p) : '—') + '</td><td class="n">' + w.n + '</td></tr>'; });
    $('bp-weeks').innerHTML = t + '</tbody></table>';
    var li = '<ul class="entries">';
    list.slice().reverse().slice(0, 14).forEach(function(r){ li += '<li><span>' + esc(fmtDay(r.d)) + ' <span class="m">' + esc(fmtTime(r.t)) + '</span> · <b>' + r.s + '/' + r.di + '</b>' + (r.p ? ' <span class="m">pulse ' + r.p + '</span>' : '') + '</span><button type="button" class="x" data-del="bp" data-id="' + esc(r.id) + '" aria-label="Delete reading">×</button></li>'; });
    $('bp-list').innerHTML = li + '</ul>';
  }

  /* ---------- blood sugar ---------- */
  var CTX = { fast: 'fasting', pre: 'before a meal', post: 'after a meal', bed: 'bedtime' };
  function gfmt(v){ return state.unit === 'mgdl' ? String(Math.round(v * MGDL)) : (Math.round(v * 10) / 10).toFixed(1); }
  function gunit(){ return state.unit === 'mgdl' ? 'mg/dL' : 'mmol/L'; }
  function renderGL(){
    var list = readingsOf('gl'), today = dayIdx(todayStr()), sum = $('gl-summary'), wrap = $('gl-chartwrap');
    $('u-mmol').setAttribute('aria-pressed', state.unit === 'mmol' ? 'true' : 'false');
    $('u-mgdl').setAttribute('aria-pressed', state.unit === 'mgdl' ? 'true' : 'false');
    $('gl-vl').textContent = 'Reading (' + gunit() + ')';
    $('gl-v').step = state.unit === 'mgdl' ? '1' : '0.1'; $('gl-v').placeholder = state.unit === 'mgdl' ? '100' : '5.6';
    $('gl-v').max = state.unit === 'mgdl' ? '700' : '40'; $('gl-v').min = state.unit === 'mgdl' ? '20' : '1';
    if (!list.length){
      sum.innerHTML = '<p class="empty">No readings yet. Add the first one above.</p>';
      wrap.hidden = true; $('gl-weeks').innerHTML = ''; $('gl-list').innerHTML = '<p class="empty">Nothing logged yet.</p>'; return;
    }
    var fl = list.map(function(r){ return { d: r.d, v: r.v, fv: r.c === 'fast' ? r.v : undefined }; });
    var tw = meanIn(fl, 'v', today - 6, today), tf = meanIn(fl, 'fv', today - 6, today), lw = meanIn(fl, 'v', today - 13, today - 7);
    var html = '<div class="summ">';
    html += '<div class="stat"><div class="num">' + (tw ? gfmt(tw.v) : '—') + '</div><div class="lbl">' + (tw ? gunit() + ' average of ' + tw.n + ' reading' + (tw.n > 1 ? 's' : '') + ' this week' + (tf ? ' · fasting ' + gfmt(tf.v) : '') : 'no readings in the last 7 days') + '</div></div>';
    var dlt = tw && lw ? tw.v - lw.v : null;
    html += '<div class="stat"><div class="num">' + (dlt !== null ? (dlt > 0 ? '+' : (dlt < 0 ? '−' : '')) + gfmt(Math.abs(dlt)) : '—') + '</div><div class="lbl">' + (dlt !== null ? 'vs last week (' + gfmt(lw.v) + ')' : 'no comparison yet') + '</div></div>';
    var sl = slopePerWeek(daily(fl, 'v').filter(function(p){ return p.x >= today - 27; }));
    html += '<div class="stat">' + trendHtml(sl === null ? null : (state.unit === 'mgdl' ? sl * MGDL : sl), gunit(), state.unit === 'mgdl' ? 2 : 0.1, state.unit === 'mgdl' ? 0 : 1) + '</div>';
    html += '</div>';
    sum.innerHTML = html;
    var k = state.unit === 'mgdl' ? MGDL : 1;
    var inWin = list.filter(function(r){ return dayIdx(r.d) >= today - 55; });
    var vals = inWin.map(function(r){ return r.v * k; });
    var step = state.unit === 'mgdl' ? 40 : 2;
    var ymin = Math.min(state.unit === 'mgdl' ? 40 : 2, Math.floor((Math.min.apply(null, vals) - step / 4) / step) * step), ymax = Math.max(state.unit === 'mgdl' ? 200 : 12, Math.ceil((Math.max.apply(null, vals) + step / 4) / step) * step);
    wrap.hidden = false;
    drawChart($('gl-chart'), {
      ymin: ymin, ymax: ymax, ystep: step, fmt: function(v){ return v; },
      refs: [{ y: 7 * k, label: 'fasting ' + gfmt(7) + ' ' + gunit() }],
      series: [{ cls: 'pt', lcls: 'avg', line: rolling(fl, 'v', today).map(function(p){ return { x: p.x, y: p.y * k }; }),
        pts: inWin.map(function(r){ return { x: dayIdx(r.d) + (r.t ? (+r.t.split(':')[0]) / 24 : 0.5), y: r.v * k, hollow: r.c !== 'fast', label: fmtDay(r.d) + (r.t ? ' ' + fmtTime(r.t) : '') + ' · ' + gfmt(r.v) + ' ' + gunit() + ' · ' + CTX[r.c] }; }) }]
    });
    var wk = weekly(fl, ['v', 'fv']), t = '<table class="weeks"><thead><tr><th>Week</th><th class="n">Average</th><th class="n">Fasting</th><th class="n">Readings</th></tr></thead><tbody>';
    wk.forEach(function(w){ t += '<tr><td>' + weekLabel(w.w) + '</td><td class="n">' + gfmt(w.avg.v) + '</td><td class="n">' + (w.avg.fv !== null ? gfmt(w.avg.fv) : '—') + '</td><td class="n">' + w.n + '</td></tr>'; });
    $('gl-weeks').innerHTML = t + '</tbody></table>';
    var li = '<ul class="entries">';
    list.slice().reverse().slice(0, 14).forEach(function(r){ li += '<li><span>' + esc(fmtDay(r.d)) + ' <span class="m">' + esc(fmtTime(r.t)) + '</span> · <b>' + gfmt(r.v) + '</b> <span class="m">' + CTX[r.c] + '</span></span><button type="button" class="x" data-del="gl" data-id="' + esc(r.id) + '" aria-label="Delete reading">×</button></li>'; });
    $('gl-list').innerHTML = li + '</ul>';
  }

  /* ---------- weight ---------- */
  function wfmt(kg){ return state.wunit === 'lb' ? (Math.round(kg * LB * 10) / 10).toFixed(1) : (Math.round(kg * 10) / 10).toFixed(1); }
  function wunit(){ return state.wunit; }
  function renderWT(){
    var list = readingsOf('wt'), today = dayIdx(todayStr()), sum = $('wt-summary'), wrap = $('wt-chartwrap');
    $('w-kg').setAttribute('aria-pressed', state.wunit === 'kg' ? 'true' : 'false');
    $('w-lb').setAttribute('aria-pressed', state.wunit === 'lb' ? 'true' : 'false');
    $('wt-vl').textContent = 'Weight (' + wunit() + ')';
    $('wt-v').placeholder = state.wunit === 'lb' ? '203.6' : '92.4'; $('wt-v').min = state.wunit === 'lb' ? '44' : '20'; $('wt-v').max = state.wunit === 'lb' ? '880' : '400';
    if (!list.length){
      sum.innerHTML = '<p class="empty">No weigh-ins yet. Add the first one above.</p>';
      wrap.hidden = true; $('wt-weeks').innerHTML = ''; $('wt-list').innerHTML = '<p class="empty">Nothing logged yet.</p>'; return;
    }
    var k = state.wunit === 'lb' ? LB : 1;
    var tw = meanIn(list, 'kg', today - 6, today), lw = meanIn(list, 'kg', today - 13, today - 7);
    var first = dayIdx(list[0].d), start = meanIn(list, 'kg', first, first + 6), lastD = dayIdx(list[list.length - 1].d), now = meanIn(list, 'kg', lastD - 6, lastD);
    var since = (start && now && lastD - first >= 7) ? (now.v - start.v) : null;
    var html = '<div class="summ four">';
    html += '<div class="stat"><div class="num">' + (tw ? wfmt(tw.v) : '—') + '</div><div class="lbl">' + (tw ? wunit() + ' average of ' + tw.n + ' weigh-in' + (tw.n > 1 ? 's' : '') + ' this week' : 'no weigh-ins in the last 7 days') + '</div></div>';
    var d = tw && lw ? tw.v - lw.v : null;
    html += '<div class="stat"><div class="num">' + (d !== null ? (d > 0 ? '+' : (d < 0 ? '−' : '')) + wfmt(Math.abs(d)) : '—') + '</div><div class="lbl">' + (d !== null ? wunit() + ' vs last week (' + wfmt(lw.v) + ')' : 'no comparison yet') + '</div></div>';
    html += '<div class="stat"><div class="num">' + (since !== null ? (since > 0 ? '+' : (since < 0 ? '−' : '')) + (Math.abs(since) / start.v * 100).toFixed(1) + '%' : '—') + '</div><div class="lbl">' + (since !== null ? 'since your first week (' + (since > 0 ? '+' : (since < 0 ? '−' : '')) + wfmt(Math.abs(since)) + ' ' + wunit() + ' from ' + wfmt(start.v) + ')' : 'percent change appears after a week of entries') + '</div></div>';
    var sl = slopePerWeek(daily(list, 'kg').filter(function(p){ return p.x >= today - 27; }));
    html += '<div class="stat">' + trendHtml(sl === null ? null : sl * k, wunit(), state.wunit === 'lb' ? 0.5 : 0.25, state.wunit === 'lb' ? 1 : 2) + '</div>';
    html += '</div>';
    sum.innerHTML = html;
    var inWin = list.filter(function(r){ return dayIdx(r.d) >= today - 55; });
    var vals = inWin.map(function(r){ return r.kg * k; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), span = Math.max(mx - mn, k * 4);
    var step = niceStepW(span / 4);
    var ymin = Math.floor((mn - span * 0.15) / step) * step, ymax = Math.ceil((mx + span * 0.15) / step) * step;
    wrap.hidden = false;
    drawChart($('wt-chart'), {
      ymin: ymin, ymax: ymax, ystep: step, fmt: function(v){ return Math.round(v * 10) / 10; }, refs: [],
      series: [{ cls: 'pt', lcls: 'avg', line: rolling(list, 'kg', today).map(function(p){ return { x: p.x, y: p.y * k }; }),
        pts: inWin.map(function(r){ return { x: dayIdx(r.d) + (r.t ? (+r.t.split(':')[0]) / 24 : 0.5), y: r.kg * k, label: fmtDay(r.d) + (r.t ? ' ' + fmtTime(r.t) : '') + ' · ' + wfmt(r.kg) + ' ' + wunit() }; }) }]
    });
    var wk = weekly(list, ['kg']), t = '<table class="weeks"><thead><tr><th>Week</th><th class="n">Average</th><th class="n">Change</th><th class="n">Weigh-ins</th></tr></thead><tbody>';
    wk.forEach(function(w, i){ var prev = wk[i + 1], ch = prev ? w.avg.kg - prev.avg.kg : null; t += '<tr><td>' + weekLabel(w.w) + '</td><td class="n">' + wfmt(w.avg.kg) + '</td><td class="n">' + (ch !== null ? (ch > 0 ? '+' : (ch < 0 ? '−' : '')) + wfmt(Math.abs(ch)) : '—') + '</td><td class="n">' + w.n + '</td></tr>'; });
    $('wt-weeks').innerHTML = t + '</tbody></table>';
    var li = '<ul class="entries">';
    list.slice().reverse().slice(0, 14).forEach(function(r){ li += '<li><span>' + esc(fmtDay(r.d)) + ' <span class="m">' + esc(fmtTime(r.t)) + '</span> · <b>' + wfmt(r.kg) + ' ' + wunit() + '</b></span><button type="button" class="x" data-del="wt" data-id="' + esc(r.id) + '" aria-label="Delete weigh-in">×</button></li>'; });
    $('wt-list').innerHTML = li + '</ul>';
  }
  function niceStepW(x){ var c = [0.5, 1, 2, 5, 10, 20]; for (var i = 0; i < c.length; i++) if (c[i] >= x) return c[i]; return 20; }

  /* ---------- heart rate ---------- */
  function renderHR(){
    var list = readingsOf('hr'), today = dayIdx(todayStr()), sum = $('hr-summary'), wrap = $('hr-chartwrap');
    if (!list.length){
      sum.innerHTML = '<p class="empty">No readings yet. Add one above or import from Apple Health.</p>';
      wrap.hidden = true; $('hr-weeks').innerHTML = ''; $('hr-list').innerHTML = '<p class="empty">Nothing logged yet.</p>'; return;
    }
    var tw = meanIn(list, 'bpm', today - 6, today), lw = meanIn(list, 'bpm', today - 13, today - 7);
    var first = dayIdx(list[0].d), start = meanIn(list, 'bpm', first, first + 6), lastD = dayIdx(list[list.length - 1].d), now = meanIn(list, 'bpm', lastD - 6, lastD);
    var since = (start && now && lastD - first >= 7) ? (now.v - start.v) : null;
    var html = '<div class="summ four">';
    html += '<div class="stat"><div class="num">' + (tw ? Math.round(tw.v) : '—') + '</div><div class="lbl">' + (tw ? 'bpm average of ' + tw.n + ' day' + (tw.n > 1 ? 's' : '') + ' this week' : 'no readings in the last 7 days') + '</div></div>';
    var d = tw && lw ? tw.v - lw.v : null;
    html += '<div class="stat"><div class="num">' + (d !== null ? (Math.round(d) > 0 ? '+' : (Math.round(d) < 0 ? '−' : '')) + Math.abs(Math.round(d)) : '—') + '</div><div class="lbl">' + (d !== null ? 'bpm vs last week (' + Math.round(lw.v) + ')' : 'no comparison yet') + '</div></div>';
    html += '<div class="stat"><div class="num">' + (since !== null ? (Math.round(since) > 0 ? '+' : (Math.round(since) < 0 ? '−' : '')) + Math.abs(Math.round(since)) : '—') + '</div><div class="lbl">' + (since !== null ? 'bpm since your first week (' + Math.round(start.v) + ')' : 'change appears after a week of readings') + '</div></div>';
    html += '<div class="stat">' + trendHtml(slopePerWeek(daily(list, 'bpm').filter(function(p){ return p.x >= today - 27; })), 'bpm', 1, 1) + '</div>';
    html += '</div>';
    sum.innerHTML = html;
    var inWin = list.filter(function(r){ return dayIdx(r.d) >= today - 55; });
    var vals = inWin.map(function(r){ return r.bpm; });
    var ymin = Math.min(40, Math.floor((Math.min.apply(null, vals) - 5) / 10) * 10), ymax = Math.max(100, Math.ceil((Math.max.apply(null, vals) + 5) / 10) * 10);
    wrap.hidden = false;
    drawChart($('hr-chart'), {
      ymin: ymin, ymax: ymax, ystep: ymax - ymin > 80 ? 20 : 10, fmt: function(v){ return v; }, refs: [{ y: 100, label: '100 bpm' }],
      series: [{ cls: 'pt', lcls: 'avg', line: rolling(list, 'bpm', today), pts: inWin.map(function(r){ return { x: dayIdx(r.d) + 0.5, y: r.bpm, hollow: r.src !== 'watch', label: fmtDay(r.d) + ' · ' + r.bpm + ' bpm' + (r.src === 'watch' ? ' · Apple Watch' : (r.src === 'avg' ? ' · daily average' : '')) }; }) }]
    });
    var wk = weekly(list, ['bpm']), t = '<table class="weeks"><thead><tr><th>Week</th><th class="n">Average</th><th class="n">Low · high</th><th class="n">Days</th></tr></thead><tbody>';
    wk.forEach(function(w){ var rows = list.filter(function(r){ return weekStart(r.d) === w.w; }), lo = Math.min.apply(null, rows.map(function(r){ return r.bpm; })), hi = Math.max.apply(null, rows.map(function(r){ return r.bpm; })); t += '<tr><td>' + weekLabel(w.w) + '</td><td class="n">' + Math.round(w.avg.bpm) + '</td><td class="n">' + lo + ' · ' + hi + '</td><td class="n">' + w.n + '</td></tr>'; });
    $('hr-weeks').innerHTML = t + '</tbody></table>';
    var li = '<ul class="entries">';
    list.slice().reverse().slice(0, 14).forEach(function(r){ li += '<li><span>' + esc(fmtDay(r.d)) + ' · <b>' + r.bpm + ' bpm</b>' + (r.src === 'watch' ? '<span class="src">Watch</span>' : (r.src === 'avg' ? '<span class="src">avg</span>' : '')) + '</span><button type="button" class="x" data-del="hr" data-id="' + esc(r.id) + '" aria-label="Delete reading">×</button></li>'; });
    $('hr-list').innerHTML = li + '</ul>';
  }
  function hrUpsert(entries){   // entries: [{d, bpm, src}] -> one per day, imports replace same-day imports
    var byDay = {}; state.hr.forEach(function(r){ byDay[r.d] = r; });
    var added = 0;
    entries.forEach(function(e){
      if (!(e.bpm >= 25 && e.bpm <= 250)) return;
      var cur = byDay[e.d];
      if (cur && cur.src === 'manual' && e.src !== 'manual') return;   // a hand-entered value wins
      byDay[e.d] = { id: cur ? cur.id : uid(), d: e.d, bpm: Math.round(e.bpm), src: e.src };
      added++;
    });
    state.hr = Object.keys(byDay).sort().map(function(k){ return byDay[k]; });
    if (state.hr.length > 1100) state.hr = state.hr.slice(state.hr.length - 1100);
    return added;
  }
  function importStatus(msg){ $('hr-import-status').textContent = msg; }
  function parseHrText(text){
    var resting = [], samples = {};
    var reRest = /HKQuantityTypeIdentifierRestingHeartRate[^>\n]*?startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>\n]*?value="([\d.]+)"/g, m;
    while ((m = reRest.exec(text))) resting.push({ d: m[1], bpm: parseFloat(m[2]) });
    if (resting.length) return { resting: resting };
    var reHr = /HKQuantityTypeIdentifierHeartRate"[^>\n]*?startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>\n]*?value="([\d.]+)"/g;
    while ((m = reHr.exec(text))){ var g = samples[m[1]] = samples[m[1]] || { s: 0, n: 0 }; g.s += parseFloat(m[2]); g.n++; }
    if (Object.keys(samples).length) return { samples: samples };
    return null;
  }
  function parseCsv(text){
    var out = [], lines = text.split(/\r?\n/), restingOnly = /resting/i.test(text), samples = {};
    lines.forEach(function(line){
      if (!line.trim()) return;
      var low = line.toLowerCase();
      if (/variability|walking|respiratory|vo2|oxygen|step/.test(low)) return;
      if (restingOnly && !/resting/.test(low) && /heart/.test(low)) return;
      var dm = line.match(/(\d{4})-(\d{2})-(\d{2})/) || line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) || line.match(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})/i);
      if (!dm) return;
      var d;
      if (dm[0].indexOf('-') > 0 && dm[1].length === 4) d = dm[1] + '-' + dm[2] + '-' + dm[3];
      else if (dm[0].indexOf('/') > 0) d = dm[3] + '-' + pad(+dm[1]) + '-' + pad(+dm[2]);
      else { var mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(dm[2].slice(0,3).toLowerCase()); d = dm[3] + '-' + pad(mi + 1) + '-' + pad(+dm[1]); }
      var rest = line.replace(dm[0], ' ').replace(/\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?/ig, ' ').replace(/[+-]\d{4}/g, ' ');
      var nums = (rest.match(/(?:^|[^\d.])(\d{2,3}(?:\.\d+)?)(?![\d])/g) || []).map(function(x){ return parseFloat(x.replace(/[^\d.]/g, '')); }).filter(function(v){ return v >= 25 && v <= 250; });
      if (!nums.length) return;
      if (restingOnly || !/heart/.test(low)) out.push({ d: d, bpm: nums[0] });
      else { var g = samples[d] = samples[d] || { s: 0, n: 0 }; g.s += nums[0]; g.n++; }
    });
    if (out.length) return { resting: out };
    if (Object.keys(samples).length) return { samples: samples };
    return null;
  }
  function finishImport(res){
    var entries = [];
    if (res && res.resting){ var byDay = {}; res.resting.forEach(function(r){ byDay[r.d] = r.bpm; }); Object.keys(byDay).forEach(function(d){ entries.push({ d: d, bpm: byDay[d], src: 'watch' }); }); }
    else if (res && res.samples){ Object.keys(res.samples).forEach(function(d){ entries.push({ d: d, bpm: res.samples[d].s / res.samples[d].n, src: 'avg' }); }); }
    if (!entries.length){ importStatus('No heart-rate records found in that file.'); return; }
    var n = hrUpsert(entries);
    importStatus('Imported ' + n + ' day' + (n === 1 ? '' : 's') + (res.resting ? ' of resting heart rate from Apple Health.' : ' of daily average heart rate (no resting-rate records were in the file).'));
    commit();
  }
  function scanBlob(blob, done){
    var CH = 4 * 1024 * 1024, pos = 0, carry = '', resting = [], samples = {}, any = false;
    function step(){
      if (pos >= blob.size){ if (resting.length) return done({ resting: resting }); if (Object.keys(samples).length) return done({ samples: samples }); return done(null); }
      var slice = blob.slice(pos, Math.min(blob.size, pos + CH));
      var fr = new FileReader();
      fr.onload = function(){
        var text = carry + fr.result, cut = text.lastIndexOf('\n'); if (cut < 0) cut = text.length;
        var head = text.slice(0, cut); carry = text.slice(cut);
        var res = parseHrText(head);
        if (res && res.resting) resting = resting.concat(res.resting);
        else if (res && res.samples) Object.keys(res.samples).forEach(function(d){ var g = samples[d] = samples[d] || { s: 0, n: 0 }; g.s += res.samples[d].s; g.n += res.samples[d].n; });
        pos += CH; importStatus('Reading… ' + Math.min(100, Math.round(pos / blob.size * 100)) + '%');
        setTimeout(step, 0);
      };
      fr.onerror = function(){ done(null); };
      fr.readAsText(slice);
    }
    step();
  }
  $('hr-file').addEventListener('change', function(){
    var f = this.files && this.files[0]; if (!f) return;
    var name = (f.name || '').toLowerCase();
    importStatus('Reading ' + f.name + '…');
    if (name.slice(-4) === '.zip'){
      if (!window.JSZip){ importStatus('The zip reader did not load; unzip the export and choose export.xml instead.'); return; }
      window.JSZip.loadAsync(f).then(function(zip){
        var entry = null; zip.forEach(function(path, file){ if (!entry && /export\.xml$/i.test(path)) entry = file; });
        if (!entry){ importStatus('No export.xml inside that zip.'); return; }
        return entry.async('blob').then(function(blob){ scanBlob(blob, finishImport); });
      }).catch(function(){ importStatus('Could not read that zip. Try unzipping it and choosing export.xml.'); });
    } else if (name.slice(-4) === '.xml'){
      scanBlob(f, finishImport);
    } else {
      var fr = new FileReader();
      fr.onload = function(){ var t = fr.result; finishImport(t.indexOf('<Record') >= 0 ? parseHrText(t) : parseCsv(t)); };
      fr.onerror = function(){ importStatus('Could not read that file.'); };
      fr.readAsText(f);
    }
    this.value = '';
  });

  function renderAll(){ renderBP(); renderGL(); renderWT(); renderHR(); }

  /* ---------- input ---------- */
  function freshDates(){ ['bp', 'gl', 'wt', 'hr'].forEach(function(k){ var d = $(k + '-date'), t = $(k + '-time'); if (d && !d.value) d.value = todayStr(); if (t && !t.value) t.value = nowStr(); }); }
  $('bp-form').addEventListener('submit', function(e){
    e.preventDefault();
    var s = parseFloat($('bp-s').value), d = parseFloat($('bp-d').value), p = parseFloat($('bp-p').value), err = $('bp-err');
    if (!(s >= 60 && s <= 260) || !(d >= 30 && d <= 160)){ err.textContent = 'Enter a systolic between 60 and 260 and a diastolic between 30 and 160.'; return; }
    if (d >= s){ err.textContent = 'Diastolic (the lower number) must be below systolic.'; return; }
    err.textContent = '';
    var rec = { id: uid(), d: $('bp-date').value || todayStr(), t: $('bp-time').value || nowStr(), s: Math.round(s), di: Math.round(d) };
    if (p >= 30 && p <= 220) rec.p = Math.round(p);
    state.bp.push(rec); if (state.bp.length > 4000) state.bp.splice(0, state.bp.length - 4000);
    $('bp-s').value = ''; $('bp-d').value = ''; $('bp-p').value = ''; $('bp-time').value = nowStr(); $('bp-date').value = todayStr();
    commit();
  });
  $('gl-form').addEventListener('submit', function(e){
    e.preventDefault();
    var raw = parseFloat($('gl-v').value), err = $('gl-err');
    var v = state.unit === 'mgdl' ? raw / MGDL : raw;
    if (!(v >= 1 && v <= 40)){ err.textContent = 'Enter a reading between ' + (state.unit === 'mgdl' ? '20 and 700 mg/dL' : '1.0 and 40.0 mmol/L') + '.'; return; }
    err.textContent = '';
    state.gl.push({ id: uid(), d: $('gl-date').value || todayStr(), t: $('gl-time').value || nowStr(), v: Math.round(v * 100) / 100, c: $('gl-c').value });
    if (state.gl.length > 4000) state.gl.splice(0, state.gl.length - 4000);
    $('gl-v').value = ''; $('gl-time').value = nowStr(); $('gl-date').value = todayStr();
    commit();
  });
  $('wt-form').addEventListener('submit', function(e){
    e.preventDefault();
    var raw = parseFloat($('wt-v').value), err = $('wt-err');
    var kg = state.wunit === 'lb' ? raw / LB : raw;
    if (!(kg >= 20 && kg <= 400)){ err.textContent = 'Enter a weight between ' + (state.wunit === 'lb' ? '44 and 880 lb' : '20 and 400 kg') + '.'; return; }
    err.textContent = '';
    state.wt.push({ id: uid(), d: $('wt-date').value || todayStr(), t: $('wt-time').value || nowStr(), kg: Math.round(kg * 100) / 100 });
    if (state.wt.length > 4000) state.wt.splice(0, state.wt.length - 4000);
    $('wt-v').value = ''; $('wt-time').value = nowStr(); $('wt-date').value = todayStr();
    commit();
  });
  [$('w-kg'), $('w-lb')].forEach(function(b){ b.addEventListener('click', function(){ state.wunit = b.getAttribute('data-wunit'); commit(); }); });
  $('hr-form').addEventListener('submit', function(e){
    e.preventDefault();
    var v = parseFloat($('hr-v').value), err = $('hr-err');
    if (!(v >= 25 && v <= 250)){ err.textContent = 'Enter a resting heart rate between 25 and 250.'; return; }
    err.textContent = '';
    hrUpsert([{ d: $('hr-date').value || todayStr(), bpm: v, src: 'manual' }]);
    $('hr-v').value = ''; $('hr-date').value = todayStr();
    commit();
  });
  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-del]') : null;
    var armed = document.querySelector('.entries .x.armed');
    if (armed && armed !== b){ armed.classList.remove('armed'); armed.textContent = '×'; }
    if (!b) return;
    if (!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent = 'Delete?'; return; }
    var kind = b.getAttribute('data-del'), id = b.getAttribute('data-id');
    state[kind] = state[kind].filter(function(r){ return r.id !== id; });
    commit();
  });
  [$('u-mmol'), $('u-mgdl')].forEach(function(b){ b.addEventListener('click', function(){ state.unit = b.getAttribute('data-unit'); commit(); }); });

  var ro = window.ResizeObserver ? new ResizeObserver(function(){ renderAll(); }) : null;
  if (ro){ ro.observe($('bp-chart')); } else { window.addEventListener('resize', renderAll); }
  [$('bp-chart'), $('gl-chart'), $('wt-chart'), $('hr-chart')].forEach(wireHover);

  window.mpWeights = function(){ return { unit: state.wunit, list: state.wt.slice().sort(function(a, b){ return (a.d + (a.t || '')).localeCompare(b.d + (b.t || '')); }).map(function(r){ return { d: r.d, t: r.t, kg: r.kg, src: r.src || '' }; }) }; };
  /* the dose check-in (Dosing → Add a dose) logs the weigh-in here, so the Vitals chart and the plateau rule see one record; one check-in weight per day */
  window.mpAddWeight = function(kg, d, t){ kg = +kg; if (!(kg >= 20 && kg <= 400)) return false; d = /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : todayStr(); t = /^\d{2}:\d{2}$/.test(t || '') ? t : nowStr();
    var at = -1; state.wt.forEach(function(r, i){ if (r.d === d && r.src === 'dose') at = i; });
    var rec = { id: at >= 0 ? state.wt[at].id : uid(), d: d, t: t, kg: Math.round(kg * 100) / 100, src: 'dose' };
    if (at >= 0) state.wt[at] = rec; else state.wt.push(rec);
    if (state.wt.length > 4000) state.wt.splice(0, state.wt.length - 4000);
    commit(); return true; };
  window.mpWeightUnit = function(){ return state.wunit; };
  window.mpSetWeightUnit = function(u){ var nu = u === 'lb' ? 'lb' : 'kg'; if (nu !== state.wunit){ state.wunit = nu; commit(); } };
  loadLocal(); freshDates(); renderAll(); initDb();
})();