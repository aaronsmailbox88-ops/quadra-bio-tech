/* ===== Vial tracker (weigh-based) ===== */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var EXTRA=['Cagrilintide','PT-141','NAD+','L-carnitine','Glutathione'];
  var PEPS=(function(){ var out=[]; try{ (window.PEPTIDES||[]).forEach(function(p){ if(p&&p.name&&out.indexOf(p.name)<0) out.push(p.name) }) }catch(e){} EXTRA.forEach(function(n){ if(out.indexOf(n)<0) out.push(n) }); return out })();
  var LS='vt-state', LSW='vt-wiz';
  var state={v:1, scale:{res:0.001, acc:0.005}, vials:[]};
  var store={mode:'local', doc:null};

  // ---------- helpers
  function num(id){var el=$('#'+id); if(!el) return NaN; var v=parseFloat(String(el.value).replace(',','.')); return isFinite(v)?v:NaN}
  function r3(x){return Math.round(x*1000)/1000} function r2(x){return Math.round(x*100)/100} function r1(x){return Math.round(x*10)/10}
  function fmtG(x){return isFinite(x)?x.toFixed(3)+' g':'—'} function fmtMg(x){return isFinite(x)?(Math.abs(x)<1?x.toFixed(2):x.toFixed(1))+' mg':'—'} function fmtMl(x){return isFinite(x)?x.toFixed(3)+' mL':'—'}
  function units(g){return isFinite(g)?Math.round(g*100):null}
  function today(){var d=new Date(); d.setHours(0,0,0,0); return d}
  function dstr(d){return d?d.toISOString().slice(0,10):''}
  function dlabel(d){return d?d.toLocaleDateString(undefined,{month:'short',day:'numeric'}):'—'}
  function dtlabel(iso){var d=new Date(iso); return isNaN(d)?iso:d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
  function uid(){return 'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function clean(s){
    s=(s&&typeof s==='object')?s:{}; var out={v:1, scale:{res:0.001, acc:0.005}, vials:[]};
    if(s.scale&&isFinite(+s.scale.acc)) out.scale.acc=+s.scale.acc; if(s.scale&&isFinite(+s.scale.res)) out.scale.res=+s.scale.res;
    (Array.isArray(s.vials)?s.vials:[]).forEach(function(v){ if(!v||!v.id) return; var c={id:String(v.id), name:String(v.name||'Vial'), src:String(v.src||''), label_mg:+v.label_mg||0, diluent:String(v.diluent||'Bacteriostatic water'),
      dry_g:+v.dry_g||0, full_g:+v.full_g||0, syr_water_g:isFinite(+v.syr_water_g)?+v.syr_water_g:null, syr_tare_g:isFinite(+v.syr_tare_g)?+v.syr_tare_g:null, scale_check_g:isFinite(+v.scale_check_g)?+v.scale_check_g:null, scale_zero_g:isFinite(+v.scale_zero_g)?+v.scale_zero_g:null, draws:[],
      planned_mg:isFinite(+v.planned_mg)&&+v.planned_mg>0?+v.planned_mg:null, next_mg:isFinite(+v.next_mg)&&+v.next_mg>0?+v.next_mg:null, step_after:isFinite(+v.step_after)&&+v.step_after>=0?Math.round(+v.step_after):4, per_week:isFinite(+v.per_week)?+v.per_week:1, lead_days:isFinite(+v.lead_days)?+v.lead_days:10,
      status:['active','ordered','out','archived','rejected'].indexOf(v.status)>=0?v.status:'active', ordered_on:v.ordered_on||null, created:v.created||new Date().toISOString(), mixed_on:(v.mixed_on&&/^\d{4}-\d{2}-\d{2}$/.test(v.mixed_on))?v.mixed_on:String(v.created||new Date().toISOString()).slice(0,10), expiry_days:isFinite(+v.expiry_days)&&+v.expiry_days>0?Math.round(+v.expiry_days):28, notes:String(v.notes||''), checks:cleanChecks(v.checks), filtered:cleanFiltered(v.filtered), doses:[], weights:[]};
      (Array.isArray(v.draws)?v.draws:[]).forEach(function(g){ if(isFinite(+g)&&+g>0) c.draws.push(+g) });
      (Array.isArray(v.doses)?v.doses:[]).forEach(function(d){ if(!d||!isFinite(+d.mg)) return; c.doses.push({t:String(d.t||''), ml:+d.ml||0, mg:+d.mg, method:String(d.method||'manual'), before_g:isFinite(+d.before_g)?+d.before_g:null, after_g:isFinite(+d.after_g)?+d.after_g:null, syr_empty_g:isFinite(+d.syr_empty_g)?+d.syr_empty_g:null, syr_full_g:isFinite(+d.syr_full_g)?+d.syr_full_g:null, note:String(d.note||''), photo:cleanMeta(d.photo), photo_vial:cleanMeta(d.photo_vial)}) });
      (Array.isArray(v.weights)?v.weights:[]).forEach(function(w){ if(!w||!isFinite(+w.g)) return; c.weights.push({t:String(w.t||''), g:+w.g}) });
      out.vials.push(c) });
    return out;
  }
  function cleanFiltered(f){ if(!f||typeof f!=='object') return null; var d=+f.dry_g, u=+f.full_g; if(!(d>0)||!(u>d)) return null; return {dry_g:r3(d), full_g:r3(u), t:String(f.t||'')} }
  function cleanMeta(m){ if(!m||typeof m!=='object') return null; return {kind:String(m.kind||''), t:String(m.t||''), g:isFinite(+m.g)&&m.g!==null?+m.g:null, checked:!!m.checked, ok:!!m.ok, readable:m.readable!==false, issues:(Array.isArray(m.issues)?m.issues:[]).map(String).slice(0,4), seen:String(m.seen||'').slice(0,160), override:!!m.override, nophoto:!!m.nophoto, saved:!!m.saved} }
  function cleanChecks(c){ var out={}; if(!c||typeof c!=='object') return out; Object.keys(c).forEach(function(k){ if(/^[a-z]+\d*$/.test(k)){ var m=cleanMeta(c[k]); if(m) out[k]=m } }); return out }
  function loadLocal(){try{var s=JSON.parse(localStorage.getItem(LS)||'null'); if(s) state=clean(s)}catch(e){}}
  function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(state))}catch(e){}}

  // ---------- dose ladder: dose i (1-based) is the current dose until step_after doses are done, then the next dose
  function doseAt(v,i){ if(!v.planned_mg) return null; if(v.next_mg&&i>v.step_after) return v.next_mg; return v.planned_mg }
  function ladderText(v){ if(!v.planned_mg) return ''; if(!v.next_mg||v.next_mg===v.planned_mg) return fmtMg(v.planned_mg)+' × '+v.per_week+'/wk'; var left=Math.max(0,v.step_after-v.doses.length); return (left?left+' more at '+fmtMg(v.planned_mg)+', then ':'now ')+fmtMg(v.next_mg)+' × '+v.per_week+'/wk' }
  // project how many full doses a quantity gives, following the ladder from dose index `from`
  function project(v,remaining,from){ var rem=remaining, i=from, n=0, parts={}; while(n<2000){ var mg=doseAt(v,i); if(!mg||rem<mg-1e-9) break; rem-=mg; n++; parts[mg]=(parts[mg]||0)+1; i++ } return {n:n, left:rem, parts:parts} }

  // ---------- derived numbers
  function calc(v){
    var water=r3(v.full_g-v.dry_g); var conc=water>0?v.label_mg/water:NaN;
    // sterile-filtered into a new vial: the new vial's empty weight is the tare from then on, and what stayed in the filter is gone
    var dryNow=v.filtered?v.filtered.dry_g:v.dry_g; var lostMl=v.filtered?Math.max(0,r3(water-(v.filtered.full_g-v.filtered.dry_g))):0; var lostMg=isFinite(conc)?r2(lostMl*conc):0;
    var taken=v.doses.reduce(function(a,d){return a+d.mg},0); var takenMl=v.doses.reduce(function(a,d){return a+d.ml},0);
    var remaining=Math.max(0,v.label_mg-lostMg-taken); var pct=v.label_mg>0?remaining/v.label_mg:0;
    var remMl=Math.max(0,water-lostMl-takenMl);
    var lastW=v.weights.length?v.weights[v.weights.length-1]:null; var byWeight=null;
    if(lastW&&water>0){ var liq=lastW.g-dryNow; byWeight={g:lastW.g, ml:r3(liq), mg:r2(liq/water*v.label_mg), t:lastW.t} }
    var expectNow=null; if(lastW){ var after=v.doses.filter(function(d){ return d.t>lastW.t }).reduce(function(a,d){ return a+d.ml },0); expectNow=r3(lastW.g-after) } else if(v.full_g>0){ expectNow=r3(v.full_g-takenMl) }
    var nextMg=doseAt(v,v.doses.length+1); var nextG=(nextMg&&isFinite(conc))?nextMg/conc:null;
    var pr=nextMg?project(v,remaining,v.doses.length+1):null; var dosesLeft=pr?pr.n:null;
    var weekMg=nextMg&&v.per_week>0?nextMg*v.per_week:null; var weekLeft=!!(weekMg&&remaining<=weekMg+1e-9&&remaining>0.0001);
    var lastDose=v.doses.length?new Date(v.doses[v.doses.length-1].t):null; if(lastDose&&isNaN(lastDose)) lastDose=null;
    var mixed=v.mixed_on?new Date(v.mixed_on+'T00:00:00'):null; var expires=null, daysToExp=null;
    if(mixed&&!isNaN(mixed)){ expires=new Date(mixed.getTime()+v.expiry_days*86400000); daysToExp=Math.round((expires-today())/86400000) }
    var runOut=null, reorder=null, daysLeft=null, expiresFirst=false;
    var st='ok', label='In stock';
    if(v.status==='rejected'){st='bad';label='Rejected — do not use'}
    else if(v.status==='archived'){st='plain';label='Archived'}
    else if(expires&&daysToExp<0){st='bad';label='Expired'}
    else if(v.status==='out'||remaining<=0.0001){st='bad';label='Out'}
    else if(v.status==='ordered'){st='info';label='Ordered'}
    else if(weekLeft){st='bad';label=dosesLeft===0?'Order now — less than a dose left':'Order now — a week left'}
    else if(expires&&daysToExp<=7){st='warn';label='Expires soon'}
    return {expires:expires, daysToExp:daysToExp, expiresFirst:expiresFirst, water:water, conc:conc, dryNow:dryNow, lostMl:lostMl, lostMg:lostMg, taken:taken, takenMl:takenMl, remaining:remaining, pct:pct, remMl:remMl, byWeight:byWeight, expectNow:expectNow, nextMg:nextMg, nextG:nextG, dosesLeft:dosesLeft, parts:pr?pr.parts:null, weekLeft:weekLeft, runOut:runOut, reorder:reorder, daysLeft:daysLeft, st:st, label:label, count:v.doses.length};
  }
  function summaryFor(v){var c=calc(v); return {state:c.label, mixed_on:v.mixed_on, expires_on:dstr(c.expires), remaining_mg:r2(c.remaining), pct:Math.round(c.pct*100), doses:c.count, dose_now_mg:c.nextMg||null, dose_now_g:c.nextG?r3(c.nextG):null, doses_left_at_dose_now:c.dosesLeft, week_left:c.weekLeft, conc_mg_ml:isFinite(c.conc)?r2(c.conc):null, updated:new Date().toISOString()}}
  function partsText(parts){ if(!parts) return ''; return Object.keys(parts).map(function(k){return +k}).sort(function(a,b){return a-b}).map(function(k){return parts[k]+' × '+fmtMg(k)}).join(' + ') }

  // ---------- persistence
  var writing=false, pending=false;
  function payload(){ return {v:1, scale:state.scale, vials:state.vials.map(function(v){var o=JSON.parse(JSON.stringify(v)); o.summary=summaryFor(v); return o})} }
  function pushDb(){ if(store.mode!=='db') return; if(writing){pending=true;return} writing=true;
    store.doc.set(payload()).then(function(){setSync(true)},function(){setSync(false,'Could not save to your account; kept in this browser.')}).then(function(){writing=false; if(pending){pending=false;pushDb()}}) }
  function commit(){saveLocal(); pushDb(); render()}
  function setSync(on,msg){var e=$('#vl-sync'); e.className='sync'+(on?' on':''); e.textContent=msg||(on?'Saved privately to your account':'Saved in this browser only')}
  function initDb(){
    if(!(window.claude&&typeof window.claude.use==='function')) return;
    Promise.all([window.claude.use('db'),window.claude.use('user')]).then(function(r){var db=r[0],user=r[1]; if(!db||!user) return null;
      return user.id().then(function(id){ if(!id) return null; var doc=db.doc('data/users/'+id+'/vials');
        return doc.get().then(function(snap){ if(snap.exists){state=clean(snap.data()); saveLocal(); return doc} if(state.vials.length) return doc.set(payload()).then(function(){return doc}); return doc }) }) })
    .then(function(doc){ if(!doc) return; store.mode='db'; store.doc=doc; setSync(true); render();
      doc.onSnapshot(function(s){ if(!s.exists||s.metadata.hasPendingWrites||writing) return; var next=clean(s.data()); if(JSON.stringify(next)!==JSON.stringify(state)){state=next; saveLocal(); render()} }) })
    .catch(function(){});
  }

  // ---------- photos: kept on this device (IndexedDB); the numbers are what sync
  var PDB=null;
  function pdb(){ return new Promise(function(res){ if(PDB) return res(PDB); try{ var r=indexedDB.open('vt-photos',1); r.onupgradeneeded=function(){ try{r.result.createObjectStore('p')}catch(e){} }; r.onsuccess=function(){PDB=r.result;res(PDB)}; r.onerror=function(){res(null)}; r.onblocked=function(){res(null)} }catch(e){res(null)} }) }
  function photoPut(key,dataUrl){ return pdb().then(function(d){ if(!d) return false; return new Promise(function(res){ try{ var tx=d.transaction('p','readwrite'); tx.objectStore('p').put({d:dataUrl,t:Date.now()},key); tx.oncomplete=function(){res(true)}; tx.onerror=function(){res(false)} }catch(e){res(false)} }) }) }
  function photoGet(key){ return pdb().then(function(d){ if(!d) return null; return new Promise(function(res){ try{ var rq=d.transaction('p').objectStore('p').get(key); rq.onsuccess=function(){res(rq.result?rq.result.d:null)}; rq.onerror=function(){res(null)} }catch(e){res(null)} }) }) }
  function photoDel(key){ return pdb().then(function(d){ if(!d) return; return new Promise(function(res){ try{ var tx=d.transaction('p','readwrite'); tx.objectStore('p').delete(key); tx.oncomplete=function(){res(true)}; tx.onerror=function(){res(false)} }catch(e){res(false)} }) }) }
  function photoKeys(prefix){ return pdb().then(function(d){ if(!d) return []; return new Promise(function(res){ try{ var rq=d.transaction('p').objectStore('p').getAllKeys(); rq.onsuccess=function(){res((rq.result||[]).filter(function(k){return String(k).indexOf(prefix)===0}).map(String))}; rq.onerror=function(){res([])} }catch(e){res([])} }) }) }
  function photoMove(from,to){ return photoGet(from).then(function(d){ if(!d) return; return photoPut(to,d).then(function(){return photoDel(from)}) }) }
  function dataUrlToBlob(d){ var p=d.split(','), m=/data:([^;]+)/.exec(p[0]), bin=atob(p[1]), arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return new Blob([arr],{type:m?m[1]:'image/jpeg'}) }
  function shrink(file){ return new Promise(function(res,rej){ var url=URL.createObjectURL(file); var im=new Image(); im.onload=function(){ try{ var max=900, w=im.naturalWidth, h=im.naturalHeight, s=Math.min(1,max/Math.max(w,h)); var c=document.createElement('canvas'); c.width=Math.round(w*s); c.height=Math.round(h*s); c.getContext('2d').drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',0.72)) }catch(e){rej(e)} }; im.onerror=function(){URL.revokeObjectURL(url); rej(new Error('bad image'))}; im.src=url }) }

  // ---------- reading the display from a photo (asks Claude through the app's runtime; falls back to typing)
  var SAMPLE={fn:undefined, img:false};
  // hosted build: the app's own checker endpoint (QB_API/check-photo) stands in for the claude.ai runtime
  function apiSample(){ var base=String(window.QB_API).replace(/\/$/,'');
    function toB64(blob){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ var s=String(r.result||''); res(s.slice(s.indexOf(',')+1)) }; r.onerror=function(){rej(r.error||new Error('read'))}; r.readAsDataURL(blob) }) }
    function call(prompt,opts){ var img=opts&&opts.images&&opts.images[0]; var p=img?toB64(img):Promise.resolve(null);
      return p.then(function(b64){ return fetch(base+'/check-photo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:prompt,image:b64,media_type:(img&&img.type)||'image/jpeg'})}) })
        .then(function(r){ return r.json().catch(function(){return {}}).then(function(j){ if(!r.ok){ var e=new Error((j&&j.error)||('http '+r.status)); e.code=(j&&j.error==='no_key')?'sampling_disabled':'upstream'; throw e } return j }) }) }
    var fn=function(prompt,opts){ return call(prompt,opts).then(function(j){ return {text:j.result?JSON.stringify(j.result):String(j.text||'')} }) };
    fn.json=function(prompt,opts){ return call(prompt,opts).then(function(j){ if(j.result&&typeof j.result==='object') return j.result; var t=String(j.text||''); var a=t.indexOf('{'), b=t.lastIndexOf('}'); return JSON.parse(t.slice(a,b+1)) }) };
    fn.limits=function(){ return Promise.resolve({images:true}) };
    return fn }
  function sampleInit(){ if(window.QB_API){ SAMPLE.fn=apiSample(); SAMPLE.img=true; return }
    if(!(window.claude&&typeof window.claude.use==='function')){SAMPLE.fn=null;return}
    window.claude.use('sample').then(function(s){ SAMPLE.fn=s||null; if(!s) return; return s.limits().then(function(l){SAMPLE.img=!!(l&&l.images)},function(){}) }).catch(function(){SAMPLE.fn=null}) }
  function canRead(){ return !!(SAMPLE.fn&&SAMPLE.img) }
  // what each photo must show; the checker reports the display number and anything visibly wrong
  var CHECKS={
    check:{what:'a digital milligram scale with ONE 20 g calibration weight in the middle of the pan', must:['exactly one calibration weight on the pan and nothing else','the display shows a number near 20.000']},
    zero:{what:'a digital milligram scale with NOTHING on the pan, the display showing 0.000', must:['nothing at all on the pan','the display shows 0.000']},
    dry:{what:'a small glass peptide vial standing on the pan of a digital milligram scale with its plastic flip-off cap removed (metal crimp ring and grey rubber stopper visible)', must:['a vial on the pan and nothing else','the plastic flip-off cap is off, so the metal crimp ring and rubber stopper are visible']},
    syr:{what:'an empty insulin syringe lying on the pan of a digital milligram scale, needle cover and plunger cap removed, resting on nothing but the pan', must:['one syringe on the pan and nothing else','no needle cover and no plunger cap on the syringe','the syringe rests only on the pan, not on the scale body or the table']},
    draw:{what:'an insulin syringe containing clear liquid lying on the pan of a digital milligram scale, needle cover off, needle pointing up', must:['one liquid-filled syringe on the pan','no needle cover on the syringe','no large air gap in the liquid']},
    full:{what:'a small glass vial that now contains liquid, standing on the pan of a digital milligram scale, plastic cap off', must:['a vial on the pan and nothing else','the plastic cap is off']},
    dose:{what:'an insulin syringe containing a small amount of clear liquid lying on the pan of a digital milligram scale, needle cover off, needle pointing up', must:['one syringe on the pan','no needle cover on the syringe']},
    vial:{what:'a small glass vial on the pan of a digital milligram scale, plastic cap off', must:['a vial on the pan','the plastic cap is off']},
    fdry:{what:'an EMPTY sealed glass vial (rubber stopper and metal crimp visible, flip-off cap removed, nothing inside) standing on the pan of a digital milligram scale', must:['one empty vial on the pan and nothing else','the plastic flip-off cap is off'] },
    ffull:{what:'a small sealed glass vial now containing clear liquid, standing on the pan of a digital milligram scale, plastic cap off', must:['one vial on the pan and nothing else','the plastic cap is off']}
  };
  function kindOf(storeKind){ if(/^draw\d+$/.test(storeKind)) return 'draw'; if(/^check\d+$/.test(storeKind)||storeKind==='tmp-check'||storeKind==='tmp-vial') return 'vial'; if(storeKind==='tmp-syr') return 'dose'; return CHECKS[storeKind]?storeKind:'vial' }
  function parseNum(t){ t=String(t==null?'':t).replace(/\s/g,''); var m=/-?\d+(?:[.,]\d+)?/.exec(t); if(!m) return null; var raw=m[0]; var x=parseFloat(raw.replace(',','.')); if(!isFinite(x)) return null; if(raw.indexOf('.')<0&&raw.indexOf(',')<0&&x>=100) x=x/1000; return r3(x) }
  // checkPhoto -> {reading, readable, ok, issues[], seen} or null when no checker is available
  function checkPhoto(blob,kind){ if(!canRead()) return Promise.resolve(null); var c=CHECKS[kind]||CHECKS.vial;
    var prompt='You are checking one step of a laboratory weighing procedure from a single photo. The photo should show '+c.what+'. Requirements for this step: '+c.must.map(function(m,i){return (i+1)+') '+m}).join('; ')+'. The scale weighs in grams and reads to 0.001 g (three decimals).\nReply with only one JSON object, no other text: {"reading": the number on the scale display as a decimal number with its decimal point (null if no number is readable), "readable": true or false, "ok": true if every requirement is visibly met, otherwise false, "issues": [one short plain-English sentence for each requirement that is visibly NOT met — only problems you can actually see; an empty list if none], "seen": one short sentence saying what is on the pan}. If you cannot tell whether a requirement is met, do not list it as an issue.';
    var opts={images:[blob],modelTier:'quick',cache:false};
    var call=(typeof SAMPLE.fn.json==='function')?SAMPLE.fn.json(prompt,opts):SAMPLE.fn(prompt,opts).then(function(r){ var t=String(r&&r.text||''); var a=t.indexOf('{'), b=t.lastIndexOf('}'); return JSON.parse(t.slice(a,b+1)) });
    return call.then(function(j){ if(!j||typeof j!=='object') return null; var rd=parseNum(j.reading); var issues=Array.isArray(j.issues)?j.issues.map(function(x){return String(x)}).filter(Boolean).slice(0,4):[]; var readable=j.readable!==false&&rd!==null; var ok=!!j.ok&&issues.length===0&&readable; return {reading:rd, readable:readable, ok:ok, issues:issues, seen:String(j.seen||'').slice(0,160)} },
      function(e){ if(e&&(e.code==='not_granted'||e.code==='sampling_disabled'||e.code==='not_declared'||e.code==='images_unavailable')) SAMPLE.fn=null; return null }) }

  // a weight field with a camera button: the photo is stored on this device under `key`, read for the number and checked against the step
  function unitWrap(inputHtml,unit){ return '<span class="uin"><span class="uin-in">'+inputHtml+'</span><span class="uin-u">'+esc(unit)+'</span></span>' }
  function weighField(id,label,key,placeholder,extra){ return '<div class="wf" data-wf="'+esc(id)+'"><label class="fl">'+label+unitWrap('<input id="'+id+'" class="mono" type="number" step="0.001" inputmode="decimal" placeholder="Enter the number from the scale"'+(extra||'')+'>','g')+'</label>'
    +'<div class="wf-cam"><label class="btn ghost sm cam"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"/></svg> Photo of it on the scale<input type="file" accept="image/*" capture="environment" data-cam="'+esc(id)+'" data-key="'+esc(key)+'" hidden></label><button type="button" class="btn ghost sm" data-nophoto="'+esc(id)+'">Enter the number manually</button><span class="wf-st muted small" id="'+id+'-st"></span></div><img class="wf-thumb" id="'+id+'-img" alt="" hidden><div class="wf-verdict" id="'+id+'-vd"></div></div>' }
  function showThumb(id,key){ photoGet(key).then(function(d){ var im=$('#'+id+'-img'); if(im&&d){im.src=d; im.hidden=false} }) }
  // meta per photo: {t, g (number read), ok, issues[], seen, checked (true when a checker looked), override, nophoto}
  function verdictHtml(meta,id){ if(!meta) return '';
    if(meta.nophoto) return /^wz-draw/.test(id||'')?'':'<div class="notice"><b>No photo for this step.</b> The number was typed; the record will say so.</div>';
    if(!meta.checked) return '<div class="notice info"><b>Photo saved as the record.</b> The automatic check is not available here, so look at it yourself: '+esc((CHECKS[meta.kind]||CHECKS.vial).must.join('; '))+'.</div>';
    if(meta.ok) return '<div class="notice ok"><b>✓ Looks right.</b> '+esc(meta.seen||'')+(meta.g!==null&&meta.g!==undefined?' Display reads '+meta.g.toFixed(3)+' g.':'')+'</div>';
    var why=meta.issues&&meta.issues.length?meta.issues.join(' '):(meta.readable===false?'The display is not readable in this photo.':'Something does not match this step.');
    return '<div class="notice bad"><b>⚠ Check this before you go on.</b> '+esc(why)+' Fix it and take the photo again.'+(meta.override?' <span class="muted">(You chose to continue anyway.)</span>':' <button type="button" class="linkish" data-override="'+esc(id)+'">I looked — it is fine, continue</button>')+'</div>' }
  var PHOTO_META={}; // id -> meta for fields currently on screen
  function setMeta(id,meta){ PHOTO_META[id]=meta; var vd=$('#'+id+'-vd'); if(vd) vd.innerHTML=verdictHtml(meta,id); var fld=$('#'+id); if(fld) fld.dispatchEvent(new CustomEvent('vt-photo',{bubbles:true,detail:meta})) }
  document.addEventListener('click',function(e){ var b=e.target.closest('[data-override]'); if(!b) return; var id=b.getAttribute('data-override'); var m=PHOTO_META[id]; if(!m) return; m.override=true; setMeta(id,m) });
  document.addEventListener('change',function(e){ var inp=e.target; if(!inp||!inp.hasAttribute||!inp.hasAttribute('data-cam')) return; var f=inp.files&&inp.files[0]; if(!f) return; var id=inp.getAttribute('data-cam'), key=inp.getAttribute('data-key'); var st=$('#'+id+'-st'), field=$('#'+id), im=$('#'+id+'-img'); var kind=kindOf(key.split(':').slice(1).join(':'));
    if(st) st.textContent='Saving photo…'; var vd=$('#'+id+'-vd'); if(vd) vd.innerHTML='';
    var blob=f, saved=false;
    shrink(f).then(function(d){ if(im){im.src=d; im.hidden=false} try{ blob=dataUrlToBlob(d) }catch(e){} return photoPut(key,d) },function(){ return false }).then(function(okSave){ saved=!!okSave;
      if(!canRead()){ if(st) st.textContent=saved?'Photo saved. Type the number from the display.':'Photo could not be stored on this device. Type the number.'; setMeta(id,{kind:kind, t:new Date().toISOString(), g:null, checked:false, ok:false, issues:[], seen:'', saved:saved}); return }
      if(st) st.textContent='Checking the photo…';
      return checkPhoto(blob,kind).then(function(res){
        if(!res){ if(st) st.textContent='Could not check it. Type the number from the display.'; setMeta(id,{kind:kind, t:new Date().toISOString(), g:null, checked:false, ok:false, issues:[], seen:'', saved:saved}); return }
        var x=res.reading; var had=field&&x!==null&&field.value!==''&&Math.abs(parseFloat(field.value)-x)>0.0005;
        if(field&&x!==null&&!had){ field.value=x.toFixed(3); field.dispatchEvent(new Event('input',{bubbles:true})) }
        if(st){ st.innerHTML=''; if(x===null) st.textContent='No number could be read. Type it from the display.'; else { st.appendChild(document.createTextNode('Photo reads '+x.toFixed(3)+' g'+(had?' (you typed '+field.value+') ':'. '))); if(had){ var b=document.createElement('button'); b.type='button'; b.className='linkish'; b.textContent='Use '+x.toFixed(3); b.addEventListener('click',function(){ field.value=x.toFixed(3); field.dispatchEvent(new Event('input',{bubbles:true})); st.textContent='Using '+x.toFixed(3)+' g from the photo.' }); st.appendChild(b) } } }
        setMeta(id,{kind:kind, t:new Date().toISOString(), g:x, checked:true, ok:res.ok, readable:res.readable, issues:res.issues, seen:res.seen, saved:saved}) }) })
    .catch(function(){ if(st) st.textContent='Photo not saved. Type the number from the display.' });
    inp.value='' });

  // ---------- toast
  var toastT; function toast(m){var t=$('#vl-toast'); if(!t){t=document.createElement('div');t.id='vl-toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)} t.textContent=m; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){t.hidden=true},2400)}

  // ---------- rendering
  function chip(c){return '<span class="chip '+c.st+'">'+esc(c.label)+'</span>'}
  function cardHtml(v){ var c=calc(v); if(v.status==='rejected') return '<button type="button" class="vcard" data-vgo="vial-'+v.id+'"><div class="row between"><div><h3>'+esc(v.name)+'</h3><p class="muted small" style="margin-top:4px">'+esc(v.label_mg+' mg label')+(v.mixed_on?' · mixed '+esc(dlabel(new Date(v.mixed_on+'T00:00:00'))):'')+' · failed the clarity check</p></div>'+chip(c)+'</div></button>'; var pct=Math.round(c.pct*100); var barCls=c.remaining<=0?'empty':(pct<=25?'low':'');
    var dates=(c.dosesLeft!==null?c.dosesLeft+' dose'+(c.dosesLeft===1?'':'s')+' left at '+fmtMg(c.nextMg):'Set today’s dose on the vial page')+(c.expires?' · '+(c.daysToExp<0?'Expired '+dlabel(c.expires):'Use by '+dlabel(c.expires)):'');
    return '<div class="card tap" data-vgo="vial-'+esc(v.id)+'" role="link" tabindex="0"><div class="row between"><h2>'+esc(v.name)+'</h2>'+chip(c)+'</div>'
      +'<div class="row" style="margin-top:4px;gap:14px"><span><b class="mono">'+pct+'%</b> remaining</span><span class="muted small">'+fmtMg(c.remaining)+' of '+fmtMg(v.label_mg)+' · '+c.count+' dose'+(c.count==1?'':'s')+' logged'+(c.nextG?' · '+fmtMg(c.nextMg)+' = '+c.nextG.toFixed(3)+' g':'')+'</span></div>'
      +'<div class="bar '+barCls+'"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></div><div class="dates">'+esc(dates)+'</div></div>' }
  function renderAlerts(){ var a=$('#vl-alerts'); var items=[];
    state.vials.forEach(function(v){ var c=calc(v); if(v.status==='archived') return;
      if(c.label==='Expired') items.push('<div class="notice bad"><b>'+esc(v.name)+':</b> past its use-by date ('+dlabel(c.expires)+', '+v.expiry_days+' days after mixing). Discard it; do not dose from it. <button type="button" class="linkish" data-vgo="vial-'+esc(v.id)+'">Open</button></div>');
      else if(c.label==='Expires soon') items.push('<div class="notice"><b>'+esc(v.name)+':</b> expires '+dlabel(c.expires)+(c.daysToExp===0?' (today)':' ('+c.daysToExp+' day'+(c.daysToExp===1?'':'s')+')')+(c.dosesLeft?' with about '+c.dosesLeft+' dose'+(c.dosesLeft===1?'':'s')+' still in it':'')+'. <button type="button" class="linkish" data-vgo="vial-'+esc(v.id)+'">Open</button></div>');
      if(c.label==='Out') items.push('<div class="notice bad"><b>'+esc(v.name)+':</b> empty. <button type="button" class="linkish" data-vgo="vial-'+esc(v.id)+'">Open</button></div>');
      else if(c.weekLeft) items.push('<div class="notice bad"><b>'+esc(v.name)+':</b> '+(c.dosesLeft===0?fmtMg(c.remaining)+' left — less than one '+fmtMg(c.nextMg)+' dose.':'about a week left — '+fmtMg(c.remaining)+' in the vial, '+c.dosesLeft+' dose'+(c.dosesLeft===1?'':'s')+' at your current '+fmtMg(c.nextMg)+'.')+' Order the next vial now. <button type="button" class="linkish" data-vgo="vial-'+esc(v.id)+'">Open</button></div>'); });
    a.innerHTML=items.join(''); }
  function renderList(){ var active=state.vials.filter(function(v){return v.status!=='archived'}); var arch=state.vials.filter(function(v){return v.status==='archived'});
    $('#vl-cards').innerHTML=active.map(cardHtml).join('')+(arch.length?'<details style="margin-top:6px"><summary class="muted small" style="cursor:pointer">'+arch.length+' archived</summary><div class="stack" style="margin-top:10px">'+arch.map(cardHtml).join('')+'</div></details>':'');
    $('#vl-empty').hidden=state.vials.length>0; }
  function doseRows(v,c){ if(!v.doses.length) return '<p class="muted small">No doses logged yet.</p>';
    var rows=v.doses.slice().reverse().map(function(d,i){ var idx=v.doses.length-1-i; var unc=c.water>0&&d.ml>0?Math.round(state.scale.acc/d.ml*100):null;
      var w=[]; if(d.syr_full_g!==null) w.push('syringe '+(d.syr_empty_g!==null?d.syr_empty_g.toFixed(3)+' → ':'')+d.syr_full_g.toFixed(3)+' g'); if(d.before_g!==null&&d.after_g!==null) w.push('vial '+d.before_g.toFixed(3)+' → '+d.after_g.toFixed(3)+' g');
      return '<tr><td>'+esc(dtlabel(d.t))+'</td><td class="num"><b>'+fmtMg(d.mg)+'</b>'+(unc!==null?'<br><span class="muted">±'+unc+'%</span>':'')+'</td><td class="num">'+d.ml.toFixed(3)+'</td><td>'+(w.length?'<span class="mono small">'+esc(w.join(' · '))+'</span>':esc(d.method==='manual'?'typed':d.method))+'<br>'+metaChip(d.photo)+' '+(d.photo_vial?metaChip(d.photo_vial).replace('">','">vial: '):'')+(d.note?'<br><span class="muted small">'+esc(d.note)+'</span>':'')+'</td><td><button class="btn sm danger" type="button" data-del-dose="'+idx+'">Delete</button></td></tr>' }).join('');
    return '<div class="tbl"><table><thead><tr><th>When</th><th class="num">Dose</th><th class="num">g drawn</th><th>Weights</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>' }
  var PHOTO_LABELS={check:'Scale at 20 g', zero:'Scale at zero', dry:'Dry vial', syr:'Empty syringe', full:'Full vial', fdry:'New sterile vial, empty', ffull:'New vial, filtered solution'};
  function metaChip(m){ if(!m) return '<span class="chip plain">no photo</span>'; if(m.nophoto) return '<span class="chip plain">no photo</span>'; if(m.checked&&m.ok) return '<span class="chip ok">✓ photo checked</span>'; if(m.checked&&m.override) return '<span class="chip warn" title="'+esc((m.issues||[]).join(' '))+'">⚠ continued anyway</span>'; if(m.checked) return '<span class="chip bad">⚠ photo flagged</span>'; return '<span class="chip info">photo</span>' }
  function recordRows(v){ var order=['check','zero','dry','syr'].concat(Object.keys(v.checks||{}).filter(function(k){return /^draw\d+$/.test(k)}).sort(),['full','fdry','ffull']); var rows=[];
    order.forEach(function(k){ var m=(v.checks||{})[k]; if(!m) return; var g=(k==='check'?f0(v.scale_check_g):k==='dry'?v.dry_g:k==='syr'?v.syr_tare_g:k==='full'?v.full_g:k==='fdry'?(v.filtered?v.filtered.dry_g:null):k==='ffull'?(v.filtered?v.filtered.full_g:null):(/^draw(\d+)$/.test(k)?(v.draws||[])[+k.slice(4)-1]:null)); if(k==='zero') g=f0(v.scale_zero_g);
      rows.push('<tr data-pk="'+esc(v.id+':'+k)+'"><td class="pth"></td><td>'+esc(photoLabel(v.id+':'+k))+'</td><td class="num">'+(isFinite(g)&&g!==null?(+g).toFixed(3)+' g':'—')+'</td><td>'+metaChip(m)+(m.issues&&m.issues.length&&m.override?'<br><span class="muted small">'+esc(m.issues.join(' '))+'</span>':'')+'</td></tr>') });
    return rows }
  function f0(x){ return isFinite(x)&&x!==null?x:null }
  function photoLabel(k){ var kind=k.split(':').slice(1).join(':'); if(PHOTO_LABELS[kind]) return PHOTO_LABELS[kind]; var m=/^draw(\d+)$/.exec(kind); if(m) return 'Water draw '+m[1]; m=/^dose(\d+)-(syr|vial|before)$/.exec(kind); if(m) return 'Dose '+(+m[1]+1)+' '+(m[2]==='syr'?'syringe':m[2]==='before'?'vial before':'vial after'); m=/^check(\d+)$/.exec(kind); if(m) return 'Spot check'; return kind }
  // storage kind 'check' (20 g) vs 'check<n>' (spot checks) are different keys; PHOTO_LABELS covers the former
  function lightbox(d){ var o=document.createElement('div'); o.className='plight'; o.innerHTML='<img src="'+d+'" alt="">'; o.addEventListener('click',function(){o.remove()}); document.body.appendChild(o) }
  function renderPhotos(v){ var box=$('#vl-photos'); if(!box) return; var rows=recordRows(v); var hasChecks=rows.length>0;
    photoKeys(v.id+':').then(function(keys){ keys=keys.filter(function(k){return k.indexOf(':tmp-')<0}); if(!keys.length&&!hasChecks){box.hidden=true;return} box.hidden=false;
      box.innerHTML='<h3>Mixing record</h3><p class="small muted" style="margin-top:4px">Each weigh of the mix, the reading, and what the photo check said. Photos stay on the device that took them.</p>'+(hasChecks?'<div class="tbl" style="margin-top:8px"><table class="rec"><tbody>'+rows.join('')+'</tbody></table></div>':'<p class="small muted" style="margin-top:8px">This vial was entered by hand, without a photographed mix.</p>')+'<div class="pstrip" id="vl-pstrip"></div>';
      // thumbnails into the matching rows, leftovers (doses, spot checks) into the strip
      var strip=$('#vl-pstrip',box);
      keys.sort().forEach(function(k){ photoGet(k).then(function(d){ if(!d) return; var row=$('tr[data-pk="'+k.replace(/"/g,'')+'"] .pth',box);
        if(row){ var im=document.createElement('img'); im.src=d; im.alt=photoLabel(k); im.addEventListener('click',function(){lightbox(d)}); row.appendChild(im) }
        else { var fig=document.createElement('figure'); var im2=document.createElement('img'); im2.src=d; im2.alt=photoLabel(k); im2.addEventListener('click',function(){lightbox(d)}); var cap=document.createElement('figcaption'); cap.textContent=photoLabel(k); fig.appendChild(im2); fig.appendChild(cap); strip.appendChild(fig) } }) }) }) }
  function renderVial(id){ var v=state.vials.filter(function(x){return x.id===id})[0]; var sec=$('#vl-vial'); if(!v){sec.innerHTML='<p class="small"><button type="button" class="linkish" data-vgo="">← Supply</button></p><p style="margin-top:10px">That vial isn’t here.</p>';return}
    var c=calc(v); var pct=Math.round(c.pct*100); var barCls=c.remaining<=0?'empty':(pct<=25?'low':'');
    var wdiff=(v.syr_water_g!==null&&c.water>0)?r3(v.syr_water_g-c.water):null;
    var bw=c.byWeight?('<dt>By last vial weight ('+esc(dtlabel(c.byWeight.t))+')</dt><dd>'+fmtMg(c.byWeight.mg)+' · '+c.byWeight.ml.toFixed(3)+' mL</dd>'):'';
    var ledgerVsWeight=(c.byWeight&&Math.abs(c.byWeight.mg-c.remaining)>Math.max(0.3,0.05*v.label_mg))?'<div class="notice" style="margin-top:10px"><b>Ledger and scale disagree</b> by '+fmtMg(Math.abs(c.byWeight.mg-c.remaining))+'. Either a dose went unlogged, liquid was lost, or the weighing conditions changed. The vial weight is the physical truth; the ledger is what you recorded.</div>':'';
    var expectNow=c.byWeight?c.byWeight.g:v.full_g; var nextIdx=v.doses.length+1;
    if(v.status==='rejected'){
      sec.innerHTML='<p class="small"><button type="button" class="linkish" data-vgo="">← Supply</button></p>'
        +'<div class="row between" style="margin:8px 0 10px"><div><h2>'+esc(v.name)+'</h2><p class="muted small">'+esc(v.label_mg+' mg label')+(v.src?' · '+esc(v.src):'')+(v.mixed_on?' · mixed '+esc(dlabel(new Date(v.mixed_on+'T00:00:00'))):'')+'</p></div>'+chip(c)+'</div>'
        +'<div class="notice bad"><b>Rejected at mixing — do not use.</b> It did not pass the clarity check (haze, floating particles or undissolved powder). Nothing from this vial is filtered or dosed. Keep it capped and marked until the supplier has answered; send them the lot number and what you saw.</div>'
        +'<div class="card" id="vl-photos" style="margin-top:12px" hidden></div>'
        +'<div class="card" style="margin-top:12px"><div class="row" style="gap:8px;flex-wrap:wrap">'+(v.notes?'<p class="small" style="width:100%">'+esc(v.notes)+'</p>':'')+'<button class="btn sm ghost" type="button" data-act="archive">Archive</button><button class="btn sm danger" type="button" data-act="delete">Delete vial</button></div></div>';
      wireVial(v); renderPhotos(v); return }
    sec.innerHTML='<p class="small"><button type="button" class="linkish" data-vgo="">← Supply</button></p>'
      +'<div class="row between" style="margin:8px 0 10px"><div><h2>'+esc(v.name)+'</h2><p class="muted small">'+esc(v.label_mg+' mg label')+(v.src?' · '+esc(v.src):'')+' · '+esc(v.diluent)+'</p></div>'+chip(c)+'</div>'
      +(isFinite(c.conc)?'<div class="card target"><div class="eyebrow">Dose '+nextIdx+' from this vial</div><div style="margin-top:6px"><label class="fl">Today’s dose'+unitWrap('<input id="t-dose" class="mono big-in" type="number" step="any" min="0" inputmode="decimal" value="'+(v.planned_mg||'')+'" placeholder="e.g. 3">','mg')+'</label></div><div class="row" style="gap:12px;align-items:baseline;margin-top:10px">'+(c.nextG?'<span class="big" style="font-size:1.9rem">'+c.nextG.toFixed(3)+' g</span><span class="muted small">to draw on the scale = '+fmtMg(c.nextMg)+' at '+c.conc.toFixed(2)+' mg per g · ≈ '+units(c.nextG)+' units (check only)</span>':'<span class="muted">Enter today’s dose to get the grams to draw.</span>')+'</div>'+(c.dosesLeft!==null?'<p class="small muted" style="margin-top:6px">'+fmtMg(c.remaining)+' left = '+c.dosesLeft+' dose'+(c.dosesLeft===1?'':'s')+' at '+fmtMg(c.nextMg)+'. Your dose may change as you go; the app counts what is actually left after each draw and tells you when about a week remains.</p>':'')+(c.expectNow!==null?'<p class="small" style="margin-top:6px"><b>Before you start, the vial should weigh '+c.expectNow.toFixed(3)+' g</b> <span class="muted">(what it weighed after the last dose). Weigh it; if it is more than 0.010 g off, something is wrong — work out what before you draw.</span></p>':'')+'<p style="margin-top:8px"><button type="button" class="linkish" id="vl-animtg">'+(animOpen()?'Hide the draw':'Show me the draw')+'</button></p><div id="vl-anim" class="syr-slot"'+(animOpen()?'':' hidden')+'></div></div>':'')
      +dosePlanCard(v,c)
      +'<div class="card"><div class="row" style="gap:16px;align-items:baseline"><span class="big">'+pct+'%</span><span class="muted">'+fmtMg(c.remaining)+' remaining · '+fmtMl(c.remMl)+'</span></div><div class="bar '+barCls+'"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></div>'
      +'<dl class="kv" style="margin-top:8px"><dt>Concentration</dt><dd>'+(isFinite(c.conc)?c.conc.toFixed(2)+' mg per g (mL)':'—')+'</dd>'+(v.filtered?'<dt>Sterile-filtered</dt><dd>into a new vial: empty '+v.filtered.dry_g.toFixed(3)+' g, filled '+v.filtered.full_g.toFixed(3)+' g · '+c.lostMl.toFixed(3)+' g ('+c.lostMg.toFixed(2)+' mg) stayed in the filter</dd>':'')+'<dt>Water in (vial Δ)</dt><dd>'+fmtMl(c.water)+(wdiff!==null?' <span class="muted">(syringe '+(wdiff>=0?'+':'')+wdiff.toFixed(3)+')</span>':'')+'</dd><dt>Dry vial / full vial</dt><dd>'+v.dry_g.toFixed(3)+' / '+v.full_g.toFixed(3)+' g</dd>'+(v.syr_tare_g!==null?'<dt>Bare syringe</dt><dd>'+v.syr_tare_g.toFixed(3)+' g</dd>':'')+'<dt>Taken</dt><dd>'+fmtMg(c.taken)+' in '+c.count+' dose'+(c.count==1?'':'s')+'</dd>'
      +(c.expires?'<dt>Mixed on</dt><dd>'+dlabel(new Date(v.mixed_on+'T00:00:00'))+'</dd><dt>Use by</dt><dd>'+dlabel(c.expires)+' <span class="muted">('+v.expiry_days+' days'+(c.daysToExp!==null?(c.daysToExp<0?', expired':', '+c.daysToExp+' left'):'')+')</span></dd>':'')+bw+'</dl>'+(c.weekLeft?'<div class="notice bad" style="margin-top:10px"><b>'+(c.dosesLeft===0?'Less than a dose left.':'About a week left.')+'</b> '+fmtMg(c.remaining)+' in the vial'+(c.dosesLeft===0?' is not enough for one '+fmtMg(c.nextMg)+' dose':' is '+c.dosesLeft+' dose'+(c.dosesLeft===1?'':'s')+' at '+fmtMg(c.nextMg))+'. Order the next vial now.</div>':'')+(c.daysToExp!==null&&c.daysToExp<0&&v.status!=='archived'?'<div class="notice bad" style="margin-top:10px"><b>Expired.</b> Past the use-by date you set. Discard it and archive it here.</div>':'')+ledgerVsWeight+'</div>'
      +'<div class="card" style="margin-top:12px"><h3>Log a dose — in this order</h3>'+(c.nextG?'<p class="small" style="margin-top:4px"><b>Target on the scale: '+c.nextG.toFixed(3)+' g</b> for '+fmtMg(c.nextMg)+' (≈ '+units(c.nextG)+' units: pull past it to about '+Math.min(100,Math.ceil((units(c.nextG)+15)/10)*10)+', then push back).</p>':'')
      +'<form id="f-dose" style="margin-top:10px"><ol class="steps dsteps">'
      +'<li><b>Weigh the vial before you start</b><span>Cap off, outside dry. Photograph it, or enter the number manually.'+(c.expectNow!==null?' It should read <b>'+c.expectNow.toFixed(3)+' g</b>.':'')+'</span>'+weighField('d-b','The scale reads, with the vial on it',v.id+':tmp-before',c.expectNow!==null?c.expectNow.toFixed(3):'')+'</li>'
      +'<li><b>Tare the scale on a new syringe, vent the vial, draw past the mark, push back to the mark</b><span>Bare syringe laid across the pan, resting on nothing else, press TARE (0.000). Plungerless syringe through the edge of the stopper as the vent. Draw slowly 10–20 units past your mark; tap the bubbles up; push back until the liquid sits exactly on the mark. If the plunger creeps back on its own, the vial is under vacuum — fix the vent first.</span></li>'
      +'<li><b>Weigh the filled syringe</b><span>Lay it across the tared pan exactly as before, resting on nothing but the pan. Photograph it, or enter the number manually.</span><div class="f2" style="margin-top:6px"><label class="fl">Syringe empty (g)<input id="d-se" class="mono" type="number" step="0.001" inputmode="decimal" value="0" placeholder="Enter the number from the scale"></label>'+weighField('d-sf','The scale reads, with the filled syringe on it',v.id+':tmp-syr',c.nextG?c.nextG.toFixed(3):'0.300')+'</div></li>'
      +'<li><b>Weigh the vial after the draw</b><span>Vent needle out. Cap off, outside dry. Photograph it, or enter the number manually. This weight is what the vial must read before your next dose.</span>'+weighField('d-a','The scale reads, with the vial on it',v.id+':tmp-vial',c.nextG&&c.expectNow!==null?(c.expectNow-c.nextG).toFixed(3):'')+'</li>'
      +'<li><b>Check the numbers, log the dose, then inject</b><span>Nothing is injected until the box below says the dose matches.</span><div class="f2" style="margin-top:6px"><label class="fl">When<input id="d-t" type="datetime-local"></label><label class="fl">Note (optional)<input id="d-note" placeholder="e.g. second attempt, first draw frothed"></label></div></li></ol>'
      +'<div class="calc" id="d-calc">Enter the weights to see the dose.</div><p class="err" id="d-err" hidden></p><div class="row"><button class="btn" type="submit">Log this dose</button></div></form></div>'
      +'<div class="card" style="margin-top:12px"><h3>Spot-check the vial</h3><p class="small muted" style="margin-top:4px">Weigh the vial any time; the tracker converts it to what’s left and compares with the ledger'+(c.byWeight?' (expected now: about '+expectNow.toFixed(3)+' g)':'')+'.</p><form id="f-weigh" style="margin-top:10px">'+weighField('w-g','Vial weight now',v.id+':tmp-check','')+'<div class="row"><button class="btn ghost" type="submit">Record</button></div></form></div>'
      +'<div class="card" style="margin-top:12px"><div class="row between"><h3>Dose log</h3><span class="muted small">'+c.count+' total</span></div><div style="margin-top:8px">'+doseRows(v,c)+'</div></div>'
      +'<div class="card" id="vl-photos" style="margin-top:12px" hidden></div>'
      +'<div class="card" style="margin-top:12px"><h3>Plan and supply</h3>'
      +'<form id="f-plan" style="margin-top:12px"><div class="f2"><label class="fl">How often'+unitWrap('<input id="p-pw" class="mono" type="number" step="any" min="0" inputmode="decimal" value="'+v.per_week+'">','× per week')+'</label><label class="fl">Date mixed<input id="p-mixed" type="date" value="'+esc(v.mixed_on||'')+'"></label><label class="fl">Use within (days)<input id="p-exp" class="mono" type="number" step="1" min="1" inputmode="numeric" value="'+v.expiry_days+'"></label></div><div class="row" style="margin-top:8px"><button class="btn sm ghost" type="submit">Update</button></div></form>'
      +'<div class="row" style="margin-top:14px">'
      +(v.status==='ordered'?'<span class="chip info">Ordered '+esc(v.ordered_on?dlabel(new Date(v.ordered_on)):'')+'</span><button class="btn sm ghost" type="button" data-act="unorder">Not ordered</button>':'<button class="btn sm ghost" type="button" data-act="ordered">Mark reordered</button>')
      +(v.status==='archived'?'<button class="btn sm ghost" type="button" data-act="unarchive">Restore</button>':'<button class="btn sm ghost" type="button" data-act="archive">Archive (finished)</button>')
      +'<button class="btn sm danger" type="button" data-act="delete">Delete vial</button></div>'
      +'<p class="small muted" style="margin-top:10px">Scale accuracy used for the ± figures: ±'+(state.scale.acc*1000).toFixed(0)+' mg. <button class="btn sm ghost" type="button" data-act="scale">Change</button></p></div>';
    wireVial(v); renderPhotos(v);
  }
  function packFor(v){ var n=String(v.name||'').toLowerCase(); return (window.PEPTIDES||[]).filter(function(p){ return p&&p.name&&String(p.name).toLowerCase()===n })[0]||null }
  function titrationInfo(v){ var P=packFor(v); if(!P||typeof TITRATION_IDS==='undefined'||!TITRATION_IDS[P.id]) return null; var pk=P.levels&&P.levels.pk; if(!pk||!pk.ladder||pk.ladder.length<2) return null; return {P:P, ladder:pk.ladder, hold:pk.stepDays||28, tau:pk.tau||7, max:pk.maxDose||pk.ladder[pk.ladder.length-1], ref:pk.refLabel||''} }
  function onDose(v){ // consecutive logged doses at today's dose (±12%), and when the first of them was taken
    if(!v.planned_mg) return {n:0, since:null, weeks:0}; var n=0, since=null; for(var i=v.doses.length-1;i>=0;i--){ var d=v.doses[i]; if(Math.abs(d.mg-v.planned_mg)<=0.12*v.planned_mg){ n++; since=d.t } else break }
    var weeks=0; if(since){ var sd=new Date(since); sd.setHours(0,0,0,0); weeks=Math.floor((Math.round((today()-sd)/86400000)+0.5)/7) } return {n:n, since:since, weeks:Math.max(0,weeks)} }
  function weightTrend(){ var w=null; try{ w=window.mpWeights?window.mpWeights():null }catch(e){} if(!w||!w.list.length) return null; var list=w.list; var L=new Date(list[list.length-1].d+'T00:00:00');
    function avg(a,b){ var xs=list.filter(function(r){ var dd=new Date(r.d+'T00:00:00'); return dd>=a&&dd<=b }).map(function(r){return r.kg}); if(!xs.length) return null; return xs.reduce(function(p,q){return p+q},0)/xs.length }
    var day=86400000; var w0=avg(new Date(L-6*day),L), w1=avg(new Date(L-13*day),new Date(L-7*day)), w2=avg(new Date(L-20*day),new Date(L-14*day));
    return {unit:w.unit, last:L, w0:w0, w1:w1, w2:w2, n:list.length} }
  function kgTxt(kg,unit){ return unit==='lb'?(Math.abs(kg)*2.20462).toFixed(1)+' lb':Math.abs(kg).toFixed(1)+' kg' }
  function nextStep(cur,ti){ var rung=null; for(var i=0;i<ti.ladder.length;i++){ if(ti.ladder[i]>cur+1e-9){ rung=ti.ladder[i]; break } } var step=Math.min(1, rung!==null?rung-cur:1); var nx=Math.round((cur+step)*100)/100; return Math.min(nx, ti.max) }
  function dosePlanCard(v,c){ var ti=titrationInfo(v); if(!ti) return '';
    var every=ti.tau>=7?'weekly':(ti.tau===1?'daily':'every '+ti.tau+' days'); var sched=ti.ladder.map(function(x){return fmtDose0(x)}).join(' → ')+' mg '+every+', one step every '+ti.hold+' days'+(ti.ref?' ('+esc(ti.ref)+')':'');
    var od=onDose(v); var wt=weightTrend(); var cur=v.planned_mg; var html='<div class="card" id="vl-plan"><h3>Dose plan — go up only at a plateau</h3>'
      +'<p class="small muted" style="margin-top:4px"><b>What the trials did:</b> '+sched+'.</p>'
      +'<ol class="steps" style="margin-top:8px;font-size:13.5px"><li><b>Stay on your dose until your weight plateaus</b><span>Weigh in once a week, same day, same conditions (Track → Vitals). A plateau is two weekly weigh-ins within 0.5 kg (1 lb) of each other.</span></li><li><b>Then step up by one</b><span>'+(cur?fmtDose0(cur)+' → '+fmtDose0(nextStep(cur,ti))+' mg':'One step at a time')+', never a skip, and never before 4 weeks on the current dose (the trials held every step 4 weeks). Do not step up while nausea, vomiting or constipation still interfere with eating or drinking; a bad step means one step back, not to zero.</span></li><li><b>Repeat at every plateau</b><span>Up to the trial’s top dose of '+fmtDose0(ti.max)+' mg. Weight loss that keeps coming is the reason to stay put.</span></li></ol>';
    // status
    var st='';
    if(!cur) st='<div class="notice info">Enter today’s dose above to track where you are on the plan.</div>';
    else { var onTxt='On '+fmtDose0(cur)+' mg'+(od.n?' for '+od.n+' dose'+(od.n===1?'':'s')+' ('+od.weeks+' week'+(od.weeks===1?'':'s')+')':' (no doses logged at this level yet)')+'. ';
      if(!wt||wt.w0===null||(wt.w1===null&&wt.w2===null)) st='<div class="notice info"><b>'+onTxt+'</b>No weekly weights to judge a plateau yet — log your weight in <button type="button" class="linkish" data-gohash="#track">Track → Vitals</button> once a week and this card will tell you when to step up.</div>';
      else { var ref=wt.w2!==null?wt.w2:wt.w1; var span=wt.w2!==null?'two weeks':'one week'; var ch=wt.w0-ref; var flat=ch>-0.5; var hold=od.weeks<4; var atMax=cur>=ti.max-1e-9;
        if(!flat) st='<div class="notice ok"><b>'+onTxt+'Still losing: '+kgTxt(ch,wt.unit)+' over the last '+span+'.</b> Stay on '+fmtDose0(cur)+' mg.</div>';
        else if(atMax) st='<div class="notice"><b>'+onTxt+'Weight flat over the last '+span+' ('+(ch>=0?'+':'−')+kgTxt(ch,wt.unit)+').</b> You are at the trial’s top dose; there is no higher step. Hold, and look at the week (food, sleep, missed doses) before anything else.</div>';
        else if(hold) st='<div class="notice"><b>'+onTxt+'Weight flat over the last '+span+' ('+(ch>=0?'+':'−')+kgTxt(ch,wt.unit)+'), but only '+od.weeks+' week'+(od.weeks===1?'':'s')+' on this dose.</b> Hold until you have had 4 weeks at '+fmtDose0(cur)+' mg; the first weeks at a dose are the slow ones.</div>';
        else st='<div class="notice bad"><b>'+onTxt+'Plateau: '+(ch>=0?'+':'−')+kgTxt(ch,wt.unit)+' over the last '+span+' after '+od.weeks+' weeks.</b> Time to step up to '+fmtDose0(nextStep(cur,ti))+' mg — if stomach side effects are quiet. <button type="button" class="btn sm" data-stepup="'+nextStep(cur,ti)+'">Step up to '+fmtDose0(nextStep(cur,ti))+' mg</button></div>' } }
    html+='<div style="margin-top:10px">'+st+'</div>'+(wt&&wt.w0!==null?'<p class="small muted" style="margin-top:8px">Weekly averages: '+[wt.w2,wt.w1,wt.w0].filter(function(x){return x!==null}).map(function(x){return kgTxt(x,wt.unit)}).join(' → ')+' (latest week last).</p>':'')+'</div>';
    return html }
  function fmtDose0(x){ return (Math.round(x*100)/100).toString() }
  function animOpen(){ try{ return localStorage.getItem('vt-anim')!=='0' }catch(e){ return true } }
  function wireVial(v){ var c=calc(v);
    var tg=$('#vl-animtg'), an=$('#vl-anim'); if(tg&&an){ var showAnim=function(){ if(!an.hidden&&window.syringeAnim) window.syringeAnim(an,{g:r3(c.nextG), syringe:1, liquid:'dose', name:v.name, doseTxt:fmtMg(c.nextMg)}) }; showAnim(); tg.addEventListener('click',function(){ an.hidden=!an.hidden; try{ localStorage.setItem('vt-anim',an.hidden?'0':'1') }catch(e){} tg.textContent=an.hidden?'Show me the draw':'Hide the draw'; showAnim() }) }
    var tEl=$('#d-t'); var now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); tEl.value=now.toISOString().slice(0,16);
    function doseNums(){ var se=num('d-se'), sf=num('d-sf'), b=num('d-b'), a=num('d-a'); var sm=isFinite(sf)?r3(sf-(isFinite(se)?se:0)):NaN; var ref=isFinite(b)?b:(c.expectNow!==null?c.expectNow:NaN); var vm=(isFinite(ref)&&isFinite(a))?r3(ref-a):NaN; return {sm:sm, vm:vm, b:b, a:a, ref:ref} }
    function doseCalc(){ var n=doseNums(); var el=$('#d-calc'); var html='';
      if(isFinite(n.b)&&c.expectNow!==null){ var db=r3(n.b-c.expectNow); html+='<span class="'+(Math.abs(db)>0.010?'err':'ok')+'">Vial before: '+n.b.toFixed(3)+' g'+(Math.abs(db)>0.010?' — '+Math.abs(db*1000).toFixed(0)+' mg '+(db<0?'less':'more')+' than the '+c.expectNow.toFixed(3)+' g recorded after the last dose. Something is off: a leak, an unlogged dose, or a different weighing set-up. Work it out before you draw.':' — matches the recorded weight.')+'</span>' }
      if(!isFinite(n.sm)||!isFinite(c.conc)){ el.innerHTML=html||'Enter the weights to see the dose.'; return }
      var ml=n.sm; var mg=ml*c.conc; var unc=ml>0?Math.round(state.scale.acc/ml*100):null; html+='<span>Syringe holds <b>'+ml.toFixed(3)+' g</b> → <b>'+fmtMg(mg)+'</b>'+(unc!==null?' <span class="muted">(±'+unc+'% at this scale’s accuracy)</span>':'')+'</span>';
      if(ml<=0) html+='<span class="err">Nothing drawn.</span>';
      else if(c.nextMg){ var ratio=mg/c.nextMg; var over=(ml-c.nextG)/c.nextG; if(ratio>1.25||ratio<0.75) html+='<span class="err">This is '+(ratio>=1?ratio.toFixed(1)+'× your '+fmtMg(c.nextMg)+' dose':Math.round(ratio*100)+'% of your '+fmtMg(c.nextMg)+' dose')+'. Check the syringe before injecting.</span>'; else if(Math.abs(over)>0.10) html+='<span class="err">'+(over>0?'Over':'Under')+' by '+Math.round(Math.abs(over)*100)+'% — '+(over>0?'push the excess back into the vial':'draw past the mark again and push back')+', then weigh again. Target '+c.nextG.toFixed(3)+' g.</span>'; else html+='<span class="ok">Matches your '+fmtMg(c.nextMg)+' dose (target '+c.nextG.toFixed(3)+' g).</span>' }
      if(isFinite(n.vm)){ var d=r3(n.vm-ml); html+='<span class="'+(Math.abs(d)>0.010?'err':'ok')+'">Vial after: '+n.a.toFixed(3)+' g — the vial lost '+n.vm.toFixed(3)+' g'+(Math.abs(d)>0.010?', '+Math.abs(d*1000).toFixed(0)+' mg '+(d>0?'more than the syringe holds (a drop lost, or the before weight is off)':'less than the syringe holds (air in the syringe, or a reading is off)')+'. Weigh both again before you log.':', which agrees with the syringe.')+'</span>' }
      else if(isFinite(n.a)) html+='<span class="muted">Vial after: '+n.a.toFixed(3)+' g (no earlier vial weight to compare with).</span>';
      el.innerHTML=html }
    ['d-se','d-sf','d-b','d-a'].forEach(function(id){$('#'+id).addEventListener('input',doseCalc)});
    var dosePhotos={}; $('#f-dose').addEventListener('vt-photo',function(e){ var id=e.target&&e.target.id; if(id) dosePhotos[id]=JSON.parse(JSON.stringify(e.detail||{})) });
    $('#f-dose').addEventListener('submit',function(e){ e.preventDefault(); var err=$('#d-err'); err.hidden=true; var n=doseNums(); var ml=n.sm;
      if(!isFinite(ml)||ml<=0){err.textContent='Weigh the filled syringe first; the amount drawn must be greater than zero.';err.hidden=false;return}
      if(!isFinite(c.conc)){err.textContent='This vial has no measured water volume, so there is no concentration to work from.';err.hidden=false;return}
      if(!isFinite(n.a)){err.textContent='Weigh the vial after the draw and enter it — the next dose starts from that number.';err.hidden=false;return}
      var ps=dosePhotos['d-sf']||null, pv=dosePhotos['d-a']||null;
      var flagged=[ps,pv].filter(function(m){ return m&&m.checked&&!m.ok&&!m.override });
      if(flagged.length){ err.textContent='A photo check found a problem: '+(flagged[0].issues&&flagged[0].issues.length?flagged[0].issues.join(' '):'the display could not be read')+' Fix it and take the photo again, or confirm it is fine under the photo.'; err.hidden=false; return }
      var mkNo=function(kind){ return {kind:kind, t:new Date().toISOString(), g:null, checked:false, ok:false, issues:[], seen:'', saved:false, nophoto:true} };
      if(!ps) ps=mkNo('dose'); if(!pv) pv=mkNo('vial');
      var t=tEl.value?new Date(tEl.value).toISOString():new Date().toISOString(); var idx=v.doses.length;
      if(isFinite(n.b)) v.weights.push({t:new Date(new Date(t).getTime()-60000).toISOString(), g:n.b});
      v.doses.push({t:t, ml:ml, mg:r3(ml*c.conc), method:'both', before_g:isFinite(n.b)?n.b:null, after_g:n.a, syr_empty_g:isFinite(num('d-se'))?num('d-se'):null, syr_full_g:num('d-sf'), note:$('#d-note').value.trim(), photo:ps, photo_vial:pv});
      v.weights.push({t:t, g:n.a});
      Promise.all([photoMove(v.id+':tmp-syr',v.id+':dose'+idx+'-syr'), photoMove(v.id+':tmp-vial',v.id+':dose'+idx+'-vial'), photoMove(v.id+':tmp-before',v.id+':dose'+idx+'-before')]).then(function(){ if(VIEW==='vial-'+v.id) renderPhotos(v) });
      toast('Dose logged: '+fmtMg(ml*c.conc)); commit() });
    $('#f-weigh').addEventListener('submit',function(e){ e.preventDefault(); var g=num('w-g'); if(!isFinite(g)) return; var t=new Date().toISOString(); v.weights.push({t:t, g:g}); photoMove(v.id+':tmp-check',v.id+':check'+v.weights.length).then(function(){ if(VIEW==='vial-'+v.id) renderPhotos(v) }); toast('Weight recorded'); commit() });
    $('#f-plan').addEventListener('submit',function(e){ e.preventDefault(); var pw=num('p-pw'); v.per_week=isFinite(pw)&&pw>=0?pw:1; var md=$('#p-mixed').value; if(/^\d{4}-\d{2}-\d{2}$/.test(md)) v.mixed_on=md; var ex=num('p-exp'); if(isFinite(ex)&&ex>0) v.expiry_days=Math.round(ex); toast('Updated'); commit() });
    $$('[data-stepup]').forEach(function(b){ b.addEventListener('click',function(){ var nx=parseFloat(b.getAttribute('data-stepup')); if(isFinite(nx)&&nx>0){ v.planned_mg=nx; v.next_mg=null; toast('Today’s dose set to '+fmtDose0(nx)+' mg'); commit() } }) });
    $$('[data-gohash]').forEach(function(b){ b.addEventListener('click',function(){ location.hash=b.getAttribute('data-gohash') }) });
    var td=$('#t-dose'); if(td){ var tdT; td.addEventListener('input',function(){ clearTimeout(tdT); tdT=setTimeout(function(){ var d=num('t-dose'); if(isFinite(d)&&d>0&&d!==v.planned_mg){ v.planned_mg=d; v.next_mg=null; saveLocal(); pushDb(); renderVial(v.id); var el=$('#t-dose'); if(el){ el.focus(); try{ el.setSelectionRange(el.value.length,el.value.length) }catch(x){} } } },600) }) }
    $$('[data-act]').forEach(function(b){ b.addEventListener('click',function(){ var a=b.getAttribute('data-act');
      if(a==='ordered'){v.status='ordered'; v.ordered_on=new Date().toISOString(); commit()}
      else if(a==='unorder'){v.status='active'; v.ordered_on=null; commit()}
      else if(a==='archive'){v.status='archived'; commit(); vgo('')}
      else if(a==='unarchive'){v.status='active'; commit()}
      else if(a==='delete'){ if(b.getAttribute('data-armed')){ state.vials=state.vials.filter(function(x){return x.id!==v.id}); photoKeys(v.id+':').then(function(ks){ks.forEach(photoDel)}); commit(); vgo('') } else { b.setAttribute('data-armed','1'); b.textContent='Tap again to delete'; setTimeout(function(){b.removeAttribute('data-armed'); b.textContent='Delete vial'},3000) } }
      else if(a==='scale'){ var cur=(state.scale.acc*1000).toFixed(0); var wrap=document.createElement('form'); wrap.className='row'; wrap.innerHTML='<label class="fl">Scale accuracy (± mg)<input id="s-acc" class="mono" type="number" step="1" min="0" value="'+cur+'"></label><button class="btn sm" type="submit">Save</button>'; b.replaceWith(wrap); wrap.addEventListener('submit',function(e){e.preventDefault(); var a2=num('s-acc'); if(isFinite(a2)&&a2>=0){state.scale.acc=a2/1000; commit()}}) }
    }) });
    $$('[data-del-dose]').forEach(function(b){ b.addEventListener('click',function(){ var i=+b.getAttribute('data-del-dose'); if(b.getAttribute('data-armed')){ v.doses.splice(i,1); commit() } else { b.setAttribute('data-armed','1'); b.textContent='Confirm'; setTimeout(function(){b.removeAttribute('data-armed'); b.textContent='Delete'},3000) } }) });
  }

  // ---------- classic new-vial form (numbers already in hand)
  function newCalc(){ var dry=num('n-dry'), full=num('n-full'), mg=num('n-mg'), se=num('n-se'), sf=num('n-sf'); var el=$('#n-calc');
    if(!isFinite(dry)||!isFinite(full)){el.innerHTML='Enter the dry and after-water weights to see the measured volume and concentration.';return}
    var water=r3(full-dry); var html='<span>Water in the vial: <b>'+water.toFixed(3)+' g = '+water.toFixed(3)+' mL</b></span>';
    if(isFinite(sf)&&isFinite(se)){var sw=r3(sf-se); var d=r3(sw-water); html+='<span class="'+(Math.abs(d)>Math.max(0.02,0.05*sw)?'err':'muted')+'">Syringe delivered '+sw.toFixed(3)+' mL'+(Math.abs(d)>Math.max(0.02,0.05*sw)?' — '+Math.abs(d).toFixed(3)+' mL '+(d>0?'never reached the vial (pushed back under pressure or leaked). The vial figure is used.':'more in the vial than the syringe shows — check the weights.'):' — matches.')+'</span>'}
    if(isFinite(mg)&&water>0) html+='<span>Concentration: <b>'+(mg/water).toFixed(2)+' mg/mL</b> (label '+mg+' mg ÷ '+water.toFixed(3)+' mL)</span>';
    if(water<=0) html+='<span class="err">The after-water weight must be higher than the dry weight.</span>';
    el.innerHTML=html }
  ['n-dry','n-full','n-mg','n-se','n-sf'].forEach(function(id){$('#'+id).addEventListener('input',newCalc)});
  $('#f-new').addEventListener('submit',function(e){ e.preventDefault(); var err=$('#n-err'); err.hidden=true;
    var name=$('#n-name').value.trim(), mg=num('n-mg'), dry=num('n-dry'), full=num('n-full');
    var se=num('n-se'), sf=num('n-sf');
    if(!name||!isFinite(mg)||mg<=0||!isFinite(dry)||!isFinite(full)||!isFinite(se)||!isFinite(sf)){err.textContent='Name, label amount and all four weights are required — the syringe is weighed empty and with the water in it.';err.hidden=false;return}
    if(full<=dry){err.textContent='The after-water weight must be higher than the dry weight.';err.hidden=false;return}
    if(sf<=se){err.textContent='The syringe with water must weigh more than the empty syringe.';err.hidden=false;return}
    var d=num('n-dose'), pw=num('n-pw'), ld=NaN, nx=NaN, af=NaN;
    var v={id:uid(), name:name, src:$('#n-src').value.trim(), label_mg:mg, diluent:$('#n-dil').value, dry_g:dry, full_g:full, syr_water_g:r3(sf-se), syr_tare_g:(se>0.2?r3(se):null), filtered:(num('n-fdry')>0&&num('n-ffull')>num('n-fdry'))?{dry_g:r3(num('n-fdry')), full_g:r3(num('n-ffull')), t:new Date().toISOString()}:null, scale_check_g:null, scale_zero_g:null, draws:[], checks:{}, planned_mg:isFinite(d)&&d>0?d:null, next_mg:isFinite(nx)&&nx>0?nx:null, step_after:isFinite(af)&&af>=0?Math.round(af):4, per_week:isFinite(pw)&&pw>=0?pw:1, lead_days:isFinite(ld)&&ld>=0?Math.round(ld):10, status:'active', ordered_on:null, created:new Date().toISOString(), mixed_on:(/^\d{4}-\d{2}-\d{2}$/.test($('#n-mixed').value)?$('#n-mixed').value:dstr(today())), expiry_days:(isFinite(num('n-exp'))&&num('n-exp')>0?Math.round(num('n-exp')):28), notes:'', doses:[], weights:[{t:new Date().toISOString(), g:(num('n-fdry')>0&&num('n-ffull')>num('n-fdry'))?r3(num('n-ffull')):full}]};
    state.vials.push(v); $('#f-new').reset(); $('#n-pw').value='1'; $('#n-exp').value='28'; newCalc(); commit(); vgo('vial-'+v.id); toast('Vial saved') });
  window.PEP_LABEL=window.PEP_LABEL||{Retatrutide:'GLP3 (Retatrutide)'};
  $('#vl-peps').innerHTML=PEPS.map(function(p){return '<option value="'+esc(p)+'" label="'+esc(window.PEP_LABEL[p]||p)+'">'}).join('');

  // ---------- the guided mix (wizard)
  var W=null; // {id, step, d:{...}}
  function wLoad(){ try{ var s=JSON.parse(localStorage.getItem(LSW)||'null'); if(s&&s.id&&s.d){ W=s; if(!W.d.photos) W.d.photos={}; if(W.d.zero===undefined) W.d.zero=''; if(W.d.waterAuto===undefined) W.d.waterAuto=W.d.water===''; if(W.key){ var k=W.key; if(k==='pep'||k==='mg') k='vial'; else if(/^(draw|inject)\d+$/.test(k)) k='water'; else if(k==='clear') k='full'; else if(/^(fdry|f\d|ffull)$/.test(k)) k='filter'; var ki=wSteps().indexOf(k); if(ki>=0) W.step=ki; else W.step=Math.min(W.step||0,wSteps().length-1) } } }catch(e){} }   /* resume by step name, so a saved mix lands on the same page even after the step order changes */
  function wSave(){ try{ if(W){ try{ W.key=wSteps()[W.step]||W.key }catch(e){} localStorage.setItem(LSW,JSON.stringify(W)) } else localStorage.removeItem(LSW) }catch(e){} }
  function wInit(pre){ W={id:uid(), step:0, d:{name:'', mg:'', src:'', dil:'Bacteriostatic water', dose:'', next:'', after:4, pw:1, lead:10, water:'', waterAuto:true, syr:1, check:'', zero:'', dry:'', tare:'', tared:false, stepChoice:'', draws:{}, full:'', photos:{}}}; if(pre){ if(pre.name) W.d.name=pre.name; if(pre.src) W.d.src=pre.src; if(isFinite(pre.mg)&&pre.mg>0) W.d.mg=pre.mg; if(isFinite(pre.dose)&&pre.dose>0) W.d.dose=pre.dose; if(isFinite(pre.perWeek)&&pre.perWeek>=0) W.d.pw=pre.perWeek; if(isFinite(pre.lead)&&pre.lead>=0) W.d.lead=pre.lead; if(isFinite(pre.water)&&pre.water>0){ W.d.water=pre.water; W.d.waterAuto=false } } wSave() }
  function wStart(pre){ wInit(pre); vgo('wiz') }
  function coaLast(){ var e=window.qbCOA&&window.qbCOA.last&&window.qbCOA.last(); if(!e) return ''; var d=new Date(e.t); return '<span class="coa-last">\u2713 Last passed check: '+esc(e.pep||'')+(e.mg?' '+esc(e.mg)+' mg':'')+' \u00b7 lot '+esc(e.lot||'')+(isNaN(d)?'':' \u00b7 '+d.toLocaleDateString(undefined,{day:'numeric',month:'short'}))+'</span>' }
  window.vtWizDraft=function(){ return W?{name:W.d.name, mg:W.d.mg, src:W.d.src}:null };
  function wClear(){ if(W){ var id=W.id; photoKeys(id+':').then(function(ks){ks.forEach(photoDel)}) } W=null; wSave() }
  function f(x){ var v=parseFloat(String(x==null?'':x).replace(',','.')); return isFinite(v)?v:NaN }
  var STD_ML_PER_MG=0.1; // standard dilution: 0.1 mL of water per mg -> 1 mg = 10 units = 0.100 g
  function stdWater(){ var mg=f(W.d.mg); return mg>0?r3(mg*STD_ML_PER_MG):NaN }
  function syncWater(){ if(W.d.waterAuto){ var w=stdWater(); W.d.water=isFinite(w)?w:'' } }
  var PHOTO_KIND={'wz-check':'check','wz-zero':'zero','wz-dry':'dry','wz-tare':'syr','wz-full':'full','wz-fdry':'fdry','wz-ffull':'ffull'};
  function photoKindOfId(id){ if(PHOTO_KIND[id]) return PHOTO_KIND[id]; var m=/^wz-draw(\d+)$/.exec(id); return m?'draw'+m[1]:null }
  function photoOK(kind){ var m=W.d.photos[kind]; if(!m) return true; return !(m.checked&&!m.ok&&!m.override) }
  function noPhotoLink(id){ return '<p class="small muted nophoto">Cannot take a photo on this device? <button type="button" class="linkish" data-nophoto="'+esc(id)+'">Type the number and continue without one</button> — the record will say so.</p>' }
  function drawCount(){ var w=f(W.d.water), s=f(W.d.syr)||1; if(!(w>0)) return 1; return Math.max(1,Math.min(6,Math.ceil(w/s-1e-6))) }
  function drawTarget(i){ var w=f(W.d.water), s=f(W.d.syr)||1, n=drawCount(); if(!(w>0)) return s; return i<n?s:r3(w-s*(n-1)) }
  function drawsSum(){ var t=0, any=false; Object.keys(W.d.draws).forEach(function(k){ var g=f(W.d.draws[k]); if(isFinite(g)){t+=g; any=true} }); return any?r3(t):NaN }
  function wSteps(){ var s=['vial','check','dry','syr','water','full']; if(W.d.rejected){ s.push('rejected'); return s } if(!W.d.nofilter) s.push('filter'); s.push('plan','done'); return s }   /* nine pages: vial · scale · dry vial · syringe · water in · full vial + clarity · filter · dose · done */   /* the dose comes last: the vial is mixed, clear and filtered before anyone talks about doses */
  function wVial(){ // a provisional vial object from the wizard data, for calc()
    var full=f(W.d.full), dry=f(W.d.dry); var sum=drawsSum();
    return clean({vials:[{id:W.id, name:W.d.name||'Vial', src:W.d.src, label_mg:f(W.d.mg)||0, diluent:W.d.dil, dry_g:isFinite(dry)?dry:0, full_g:isFinite(full)?full:(isFinite(dry)&&isFinite(sum)?dry+sum:0), syr_water_g:isFinite(sum)?sum:null, syr_tare_g:f(W.d.tare), scale_check_g:f(W.d.check), scale_zero_g:f(W.d.zero), draws:Object.keys(W.d.draws).sort().map(function(k){return f(W.d.draws[k])}), checks:W.d.photos, status:W.d.rejected?'rejected':'active', filtered:(!W.d.rejected&&f(W.d.fdry)>0&&f(W.d.ffull)>f(W.d.fdry))?{dry_g:f(W.d.fdry), full_g:f(W.d.ffull), t:new Date().toISOString()}:null, planned_mg:f(W.d.dose), next_mg:f(W.d.next), step_after:f(W.d.after), per_week:f(W.d.pw), lead_days:f(W.d.lead), mixed_on:dstr(today()), expiry_days:(W.d.dil==='Sterile water'?1:28), created:new Date().toISOString(), doses:[], weights:[]}]}).vials[0] }
  function planCard(v,useLabel){ // no projections: dosing moves with the person, so the app only states what the vial holds at today's dose
    if(!v.planned_mg) return '<div class="calc">Enter the dose you take today to see what each draw will weigh.</div>';
    var n=Math.floor(v.label_mg/v.planned_mg+1e-9);
    return '<div class="calc"><span>This vial holds <b>'+fmtMg(v.label_mg)+'</b> of peptide. At today’s '+fmtMg(v.planned_mg)+' that is '+n+' draw'+(n===1?'':'s')+'; if your dose changes, the count changes with it.</span><span class="muted">The app does not guess your future doses. It counts what is actually left after each draw and tells you to order when about a week is left.</span></div>' }
  function waterCard(v){ var w=f(W.d.water), mg=f(W.d.mg), s=f(W.d.syr)||1; if(!(w>0)||!(mg>0)) return '<div class="calc">Enter the water amount to see what each dose will weigh.</div>';
    var conc=mg/w, per100=conc*s; var html='', warn=[];
    /* 1. the draws, first and plain: a 1 mL syringe cannot carry more than 1 g, so 1.3 g means two separate draws */
    var n=drawCount(), lines=[];
    if(n===1) lines.push('Draw '+ml(w)+' of water ('+units(w)+' units) into the '+s+' mL syringe.');
    else { lines.push('A '+s+' mL syringe holds '+ml(s)+', so '+ml(w)+' of water takes '+n+' draws.'); for(var di=1;di<=n;di++){ var dg=drawTarget(di); lines.push('Draw '+di+' is '+ml(dg)+' ('+units(dg)+' units'+(dg>=s-0.0005?', a full syringe':'')+').') } }
    html+=lines.map(function(t,k){ return '<span'+(k===0&&n>1?' class="emph"':'')+'>'+t+'</span>' }).join('');
    /* 3. no dose talk here: dosing comes after the vial is mixed, dissolved, inspected and filtered. Only warn if this water amount would make the dose unweighable. */
    [['Your dose',v.planned_mg],['Next dose',v.next_mg&&v.next_mg!==v.planned_mg?v.next_mg:null]].forEach(function(p){ if(!p[1]) return; var g=p[1]/conc; if(g<0.05) warn.push(p[0].toLowerCase()+' would be only '+g.toFixed(3)+' g — too small to weigh well (±'+Math.round(state.scale.acc/g*100)+'%). Use more water.'); else if(g<0.1) warn.push(p[0].toLowerCase()+' is a small draw ('+g.toFixed(3)+' g, ±'+Math.round(state.scale.acc/g*100)+'%); more water would make it more accurate.'); if(g>s) warn.push(p[0].toLowerCase()+' would be '+g.toFixed(3)+' g, more than one '+s+' mL syringe holds. Use less water.') });
    if(w>2) warn.push('Most peptide vials hold 2–3 mL. Check yours before adding more than 2 g.');
    warn.forEach(function(t){ html+='<span class="err">'+esc(t)+'</span>' });
    return '<div class="calc">'+html+'</div>' }
  function filterCard(){ var d=W.d; var fd=f(d.fdry), ff=f(d.ffull), sum=drawsSum(); if(!(fd>0)||!(ff>fd)||!isFinite(sum)) return '<div class="notice info">After the weight is in, this card shows how much stayed behind in the filter.</div>';
    var got=r3(ff-fd), lost=r3(sum-got); var mg=f(d.mg); var conc=sum>0?mg/sum:NaN; var lostMg=isFinite(conc)?r2(lost*conc):null; var bad=lost>0.15||lost<-0.02;
    return '<div class="notice '+(bad?'bad':'info')+'"><b>New vial holds '+got.toFixed(3)+' g</b> of the '+sum.toFixed(3)+' g you made. '+(lost>=0?lost.toFixed(3)+' g stayed in the filter and syringe'+(lostMg!==null?' ('+lostMg.toFixed(2)+' mg of peptide)':'')+'.':'It weighs more than you made — check both weights.')+(bad&&lost>0?' That is a lot: did the air go through after the liquid?':'')+' Concentration is unchanged at '+(isFinite(conc)?conc.toFixed(2)+' mg per g':'—')+'.</div>' }
  function reconcileCard(){ var dry=f(W.d.dry), full=f(W.d.full), sum=drawsSum(), mg=f(W.d.mg); if(!isFinite(dry)||!isFinite(full)) return '<div class="calc">Enter the full-vial weight to check it against the syringe.</div>';
    var water=r3(full-dry); if(water<=0) return '<div class="calc"><span class="err">The full vial must weigh more than the dry vial ('+dry.toFixed(3)+' g). Check both numbers against the display.</span></div>';
    var html='<span>Water in the vial: <b>'+water.toFixed(3)+' g</b> (full '+full.toFixed(3)+' − dry '+dry.toFixed(3)+').</span>';
    if(isFinite(sum)){ var d=r3(sum-water); var bad=Math.abs(d)>0.02; html+='<span class="'+(bad?'err':'ok')+'">Syringe delivered '+sum.toFixed(3)+' g'+(bad?' — '+Math.abs(d).toFixed(3)+' g '+(d>0?'never reached the vial (pushed back under pressure, or still in the syringe). Vent again, inject what is left, weigh the vial again. If it stays, the vial figure is the one that counts.':'more in the vial than the syringe shows — a reading is off; weigh the vial again.'):' — the two agree.')+'</span>' }
    if(mg>0) html+='<span>Concentration: <b>'+(mg/water).toFixed(2)+' mg per g</b>.</span>';
    return '<div class="calc">'+html+'</div>' }
  function checkNote(){ var ck=f(W.d.check); if(!isFinite(ck)) return ''; var off=Math.abs(ck-20); if(off<=0.005) return '<div class="notice ok"><b>The scale passes</b> ('+ck.toFixed(3)+' g).</div>'; if(off<=0.010) return '<div class="notice"><b>The scale is '+Math.round(off*1000)+' mg off</b> ('+ck.toFixed(3)+' g). That is at the edge of what this scale promises. You can go on, but a calibration (hold CAL, put the 20 g weight on when asked, wait for PASS) will tighten every dose.</div>'; return '<div class="notice bad"><b>The scale is off by '+Math.round(off*1000)+' mg</b> ('+ck.toFixed(3)+' g). You cannot go on with it like this. Take the weight off. Hold the CAL button until the display shows CAL, put the 20 g weight on when the display asks for it, wait for PASS, take the weight off, then test the scale again and take a new photo.</div>' }
  function zeroNote(){ var z=f(W.d.zero); if(!isFinite(z)) return ''; return Math.abs(z)<=0.002?'<div class="notice ok"><b>Zeroed</b> ('+z.toFixed(3)+' g).</div>':'<div class="notice bad"><b>Not at zero</b> ('+z.toFixed(3)+' g). Make sure nothing is on the pan, press TARE again, wait for 0.000, then photograph it or type it.</div>' }
  function drawNote(i){ var tg=drawTarget(i), got=f(W.d.draws[i]); if(!isFinite(got)) return ''; if(got>tg*5&&got>=5) return '<div class="notice"><b>'+got+' looks like units, not grams.</b> The scale shows grams: '+units(tg)+' units of water weighs '+tg.toFixed(3)+' g.</div>'; if(Math.abs(got-tg)<=0.05) return '<div class="notice ok"><b>'+got.toFixed(3)+' g. On target.</b></div>'; return '<div class="notice"><b>'+got.toFixed(3)+' g, target '+tg.toFixed(3)+' g.</b> '+(got>tg?'Push a little back into the water vial.':'Draw a little more.')+' Or carry on: the full-vial weight decides.</div>' }
  var VALKEY={'wz-check':'check','wz-zero':'zero','wz-dry':'dry','wz-tare':'tare','wz-full':'full','wz-fdry':'fdry','wz-ffull':'ffull'};
  function fillVals(root){ $$('[data-wf] input[type="number"]',root).forEach(function(el){ if(el.value) return; var m=/^wz-draw(\d+)$/.exec(el.id); var v=m?(W.d.draws||{})[m[1]]:W.d[VALKEY[el.id]]; if(v!==undefined&&v!==null&&v!=='') el.value=v }) }
  function ml(x){ var v=f(x); if(!isFinite(v)) return ''; var t=v.toFixed(2).replace(/0$/,''); return t+' mL' }
  function drawDone(i){ return !!(W.d.drawDone&&W.d.drawDone[i]) }
  function allDrawsDone(){ var nd=drawCount(); for(var i=1;i<=nd;i++){ if(!drawDone(i)) return false } return true }
  function drawsBlock(){ var nd=drawCount(), now=pendingDraw(), h=''; for(var i=1;i<=nd;i++){ var tg=drawTarget(i), dn=drawDone(i);
      h+='<div class="wdraw'+(dn?' done':'')+(i===now&&!dn?' now':'')+'"><h3>Draw '+i+(nd>1?' of '+nd:'')+' \u2014 pull to '+units(tg)+' units = '+ml(tg)+'</h3>'
        +weighField('wz-draw'+i,'<span class="muted">Optional: on the scale it weighs '+tg.toFixed(3)+' g</span>',W.id+':draw'+i,'')+'<div id="wz-drawnote'+i+'">'+drawNote(i)+'</div>'
        +'<button type="button" class="btn sm'+(dn?' ok':'')+'" data-drawdone="'+i+'">'+(dn?'\u2713 Draw '+i+' is in the vial':'Draw '+i+' is in the vial')+'</button></div>' } return h }
  function drawsSig(){ var nd=drawCount(), a=[]; for(var i=1;i<=nd;i++) a.push(drawTarget(i).toFixed(3)+(drawDone(i)?'d':'')); return a.join('|') }
  function pendingDraw(){ var nd=drawCount(); for(var i=1;i<=nd;i++){ if(!drawDone(i)) return i } return nd }
  function mountAnim(box){ if(!window.syringeAnim) return; var el=$('#wz-anim',box); if(!el) return; var g=drawTarget(pendingDraw()), sig=g.toFixed(3)+'/'+(f(W.d.syr)||1); if(el.getAttribute('data-anim')===sig) return; el.setAttribute('data-anim',sig); window.syringeAnim(el,{g:g, syringe:f(W.d.syr)||1, liquid:'water', name:'water'}) }
  function fellOff(key){ return '<p class="small fell" style="margin-top:14px"><button type="button" class="btn sm danger" data-fell="'+esc(key)+'">My syringe fell off the scale</button><span class="muted">It is no longer sterile. DO NOT USE it. Start over with a NEW syringe.</span></p>' }
  function dilNote(dil){ if(dil==='Sterile water') return '<p class="note" data-dilnote>No preservative: a vial mixed with plain sterile water is a single-session vial. Draw the dose and discard the rest the same day; the tracker sets its use-by to 1 day. Bacteriostatic water (0.9% benzyl alcohol) is what makes the 28-day rule possible.</p>'; if(dil==='Other') return '<p class="note" data-dilnote>Not saline, not PBS: use bacteriostatic water.</p>'; return '' }
function wNav(back,next,nextLabel,disabled){ return '<div class="wnav"><button type="button" class="btn ghost" data-w="back"'+(back?'':' disabled')+'>Back</button><button type="button" class="btn'+(disabled?'':' ok')+'" data-w="next"'+(disabled?' disabled':'')+'>'+esc(nextLabel||'Next')+'</button></div>' }
  function instr(items){ return '<ol class="steps wsteps">'+items.map(function(s){ return '<li><b>'+esc(s[0])+'</b><span>'+esc(s[1])+'</span></li>' }).join('')+'</ol>' }
  /* directions as bullets, one sentence each (a single sentence stays a line) */
  function wSub(t){ var parts=String(t).replace(/([.!?])\s+(?=[A-Z0-9\u201c"(])/g,'$1\u0001').split('\u0001').map(function(x){ return x.trim() }).filter(Boolean); if(parts.length<2) return '<p class="wsub2">'+esc(t)+'</p>'; return '<ul class="wsub2 wlist">'+parts.map(function(x){ return '<li>'+esc(x)+'</li>' }).join('')+'</ul>' }
  function wRender(){ var box=$('#vl-wiz'); if(!W){ box.innerHTML=''; return } var steps=wSteps(); if(W.step>=steps.length) W.step=steps.length-1; var key=steps[W.step]; var n=W.step+1, total=steps.length; var d=W.d; var v=wVial(); var h='';
    /* what has been entered so far, one chip per step; tap a chip to go back to that step */
    var sumChips=function(){ var out=[]; var g=function(x){ var v=f(x); return isFinite(v)?v.toFixed(3)+' g':'' };
      var lab={ vial:function(){ return d.name?(window.PEP_LABEL&&window.PEP_LABEL[d.name]||d.name)+(d.mg?' '+d.mg+' mg':''):'' }, check:function(){ return d.check?'Scale '+g(d.check)+(d.zero?' \u00b7 zero '+g(d.zero):''):'' },
        dry:function(){ return d.dry?'Dry vial '+g(d.dry):'' }, syr:function(){ return d.tare?'Syringe '+g(d.tare)+(d.tared?' \u00b7 tared \u2713':''):'' }, plan:function(){ return d.dose?d.dose+' mg \u00d7 '+(d.pw||1)+'/wk':'' },
        full:function(){ return d.full?'Full vial '+g(d.full)+(d.clear?' \u00b7 clear \u2713':''):'' }, filter:function(){ return d.ffull?'Filtered '+g(d.ffull):(d.fdry?'New vial '+g(d.fdry):'') },
        water:function(){ return d.water?'BAC water '+ml(d.water)+(allDrawsDone()?' in \u2713':''):'' } };
      for(var i=0;i<W.step&&i<steps.length;i++){ var k=steps[i], t=''; if(lab[k]) t=lab[k]();
        if(t) out.push('<button type="button" class="wchip" data-goto="'+i+'" title="Back to this step">'+esc(t)+'</button>'); }
      return out.length?'<div class="wsum">'+out.join('')+'</div>':'' };
    var head=function(title,sub){ return '<div class="whead"><div class="row between"><button type="button" class="linkish" data-w="cancel">Cancel</button><span class="eyebrow">Step '+n+' of '+total+'</span></div><div class="wprog"><i style="width:'+Math.round(n/total*100)+'%"></i></div>'+sumChips()+'<h2>'+esc(title)+'</h2>'+(sub?wSub(sub):'')+'</div>' };
    var done='Mark complete';
    if(key==='vial'){ var opts=PEPS.map(function(p){return '<option value="'+esc(p)+'"'+(d.name===p?' selected':'')+'>'+esc(window.PEP_LABEL&&window.PEP_LABEL[p]||p)+'</option>'}).join(''); var other=d.name&&PEPS.indexOf(d.name)<0;
      h=head('The vial','What is printed on the label.')+'<div class="wone"><label class="fl">Peptide<select id="wz-pep"><option value=""'+(!d.name?' selected':'')+'>Choose…</option>'+opts+'<option value="__other"'+(other?' selected':'')+'>Other (type it)</option></select></label>'
        +'<label class="fl" id="wz-otherwrap"'+(other?'':' hidden')+'>Name<input id="wz-other" value="'+esc(other?d.name:'')+'" placeholder="Peptide name"></label>'
        +'<div class="f2"><label class="fl">Amount on the label'+unitWrap('<input id="wz-mg" class="mono big-in" type="number" step="any" min="0" inputmode="decimal" value="'+esc(d.mg)+'" placeholder="mg">','mg')+'</label><label class="fl">Mixing with<select id="wz-dil">'+['Bacteriostatic water','Sterile water','Acetic acid 0.6%','Other'].map(function(o){return '<option'+(d.dil===o?' selected':'')+'>'+o+'</option>'}).join('')+'</select></label></div>'
        +'<label class="fl">Vendor / lot (optional)<input id="wz-src" value="'+esc(d.src)+'" placeholder="Who made it, lot number"></label><div data-dilslot>'+dilNote(d.dil)+'</div>'
        +'<div class="note coa-note"><span>NO COA, NO DOSE.</span><button type="button" class="btn sm" data-coa="wiz">Check the COA</button>'+coaLast()+'</div></div>'
        +wNav(false,true,'Next',!wReady(key))+'<p class="small muted" style="margin-top:14px">Already have the numbers written down? <button type="button" class="linkish" data-vgo="new">Enter them directly</button>.</p>' }
    else if(key==='check'){ h=head('Test the scale','Hard, level surface, no drafts. ON with nothing on the pan; wait for 0.000. ONE 20 g weight in the middle of the pan; wait for it to settle.')
        +weighField('wz-check','The scale reads, with the 20 g weight on it',W.id+':check','20.000')+'<div id="wz-checknote">'+checkNote()+'</div>'
        +'<div class="tarebox"><b>Lift the weight off and press TARE.</b><span>It should read 0.000 (if not, TARE again). Leave the scale on; do not move it from now on.</span>'
        +weighField('wz-zero','The scale reads, with the weight off',W.id+':zero','0.000')+'<div id="wz-zeronote">'+zeroNote()+'</div></div>'+wNav(true,true,done,!wReady(key)) }
    else if(key==='dry'){ h=head('Weigh the dry vial','Plastic cap off (stopper and ring stay). Vial in the middle of the pan; wait for it to settle. Then vial off and press TARE so it reads 0.000 for the next weigh.')
        +weighField('wz-dry','The scale reads, with the dry vial on it',W.id+':dry','5.622')+wNav(true,true,done,!wReady(key)) }
    else if(key==='syr'){ h=head('Weigh the empty syringe','New insulin syringe. Needle cover off, plunger cap off. Lay it across the pan, touching nothing but the pan.')
        +(d.newSyringe?'<div class="notice bad" style="margin-bottom:12px"><b>The syringe that fell is not sterile.</b> Sharps bin. Weigh a NEW one.</div>':'')
        +weighField('wz-tare','The scale reads, with the empty syringe on it',W.id+':syr','2.438')
        +'<div class="tarebox"><b>Syringe still on the pan: press TARE.</b><span>It should read 0.000 with the syringe on it. Every draw is weighed against this tare.</span>'
        +'<button type="button" class="btn big'+(d.tared?' ok':'')+'" data-tared="1">'+(d.tared?'✓ It reads 0.000':'It reads 0.000')+'</button></div>'+fellOff(key)+wNav(true,true,done,!wReady(key)) }
    else if(key==='plan'){ h=head('Your dose today','What you take now, and how many times a week. Change it any time on the vial page.')+'<div class="f2"><label class="fl">Dose you take now'+unitWrap('<input id="wz-dose" class="mono big-in" type="number" step="any" min="0" inputmode="decimal" value="'+esc(d.dose)+'" placeholder="3">','mg')+'</label><label class="fl">How often'+unitWrap('<input id="wz-pw" class="mono big-in" type="number" step="any" min="0" inputmode="decimal" value="'+esc(d.pw)+'">','× per week')+'</label></div>'
        +'<div id="wz-plancard">'+planCard(v,true)+'</div>'+wNav(true,true,'Next',!wReady(key)) }
    else if(key==='water'){ syncWater(); var sw=stdWater(); var isStd=isFinite(sw)&&Math.abs(f(d.water)-sw)<0.0005; var nd=drawCount(), sz=f(d.syr)||1;
      h=head('Add BAC water','This is the standard dilution of the powder. Your dose is based off the dilution rate.')
        +'<div class="f2 stack"><label class="fl">Water to add'+unitWrap('<input id="wz-water" class="mono big-in" type="number" step="0.1" min="0" inputmode="decimal" value="'+esc(d.water)+'" placeholder="mL">','mL')+'</label><label class="fl">Syringe size<select id="wz-syr">'+[[1,'1 mL (100 units)'],[0.5,'0.5 mL (50 units)'],[0.3,'0.3 mL (30 units)']].map(function(o){return '<option value="'+o[0]+'"'+(sz===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label></div>'
        +(isFinite(sw)&&!isStd?'<p class="small muted">Standard for this vial: '+ml(sw)+'. <button type="button" class="linkish" data-stdwater="1">Use it</button></p>':'')
        +'<div id="wz-watercard">'+waterCard(v)+'</div><div id="wz-anim" class="syr-slot"></div>'
        +'<ul class="wlist"><li>Alcohol swab on both stoppers (BAC water and peptide). Let them dry.</li>'
        +'<li>Vent the peptide vial: a second syringe with the plunger pulled out and thrown away, needle through the edge of the stopper. Leave it standing.</li>'
        +'<li>On a fresh syringe, pull the plunger to the mark (air) and push that air into the BAC water vial. The air replaces the water you take, so there is no vacuum.</li>'
        +'<li>Hold the vial upside down. Pull SLOWLY to the mark. If the plunger drags or creeps back, stop: push a little more air in, then pull again.</li>'
        +'<li>Bubbles: pull 10–20 units past the mark, flick the barrel, push back to the mark. What is left in the syringe is the water you are adding.</li>'
        +'<li>Hold the peptide vial upright and inject the BAC water slowly down the side of the vial. Do not push hard. Do not aim at the powder.</li>'
        +'<li>Tap the draw\u2019s button once it is in the vial'+(nd>1?'; the picture moves on to the next draw':'')+'.</li>'+(nd>1?'<li>Same syringe, same way, for every draw.</li>':'')+'<li>Both needles out. Do not shake.</li></ul>'
        +'<div id="wz-draws" data-sig="'+esc(drawsSig())+'">'+drawsBlock()+'</div>'
        +fellOff(key)+wNav(true,true,done,!wReady(key)) }
    else if(key==='full'){ h=head('Full vial','Vent needle out. Dry the outside. Vial on the pan, cap off.')
        +weighField('wz-full','The scale reads, full vial',W.id+':full',isFinite(f(d.dry))&&isFinite(drawsSum())?(f(d.dry)+drawsSum()).toFixed(3):'')+'<div id="wz-recon">'+reconcileCard()+'</div>'
        +'<div class="tarebox"><b>Let it dissolve, then look at it against a light.</b><ul class="wlist"><li>Roll it gently or let it stand. Bubbles clear in 4–5 minutes.</li><li>Perfectly clear: no haze, no particles, no powder on the glass.</li><li>Not clear: do not filter it, do not dose from it. Contact the supplier with the lot number.</li></ul>'
        +'<div class="btn-row"><button type="button" class="btn'+(d.clear?' ok':'')+'" data-clear="ok">'+(d.clear?'✓ Perfectly clear':'Perfectly clear')+'</button><button type="button" class="btn ghost" data-clear="no">Not clear — do not use this vial</button></div></div>'
        +wNav(true,true,done,!wReady(key)) }
    else if(key==='rejected'){ h=head('Do not use this vial','It did not pass the clarity check. Nothing from it is filtered or dosed.')
        +'<ul class="wlist"><li>Cap it, mark it REJECTED with the date, keep it until the supplier answers.</li><li>Tell the supplier the product, the lot number and what you saw. Ask for a replacement and the lot’s COA.</li><li>Record it here: the weights and photos are kept; the vial is listed as rejected and cannot be dosed from.</li></ul>'
        +'<div class="btn-row" style="margin-top:14px"><button type="button" class="btn" data-w="save">Record it as rejected</button><button type="button" class="btn ghost" data-clear="undo">Back — I want to look again</button></div>' }
    else if(key==='filter'){ var fl=filterCard(); h=head('Sterile filter into a new vial','Everything goes through a 0.22 µm filter into a new sealed vial. That is the vial you dose from.')
        +'<ul class="wlist"><li>New sterile vial: cap off, wipe the stopper with an alcohol swab, let it dry.</li></ul>'
        +weighField('wz-fdry','The scale reads, empty new vial',W.id+':fdry','')
        +'<ul class="wlist"><li>Vent the mixed vial (plungerless syringe through the edge of the stopper).</li><li>3 mL Luer-lock syringe: vial upside down, draw every drop SLOWLY, then about 0.5 mL of air.</li><li>Unscrew the needle into the sharps bin. Screw the 0.22 µm PES filter on, tight.</li><li>New sterile needle on the filter outlet. Vent the new vial the same way.</li><li>Push slowly: liquid first, then the air. Real thumb pressure, 20–30 s per mL. A sudden easy push = burst membrane: stop.</li><li>Needles out. New vial on the pan, cap off.</li></ul>'
        +weighField('wz-ffull','The scale reads, filled new vial',W.id+':ffull','')+'<div id="wz-filt">'+fl+'</div>'
        +wNav(true,true,done,!wReady(key))+'<p class="small muted" style="margin-top:14px">No filter kit? <button type="button" class="linkish" data-nofilter="1">Skip filtering</button> — the vial is dosed as mixed.</p>' }
    else if(key==='done'){ var c=calc(v); var exp=c.expires; var lines=[];
      lines.push('<dt>Peptide</dt><dd>'+esc(v.name)+' · '+fmtMg(v.label_mg)+'</dd><dt>Water in the vial</dt><dd>'+ml(c.water)+'</dd><dt>Concentration</dt><dd>'+c.conc.toFixed(2)+' mg per g</dd>');
      if(v.planned_mg) lines.push('<dt>Dose now '+fmtMg(v.planned_mg)+'</dt><dd>'+(v.planned_mg/c.conc).toFixed(3)+' g (≈ '+units(v.planned_mg/c.conc)+' u)</dd>');
      if(v.next_mg&&v.next_mg!==v.planned_mg) lines.push('<dt>Next dose '+fmtMg(v.next_mg)+' (after '+v.step_after+')</dt><dd>'+(v.next_mg/c.conc).toFixed(3)+' g (≈ '+units(v.next_mg/c.conc)+' u)</dd>');
      if(c.dosesLeft!==null) lines.push('<dt>Draws at today’s dose</dt><dd>'+c.dosesLeft+'</dd>');
      if(exp) lines.push('<dt>Use by</dt><dd>'+dlabel(exp)+'</dd>');
      var tape=esc(v.name)+' · '+c.conc.toFixed(2)+' mg/g · mixed '+dlabel(today())+' · use by '+dlabel(exp)+(v.planned_mg?' · '+fmtMg(v.planned_mg)+' = '+(v.planned_mg/c.conc).toFixed(3)+' g':'')+(v.next_mg&&v.next_mg!==v.planned_mg?' · '+fmtMg(v.next_mg)+' = '+(v.next_mg/c.conc).toFixed(3)+' g':'');
      h=head('Done — label it, fridge it','A measured vial.')+'<div class="card"><dl class="kv">'+lines.join('')+'</dl>'+'</div>'
        +'<div class="card" style="margin-top:12px"><h3>Write this on tape and stick it on the vial</h3><p class="mono tape">'+tape+'</p><p class="small muted" style="margin-top:8px">Fridge, upright, out of the light. Never freeze it. Syringes in the sharps bin.</p></div>'
        +'<div class="wnav"><button type="button" class="btn ghost" data-w="back">Back</button><button type="button" class="btn" data-w="save">Save this vial</button></div>' }
    box.innerHTML=h;
    // thumbnails and stored verdicts for fields on this step
    $$('[data-wf]',box).forEach(function(w){ var inp=$('input[data-cam]',w); if(inp){ var id=inp.getAttribute('data-cam'); showThumb(id,inp.getAttribute('data-key')); var pk=photoKindOfId(id); if(pk&&W.d.photos[pk]){ PHOTO_META[id]=W.d.photos[pk]; var vd=$('#'+id+'-vd'); if(vd) vd.innerHTML=verdictHtml(W.d.photos[pk],id) } } });
    fillVals(box); if(key==='water') mountAnim(box);
    var first=$('input.big-in, select#wz-pep',box); if(first&&key!=='vial'&&!first.value){ try{ first.focus({preventScroll:true}) }catch(e){} }
    wWire(key);
  }
  function wWire(key){ var box=$('#vl-wiz'); var d=W.d;
    function bind(id,k,re){ var el=$('#'+id,box); if(!el) return; el.addEventListener('input',function(){ d[k]=el.value; wSave(); if(re) re() }); el.addEventListener('change',function(){ d[k]=el.value; wSave(); if(re) re() }) }
    var re=function(){ var v=wVial(); var pc=$('#wz-plancard'); if(pc) pc.innerHTML=planCard(v,true); var wc=$('#wz-watercard'); if(wc) wc.innerHTML=waterCard(v); var rc=$('#wz-recon'); if(rc) rc.innerHTML=reconcileCard(); if(key==='water'){ var db=$('#wz-draws',box); if(db&&db.getAttribute('data-sig')!==drawsSig()){ db.setAttribute('data-sig',drawsSig()); db.innerHTML=drawsBlock(); fillVals(db); wireDraws() } mountAnim(box) } var nb=$('[data-w="next"]',box); if(nb){ var ok=wReady(key); nb.disabled=!ok; nb.classList.toggle('ok',!!ok) } };
    function wireDraws(){ $$('input[id^="wz-draw"]',box).forEach(function(el){ var di=+el.id.slice(7); el.addEventListener('input',function(){ d.draws[di]=el.value; wSave(); var n=$('#wz-drawnote'+di,box); if(n) n.innerHTML=drawNote(di); re() }) }) }
    bind('wz-check','check',function(){ var n=$('#wz-checknote',box); if(n) n.innerHTML=checkNote(); re() }); bind('wz-zero','zero',function(){ var n=$('#wz-zeronote',box); if(n) n.innerHTML=zeroNote(); re() }); bind('wz-mg','mg',function(){ syncWater(); wSave(); re() }); bind('wz-src','src'); bind('wz-dil','dil',function(){ var sl=$('[data-dilslot]',box); if(sl) sl.innerHTML=dilNote(d.dil); re() }); bind('wz-dose','dose',re); bind('wz-pw','pw',re); bind('wz-next','next',re); bind('wz-after','after',re); bind('wz-lead','lead',re); bind('wz-water','water',function(){ d.waterAuto=false; wSave(); re() }); bind('wz-syr','syr',re); bind('wz-dry','dry',re); bind('wz-tare','tare',re); bind('wz-full','full',re); bind('wz-fdry','fdry',re); bind('wz-ffull','ffull',function(){ var n=$('#wz-filt',box); if(n) n.innerHTML=filterCard(); re() });
    var sb=$('[data-stdwater]',box); if(sb) sb.addEventListener('click',function(){ d.waterAuto=true; syncWater(); wSave(); wRender() });
    var nf=$('[data-nofilter]',box); if(nf) nf.addEventListener('click',function(){ d.nofilter=true; delete d.fdry; delete d.ffull; wSave(); W.step=wSteps().indexOf('plan'); wSave(); wRender() });
    $$('[data-clear]',box).forEach(function(b){ b.addEventListener('click',function(){ var a=b.getAttribute('data-clear'); if(a==='ok'){ d.clear=true; d.rejected=false; wSave(); b.classList.add('ok'); b.textContent='✓ Perfectly clear'; re() } else if(a==='no'){ d.clear=false; d.rejected=true; wSave(); W.step=wSteps().indexOf('rejected'); wSave(); wRender() } else { d.rejected=false; wSave(); W.step=wSteps().indexOf('full'); wSave(); wRender() } }) });
    $$('[data-goto]',box).forEach(function(b){ b.addEventListener('click',function(){ var i=parseInt(b.getAttribute('data-goto'),10); if(i>=0&&i<wSteps().length){ W.step=i; wSave(); wRender(); window.scrollTo(0,0) } }) });
    var tb=$('[data-tared]',box); if(tb) tb.addEventListener('click',function(){ d.tared=true; wSave(); tb.textContent='✓ It reads 0.000'; tb.classList.add('ok'); re() });
    if(box.__onDrawDone) box.removeEventListener('click',box.__onDrawDone); box.__onDrawDone=function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-drawdone]'); if(!b||!box.contains(b)) return; var i=+b.getAttribute('data-drawdone'); if(!d.drawDone) d.drawDone={}; d.drawDone[i]=true; d.waterin=allDrawsDone(); wSave(); re(); window.scrollTo({top:window.scrollY,behavior:'auto'}) }; box.addEventListener('click',box.__onDrawDone);
    var fb=$('[data-fell]',box); if(fb) fb.addEventListener('click',function(){ var from=fb.getAttribute('data-fell'); var m=/^draw(\d+)$/.exec(from); if(m){ delete d.draws[m[1]]; delete d.photos['draw'+m[1]]; photoDel(W.id+':draw'+m[1]) } d.tare=''; d.tared=false; delete d.photos.syr; photoDel(W.id+':syr'); d.newSyringe=true; d.returnTo=m?'water':(from==='water'?'water':''); W.step=wSteps().indexOf('syr'); wSave(); wRender(); window.scrollTo(0,0) });
    var pep=$('#wz-pep',box); if(pep){ pep.addEventListener('change',function(){ var o=$('#wz-otherwrap',box); if(pep.value==='__other'){ o.hidden=false; d.name=$('#wz-other',box).value.trim(); $('#wz-other',box).focus() } else { o.hidden=true; d.name=pep.value } wSave(); re() }); $('#wz-other',box).addEventListener('input',function(e){ d.name=e.target.value.trim(); wSave(); re() }) }
    wireDraws();
    if(box.__onPhoto) box.removeEventListener('vt-photo',box.__onPhoto); box.__onPhoto=function(e){ var id=e.target&&e.target.id; var pk=photoKindOfId(id); if(!pk) return; var meta=JSON.parse(JSON.stringify(e.detail||{})); W.d.photos[pk]=meta; wSave(); re() }; box.addEventListener('vt-photo',box.__onPhoto);
    if(box.__onNoPhoto) box.removeEventListener('click',box.__onNoPhoto); box.__onNoPhoto=function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-nophoto]'); if(!b||!box.contains(b)) return; var id=b.getAttribute('data-nophoto'); var pk=photoKindOfId(id); if(!pk) return; setMeta(id,{kind:kindOf(pk), t:new Date().toISOString(), g:null, checked:false, ok:false, issues:[], seen:'', saved:false, nophoto:true}); var inp=$('#'+id,box); if(inp){ try{ inp.focus() }catch(e){} } }; box.addEventListener('click',box.__onNoPhoto);
    $$('[data-w]',box).forEach(function(b){ b.addEventListener('click',function(){ var a=b.getAttribute('data-w');
      if(a==='back'){ if(W.step>0){W.step--; wSave(); wRender(); window.scrollTo(0,0)} }
      else if(a==='next'){ if(!wReady(key)) return; if(key==='syr'){ d.newSyringe=false; if(d.returnTo){ var idx=wSteps().indexOf(d.returnTo); d.returnTo=''; W.step=idx>=0?idx:W.step+1 } else W.step++ } else W.step++; wSave(); wRender(); window.scrollTo(0,0) }
      else if(a==='cancel'){ if(b.getAttribute('data-armed')){ wClear(); vgo(''); if(location.hash==='#track.mix') location.hash='#track.vials' } else { b.setAttribute('data-armed','1'); b.textContent='Tap again to discard this vial'; setTimeout(function(){b.removeAttribute('data-armed'); b.textContent='Cancel'},3000) } }
      else if(a==='save'){ ['check','zero','dry','syr','full'].concat(d.nofilter?[]:['fdry','ffull']).concat(Object.keys(d.draws).map(function(k){return 'draw'+k})).forEach(function(k){ if(!d.photos[k]) d.photos[k]={kind:kindOf(k), t:new Date().toISOString(), g:null, checked:false, ok:false, issues:[], seen:'', saved:false, nophoto:true} });
        var v=wVial(); if(!(v.label_mg>0)||!(v.full_g>v.dry_g)){ toast('Weights are missing'); return } v.created=new Date().toISOString(); v.weights=[{t:v.created, g:v.filtered?v.filtered.full_g:v.full_g}]; state.vials.push(v); var id=W.id; var rej=v.status==='rejected'; W=null; wSave(); VIEW='vial-'+id; commit(); if(location.hash==='#track.mix') location.hash='#track.vials'; window.scrollTo(0,0); toast(rej?'Recorded as rejected':'Vial saved') }
    }) });
  }
  function wReady(key){ var d=W.d;
    if(key==='vial') return !!d.name&&f(d.mg)>0;
    if(key==='check'){ var ck=f(d.check), z=f(d.zero); return isFinite(ck)&&Math.abs(ck-20)<=0.010&&photoOK('check')&&isFinite(z)&&Math.abs(z)<=0.002&&photoOK('zero') }
    if(key==='dry') return f(d.dry)>0&&photoOK('dry'); if(key==='syr') return f(d.tare)>0&&photoOK('syr')&&!!d.tared;
    if(key==='plan') return f(d.dose)>0;
    if(key==='water') return f(d.water)>0&&allDrawsDone();
    if(key==='full') return f(d.full)>f(d.dry)&&photoOK('full')&&d.clear===true;
    if(key==='rejected') return true;
    if(key==='filter') return f(d.fdry)>0&&photoOK('fdry')&&f(d.ffull)>f(d.fdry)&&photoOK('ffull'); return true }
  // ---------- router
  function renderResume(){ var r=$('#vl-resume'); if(!r) return; if(W&&VIEW!=='wiz'){ r.hidden=false; r.innerHTML='<div class="notice info"><b>A vial is half mixed</b> ('+esc(W.d.name||'unnamed')+', step '+(W.step+1)+'). <button type="button" class="linkish" data-vgo="wiz">Continue</button> · <button type="button" class="linkish" data-wdiscard="1">Discard</button></div>' } else { r.hidden=true; r.innerHTML='' } }
  function render(){ renderAlerts(); renderList(); renderResume(); var h=VIEW;
    $('#vl-head').hidden=(h==='wiz'||h.indexOf('vial-')===0);
    $('#vl-list').hidden=!(h===''||h==='list'); $('#vl-new').hidden=h!=='new'; $('#vl-wiz').hidden=h!=='wiz'; $('#vl-vial').hidden=h.indexOf('vial-')!==0;
    if(h.indexOf('vial-')===0) renderVial(h.slice(5)); if(h==='new'){ newCalc(); var nm=$('#n-mixed'); if(nm&&!nm.value) nm.value=dstr(today()); var nd=$('#n-dil'); if(nd&&!nd.__dil){ nd.__dil=1; nd.addEventListener('change',function(){ var ne=$('#n-exp'), note=$('#n-dil-note'); if(nd.value==='Sterile water'){ if(ne&&(!ne.value||+ne.value===28)) ne.value=1 } else if(ne&&+ne.value===1) ne.value=28; if(note) note.innerHTML=dilNote(nd.value) }) } } if(h==='wiz'){ if(!W) wInit(); wRender() } }
  var VIEW='';
  function vgo(v){ VIEW=v||''; render(); var s=document.getElementById('vials'); if(s&&!s.closest('section').hidden) window.scrollTo(0,0); }
  // the mixing guide is its own page (#track.mix); the tracker page (#track.vials) never shows it
  window.vtMix=function(){ if(!W) wStart(); else vgo('wiz'); };
  if(window.__wantMix){ window.__wantMix=false; setTimeout(function(){ window.vtMix() },0); }
  window.vlVials=function(){ return state.vials };
  window.vtLeaveMix=function(){ if(VIEW==='wiz') vgo(''); };
  document.addEventListener('click',function(e){ var el=e.target.closest('[data-vgo]'); if(!el||!document.getElementById('vials').contains(el)) return; e.preventDefault(); var t=el.getAttribute('data-vgo');
    if(t==='wiz'){ location.hash='#track.mix'; return } if(t===''||t==='list'){ if(location.hash==='#track.mix'){ location.hash='#track.vials'; return } }
    if(location.hash==='#track.mix'){ vgo(t); location.hash='#track.vials'; return }
    vgo(t); });
  document.addEventListener('keydown',function(e){ if(e.key!=='Enter') return; var el=e.target.closest('[data-vgo][role="link"]'); if(el){ e.preventDefault(); vgo(el.getAttribute('data-vgo')); } });
  window.vlNewVial=function(pre){ wStart(pre||null) };
  window.vlResume=function(){ return !!W };
  document.addEventListener('click',function(e){ var b=e.target.closest('[data-wdiscard]'); if(!b) return; if(b.getAttribute('data-armed')){ wClear(); render() } else { b.setAttribute('data-armed','1'); b.textContent='Tap again to discard'; setTimeout(function(){b.removeAttribute('data-armed'); b.textContent='Discard'},3000) } });
  loadLocal(); wLoad(); sampleInit(); render(); initDb();
})();
