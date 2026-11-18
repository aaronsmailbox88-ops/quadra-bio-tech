/* ===== Shop: the accessories catalogue (Amazon listings) as product cards, with a one-click kit cart, reorder cart and the "Ordered?" ticks.
   The catalogue is ONE shared document (shop/catalog) that every signed-in user reads and only app admins can change: admins get an
   "Edit shop" switch (add, edit, reorder, delete products; store name, storefront link, Associates tag, disclosure). Without a server
   (or before the first save) the page shows the built-in kit from SUPPLIES. No peptides here, ever. ===== */
(function(){
  'use strict';
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var KEY = 'qb-shop', DEFAULT_DISC = 'As an Amazon Associate this store earns from qualifying purchases. Prices are set by Amazon and the sellers there.';
  var CAT = null, doc = null, ADMIN = false, editing = false, form = null, filter = 'All', writing = false, el = null, toastT = null;
  var SEED_CATS = ['Scale', 'Syringes', 'Prep', 'Syringes', 'Filters', 'Vials', 'Prep'];
  function slug(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function asinOf(u){ var m = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/.exec(u || '') || /^\s*([A-Z0-9]{10})\s*$/.exec(u || ''); return m ? m[1] : ''; }
  function seed(){
    var S = window.SUPPLIES; if (!S || !S.items) return { v: 1, store: { name: '', url: '', tag: '', disclosure: DEFAULT_DISC, intro: '' }, items: [], updated: '' };
    return { v: 1, store: { name: '', url: '', tag: '', disclosure: DEFAULT_DISC, intro: '' }, updated: '',
      items: S.items.map(function(s, i){ var a = asinOf(s[3]); return { id: a || slug(s[0]), title: s[0], sub: s[1], blurb: s[2], url: s[3], asin: a, img: '', price: '', cat: SEED_CATS[i] || 'Other', qty: 1, kit: true, reorder: i >= 1 && i <= 5 }; }) };
  }
  function norm(c){ c = c || {}; if (!c.store) c.store = {}; if (!c.store.disclosure) c.store.disclosure = DEFAULT_DISC; if (!Array.isArray(c.items)) c.items = []; c.v = 1;
    c.items.forEach(function(it){ if (!it.id) it.id = it.asin || slug(it.title) || ('p' + Math.random().toString(36).slice(2, 8)); if (!it.cat) it.cat = 'Other'; if (!(it.qty > 0)) it.qty = 1; }); return c; }
  try { var loc = JSON.parse(localStorage.getItem(KEY) || 'null'); if (loc && loc.items) CAT = norm(loc); } catch (e) {}
  if (!CAT) CAT = seed();
  function cache(){ try { localStorage.setItem(KEY, JSON.stringify(CAT)); } catch (e) {} }

  /* ---- shared document + admin flag ---- */
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('db').then(function(db){ if (!db) return; doc = db.doc('shop/catalog');
      return doc.get().then(function(snap){
        if (snap.exists && snap.data() && Array.isArray(snap.data().items)) { CAT = norm(snap.data()); cache(); paint(); }
        try { doc.onSnapshot(function(s2){ if (!s2.exists || s2.metadata.hasPendingWrites || writing) return; var d = s2.data(); if (!d || !Array.isArray(d.items)) return; if ((d.updated || '') <= (CAT.updated || '')) return; CAT = norm(d); cache(); paint(); }); } catch (e) {}
      }); }).catch(function(){});
    window.claude.use('user').then(function(u){ if (!u || !u.canEdit) return; return Promise.resolve(u.canEdit()).then(function(ok){ ADMIN = ok === true; paint(); }); }).catch(function(){});
  }
  function persist(){ CAT.updated = new Date().toISOString(); cache(); paint();
    if (!doc) { toast(window.claude ? 'Saved on this device. Sign in to publish it for everyone.' : 'Saved on this device.'); return; }
    writing = true; doc.set(CAT).then(function(){ writing = false; toast('Saved. Everyone sees it on their next open.'); }).catch(function(e){ writing = false; toast('Not saved for others: ' + ((e && e.status === 403) || /denied|policy|permission/i.test(String(e && e.message)) ? 'this account is not an admin.' : (e && e.message) || 'offline')); }); }
  function toast(t){ var d = document.createElement('div'); d.className = 'qb-toast'; d.textContent = t; document.body.appendChild(d); clearTimeout(toastT); toastT = setTimeout(function(){ d.remove(); }, 2600); }

  /* ---- links ---- */
  function tagged(u){ var t = (CAT.store.tag || '').trim(); if (!t || !/amazon\./i.test(u)) return u; return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'tag=' + encodeURIComponent(t); }
  function link(it){ return it.asin ? tagged('https://www.amazon.ca/dp/' + it.asin) : tagged(it.url || '#'); }
  function cart(items){ var t = (CAT.store.tag || '').trim(); return 'https://www.amazon.ca/gp/aws/cart/add.html?' + (t ? 'AssociateTag=' + encodeURIComponent(t) + '&' : '') + items.map(function(it, i){ return 'ASIN.' + (i + 1) + '=' + it.asin + '&Quantity.' + (i + 1) + '=' + (it.qty || 1); }).join('&'); }
  function host(u){ try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

  /* ---- rendering ---- */
  function cats(){ var seen = {}, out = []; CAT.items.forEach(function(it){ if (!seen[it.cat]) { seen[it.cat] = 1; out.push(it.cat); } }); return out; }
  function card(it, i){
    /* compact row: picture · category + name · price + Order + Ordered? — no descriptions (those live in Learn) */
    var ord = window.ORD && window.ORD.ordered && window.ORD.ordered[it.id]; var on = !!ord;
    var dateTxt = on && window.supDate ? 'Ordered ' + window.supDate(ord) : (on ? 'Ordered' : 'Ordered?');
    var href = link(it);
    return '<article class="prod' + (it.img ? '' : ' noimg') + '" data-id="' + esc(it.id) + '">' +
      '<div class="prod-media">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy">' : '<span class="prod-ph">' + esc((it.cat || '').slice(0, 1)) + '</span>') + '</div>' +
      '<div class="prod-body"><span class="prod-cat">' + esc(it.cat) + '</span><h3>' + esc(it.title) + '</h3></div>' +
      '<div class="prod-right"><span class="prod-price">' + (it.price ? esc(it.price) : '<i>price on Amazon</i>') + '</span><a class="btn prod-buy" href="' + esc(href) + '" target="_blank" rel="noopener sponsored" title="' + esc(host(href)) + '">Order \u2197</a>' +
      '<label class="sup-ck' + (on ? ' on' : '') + '"><input type="checkbox" data-sup="' + esc(it.id) + '"' + (on ? ' checked' : '') + '><span>' + esc(dateTxt) + '</span></label></div>' +
      (ADMIN && editing ? '<div class="prod-admin"><button type="button" class="mini" data-act="up" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>\u2191</button><button type="button" class="mini" data-act="down" data-i="' + i + '" aria-label="Move down"' + (i === CAT.items.length - 1 ? ' disabled' : '') + '>\u2193</button><button type="button" class="mini" data-act="edit" data-i="' + i + '">Edit</button><button type="button" class="mini danger" data-act="del" data-i="' + i + '">Delete</button></div>' : '') +
      '</article>';
  }
  function field(id, label, val, attrs){ return '<label class="ck-f">' + label + '<input id="' + id + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '></label>'; }
  function formHtml(){
    if (form.kind === 'store') { var st = CAT.store;
      return '<div class="card ck-grp shop-form"><h3><i>⚙</i>Store settings</h3><div class="ck-two">' +
        field('sf-name', 'Store name (shown on the page)', st.name, 'placeholder="e.g. Quadra Lab Supply"') +
        field('sf-url', 'Storefront link (Amazon store page)', st.url, 'inputmode="url" placeholder="https://www.amazon.ca/shop/…"') +
        field('sf-tag', 'Amazon Associates tag (optional)', st.tag, 'autocapitalize="none" placeholder="yourtag-20"') +
        field('sf-intro', 'Intro line under the heading', st.intro, 'placeholder="' + esc(document.getElementById('sh-lede') ? document.getElementById('sh-lede').textContent : '') + '"') + '</div>' +
        '<label class="ck-f">Disclosure (shown when a tag or store link is set)<input id="sf-disc" value="' + esc(st.disclosure) + '"></label>' +
        '<div class="btn-row"><button type="button" class="btn" data-act="save-store">Save</button><button type="button" class="btn ghost" data-act="cancel">Cancel</button></div></div>'; }
    var it = form.item || { title: '', sub: '', blurb: '', url: '', asin: '', img: '', price: '', cat: cats()[0] || 'Other', qty: 1, kit: true, reorder: false };
    return '<div class="card ck-grp shop-form"><h3><i>' + (form.kind === 'add' ? '+' : '✎') + '</i>' + (form.kind === 'add' ? 'Add a product' : 'Edit product') + '</h3><div class="ck-two">' +
      field('pf-title', 'Product name *', it.title, 'placeholder="Milligram scale"') +
      field('pf-url', 'Amazon link or ASIN *', it.url || it.asin, 'inputmode="url" autocapitalize="none" placeholder="https://www.amazon.ca/dp/B0… or B0XXXXXXXX"') +
      field('pf-price', 'Price (as text)', it.price, 'placeholder="$34.99"') +
      field('pf-cat', 'Category', it.cat, 'list="pf-cats" placeholder="Syringes"') + '<datalist id="pf-cats">' + cats().map(function(c){ return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
      field('pf-img', 'Image link (optional)', it.img, 'inputmode="url" placeholder="https://m.media-amazon.com/images/….jpg"') +
      field('pf-qty', 'Quantity in the kit cart', it.qty || 1, 'type="number" min="1" step="1" inputmode="numeric"') + '</div>' +
      '<label class="ck-chk"><input type="checkbox" id="pf-kit"' + (it.kit ? ' checked' : '') + '><span><b>In the starter kit</b> — included in “Add the whole kit”.</span></label>' +
      '<label class="ck-chk"><input type="checkbox" id="pf-re"' + (it.reorder ? ' checked' : '') + '><span><b>Consumable</b> — included in “Reorder consumables”.</span></label>' +
      '<p class="prod-err" id="pf-err" hidden></p>' +
      '<div class="btn-row"><button type="button" class="btn" data-act="save-item">' + (form.kind === 'add' ? 'Add product' : 'Save') + '</button><button type="button" class="btn ghost" data-act="cancel">Cancel</button></div></div>';
  }
  function html(){
    var st = CAT.store, items = CAT.items, kit = items.filter(function(it){ return it.kit && it.asin; }), re = items.filter(function(it){ return it.reorder && it.asin; });
    var cs = cats(), shown = filter === 'All' ? items : items.filter(function(it){ return it.cat === filter; });
    var h = '';
    if (ADMIN) h += '<div class="shop-admin"><span class="shop-admin-l">Admin</span><label class="shop-sw"><input type="checkbox" id="shop-edit"' + (editing ? ' checked' : '') + '><span>Edit shop</span></label>' + (editing ? '<button type="button" class="btn" data-act="add">+ Add product</button><button type="button" class="btn ghost" data-act="store">Store settings</button>' : '') + '</div>';
    if (form) h += formHtml();
    if (st.name || st.url) h += '<div class="card soft shop-store"><div><div class="eyebrow">' + (st.url ? 'Amazon storefront' : 'Store') + '</div><h2>' + esc(st.name || 'Our Amazon store') + '</h2></div>' + (st.url ? '<a class="btn" href="' + esc(tagged(st.url)) + '" target="_blank" rel="noopener sponsored">Visit the store ↗</a>' : '') + '</div>';
    if (kit.length || re.length) h += '<div class="sup-actions">' + (kit.length ? '<a class="btn sup-cart" href="' + esc(cart(kit)) + '" target="_blank" rel="noopener sponsored">Add the whole kit to your cart ↗<em>Amazon.ca · ' + kit.length + ' item' + (kit.length === 1 ? '' : 's') + '</em></a>' : '') + (re.length ? '<a class="btn ghost sup-cart" href="' + esc(cart(re)) + '" target="_blank" rel="noopener sponsored">Reorder consumables ↗<em>' + esc(re.map(function(it){ return it.cat.toLowerCase(); }).filter(function(c, i, a){ return a.indexOf(c) === i; }).join(' · ')) + '</em></a>' : '') + '</div>';
    if (cs.length > 1) h += '<div class="chips" role="tablist">' + ['All'].concat(cs).map(function(c){ return '<button type="button" role="tab" data-cat="' + esc(c) + '" aria-selected="' + (c === filter) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    h += '<div class="prods">' + (shown.length ? shown.map(function(it){ return card(it, items.indexOf(it)); }).join('') : '<p class="empty">Nothing here yet.' + (ADMIN ? ' Turn on Edit shop and add a product.' : '') + '</p>') + '</div>';
    if ((st.tag || st.url) && st.disclosure) h += '<p class="note">' + esc(st.disclosure) + '</p>';
    return h;
  }
  function paint(){ el = el || document.getElementById('shop'); if (!el) return; el.innerHTML = html(); var ld = document.getElementById('sh-lede'); if (ld && CAT.store.intro) ld.textContent = CAT.store.intro; if (window.qbDeco) window.qbDeco(el); }

  /* ---- interaction ---- */
  function readItem(){
    var g = function(id){ var x = document.getElementById(id); return x ? x.value.trim() : ''; };
    var raw = g('pf-url'), asin = asinOf(raw), url = /^https?:\/\//i.test(raw) ? raw : (asin ? 'https://www.amazon.ca/dp/' + asin : raw);
    var it = { title: g('pf-title'), sub: (form.item && form.item.sub) || '', blurb: (form.item && form.item.blurb) || '', url: url, asin: asin, img: g('pf-img'), price: g('pf-price'), cat: g('pf-cat') || 'Other', qty: Math.max(1, parseInt(g('pf-qty'), 10) || 1), kit: !!document.getElementById('pf-kit').checked, reorder: !!document.getElementById('pf-re').checked };
    var err = !it.title ? 'Give the product a name.' : (!asin && !/^https?:\/\//i.test(url)) ? 'Paste the Amazon link (or the 10-character ASIN).' : '';
    return { it: it, err: err };
  }
  document.addEventListener('click', function(e){
    var root = document.getElementById('shop'); if (!root || !root.contains(e.target)) return;
    var c = e.target.closest('[data-cat]'); if (c) { filter = c.getAttribute('data-cat'); paint(); return; }
    var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act'), i = parseInt(b.getAttribute('data-i'), 10);
    if (!ADMIN && a !== 'cancel') return;
    if (a === 'add') { form = { kind: 'add' }; paint(); window.scrollTo(0, 0); }
    else if (a === 'store') { form = { kind: 'store' }; paint(); window.scrollTo(0, 0); }
    else if (a === 'cancel') { form = null; paint(); }
    else if (a === 'edit') { form = { kind: 'edit', i: i, item: CAT.items[i] }; paint(); window.scrollTo(0, 0); }
    else if (a === 'del') { var it = CAT.items[i]; if (!it) return; if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Delete “' + it.title.slice(0, 18) + (it.title.length > 18 ? '…' : '') + '”?'; setTimeout(function(){ if (b.isConnected) { b.classList.remove('armed'); b.textContent = 'Delete'; } }, 3500); return; } CAT.items.splice(i, 1); persist(); }
    else if (a === 'up' || a === 'down') { var k = a === 'up' ? i - 1 : i + 1; if (k < 0 || k >= CAT.items.length) return; var t = CAT.items[i]; CAT.items[i] = CAT.items[k]; CAT.items[k] = t; persist(); }
    else if (a === 'save-store') { var g = function(id){ var x = document.getElementById(id); return x ? x.value.trim() : ''; }; CAT.store = { name: g('sf-name'), url: g('sf-url'), tag: g('sf-tag').replace(/^tag=/, ''), intro: g('sf-intro'), disclosure: g('sf-disc') || DEFAULT_DISC }; form = null; persist(); }
    else if (a === 'save-item') { var r = readItem(), er = document.getElementById('pf-err'); if (r.err) { er.textContent = r.err; er.hidden = false; return; }
      if (form.kind === 'edit') { var old = CAT.items[form.i] || {}; r.it.id = old.id || r.it.asin || slug(r.it.title); CAT.items[form.i] = r.it; }
      else { r.it.id = r.it.asin || slug(r.it.title) || ('p' + Date.now().toString(36)); if (CAT.items.some(function(x){ return x.id === r.it.id; })) r.it.id += '-' + Date.now().toString(36).slice(-3); CAT.items.push(r.it); }
      form = null; persist(); }
  });
  document.addEventListener('change', function(e){ if (e.target && e.target.id === 'shop-edit') { editing = e.target.checked; if (!editing) form = null; paint(); } });
  window.qbShopRender = paint;
  window.qbShop = { get: function(){ return CAT; } };
  var pnl = document.querySelector('section[data-panel="shop"]'); if (pnl && !pnl.hidden) paint();
})();
