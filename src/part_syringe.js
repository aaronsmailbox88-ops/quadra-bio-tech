/* ===== Animated draw: a U-100 insulin syringe filling from an inverted vial to the grams the user chose,
   with a zoom onto the unit mark once the dose is set ===== */
(function(){
  'use strict';
  var NS='http://www.w3.org/2000/svg';
  var VW=260, VH=450;                       // scene
  var L0=206, LEN=180, CX=130;              // barrel top (needle end), barrel length, centre x
  var BX=116, BW=28;                        // barrel left, width
  function clamp(t){ return Math.max(0,Math.min(1,t)) }
  function easeIO(t){ t=clamp(t); return t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2 }   // quartic in-out: soft start and stop
  function easeOut(t){ t=clamp(t); return 1-Math.pow(1-t,3) }
  function mk(tag,attrs,parent){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e }
  function txt(e,s){ e.textContent=s; return e }
  function grad(defs,id,stops,vertical){ var g=mk('linearGradient',{id:id,x1:'0',x2:vertical?'0':'1',y1:'0',y2:vertical?'1':'0'},defs); stops.forEach(function(s){ mk('stop',{offset:s[0],'stop-color':s[1],'stop-opacity':s[2]==null?1:s[2]},g) }); return g }
  // phases: k = kind, d = seconds, zoom > 1 zooms on the target mark. Built per play, because the dose and the water draw differ:
  // the dose vents the vial with a plungerless syringe; the water draw puts air into the water vial first. Both overdraw and push back.
  function phases(st){ var n=0; var over=st.overU>st.units+2.5; var ph=[];
    var step=function(d,zoom,capFn){ n++; var label=n+' · '; ph.push({d:d, zoom:zoom, cap:function(s){ return label+capFn(s) }}) };
    var plain=function(d,zoom,capFn){ ph.push({d:d, zoom:zoom, cap:capFn}) };
    plain(1.0,1,function(s){ return (s.liquid==='water'?'Water to draw: ':'Your dose: ')+(s.doseTxt?s.doseTxt+' = ':'')+s.uTxt+' units = '+s.gTxt+'.' }); ph[ph.length-1].k='intro';
    if(st.liquid==='water'){
      step(1.6,1,function(s){ return 'Air first: pull the plunger back to the '+s.uTxt+' mark.' }); ph[ph.length-1].k='air';
      step(2.0,1,function(){ return 'Push the needle through the water vial’s stopper and push the air in. That air replaces the water you take, so no vacuum forms.' }); ph[ph.length-1].k='in-air';
    } else {
      step(2.0,1,function(){ return 'Vent the vial: a second syringe with its plunger pulled out, needle through the edge of the stopper. The vial can breathe, so nothing sucks your plunger back.' }); ph[ph.length-1].k='vent';
      step(1.4,1,function(){ return 'Push the dosing needle through the stopper and turn the vial upside down.' }); ph[ph.length-1].k='in';
    }
    if(over){
      step(2.6,1,function(s){ return 'Pull slowly PAST the mark, to about '+s.overTxt+' units. Never yank it: a fast pull makes a vacuum and froth.' }); ph[ph.length-1].k='overdraw';
      plain(1.2,1,function(){ return 'If the plunger creeps back on its own, the vial is under vacuum: stop and vent it before going on.' }); ph[ph.length-1].k='hold';
      step(2.0,1,function(s){ return 'Tap the barrel so the bubbles rise to the needle, then push the plunger back to the '+s.uTxt+' mark. The air and the extra go back into the vial.' }); ph[ph.length-1].k='pushback';
    } else {
      step(2.8,1,function(s){ return 'Pull slowly until the liquid sits on the '+s.uTxt+' mark. Tap the barrel so bubbles rise to the needle and push them out.' }); ph[ph.length-1].k='fill';
    }
    step(3.0,2.2,function(s){ return 'The liquid sits exactly on the '+s.uTxt+' mark — the bottom of the curved surface on the line. Not above, not below.' }); ph[ph.length-1].k='zoom';
    plain(0.9,1,function(s){ return 'Exactly on the '+s.uTxt+' mark.' }); ph[ph.length-1].k='unzoom';
    step(2.6,1,function(s){ return (s.liquid==='water'?'Needle out. ':'Needle out, vent needle out. ')+'Lay the syringe on the tared scale: it should read '+s.gTxt+'.' }); ph[ph.length-1].k='weigh';
    return ph }
  function build(el,o){
    el.innerHTML=''; el.classList.add('syr-wrap');
    var U=Math.round((o.syringe||1)*100); var pxu=LEN/U;
    var svg=mk('svg',{viewBox:'0 0 '+VW+' '+VH,class:'syr-svg',role:'img','aria-label':'How the syringe fills to the chosen dose'},el);
    var defs=mk('defs',{},svg);
    grad(defs,'syr-glass',[[0,'#aebbc6'],[.08,'#e6edf2'],[.28,'#ffffff'],[.5,'#eef3f6'],[.78,'#dde6ec'],[.94,'#b9c6d0'],[1,'#95a4b0']]);
    grad(defs,'syr-flange',[[0,'#c2cdd6'],[.3,'#f3f7f9'],[.7,'#e3eaef'],[1,'#b5c1ca']]);
    var lq=o.liquid==='water'?['#cfe6ff','#9ccaff','#78b5ff']:['#c9f3ee','#7fded2','#4FC8BB'];
    grad(defs,'syr-liq',[[0,lq[0]],[.45,lq[1]],[1,lq[2]]]);
    grad(defs,'syr-vliq',[[0,lq[1]],[1,lq[2]]],true);
    grad(defs,'syr-rubber',[[0,'#1a1f24'],[.35,'#4a5159'],[.6,'#20262b'],[1,'#0c0f12']]);
    grad(defs,'syr-rod',[[0,'#cfd7dd'],[.35,'#f6f8fa'],[.65,'#e4eaee'],[1,'#b7c1c9']]);
    grad(defs,'syr-alu',[[0,'#8f9a9f'],[.22,'#eef2f3'],[.5,'#c4ccd0'],[.78,'#e6ebed'],[1,'#86929a']]);
    grad(defs,'syr-vglass',[[0,'#b6c3cc'],[.1,'#e8eef2'],[.32,'#ffffff'],[.6,'#f0f4f6'],[.9,'#cfd9df'],[1,'#a3b1bb']]);
    var sh=mk('filter',{id:'syr-shadow',x:'-30%',y:'-30%',width:'160%',height:'160%'},defs); mk('feDropShadow',{dx:'0',dy:'1.2',stdDeviation:'1.4','flood-color':'#0b1f1e','flood-opacity':'0.18'},sh);
    var clip=mk('clipPath',{id:'syr-barrelclip'},defs); mk('rect',{x:BX+1.2,y:L0,width:BW-2.4,height:LEN,rx:1.5},clip);
    // ---- vial (inverted)
    var vial=mk('g',{class:'syr-vial',filter:'url(#syr-shadow)'},svg);
    mk('path',{d:'M93 30 Q93 16 107 16 H153 Q167 16 167 30 V116 Q167 128 156 132 L151 135 V146 H109 V135 L104 132 Q93 128 93 116 Z',fill:'url(#syr-vglass)',stroke:'#8c9ba6','stroke-width':'1'},vial);
    var vLiq=mk('rect',{x:95,y:72,width:70,height:44,fill:'url(#syr-vliq)',opacity:'.92'},vial);
    mk('rect',{x:109,y:130,width:42,height:16,fill:'url(#syr-vliq)',opacity:'.85'},vial);
    mk('path',{d:'M93 30 Q93 16 107 16 H153 Q167 16 167 30 V116 Q167 128 156 132 L151 135 V146 H109 V135 L104 132 Q93 128 93 116 Z',fill:'url(#syr-vglass)',opacity:'.35'},vial);
    mk('rect',{x:103,y:28,width:5,height:84,rx:2.5,fill:'#fff',opacity:'.55'},vial);
    mk('rect',{x:104,y:146,width:52,height:15,rx:2,fill:'url(#syr-alu)',stroke:'#7d8990','stroke-width':'.8'},vial);
    for(var kx=108;kx<156;kx+=4) mk('line',{x1:kx,y1:148,x2:kx,y2:159,stroke:'#6f7b83','stroke-width':'.5',opacity:'.5'},vial);
    mk('circle',{cx:130,cy:161,r:9.5,fill:'#5b666f'},vial); mk('circle',{cx:130,cy:161,r:6,fill:'#434d55'},vial);
    mk('rect',{x:100,y:42,width:60,height:26,rx:2,fill:'#F5F7F5',stroke:'#c9d2d8','stroke-width':'.6'},vial);
    txt(mk('text',{x:130,y:59,'text-anchor':'middle','font-size':'8.5','font-weight':'600',fill:'#16211F',transform:'rotate(180 130 55)'},vial),(o.name||'').slice(0,13));
    txt(mk('text',{x:130,y:10,'text-anchor':'middle','font-size':'8',fill:'#5A6967'},vial),'vial upside down');
    // ---- syringe (group translates for in/out of the stopper)
    var syr=mk('g',{class:'syr-body',filter:'url(#syr-shadow)'},svg);
    mk('line',{x1:CX,y1:148,x2:CX,y2:196,stroke:'#8a949b','stroke-width':'1.3'},syr);
    mk('path',{d:'M'+(CX-0.65)+' 148 L'+CX+' 145.5 L'+(CX+0.65)+' 148 Z',fill:'#8a949b'},syr);
    mk('path',{d:'M126 196 L134 196 L137 206 L123 206 Z',fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.7'},syr);
    var liqG=mk('g',{'clip-path':'url(#syr-barrelclip)'},syr);
    var liq=mk('rect',{x:BX,y:L0,width:BW,height:0,fill:'url(#syr-liq)'},liqG);
    var men=mk('path',{d:'',fill:lq[0],opacity:'.9'},liqG);
    mk('rect',{x:BX,y:L0,width:BW,height:LEN,rx:2,fill:'url(#syr-glass)',opacity:'.55'},syr);
    mk('rect',{x:BX+4,y:L0+2,width:3,height:LEN-4,rx:1.5,fill:'#fff',opacity:'.6'},syr);
    mk('rect',{x:BX,y:L0,width:BW,height:LEN,rx:2,fill:'none',stroke:'#8d9aa3','stroke-width':'1.1'},syr);
    mk('rect',{x:98,y:L0+LEN-1,width:64,height:7,rx:3,fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.7'},syr);
    // scale printed on the barrel: ticks on the right wall, numbers outside
    var minor=U>=100?2:1, major=U>=100?10:5, mid=U>=100?5:0;
    for(var u=0;u<=U;u+=minor){ var y=L0+u*pxu, big=u%major===0, md=mid&&u%mid===0; mk('line',{x1:BX+BW-(big?12:md?8:5),y1:y,x2:BX+BW,y2:y,stroke:'#1b2328','stroke-width':big?'1.1':'.7',opacity:big?'.95':'.6'},syr); if(big&&u>0) txt(mk('text',{x:BX+BW+4,y:y+3.2,'font-size':'8.6','font-weight':'700',fill:'#1b2328','font-family':'var(--mono, ui-monospace, monospace)'},syr),String(u)) }
    txt(mk('text',{x:BX+BW+4,y:L0+3.2,'font-size':'7.5',fill:'#5A6967','font-family':'var(--mono, ui-monospace, monospace)'},syr),'0');
    txt(mk('text',{x:BX+BW+4,y:L0-5,'font-size':'5.6','font-weight':'700',fill:'#5A6967','letter-spacing':'.08em'},syr),'UNITS');
    // plunger: rubber stopper (with a conical face), rod with ridges, thumb pad
    var stopG=mk('g',{},syr);
    var stopTip=mk('path',{d:'',fill:'#2b3238'},stopG);
    var stop=mk('rect',{x:BX+1.2,y:L0-9,width:BW-2.4,height:10,rx:1.2,fill:'url(#syr-rubber)'},stopG);
    var stopHi=mk('rect',{x:BX+5,y:L0-7.5,width:2.4,height:7,rx:1.2,fill:'#fff',opacity:'.22'},stopG);
    var rod=mk('rect',{x:CX-5.5,y:L0,width:11,height:262,fill:'url(#syr-rod)',stroke:'#9aa6ae','stroke-width':'.7'},syr);
    var rodL=mk('line',{x1:CX,y1:L0,x2:CX,y2:L0+262,stroke:'#aeb9c0','stroke-width':'.8'},syr);
    var thumb=mk('rect',{x:CX-19,y:L0+258,width:38,height:8,rx:3,fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.7'},syr);
    var bubble=mk('circle',{cx:CX-5,cy:L0+40,r:2.1,fill:'#fff',stroke:'#9ccaff','stroke-width':'.6',opacity:'0'},syr);
    var bubble2=mk('circle',{cx:CX+6,cy:L0+40,r:1.3,fill:'#fff',stroke:'#9ccaff','stroke-width':'.5',opacity:'0'},syr);
    // vent: a second syringe barrel with no plunger, standing in the edge of the stopper (dose mode only)
    var vent=mk('g',{class:'syr-vent',opacity:'0'},svg);
    var ventIn=mk('g',{transform:'rotate(-14 150 150)'},vent);
    mk('line',{x1:150,y1:150,x2:150,y2:178,stroke:'#8a949b','stroke-width':'1.2'},ventIn);
    mk('path',{d:'M147.5 178 L152.5 178 L154 185 L146 185 Z',fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.6'},ventIn);
    mk('rect',{x:142,y:185,width:16,height:46,rx:1.5,fill:'url(#syr-glass)',opacity:'.6',stroke:'#8d9aa3','stroke-width':'.9'},ventIn);
    mk('rect',{x:134,y:229,width:32,height:4.5,rx:2,fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.6'},ventIn);
    txt(mk('text',{x:176,y:214,'font-size':'6.5',fill:'#5A6967'},ventIn),'vent: no plunger');
    // target mark
    var tgt=mk('g',{class:'syr-target'},syr);
    var tLine=mk('line',{x1:96,y1:L0,x2:BX+BW+1,y2:L0,stroke:'var(--accent, #0E6F68)','stroke-width':'1.4','stroke-dasharray':'3 2'},tgt);
    var tG=txt(mk('text',{x:93,y:L0-1.5,'text-anchor':'end','font-size':'9.5','font-weight':'700',fill:'var(--accent, #0E6F68)','font-family':'var(--mono, ui-monospace, monospace)'},tgt),'');
    var tU=txt(mk('text',{x:93,y:L0+8.5,'text-anchor':'end','font-size':'7.6',fill:'#5A6967'},tgt),'');
    var ring=mk('circle',{cx:BX+BW+11,cy:L0,r:9,fill:'none',stroke:'var(--accent, #0E6F68)','stroke-width':'1.2',opacity:'0'},tgt);
    // readout
    var ro=mk('g',{class:'syr-readout',opacity:'0'},svg);
    mk('rect',{x:170,y:28,width:84,height:30,rx:4,fill:'#0B1F1E'},ro);
    var roT=txt(mk('text',{x:212,y:49,'text-anchor':'middle','font-size':'14','font-weight':'700',fill:'#9BE8DF','font-family':'var(--mono, ui-monospace, monospace)'},ro),'0.000 g');
    txt(mk('text',{x:212,y:70,'text-anchor':'middle','font-size':'7.5',fill:'#5A6967'},ro),'scale, tared on the bare syringe');
    var cap=document.createElement('p'); cap.className='syr-cap'; el.appendChild(cap);
    var row=document.createElement('div'); row.className='syr-row'; row.innerHTML='<button type="button" class="syr-replay">Replay</button><span class="syr-note"></span>'; el.appendChild(row);
    var st={el:el, svg:svg, U:U, pxu:pxu, vLiq:vLiq, syr:syr, vent:vent, liq:liq, men:men, stop:stop, stopTip:stopTip, stopHi:stopHi, rod:rod, rodL:rodL, thumb:thumb, bubble:bubble, bubble2:bubble2, tLine:tLine, tG:tG, tU:tU, ring:ring, ro:ro, roT:roT, cap:cap, note:row.querySelector('.syr-note'), raf:0};
    row.querySelector('.syr-replay').addEventListener('click',function(){ play(st) });
    el.__syr=st; return st;
  }
  function setPlunger(st,px){ var y=L0+px; st.stop.setAttribute('y',y-9); st.stopHi.setAttribute('y',y-7.5); st.stopTip.setAttribute('d','M'+(BX+1.2)+' '+(y-9)+' L'+CX+' '+(y-12.5)+' L'+(BX+BW-1.2)+' '+(y-9)+' Z'); st.rod.setAttribute('y',y); st.rodL.setAttribute('y1',y); st.rodL.setAttribute('y2',y+262); st.thumb.setAttribute('y',y+258) }
  function setLiquid(st,px){ px=Math.max(0,px); st.liq.setAttribute('height',px); var y=L0+px; st.men.setAttribute('d',px>0.5?'M'+BX+' '+(y-2.2)+' Q'+CX+' '+(y+1.2)+' '+(BX+BW)+' '+(y-2.2)+' L'+(BX+BW)+' '+y+' L'+BX+' '+y+' Z':'') }
  function setView(st,z,cy){ // zoom z about the target mark at (CX, cy)
    if(z<=1.001){ st.svg.setAttribute('viewBox','0 0 '+VW+' '+VH); return }
    var w=VW/z, h=VH/z; var x=Math.max(0,Math.min(VW-w,109-w/2)); var y=Math.max(0,Math.min(VH-h,cy-h*0.5)); st.svg.setAttribute('viewBox',x.toFixed(2)+' '+y.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)) }
  function apply(st,o){
    st.g=o.g; st.units=o.g*100; st.gTxt=o.g.toFixed(3)+' g'; st.uTxt=(Math.round(st.units*10)/10).toString().replace(/\.0$/,''); st.doseTxt=o.doseTxt||'';
    st.over=st.units>st.U+1e-6; var px=Math.min(st.U,st.units)*st.pxu; st.tpx=px;
    var step=st.U>=100?10:5; st.overU=Math.min(st.U, Math.ceil((st.units+15)/step)*step); st.overTxt=String(st.overU); st.opx=Math.min(st.U,st.overU)*st.pxu;
    st.tLine.setAttribute('y1',L0+px); st.tLine.setAttribute('y2',L0+px); st.tG.setAttribute('y',L0+px-1.5); st.tU.setAttribute('y',L0+px+8.5); st.ring.setAttribute('cy',L0+px);
    st.tG.textContent=st.gTxt; st.tU.textContent=st.uTxt+' units';
    st.note.textContent=st.over?'More than this syringe holds ('+st.U+' units = '+(st.U/100).toFixed(1)+' g). Use a bigger syringe or less water next time.':'1 unit on a U-100 syringe = 0.01 mL = 0.010 g of water. The scale is the measurement; the mark is the guide.';
    play(st) }
  function play(st){
    if(st.raf) cancelAnimationFrame(st.raf); st.raf=0;
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var PH=phases(st); var tp=st.tpx, op=st.opx; var total=0, starts=PH.map(function(p){ var s=total; total+=p.d; return s });
    var IN=28; // how far the syringe sits below the stopper before the needle goes in
    function frame(t){
      var pi=PH.length-1; for(var i=0;i<PH.length;i++){ if(t<starts[i]+PH[i].d){ pi=i; break } }
      var ph=PH[pi], k=ph.k, p=clamp((t-starts[pi])/ph.d);
      var plunger=0, liquid=0, shift=IN, ventOp=0, ventY=-40, bub=0, bub2=0, bubY=L0, bub2Y=L0, roOp=0, roVal=0, vialLevel=44, zoom=1, ringOp=0;
      var vented=false; // vent stays in once placed, until the weigh phase
      for(var j=0;j<pi;j++) if(PH[j].k==='vent') vented=true;
      var filled=false; for(var j2=0;j2<pi;j2++) if(PH[j2].k==='pushback'||PH[j2].k==='fill') filled=true;
      if(vented){ ventOp=1; ventY=0 }
      if(filled){ shift=0; plunger=tp; liquid=tp; vialLevel=38 }
      if(k==='intro'){ }
      else if(k==='vent'){ ventOp=1; ventY=-40*(1-easeIO(p/0.7)) }
      else if(k==='air'){ plunger=tp*easeIO(p/0.85) }
      else if(k==='in-air'){ var a=easeIO(p/0.32), b=easeIO((p-0.42)/0.5); shift=IN*(1-a); plunger=tp*(1-b) }
      else if(k==='in'){ shift=IN*(1-easeIO(p/0.7)) }
      else if(k==='overdraw'){ shift=0; var f=easeIO(p/0.92); plunger=op*f; liquid=op*f; vialLevel=44-6*f*(op/Math.max(op,1)) ; bub=f>0.3?1:0; bubY=L0+op*f-6; bub2=f>0.5?1:0; bub2Y=L0+op*f-14 }
      else if(k==='hold'){ shift=0; plunger=op; liquid=op; vialLevel=38; bub=1; bubY=L0+op-6-3*easeOut(p); bub2=1; bub2Y=L0+op-14-8*easeOut(p) }
      else if(k==='pushback'){ shift=0; var g=easeIO(p/0.85); plunger=op-(op-tp)*g; liquid=plunger; vialLevel=38+6*0.3*g; var q=clamp(p/0.6); bub=q<0.95?1:0; bubY=L0+op-9-(op-14)*easeOut(q); bub2=q<0.85?1:0; bub2Y=L0+op-22-(op-26)*easeOut(q) }
      else if(k==='fill'){ shift=0; var f2=easeIO(p/0.92); plunger=tp*f2; liquid=tp*f2; vialLevel=44-6*f2 }
      else if(k==='zoom'){ zoom=1+(ph.zoom-1)*easeIO(p/0.3); ringOp=0.35+0.65*Math.abs(Math.sin(p*Math.PI*3)) }
      else if(k==='unzoom'){ zoom=2.2-(2.2-1)*easeIO(p); ringOp=1-p }
      else if(k==='weigh'){ var c=easeIO(p/0.3); shift=IN*c; ventOp=1-easeIO(p/0.3); ventY=-40*easeIO(p/0.3); roOp=1; roVal=st.g*easeOut(clamp((p-0.3)/0.5)) }
      if(st.over){ plunger=Math.min(plunger,st.U*st.pxu); liquid=Math.min(liquid,st.U*st.pxu) }
      if(st.liquid==='water') ventOp=0;
      st.syr.setAttribute('transform','translate(0 '+shift.toFixed(2)+')');
      st.vent.setAttribute('opacity',ventOp.toFixed(2)); st.vent.setAttribute('transform','translate(0 '+ventY.toFixed(2)+')');
      setPlunger(st,plunger); setLiquid(st,liquid);
      st.vLiq.setAttribute('y',116-vialLevel); st.vLiq.setAttribute('height',vialLevel);
      st.bubble.setAttribute('opacity',bub); st.bubble.setAttribute('cy',bubY); st.bubble2.setAttribute('opacity',bub2); st.bubble2.setAttribute('cy',bub2Y);
      st.ring.setAttribute('opacity',ringOp);
      st.ro.setAttribute('opacity',roOp); st.roT.textContent=(roOp?roVal:0).toFixed(3)+' g';
      setView(st,zoom,L0+tp+shift);
      st.cap.textContent=ph.cap(st);
    }
    if(reduce||st.over){ frame(total-0.01); st.cap.textContent=st.over?'This draw does not fit in one syringe.':'Pull past the '+st.uTxt+' mark, push back to it; the scale must read '+st.gTxt+'.'; return }
    var t0=null; function tick(ts){ if(t0===null) t0=ts; var t=(ts-t0)/1000; frame(Math.min(t,total-0.001)); if(t<total) st.raf=requestAnimationFrame(tick); else st.raf=0 }
    st.raf=requestAnimationFrame(tick);
  }
  /* opts: {g: grams to draw, syringe: 1|0.5|0.3 (mL), liquid: 'dose'|'water', name: vial label, doseTxt: e.g. '4 mg'} */
  window.syringeAnim=function(el,opts){ if(!el) return null; var o=opts||{}; if(!(o.g>0)){ el.innerHTML=''; el.__syr=null; return null }
    var st=el.__syr; var U=Math.round((o.syringe||1)*100);
    if(!st||st.U!==U||st.liquid!==(o.liquid||'dose')||st.name!==(o.name||'')){ st=build(el,o); st.liquid=o.liquid||'dose'; st.name=o.name||'' }
    if(st.g!==o.g||st.doseTxt!==(o.doseTxt||'')) apply(st,o); return st };
})();
