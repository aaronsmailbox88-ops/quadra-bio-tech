/* ===== Weighing protocol, storage rules and titration content (shared by Dosing, Learn and the Vial tracker) ===== */
var PROTOCOL = [
  { id: 'scale', h: 'A. Set up and check the scale — every session', intro: 'Two minutes, every time, before anything touches the pan. A scale that is wrong by 10 mg is wrong on every dose.', steps: [
    ['Place the scale on a hard, level surface', 'Hard, level surface. No fan, no open window, no draft, not next to the fridge motor. Flip the clear lid back out of the way; it stays open.'],
    ['Turn the scale on and wait for 0.000', 'Press ON with nothing on the pan. Wait until it reads 0.000 and stays there for 10 seconds. If it drifts, press TARE and wait again.'],
    ['Test the scale with one 20 g weight', 'Put one of the two 20 g calibration weights in the middle of the pan. Wait for the number to stop moving. It must read between 19.995 and 20.005 g.'],
    ['If the test fails, calibrate the scale', 'Remove the weight. Hold the CAL button until the display shows CAL, put the 20 g weight on when it asks, wait for PASS, remove the weight. Test again with the weight. If it still fails, the scale is not fit to dose with.'],
    ['Take the weight off; the scale must go back to 0.000', 'Take the weight off. The display must return to 0.000 (press TARE if it does not). Leave the scale on for the whole session; do not move it once it is zeroed.'],
    ['Wash your hands; dry the pan', 'Wash and dry your hands. Wipe the pan with an alcohol swab and let it dry completely — a wet pan weighs more. Everything you weigh must be dry on the outside.']
  ]},
  { id: 'mix', h: 'B. Mixing a new vial — once per vial', intro: 'The whole point: you will know, in grams, how much water is in the vial, so the concentration is a measurement instead of a hope — and the finished solution is sterile-filtered into a new vial before anything is dosed. One action per page; Track → Mix a vial asks for the same weights with photos.', steps: [
    ["Lay everything out on the table", "The peptide vial, the bacteriostatic water, three 1 mL (U-100) insulin syringes, the filter kit (a 3 mL Luer-lock syringe with needle, a spare needle, one 0.22 \u00b5m PES syringe filter, one sealed sterile empty vial), alcohol swabs, the scale (checked as in A), and this app open at 'Mix a vial' in Track, which asks for each weight in turn and reads it from a photo of the display."],
    ["Flip the cap off the peptide vial", "Flip the plastic cap off. Do not remove the rubber stopper or the metal ring \u2014 the needle goes through the stopper."],
    ["Weigh the dry peptide vial", "Put the peptide vial on the pan, cap off. Wait until the number stops changing (about 3 seconds). Photograph the display or type it in: Vial dry = ___ g."],
    ["Unwrap a new syringe", "Take a new 1 mL syringe out of its wrapper. Pull the needle cover straight off and keep it beside you. The needle touches nothing but the stoppers from here on."],
    ["Tare the scale on the bare syringe", "Lay the bare syringe across the pan so it rests on nothing but the pan \u2014 not the scale body, not the table. Press TARE. The display must read 0.000 with the syringe on it."],
    ["Pull the plunger back to the 100 mark", "Lift the syringe off the pan and pull the plunger back to the 100 mark: the barrel is now full of air (1 mL)."],
    ["Wipe the water vial stopper with an alcohol swab", "Fresh swab across the bacteriostatic water vial's stopper; let it dry on its own. Nothing touches it but the needle."],
    ["Push the needle into the water vial and push the air in", "Push the needle straight through the water vial's stopper and press the plunger all the way in. That air replaces the water you are about to take, so the vial does not pull a vacuum on you."],
    ["Turn the water vial upside down and draw slowly to the 100 mark", "Vial upside down, needle tip under the water, pull the plunger back SLOWLY until the bottom of the curved water surface sits on the 100 mark. A fast pull makes bubbles."],
    ["Bubbles? Pull past the mark and push back", "If there are bubbles, pull 10\u201320 units past the mark, tap the barrel so the bubbles rise to the needle end, then push the plunger back until the water sits exactly on the mark. The bubbles leave with the extra."],
    ["Pull the needle out of the water vial", "Straight out. Stand the water vial aside; put its cap on if it has one."],
    ["Weigh the water-filled syringe", "Lay the full syringe on the tared pan exactly the way you laid the empty one. The number is the water in grams, and grams of water are millilitres. Photograph the display or type it in: Draw 1 = ___ g (close to 1.000, rarely exact)."],
    ["Wipe the peptide vial stopper with an alcohol swab", "Now, right before the needle goes in: fresh alcohol swab across the top of the rubber stopper, let it dry on its own, and do not touch it again."],
    ["Vent the peptide vial", "The vial is sealed under vacuum or pressure. Take a second syringe, pull its plunger all the way out and throw the plunger away. Push that needle through the edge of the peptide vial's stopper and leave it standing there: the vial can now breathe through it, so nothing pushes back into your syringe."],
    ["Inject the water down the glass", "Push the water syringe through the stopper at a different spot, aim the needle at the glass wall and press the plunger slowly so the water runs down the side onto the powder. Do not spray it onto the powder. Pull the water syringe out; leave the vent needle in if you have more water to add."],
    ["Need more than 1 mL? Repeat the draw", "A 1 mL syringe cannot carry 1.5 mL. Repeat steps 4 to 15 with a fresh syringe (for 1.5 mL the second draw goes to the 50 mark and should weigh about 0.500 g). Draw 2 = ___ g. Water added = Draw 1 + Draw 2."],
    ["Pull the vent needle out", "Straight out. Dry the outside of the vial with a clean tissue if any water touched it \u2014 a wet vial weighs more."],
    ["Weigh the full vial", "Put the vial on the pan, cap off, exactly as in step 3. Photograph the display or type it in: Vial after water = ___ g."],
    ["Check that the vial gained what the syringe delivered", "Full vial \u2212 Dry vial should equal Draw 1 + Draw 2 within about 0.02 g. If the vial gained less than you drew, water stayed in the syringe or came back out under pressure: vent again, inject what is left, weigh the vial again. The vial figure is the one that counts; the app uses it."],
    ["Dissolve the powder \u2014 do not shake", "Roll the vial gently between your palms or let it stand until the powder is gone. Shaking foams and damages peptides. Small bubbles from the water are normal and clear on their own in four or five minutes."],
    ["Inspect it against the light: perfectly clear, or do not use it", "Once the bubbles have gone, hold the vial up to a light. The liquid must be perfectly clear: no haze, no floating particles of any kind, no powder left on the glass or at the bottom. If anything is floating or undissolved, do not use that vial — do not filter it and do not dose from it. Set it aside and contact the supplier with the lot number."],
    ["Wipe the new sterile vial's stopper", "Flip the cap off the sealed sterile empty vial, wipe its stopper with a fresh alcohol swab and let it dry. This is the vial you will dose from."],
    ["Weigh the new vial, empty", "Put the new vial on the pan, cap off. Photograph the display or type it in: New vial empty = ___ g. The tracker keeps it as the new vial's tare."],
    ["Vent the mixed vial again", "Plungerless syringe through the edge of the mixed vial's stopper, left standing. You are about to take the whole solution out."],
    ["Draw the whole solution into a Luer-lock syringe", "A 3 mL Luer-lock syringe with its drawing needle \u2014 not an insulin syringe, nothing screws onto those. Vial upside down, needle tip in the liquid, pull SLOWLY until the vial is empty, then a little further to take in about half a millilitre of air."],
    ["Swap the needle for a 0.22 \u00b5m PES filter", "Unscrew the drawing needle into the sharps container. Take the filter out of its wrapper and screw it onto the syringe tip, tight. Do not touch the filter's outlet."],
    ["Fresh needle on the filter; vent the new vial", "Screw a new sterile needle onto the filter's outlet. Push a plungerless syringe through the edge of the new vial's stopper as a vent, or the vial fills with pressure and fights you."],
    ["Push the solution through the filter into the new vial", "Filter needle through the new vial's stopper at a different spot from the vent, aimed at the glass. Press slowly \u2014 real thumb pressure, 20\u201330 seconds per millilitre \u2014 liquid first, then the air. If it suddenly goes easy the membrane burst and this batch is not filtered. Pull both needles out; syringe, filter and needles go in the sharps container; the old vial is finished."],
    ["Weigh the new vial, filled", "Cap off, middle of the pan. Photograph the display or type it in: New vial filled = ___ g. The tracker takes this as the vial's starting weight and shows what stayed in the filter (a few hundredths of a gram)."],
    ["Label the vial", "Write the date mixed and the use-by date (the app shows it) on tape on the vial."],
    ["Refrigerate; syringes into the sharps container", "Vial in the fridge, upright, out of the light. Every used syringe into the sharps container, needle first. Scale off."]
  ]},
  { id: 'dose', h: 'C. Weighing every dose — the same way, every time', intro: 'The syringe marks are a sanity check; the scale is the measurement. Fifteen actions, one per page.', steps: [
    ["Check the scale (steps A1\u2013A6)", "On, zeroed, 20 g test passed, pan dry."],
    ["Read today's target from the vial tracker", "Open the vial in the Vial tracker. The blue card at the top shows the next dose in grams (for example 0.400 g for 4 mg at 10.00 mg per g) and the weight the vial should have right now. Those are the two numbers you are working to."],
    ["Get the vial out of the fridge and wipe the stopper", "Hold it up to the light first: still perfectly clear, nothing floating, no change in colour? Cloudiness, particles or colour at any later dose means stop \u2014 do not use it. Then wipe the stopper with a fresh alcohol swab and let it dry. Dry the outside of the vial if it is wet from the fridge."],
    ["Weigh the vial, cap off", "It must match the weight the tracker recorded after the last dose, within about 0.01 g. If it does not, liquid has been lost or a dose went unlogged: stop and work out which before you draw."],
    ["Tare the scale on a new syringe", "New syringe out of the wrapper, needle cover straight off, bare syringe laid across the pan resting on nothing else, press TARE \u2192 0.000."],
    ["Vent the vial before you draw", "Take a second syringe, pull its plunger all the way out and throw the plunger away. Push that needle through the edge of the stopper and leave it standing. A sealed vial pulls a vacuum as you take liquid out: the rubber stopper inside your syringe creeps back on its own, the liquid froths, and the dose you weighed is not the dose you inject. The vent lets air in as liquid comes out."],
    ["Draw past the mark, slowly", "Push the dosing needle through the stopper at a different spot, turn the vial upside down with the needle tip in the liquid, and pull the plunger SLOWLY to 10\u201320 units PAST your mark (for 40 units, pull to 50\u201360). Never yank the plunger: a fast pull makes a vacuum and bubbles even in a vented vial. If the plunger moves back by itself when you let go, the vial is under vacuum \u2014 stop, check the vent, start again."],
    ["Push back to the mark", "Tap the barrel so the bubbles rise to the needle end, then push the plunger down until the bottom of the curved liquid surface sits exactly on your mark. The air and the extra liquid go back into the vial."],
    ["Pull the needle out of the vial", "Straight out, with the vial still upside down so nothing drips from the needle."],
    ["Weigh the filled syringe", "Lay it on the tared pan the same way as in step 5. Photograph the display (the app reads the number) or type it into \"Syringe filled (g)\". The app shows the dose in mg and how far it is from your target."],
    ["Correct the draw before you inject", "Too much (more than 10% over)? Push the needle back into the vial and press out the excess, then weigh again. Too little? Draw past the mark again and push back. Repeat until the app says the draw matches. If the app shows a multiple of your dose, stop \u2014 a mark was misread. Nothing is injected until the scale agrees."],
    ["Pull the vent needle out", "Straight out. It goes in the sharps container."],
    ["Weigh the vial after the draw", "Vial on the pan, cap off; photograph the display. The app records it as the vial's weight for next time, and checks that the vial lost what the syringe gained."],
    ["Log the dose, then inject", "Press \"Log this dose\" with the final syringe weight and the vial weight. Then inject exactly as your protocol says."],
    ["Put the vial back in the fridge", "Vial back in the fridge, upright, out of the light. Syringes into the sharps container. Scale off."]
  ]}
];

