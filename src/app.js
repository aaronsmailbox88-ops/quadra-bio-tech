/* ===== Peptide data-driven renderer ===== */
var PEPTIDES = /*__PACKS__*/[];
var BY = {}; PEPTIDES.forEach(function(p){ BY[p.id] = p; });
var CURRENT = null;
var TABS = ['overview', 'results', 'effects', 'levels', 'trials', 'status', 'dosing'];

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function fmtNum(x, dec){ return (Math.round(x * Math.pow(10, dec)) / Math.pow(10, dec)).toFixed(dec); }
function pct(v, signed, unit){ var a = Math.abs(v), s = fmtNum(a, a >= 100 ? 0 : (a < 10 && a !== Math.floor(a) ? 1 : (a < 10 ? 1 : 1))); unit = unit == null ? '%' : unit; return signed ? ((v < 0 ? '−' : (v > 0 ? '+' : '')) + s + unit) : (s + unit); }
function niceStep(x){ var c = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100]; for (var i = 0; i < c.length; i++) if (c[i] >= x) return c[i]; return 100; }

function tiles(arr, cls){
  if (!arr || !arr.length) return '';
  return '<div class="row ' + (cls || (arr.length === 2 ? 'two' : 'three')) + '">' + arr.map(function(s){
    return '<div class="stat"><div class="num">' + esc(s.num) + '</div><div class="lbl">' + esc(s.lbl) + '</div>' + (s.src ? '<div class="src">' + esc(s.src) + '</div>' : '') + '</div>';
  }).join('') + '</div>';
}
function paras(list){ return (list || []).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join(''); }
function detailsList(blocks){
  return (blocks || []).map(function(b){ return '<details><summary>' + esc(b.title) + '</summary><div class="body">' + paras(b.paras) + '</div></details>'; }).join('');
}
function bullets(items, cls){
  if (!items || !items.length) return '';
  return '<ul class="plain' + (cls ? ' ' + cls : '') + '">' + items.map(function(it){
    if (typeof it === 'string') return '<li>' + esc(it) + '</li>';
    return '<li>' + (it.b ? '<b>' + esc(it.b) + '</b> ' : '') + esc(it.t) + '</li>';
  }).join('') + '</ul>';
}
var KICK = { 'ov-h': 'Evidence', 're-h': 'Trial data', 'se-h': 'Safety', 'lv-h': 'Interactive', 'tr-h': 'Method', 'st-h': 'Regulators', 'do-h': 'Interactive' };
function head(eyebrow, h, id){ return '<div><div class="kick"><div class="eyebrow">' + esc(eyebrow) + '</div>' + (KICK[id] ? '<span class="tag2">' + KICK[id] + '</span>' : '') + '</div><h1 id="' + id + '">' + esc(h) + '</h1></div>'; }

function barChart(c, kind, ariaLabel){
  if (!c || !c.rows || !c.rows.length) return '';
  var max = c.max || Math.ceil(Math.max.apply(null, c.rows.map(function(r){ return Math.max(Math.abs(r.drug || 0), Math.abs(r.placebo || 0)); })) * 1.15);
  var signed = kind === 'weight' || (kind === 'other' && c.signed !== false), unit = c.unit || '%';
  var h = '<div class="card chart" aria-label="' + esc(ariaLabel) + '">';
  if (c.eyebrow) h += '<div class="eyebrow">' + esc(c.eyebrow) + '</div>';
  var hasGain = false, legendAt = h.length;
  h += '<div class="legend"><span class="k1"><i></i>' + esc(c.legend[0]) + '</span><span class="k2"><i></i>' + esc(c.legend[1]) + '</span>/*GAIN*/</div><div class="bars">';
  c.rows.forEach(function(r){
    var wd = Math.min(100, Math.abs(r.drug) / max * 100), wp = Math.min(100, Math.abs(r.placebo) / max * 100);
    var tipD = r.tip || (c.legend[0] + ': ' + pct(r.drug, signed, unit)), tipP = c.legend[1] + ': ' + pct(r.placebo, signed, unit);
    var gD = signed && r.drug > 0 ? ' gain' : '', gP = signed && r.placebo > 0 ? ' gain' : '';
    if (gD || gP) hasGain = true;
    h += '<div class="bar-row"><div class="name">' + esc(r.name) + '</div>' + (r.meta ? '<div class="meta">' + esc(r.meta) + '</div>' : '') +
         '<div class="track"><div class="bar r' + gD + '" style="width:' + wd.toFixed(1) + '%" data-tip="' + esc(tipD) + '" tabindex="0"><span class="v">' + pct(r.drug, signed, unit) + '</span></div>' +
         '<div class="bar p' + gP + '" style="width:' + wp.toFixed(1) + '%" data-tip="' + esc(tipP) + '"><span class="v">' + pct(r.placebo, signed, unit) + '</span></div></div></div>';
  });
  h += '</div>';
  h = h.replace('/*GAIN*/', hasGain ? '<span class="k5"><i></i>weight gain</span>' : '');
  var step = niceStep(max / 4), ax = '<div class="axis">';
  for (var t = 0; t <= max + 1e-9; t += step){ ax += '<span style="left:' + (t / max * 100).toFixed(2) + '%">' + (t === 0 ? '0' : (signed ? '−' : '') + (Math.round(t * 100) / 100) + unit) + '</span>'; }
  h += ax + '</div>' + (c.note ? '<p class="note">' + esc(c.note) + '</p>' : '') + '</div>';
  return h;
}

var HL_TABLE = '<div class="card"><h3>Half-life across the family</h3><p class="note">Longer bars mean the drug stays in the body longer, which is why some are daily and some are weekly. All are peptides that act on the same hormone system.</p><ul class="hl">' +
  [['exenatide', 'Exenatide', 'Byetta', '2.4 h', 'twice daily', 1.4], ['liraglutide', 'Liraglutide', 'Saxenda, Victoza', '~13 h', 'once daily', 7.7], ['dulaglutide', 'Dulaglutide', 'Trulicity', '~5 days', 'once weekly', 71], ['tirzepatide', 'Tirzepatide', 'Zepbound, Mounjaro', '~5 days', 'once weekly', 71], ['retatrutide', 'Retatrutide', 'in trials, not approved', '~6 days', 'once weekly', 86], ['semaglutide', 'Semaglutide', 'Wegovy, Ozempic', '~7 days', 'once weekly', 100]]
  .map(function(r){ return '<li data-id="' + r[0] + '"><span class="n">' + r[1] + ' <small>' + r[2] + '</small></span><span class="v">' + r[3] + '</span><span class="g">' + r[4] + '</span><span class="b"><i style="width:' + r[5] + '%"></i></span></li>'; }).join('') +
  '</ul><p class="note">Half-lives from the Canadian and U.S. product labels; retatrutide from its phase 1b trial. Daily drugs plateau within days, weekly ones in four to five weeks.</p></div>';

