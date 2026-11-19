/* ===== Animated draw: a U-100 insulin syringe filling from an inverted vial to the grams the user chose,
   with a zoom onto the unit mark once the dose is set ===== */
(function(){
  'use strict';
  var NS='http://www.w3.org/2000/svg';
  var VW=260, VH=450;                       // scene, drawn upright
  var SW=480, SH=146, SY=50;                // shown lying flat: translate(0 260) rotate(-90) maps (x,y) -> (y, 260-x); the picture is cropped to y 50..196
  var L0=206, LEN=180, CX=130;              // barrel top (needle end), barrel length, centre x
  var BX=116, BW=28;                        // barrel left, width
  var EXT=22;                               // plain barrel past the last mark, where a real syringe prints its size
  var ROD=190;                              // plunger rod; the thumb rest sits at its end
  function clamp(t){ return Math.max(0,Math.min(1,t)) }
  function easeIO(t){ t=clamp(t); return t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2 }   // quartic in-out: soft start and stop
  function easeOut(t){ t=clamp(t); return 1-Math.pow(1-t,3) }
  function mk(tag,attrs,parent){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e }
  function txt(e,s){ e.textContent=s; return e }
  function tpos(e,x,y){ e.setAttribute('x',x); e.setAttribute('y',y); e.setAttribute('transform','rotate(90 '+x+' '+y+')'); return e }
  function ht(attrs,parent,s){ var e=mk('text',attrs,parent); tpos(e,attrs.x,attrs.y); return txt(e,s) }
  function grad(defs,id,stops,vertical){ var g=mk('linearGradient',{id:id,x1:'0',x2:vertical?'0':'1',y1:'0',y2:vertical?'1':'0'},defs); stops.forEach(function(s){ mk('stop',{offset:s[0],'stop-color':s[1],'stop-opacity':s[2]==null?1:s[2]},g) }); return g }
  // phases: k = kind, d = seconds, zoom > 1 zooms on the target mark. Built per play, because the dose and the water draw differ:
  // the dose vents the vial with a plungerless syringe; the water draw puts air into the water vial first. Both overdraw and push back.
  function phases(st){ var n=0; var over=st.overU>st.units+2.5; var ph=[];
    var SLOW=2.4; var step=function(d,zoom,capFn){ ph.push({d:d*SLOW, zoom:zoom, cap:capFn}) };
    var plain=function(d,zoom,capFn){ ph.push({d:d*SLOW, zoom:zoom, cap:capFn}) };
    plain(1.0,1,function(s){ return (s.liquid==='water'?'Water to draw: ':'Your dose: ')+(s.doseTxt?s.doseTxt+' = ':'')+s.uTxt+' units = '+s.gTxt+'.' }); ph[ph.length-1].k='intro';
    if(st.liquid==='water'){
      step(1.6,1,function(s){ return 'Air first: pull the plunger back to the '+s.uTxt+' mark.' }); ph[ph.length-1].k='air';
      step(2.0,1,function(){ return 'Needle through the water vial’s stopper. Push the air in: it replaces the water you take, so no vacuum forms.' }); ph[ph.length-1].k='in-air';
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
    step(2.6,1,function(s){ return s.liquid==='water'?'Pull the needle out of the BAC water vial. You have '+s.gTxt+' of water. Inject it into the peptide vial.':'Needle out, vent needle out. Lay the syringe on the tared scale: it should read '+s.gTxt+'.' }); ph[ph.length-1].k='weigh';
    return ph }
  /* the vial label, in the style of the product label: dark header with the mark and wordmark, holographic body, product name,
     a pill, a details line, a decorative (non-scanning) QR and a dark footer. Drawn in flat coordinates: the group undoes the scene rotation. */
  function vialLabel(vial,defs,o){ var lab=mk('g',{class:'syr-label',transform:'rotate(90) translate(0 -260)'},vial); var LX=22, LY=110, LW=94, LH=40;
    grad(defs,'syr-holo',[[0,'#f3d6ff'],[.28,'#d6f1ff'],[.55,'#fff4c4'],[.8,'#d4ffe6'],[1,'#f0d8ff']]);
    mk('rect',{x:LX,y:LY,width:LW,height:LH,rx:3,fill:'url(#syr-holo)',stroke:'#0B1F1E','stroke-width':'.7'},lab);
    mk('path',{d:'M'+(LX+3)+' '+LY+' H'+(LX+LW-3)+' Q'+(LX+LW)+' '+LY+' '+(LX+LW)+' '+(LY+3)+' V'+(LY+9.5)+' H'+LX+' V'+(LY+3)+' Q'+LX+' '+LY+' '+(LX+3)+' '+LY+' Z',fill:'#0B1F1E'},lab);
    mk('path',{d:'M'+LX+' '+(LY+LH-4)+' H'+(LX+LW)+' V'+(LY+LH-3)+' Q'+(LX+LW)+' '+(LY+LH)+' '+(LX+LW-3)+' '+(LY+LH)+' H'+(LX+3)+' Q'+LX+' '+(LY+LH)+' '+LX+' '+(LY+LH-3)+' Z',fill:'#0B1F1E'},lab);
    if(window.QB_MARK){ var mg=mk('g',{transform:'translate('+(LX+2.4)+' '+(LY+1.4)+') scale(0.068)'},lab); try{ mg.innerHTML=window.QB_MARK; var ns=mg.querySelector('svg'); if(ns){ ns.setAttribute('width','100'); ns.setAttribute('height','100') } }catch(e){} }
    var wm=txt(mk('text',{x:LX+10.5,y:LY+7,'font-size':'5.4','font-weight':'800',fill:'#fff','letter-spacing':'.14em','font-family':'var(--display, inherit)'},lab),''); var t1=mk('tspan',{},wm); t1.textContent='QUAD'; var t2=mk('tspan',{fill:'#4FC8BB'},wm); t2.textContent='BIO';
    var water=o.liquid==='water'; var nm=water?'BAC WATER':(o.name||''); if(!water){ var pl=window.PEP_LABEL&&window.PEP_LABEL[nm]; if(pl) nm=pl.split(' (')[0]; nm=nm.slice(0,12) }
    txt(mk('text',{x:LX+4,y:LY+23.5,'font-size':nm.length>8?'8.5':'12','font-weight':'800',fill:'#0B1F1E','letter-spacing':'-.02em','font-family':'var(--display, inherit)'},lab),nm);
    var pill=water?'10 mL':(o.mg?o.mg+' MG':'RUO'); mk('rect',{x:LX+4,y:LY+26.5,width:22,height:7.5,rx:1.6,fill:'#0E6F68'},lab); txt(mk('text',{x:LX+15,y:LY+32,'text-anchor':'middle','font-size':'5.2','font-weight':'800',fill:'#fff','font-family':'var(--display, inherit)'},lab),pill);
    txt(mk('text',{x:LX+29,y:LY+32,'font-size':'3.6','font-weight':'700',fill:'#0B1F1E','letter-spacing':'.04em'},lab),water?'0.9% BENZYL ALCOHOL':'\u226598% PURITY');
    // a QR-looking square that encodes nothing: three finder squares and a fixed pattern of modules
    var QX=LX+LW-22, QY=LY+12, M=2; mk('rect',{x:QX-1,y:QY-1,width:9*M+2,height:9*M+2,fill:'#fff'},lab);
    var pat=['1111111001','1000001010','1011101000','1011101011','1011101000','1000001010','1111111001','0000000011','1010101001','0110010111']; // 10x10 module map
    for(var r=0;r<9;r++) for(var c=0;c<9;c++){ var on=pat[r].charAt(c)==='1'; if(on) mk('rect',{x:QX+c*M,y:QY+r*M,width:M,height:M,fill:'#0B1F1E'},lab) }
    txt(mk('text',{x:QX+9,y:QY+9*M+4,'text-anchor':'middle','font-size':'3',fill:'#0B1F1E','font-weight':'700','letter-spacing':'.06em'},lab),'COA');
    return lab }
  function build(el,o){
    el.innerHTML=''; el.classList.add('syr-wrap');
    var U=Math.round((o.syringe||1)*100); var pxu=LEN/U;
    var svg=mk('svg',{viewBox:'0 '+SY+' '+SW+' '+SH,class:'syr-svg',role:'img','aria-label':'How the syringe fills to the chosen dose'},el);
    var defs=mk('defs',{},svg);
    var scene=mk('g',{transform:'translate(0 '+VW+') rotate(-90)'},svg);
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
    var vial=mk('g',{class:'syr-vial',filter:'url(#syr-shadow)'},scene);
    mk('path',{d:'M93 30 Q93 16 107 16 H153 Q167 16 167 30 V116 Q167 128 156 132 L151 135 V146 H109 V135 L104 132 Q93 128 93 116 Z',fill:'url(#syr-vglass)',stroke:'#8c9ba6','stroke-width':'1'},vial);
    var vLiq=mk('rect',{x:95,y:72,width:70,height:44,fill:'url(#syr-vliq)',opacity:'.92'},vial);
    mk('rect',{x:109,y:130,width:42,height:16,fill:'url(#syr-vliq)',opacity:'.85'},vial);
    mk('path',{d:'M93 30 Q93 16 107 16 H153 Q167 16 167 30 V116 Q167 128 156 132 L151 135 V146 H109 V135 L104 132 Q93 128 93 116 Z',fill:'url(#syr-vglass)',opacity:'.35'},vial);
    mk('rect',{x:103,y:28,width:5,height:84,rx:2.5,fill:'#fff',opacity:'.55'},vial);
    mk('rect',{x:104,y:146,width:52,height:15,rx:2,fill:'url(#syr-alu)',stroke:'#7d8990','stroke-width':'.8'},vial);
    for(var kx=108;kx<156;kx+=4) mk('line',{x1:kx,y1:148,x2:kx,y2:159,stroke:'#6f7b83','stroke-width':'.5',opacity:'.5'},vial);
    mk('circle',{cx:130,cy:161,r:9.5,fill:'#5b666f'},vial); mk('circle',{cx:130,cy:161,r:6,fill:'#434d55'},vial);
    vialLabel(vial,defs,o);
    // ---- syringe (group translates for in/out of the stopper)
    var syr=mk('g',{class:'syr-body',filter:'url(#syr-shadow)'},scene);
    mk('line',{x1:CX,y1:148,x2:CX,y2:196,stroke:'#8a949b','stroke-width':'1.3'},syr);
    mk('path',{d:'M'+(CX-0.65)+' 148 L'+CX+' 145.5 L'+(CX+0.65)+' 148 Z',fill:'#8a949b'},syr);
    mk('path',{d:'M126 196 L134 196 L137 206 L123 206 Z',fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.7'},syr);
    var liqG=mk('g',{'clip-path':'url(#syr-barrelclip)'},syr);
    var liq=mk('rect',{x:BX,y:L0,width:BW,height:0,fill:'url(#syr-liq)'},liqG);
    var men=mk('path',{d:'',fill:lq[0],opacity:'.9'},liqG);
    mk('rect',{x:BX,y:L0,width:BW,height:LEN+EXT,rx:2,fill:'url(#syr-glass)',opacity:'.55'},syr);
    mk('rect',{x:BX+BW-7,y:L0+2,width:3,height:LEN+EXT-4,rx:1.5,fill:'#fff',opacity:'.6'},syr);
    mk('rect',{x:BX,y:L0,width:BW,height:LEN+EXT,rx:2,fill:'none',stroke:'#8d9aa3','stroke-width':'1.1'},syr);
    mk('rect',{x:104,y:L0+LEN+EXT-1,width:52,height:7,rx:3,fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.7'},syr);
    // the scale is printed on the glass (see printOn below, drawn last so it sits over the liquid, the stopper and the rod)
    // plunger: flat-faced rubber stopper whose needle-side edge sits exactly on the mark (that is where a dose is read), rod with ridges, thumb pad
    var stopG=mk('g',{},syr);
    var stopTip=mk('path',{d:'',fill:'#2b3238'},stopG);
    var stop=mk('rect',{x:BX+1.2,y:L0,width:BW-2.4,height:10,rx:1.2,fill:'url(#syr-rubber)'},stopG);
    var stopHi=mk('rect',{x:BX+5,y:L0+1.5,width:2.4,height:7,rx:1.2,fill:'#fff',opacity:'.22'},stopG);
    var rod=mk('rect',{x:CX-5.5,y:L0,width:11,height:ROD,fill:'url(#syr-rod)',stroke:'#9aa6ae','stroke-width':'.7'},syr);
    var rodL=mk('line',{x1:CX,y1:L0,x2:CX,y2:L0+ROD,stroke:'#aeb9c0','stroke-width':'.8'},syr);
    var thumb=mk('rect',{x:CX-19,y:L0+ROD+6,width:38,height:8,rx:3,fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.7'},syr);
    var bubble=mk('circle',{cx:CX-5,cy:L0+40,r:2.1,fill:'#fff',stroke:'#9ccaff','stroke-width':'.6',opacity:'0'},syr);
    var bubble2=mk('circle',{cx:CX+6,cy:L0+40,r:1.3,fill:'#fff',stroke:'#9ccaff','stroke-width':'.5',opacity:'0'},syr);
    var print=mk('g',{class:'syr-print'},syr); var minor=U>=100?2:1, major=U>=100?10:5, mid=U>=100?5:0;
    for(var u=0;u<=U;u+=minor){ var y=L0+u*pxu, big=u%major===0, md=mid&&u%mid===0; mk('line',{x1:BX+BW-(big?11:md?7:4.5),y1:y,x2:BX+BW,y2:y,stroke:'#141a1e','stroke-width':big?'1.1':'.7',opacity:big?'.95':'.7'},print); if(big&&u>0) ht({x:BX+2.5,y:y,'text-anchor':'middle','font-size':'7.2','font-weight':'800',fill:'#141a1e','font-family':'var(--mono, ui-monospace, monospace)'},print,String(u)) }
    var sz=(o.syringe||1); ht({x:BX+BW/2+6,y:L0+LEN+EXT/2,'text-anchor':'middle','font-size':'6.4','font-weight':'800',fill:'#141a1e'},print,sz+' mL'); ht({x:BX+BW/2-4,y:L0+LEN+EXT/2,'text-anchor':'middle','font-size':'5.4','font-weight':'700',fill:'#141a1e'},print,U+' I.U.');
    // vent: a second syringe barrel with no plunger, standing in the edge of the stopper (dose mode only)
    var vent=mk('g',{class:'syr-vent',opacity:'0'},scene);
    var ventIn=mk('g',{transform:'rotate(-14 150 150)'},vent);
    mk('line',{x1:150,y1:150,x2:150,y2:178,stroke:'#8a949b','stroke-width':'1.2'},ventIn);
    mk('path',{d:'M147.5 178 L152.5 178 L154 185 L146 185 Z',fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.6'},ventIn);
    mk('rect',{x:142,y:185,width:16,height:46,rx:1.5,fill:'url(#syr-glass)',opacity:'.6',stroke:'#8d9aa3','stroke-width':'.9'},ventIn);
    mk('rect',{x:134,y:229,width:32,height:4.5,rx:2,fill:'url(#syr-flange)',stroke:'#98a5ae','stroke-width':'.6'},ventIn);
    ht({x:176,y:214,'font-size':'6.5',fill:'#a9b8c6'},vent,'vent: no plunger');
    // target mark
    var tgt=mk('g',{class:'syr-target'},syr);
    var tLine=mk('line',{x1:96,y1:L0,x2:BX+BW+1,y2:L0,stroke:'var(--accent, #0E6F68)','stroke-width':'1.4','stroke-dasharray':'3 2'},tgt);
    var tG=ht({x:88,y:L0,'text-anchor':'middle','font-size':'9.5','font-weight':'700',fill:'var(--accent, #0E6F68)','font-family':'var(--mono, ui-monospace, monospace)'},tgt,'');
    var tU=ht({x:80,y:L0,'text-anchor':'middle','font-size':'7.6',fill:'#a9b8c6'},tgt,'');
    var ring=mk('circle',{cx:BX,cy:L0,r:9,fill:'none',stroke:'var(--accent, #0E6F68)','stroke-width':'1.2',opacity:'0'},tgt);
    // readout
    var ro=mk('g',{class:'syr-readout',opacity:'0'},scene);
    mk('rect',{x:164,y:300,width:38,height:130,rx:4,fill:'#0B1F1E',stroke:'rgba(155,232,223,.35)','stroke-width':'.8'},ro);
    var roT=ht({x:181,y:365,'text-anchor':'middle','font-size':'14','font-weight':'700',fill:'#9BE8DF','font-family':'var(--mono, ui-monospace, monospace)'},ro,'0.000 g');
    ht({x:168,y:365,'text-anchor':'middle','font-size':'7',fill:'#a9b8c6'},ro,'scale, tared on the bare syringe');
    var cap=document.createElement('p'); cap.className='syr-cap'; el.appendChild(cap);
    var row=document.createElement('div'); row.className='syr-row'; row.innerHTML='<button type="button" class="syr-step syr-prev" aria-label="Previous step">\u2039</button><span class="syr-steplab">Step 1</span><button type="button" class="syr-step syr-next" aria-label="Next step">\u203a</button><button type="button" class="syr-replay">Replay</button><span class="syr-note"></span>'; el.appendChild(row);
    var st={el:el, svg:svg, U:U, pxu:pxu, vLiq:vLiq, syr:syr, vent:vent, liq:liq, men:men, stop:stop, stopTip:stopTip, stopHi:stopHi, rod:rod, rodL:rodL, thumb:thumb, bubble:bubble, bubble2:bubble2, tLine:tLine, tG:tG, tU:tU, ring:ring, ro:ro, roT:roT, cap:cap, note:row.querySelector('.syr-note'), stepLab:row.querySelector('.syr-steplab'), raf:0, pi:0, n:1};
    row.querySelector('.syr-replay').addEventListener('click',function(){ play(st,0) });
    row.querySelector('.syr-prev').addEventListener('click',function(){ play(st,Math.max(0,(st.pi||0)-1)) });
    row.querySelector('.syr-next').addEventListener('click',function(){ play(st,Math.min((st.n||1)-1,(st.pi||0)+1)) });
    el.__syr=st; return st;
  }
  function setPlunger(st,px){ var y=L0+px; st.stop.setAttribute('y',y); st.stopHi.setAttribute('y',y+1.5); st.stopTip.setAttribute('d',''); st.rod.setAttribute('y',y+10); st.rodL.setAttribute('y1',y+10); st.rodL.setAttribute('y2',y+10+ROD); st.thumb.setAttribute('y',y+10+ROD-4) }
  function setLiquid(st,px){ px=Math.max(0,px); st.liq.setAttribute('height',px); var y=L0+px; st.men.setAttribute('d',px>0.5?'M'+BX+' '+(y-2.2)+' Q'+CX+' '+(y+1.2)+' '+(BX+BW)+' '+(y-2.2)+' L'+(BX+BW)+' '+y+' L'+BX+' '+y+' Z':'') }
  function setView(st,z,cy,padEnd){ // the picture widens (same aspect) when the thumb rest would leave it; zoom z about the target mark at x = cy, y = 260 - CX
    var w0=Math.max(SW,(padEnd||0)+12), h0=SH*w0/SW, y0=SY-(h0-SH)/2;
    if(z<=1.001){ st.svg.setAttribute('viewBox','0 '+y0.toFixed(2)+' '+w0.toFixed(2)+' '+h0.toFixed(2)); return }
    var w=w0/z, h=h0/z; var x=Math.max(0,Math.min(w0-w,cy-w/2)); var y=Math.max(y0,Math.min(y0+h0-h,(VW-CX+15)-h*0.5)); st.svg.setAttribute('viewBox',x.toFixed(2)+' '+y.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)) }
  function apply(st,o){
    st.g=o.g; st.units=o.g*100; st.gTxt=st.liquid==='water'?o.g.toFixed(2).replace(/0$/,'')+' mL':o.g.toFixed(3)+' g'; st.uTxt=(Math.round(st.units*10)/10).toString().replace(/\.0$/,''); st.doseTxt=o.doseTxt||'';
    st.over=st.units>st.U+1e-6; var px=Math.min(st.U,st.units)*st.pxu; st.tpx=px;
    var step=st.U>=100?10:5; st.overU=Math.min(st.U, Math.ceil((st.units+15)/step)*step); st.overTxt=String(st.overU); st.opx=Math.min(st.U,st.overU)*st.pxu;
    st.tLine.setAttribute('y1',L0+px); st.tLine.setAttribute('y2',L0+px); tpos(st.tG,88,L0+px); tpos(st.tU,80,L0+px); st.ring.setAttribute('cy',L0+px);
    st.tG.textContent=st.gTxt; st.tU.textContent=st.uTxt+' units';
    st.note.textContent=st.over?'More than this syringe holds ('+st.U+' units = '+(st.U/100).toFixed(1)+' mL). Use a bigger syringe or less water next time.':(st.liquid==='water'?'Pull slowly to the mark.':'Pull to the mark, then let the scale decide.');
    play(st) }
  function play(st,from){
    if(st.raf) cancelAnimationFrame(st.raf); st.raf=0;
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var PH=phases(st); var tp=st.tpx, op=st.opx; var total=0, starts=PH.map(function(p){ var s=total; total+=p.d; return s });
    var IN=28; // how far the syringe sits below the stopper before the needle goes in
    function frame(t){
      var pi=PH.length-1; for(var i=0;i<PH.length;i++){ if(t<starts[i]+PH[i].d){ pi=i; break } }
      var ph=PH[pi], k=ph.k, p=clamp((t-starts[pi])/ph.d); st.pi=pi; st.n=PH.length; if(st.stepLab) st.stepLab.textContent='Step '+(pi+1)+' of '+PH.length;
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
      if(st.liquid==='water'){ ventOp=0; roOp=0 }
      st.syr.setAttribute('transform','translate(0 '+shift.toFixed(2)+')');
      st.vent.setAttribute('opacity',ventOp.toFixed(2)); st.vent.setAttribute('transform','translate(0 '+ventY.toFixed(2)+')');
      setPlunger(st,plunger); setLiquid(st,liquid);
      st.vLiq.setAttribute('y',116-vialLevel); st.vLiq.setAttribute('height',vialLevel);
      st.bubble.setAttribute('opacity',bub); st.bubble.setAttribute('cy',bubY); st.bubble2.setAttribute('opacity',bub2); st.bubble2.setAttribute('cy',bub2Y);
      st.ring.setAttribute('opacity',ringOp);
      st.ro.setAttribute('opacity',roOp); st.roT.textContent=(roOp?roVal:0).toFixed(3)+' g';
      setView(st,zoom,L0+tp+shift,L0+plunger+10+ROD+4+shift);
      st.cap.textContent=ph.cap(st);
    }
    if(reduce||st.over){ frame(total-0.01); st.cap.textContent=st.over?'This draw does not fit in one syringe.':(st.liquid==='water'?'Pull past the '+st.uTxt+' mark, push back to it: '+st.gTxt+'.':'Pull past the '+st.uTxt+' mark, push back to it; the scale must read '+st.gTxt+'.'); return }
    var tStart=starts[Math.max(0,Math.min(PH.length-1,from||0))]||0; var t0=null; function tick(ts){ if(t0===null) t0=ts; var t=tStart+(ts-t0)/1000; frame(Math.min(t,total-0.001)); if(t<total) st.raf=requestAnimationFrame(tick); else st.raf=0 }
    st.raf=requestAnimationFrame(tick);
  }
  /* opts: {g: grams to draw, syringe: 1|0.5|0.3 (mL), liquid: 'dose'|'water', name: vial label, doseTxt: e.g. '4 mg'} */
  window.syringeAnim=function(el,opts){ if(!el) return null; var o=opts||{}; if(!(o.g>0)){ el.innerHTML=''; el.__syr=null; return null }
    var st=el.__syr; var U=Math.round((o.syringe||1)*100);
    if(!st||st.U!==U||st.liquid!==(o.liquid||'dose')||st.name!==(o.name||'')||st.mg!==(o.mg||'')){ st=build(el,o); st.liquid=o.liquid||'dose'; st.name=o.name||''; st.mg=o.mg||'' }
    if(st.g!==o.g||st.doseTxt!==(o.doseTxt||'')) apply(st,o); return st };
})();