var STORAGE = {
  h: 'D. Storage and expiry',
  items: [
    ['Dry powder (unmixed)', 'Cool, dry, dark, in its box, cap on. A drawer away from heat and sunlight is fine for a few weeks; for anything longer keep it in the fridge (2–8 °C) in a sealed bag, and let a cold vial reach room temperature before you open it so no condensation forms inside. Never leave a vial in a car, on a windowsill or near a stove. The vendor\'s certificate of analysis and label are the only real statements about that batch.'],
    ['Mixed (reconstituted) solution', 'Fridge only, 2–8 °C, upright, out of the light. Never freeze a mixed vial: ice crystals break peptides. Do not carry it around at room temperature; take it out for the dose and put it back.'],
    ['How long a mixed vial lasts', 'There is no published stability study for a vial you mixed yourself, for retatrutide or any other research peptide. The rule that exists is the multi-dose-vial rule used in pharmacies and hospitals (USP <797>): 28 days after the first needle goes through the stopper, kept refrigerated. Bacteriostatic water follows the same 28-day rule after its first puncture. The tracker therefore sets the use-by date 28 days after the day you mixed, and counts down to it. You can shorten that number; nothing in the evidence supports lengthening it.'],
    ['What to mix with', 'Bacteriostatic water: sterile water with 0.9% benzyl alcohol as a preservative. Filtering makes the solution sterile on the day you mix it; the preservative is what keeps it safe through the punctures that follow, and is why a 28-day multi-dose vial is possible at all. Plain sterile water has no preservative, so a vial mixed with it is a single-session vial: draw the dose and discard the rest the same day (the tracker sets its use-by to one day). Not saline, not PBS.'],
    ['What the approved drugs say, for comparison', 'A semaglutide pen in use is good for 56 days at room temperature; a tirzepatide pen may be out of the fridge for 21 days. Those are factory formulations with preservatives and tested buffers in sealed pens, measured in stability studies. A powder dissolved in a kitchen is not that product, which is why the shorter 28-day rule applies to it.'],
    ['Throw it out early if', 'The liquid is cloudy, has particles or threads, has changed colour, the stopper has been punctured so many times it no longer seals, or the vial was left warm or frozen. No date overrides what your eyes see.'],
    ['Two dates on every vial', 'The day it was mixed and the use-by date, written on tape on the vial and recorded in the tracker. The tracker warns a week before expiry, and shows when a vial will expire before its doses are used up, so the next order is timed to the expiry rather than to the last dose.']
  ]
};