var PARTICIPANT_STEPS = [
  ['Screening', 'Medical history, weight and BMI, blood tests, an ECG, and checks against the study\'s entry rules. Many people are turned away at this stage.'],
  ['Informed consent', 'A written document explains the drug, the risks, the visit schedule, and the chance of receiving placebo. You can leave the trial at any time without giving a reason.'],
  ['Randomization', 'A computer assigns you to a dose or to placebo. You cannot choose, and you will not be told which you got until the trial is over.'],
  ['Treatment period', 'Injections at home after training, dose steps on the protocol\'s schedule, regular clinic visits for weight, vitals and bloodwork, questionnaires about how you feel, and diet and activity counselling.'],
  ['Safety monitoring', 'Every symptom is recorded and graded. The study team can delay a dose step, lower the dose or stop the drug. Serious events are reported to regulators and to an independent safety committee.'],
  ['Follow-up', 'A final visit after the last dose, then the results are pooled, analyzed and published. Participants are usually told afterward which group they were in.']
];

function renderOverview(P){
  var o = P.overview, h = head('What it is', o.headline, 'ov-h');
  h += '<p class="lede">' + esc(o.lede) + '</p>' + tiles(o.stats, 'three');
  if (o.mechanism){
    h += '<div><h2>How it works</h2><p class="lede" style="font-size:15px;margin-top:4px">' + esc(o.mechanism.intro) + '</p></div><div class="hormones">' +
      (o.mechanism.parts || []).map(function(m){ return '<div class="hormone"><b>' + esc(m.name) + '</b><span>' + esc(m.text) + '</span></div>'; }).join('') + '</div>';
  }
  if (o.more) h += detailsList([o.more]);
  h += '<div class="card"><h3>Dosing and vial tracking, by weight</h3><p style="font-size:14px;color:var(--ink-2)">What the trials dosed, what a vial of ' + esc(P.name) + ' makes at a given amount of water, the grams to draw for a dose, how many doses are left and when to reorder. Measured with a scale, not syringe marks.</p><div class="btn-row"><a class="btn" href="#' + P.id + '.dosing">Dosing</a><a class="btn ghost" href="#dose.vials">Vial tracker</a></div></div>';
  return h;
}
function renderResults(P){
  var r = P.results, h = head('Trial results', r.headline, 're-h') + '<p class="lede">' + esc(r.lede) + '</p>';
  h += barChart(r.chart, r.chart && r.chart.metric === 'weight' ? 'weight' : 'other', 'Trial results for ' + P.name + ' versus placebo');
  h += tiles(r.stats);
  if (r.beyond) h += '<div><h2>' + esc(r.beyond.title) + '</h2></div>' + bullets(r.beyond.items);
  h += detailsList(r.more);
  return h;
}
function renderEffects(P){
  var e = P.effects, h = head('Side effects', e.headline, 'se-h') + '<p class="lede">' + esc(e.lede) + '</p>';
  h += barChart(e.chart, 'effects', 'Share of participants reporting each side effect, ' + P.name + ' versus placebo');
  if (e.disc) h += '<div class="card"><h3>' + esc(e.disc.title) + '</h3><p>' + esc(e.disc.text) + '</p></div>';
  if (e.unique) h += '<div><h2>' + (P.group === 'research' ? 'What has actually been reported' : 'The one that is new') + '</h2></div><div class="card soft"><h3>' + esc(e.unique.title) + '</h3><p>' + esc(e.unique.text) + '</p></div>';
  h += detailsList(e.more);
  if (e.urgent) h += '<div class="card warn"><h3>' + esc(e.urgent.title) + '</h3>' + bullets(e.urgent.items, 'small') + (e.urgent.note ? '<p class="note">' + esc(e.urgent.note) + '</p>' : '') + '</div>';
  return h;
}
function renderLevels(P){
  var l = P.levels, pk = l.pk, h = head('Blood levels', pk ? 'How a dose builds up in the blood, and why trials climb slowly.' : 'No one has measured how this peptide behaves in the human body.', 'lv-h');
  if (pk){
    var tgts = pk.targets || [pk.maxDose];
    h += '<p class="lede">' + esc(P.name) + ' has a half-life of about ' + esc(halfText(pk.half)) + ', so each dose lands on top of what is left from the last one. Levels climb for a while after every dose step, then settle at a plateau.</p>';
    h += '<div class="card chart"><div class="ctl-row"><div class="seg" role="group" aria-label="Target dose">' +
      tgts.map(function(t, i){ return '<button type="button" data-dose="' + t + '" aria-pressed="' + (i === tgts.length - 1 ? 'true' : 'false') + '">' + fmtDose(t) + ' mg</button>'; }).join('') +
      '<button type="button" data-dose="custom" aria-pressed="false">Custom</button></div>' +
      '<div class="seg" role="group" aria-label="Scenario"><button type="button" data-scn="normal" aria-pressed="true">Regular</button><button type="button" data-scn="missed" aria-pressed="false">Miss one</button><button type="button" data-scn="stop" aria-pressed="false">Stop</button></div></div>' +
      '<div class="custom" id="pk-custom" hidden>' +
      '<div class="seg small" role="group" aria-label="Custom schedule type"><button type="button" data-ctype="fixed" aria-pressed="true">Fixed dose</button><button type="button" data-ctype="sched" aria-pressed="false">Week by week</button></div>' +
      '<div class="cfix" id="pk-fixed"><label for="pk-cd">Dose per injection <input type="number" id="pk-cd" min="0.01" max="' + (pk.maxDose * 3) + '" step="' + (pk.maxDose >= 10 ? 0.5 : (pk.maxDose >= 2 ? 0.25 : 0.05)) + '" value="' + fmtDose(tgts[0]) + '" inputmode="decimal"> mg</label>' +
      '<label class="chk" for="pk-ramp"><input type="checkbox" id="pk-ramp" checked> Start with the trial\'s step-up</label></div>' +
      '<div class="csched" id="pk-sched" hidden><div class="sched" id="pk-rows"></div><button type="button" class="btn ghost sm" id="pk-addrow">+ Add a step</button></div>' +
      '<label for="pk-ci">Every <input type="number" id="pk-ci" min="1" max="28" step="1" value="' + pk.tau + '" inputmode="numeric"> days</label>' +
      '<span class="note">Hypothetical. Titrate up or down by the step; the readout marks where a schedule goes beyond anything the trials tested.</span></div>' +
      '<div class="pk" id="pk" aria-label="Simulated blood level over 32 weeks"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg><div class="tip" hidden></div></div>' +
      '<p class="note" id="pk-cap">' + (pk.tau * Math.LN2 / pk.half > 3 ? '100% is the peak level after a single ' + esc(pk.refLabel.replace(/,.*$/, '')) + ' dose. ' : '100% is the average level on ' + esc(pk.refLabel) + ' once it has plateaued. ') + 'Shaded bands are the dose steps; small ticks mark each injection; the curve rises after each dose and falls before the next. Touch or hover the curve for a reading.</p>' +
      '<div class="readout" id="pk-note"></div></div>';
  } else {
    h += '<p class="lede">' + esc(l.nopk || 'No human pharmacokinetic study has been published, so there is no half-life to model and nothing honest to simulate.') + '</p>';
  }
  h += tiles(l.stats, 'three');
  if (l.explain && l.explain.length) h += '<div><h2>' + (pk ? 'What the curve explains' : 'Why that matters') + '</h2></div>' + bullets(l.explain);
  if (l.showTable) h += HL_TABLE;
  h += detailsList(l.more);
  return h;
}
function fmtDose(d){ return (Math.round(d * 100) / 100).toString(); }
function halfText(days){
  if (days < 1 / 24) return Math.round(days * 1440) + ' minutes';
  if (days < 2) return (Math.round(days * 24 * 10) / 10).toString().replace(/\.0$/, '') + ' hours';
  return (Math.round(days * 10) / 10).toString().replace(/\.0$/, '') + ' days';
}
function renderTrials(P){
  var t = P.trials, h = head('Inside a trial', t.headline, 'tr-h') + '<p class="lede">' + esc(t.lede) + '</p>';
  if (t.ladder){
    var n = t.ladder.steps.length;
    h += '<div class="card"><h3>' + esc(t.ladder.title) + '</h3><p style="font-size:14px;color:var(--ink-2)">' + esc(t.ladder.text) + '</p><div class="ladder" aria-label="Dose steps">' +
      t.ladder.steps.map(function(s, i){ return '<div><i style="height:' + Math.round(14 + (n > 1 ? i / (n - 1) : 1) * 66) + 'px"></i>' + esc(s.d) + '<span class="t">' + esc(s.t) + '</span></div>'; }).join('') +
      '</div>' + (t.ladder.note ? '<p class="note">' + esc(t.ladder.note) + '</p>' : '') +
      (P.levels && P.levels.pk ? '<div class="btn-row"><a class="btn ghost" href="#' + P.id + '.levels">See what the ladder does to blood levels</a></div>' : '') + '</div>';
  }
  if (P.group !== 'research'){
    h += '<div><h2>What a participant experiences</h2></div><ol class="steps">' + PARTICIPANT_STEPS.map(function(s){ return '<li><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></li>'; }).join('') + '</ol>';
  }
  h += detailsList(t.more);
  if (t.running) h += '<div><h2>' + esc(t.running.title) + '</h2></div>' + bullets(t.running.items);
  if (t.find){
    h += '<div class="card"><h3>Finding a trial</h3><p style="font-size:14px;color:var(--ink-2)">' + esc(t.find.text) + '</p><div class="btn-row"><a class="btn" href="https://clinicaltrials.gov/search?term=' + encodeURIComponent(t.find.term || P.name) + '" target="_blank" rel="noopener">Search ClinicalTrials.gov</a>' +
      (t.find.extra && t.find.extra.url ? '<a class="btn ghost" href="' + esc(t.find.extra.url) + '" target="_blank" rel="noopener">' + esc(t.find.extra.label) + '</a>' : '') + '</div></div>';
  }
  return h;
}
var UNITS_NOTE = '<details><summary>Units are not milligrams: the dosing-error warning</summary><div class="body">' +
  '<p>Insulin syringes are marked in "units" for U-100 insulin: 100 units per millilitre, so one unit is one hundredth of a millilitre of whatever liquid is in the syringe. The marks measure volume, not drug. How much drug a unit holds depends entirely on the concentration in the vial, and for an unapproved product nobody has verified what that is.</p>' +
  '<p>On July 26, 2024 the U.S. FDA warned that dosing errors with compounded semaglutide sold in vials were sending people to hospital. In most reports, patients drew up 5 to 20 times the prescribed dose; in others, clinicians miscalculated the conversion from milligrams to units and prescribed 5 to 10 times too much. Reported harms included vomiting, fainting, dehydration, acute pancreatitis and gallstones. Approved semaglutide and tirzepatide come as pens or labelled vials dosed in milligrams, with the manufacturer\'s own instructions for use in the box.</p>' +
  '<p>That is why the Dosing tab and the Vial tracker in this app work from scale readings rather than syringe marks, and why neither prints a unit chart. A chart only works if the label on the vial is true, and the products sold as "research" peptides carry no such guarantee. If you use a prescribed product, the instructions that come with it, and your pharmacist, are the reference.</p>' +
  '<p class="note">Sources: <a href="https://www.healio.com/news/endocrinology/20240909/fda-warns-of-adverse-events-due-to-overdosing-of-compounded-semaglutide" target="_blank" rel="noopener">FDA alert as reported by Healio, July 2024</a> · <a href="https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program" target="_blank" rel="noopener">FDA MedWatch</a> · <a href="https://www.canada.ca/en/health-canada/services/drugs-health-products/medeffect-canada.html" target="_blank" rel="noopener">MedEffect Canada</a></p>' +
  '</div></details>';

