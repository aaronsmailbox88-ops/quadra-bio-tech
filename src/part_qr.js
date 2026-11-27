/* ===== QR scanner (v125): the phone's camera reads the code on a vial or a certificate.
   window.qbScan({title, hint}) → Promise resolving to the decoded text, or null when closed.
   Live camera through getUserMedia, frames decoded by jsQR (vendored) or the native BarcodeDetector where the browser has one;
   when the camera cannot be used (no permission, desktop, an embedded view) a photo of the code is decoded instead. ===== */
(function(){
  'use strict';
  var sheet = null, stream = null, raf = 0, done = null, busy = false;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stop(){ if (raf) cancelAnimationFrame(raf); raf = 0; if (stream) { try { stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {} stream = null; } }
  function close(result){ stop(); if (sheet) { sheet.remove(); sheet = null; } busy = false; var d = done; done = null; if (d) d(result || null); }
  function decodeCanvas(canvas, det){
    /* returns a Promise<string|null> */
    if (det) return det.detect(canvas).then(function(codes){ var c = codes && codes[0]; return c && c.rawValue ? c.rawValue : null; }).catch(function(){ return null; });
    try {
      if (!window.jsQR) return Promise.resolve(null);
      var ctx = canvas.getContext('2d'); var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      return Promise.resolve(r && r.data ? r.data : null);
    } catch (e) { return Promise.resolve(null); }
  }
  function fit(w, h, max){ var s = Math.min(1, max / Math.max(w, h)); return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) }; }
  function msg(t, bad){ if (!sheet) return; var m = sheet.querySelector('.qr-msg'); m.textContent = t || ''; m.hidden = !t; m.classList.toggle('bad', !!bad); }
  function makeDetector(){ try { if ('BarcodeDetector' in window) return new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) {} return null; }
  function startCamera(video, det){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('no camera API'));
    return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }).then(function(s){
      stream = s; video.srcObject = s; return video.play().catch(function(){}); }).then(function(){
      var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true }); var last = 0, pending = false;
      function tick(ts){
        if (!sheet) return; raf = requestAnimationFrame(tick);
        if (pending || ts - last < 180 || !video.videoWidth) return; last = ts; pending = true;
        var d = fit(video.videoWidth, video.videoHeight, 720); canvas.width = d.w; canvas.height = d.h; ctx.drawImage(video, 0, 0, d.w, d.h);
        decodeCanvas(canvas, det).then(function(text){ pending = false; if (text && sheet) { try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {} close(text); } });
      }
      raf = requestAnimationFrame(tick); });
  }
  function fromFile(file, det){
    return new Promise(function(res){
      var url = URL.createObjectURL(file); var im = new Image();
      im.onload = function(){ var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        /* try a few sizes: small codes on a large photo decode better at full size, big ones at a reduced size */
        var sizes = [1400, 900, 600], i = 0;
        (function next(){ if (i >= sizes.length) { URL.revokeObjectURL(url); res(null); return; } var d = fit(im.naturalWidth, im.naturalHeight, sizes[i++]); canvas.width = d.w; canvas.height = d.h; ctx.drawImage(im, 0, 0, d.w, d.h);
          decodeCanvas(canvas, det).then(function(t){ if (t) { URL.revokeObjectURL(url); res(t); } else next(); }); })(); };
      im.onerror = function(){ URL.revokeObjectURL(url); res(null); };
      im.src = url; });
  }
  window.qbScan = function(opts){
    opts = opts || {};
    return new Promise(function(resolve){
      if (sheet) close(null); done = resolve; busy = true;
      sheet = document.createElement('div'); sheet.className = 'qr-sheet';
      sheet.innerHTML = '<div class="qr-bar"><span>' + esc(opts.title || 'Scan a QR code') + '</span><button type="button" class="qr-x" aria-label="Close">✕</button></div>'
        + '<div class="qr-view"><video playsinline muted autoplay></video><div class="qr-frame"><i></i><i></i><i></i><i></i></div></div>'
        + '<p class="qr-hint">' + esc(opts.hint || 'Hold the code inside the frame. It reads by itself.') + '</p>'
        + '<p class="qr-msg" hidden></p>'
        + '<div class="qr-actions"><label class="btn ghost sm qr-photo">Use a photo instead<input type="file" accept="image/*" capture="environment" hidden></label><button type="button" class="btn ghost sm qr-cancel">Cancel</button></div>';
      document.body.appendChild(sheet);
      var video = sheet.querySelector('video'), det = makeDetector();
      sheet.querySelector('.qr-x').addEventListener('click', function(){ close(null); });
      sheet.querySelector('.qr-cancel').addEventListener('click', function(){ close(null); });
      sheet.querySelector('input[type=file]').addEventListener('change', function(e){ var f = e.target.files && e.target.files[0]; if (!f) return; msg('Reading the photo…');
        fromFile(f, det).then(function(t){ if (t) close(t); else msg('No QR code found in that photo. Fill the frame with the code, in good light, and try again.', true); e.target.value = ''; }); });
      if (!window.jsQR && !det) { msg('This build cannot read codes. Type the numbers instead.', true); }
      startCamera(video, det).catch(function(){ if (!sheet) return; sheet.classList.add('nocam'); msg('The camera is not available here. Take a photo of the code instead.', true); });
    });
  };
  window.qbScanBusy = function(){ return busy; };
  /* decode a code's text into the fields the checker wants: a URL with lot / peptide / mg parameters (our labels), a lab's verification link, or plain text */
  window.qbParseQR = function(txt){
    var out = { raw: String(txt || ''), url: null, host: '', path: '', params: {}, lot: null, pep: null, mg: null, report: null };
    var m = /^\s*(https?:\/\/\S+)/i.exec(out.raw) || /^\s*((?:[a-z0-9-]+\.)+[a-z]{2,}\/\S*)/i.exec(out.raw);
    if (m) { try { var u = new URL(/^https?:/i.test(m[1]) ? m[1] : 'https://' + m[1]); out.url = u.href; out.host = u.hostname.replace(/^www\./i, '').toLowerCase(); out.path = u.pathname; u.searchParams.forEach(function(v, k){ out.params[k.toLowerCase()] = v; }); } catch (e) {} }
    var P = out.params;
    out.lot = P.lot || P.batch || P.l || P.b || null; out.pep = P.p || P.pep || P.peptide || P.product || P.compound || null; out.mg = P.mg || P.amount || P.m || null;
    if (out.url) { var segs = out.path.split('/').filter(Boolean); var lastSeg = segs[segs.length - 1] || '';
      if (!out.lot && /^(lot|batch|l)$/i.test(segs[segs.length - 2] || '') && lastSeg) out.lot = decodeURIComponent(lastSeg);
      if (/^[A-Z0-9][A-Z0-9_-]{3,}$/i.test(lastSeg) && !/\.(html?|pdf|php|aspx?)$/i.test(lastSeg)) out.report = decodeURIComponent(lastSeg); }
    else {
      var lm = /(?:lot|batch)\s*(?:no\.?|number|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i.exec(out.raw); if (lm) out.lot = lm[1];
      var mm = /(\d+(?:\.\d+)?)\s*mg\b/i.exec(out.raw); if (mm) out.mg = mm[1];
      var kv = {}; out.raw.split(/[\n;|,]+/).forEach(function(part){ var p = /^\s*([a-z_ ]{1,20})\s*[:=]\s*(.+?)\s*$/i.exec(part); if (p) kv[p[1].trim().toLowerCase()] = p[2]; });
      if (!out.lot && (kv.lot || kv.batch)) out.lot = kv.lot || kv.batch; if (kv.peptide || kv.product || kv.compound || kv.p) out.pep = kv.peptide || kv.product || kv.compound || kv.p; if (!out.mg && kv.mg) out.mg = kv.mg;
      if (!out.pep) (window.PEPTIDES || []).forEach(function(p){ if (!out.pep && new RegExp('\\b' + p.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(out.raw)) out.pep = p.name; });
    }
    if (out.pep) { var key = String(out.pep).toLowerCase().replace(/[^a-z0-9]/g, ''); var hit = (window.PEPTIDES || []).filter(function(p){ return p.id === key || p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === key; })[0]; if (hit) out.pep = hit.name; }
    if (out.mg) { var x = parseFloat(String(out.mg).replace(',', '.')); out.mg = isFinite(x) && x > 0 ? String(x) : null; }
    if (out.lot) out.lot = String(out.lot).trim().toUpperCase();
    return out;
  };
})();