var SUPPLIES = {
  h: 'What to order before you start',
  intro: 'The basics, plus the filter kit that makes the finished solution sterile. Links open the retailer; prices change, specifications do not.',
  items: [
    ['Milligram scale', 'MAXUS 50 g × 0.001 g pocket scale, with two 20 g calibration weights in the box', 'The scale this method was built on. Any scale that reads to 0.001 g and ships with calibration weights does the same job; a 0.01 g kitchen scale does not.', 'https://www.amazon.ca/dp/B07ZQZ962K', 'Amazon.ca'],
    ['Insulin syringes', '1 mL (U-100), 30 G × 5/16 in (8 mm) needle, sterile, individually wrapped, box of 100', 'One syringe per draw, plus one with its plunger pulled out for venting the vial. Never reuse a needle; never recap by hand.', 'https://www.amazon.ca/dp/B0FXGS88PR', 'Amazon.ca'],
    ['Alcohol prep pads', 'PODOCURE 70 % isopropyl, sterile, individually wrapped, latex-free', 'One for the stopper, one for the water vial, one for the scale pan. Let everything dry before it touches the pan.', 'https://www.amazon.ca/dp/B0H4NGR4Z7', 'Amazon.ca'],
    ['Luer-lock syringes with 21 G needles', '3 mL Luer-lock syringe with a 21 G × 1 in needle, sterile, individually sealed, pack of 50 (choose the 21G 25mm option)', 'Two per vial for the sterile-filtering step: one draws the finished solution, then the filter screws on in place of its needle; the needle from a second one goes on the filter outlet (that barrel keeps for the next vial). Insulin syringes cannot do this — their needles are fixed.', 'https://www.amazon.ca/dp/B0DS6WKHXQ', 'Amazon.ca'],
    ['0.22 µm PES syringe filters', 'Biologix 0.22 µm PES, sterile, individually wrapped', 'One per vial, never reused. PES binds almost no peptide, so the dose is not lost to the membrane. The smaller the disc, the less solution it holds back.', 'https://www.amazon.ca/dp/B0BCFRX3PN', 'Amazon.ca'],
    ['Sterile empty vials', 'ZHANXUBIO sealed sterile glass vials, self-healing stopper, flip-off cap, pack of 10 — choose the 3 mL size', 'The filtered solution goes into one of these; it becomes the vial you dose from. One per peptide vial. Often supplied with the peptide as well.', 'https://www.amazon.ca/Sterile-Self-Healing-Injection-Package-ZHANXUBIO/dp/B0CP3WJNKY', 'Amazon.ca'],
    ['Sharps container', 'Biohazard sharps disposal container, lidded', 'Every used syringe goes in here, needle first, straight away. Most pharmacies take full containers back.', 'https://www.amazon.ca/dp/B0BVN2M2PG', 'Amazon.ca']
  ],
  foot: 'The peptide itself: buy from a supplier that gives you a lot-specific certificate of analysis (COA) tested by an independent third-party laboratory — RP-HPLC purity and mass-spec identity for your lot, not a generic sheet. Do not administer a peptide that has not been third-party tested. A pre-filled pen sold as a research product cannot be matched to a certificate; skip those. The COA Checker under Learn runs the six checks on yours. This app does not sell peptides and does not recommend a supplier.'
};
/* ---- per-user documents (account sync when signed in; local otherwise) ---- */
window.qbUserDoc = function(name){
  if (!(window.claude && typeof window.claude.use === 'function')) return Promise.resolve(null);
  return Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){ var db = r[0], user = r[1]; if (!db || !user) return null; return user.id().then(function(id){ return id ? db.doc('data/users/' + id + '/' + name) : null; }); }).catch(function(){ return null; });
};

