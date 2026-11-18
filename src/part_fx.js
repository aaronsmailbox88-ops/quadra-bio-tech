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
})();
