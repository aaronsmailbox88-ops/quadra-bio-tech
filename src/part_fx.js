/* ===== Look & feel helpers (v53): the fixed backdrop and two-tone display headers.
   Every h1 (and the walkthrough's h2) gets its last word wrapped in <em class="hi"> so it renders gold. Applied once per element and
   re-applied automatically whenever a panel is re-rendered (MutationObserver), so render code never has to know about it. ===== */
(function(){
  'use strict';
  if (!document.querySelector('.qb-bg')) { var bg = document.createElement('div'); bg.className = 'qb-bg'; bg.setAttribute('aria-hidden', 'true'); document.body.insertBefore(bg, document.body.firstChild); }
  var SEL = 'h1, .wk-card h2, .ck-hero h1';
  function lastText(el){
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, last = null;
    while ((n = w.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      var p = n.parentNode, skip = false;
      while (p && p !== el) { if (p.nodeName === 'SMALL' || p.nodeName === 'BUTTON' || p.nodeName === 'A') { skip = true; break; } p = p.parentNode; }
      if (!skip) last = n;
    }
    return last;
  }
  function deco(h){
    if (!h || h.querySelector('.hi')) return;
    var t = lastText(h); if (!t) return;
    var words = t.nodeValue.replace(/\s+$/, '');
    if (!/\s/.test(h.textContent.trim())) return;                       /* a single word (a peptide name): leave it white */
    var m = /^([\s\S]*?)(\S+?)([.!?:;,’"”)]*)$/.exec(words); if (!m || !m[2]) return;
    var em = document.createElement('em'); em.className = 'hi'; em.textContent = m[2];
    var frag = document.createDocumentFragment();
    if (m[1]) frag.appendChild(document.createTextNode(m[1]));
    frag.appendChild(em);
    if (m[3]) frag.appendChild(document.createTextNode(m[3]));
    t.parentNode.replaceChild(frag, t);
  }
  function sweep(root){
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches(SEL)) deco(root);
    Array.prototype.forEach.call(root.querySelectorAll(SEL), deco);
  }
  sweep(document.body);
  try {
    new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++) {
        var a = muts[i].addedNodes; for (var j = 0; j < a.length; j++) sweep(a[j]);
        var tg = muts[i].target; if (tg && tg.nodeType === 1 && tg.closest) { var h = tg.closest(SEL); if (h) deco(h); }
      }
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  window.qbDeco = sweep;

  /* ===== Collapsible tiles (v58): long reading becomes tap-to-open tiles. Learn's topics become tiles with a one-line teaser; inside them
     (and on the peptide Trials / Effects / Status / Dosing tabs) a text card with several h3 sections is split into one sub-tile per
     section, and a single long text card becomes one sub-tile. Cards with controls, charts or links-as-buttons are left alone.
     Open/closed state is remembered per summary while the app is open, so a re-render does not fold what the reader opened. ===== */
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var TEASE = {
    'learn-trials': 'Phases 1–4, placebo and randomization',
    'learn-results': 'Percent vs pounds, points vs percent, dropouts, unpublished results',
    'learn-levels': 'Half-life, steady state, saturation, half-lives across the family',
    'learn-effects': 'What the trials saw, when to stop and be seen, what they monitored',
    'learn-status': 'Approved · in trials · sold as research, and what a COA proves',
    'learn-units': 'Units, millilitres and milligrams: the dosing-error trap',
    'learn-weigh': 'The method: scale set-up, mixing, every dose, storage, what to order'
  };
  var OPEN = {};
  document.addEventListener('toggle', function(e){ var d = e.target; if (d && d.tagName === 'DETAILS' && d.getAttribute('data-k')) OPEN[d.getAttribute('data-k')] = d.open; }, true);
  function key(scope, text){ return scope + '|' + text.trim().slice(0, 60); }
  function interactive(el){ return !!el.querySelector('input,select,textarea,button,svg,canvas,.btn,.chart,.pk,.ladder,.entry,table'); }
  function mkDetails(cls, scope, title, teaser){
    var d = document.createElement('details'); d.className = cls; var k = key(scope, title); d.setAttribute('data-k', k); if (OPEN[k]) d.open = true;
    var sm = document.createElement('summary'); sm.innerHTML = '<span class="tile-t">' + esc(title) + '</span>' + (teaser ? '<span class="tile-s">' + esc(teaser) + '</span>' : ''); d.appendChild(sm);
    var body = document.createElement('div'); body.className = cls === 'tile' ? 'tile-b' : 'body'; d.appendChild(body); return d;
  }
  function splitCard(card, scope){
    if (card.getAttribute('data-tiled') || interactive(card)) return;
    var kids = Array.prototype.slice.call(card.children), h3s = kids.filter(function(k){ return k.tagName === 'H3'; });
    if (!h3s.length || kids[0].tagName !== 'H3') return;
    var textLen = (card.textContent || '').trim().length;
    if (h3s.length === 1 && textLen < 170) return;                      /* short: leave it as a card */
    var groups = [], cur = null;
    kids.forEach(function(k){ if (k.tagName === 'H3') { cur = { h: k, rest: [] }; groups.push(cur); } else if (cur) cur.rest.push(k); });
    var wrap = document.createElement('div'); wrap.className = 'subs';
    groups.forEach(function(g){ var d = mkDetails('sub', scope, g.h.textContent, ''); ['good', 'warn', 'crit', 'soft'].forEach(function(c){ if (card.classList.contains(c)) d.classList.add(c); });
      g.rest.forEach(function(n){ d.lastChild.appendChild(n); }); wrap.appendChild(d); });
    card.parentNode.replaceChild(wrap, card);
  }
  function subTiles(root, scope){
    Array.prototype.forEach.call(root.querySelectorAll('.card'), function(c){ if (c.closest('.subs, details.sub')) return; splitCard(c, scope); });
    Array.prototype.forEach.call(root.querySelectorAll('details:not(.tile):not(.sub):not([data-tiled])'), function(d){ d.classList.add('sub'); d.removeAttribute('open'); d.setAttribute('data-tiled', '1'); });
  }
  /* Learn lives under the Peptides tabs (v103): each topic is a collapsed tile at the foot of the tab it explains */
  var LEARN_HOME = { results: ['learn-results'], effects: ['learn-effects'], levels: ['learn-levels'], trials: ['learn-trials'], status: ['learn-status', 'learn-coa'] };
  var LEARN_NODES = {};
  function tileLearn(){
    var sec = document.getElementById('learn-pool'); if (!sec || sec.getAttribute('data-tiled')) return; sec.setAttribute('data-tiled', '1');
    Array.prototype.forEach.call(sec.querySelectorAll(':scope > [id^="learn-"]'), function(n){ LEARN_NODES[n.id] = n; });
    Array.prototype.forEach.call(sec.querySelectorAll(':scope > div[id^="learn-"]'), function(div){
      var h2 = div.querySelector('h2'); if (!h2) return; var id = div.id;
      var d = mkDetails('tile', 'learn', h2.textContent, TEASE[id] || ''); d.id = id; div.removeAttribute('id'); LEARN_NODES[id] = d;
      var wrap = h2.parentNode; h2.remove(); if (wrap !== div && !wrap.children.length && !wrap.textContent.trim()) wrap.remove();
      var body = d.lastChild; while (div.firstChild) body.appendChild(div.firstChild);
      /* a second h2 inside the topic (e.g. "What a participant experiences") becomes a sub-tile holding what follows it */
      Array.prototype.slice.call(body.querySelectorAll('h2')).forEach(function(h){ var host = h.parentNode, sd = mkDetails('sub', 'learn', h.textContent, ''); var n = h.nextSibling; host.insertBefore(sd, h); h.remove(); if (host !== body && !host.children.length) { /* h2 was alone in a wrapper */ var after = host.nextSibling; host.parentNode.insertBefore(sd, host); host.remove(); n = after; host = sd.parentNode; } while (n && !(n.tagName === 'H2' || (n.tagName === 'DETAILS' && n.classList.contains('sub')))) { var nx = n.nextSibling; sd.lastChild.appendChild(n); n = nx; } });
      div.parentNode.replaceChild(d, div);
      subTiles(body, 'learn');
    });
  }
  function tilePeptide(){
    ['trials', 'effects', 'status', 'dosing'].forEach(function(id){ var p = document.querySelector('section[data-panel="' + id + '"]'); if (p) subTiles(p, id); });
  }
  function placeLearn(){
    Object.keys(LEARN_HOME).forEach(function(panel){
      var sec = document.querySelector('section[data-panel="' + panel + '"]'); if (!sec) return;
      var wrap = sec.querySelector(':scope > .learn-more');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'learn-more'; wrap.innerHTML = '<div class="eyebrow">Learn \u00b7 the background</div>'; var ft = sec.querySelector(':scope > footer'); if (ft) sec.insertBefore(wrap, ft); else sec.appendChild(wrap); }
      LEARN_HOME[panel].forEach(function(id){ var n = LEARN_NODES[id]; if (n && n.parentNode !== wrap) wrap.appendChild(n); });
      /* the half-life table is shown once: the tab's own copy wins when it has one */
      if (panel === 'levels') { var hl = document.getElementById('learn-hl'); if (hl) hl.hidden = Array.prototype.some.call(sec.querySelectorAll('.hl'), function(e){ return !e.closest('.learn-more'); }); }
    });
  }
  function tiles(){ try { tileLearn(); tilePeptide(); placeLearn(); } catch (e) {} }
  window.qbTiles = tiles;
  tiles();
})();
