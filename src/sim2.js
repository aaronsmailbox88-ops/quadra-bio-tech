/* ===== Blood-level simulator: one-compartment model, first-order absorption and elimination, doses summed by superposition. Re-initialised for each peptide. ===== */
var SIM = { ro: null };
function initSim(pk){
  if (SIM.ro){ try { SIM.ro.disconnect(); } catch (e) {} SIM.ro = null; }
  var box = document.getElementById('pk');
  if (!pk || !box) return;
  var HALF = pk.half, KE = Math.LN2 / HALF, TAU = pk.tau, STEPD = pk.stepDays || 28;
  var tmax = Math.min(pk.tmax, 0.8 / KE), KA = solveKa(KE, tmax);
  var byHalf = HALF < 1 ? 7 : (HALF < 2 ? 56 : 224), SIZES = [7, 14, 28, 56, 112, 224, 448];
  var PEAKMODE = TAU * KE > 3;   // interval longer than ~4 half-lives: no build-up, so the reference is a single dose's peak
  var LADDER = pk.ladder.slice(), REF = { d: pk.maxDose, tau: TAU };
  var tg = pk.targets || [pk.maxDose];
  var state = { mode: 'trial', dose: tg[tg.length - 1], scn: 'normal', ctype: 'fixed', cd: tg[0], ci: TAU, ramp: true, rows: [] };
  LADDER.forEach(function(v){ state.rows.push({ d: v, w: Math.max(1, Math.round(STEPD / 7)) }); });
  var svg = box.querySelector('svg'), tip = box.querySelector('.tip'), note = document.getElementById('pk-note');
  var custom = document.getElementById('pk-custom'), inCd = document.getElementById('pk-cd'), inCi = document.getElementById('pk-ci'), inRamp = document.getElementById('pk-ramp');
  var fixedBox = document.getElementById('pk-fixed'), schedBox = document.getElementById('pk-sched'), rowsBox = document.getElementById('pk-rows'), addRow = document.getElementById('pk-addrow');
  var sample = [], meta = {}, geo = null;
  var WIN = 224, DAYS = 224, WEEKS = 32, STEP = 0.25, SHORT = false, MISS_T = 168, STOP_T = 168;

  function solveKa(ke, tm){ var lo = ke * 1.0001, hi = 500; for (var i = 0; i < 80; i++){ var mid = (lo + hi) / 2, f = Math.log(mid / ke) / (mid - ke); if (f > tm) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  function single(D, t){ return D * (KA / (KA - KE)) * (Math.exp(-KE * t) - Math.exp(-KA * t)); }
  function avgSS(D, tau){ return D / (KE * tau); }
  function troughSS(D, tau){ var eK = Math.exp(-KE * tau), eA = Math.exp(-KA * tau); return D * (KA / (KA - KE)) * (eK / (1 - eK) - eA / (1 - eA)); }
  function peakSS(D, tau){
    var eK = Math.exp(-KE * tau), eA = Math.exp(-KA * tau);
    var tp = Math.log((KA * (1 - eK)) / (KE * (1 - eA))) / (KA - KE); tp = Math.max(0, Math.min(tau, tp));
    return D * (KA / (KA - KE)) * (Math.exp(-KE * tp) / (1 - eK) - Math.exp(-KA * tp) / (1 - eA));
  }
  var REF_AVG = avgSS(REF.d, REF.tau), REF_PEAK = peakSS(REF.d, REF.tau);
  var TMAXA = Math.log(KA / KE) / (KA - KE), REF_SINGLE = single(REF.d, TMAXA), NORM = PEAKMODE ? REF_SINGLE : REF_AVG;
  function fmt(x){ return (Math.round(x * 100) / 100).toString(); }
  function halfStr(){ return halfText(HALF); }

  /* A regimen is a list of segments {d: dose mg, days: length}; the last segment runs to the end of the chart. */
  function regimen(){
    var segs = [], tau = TAU;
    if (state.mode === 'trial'){
      var st = LADDER.filter(function(v){ return v <= state.dose + 1e-9; });
      if (!st.length || Math.abs(st[st.length - 1] - state.dose) > 1e-9) st.push(state.dose);
      st.forEach(function(v){ segs.push({ d: v, days: STEPD }); });
    } else if (state.ctype === 'sched'){
      tau = state.ci;
      state.rows.forEach(function(r){ segs.push({ d: r.d, days: r.w * 7 }); });
      if (!segs.length) segs.push({ d: LADDER[0], days: STEPD });
    } else {
      tau = state.ci;
      var steps = state.ramp ? LADDER.filter(function(v){ return v < state.cd; }).concat([state.cd]) : [state.cd];
      steps.forEach(function(v){ segs.push({ d: v, days: STEPD }); });
    }
    var sched = 0; for (var i = 0; i < segs.length - 1; i++) sched += segs[i].days;
    var maxD = 0; segs.forEach(function(s){ if (s.d > maxD) maxD = s.d; });
    return { segs: segs, tau: tau, top: segs[segs.length - 1].d, maxD: maxD, first: segs[0].d, schedDays: sched, lastStart: sched };
  }
  function doseAt(segs, t){ var acc = 0; for (var i = 0; i < segs.length; i++){ acc += segs[i].days; if (t < acc || i === segs.length - 1) return segs[i].d; } return segs[segs.length - 1].d; }

  function build(){
    var rg = regimen();
    var need = Math.max(byHalf, rg.schedDays + Math.max(28, STEPD));
    WIN = SIZES[SIZES.length - 1]; for (var si = 0; si < SIZES.length; si++){ if (SIZES[si] >= need){ WIN = SIZES[si]; break; } }
    DAYS = WIN; WEEKS = WIN / 7; SHORT = WIN <= 14; STEP = Math.min(0.25, rg.tau / 8, HALF / 8);
    MISS_T = Math.ceil(0.75 * WIN / rg.tau) * rg.tau; STOP_T = MISS_T;
    var ds = [], missedDone = false;
    for (var t = 0; t < DAYS; t += rg.tau){
      if (state.scn === 'stop' && t >= STOP_T) break;
      var missed = false;
      if (state.scn === 'missed' && !missedDone && t >= MISS_T){ missed = true; missedDone = true; }
      var d = doseAt(rg.segs, t);
      ds.push({ t: t, d: missed ? 0 : d, missed: missed });
    }
    sample = [];
    var n = Math.round(DAYS / STEP);
    for (var i = 0; i <= n; i++){
      var tt = i * STEP, c = 0;
      for (var j = 0; j < ds.length; j++){ var dt = tt - ds[j].t; if (dt < 0) break; if (!ds[j].d) continue; if (KE * dt > 9) continue; c += single(ds[j].d, dt); }
      sample.push({ t: tt, pct: c / NORM * 100 });
    }
    var lastT = 0; for (var k = 0; k < ds.length; k++) if (ds[k].d) lastT = ds[k].t;
    meta = { ds: ds, rg: rg, lastT: lastT, plateau: (PEAKMODE ? single(rg.top, TMAXA) : avgSS(rg.top, rg.tau)) / NORM * 100, trough: troughSS(rg.top, rg.tau) / NORM * 100, lastStepDay: rg.lastStart };
  }
  function at(t){ var i = Math.max(0, Math.min(sample.length - 1, Math.round(t / STEP))); return sample[i].pct; }
  function wk(d){ return Math.round(d / 7 * 10) / 10; }
  function tl(d){ return SHORT ? 'day ' + (Math.round(d * 10) / 10) : 'week ' + wk(d); }
  function tn(d){ return SHORT ? 'day ' + Math.round(d * 10) / 10 : 'week ' + Math.round(d / 7); }
  function unitWord(){ return SHORT ? 'day ' : 'week '; }
  function settleAfter(startDay, tr){
    if (SHORT){ for (var dd0 = Math.ceil(startDay) + 1; dd0 < DAYS; dd0++){ if (Math.abs(at(dd0 - STEP) - tr) <= 0.05 * tr){ return dd0; } } return null; }
    for (var w = Math.ceil(startDay / 7) + 1; w < WEEKS; w++){ if (Math.abs(at(w * 7 - STEP) - tr) <= 0.05 * tr){ return w; } }
    return null;
  }
  function schedName(rg){ var ds = rg.segs.map(function(s){ return fmt(s.d); }); return 'Week by week: ' + ds.join(' → ') + ' mg, every ' + state.ci + (state.ci === 1 ? ' day' : ' days'); }

  function writeNote(){
    var rg = meta.rg, tr = meta.trough, parts = [];
    var name = state.mode === 'trial' ? fmt(state.dose) + ' mg target' : (state.ctype === 'sched' ? schedName(rg) : fmt(state.cd) + ' mg every ' + state.ci + (state.ci === 1 ? ' day' : ' days'));
    var down = rg.top < rg.maxD - 1e-9;
    if (state.scn === 'normal' && PEAKMODE){
      var carry = Math.round(single(1, rg.tau) / single(1, TMAXA) * 100);
      parts.push('<b>' + name + '.</b> Each dose peaks about ' + halfText(TMAXA) + ' after injection, at ' + Math.round(meta.plateau) + '% of the reference, and is down to ' + carry + '% of that peak by the next dose. With a half-life of ' + halfStr() + ', nothing builds up from one dose to the next.');
    } else if (state.scn === 'missed' && PEAKMODE){
      parts.push('<b>' + name + ', one dose missed at ' + tn(MISS_T) + '.</b> Nothing carries over from dose to dose at this half-life, so a missed dose is simply a gap with no drug on board.');
    } else if (state.scn === 'normal'){
      var settle = settleAfter(meta.lastStepDay, tr), hi = 0, lo = 1e9;
      for (var t = DAYS - rg.tau; t <= DAYS; t += STEP){ var v = at(t); if (v > hi) hi = v; if (v < lo) lo = v; }
      var peakPct = 0; for (var q = 0; q < sample.length; q++) if (sample[q].pct > peakPct) peakPct = sample[q].pct;
      parts.push('<b>' + name + '.</b>' +
        (rg.segs.length > 1 ? (down ? ' Steps down to ' : ' Reaches ') + fmt(rg.top) + ' mg at ' + tl(meta.lastStepDay) + (settle ? ' and is within 5% of its plateau from ' + unitWord() + settle + '.' : '.') : (settle ? ' Within 5% of its plateau from ' + unitWord() + settle + '.' : '')) +
        (down ? ' The highest level on the way, ' + Math.round(peakPct) + '% of the reference, came on the ' + fmt(rg.maxD) + ' mg step.' : '') +
        ' Once settled, the level swings between about ' + Math.round(lo) + '% and ' + Math.round(hi) + '% of the ' + pk.refLabel + ' average, lowest just before a dose.');
    } else if (state.scn === 'missed'){
      var m = null; for (var a = 0; a < meta.ds.length; a++) if (meta.ds[a].missed) m = meta.ds[a];
      if (m){
        var nextT = m.t + rg.tau, low = at(nextT - STEP), expect = troughSS(doseAt(rg.segs, m.t), rg.tau) / NORM * 100, back = settleAfter(nextT, expect);
        parts.push('<b>' + name + ', one dose missed at ' + tn(m.t) + '.</b> By the next dose the level is about ' + Math.round(low / expect * 100) + '% of where it would normally be' +
          (back ? ', and it is back within 5% of its track by ' + unitWord() + back + '.' : '.') + ' In a trial a missed dose is reported to the study team; approved drugs in this class carry instructions never to double up.');
      }
    } else {
      var t10 = null, t2 = null, lastDose = doseAt(rg.segs, meta.lastT), base = (PEAKMODE ? single(lastDose, TMAXA) : avgSS(lastDose, rg.tau)) / NORM * 100;
      for (var t3 = meta.lastT; t3 <= DAYS; t3 += STEP){ var v3 = at(t3); if (t10 === null && v3 < 0.10 * base) t10 = t3; if (t2 === null && v3 < 0.02 * base) t2 = t3; }
      var d10 = t10 !== null ? t10 - meta.lastT : null, d2 = t2 !== null ? t2 - meta.lastT : null;
      parts.push('<b>' + name + ', last dose at ' + tn(meta.lastT) + '.</b> Half is gone within ' + halfStr() + '.' +
        (d10 !== null ? ' The level drops below 10% of its plateau about ' + spanText(d10) + ' after the last dose' : '') +
        (d2 !== null ? ' and below 2% after about ' + spanText(d2) + '.' : '.'));
    }
    if (state.mode === 'custom'){
      var avgR = avgSS(rg.maxD, rg.tau) / REF_AVG, pkR = peakSS(rg.maxD, rg.tau) / REF_PEAK, flags = [];
      var over = avgR > 1.02 || pkR > 1.02, big = rg.maxD > pk.maxDose + 1e-9, noRamp = rg.first > LADDER[0] + 1e-9;
      flags.push((rg.segs.length > 1 ? 'Highest step, ' + fmt(rg.maxD) + ' mg: average' : 'Average') + ' exposure ' + Math.round(avgR * 100) + '% of the ' + pk.refLabel + ' reference' + (pkR > 1.02 ? ', with peaks ' + Math.round((pkR - 1) * 100) + '% above the highest tested' : '') + '.');
      if (down) flags.push('Final step, ' + fmt(rg.top) + ' mg: ' + Math.round(avgSS(rg.top, rg.tau) / REF_AVG * 100) + '% of the reference.');
      if (big) flags.push('No trial or label used a single dose above ' + fmt(pk.maxDose) + ' mg.');
      if (over) flags.push('This goes beyond the exposure tested, so no safety data exists for it.');
      else flags.push('That is inside the tested range, which the trials reached with a step-up, regular check-ins and bloodwork.');
      if (noRamp) flags.push('The trials started at ' + fmt(LADDER[0]) + ' mg; starting at ' + fmt(rg.first) + ' mg puts the level at ' + Math.round(at(Math.min(7, DAYS))) + '% of the reference in the first ' + (SHORT ? 'day' : 'week') + ', where stomach side effects were most intense.');
      parts.push('<span class="' + ((over || big || noRamp) ? 'flag' : '') + '">' + flags.join(' ') + '</span>');
    }
    note.innerHTML = parts.join('<br>');
  }
  function spanText(days){ if (days < 2) return Math.round(days * 24) + ' hours'; if (days < 14) return Math.round(days) + ' days'; return Math.round(days / 7) + ' weeks'; }

  function draw(){
    var W = box.clientWidth; if (!W) return;
    var H = W < 480 ? 280 : 320, L = 40, R = 14, T = 30, B = 36, pw = W - L - R, ph = H - T - B;
    var maxPct = 0; for (var i = 0; i < sample.length; i++) if (sample[i].pct > maxPct) maxPct = sample[i].pct;
    var ymax = Math.max(125, Math.ceil(maxPct * 1.08 / 25) * 25), ystep = ymax > 300 ? 100 : (ymax > 150 ? 50 : 25);
    function X(w){ return L + pw * (w / WEEKS); }
    var tickDays = SHORT ? (WIN <= 7 ? 1 : 2) : (WIN <= 56 ? 7 : (WIN <= 112 ? 14 : (WIN <= 224 ? 28 : 56)));
    function Y(p){ return T + ph * (1 - p / ymax); }
    var s = '', rg = meta.rg, segs = rg.segs, acc = 0;
    for (var k = 0; k < segs.length; k++){
      var d0 = acc, d1 = (k === segs.length - 1) ? DAYS : Math.min(DAYS, acc + segs[k].days); acc += segs[k].days;
      if (d0 >= DAYS) break;
      var x0 = X(d0 / 7), x1 = X(d1 / 7);
      if (k % 2 === 1) s += '<rect x="' + x0 + '" y="' + T + '" width="' + (x1 - x0) + '" height="' + ph + '" fill="var(--surface-2)"/>';
      var bw = x1 - x0, bl = bw >= 52 || k === segs.length - 1 ? fmt(segs[k].d) + ' mg' : (bw >= 24 ? fmt(segs[k].d) : '');
      if (bl && bw >= 18) s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (T - 10) + '" text-anchor="middle" class="band-l">' + bl + '</text>';
    }
    for (var p = 0; p <= ymax; p += ystep){ var y = Y(p); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + p + (p === 100 ? '%' : '') + '</text>'; }
    for (var td = 0; td <= DAYS + 1e-9; td += tickDays){ s += '<text x="' + X(td / 7) + '" y="' + (H - B + 16) + '" text-anchor="middle" class="ax">' + (SHORT ? td : Math.round(td / 7)) + '</text>'; }
    s += '<text x="' + (W - R) + '" y="' + (H - 3) + '" text-anchor="end" class="ax">' + (SHORT ? 'days' : 'weeks') + '</text>';
    var yp = Y(meta.plateau), plab = (state.mode === 'trial' ? fmt(state.dose) + ' mg' : fmt(rg.top) + ' mg / ' + state.ci + ' d') + (PEAKMODE ? ' peak' : ' average');
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yp + '" y2="' + yp + '" class="plat"/><text x="' + (L + 4) + '" y="' + (yp - 5) + '" class="plat-l">' + plab + '</text>';
    if (state.mode === 'custom' && Math.abs(meta.plateau - 100) > 15){ var yr = Y(100); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yr + '" y2="' + yr + '" class="ref"/><text x="' + (L + 4) + '" y="' + (yr + 13) + '" class="plat-l">' + pk.refLabel + ', reference</text>'; }
    var d = '', a = 'M' + X(0).toFixed(1) + ' ' + Y(0).toFixed(1);
    for (var q = 0; q < sample.length; q++){ var xq = X(sample[q].t / 7).toFixed(1), yq = Y(sample[q].pct).toFixed(1); d += (q ? ' L' : 'M') + xq + ' ' + yq; a += ' L' + xq + ' ' + yq; }
    a += ' L' + X(WEEKS).toFixed(1) + ' ' + Y(0).toFixed(1) + ' Z';
    s += '<path d="' + a + '" class="area"/><path d="' + d + '" class="line"/>';
    for (var j = 0; j < meta.ds.length; j++){
      var dd = meta.ds[j], xd = X(dd.t / 7);
      if (dd.missed){ s += '<circle cx="' + xd + '" cy="' + Y(0) + '" r="4" class="miss"/><text x="' + xd + '" y="' + (Y(0) - 10) + '" text-anchor="middle" class="miss-l">missed</text>'; }
      else if (rg.tau >= 3 || DAYS / rg.tau <= 60){ s += '<line x1="' + xd + '" x2="' + xd + '" y1="' + Y(0) + '" y2="' + (Y(0) + 5) + '" class="tick"/>'; }
    }
    if (state.scn === 'stop'){ var xs = X(meta.lastT / 7); s += '<line x1="' + xs + '" x2="' + xs + '" y1="' + T + '" y2="' + Y(0) + '" class="stop"/><text x="' + (xs + 5) + '" y="' + (T + 14) + '" class="miss-l">last dose</text>'; }
    s += '<g id="pk-hover" hidden><line class="cross"/><circle r="5" class="dot"/></g><rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '" fill="transparent" id="pk-ov"/>';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = s;
    geo = { X: X, Y: Y, L: L, R: R, T: T, W: W, H: H };
  }
  function label(w){
    var t = w * 7, last = null;
    for (var i = 0; i < meta.ds.length; i++){ if (meta.ds[i].t <= t) last = meta.ds[i]; else break; }
    if (!last) return '';
    if (state.scn === 'stop' && t > meta.lastT + meta.rg.tau) return 'after the last dose';
    if (last.missed) return 'dose missed';
    return 'on ' + fmt(last.d) + ' mg';
  }
  function hide(){ var g = svg.querySelector('#pk-hover'); if (g) g.setAttribute('hidden', ''); tip.hidden = true; }
  function move(e){
    if (!geo) return;
    var r = svg.getBoundingClientRect(), x = e.clientX - r.left, w = (x - geo.L) / (geo.W - geo.L - geo.R) * WEEKS;
    if (w < 0 || w > WEEKS){ hide(); return; }
    var idx = Math.max(0, Math.min(sample.length - 1, Math.round(w * 7 / STEP))), pt = sample[idx];
    var hx = geo.X(pt.t / 7), hy = geo.Y(pt.pct), g = svg.querySelector('#pk-hover'); g.removeAttribute('hidden');
    var ln = g.querySelector('line'); ln.setAttribute('x1', hx); ln.setAttribute('x2', hx); ln.setAttribute('y1', geo.T); ln.setAttribute('y2', geo.Y(0));
    var c = g.querySelector('circle'); c.setAttribute('cx', hx); c.setAttribute('cy', hy);
    tip.textContent = (SHORT ? 'Day ' + pt.t.toFixed(1) : 'Week ' + (pt.t / 7).toFixed(1)) + ' · ' + Math.round(pt.pct) + '% of the ' + pk.refLabel + (PEAKMODE ? ' peak' : ' average') + ' · ' + label(pt.t / 7);
    tip.hidden = false;
    var tw = tip.offsetWidth, left = hx + 12; if (left + tw > geo.W - 4) left = hx - tw - 12; if (left < 0) left = 0;
    tip.style.left = left + 'px'; tip.style.top = Math.max(0, hy - 34) + 'px';
  }
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', hide);
  function render(){ build(); draw(); writeNote(); hide(); }

  /* ---- custom controls ---- */
  function readInputs(){
    var d = parseFloat(inCd.value), i = parseInt(inCi.value, 10), cap = pk.maxDose * 3;
    if (!(d > 0)) d = LADDER[0]; if (d > cap) d = cap; if (!(i > 0)) i = 1; if (i > 28) i = 28;
    state.cd = Math.round(d * 100) / 100; state.ci = i; state.ramp = inRamp.checked;
  }
  function stepAttr(){ return pk.maxDose >= 10 ? 0.5 : (pk.maxDose >= 2 ? 0.25 : 0.05); }
  function renderRows(){
    if (!rowsBox) return;
    rowsBox.innerHTML = state.rows.map(function(r, i){
      return '<div class="srow"><span class="n">' + (i + 1) + '</span><input type="number" class="sd" data-i="' + i + '" min="0.01" max="' + (pk.maxDose * 3) + '" step="' + stepAttr() + '" value="' + fmt(r.d) + '" inputmode="decimal" aria-label="Dose for step ' + (i + 1) + '"> mg for <input type="number" class="sw" data-i="' + i + '" min="1" max="52" step="1" value="' + r.w + '" inputmode="numeric" aria-label="Weeks for step ' + (i + 1) + '"> wk' +
        (state.rows.length > 1 ? '<button type="button" class="x" data-rm="' + i + '" aria-label="Remove step">×</button>' : '') + '</div>';
    }).join('') + '<p class="note">The last step continues to the end of the chart. Add a step with a lower dose to see a step-down.</p>';
  }
  function readRows(){
    var rows = [], cap = pk.maxDose * 3, tot = 0;
    Array.prototype.slice.call(rowsBox.querySelectorAll('.srow')).forEach(function(row){
      var d = parseFloat(row.querySelector('.sd').value), w = parseInt(row.querySelector('.sw').value, 10);
      if (!(d > 0)) d = LADDER[0]; if (d > cap) d = cap; if (!(w > 0)) w = 1; if (w > 52) w = 52;
      if (tot + w > 60) w = Math.max(1, 60 - tot); tot += w;
      rows.push({ d: Math.round(d * 100) / 100, w: w });
    });
    if (rows.length) state.rows = rows;
  }
  function showCustom(){
    custom.hidden = state.mode !== 'custom';
    if (fixedBox) fixedBox.hidden = state.ctype !== 'fixed';
    if (schedBox) schedBox.hidden = state.ctype !== 'sched';
  }
  Array.prototype.slice.call(box.parentNode.querySelectorAll('[data-dose],[data-scn],[data-ctype]')).forEach(function(b){
    b.addEventListener('click', function(){
      if (b.hasAttribute('data-dose')){
        var v = b.getAttribute('data-dose');
        if (v === 'custom'){ state.mode = 'custom'; readInputs(); if (state.ctype === 'sched') readRows(); } else { state.mode = 'trial'; state.dose = parseFloat(v); }
      } else if (b.hasAttribute('data-ctype')){
        state.ctype = b.getAttribute('data-ctype'); readInputs(); if (state.ctype === 'sched'){ if (!rowsBox.children.length) renderRows(); readRows(); }
      } else { state.scn = b.getAttribute('data-scn'); }
      showCustom();
      Array.prototype.slice.call(b.parentNode.children).forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    });
  });
  [inCd, inCi, inRamp].forEach(function(el){ if (!el) return; el.addEventListener('input', function(){ readInputs(); render(); }); el.addEventListener('change', function(){ readInputs(); render(); }); });
  if (rowsBox){
    rowsBox.addEventListener('input', function(){ readRows(); render(); });
    rowsBox.addEventListener('click', function(e){ var b = e.target.closest ? e.target.closest('button[data-rm]') : null; if (!b) return; readRows(); state.rows.splice(+b.getAttribute('data-rm'), 1); renderRows(); render(); });
  }
  if (addRow){ addRow.addEventListener('click', function(){ readRows(); var last = state.rows[state.rows.length - 1]; state.rows.push({ d: last ? last.d : LADDER[0], w: Math.max(1, Math.round(STEPD / 7)) }); renderRows(); render(); }); }
  renderRows();
  if (window.ResizeObserver){ SIM.ro = new ResizeObserver(function(){ draw(); }); SIM.ro.observe(box); } else { window.addEventListener('resize', draw); }
  render();
}
