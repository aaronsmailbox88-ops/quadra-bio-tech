/* ===== First-run walkthrough: "Read this before mixing or dosing". Shown once per account after sign-in (or first open); reopenable from the vial tracker. ===== */
(function(){
  'use strict';
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var PAGES = [
    { k: 'Before you start', h: 'Read this before mixing or dosing.', p: ['Five minutes now saves a vial later.', 'This app explains the published research on each peptide and keeps your records straight. It is an educational tool: not medical advice, and it sells nothing.'] },
    { k: 'The peptide', h: 'NO 3RD PARTY COA. NO DOSE.', warn: 'If your supply does not have a current third-party Certificate of Analysis (COA) naming the brand, the batch number, and the product contained inside the vial, you have an untested product, and you should not use it.', p: ['A COA is the independent lab\u2019s report for your exact lot: purity and identity, not a generic sheet from the seller.', 'A pre-filled pen sold as a research product cannot be matched to a COA.'] },
    { k: 'The method', h: 'Everything is weighed.', p: ['Syringe marks lie; a 0.001 g scale does not. The water going in, every draw and what is left in the vial are all weighed, and the app does the arithmetic.', 'Say milligrams, never units. The kit you need is under Shop, with one-click ordering.'] },
    { k: 'Mixing', h: 'Water, filter, look.', p: ['Bacteriostatic water only; plain sterile water makes a single-session vial.', 'Push the finished solution through a 0.22 µm filter into a new sterile vial, then hold it up to the light: perfectly clear, no floating particles, all powder dissolved. If not, do not use that vial.', 'The Mix a vial wizard walks you through it one step at a time.'] },
    { k: 'Dosing', h: 'Low, slow, logged.', p: ['Start at the lowest step and stay there until your weekly weigh-in plateaus. Whether you can feel the drug is not the signal; the scale is.', 'Log each dose right after you draw it. Dosing → Levels then shows how much is in your blood at any moment.'] },
    { k: 'Safety', h: 'Know the warning signs first.', p: ['Side effects cluster in the days after a dose step and usually ease. Each peptide page lists its own warning signs under Effects, with what to do and when to stop. Read it before the first dose.', 'If something feels seriously wrong, stop and get medical care. This app cannot judge that for you.'] },
    { k: 'Where things live', h: 'Four tabs.', p: ['Dosing: your vials, the mixing wizard and live levels. The app opens here.', 'Peptides: the evidence, dose by dose, with the background reading under each tab.', 'Shop: the kit, with one-click ordering.', 'Track: blood pressure, blood sugar, weight.', 'You can read this again any time from Dosing → Vial tracker.'] }
  ];
  var box = null, i = 0, done = false, doc = null;

  /* ---- COA tour: one pop-up per field, each highlighted on an example certificate ---- */
  var COA_IMG = '@@COA_IMG@@';
  var COA_STEPS = [
    { k: 'supplier', t: 'Supplier name here', p: 'The company you bought from must be named on the certificate. Not a distributor, not a blank, not a first name.', box: [57.41, 19.53, 12.06, 2.96] },
    { k: 'identity', t: 'Peptide identity', p: 'The compound must be the peptide on your vial\u2019s label, spelled the same way. Retatrutide on the label means Retatrutide here.', box: [4.36, 33.37, 24.71, 2.13] },
    { k: 'batch', t: 'Peptide batch number', p: 'The lot number must match the one printed on your vial, character for character. A certificate for another lot proves nothing about yours.', box: [4.36, 37.04, 31.98, 2.13] },
    { k: 'date', t: 'Current', p: 'A recent report for this lot. An old certificate re-used across new batches is the commonest trick.', box: [4.36, 15.38, 21.51, 2.37] },
    { k: 'verify', t: 'Verify it', p: 'A code or QR you can check on the lab\u2019s own website. A certificate you cannot verify is just a picture.', box: [36.63, 13.25, 13.37, 13.25] },
    { k: 'tests', t: 'What was tested', p: 'This page is a heavy-metals screen. Your certificate set must also show purity (HPLC, a percentage) and identity (mass spectrometry). Endotoxin and metals are extras, not substitutes.', box: [4.36, 52.54, 91.57, 21.54] }
  ];
  var ct = null, ci = 0;
  function ctHtml(){
    var st = COA_STEPS[ci], b = st.box, last = ci === COA_STEPS.length - 1;
    return '<div class="ct-bar"><span>Reading a COA</span><button type="button" class="ct-x" data-ct="close" aria-label="Close">\u2715</button></div>' +
      '<div class="ct-stage"><div class="ct-img"><img src="' + COA_IMG + '" alt="Example certificate of analysis"><div class="ct-hl" style="left:' + b[0] + '%;top:' + b[1] + '%;width:' + b[2] + '%;height:' + b[3] + '%"></div></div></div>' +
      '<div class="ct-card"><div class="ct-n">' + (ci + 1) + ' of ' + COA_STEPS.length + '</div><h3>' + esc(st.t) + '</h3><p>' + esc(st.p) + '</p>' +
      '<div class="ct-nav">' + (ci > 0 ? '<button type="button" class="btn ghost" data-ct="back">Back</button>' : '<span></span>') + (last ? '<button type="button" class="btn ghost" data-ct="close">Done</button><button type="button" class="btn ct-next" data-ct="check">Check mine</button>' : '<button type="button" class="btn ct-next" data-ct="next">Next</button>') + '</div></div>';
  }
  function ctPaint(){ if (!ct) return; ct.innerHTML = ctHtml(); var hl = ct.querySelector('.ct-hl'); if (hl) setTimeout(function(){ try { hl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); } catch (e) {} }, 60); }
  function coaTour(start){ ci = (typeof start === 'number' && start >= 0 && start < COA_STEPS.length) ? start : 0; if (!ct) { ct = document.createElement('div'); ct.className = 'ct'; document.body.appendChild(ct); document.body.classList.add('wk-locked');
      ct.addEventListener('click', function(e){ var b = e.target.closest('[data-ct]'); if (!b) return; var a = b.getAttribute('data-ct');
        if (a === 'next') { ci = Math.min(COA_STEPS.length - 1, ci + 1); ctPaint(); } else if (a === 'back') { ci = Math.max(0, ci - 1); ctPaint(); } else if (a === 'close' || a === 'check') { ct.remove(); ct = null; if (!box && !document.querySelector('.ck')) document.body.classList.remove('wk-locked'); if (a === 'check' && window.qbCOA) window.qbCOA.open(); } }); }
    ctPaint(); }

  try { done = localStorage.getItem('qb-walk') === 'done'; } catch (e) {}
  function html(){
    var pg = PAGES[i], last = i === PAGES.length - 1;
    return '<div class="wk-card" role="dialog" aria-modal="true" aria-labelledby="wk-h"><div class="wk-top"><span class="wk-k">' + esc(pg.k) + '</span><span class="wk-n">' + (i + 1) + ' / ' + PAGES.length + '</span></div>' +
      '<h2 id="wk-h">' + esc(pg.h) + '</h2>' + (pg.warn ? '<p class="wk-warn">' + esc(pg.warn) + '</p>' : '') + pg.p.map(function(t){ return '<p>' + esc(t) + '</p>'; }).join('') + (pg.k === 'The peptide' ? '<div class="btn-row wk-coa"><button type="button" class="btn" data-wk="coa">Check my COA</button><button type="button" class="btn ghost" data-wk="tour">See an example</button></div>' : '') +
      '<div class="wk-dots">' + PAGES.map(function(_, j){ return '<i class="' + (j === i ? 'on' : '') + (j < i ? ' past' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="wk-nav">' + (i > 0 ? '<button type="button" class="btn ghost" data-wk="back">Back</button>' : '<button type="button" class="btn ghost" data-wk="skip">Not now</button>') +
      '<button type="button" class="btn wk-next" data-wk="' + (last ? 'done' : 'next') + '">' + (last ? 'I have read it' : 'Next') + '</button></div></div>';
  }
  function paint(){ if (box) { box.innerHTML = html(); box.scrollTop = 0; var n = box.querySelector('.wk-next'); if (n) try { n.focus({ preventScroll: true }); } catch (e) {} } }
  function open(start){ i = start || 0; if (!box) { box = document.createElement('div'); box.className = 'wk'; document.body.appendChild(box); document.body.classList.add('wk-locked');
      box.addEventListener('click', function(e){ var b = e.target.closest('[data-wk]'); if (!b) return; var a = b.getAttribute('data-wk');
        if (a === 'next') { i = Math.min(PAGES.length - 1, i + 1); paint(); } else if (a === 'back') { i = Math.max(0, i - 1); paint(); } else if (a === 'skip') close(false); else if (a === 'done') close(true); else if (a === 'coa') { if (window.qbCOA) window.qbCOA.open(); } else if (a === 'tour') coaTour(); }); }
    paint(); }
  function close(finished){ if (box) { box.remove(); box = null; } document.body.classList.remove('wk-locked');
    if (finished) { done = true; try { localStorage.setItem('qb-walk', 'done'); } catch (e) {} if (doc) doc.set({ v: 1, done: new Date().toISOString() }).catch(function(){}); } }
  /* the COA notice: a push-style banner on every launch; on the first run the walkthrough follows it */
  var push = null, pushed = false;
  function notice(then){
    if (push || pushed) { if (then) then(); return; } pushed = true;
    var never = false; try { never = localStorage.getItem('qb-coa-notice') === 'off'; } catch (e) {}
    if (never) { if (then) then(); return; }   /* dismissed permanently on this device */
    /* front and centre, and blocking: the app cannot be used until OK (or Check COA) is tapped; shown on every launch */
    push = document.createElement('div'); push.className = 'qb-pushwrap';
    var ic = window.QB_MARK || (function(){ var m = document.querySelector('.pep-wrap .brandmark, .brandmark'); return m ? m.outerHTML : ''; })();
    push.innerHTML = '<div class="qb-push" role="alertdialog" aria-modal="true" aria-labelledby="qb-push-h">' + (ic ? '<span class="qb-push-i">' + ic + '</span>' : '') + '<div class="qb-push-t"><div class="eyebrow">Before anything else</div><b id="qb-push-h"><span class="l1">NO 3RD PARTY COA</span><span class="l2">NO DOSE.</span></b><span>Only use a peptide for research with a current third-party Certificate of Analysis naming the brand, the batch number, and the purity of the product contained inside the vial. Anything else is untested. <b>Do not use it.</b></span></div><div class="qb-push-b"><button type="button" class="qb-push-go">Check COA</button><button type="button" class="qb-push-x">OK, understood</button><button type="button" class="qb-push-never">Don\u2019t show this again</button></div></div>';
    document.body.appendChild(push); document.body.classList.add('wk-locked');
    function off(){ if (!push) return; var el = push; push = null; el.classList.add('out'); setTimeout(function(){ el.remove(); }, 260); if (!box && !document.querySelector('.ck')) document.body.classList.remove('wk-locked');
      /* the app opens on Dosing once the notice is out of the way (unless a deep link brought the user somewhere specific) */
      if (!window.QB_DEEP && (location.hash || '').indexOf('#dose') !== 0) { try { location.hash = '#dose.vials'; } catch (e) {} }
      if (then) then(); }
    push.querySelector('.qb-push-x').addEventListener('click', off);
    push.querySelector('.qb-push-go').addEventListener('click', function(){ then = null; off(); if (window.qbCOA) window.qbCOA.open(); });
    push.querySelector('.qb-push-never').addEventListener('click', function(){ try { localStorage.setItem('qb-coa-notice', 'off'); } catch (e) {} off(); });
    try { push.querySelector('.qb-push-x').focus({ preventScroll: true }); } catch (e) {}
  }
  function maybe(){ if (box) return; setTimeout(function(){ if (document.getElementById('qb-gate')) return; notice(function(){ if (!done && !box) open(0); }); }, 400); }
  // account sync: a device that has not seen it checks the account first
  if (window.qbUserDoc) window.qbUserDoc('walkthrough').then(function(d){ if (!d) return; doc = d; return d.get().then(function(snap){ if (snap.exists && snap.data() && snap.data().done) { done = true; try { localStorage.setItem('qb-walk', 'done'); } catch (e) {} if (box) close(false); } else if (done) d.set({ v: 1, done: new Date().toISOString() }).catch(function(){}); }); }).catch(function(){});
  window.qbWalk = { open: function(){ open(0); }, coa: coaTour, maybe: maybe, reset: function(){ done = false; try { localStorage.removeItem('qb-walk'); } catch (e) {} } };
  if (!window.QB_SB) maybe();   // no sign-in gate in this build: show on first open; the gated build calls maybe() after sign-in
})();
