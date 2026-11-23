/* ===== Live levels: the blood-level curve built from the doses the user actually logged (vial tracker), same one-compartment model as the Levels tab. ===== */
(function(){
  'use strict';
  var DAY = 86400000;
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function solveKa(ke, tm){ var lo = ke * 1.0001, hi = 500; for (var i = 0; i < 80; i++){ var mid = (lo + hi) / 2, f = Math.log(mid / ke) / (mid - ke); if (f > tm) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  function fmtDay(d){ return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
  function fmtShort(d){ return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function mg(x){ return (Math.abs(x) < 1 ? x.toFixed(2) : x.toFixed(1)).replace(/\.0$/, '') + ' mg'; }
  function ago(days){ if (days < 1) return 'today'; var n = Math.round(days); return n === 1 ? 'yesterday' : n + ' days ago'; }

  function model(pk){
    var KE = Math.LN2 / pk.half, tmax = Math.min(pk.tmax || 1, 0.8 / KE), KA = solveKa(KE, tmax);
    return {
      ke: KE, ka: KA,
      single: function(D, t){ return t <= 0 ? 0 : D * (KA / (KA - KE)) * (Math.exp(-KE * t) - Math.exp(-KA * t)); },
      avgSS: function(D, tau){ return D / (KE * tau); }
    };
  }

  /* one series per peptide that has logged doses and PK data */
  function series(){
    var vials = (window.vlVials ? window.vlVials() : []) || [], by = {};
    vials.forEach(function(v){
      (v.doses || []).forEach(function(d){ var t = new Date(d.t); if (!isFinite(t) || !(+d.mg > 0)) return;
        var s = by[v.name] || (by[v.name] = { name: v.name, doses: [], vials: [] }); s.doses.push({ t: t, mg: +d.mg, vial: v.id }); if (s.vials.indexOf(v) < 0) s.vials.push(v); });
    });
    var out = [];
    Object.keys(by).forEach(function(n){
      var s = by[n]; s.doses.sort(function(a, b){ return a.t - b.t; });
      var P = (window.PEPTIDES || []).filter(function(p){ return p.name === n; })[0];
      s.pk = P && ((P.levels && P.levels.pk) || P.pk) || null; s.pid = P ? P.id : null;
      var planned = s.vials.filter(function(v){ return v.status === 'active' && v.planned_mg; }).sort(function(a, b){ return (b.mixed_on || '') < (a.mixed_on || '') ? -1 : 1; })[0] || s.vials.filter(function(v){ return v.planned_mg; })[0];
      s.planD = planned ? planned.planned_mg : s.doses[s.doses.length - 1].mg;
      s.perWeek = planned && planned.per_week > 0 ? planned.per_week : 1;
      s.tau = 7 / s.perWeek;
      out.push(s);
    });
    out.sort(function(a, b){ return b.doses[b.doses.length - 1].t - a.doses[a.doses.length - 1].t; });
    return out;
  }

  function compute(s){
    var M = model(s.pk), now = new Date(), nowD = now.getTime() / DAY, ref = M.avgSS(s.planD, s.tau);
    var last = s.doses[s.doses.length - 1], lastD = last.t.getTime() / DAY;
    var start = Math.max(s.doses[0].t.getTime() / DAY - 0.5, nowD - 70), end = nowD + 14;
    var future = []; for (var k = 1; k <= 6; k++){ var td = lastD + k * s.tau; if (td > end) break; if (td > nowD) future.push({ d: td, mg: s.planD }); }
    function level(td){ var c = 0; s.doses.forEach(function(d){ c += M.single(d.mg, td - d.t.getTime() / DAY); }); future.forEach(function(f){ c += M.single(f.mg, td - f.d); }); return c; }
    var pts = [], step = (end - start) / 480, peakAfter = 0;
    for (var td = start; td <= end + 1e-9; td += step){ var c = level(td); pts.push({ d: td, pct: 100 * c / ref }); if (td > nowD && 100 * c / ref > peakAfter) peakAfter = 100 * c / ref; }
    var nowC = level(nowD), pctNow = 100 * nowC / ref;
    var sinceLast = nowD - lastD, nextDue = new Date((lastD + s.tau) * DAY);
    // settled = the trailing run of doses at the plan amount has lasted five half-lives (a dose change restarts the climb)
    var runStart = lastD; for (var i = s.doses.length - 1; i >= 0; i--){ if (Math.abs(s.doses[i].mg - s.planD) > 0.1 * s.planD) break; runStart = s.doses[i].t.getTime() / DAY; }
    var settled = (nowD - runStart) >= 5 * s.pk.half;
    return { pts: pts, nowD: nowD, start: start, end: end, ref: ref, pctNow: pctNow, mgNow: nowC, peakAfter: peakAfter, sinceLast: sinceLast, nextDue: nextDue, overdue: nowD - lastD > s.tau + 0.5, future: future, settled: settled, weeksToSettle: Math.max(0, Math.ceil((runStart + 5 * s.pk.half - nowD) / 7)) };
  }

  function chart(s, r){
    var W = 640, H = 270, L = 44, R = 14, T = 16, B = 44, w = W - L - R, h = H - T - B;
    var ymax = Math.max(150, Math.ceil(Math.max.apply(null, r.pts.map(function(p){ return p.pct; })) / 25) * 25 + 10);
    var X = function(d){ return L + (d - r.start) / (r.end - r.start) * w; }, Y = function(p){ return T + h - Math.min(p, ymax) / ymax * h; };
    var past = '', fut = '';
    r.pts.forEach(function(p){ var seg = (p.d <= r.nowD ? 'P' : 'F'), cmd = (X(p.d).toFixed(1) + ',' + Y(p.pct).toFixed(1)); if (seg === 'P') past += (past ? ' L' : 'M') + cmd; else fut += (fut ? ' L' : 'M') + cmd; });
    if (fut) fut = 'M' + X(r.nowD).toFixed(1) + ',' + Y(r.pctNow).toFixed(1) + ' L' + fut.slice(1);
    var grid = ''; [25, 50, 75, 100, 125, 150].forEach(function(g){ if (g > ymax) return; grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(g).toFixed(1) + '" y2="' + Y(g).toFixed(1) + '" class="' + (g === 100 ? 'lv-ref' : 'lv-grid') + '"/><text x="' + (L - 6) + '" y="' + (Y(g) + 4).toFixed(1) + '" class="lv-ax" text-anchor="end">' + g + (g === 100 ? '%' : '') + '</text>'; });
    var xt = ''; var first = new Date(r.start * DAY); first.setHours(0, 0, 0, 0); var d0 = first.getTime() / DAY; var span = r.end - r.start, every = span > 60 ? 14 : 7;
    for (var td = d0; td <= r.end; td += every){ if (td < r.start) continue; xt += '<text x="' + X(td).toFixed(1) + '" y="' + (H - 22) + '" class="lv-ax" text-anchor="middle">' + fmtShort(new Date(td * DAY)) + '</text>'; }
    var ticks = ''; s.doses.forEach(function(d){ var td = d.t.getTime() / DAY; if (td < r.start) return; ticks += '<rect x="' + (X(td) - 1.5).toFixed(1) + '" y="' + (T + h - 10) + '" width="3" height="10" class="lv-tick"/>'; });
    r.future.forEach(function(f){ ticks += '<rect x="' + (X(f.d) - 1.5).toFixed(1) + '" y="' + (T + h - 10) + '" width="3" height="10" class="lv-tick fut"/>'; });
    var nowX = X(r.nowD).toFixed(1);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="lv-svg" role="img" aria-label="Estimated blood level over time">' + grid +
      '<path d="' + past + ' L' + X(r.nowD).toFixed(1) + ',' + (T + h) + ' L' + X(r.start).toFixed(1) + ',' + (T + h) + ' Z" class="lv-fill"/>' +
      '<path d="' + past + '" class="lv-line"/>' + (fut ? '<path d="' + fut + '" class="lv-line fut"/>' : '') +
      '<line x1="' + nowX + '" x2="' + nowX + '" y1="' + T + '" y2="' + (T + h) + '" class="lv-now"/><text x="' + nowX + '" y="' + (T - 4) + '" class="lv-ax now" text-anchor="middle">now</text>' +
      '<circle cx="' + nowX + '" cy="' + Y(r.pctNow).toFixed(1) + '" r="5" class="lv-dot"/>' + ticks + xt +
      '<text x="' + (L + 4) + '" y="' + (Y(100) - 5).toFixed(1) + '" class="lv-ax ref" text-anchor="start">plateau on ' + esc(mg(s.planD)) + (s.perWeek === 1 ? ' weekly' : ' × ' + s.perWeek + '/wk') + '</text></svg>';
  }

  function cardHtml(s, i){
    var last = s.doses[s.doses.length - 1];
    if (!s.pk) return '<section class="card lv-card"><div class="card-h"><h2>' + esc(s.name) + '</h2><span class="unit">' + s.doses.length + ' dose' + (s.doses.length === 1 ? '' : 's') + ' logged</span></div>' +
      '<p class="note">No half-life on file for ' + esc(s.name) + ' yet, so there is no curve to draw. Last dose ' + esc(mg(last.mg)) + ' on ' + esc(fmtDay(last.t)) + '.</p></section>';
    var r = compute(s), pct = Math.round(r.pctNow);
    var state = r.overdue ? 'Falling \u00b7 dose overdue' : (r.settled ? (r.pctNow >= 95 ? 'Settled at plateau' : 'Below plateau') : 'Still building up' + (r.weeksToSettle ? ' \u00b7 about ' + r.weeksToSettle + ' week' + (r.weeksToSettle === 1 ? '' : 's') + ' to plateau' : ''));
    var line = 'Last dose ' + mg(last.mg) + ' · ' + fmtDay(last.t) + ' (' + ago(r.sinceLast) + '). ' + (r.overdue ? 'Your plan had the next one on ' + fmtDay(r.nextDue) + '.' : 'Next in your plan: ' + fmtDay(r.nextDue) + '.');
    return '<section class="card lv-card" id="lv-' + esc(s.pid || i) + '"><div class="card-h"><h2>' + esc(s.name) + '</h2><span class="unit">' + s.doses.length + ' dose' + (s.doses.length === 1 ? '' : 's') + ' logged</span></div>' +
      '<div class="lv-hero"><div class="lv-big">' + pct + '<small>%</small></div><div class="lv-sub"><b>' + state + '</b><span>of your plateau on ' + esc(mg(s.planD)) + (s.perWeek === 1 ? ' weekly' : ' × ' + s.perWeek + ' a week') + ' · about ' + esc(mg(r.mgNow)) + ' still in your system</span></div></div>' +
      chart(s, r) + '<p class="lv-tip" id="lv-tip-' + i + '" aria-live="polite"></p>' +
      '<p class="lv-line">' + esc(line) + (r.future.length ? ' After it, the level peaks near ' + Math.round(r.peakAfter) + '%.' : '') + '</p>' +
      '<p class="note">Model estimate from the doses you logged, using a half-life of about ' + s.pk.half + ' day' + (s.pk.half === 1 ? '' : 's') + '; not a blood test. 100% is the average level once ' + esc(mg(s.planD)) + (s.perWeek === 1 ? ' weekly' : '') + ' has built up (about five half-lives). Dashed part: what happens if you keep to the plan. Ticks are your doses; hollow ticks the planned ones.</p></section>';
  }

  function render(){
    var box = document.getElementById('levels'); if (!box) return;
    var ss = series();
    var head = '<div><div class="eyebrow">Live levels</div><h1 id="lv-h">How much is in your blood right now.</h1></div>' +
      '<p class="lede">Built from the doses you logged in the Dose tracker. The curve climbs after each dose and falls before the next; the number is where you are at this moment.</p>';
    if (!ss.length) { box.innerHTML = head + '<section class="card lv-card"><p class="note" style="font-size:14px;max-width:none">Nothing to draw yet. Log a dose in the Dose tracker and your curve appears here.</p><div class="btn-row"><a class="btn" href="#track.vials">Open the vial tracker</a></div></section>'; return; }
    box.innerHTML = head + ss.map(cardHtml).join('');
    box.querySelectorAll('.lv-svg').forEach(function(svg, i){
      var s = ss[i]; if (!s || !s.pk) return; var r = compute(s), tip = document.getElementById('lv-tip-' + i);
      function at(ev){ var rect = svg.getBoundingClientRect(), x = (ev.clientX - rect.left) / rect.width * 640, L = 44, w = 640 - 44 - 14; var d = r.start + Math.min(1, Math.max(0, (x - L) / w)) * (r.end - r.start);
        var best = r.pts[0]; r.pts.forEach(function(p){ if (Math.abs(p.d - d) < Math.abs(best.d - d)) best = p; });
        tip.textContent = fmtDay(new Date(best.d * DAY)) + (best.d > r.nowD ? ' (planned)' : '') + ' · ' + Math.round(best.pct) + '% of plateau'; }
      svg.addEventListener('pointermove', at); svg.addEventListener('pointerdown', at); svg.addEventListener('pointerleave', function(){ tip.textContent = ''; });
    });
  }
  window.lvRender = render;
  var sec = document.querySelector('[data-panel="live"]'); if (sec && !sec.hidden) render();   // app.js may have shown the panel before this module loaded
})();
