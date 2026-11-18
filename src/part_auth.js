/* Quadra Bio Tech — hosted build only: account sign-in (Supabase Auth, email + password) and the per-user document store.
   Provides window.claude.use('db' | 'user') so the app's sync code runs unchanged outside claude.ai. */
(function(){
  var CFG = window.QB_SB; if (!CFG || !CFG.url || !CFG.key) return;
  var URL0 = CFG.url.replace(/\/$/, ''), KEY = CFG.key, SKEY = 'qb-session';
var RT = '?redirect_to=' + encodeURIComponent(location.origin + location.pathname);   // confirmation and reset links come back to this page (must be on the project's redirect allow-list)
  var session = null, user = null, readyRes, ready = new Promise(function(r){ readyRes = r; });
  var store = localStorage;   // 'Keep me signed in on this device' -> localStorage; otherwise sessionStorage (cleared when the app is closed)
  function load(){ session = null; try { var v = localStorage.getItem(SKEY); if (v) { store = localStorage; } else { v = sessionStorage.getItem(SKEY); if (v) store = sessionStorage; } session = JSON.parse(v || 'null'); } catch(e){ session = null; } }
  function save(s){ session = s; try { if (s) { store.setItem(SKEY, JSON.stringify(s)); (store === localStorage ? sessionStorage : localStorage).removeItem(SKEY); } else { localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY); } } catch(e){} }
  function hdr(auth){ var h = { apikey: KEY, 'content-type': 'application/json' }; if (auth && session) h.authorization = 'Bearer ' + session.access_token; return h; }
  function j(r){ return r.text().then(function(t){ var d = null; try { d = t ? JSON.parse(t) : null; } catch(e){ d = { msg: t }; } if (!r.ok) { var e = new Error((d && (d.msg || d.message || d.error_description || d.error)) || ('HTTP ' + r.status)); e.status = r.status; e.body = d; throw e; } return d; }); }
  function setSession(d){ if (!d || !d.access_token) return; save({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: d.user || (session && session.user) }); user = session.user; }
  function refresh(){ if (!session || !session.refresh_token) return Promise.reject(new Error('no session'));
    return fetch(URL0 + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: hdr(false), body: JSON.stringify({ refresh_token: session.refresh_token }) }).then(j).then(function(d){ setSession(d); return session; }); }
  function ensure(){ if (!session) return Promise.reject(new Error('signed out')); if (session.expires_at - Math.floor(Date.now() / 1000) > 90) return Promise.resolve(session); return refresh().catch(function(e){ save(null); user = null; throw e; }); }
  var A = {
    signUp: function(email, password){ return fetch(URL0 + '/auth/v1/signup' + RT, { method: 'POST', headers: hdr(false), body: JSON.stringify({ email: email, password: password }) }).then(j).then(function(d){ if (d && d.access_token) { setSession(d); return { signedIn: true }; } return { signedIn: false, confirm: true }; }); },
    signIn: function(email, password){ return fetch(URL0 + '/auth/v1/token?grant_type=password', { method: 'POST', headers: hdr(false), body: JSON.stringify({ email: email, password: password }) }).then(j).then(function(d){ setSession(d); return session; }); },
    recover: function(email){ return fetch(URL0 + '/auth/v1/recover' + RT, { method: 'POST', headers: hdr(false), body: JSON.stringify({ email: email }) }).then(j); },
    setPassword: function(password){ return ensure().then(function(){ return fetch(URL0 + '/auth/v1/user', { method: 'PUT', headers: hdr(true), body: JSON.stringify({ password: password }) }).then(j); }); },
    signOut: function(){ var s = session; save(null); user = null; if (s) fetch(URL0 + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, authorization: 'Bearer ' + s.access_token } }).catch(function(){}); location.reload(); },
    user: function(){ return user; }
  };
  // ----- per-user documents (table user_docs: user_id, path, data, updated_at) -----
  function docKey(path){ return String(path).split('/').filter(Boolean).pop(); }
  function rest(q, opt){ return ensure().then(function(){ var o = opt || {}; o.headers = Object.assign(hdr(true), o.headers || {}); return fetch(URL0 + '/rest/v1/user_docs' + q, o).then(j); }); }
  function snap(row){ return { exists: !!row, data: function(){ return row ? row.data : undefined; }, metadata: { hasPendingWrites: false }, updated: row ? row.updated_at : null }; }
  // shared documents (table qb_shared_docs: path, data, updated_at, updated_by) — any signed-in user reads, qb_admins write; paths shop/* and shared/*
  function isShared(path){ return /^(shop|shared)\//.test(String(path)); }
  function restS(q, opt){ return ensure().then(function(){ var o = opt || {}; o.headers = Object.assign(hdr(true), o.headers || {}); return fetch(URL0 + '/rest/v1/qb_shared_docs' + q, o).then(j); }); }
  var adminP = null;
  function isAdmin(){ if (!adminP) adminP = ready.then(function(){ if (!user) return false; return ensure().then(function(){ return fetch(URL0 + '/rest/v1/rpc/qb_is_admin', { method: 'POST', headers: hdr(true), body: '{}' }).then(j).then(function(v){ return v === true; }); }); }).catch(function(){ adminP = null; return false; }); return adminP; }
  function makeDoc(path){ var key = docKey(path), last = null, shared = isShared(path), full = String(path).replace(/^\/+/, '');
    function get(){ return (shared ? restS('?select=data,updated_at&path=eq.' + encodeURIComponent(full), { method: 'GET' }) : rest('?select=data,updated_at&path=eq.' + encodeURIComponent(key), { method: 'GET' })).then(function(rows){ var r = rows && rows[0]; if (r) last = r.updated_at; return snap(r); }); }
    function set(data){ var now = new Date().toISOString(); return (shared ? restS('', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ path: full, data: data, updated_at: now, updated_by: user.id }) }) : rest('', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, path: key, data: data, updated_at: now }) })).then(function(){ last = now; }); }
    return { get: get, set: set,
      update: function(patch){ return get().then(function(s){ var cur = s.exists ? (s.data() || {}) : {}; return set(Object.assign({}, cur, patch)); }); },
      onSnapshot: function(fn){ var stop = false; function tick(){ if (stop || document.hidden) return; get().then(function(s){ if (stop) return; if (s.exists && s.updated !== seen) { seen = s.updated; fn(s); } }).catch(function(){}); }
        var seen = last; var iv = setInterval(tick, 25000); var vis = function(){ if (!document.hidden) tick(); }; document.addEventListener('visibilitychange', vis);
        return function(){ stop = true; clearInterval(iv); document.removeEventListener('visibilitychange', vis); }; } };
  }
  var DB = { doc: makeDoc, collection: function(p){ return { doc: function(id){ return makeDoc(p + '/' + id); } }; } };
  var USER = { id: function(){ return ready.then(function(){ return user ? user.id : null; }); }, me: function(){ return ready.then(function(){ return { id: user ? user.id : null, name: user ? (user.email || '') : '', guest: false }; }); },
    isOwner: function(){ return isAdmin(); }, canEdit: function(){ return isAdmin(); }, can: function(name){ return name === 'data.write' ? isAdmin() : true; }, profiles: function(ids){ var o = {}; (ids || []).forEach(function(i){ o[i] = { name: i === (user && user.id) ? (user.email || 'You') : '' }; }); return Promise.resolve(o); } };
  window.claude = { use: function(name){ if (name === 'db') return ready.then(function(){ return user ? DB : null; }); if (name === 'user') return ready.then(function(){ return user ? USER : null; }); return Promise.resolve(null); } };
  window.qbAuth = A;
  // ----- gate UI -----
  function el(h){ var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var gate = null, mode = 'in';
  function gateHtml(){
    var recovery = mode === 'reset', up = mode === 'up';
    return '<div class="qb-gate" id="qb-gate"><div class="qb-card">' +
      '<div class="qb-logo">' + (window.QB_MARK || '') + '<b>Quadra <i>Bio Tech</i></b></div>' +
      (recovery ? '<h1 class="qb-h">Set a new password</h1>' :
        '<nav class="qb-seg"><a href="#" data-mode="in" class="' + (up ? '' : 'on') + '">Sign in</a><a href="#" data-mode="up" class="' + (up ? 'on' : '') + '">Create account</a></nav>') +
      '<form class="qb-form" id="qb-form" novalidate>' +
      (recovery ? '' : '<label class="f"><span>Email</span><input id="qb-email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com"></label>') +
      '<label class="f"><span>' + (recovery ? 'New password' : 'Password') + '</span><input id="qb-pw" type="password" autocomplete="' + (mode === 'in' ? 'current-password' : 'new-password') + '" required minlength="8" placeholder="at least 8 characters"></label>' +
      (recovery ? '' : '<label class="qb-keep"><input type="checkbox" id="qb-keep"' + (store === localStorage ? ' checked' : '') + '><span>Keep me signed in on this device</span></label>') +
      '<p class="qb-msg" id="qb-msg" hidden></p>' +
      '<button type="submit" class="btn qb-primary" id="qb-go">' + (recovery ? 'Save password' : (up ? 'Create account' : 'Sign in')) + '</button>' +
      (recovery || up ? '' : '<div class="qb-links"><a href="#" data-act="forgot">Forgot password?</a></div>') +
      '</form></div><p class="qb-foot">Educational tool · not medical advice · sells nothing</p></div>';
  }
  function msg(t, kind){ var m = document.getElementById('qb-msg'); if (!m) return; m.textContent = t || ''; m.hidden = !t; m.className = 'qb-msg' + (kind ? ' ' + kind : ''); }
  function showGate(){ if (gate) gate.remove(); gate = el(gateHtml()); document.body.appendChild(gate); document.body.classList.add('qb-locked');
    gate.addEventListener('click', function(e){ var a = e.target.closest('a[data-mode],a[data-act]'); if (!a) return; e.preventDefault();
      if (a.dataset.mode) { mode = a.dataset.mode; showGate(); return; }
      if (a.dataset.act === 'forgot') { var em = (document.getElementById('qb-email').value || '').trim(); if (!em) { msg('Type your email first, then tap Forgot password.', 'warn'); return; }
        A.recover(em).then(function(){ msg('Reset email sent to ' + em + '. Open the link, set a new password, then come back and sign in.', 'ok'); }).catch(function(err){ msg(err.message, 'err'); }); } });
    gate.querySelector('#qb-form').addEventListener('submit', function(e){ e.preventDefault(); var go = document.getElementById('qb-go'); go.disabled = true; msg('');
      var keep = document.getElementById('qb-keep'); if (keep) store = keep.checked ? localStorage : sessionStorage;
      var pw = document.getElementById('qb-pw').value; var emEl = document.getElementById('qb-email'); var em = emEl ? emEl.value.trim() : '';
      var p;
      if (mode === 'reset') p = A.setPassword(pw).then(function(){ history.replaceState(null, '', location.pathname + location.search); done(); });
      else if (mode === 'up') p = A.signUp(em, pw).then(function(r){ if (r.signedIn) done(); else { mode = 'in'; showGate(); document.getElementById('qb-email').value = em; msg('Check your email and open the confirmation link. Then come back here and sign in.', 'ok'); } });
      else p = A.signIn(em, pw).then(done);
      p.catch(function(err){ var t = err.message || 'Something went wrong'; if (/not confirmed/i.test(t)) t = 'Email not confirmed yet — open the link in the email we sent, then sign in.'; if (/invalid login/i.test(t)) t = 'Wrong email or password.'; if (/rate limit/i.test(t)) t = 'Too many emails sent for now — try again in an hour.'; msg(t, 'err'); go.disabled = false; }); }); }
  function done(){ user = session && session.user; if (gate) { gate.remove(); gate = null; } document.body.classList.remove('qb-locked'); readyRes(); paintHeader(); if (window.qbWalk) window.qbWalk.maybe(); }
  window.qbAcctHtml = function(){ return user ? '<span class="qb-acct"><span>' + esc(user.email || '') + '</span><a href="#" class="qb-out">Sign out</a></span>' : ''; };
  function paintHeader(){ var h = document.querySelector('.pep-wrap small.brandline'); if (!h || !user || h.querySelector('.qb-acct')) return; h.insertAdjacentHTML('beforeend', window.qbAcctHtml());
    var t = document.getElementById('mode-title'); if (t && t.querySelector('small.brandline') && !t.querySelector('.qb-acct')) t.querySelector('small.brandline').insertAdjacentHTML('beforeend', window.qbAcctHtml()); }
  document.addEventListener('click', function(e){ var a = e.target.closest('.qb-out'); if (!a) return; e.preventDefault(); if (confirm('Sign out on this device? Your data stays in your account.')) A.signOut(); });
  // ----- start -----
  function fromHash(){ var m = location.hash.match(/access_token=([^&]+)/); if (!m) return null; var q = {}; location.hash.slice(1).split('&').forEach(function(kv){ var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); return q; }
  function boot(){
    if (/^#(signup|create)$/.test(location.hash)) mode = 'up';
    if (/^#(signin|signup|create|login)$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    var h = fromHash();
    if (h && h.access_token) { save({ access_token: h.access_token, refresh_token: h.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (parseInt(h.expires_in, 10) || 3600), user: null });
      fetch(URL0 + '/auth/v1/user', { headers: { apikey: KEY, authorization: 'Bearer ' + h.access_token } }).then(j).then(function(u){ session.user = u; save(session); user = u;
        if (h.type === 'recovery') { mode = 'reset'; showGate(); } else { history.replaceState(null, '', location.pathname + location.search); done(); } }).catch(function(){ save(null); showGate(); });
      return; }
    load();
    if (session && session.refresh_token) { ensure().then(function(){ if (!session.user) return fetch(URL0 + '/auth/v1/user', { headers: { apikey: KEY, authorization: 'Bearer ' + session.access_token } }).then(j).then(function(u){ session.user = u; save(session); }); })
      .then(function(){ done(); }).catch(function(){ save(null); showGate(); }); }
    else showGate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
