/* ===== COA Checker: does this certificate cover this vial? Type what the vial says and what the certificate says; the app runs the
   six checks (supplier, peptide, lot, date, verifiable, purity + identity) and gives one verdict. Checks are saved per
   account (database when signed in, this browser otherwise). Opens from the push notice, the walkthrough, Learn and the mixing wizard. ===== */
(function(){
  'use strict';
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var KEY = 'qb-coa', LIST = [], doc = null, box = null;
  var F = blank();
  function blank(){ return { v_pep: '', v_mg: '', v_lot: '', v_sup: '', c_client: '', c_pep: '', c_lot: '', c_date: '', c_pur: '', c_id: false, c_lab: '', c_ver: false, v_qr: '', c_qr: '' }; }
  var CAM = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
  function scanBtn(kind){ return '<button type="button" class="ck-scan" data-scan="' + kind + '">' + CAM + ' Scan QR</button>'; }
  /* what the camera read, shown under the group it filled */
  function scannedHtml(kind){ var raw = kind === 'vial' ? F.v_qr : F.c_qr; if (!raw) return ''; var q = window.qbParseQR ? window.qbParseQR(raw) : { raw: raw };
    var what = q.url ? '<b>' + esc(q.host) + '</b>' + (q.report || q.lot ? ' · ' + esc(q.report || q.lot) : '') : '<b>' + esc(raw.length > 60 ? raw.slice(0, 60) + '…' : raw) + '</b>';
    return '<p class="ck-scanned">' + (kind === 'vial' ? 'From the vial’s code: ' : 'From the certificate’s code: ') + what + (q.url ? ' <a href="' + esc(q.url) + '" target="_blank" rel="noopener">' + (kind === 'vial' ? 'Open ↗' : 'Open the lab’s page ↗') + '</a>' : '') + (kind === 'cert' && q.url ? ' — if this report is there, tick <b>Verified at the source</b>.' : '') + '<button type="button" class="ck-unscan" data-unscan="' + kind + '" aria-label="Clear">✕</button></p>'; }
  function applyScan(kind, txt){ var q = window.qbParseQR ? window.qbParseQR(txt) : null; if (!q) return;
    if (kind === 'vial') { F.v_qr = q.raw; if (q.pep) F.v_pep = q.pep; if (q.mg) F.v_mg = q.mg; if (q.lot) F.v_lot = q.lot; if (q.host && !F.v_sup) F.v_sup = q.host; }
    else { F.c_qr = q.raw; if (q.lot && !F.c_lot) F.c_lot = q.lot; if (q.pep && !F.c_pep) F.c_pep = q.pep; if (q.host && !F.c_lab) F.c_lab = q.host; }
    try { localStorage.setItem(KEY + '-draft', JSON.stringify(F)); } catch (e) {}
    var sc = box.scrollTop; box.innerHTML = html(); paintChecks(); paintSaved(); box.scrollTop = sc;
    var t = document.createElement('div'); t.className = 'qb-toast'; t.textContent = kind === 'vial' ? (q.lot ? 'Vial read: lot ' + q.lot : 'Code read') : (q.url ? 'Certificate code read' : 'Code read'); document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 1800); }
  try { LIST = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(LIST)) LIST = []; } catch (e) { LIST = []; }
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(LIST)); } catch (e) {} if (doc) doc.set({ v: 1, list: LIST.slice(0, 50), updated: new Date().toISOString() }).catch(function(){}); }
  if (window.qbUserDoc) window.qbUserDoc('coa').then(function(d){ if (!d) return; doc = d; return d.get().then(function(snap){
    var remote = snap.exists && snap.data() && Array.isArray(snap.data().list) ? snap.data().list : [];
    var seen = {}, merged = [];
    remote.concat(LIST).forEach(function(e){ if (e && e.id && !seen[e.id]) { seen[e.id] = 1; merged.push(e); } });
    merged.sort(function(a, b){ return (b.t || '').localeCompare(a.t || ''); });
    var changed = JSON.stringify(merged) !== JSON.stringify(LIST); LIST = merged.slice(0, 50);
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(LIST)); } catch (e) {} if (box) paintSaved(); }
    if (merged.length !== remote.length) d.set({ v: 1, list: LIST, updated: new Date().toISOString() }).catch(function(){});
  }); }).catch(function(){});

  function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function same(a, b){ a = norm(a); b = norm(b); if (!a || !b) return null; if (a === b) return true; if (a.length >= 3 && b.length >= 3 && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0)) return true; return false; }
  function num(v){ var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : NaN; }
  function ago(d){ var days = Math.round((Date.now() - d.getTime()) / 86400000); if (days < 0) return 'dated in the future'; if (days < 1) return 'dated today'; if (days < 45) return days + ' day' + (days === 1 ? '' : 's') + ' ago'; var m = Math.round(days / 30.4); if (m < 24) return m + ' month' + (m === 1 ? '' : 's') + ' ago'; return (Math.round(days / 36.5) / 10) + ' years ago'; }

  /* the six checks: st = ok | bad | na (not filled in yet); tour = step index on the example certificate. The lab does not report how much was in the vial, so there is no amount check (Aaron, Nov 2026). */
  function checks(){
    var out = [];
    var s = same(F.v_sup, F.c_client);
    out.push({ k: 'supplier', t: 'Supplier named', st: s === null ? 'na' : (s ? 'ok' : 'bad'), tour: 0,
      msg: s === null ? 'Who you bought from, and who the certificate was issued to.' : (s ? 'Issued to the company you bought from.' : 'Issued to a different company. A certificate for someone else’s order does not cover your vial.') });
    var p = same(F.v_pep, F.c_pep);
    out.push({ k: 'identity', t: 'Peptide identity', st: p === null ? 'na' : (p ? 'ok' : 'bad'), tour: 1,
      msg: p === null ? 'The peptide on the label and the compound on the certificate.' : (p ? 'Same compound on the label and the certificate.' : 'The certificate is for a different compound.') });
    var l = (norm(F.v_lot) && norm(F.c_lot)) ? (norm(F.v_lot) === norm(F.c_lot)) : null;
    out.push({ k: 'batch', t: 'Lot / batch number', st: l === null ? 'na' : (l ? 'ok' : 'bad'), tour: 2,
      msg: l === null ? 'Printed on the vial and on the certificate; they must match character for character.' : (l ? 'Lot numbers match.' : 'Lot numbers differ. A certificate for another lot proves nothing about yours.') });
    var d = F.c_date ? new Date(F.c_date + 'T00:00:00') : null, days = d && !isNaN(d.getTime()) ? (Date.now() - d.getTime()) / 86400000 : NaN;
    var cur = isNaN(days) ? null : (days >= -1 && days <= 365);
    out.push({ k: 'date', t: 'Current', st: cur === null ? 'na' : (cur ? 'ok' : 'bad'), tour: 3,
      msg: cur === null ? 'The report date. A recent report for this lot, not last year’s re-used across new batches.' : (cur ? 'Report ' + ago(d) + '.' : (days < 0 ? 'The report is dated in the future. Check the date.' : 'Report ' + ago(d) + ': too old to vouch for a lot sold today.')) });
    out.push({ k: 'verify', t: 'Verifiable', st: F.c_ver ? 'ok' : 'na', tour: 4,
      msg: F.c_ver ? 'You found this report on the lab’s own website.' : 'Open the lab’s own website and look the report number or QR code up there. A certificate you cannot verify is just a picture.' });
    var pur = num(F.c_pur), purSt = !isFinite(pur) ? 'na' : (pur >= 98 ? 'ok' : 'bad'), idSt = F.c_id ? 'ok' : 'na';
    var tst = (purSt === 'ok' && idSt === 'ok') ? 'ok' : (purSt === 'bad' ? 'bad' : 'na');
    out.push({ k: 'tests', t: 'Purity and identity', st: tst, tour: 5,
      msg: tst === 'ok' ? 'Purity ' + pur + '% by HPLC and identity confirmed by mass spectrometry.' : (purSt === 'bad' ? 'Purity ' + pur + '% is below 98%. Clean lots test at 98–99%+; ask the supplier for a cleaner lot.' : (!isFinite(pur) ? 'Purity (HPLC, a percentage) and identity (mass spectrometry) must both be on the certificate set. Endotoxin or heavy-metal pages are extras, not substitutes.' : 'Tick identity once the certificate shows the mass spectrum matched.')) });
    return out;
  }
  function verdict(cs){
    var bad = cs.filter(function(c){ return c.st === 'bad'; }), na = cs.filter(function(c){ return c.st === 'na'; });
    if (!bad.length && !na.length) return { pass: true };
    return { pass: false, bad: bad, na: na };
  }

  function pepList(){ var P = window.PEPTIDES || []; return '<datalist id="ck-peps">' + P.map(function(p){ return '<option value="' + esc(p.name) + '">'; }).join('') + '</datalist>'; }
  function f(id, label, attrs, cls){ return '<label class="ck-f">' + label + '<input id="' + id + '" ' + attrs + ' class="' + (cls || '') + '" value="' + esc(F[id.slice(3)]) + '"></label>'; }
  function html(){
    return '<div class="ck-bar"><span>COA Checker</span><button type="button" class="ct-x" data-ck="close" aria-label="Close">✕</button></div>' +
      '<div class="ck-in">' +
      '<div class="ck-hero"><div class="kick"><div class="eyebrow">Tool · COA</div><span class="tag2">Interactive</span></div><h1>Does this certificate cover this vial?</h1><p>Type what is printed on your vial, then what the certificate of analysis says. Six checks, one verdict. NO COA, NO DOSE.</p></div>' +
      '<div class="card ck-grp"><h3><i>1</i>Your vial' + scanBtn('vial') + '</h3>' + scannedHtml('vial') + '<div class="ck-two">' +
        f('ck-v_pep', 'Peptide on the label', 'list="ck-peps" autocomplete="off" placeholder="Retatrutide"') + pepList() +
        f('ck-v_mg', 'Amount on the label (mg), for your vial record', 'type="number" inputmode="decimal" step="any" min="0" placeholder="15"', 'mono') +
        f('ck-v_lot', 'Lot / batch on the vial', 'autocomplete="off" autocapitalize="characters" placeholder="QB-2401"', 'mono') +
        f('ck-v_sup', 'Who you bought it from', 'autocomplete="off" placeholder="Supplier name"') + '</div></div>' +
      '<div class="card ck-grp"><h3><i>2</i>The certificate' + scanBtn('cert') + '</h3>' + scannedHtml('cert') + '<div class="ck-two">' +
        f('ck-c_client', 'Issued to (client / customer)', 'autocomplete="off" placeholder="Name on the certificate"') +
        f('ck-c_pep', 'Compound tested', 'list="ck-peps" autocomplete="off" placeholder="Retatrutide"') +
        f('ck-c_lot', 'Lot / batch on the certificate', 'autocomplete="off" autocapitalize="characters" placeholder="QB-2401"', 'mono') +
        f('ck-c_date', 'Report date', 'type="date"', 'mono') +
        f('ck-c_pur', 'Purity by HPLC (%)', 'type="number" inputmode="decimal" step="any" min="0" max="100" placeholder="99.1"', 'mono') +
        f('ck-c_lab', 'Laboratory (optional)', 'autocomplete="off" placeholder="Third-party lab named on it"') + '</div>' +
        '<label class="ck-chk"><input type="checkbox" id="ck-c_id"' + (F.c_id ? ' checked' : '') + '><span><b>Identity confirmed</b> — the certificate says the mass spectrum (MS) matched the expected peptide.</span></label>' +
        '<label class="ck-chk"><input type="checkbox" id="ck-c_ver"' + (F.c_ver ? ' checked' : '') + '><span><b>Verified at the source</b> — I opened the lab’s own website and found this report there (report number or QR code).</span></label>' +
      '</div>' +
      '<div class="card ck-grp"><h3><i>3</i>The six checks</h3><ul class="ck-list" id="ck-checks"></ul><div id="ck-verdict"></div></div>' +
      '<div class="card ck-grp" id="ck-savedwrap"' + (LIST.length ? '' : ' hidden') + '><h3><i>✓</i>Checked vials</h3><ul class="ck-saved" id="ck-saved"></ul></div>' +
      '<p class="note">An example certificate with each field lit up is behind every “Show me”. Scan QR reads the code on a vial or a certificate and fills in what it carries; everything else is what you type. Keep the PDF with your vial record.</p>' +
      '</div>';
  }
  var lastSig = '';
  function upd(){ read(); var sig = JSON.stringify(F); if (sig === lastSig) return; lastSig = sig; paintChecks(); }
  function paintChecks(){
    lastSig = JSON.stringify(F);
    var cs = checks(), v = verdict(cs), ul = box.querySelector('#ck-checks'), vd = box.querySelector('#ck-verdict');
    ul.innerHTML = cs.map(function(c, i){ return '<li class="' + c.st + '"><i>' + (c.st === 'ok' ? '✓' : (c.st === 'bad' ? '✕' : (i + 1))) + '</i><div><b>' + esc(c.t) + '</b><span>' + esc(c.msg) + '</span></div><button type="button" class="ck-show" data-tour="' + c.tour + '">Show me</button></li>'; }).join('');
    if (v.pass) {
      vd.innerHTML = '<div class="ck-verdict ok"><div class="eyebrow">Verdict</div><h2>This COA covers this vial.</h2><p>' + esc(F.v_pep) + ' · ' + esc(F.v_mg) + ' mg · lot ' + esc(F.v_lot) + ' · from ' + esc(F.v_sup) + '. Keep the certificate with the vial record.</p>' +
        '<div class="btn-row"><button type="button" class="btn" data-ck="mix">Save and mix this vial</button><button type="button" class="btn ghost" data-ck="save">Save the check</button></div></div>';
    } else {
      var lines = v.bad.map(function(c){ return '<li><b>' + esc(c.t) + ':</b> ' + esc(c.msg) + '</li>'; });
      var todo = v.na.map(function(c){ return c.t; });
      vd.innerHTML = '<div class="ck-verdict ' + (v.bad.length ? 'bad' : '') + '"><div class="eyebrow">Verdict</div><h2>' + (v.bad.length ? 'NO COA, NO DOSE.' : 'Not checked yet.') + '</h2>' +
        (v.bad.length ? '<p>This certificate does not cover this vial. Do not mix or dose from it until the supplier sends one that does.</p><ul>' + lines.join('') + '</ul>' : '') +
        (todo.length ? '<p class="note" style="color:var(--ink-2)">Still to fill in: ' + esc(todo.join(', ')) + '.</p>' : '') +
        (v.bad.length ? '<p class="note" style="color:var(--ink-2)">Ask the supplier for: the certificate for <b>lot ' + esc(F.v_lot || '…') + '</b> of <b>' + esc(F.v_pep || 'this peptide') + '</b>, from an independent lab, showing purity (HPLC) and identity (MS), issued to them, dated for this lot.</p><div class="btn-row"><button type="button" class="btn ghost" data-ck="save">Save the check anyway</button></div>' : '') + '</div>';
    }
  }
  function paintSaved(){
    var ul = box && box.querySelector('#ck-saved'), wrap = box && box.querySelector('#ck-savedwrap'); if (!ul) return;
    wrap.hidden = !LIST.length;
    ul.innerHTML = LIST.map(function(e){ var d = new Date(e.t); return '<li><span class="chip ' + (e.pass ? 'ok' : 'bad') + '">' + (e.pass ? 'Covered' : 'Not covered') + '</span><div class="t"><b>' + esc(e.pep || 'Peptide') + (e.mg ? ' · ' + esc(e.mg) + ' mg' : '') + '</b><span>lot ' + esc(e.lot || '—') + (e.sup ? ' · ' + esc(e.sup) : '') + ' · ' + (isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })) + '</span></div><button type="button" class="ld" data-load="' + esc(e.id) + '">Load</button><button type="button" class="x" data-del="' + esc(e.id) + '" aria-label="Remove">✕</button></li>'; }).join('');
  }
  function save(){
    var cs = checks(), v = verdict(cs);
    var e = { id: 'c' + Date.now().toString(36), t: new Date().toISOString(), pep: F.v_pep, mg: F.v_mg, lot: F.v_lot, sup: F.v_sup, pass: v.pass, fails: v.pass ? [] : v.bad.map(function(c){ return c.k; }).concat(v.na.map(function(c){ return c.k; })), f: F };
    LIST = [e].concat(LIST.filter(function(x){ return !(x.lot && norm(x.lot) === norm(e.lot) && norm(x.pep) === norm(e.pep)); })).slice(0, 50);
    persist(); paintSaved(); return e;
  }
  function read(){ var ids = ['v_pep', 'v_mg', 'v_lot', 'v_sup', 'c_client', 'c_pep', 'c_lot', 'c_date', 'c_pur', 'c_lab'];
    ids.forEach(function(k){ var el = box.querySelector('#ck-' + k); if (el) F[k] = el.value; });
    ['c_id', 'c_ver'].forEach(function(k){ var el = box.querySelector('#ck-' + k); if (el) F[k] = !!el.checked; });
    try { localStorage.setItem(KEY + '-draft', JSON.stringify(F)); } catch (e) {} }
  function close(){ if (!box) return; box.remove(); box = null; if (!document.querySelector('.wk')) document.body.classList.remove('wk-locked'); }
  function open(pre){
    try { var dr = JSON.parse(localStorage.getItem(KEY + '-draft') || 'null'); if (dr && typeof dr === 'object') F = Object.assign(blank(), dr); } catch (e) {}
    if (pre) { if (pre.pep) F.v_pep = pre.pep; if (pre.mg) F.v_mg = pre.mg; if (pre.lot) F.v_lot = pre.lot; if (pre.sup) F.v_sup = pre.sup; }
    if (!box) { box = document.createElement('div'); box.className = 'ck'; document.body.appendChild(box); document.body.classList.add('wk-locked');
      /* re-paint only when a value actually changed: the blur-time 'change' event must not rebuild the verdict under a tap on Save */
      box.addEventListener('input', upd);
      box.addEventListener('change', upd);
      box.addEventListener('click', function(e){
        var b = e.target.closest('[data-ck],[data-tour],[data-load],[data-del],[data-scan],[data-unscan]'); if (!b) return;
        if (b.hasAttribute('data-scan')) { var kind = b.getAttribute('data-scan'); if (!window.qbScan) return; read();
          window.qbScan(kind === 'vial' ? { title: 'Scan the code on the vial', hint: 'Hold the vial’s QR code inside the frame. The label fills in by itself.' } : { title: 'Scan the code on the certificate', hint: 'The lab’s “scan to verify” code. Then open the lab’s page and tick Verified at the source if the report is there.' }).then(function(txt){ if (txt) applyScan(kind, txt); });
          return; }
        if (b.hasAttribute('data-unscan')) { read(); if (b.getAttribute('data-unscan') === 'vial') F.v_qr = ''; else F.c_qr = ''; var sc2 = box.scrollTop; box.innerHTML = html(); paintChecks(); paintSaved(); box.scrollTop = sc2; return; }
        if (b.hasAttribute('data-tour')) { if (window.qbWalk && window.qbWalk.coa) window.qbWalk.coa(+b.getAttribute('data-tour')); return; }
        if (b.hasAttribute('data-load')) { var e2 = LIST.filter(function(x){ return x.id === b.getAttribute('data-load'); })[0]; if (e2 && e2.f) { F = Object.assign(blank(), e2.f); var sc = box.scrollTop; box.innerHTML = html(); paintChecks(); paintSaved(); box.scrollTop = 0; } return; }
        if (b.hasAttribute('data-del')) { LIST = LIST.filter(function(x){ return x.id !== b.getAttribute('data-del'); }); persist(); paintSaved(); return; }
        var a = b.getAttribute('data-ck');
        if (a === 'close') close();
        else if (a === 'save') { save(); var t = document.createElement('div'); t.className = 'qb-toast'; t.textContent = 'Saved under Checked vials'; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 1800); }
        else if (a === 'mix') { var en = save(); close(); location.hash = '#dose.mix'; setTimeout(function(){ if (window.vlNewVial) window.vlNewVial({ name: en.pep, mg: num(en.mg), src: (en.sup ? en.sup + ' · ' : '') + 'lot ' + en.lot + ' · COA checked' }); }, 60); }
      });
    }
    box.innerHTML = html(); paintChecks(); paintSaved(); box.scrollTop = 0;
    if (window.qbDeco) window.qbDeco(box);
  }
  function last(){ for (var i = 0; i < LIST.length; i++) if (LIST[i].pass) return LIST[i]; return null; }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-coa]'); if (!b) return; e.preventDefault();
    var pre = null; if (b.getAttribute('data-coa') === 'wiz' && window.vtWizDraft) { var w = window.vtWizDraft(); if (w) pre = { pep: w.name, mg: w.mg }; }
    open(pre);
  });
  window.qbCOA = { open: open, close: close, last: last, list: function(){ return LIST.slice(); } };
})();