/* ---- supplies: ordered ticks (synced), one-click Amazon cart, reorder ---- */
var SUP_ASIN = function(u){ var m = /\/dp\/([A-Z0-9]{10})/.exec(u || ''); return m ? m[1] : null; };
var SUP_IDS = SUPPLIES.items.map(function(s){ return SUP_ASIN(s[3]) || s[0].toLowerCase().replace(/[^a-z0-9]+/g, '-'); });
var SUP_REORDER = SUP_IDS.slice(1, 6);   // consumables: syringes, pads, Luer-lock + needles, filters, vials (not the scale or the sharps bin)
var ORD = { v: 1, ordered: {}, updated: '' }, ordDoc = null, ordWriting = false;
try { var _o = JSON.parse(localStorage.getItem('qb-supplies') || 'null'); if (_o && _o.ordered) ORD = _o; } catch (e) {}
function supCart(ids){ return 'https://www.amazon.ca/gp/aws/cart/add.html?' + ids.map(function(a, i){ return 'ASIN.' + (i + 1) + '=' + a + '&Quantity.' + (i + 1) + '=1'; }).join('&'); }
function supDate(iso){ var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function supSave(){ ORD.updated = new Date().toISOString(); try { localStorage.setItem('qb-supplies', JSON.stringify(ORD)); } catch (e) {}
  if (ordDoc) { ordWriting = true; ordDoc.set({ v: 1, ordered: ORD.ordered, updated: ORD.updated }).catch(function(){}).then(function(){ ordWriting = false; }); } }
function supPaint(){ document.querySelectorAll('[data-sup]').forEach(function(ck){ var id = ck.getAttribute('data-sup'), on = !!ORD.ordered[id]; ck.checked = on; var lab = ck.closest('label'); if (lab) { lab.classList.toggle('on', on); lab.querySelector('span').textContent = on ? 'Ordered ' + supDate(ORD.ordered[id]) : 'Ordered?'; } }); }
function suppliesCard(){
  return '<div class="card" id="proto-supplies"><h3>' + esc(SUPPLIES.h) + '</h3><p style="font-size:14px;color:var(--ink-2);margin-top:4px">' + esc(SUPPLIES.intro) + '</p>' +
    '<div class="sup-actions"><a class="btn sup-cart" href="#shop">Open the Shop<em>every item, with pictures and prices</em></a><a class="btn ghost sup-cart" href="' + supCart(SUP_IDS) + '" target="_blank" rel="noopener">Add the whole kit to your cart ↗<em>Amazon.ca · 7 items</em></a>' +
    '<a class="btn ghost sup-cart" href="' + supCart(SUP_REORDER) + '" target="_blank" rel="noopener">Reorder consumables ↗<em>syringes · pads · filters · vials</em></a></div>' +
    '<p class="small" style="margin:6px 0 0;color:var(--ink-3)">The cart links carry no account or name — anyone can use them. Check the two size choices (21 G needles, 3 mL vials) in the cart before you pay. Tick each item once it is on its way; the ticks follow your account.</p>' +
    '<div class="supplies">' + SUPPLIES.items.map(function(s, i){ var id = SUP_IDS[i], on = !!ORD.ordered[id];
      return '<div class="sup"><label class="sup-ck' + (on ? ' on' : '') + '"><input type="checkbox" data-sup="' + id + '"' + (on ? ' checked' : '') + '><span>' + (on ? 'Ordered ' + supDate(ORD.ordered[id]) : 'Ordered?') + '</span></label>' +
        '<div class="sup-t"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span><small>' + esc(s[2]) + '</small></div>' +
        (s[3] ? '<a class="btn ghost sup-btn" href="' + s[3] + '" target="_blank" rel="noopener">Order ↗<em>' + esc(s[4]) + '</em></a>' : '') + '</div>'; }).join('') + '</div>' +
    '<p class="small" style="margin-top:10px;color:var(--ink-2)">' + esc(SUPPLIES.foot) + '</p></div>';
}
document.addEventListener('change', function(e){ var ck = e.target.closest && e.target.closest('input[data-sup]'); if (!ck) return; var id = ck.getAttribute('data-sup');
  if (ck.checked) ORD.ordered[id] = new Date().toISOString(); else delete ORD.ordered[id]; supSave(); supPaint(); });
(function initSupDb(){
  window.qbUserDoc('supplies').then(function(doc){ if (!doc) return; ordDoc = doc;
    return doc.get().then(function(snap){ var d = snap.exists && snap.data(); if (d && d.ordered && (!ORD.updated || (d.updated || '') > ORD.updated)) { ORD = { v: 1, ordered: d.ordered, updated: d.updated || '' }; try { localStorage.setItem('qb-supplies', JSON.stringify(ORD)); } catch (e) {} supPaint(); } else if (Object.keys(ORD.ordered).length && !(d && d.ordered)) supSave();
      doc.onSnapshot(function(s2){ if (!s2.exists || s2.metadata.hasPendingWrites || ordWriting) return; var d2 = s2.data(); if (!d2 || !d2.ordered || (d2.updated || '') <= (ORD.updated || '')) return; ORD = { v: 1, ordered: d2.ordered, updated: d2.updated || '' }; try { localStorage.setItem('qb-supplies', JSON.stringify(ORD)); } catch (e) {} supPaint(); }); });
  }).catch(function(){});
})();
/* one step per page: each section is a card that shows a single step with Back / Done — continue; the position is remembered per section */
function psPos(id){ try { var v = parseInt(localStorage.getItem('proto-pos:' + id), 10); return isNaN(v) ? 0 : v; } catch(e){ return 0; } }
function psSave(id, i){ try { localStorage.setItem('proto-pos:' + id, String(i)); } catch(e){} }
function protocolCard(sec, pos){
  var i = pos == null ? psPos(sec.id) : pos, n = sec.steps.length, letter = sec.h.charAt(0);
  var h = '<div class="card pstep" data-sec="' + sec.id + '" data-i="' + i + '" id="proto-' + sec.id + '">';
  if (i <= 0) {
    h += '<span class="eyebrow">' + esc(letter) + ' \u00b7 ' + n + ' steps, one per page</span><h3>' + esc(sec.h.replace(/^[A-Z]\.\s*/, '')) + '</h3><p style="font-size:14px;color:var(--ink-2);margin-top:6px">' + esc(sec.intro) + '</p>' +
      '<div class="btn-row" style="margin-top:14px"><button type="button" class="btn" data-ps="next">Start</button></div>';
  } else if (i > n) {
    h += '<span class="eyebrow">' + esc(letter) + ' \u00b7 done</span><h3>' + esc(sec.h.replace(/^[A-Z]\.\s*/, '')) + ' \u2713</h3><p style="font-size:14px;color:var(--ink-2);margin-top:6px">All ' + n + ' steps completed.</p>' +
      '<div class="btn-row" style="margin-top:14px"><button type="button" class="btn ghost" data-ps="reset">Start again</button><button type="button" class="btn" data-ps="nextsec">Continue to the next section</button></div>';
  } else {
    var st = sec.steps[i - 1];
    h += '<span class="eyebrow">' + esc(letter) + ' \u00b7 Step ' + i + ' of ' + n + '</span><h3>' + esc(st[0]) + '</h3><p style="font-size:15px;line-height:1.5;margin-top:8px">' + esc(st[1]) + '</p>' +
      '<div class="ps-bar"><i style="width:' + Math.round(100 * i / n) + '%"></i></div>' +
      '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn ghost" data-ps="back">Back</button><button type="button" class="btn" data-ps="next">' + (i === n ? 'Done \u2014 finish' : 'Done \u2014 continue') + '</button></div>';
  }
  return h + '</div>';
}
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-ps]'); if (!b) return;
  var card = b.closest('.pstep'); if (!card) return;
  var id = card.getAttribute('data-sec'), sec = null; for (var k = 0; k < PROTOCOL.length; k++) if (PROTOCOL[k].id === id) sec = PROTOCOL[k];
  if (!sec) return;
  var i = parseInt(card.getAttribute('data-i'), 10) || 0, n = sec.steps.length, act = b.getAttribute('data-ps');
  if (act === 'next') i = Math.min(n + 1, i + 1); else if (act === 'back') i = Math.max(0, i - 1); else if (act === 'reset') i = 0;
  else if (act === 'nextsec') { var all = Array.prototype.slice.call(document.querySelectorAll('.pstep')); var at = all.indexOf(card); var nx = all[at + 1] || document.getElementById('proto-storage'); if (nx) nx.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  psSave(id, i);
  var wrap = document.createElement('div'); wrap.innerHTML = protocolCard(sec, i); var fresh = wrap.firstChild; card.parentNode.replaceChild(fresh, card);
  if (act === 'next' || act === 'back') { var top = fresh.getBoundingClientRect().top; if (top < 70 || top > window.innerHeight - 200) fresh.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
function storageCard(){
  return '<div class="card" id="proto-storage"><h3>' + esc(STORAGE.h) + '</h3><div class="stack" style="margin-top:10px;display:flex;flex-direction:column;gap:12px">' +
    STORAGE.items.map(function(s){ return '<div><b style="display:block;font-size:14px">' + esc(s[0]) + '</b><span style="font-size:14px;color:var(--ink-2)">' + esc(s[1]) + '</span></div>'; }).join('') + '</div></div>';
}
function renderProtocol(){
  return suppliesCard() + PROTOCOL.map(function(sec){ return protocolCard(sec); }).join('') + storageCard() +
    '<p class="note">Scale used to build this: <a href="https://www.amazon.ca/dp/B07ZQZ962K" target="_blank" rel="noopener">MAXUS 50 g × 0.001 g milligram scale with 2 × 20 g calibration weights (Amazon.ca)</a>. Any 0.001 g scale with calibration weights does the same job. Water weighs 1.000 g per mL at room temperature, which is what makes the whole method work.</p>';
}

/* ----- titration: going up, holding, coming down (weight-management peptides with a trial dose ladder) ----- */
var TITRATION_IDS = { semaglutide: 1, tirzepatide: 1, retatrutide: 1, cagrisema: 1, liraglutide: 1, dulaglutide: 1 };
function hasTitration(P){ var pk = P.levels && P.levels.pk; return !!(TITRATION_IDS[P.id] && pk && pk.ladder && pk.ladder.length > 1); }
function renderTitration(P){
  if (!hasTitration(P)) return '';
  var pk = P.levels.pk, tau = pk.tau || 7, hold = pk.stepDays || 28, half = pk.half || 7, n = pk.ladder.length;
  var weekly = tau >= 7, every = weekly ? 'weekly' : (tau === 1 ? 'daily' : 'every ' + fmtDose(tau) + ' days');
  var clear = Math.round(5 * half); var clearTxt = clear >= 14 ? Math.round(clear / 7) + ' weeks' : clear + ' days';
  var rows = pk.ladder.map(function(d, i){ return '<tr><td>' + (i + 1) + '</td><td class="mono">' + fmtDose(d) + ' mg ' + every + '</td><td>' + (i === 0 ? 'first ' + hold + ' days' : 'hold ' + hold + ' days') + '</td><td class="mono" data-step-mg="' + d + '">—</td></tr>'; }).join('');
  var h = '<div id="titration"><div style="margin-top:6px"><h2>Going up, holding, coming down</h2><p class="lede" style="font-size:15px;margin-top:4px">What the ' + esc(P.name) + ' trials and labels did at each stage, and what a person can expect. Doses are the trials’ record, not a recommendation.</p></div>';
  // UP
  h += '<div class="card"><h3>1 · Going up: the trial ladder</h3><p style="font-size:14px;color:var(--ink-2)">Every trial started at the lowest step and climbed one step at a time. The hold between steps is deliberate: it takes four to five half-lives (about ' + clearTxt + ' for ' + esc(P.name) + ') for the blood level to settle after each change, and the stomach side effects track the climb, not the plateau.</p>' +
    '<div class="tbl" style="margin-top:10px"><table><thead><tr><th>Step</th><th>Dose</th><th>Hold</th><th>On the scale*</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<p class="note">*Grams to draw at the concentration in the calculator above; fill in the vial label and water weight to see them.</p>' +
    '<ol class="steps" style="margin-top:12px">' +
    '<li><b>Step up only after a clean hold</b><span>The trials moved to the next step after ' + hold + ' days on the current one. If the last week of the hold still had nausea, vomiting or constipation that interfered with eating or drinking, the step was delayed, four weeks at a time, until it did not.</span></li>' +
    '<li><b>Never skip a step</b><span>The early steps roughly double the exposure each time. Jumping two steps gives the side-effect profile of a first-time overdose, which is what the FDA’s dosing-error reports describe.</span></li>' +
    '<li><b>Step back down if a step is not tolerated</b><span>The semaglutide label allows dropping back one step for up to four weeks and then trying again; the tirzepatide label says to delay the next step by four weeks. One step back, not to zero.</span></li>' +
    '<li><b>Expect the first three days after each increase to be the worst</b><span>Peak blood level comes ' + (pk.tmax ? 'about ' + fmtDose(pk.tmax) + ' day' + (pk.tmax === 1 ? '' : 's') : 'one to two days') + ' after a dose. Small meals, no large fatty meals, stop eating when full, water through the day. Keep the Track section going: weight, blood pressure and heart rate.</span></li>' +
    '<li><b>Stop and be seen, rather than step up, for</b><span>severe or persistent abdominal pain, vomiting that stops you keeping fluids down for a day, yellow skin or eyes, a racing heart that does not settle, signs of an allergic reaction, or low blood sugar if you also use insulin or a sulfonylurea.</span></li>' +
    '</ol></div>';
  // PLATEAU RULE (this app)
  h += '<div class="card"><h3>This app’s rule: go up only at a plateau</h3><p style="font-size:14px;color:var(--ink-2)">The trial ladder is the reference; the step itself is decided by your own weight, not the calendar.</p><ol class="steps" style="margin-top:10px">' +
    '<li><b>Stay on your dose until your weight plateaus</b><span>Weigh in once a week, same day, same conditions, in Track → Vitals. A plateau is two weekly weigh-ins within 0.5 kg (1 lb) of each other after at least ' + hold + ' days on the dose. Whether you can “feel” the drug is not the signal: some people notice less appetite from the first dose, others nothing for weeks, and both are normal. The weekly weigh-in is the signal.</span></li>' +
    '<li><b>Then step up by one</b><span>One step at a time, never a skip. If the trial’s next rung is more than 1 mg away, go up by 1 mg. Do not step while nausea, vomiting or constipation still interfere with eating or drinking.</span></li>' +
    '<li><b>Repeat at every plateau</b><span>Up to the trial’s top dose of ' + fmtDose(pk.maxDose || pk.ladder[n - 1]) + ' mg. Weight that is still coming off is the reason to stay put. The vial page watches your weekly weights and tells you when a plateau has arrived.</span></li></ol></div>';
  // MISSED
  h += '<div class="card"><h3>2 · Missed doses: what the labels say</h3><ol class="steps" style="margin-top:10px">' +
    (weekly ? '<li><b>Missed by up to 5 days (semaglutide label) or 4 days (tirzepatide label)</b><span>Take it as soon as you remember, then go back to the usual day.</span></li>' +
    '<li><b>Missed by more than that</b><span>Skip it. Take the next dose on the usual day. Never take two doses to catch up.</span></li>' +
    '<li><b>Two or more weekly doses missed in a row</b><span>The semaglutide label says to resume as prescribed or, if needed, restart the escalation schedule from a lower step, because the level has fallen and the side effects come back as if you were climbing for the first time. After ' + clearTxt + ' the drug is essentially gone.</span></li>'
    : '<li><b>Missed a daily dose</b><span>Take the next one at the usual time; do not double up.</span></li><li><b>Missed three or more days</b><span>The liraglutide label says to restart at the lowest step and climb again.</span></li>') +
    '</ol></div>';
  // MAINTENANCE
  h += '<div class="card"><h3>3 · Maintenance: what it is and what to expect</h3><p style="font-size:14px;color:var(--ink-2)"><b>A maintenance dose is the dose you stay on once weight has stopped changing.</b> In the trials it was simply the top step a person reached and tolerated: weight fell for roughly a year on a steady dose, then went flat (around week 60 on semaglutide, week 72 on tirzepatide), and the trials kept the same dose through the plateau. The plateau is not the drug “wearing off”; it is the new balance point between appetite and intake at that dose.</p>' +
    '<ol class="steps" style="margin-top:10px">' +
    '<li><b>What maintenance feels like</b><span>Appetite stays reduced but steady; side effects are usually quiet because the dose is no longer changing; heart rate stays a few beats higher than before; weight moves within a kilogram or two. A sudden return of hunger or a creeping weight trend is the signal to look at the dose, the vial (is it expired or under-strength?) and the week.</span></li>' +
    '<li><b>Lower maintenance doses</b><span>The semaglutide label allows 1.7 mg weekly for people who cannot tolerate 2.4 mg. Beyond that, no trial has tested holding weight on a lower step than the one it was lost on. People do it; the evidence is observational.</span></li>' +
    '<li><b>What happens if the drug simply stops</b><span>In the STEP 1 extension, people who stopped semaglutide regained about two-thirds of the weight they had lost within a year (11.6 points of 17.3%), and blood pressure, lipids and glucose drifted back toward where they started. In SURMOUNT-4, people switched from tirzepatide to placebo regained 14% of body weight over the next year while those who continued lost a further 5.5%. The drug was holding the new weight; remove it abruptly and the old set point reasserts itself.</span></li>' +
    '</ol></div>';
  // DOWN
  h += '<div class="card"><h3>4 · Coming down: when the goal is reached</h3><p style="font-size:14px;color:var(--ink-2)">No Phase 3 trial has tested a step-down schedule; the trials either continued the dose or stopped it outright. One clinic programme (Embla, Copenhagen and London, reported at the European Congress on Obesity 2024) tapered 353 patients off semaglutide over an average of nine weeks with diet and exercise coaching; of the 85 with six months of follow-up, weight was stable. That is the only tapering data there is, so what follows is the trial ladder run in reverse under the trial rules, not a tested protocol.</p>' +
    '<ol class="steps" style="margin-top:10px">' +
    '<li><b>Decide what “goal” means first</b><span>A weight, and a band around it you will act on (for example ±2% of body weight). Weigh weekly, same day, same conditions, in the Track section.</span></li>' +
    '<li><b>Reverse the ladder one step at a time</b><span>Drop one step (never more), and hold it at least as long as the up-steps were held: ' + hold + ' days, so the blood level has settled (' + clearTxt + ' to reach the new plateau). The ladder above, read upward from your current dose, is the schedule.</span></li>' +
    '<li><b>What to expect at each step down</b><span>Hunger returns within one to three weeks as the level falls, stronger at the lower steps; fullness after meals fades first; evening snacking is the usual first sign. Nothing dangerous is expected from stepping down; the stomach side effects go away rather than appear.</span></li>' +
    '<li><b>The rule for going back up</b><span>If weight rises above your band for two consecutive weekly weigh-ins, or hunger is not manageable with food choices, go back up one step and hold ' + hold + ' days before trying again. One step up, not to the top.</span></li>' +
    '<li><b>The last step: stopping</b><span>After the lowest step, stop. The level clears over ' + clearTxt + '. The months after stopping are when regain happens fastest in the trials, so weekly weigh-ins continue for at least six months.</span></li>' +
    '<li><b>Holding without the drug</b><span>What the trial participants who kept their loss had in common: protein and resistance training to keep the lean mass they had, the eating pattern built while on the drug kept rather than abandoned, and a plan for the weight band. Many will not hold the new weight; that is what the regain data say, and knowing it in advance is the point of the band and the rule.</span></li>' +
    '</ol><div class="btn-row" style="margin-top:12px"><a class="btn ghost" href="#' + P.id + '.levels">See what a step down does to blood levels</a></div>' +
    '<p class="note">Sources: Wegovy and Zepbound prescribing information (missed-dose and escalation rules); Wilding et al., Diabetes Obes Metab 2022 (STEP 1 extension); Aronne et al., JAMA 2024 (SURMOUNT-4); Embla tapering data as reported by the American Pharmacists Association, 2024.</p></div></div>';
  return h;
}