/* ===== Dosing by weight (per peptide) ===== */
function dosingDefaults(P){
  var pk = P.levels && P.levels.pk, d = { mg: '', water: '', dose: '', perWeek: 1, lead: 10 };
  if (pk && pk.ladder && pk.ladder.length){ d.dose = pk.ladder[0]; var tau = pk.tau || 7; d.perWeek = Math.round((7 / tau) * 100) / 100; }
  try { var sv = JSON.parse(localStorage.getItem('mp-dose-' + P.id) || 'null'); if (sv) ['mg', 'water', 'dose', 'perWeek', 'lead'].forEach(function(k){ if (sv[k] !== undefined && sv[k] !== '') d[k] = sv[k]; }); } catch (e) {}
  return d;
}
function dosingTrialCard(P){
  var pk = P.levels && P.levels.pk, t = P.trials || {};
  if (pk && pk.ladder && pk.ladder.length){
    var tau = pk.tau || 7, every = tau === 7 ? 'once a week' : (tau === 1 ? 'once a day' : (tau === 3.5 ? 'twice a week' : 'every ' + fmtDose(tau) + ' days'));
    var n = pk.ladder.length;
    return '<div class="card"><h3>Doses used in human trials</h3><p style="font-size:14px;color:var(--ink-2)">Trials gave ' + esc(P.name) + ' ' + every + ', starting at <b>' + fmtDose(pk.ladder[0]) + ' mg</b>' + (n > 1 ? ' and stepping up to <b>' + fmtDose(pk.ladder[n - 1]) + ' mg</b>' + (pk.stepDays ? ' one step every ' + pk.stepDays + ' days' : '') : '') + (pk.refLabel ? ' (reference: ' + esc(pk.refLabel) + ')' : '') + '.</p>' +
      '<div class="ladder" aria-label="Trial dose steps">' + pk.ladder.map(function(d, i){ return '<div><i style="height:' + Math.round(14 + (n > 1 ? i / (n - 1) : 1) * 50) + 'px"></i>' + fmtDose(d) + ' mg<span class="t">' + (i === 0 ? 'start' : 'step ' + i) + '</span></div>'; }).join('') + '</div>' +
      '<p class="note">These are the doses the trials used under medical supervision, with a verified drug and a known concentration. They are a record, not a recommendation. The calculator below only does arithmetic on the numbers you type in.' + (pk.source ? ' Source: ' + esc(pk.source) + '.' : '') + '</p></div>';
  }
  return '<div class="card crit"><h3>No human dose has been established</h3><p style="font-size:14px;color:var(--ink-2)">' + esc((P.levels && P.levels.nopk) || ('No dose of ' + P.name + ' has been tested in people in a way that fixes an amount, a schedule or a safe range.')) + ' Any dose you see for it online is someone’s guess. The calculator below does arithmetic only; it cannot tell you what amount is safe or effective.</p></div>';
}
function renderDosing(P){
  var d = dosingDefaults(P);
  var h = head('Dosing · by weight', 'From vial to syringe, with a scale instead of syringe marks.', 'do-h');
  h += '<p class="lede">Type what is on the label and what the scale showed when you added water. The app gives the concentration, the grams to draw for one dose, how many doses the vial holds, how long it lasts and when to order the next one.</p>';
  h += dosingTrialCard(P);
  h += '<div class="card" id="do-calc"><h3>Vial calculator</h3><p style="font-size:14px;color:var(--ink-2)">Water weighs 1.000 g per mL, so the scale reading is the volume. Weigh the vial before and after adding water (the vial figure is the true one if the syringe disagrees).</p>' +
    '<div class="dgrid">' +
    '<label class="dl">Vial label (mg)<input id="do-mg" type="number" inputmode="decimal" step="0.01" min="0" placeholder="e.g. 15" value="' + esc(d.mg) + '"></label>' +
    '<label class="dl">Water added (g on the scale)<input id="do-water" type="number" inputmode="decimal" step="0.001" min="0" placeholder="standard: 0.1 g per mg" value="' + esc(d.water) + '"></label>' +
    '<label class="dl">Dose you plan (mg)<input id="do-dose" type="number" inputmode="decimal" step="0.01" min="0" placeholder="e.g. 2" value="' + esc(d.dose) + '"></label>' +
    '<label class="dl">Doses per week<input id="do-pw" type="number" inputmode="decimal" step="0.5" min="0" value="' + esc(d.perWeek) + '"></label>' +
    '<label class="dl">Supplier lead time (days)<input id="do-lead" type="number" inputmode="numeric" step="1" min="0" value="' + esc(d.lead) + '"></label>' +
    '</div><div class="dout" id="do-out" aria-live="polite"></div>' +
    '<div class="btn-row"><button type="button" class="btn" id="do-track">Track this vial</button><a class="btn ghost" href="#learn.weigh">How to weigh</a></div>' +
    '<div id="do-animwrap" hidden style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px"><h3 style="margin:0">What the draw looks like</h3><p style="font-size:13px;color:var(--ink-2);margin-top:4px">The syringe fills to the dose you typed. Marks are the guide; the scale is the measurement.</p><div id="do-anim" class="syr-slot"></div></div></div>';
  h += renderTitration(P);
  h += '<div id="do-protocol" style="margin-top:6px"><h2>The weighing protocol</h2><p class="lede" style="font-size:15px;margin-top:4px">Every step, in order, every time. The same text is inside the Vial tracker.</p></div>' + renderProtocol();
  h += UNITS_NOTE;
  return h;
}
function wireDosing(P){
  var ids = ['do-mg', 'do-water', 'do-dose', 'do-pw', 'do-lead'], out = document.getElementById('do-out'); if (!out) return;
  function num(id){ var v = parseFloat(document.getElementById(id).value); return isFinite(v) ? v : NaN; }
  function calc(){
    var mg = num('do-mg'), w = num('do-water'), dose = num('do-dose'), pw = num('do-pw'), lead = num('do-lead'); if (!isFinite(lead)) lead = 10;
    try { localStorage.setItem('mp-dose-' + P.id, JSON.stringify({ mg: document.getElementById('do-mg').value, water: document.getElementById('do-water').value, dose: document.getElementById('do-dose').value, perWeek: document.getElementById('do-pw').value, lead: document.getElementById('do-lead').value })); } catch (e) {}
    var rows = [];
    if (isFinite(mg) && mg > 0 && isFinite(w) && w > 0){
      var conc = mg / w; rows.push(['Concentration', fmtNum(conc, 2) + ' mg/mL', fmtDose(mg) + ' mg ÷ ' + fmtNum(w, 3) + ' mL' + (Math.abs(w - mg * 0.1) < 0.0005 ? ' — the standard dilution: 10 units = 1 mg' : '')]);
      Array.prototype.slice.call(document.querySelectorAll('#titration [data-step-mg]')).forEach(function(td){ td.textContent = fmtNum(parseFloat(td.getAttribute('data-step-mg')) / conc, 3) + ' g'; });
      if (isFinite(dose) && dose > 0){
        var g = dose / conc, unc = Math.round(0.005 / g * 100), units = g * 100;
        rows.push(['Draw on the scale', fmtNum(g, 3) + ' g', '= ' + fmtNum(g, 3) + ' mL' + (unc > 0 ? ' · ±' + unc + '% at a ±5 mg scale' : '')]);
        rows.push(['Syringe cross-check', '≈ ' + fmtNum(units, 1) + ' units', 'on a U-100 (1 mL) insulin syringe — a sanity check only, never the measurement']);
        var doses = Math.floor(mg / dose + 1e-9); rows.push(['Doses in this vial', doses + (doses === 1 ? ' dose' : ' doses'), 'at ' + fmtDose(dose) + ' mg each' + (mg / dose - doses > 0.05 ? ' (' + fmtDose(mg - doses * dose) + ' mg left over)' : '')]);
        if (isFinite(pw) && pw > 0){
          var days = doses / pw * 7, run = new Date(); run.setDate(run.getDate() + Math.floor(days)); var order = new Date(run); order.setDate(order.getDate() - Math.round(lead));
          var fmt = function(dt){ return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
          rows.push(['Lasts', (days >= 14 ? fmtNum(days / 7, 1) + ' weeks' : Math.round(days) + ' days'), 'at ' + fmtDose(pw) + ' dose' + (pw === 1 ? '' : 's') + ' a week']);
          rows.push(['Runs out', fmt(run), 'if the first dose is today']);
          rows.push(['Order the next vial', 'when about a week is left', 'doses change as people go, so the tracker does not guess a date: it counts what is actually left after each draw and tells you when a week remains']);
        }
        if (unc >= 10) rows.push(['Caution', 'small draw', 'At ' + fmtNum(g, 3) + ' g the scale’s ±5 mg error is ' + unc + '% of the dose. Adding more water to the vial makes each draw larger and the error smaller.']);
      } else rows.push(['Dose', '—', 'enter the dose you plan to see the draw weight, doses per vial and the reorder date']);
    } else rows.push(['', '', 'Enter the vial label and the water weight to begin.']);
    out.innerHTML = rows.map(function(r){ return '<div class="drow' + (r[0] === 'Caution' ? ' warn' : '') + '"><span class="k">' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b><small>' + esc(r[2]) + '</small></div>'; }).join('');
    var gDraw = (isFinite(mg) && mg > 0 && isFinite(w) && w > 0 && isFinite(dose) && dose > 0) ? dose / (mg / w) : 0;
    clearTimeout(animT); animT = setTimeout(function(){ var wrap = document.getElementById('do-animwrap'); if (!wrap) return; wrap.hidden = !(gDraw > 0); if (window.syringeAnim) window.syringeAnim(document.getElementById('do-anim'), { g: gDraw > 0 ? Math.round(gDraw * 1000) / 1000 : 0, syringe: 1, liquid: 'dose', name: P.name, doseTxt: gDraw > 0 ? fmtDose(dose) + ' mg' : '' }); }, 500);
  }
  var animT;
  var waterTouched = document.getElementById('do-water').value !== '';
  document.getElementById('do-water').addEventListener('input', function(){ waterTouched = document.getElementById('do-water').value !== ''; });
  document.getElementById('do-mg').addEventListener('input', function(){ var mg = num('do-mg'); if (!waterTouched && isFinite(mg) && mg > 0) document.getElementById('do-water').value = (Math.round(mg * 100) / 1000).toFixed(3); });
  ids.forEach(function(id){ document.getElementById(id).addEventListener('input', calc); });
  calc();
  document.getElementById('do-track').addEventListener('click', function(){
    var pre = { name: P.name, mg: num('do-mg'), water: num('do-water'), dose: num('do-dose'), perWeek: num('do-pw'), lead: num('do-lead') };
    location.hash = '#dose.mix';
    if (window.vlNewVial) window.vlNewVial(pre);
  });
}
function renderStatus(P){
  var s = P.status, h = head('Approval and safety', s.headline, 'st-h');
  h += '<ul class="status">' + (s.items || []).map(function(it){ return '<li><span class="tag ' + esc(it.tag) + '">' + esc(it.label) + '</span><span>' + esc(it.text) + '</span></li>'; }).join('') + '</ul>';
  (s.cards || []).forEach(function(c){
    h += '<div class="card ' + esc(c.kind || 'warn') + '"><h3>' + esc(c.title) + '</h3>' + (c.text ? '<p' + (c.kind === 'warn' ? ' style="font-size:14px;color:var(--ink-2)"' : '') + '>' + esc(c.text) + '</p>' : '') + bullets(c.items, 'small') + (c.note ? '<p class="note">' + esc(c.note) + '</p>' : '') + '</div>';
  });
  h += detailsList(s.more);
  h += UNITS_NOTE;
  if (s.sources && s.sources.length){
    h += '<details><summary>Sources</summary><div class="body"><ol class="sources">' + s.sources.map(function(src){
      var host = ''; try { host = src.url ? new URL(src.url).hostname.replace(/^www\./, '') : ''; } catch (e) {}
      return '<li>' + esc(src.text) + (src.url ? ' <a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(host || 'link') + '</a>' : '') + '</li>';
    }).join('') + '</ol></div></details>';
  }
  h += '<footer>Educational summary of published evidence. App version @@VER@@. Not medical advice and not a guide to using any product. Talk to a doctor about any treatment decision.</footer>';
  return h;
}

function renderPeptide(P){
  CURRENT = P;
  document.querySelector('[data-panel="overview"]').innerHTML = renderOverview(P);
  document.querySelector('[data-panel="results"]').innerHTML = renderResults(P);
  document.querySelector('[data-panel="effects"]').innerHTML = renderEffects(P);
  document.querySelector('[data-panel="levels"]').innerHTML = renderLevels(P);
  document.querySelector('[data-panel="trials"]').innerHTML = renderTrials(P);
  document.querySelector('[data-panel="status"]').innerHTML = renderStatus(P);
  document.querySelector('[data-panel="dosing"]').innerHTML = renderDosing(P); wireDosing(P);
  if (window.qbTiles) window.qbTiles();   /* sub-tiles, and the Learn reading placed under each tab */
  var pill = document.getElementById('pill');
  pill.textContent = P.pill; pill.className = 'pill ' + (P.group === 'approved' ? 'ok' : (P.group === 'trials' ? 'soon' : 'no'));
  var sel = document.getElementById('pep'); if (sel.value !== P.id) sel.value = P.id;
  Array.prototype.slice.call(document.querySelectorAll('.hl li')).forEach(function(li){ li.classList.toggle('now', li.getAttribute('data-id') === P.id); });
  initSim(P.levels.pk);
}

/* ===== Learn blocks (placed under the Peptides tabs by part_fx.js): inject shared content ===== */
(function(){
  var hl = document.getElementById('learn-hl'); if (hl) hl.innerHTML = HL_TABLE;
  var vh = document.getElementById('vl-howto'); if (vh) vh.innerHTML = renderProtocol();
})();

/* ===== Modes (Peptides / Dosing / Shop / Track), sub-tabs and router ===== */
(function(){
  var $ = function(s){ return document.querySelector(s); }, $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var PTABS = ['overview', 'results', 'effects', 'levels', 'trials', 'status', 'dosing'];
  var PLABEL = { overview: 'Overview', results: 'Results', effects: 'Effects', levels: 'Levels', trials: 'Trials', status: 'Status', dosing: 'Dosing' };
  var DTABS = { vials: 'Vial tracker', mix: 'Mix a vial', levels: 'Levels' };   /* Dosing: the app's home */
  var TTABS = { track: 'Vitals' };
  /* the old Learn topics now sit under the matching Peptides tab; #learn.x and #coa links land there */
  var LEARN_TAB = { 'learn-trials': 'trials', 'learn-results': 'results', 'learn-levels': 'levels', 'learn-effects': 'effects', 'learn-status': 'status', 'learn-coa': 'status', 'learn-units': 'dosing', 'learn-weigh': 'dosing' };
  var LEARN_ANCHOR = { 'learn-units': 'do-protocol', 'learn-weigh': 'do-protocol' };   /* the Dosing tab already carries the protocol and the units warning */
  var modeBtns = $$('nav.tabs [data-mode]'), panels = $$('section[data-panel]'), sel = $('#pep'), pepWrap = $('.pep-wrap'), pill = $('#pill'), title = $('#mode-title'), sub = $('#sub-in');
  var BADGE = (function(){ var m = document.querySelector('.pep-wrap .brandmark'); return m ? m.outerHTML : ''; })();
  var groups = { approved: 'Approved medicines', trials: 'In clinical trials', research: 'Sold as "research chemicals"' };
  /* favourites: saved per person (database when signed in, this browser otherwise) and listed first in the picker */
  var FAVS = []; var favDoc = null, favWriting = false;
  try { FAVS = JSON.parse(localStorage.getItem('mp-favs') || '[]').filter(function(id){ return BY[id]; }); } catch (e) { FAVS = []; }
  var favBtn = $('#fav');
  function byName(a, b){ return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }); }
  function buildSelect(){
    var cur = sel.value; sel.innerHTML = '';
    function addGroup(label, ps){ if (!ps.length) return; var og = document.createElement('optgroup'); og.label = label; ps.forEach(function(p){ var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; og.appendChild(o); }); sel.appendChild(og); }
    addGroup('\u2605 Favourites', FAVS.map(function(id){ return BY[id]; }).filter(Boolean));
    ['approved', 'trials', 'research'].forEach(function(g){ addGroup(groups[g], PEPTIDES.filter(function(p){ return p.group === g; }).slice().sort(byName)); });
    if (cur) sel.value = cur;
  }
  var meas = document.createElement('span'); meas.className = 'meas'; meas.setAttribute('aria-hidden', 'true'); sel.parentNode.appendChild(meas);
  function sizeSelect(){ if (window.__pepLabel) window.__pepLabel(); var o = sel.options[sel.selectedIndex]; if (!o) return; meas.textContent = o.textContent; var max = Math.max(80, pepWrap.clientWidth - 44); sel.style.width = Math.min(meas.offsetWidth + 30, max) + 'px'; }
  window.addEventListener('resize', sizeSelect);
  function paintFav(){ sizeSelect(); var on = !!(CURRENT && FAVS.indexOf(CURRENT.id) >= 0); favBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); favBtn.setAttribute('aria-label', on ? 'Remove from favourites' : 'Save as a favourite'); favBtn.title = favBtn.getAttribute('aria-label'); }
  function saveFavs(){
    try { localStorage.setItem('mp-favs', JSON.stringify(FAVS)); } catch (e) {}
    if (favDoc){ favWriting = true; favDoc.set({ v: 1, favs: FAVS.slice(), updated: new Date().toISOString() }).catch(function(){}).then(function(){ favWriting = false; }); }
  }
  favBtn.addEventListener('click', function(){
    if (!CURRENT) return; var i = FAVS.indexOf(CURRENT.id);
    if (i >= 0) FAVS.splice(i, 1); else FAVS.unshift(CURRENT.id);
    saveFavs(); buildSelect(); sel.value = CURRENT.id; paintFav();
  });
  (function initFavDb(){
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){
      var db = r[0], user = r[1]; if (!db || !user) return;
      return user.id().then(function(id){
        if (!id) return; var doc = db.doc('data/users/' + id + '/prefs');
        return doc.get().then(function(snap){
          favDoc = doc;
          if (snap.exists && snap.data() && Array.isArray(snap.data().favs)){ FAVS = snap.data().favs.filter(function(x){ return BY[x]; }); try { localStorage.setItem('mp-favs', JSON.stringify(FAVS)); } catch (e) {} buildSelect(); if (CURRENT) sel.value = CURRENT.id; paintFav(); }
          else if (FAVS.length) saveFavs();
          doc.onSnapshot(function(s2){
            if (!s2.exists || s2.metadata.hasPendingWrites || favWriting) return; var d = s2.data(); if (!d || !Array.isArray(d.favs)) return;
            var next = d.favs.filter(function(x){ return BY[x]; }); if (JSON.stringify(next) === JSON.stringify(FAVS)) return;
            FAVS = next; try { localStorage.setItem('mp-favs', JSON.stringify(FAVS)); } catch (e) {} buildSelect(); if (CURRENT) sel.value = CURRENT.id; paintFav();
          });
        });
      });
    }).catch(function(){});
  })();
  buildSelect();
  var mode = 'dose', tab = 'overview', ttab = 'track', dtab = 'vials';
  function showPanel(id){ panels.forEach(function(p){ p.hidden = p.getAttribute('data-panel') !== id; }); }
  function renderSub(){
    if (mode === 'pep') sub.innerHTML = PTABS.map(function(t){ return '<button type="button" role="tab" data-tab="' + t + '" aria-selected="' + (t === tab) + '">' + PLABEL[t] + '</button>'; }).join('');
    else if (mode === 'dose') sub.innerHTML = Object.keys(DTABS).map(function(t){ return '<button type="button" role="tab" data-dtab="' + t + '" aria-selected="' + (t === dtab) + '">' + DTABS[t] + '</button>'; }).join('');
    else if (mode === 'track') sub.innerHTML = Object.keys(TTABS).map(function(t){ return '<button type="button" role="tab" data-ttab="' + t + '" aria-selected="' + (t === ttab) + '">' + TTABS[t] + '</button>'; }).join('');
    else sub.innerHTML = '';
    var on = sub.querySelector('[aria-selected="true"]'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
  }
  function apply(){
    modeBtns.forEach(function(b){ b.setAttribute('aria-selected', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
    pepWrap.hidden = mode !== 'pep'; pill.hidden = mode !== 'pep'; title.hidden = mode === 'pep'; paintFav();
    var subNav = sub.closest('nav'); if (subNav) subNav.hidden = (mode === 'shop' || mode === 'track');
    if (mode !== 'pep') title.innerHTML = (mode === 'dose' ? 'Dosing' : mode === 'shop' ? 'Shop' : 'Track') + '<small class="brandline">' + BADGE + 'Quadra Bio Tech' + (window.qbAcctHtml ? window.qbAcctHtml() : '') + '</small>';
    if (mode === 'pep') showPanel(tab);
    else if (mode === 'shop') { showPanel('shop'); if (window.qbShopRender) window.qbShopRender(); }
    else if (mode === 'dose') { showPanel(dtab === 'levels' ? 'live' : 'vials'); if (dtab === 'mix') { if (window.vtMix) window.vtMix(); else window.__wantMix = true; } else if (dtab === 'vials' && window.vtLeaveMix) window.vtLeaveMix(); else if (dtab === 'levels' && window.lvRender) window.lvRender(); }
    else showPanel('track');
    renderSub();
  }
  function setHash(){ var h = mode === 'pep' ? (CURRENT ? CURRENT.id : 'retatrutide') + '.' + tab : (mode === 'dose' ? 'dose.' + dtab : mode === 'shop' ? 'shop' : 'track'); try { history.replaceState(null, '', '#' + h); } catch (e) {} }
  function parse(h){
    h = (h || '').replace('#', ''); if (!h) return {};
    if (h === 'coa') return { mode: 'pep', tab: 'status', anchor: 'learn-coa', coa: true };
    if (h === 'shop' || h.indexOf('shop.') === 0) return { mode: 'shop' };
    if (h === 'learn' || h.indexOf('learn.') === 0) { var la = h.indexOf('learn.') === 0 ? 'learn-' + h.slice(6) : ''; return LEARN_TAB[la] ? { mode: 'pep', tab: LEARN_TAB[la], anchor: LEARN_ANCHOR[la] || la } : { mode: 'pep' }; }
    if (h === 'dose' || h.indexOf('dose.') === 0) return { mode: 'dose', dtab: DTABS[h.slice(5)] ? h.slice(5) : 'vials' };
    if (h === 'track.vials' || h === 'track.mix' || h === 'track.levels') return { mode: 'dose', dtab: h.slice(6) };   /* old bookmarks */
    if (h === 'track' || h.indexOf('track.') === 0) return { mode: 'track', ttab: 'track' };
    var i = h.indexOf('.'), out = { mode: 'pep' };
    if (i >= 0){ out.pep = h.slice(0, i); out.tab = h.slice(i + 1); if (out.tab === 'track') { out.mode = 'track'; out.ttab = 'track'; delete out.tab; } }  /* old #pep.track bookmarks */
    else if (BY[h]) out.pep = h; else out.tab = h;
    return out;
  }
  function go(o, scroll){
    o = o || {}; if (o.mode) mode = o.mode;
    if (o.pep || !CURRENT){ var P = BY[o.pep] || CURRENT || BY.retatrutide || PEPTIDES[0]; if (!CURRENT || CURRENT.id !== P.id) renderPeptide(P); }
    if (o.tab && PTABS.indexOf(o.tab) >= 0) tab = o.tab;
    if (o.ttab && TTABS[o.ttab]) ttab = o.ttab;
    if (o.dtab && DTABS[o.dtab]) dtab = o.dtab;
    apply(); setHash();
    if (o.coa) setTimeout(function(){ if (window.qbCOA) window.qbCOA.open(); }, 80);
    if (o.anchor){ scroll = false; setTimeout(function(){ var an = document.getElementById(o.anchor); if (!an) return; if (an.tagName === 'DETAILS') an.open = true; window.scrollTo(0, an.getBoundingClientRect().top + window.pageYOffset - 120); }, 60); }
    try { localStorage.setItem('mp-mode', mode); localStorage.setItem('mp-pep', CURRENT.id); localStorage.setItem('mp-tab', tab); localStorage.setItem('mp-ttab', ttab); localStorage.setItem('mp-dtab', dtab); } catch (e) {}
    if (scroll) window.scrollTo(0, 0);
  }
  var h0 = parse(location.hash);
  /* a fresh start opens on Dosing (the vial tracker); within a session the page keeps the hash it was on */
  var cold = true; try { cold = !sessionStorage.getItem('qb-open'); sessionStorage.setItem('qb-open', '1'); } catch (e) {}
  if (cold && (!h0.mode || (h0.mode === 'pep' && !h0.anchor && !h0.coa))) h0 = { mode: 'dose', dtab: 'vials' };
  try {
    if (!h0.mode) { var m = localStorage.getItem('mp-mode'); if (m === 'track' || m === 'shop' || m === 'dose') h0.mode = m; else if (m === 'pep' || m === 'learn') h0.mode = 'pep'; var dt = localStorage.getItem('mp-dtab'); if (dt && !h0.dtab && DTABS[dt]) h0.dtab = dt; }
    if (!h0.pep) h0.pep = localStorage.getItem('mp-pep') || 'retatrutide';
    if (!h0.tab) h0.tab = localStorage.getItem('mp-tab') || 'overview';
  } catch (e) { h0.pep = h0.pep || 'retatrutide'; }
  if (!h0.mode) h0.mode = 'dose';
  go(h0, false);
  modeBtns.forEach(function(b){ b.addEventListener('click', function(){ go({ mode: b.getAttribute('data-mode') }, true); }); });
  sub.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-tab')) go({ mode: 'pep', tab: b.getAttribute('data-tab') }, true);
    else if (b.hasAttribute('data-ttab')) go({ mode: 'track', ttab: b.getAttribute('data-ttab') }, true);
    else if (b.hasAttribute('data-dtab')) go({ mode: 'dose', dtab: b.getAttribute('data-dtab') }, true);
  });
  sel.addEventListener('change', function(){ go({ mode: 'pep', pep: sel.value }, true); });
  /* searchable picker: the <select> keeps the value and the change event; a button opens a sheet with a search box and the groups A to Z */
  (function(){
    var wrap = sel.parentNode; var btn = document.createElement('button'); btn.type = 'button'; btn.id = 'pep-btn'; btn.className = 'pepbtn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-label', 'Choose a peptide'); wrap.insertBefore(btn, sel); wrap.classList.add('has-btn');
    function label(){ var o = sel.options[sel.selectedIndex]; btn.innerHTML = '<span class="pepbtn-t">' + (o ? esc(o.textContent) : 'Choose a peptide') + '</span>'; }
    var sheet = document.createElement('div'); sheet.className = 'pepsheet'; sheet.hidden = true;
    sheet.innerHTML = '<div class="pepsheet-bg" data-close></div><div class="pepsheet-card" role="dialog" aria-modal="true" aria-label="Choose a peptide"><div class="pepsheet-top"><input type="search" class="pepsearch" placeholder="Type a peptide name\u2026" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Search peptides"><button type="button" class="pepsheet-x" data-close aria-label="Close">\u2715</button></div><div class="peplist" role="listbox"></div></div>';
    document.body.appendChild(sheet);
    var inp = sheet.querySelector('.pepsearch'), list = sheet.querySelector('.peplist');
    function hay(p){ return (p.name + ' ' + (p.brands || '') + ' ' + (p.maker || '') + ' ' + p.id).toLowerCase(); }
    function row(p){ return '<button type="button" role="option" class="peprow' + (p.id === sel.value ? ' on' : '') + '" data-pick="' + esc(p.id) + '" aria-selected="' + (p.id === sel.value) + '">' + esc(p.name) + (p.brands ? '<small>' + esc(p.brands) + '</small>' : '') + '</button>'; }
    /* narrowing: the name starts with what was typed, then a later word of the name, then a brand or maker name; nothing matches on letters buried mid-word */
    function starts(txt, q){ return String(txt || '').toLowerCase().split(/[\s(),\/\-]+/).some(function(w){ return w && w.indexOf(q) === 0; }); }
    function rank(p, q){ var nm = p.name.toLowerCase(); if (nm.indexOf(q) === 0) return 0; if (starts(nm, q)) return 1; if (starts(p.brands, q)) return 2; return -1; }
    function rows(q){ q = (q || '').trim().toLowerCase(); var h = '', n = 0;
      if (q){ var hits = PEPTIDES.map(function(p){ return { p: p, r: rank(p, q) }; }).filter(function(x){ return x.r >= 0; }).sort(function(a, b){ return a.r - b.r || byName(a.p, b.p); });
        n = hits.length; h = hits.length ? '<div class="pepgrp">Matches</div>' + hits.map(function(x){ return row(x.p); }).join('') : ''; }
      else { function grp(lab, ps){ if (!ps.length) return; n += ps.length; h += '<div class="pepgrp">' + esc(lab) + '</div>' + ps.map(row).join(''); }
        grp('\u2605 Favourites', FAVS.map(function(id){ return BY[id]; }).filter(Boolean));
        ['approved', 'trials', 'research'].forEach(function(g){ grp(groups[g], PEPTIDES.filter(function(p){ return p.group === g; }).slice().sort(byName)); }); }
      list.innerHTML = n ? h : '<p class="pepnone">Nothing matches \u201c' + esc(q) + '\u201d.</p>'; }
    var card = sheet.querySelector('.pepsheet-card');
    function fit(){ if (sheet.hidden) return; var vv = window.visualViewport; var h = vv ? vv.height : window.innerHeight; card.style.maxHeight = Math.max(200, h - 8) + 'px'; if (vv) card.style.transform = 'translateY(' + Math.max(0, vv.offsetTop) + 'px)'; }
    if (window.visualViewport){ window.visualViewport.addEventListener('resize', fit); window.visualViewport.addEventListener('scroll', fit); }
    function open(){ sheet.hidden = false; document.body.classList.add('pep-open'); inp.value = ''; rows(''); fit(); var on = list.querySelector('.peprow.on'); if (on) on.scrollIntoView({ block: 'center' }); setTimeout(function(){ inp.focus(); fit(); }, 60); }
    function close(){ sheet.hidden = true; document.body.classList.remove('pep-open'); }
    btn.addEventListener('click', open);
    sheet.addEventListener('click', function(e){ if (e.target.closest('[data-close]')) { close(); return; } var r = e.target.closest('[data-pick]'); if (r){ sel.value = r.getAttribute('data-pick'); sel.dispatchEvent(new Event('change', { bubbles: true })); close(); } });
    inp.addEventListener('input', function(){ rows(inp.value); list.scrollTop = 0; });
    sheet.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); else if (e.key === 'Enter' && e.target === inp){ var f = list.querySelector('[data-pick]'); if (f) f.click(); } });
    sel.addEventListener('change', label); window.__pepLabel = label; label();
  })();
  window.addEventListener('hashchange', function(){ var h = parse(location.hash); if (h.mode) go(h, true); });
})();
