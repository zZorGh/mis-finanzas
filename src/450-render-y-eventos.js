/* ---------- Render y eventos ---------- */
/* Celular: barra inferior fija. «Mes» abre el mes que estás viendo o, si no, el mes actual. */
function bnavHtml(){
  const mi=typeof view==='number'?view:limaD().getMonth();
  const it=(href,on,svg,txt)=>`<a href="${href}"${on?' aria-current="page"':''}>${svg}<span>${txt}</span></a>`;
  return it('#'+SLUG[mi],typeof view==='number','<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>','Mes')+it('#resumen',view==='resumen','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>','Resumen')+'<span class="bgap" aria-hidden="true"></span><button type="button" data-bnrep="1"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 3.5h7l4 4V20.5H7z\"/><path d=\"M14 3.5v4h4M10 13h5M10 16.5h5\"/></svg><span>Reportes</span></button>'+it('#ajustes',view==='ajustes','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>','Ajustes');
}
/* Atajos dentro del mes (solo celular): llevan a cada parte sin cambiar la ruta. */
/* Pestañas del mes (solo en celular, <900 px; en escritorio se ven todas las tarjetas como siempre).
   La pestaña activa se recuerda (KEY+'-tab'); «Todo» muestra la pantalla larga de antes. Cada tarjeta se asigna a su pestaña en tagMes(). */
const MTABS=[['resumen','Resumen'],['mov','Movimientos'],['tar','Tarjetas'],['aho','Ahorro'],['ana','Análisis'],['todo','Todo']];
const TABMAP={mk:'resumen',cie:'resumen',pre:'resumen',dg:'resumen',sem:'resumen',ant:'resumen',ing:'mov',fij:'mov',hor:'mov',bbva:'tar',bcp:'tar',oh:'tar',c4:'tar',c5:'tar',c6:'tar',c7:'tar',c8:'tar',aho:'aho',inv:'aho',mc1:'ana',mc2:'ana',mc3:'ana',hm1:'ana',tcm:'ana',eur:'ana'};
let mesTab=(()=>{try{const v=localStorage.getItem(KEY+'-tab');return MTABS.some(x=>x[0]===v)?v:'resumen';}catch(e){return'resumen';}})();
function mtabsHtml(){return '<div id="mtabs0"></div><nav class="mtabs" id="mtabs" aria-label="Secciones del mes">'+MTABS.map(x=>'<button type="button" data-mtab="'+x[0]+'"'+(x[0]===mesTab?' aria-current="true"':'')+'>'+x[1]+'</button>').join('')+'</nav>';}
function tagMes(ap){
  if(typeof view!=='number'){delete ap.dataset.mtab;return;}
  ap.dataset.mtab=mesTab;
  ap.querySelectorAll('.bcard[data-cid]').forEach(c=>{const g=TABMAP[c.dataset.cid];if(g)c.dataset.t=g;});
  ap.querySelectorAll('.ppcard').forEach(c=>{c.dataset.t='resumen';});
}
function setMesTab(id){
  if(!MTABS.some(x=>x[0]===id))return;mesTab=id;try{localStorage.setItem(KEY+'-tab',id);}catch(e){}
  const ap=document.getElementById('app');if(ap&&typeof view==='number')ap.dataset.mtab=id;
  document.querySelectorAll('#mtabs [data-mtab]').forEach(b=>{if(b.dataset.mtab===id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
  const s0=document.getElementById('mtabs0');if(s0){const hh=(document.getElementById('hdr')||{}).offsetHeight||0,y=s0.getBoundingClientRect().top+scrollY-hh;if(scrollY>y)scrollTo(0,Math.max(0,y));}
  try{window.dispatchEvent(new Event('resize'));}catch(e){}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-mtab]');if(b)setMesTab(b.dataset.mtab);});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-bnrep]'))openReport();});
/* Foco: al redibujar la pantalla (tema, idioma, estilo, opciones de un diálogo) el elemento enfocado se destruía
   y el foco caía al inicio de la página. Se recuerda por id o por su atributo data-* y se devuelve al nuevo elemento. */
function focusKey(el){
  if(!el||el===document.body||!el.closest||!/^(BUTTON|A|SELECT|SUMMARY)$/.test(el.tagName))return null;
  if(!(el.closest('#hdr')||el.closest('#app')||el.closest('#sheet')))return null;
  if(el.id)return '#'+(window.CSS&&CSS.escape?CSS.escape(el.id):el.id);
  for(const a of el.attributes){if(a.name.indexOf('data-')===0&&a.value!=='')return el.tagName.toLowerCase()+'['+a.name+'="'+String(a.value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"]';}
  return null;
}
function restoreFocus(k){
  try{if(document.activeElement&&document.activeElement!==document.body&&document.body.contains(document.activeElement))return;
    const e=document.querySelector(k);if(e)e.focus({preventScroll:true});}catch(x){}
}
/* Si dibujar falla (datos raros que se colaron), se ofrece rescatar los datos en vez de dejar la pantalla en blanco. */
function crashScreen(err){
  const ap=document.getElementById('app');if(!ap)return;
  ap.innerHTML='<section class="card" style="max-width:560px;margin:24px auto"><div class="cb"><h2 class="ttl">No pude mostrar tus datos</h2><p class="ms">Tus datos siguen guardados en este dispositivo. Descárgalos para no perderlos y luego empieza de cero, o escríbenos para ayudarte a recuperarlos.</p><div class="qa"><button class="b p" type="button" data-crash="export">Descargar mis datos</button><button class="b" type="button" data-crash="reset">Empezar de cero</button></div></div></section>';
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-crash]');if(!b)return;
  if(b.dataset.crash==='export'){try{const raw=localStorage.getItem(KEY)||'{}';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.download='misoles-respaldo-de-rescate.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}catch(x){}}
  else if(confirm('Se borrarán los datos de este dispositivo. ¿Continuar?')){try{localStorage.removeItem(KEY);}catch(x){}location.reload();}});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-skip]')){const a=document.getElementById('app');if(a){a.setAttribute('tabindex','-1');a.focus();}}});
function render(){const fk=focusKey(document.activeElement);try{render0();}catch(err){try{console.error(err);}catch(x){}crashScreen(err);}if(fk)restoreFocus(fk);}
function render0(){passBegin();try{render1();}finally{passEnd();}}
function render1(){
  if(cfg.ahoV!==3)migrateAho();
  killCharts();
  document.body.classList.toggle('edit',edit);
  document.getElementById('hdr').innerHTML=header();{const bn=document.getElementById('bnav');if(bn)bn.innerHTML=bnavHtml();}
  const ap=document.getElementById('app');ap.dataset.v=view==='capturar'?'c':view==='resumen'?'r':view==='ajustes'?'a':'m';
  ap.innerHTML=(view==='capturar'?viewCapturar():view==='ajustes'?viewAjustes():(edit?editBar():'')+(view==='resumen'?viewResumen():viewMes(view)));
  tagMes(ap);
  updateChip();
  applyLayout();
  if(pf){const el=document.getElementById(pf[0]+'-'+pf[1]+'-'+pf[2]);pf=null;if(el)el.focus();}
  if(view==='resumen')drawResumen();else if(typeof view==='number')refreshMonth(true);
  {const fh=histV!=='ajustes';histV=view;if(document.getElementById('hist'))loadHist(fh);}
  const cur=document.querySelector('.tab[aria-current]');if(cur&&cur.scrollIntoView)cur.scrollIntoView({inline:'center',block:'nearest'});
}
document.addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('[data-goto]');if(g)location.hash='#'+g.dataset.goto;});
const SKINS=['original','cuadre','escalon'];
function setSkin(s){if(SKINS.indexOf(s)<0)s='cuadre';document.documentElement.dataset.skin=s;['cuadre','escalon'].forEach(k=>{const e=document.getElementById('sk-'+k);if(e)e.disabled=(k!==s);});try{localStorage.setItem(KEY+'-skin',s);}catch(x){}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-skin-set]');if(!b)return;setSkin(b.dataset.skinSet);render();});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cieir],[data-ciex]');if(!b)return;const k=b.dataset.cieir||b.dataset.ciex;try{localStorage.setItem(KEY+'-cierre',k);}catch(err){}
  if(b.dataset.ciex){const c=b.closest('.ciebar');if(c)c.remove();return;}
  const [y,i]=k.split('-');track('atajo','cierre');year=y;if(location.hash==='#'+SLUG[+i])render();else location.hash=SLUG[+i];window.scrollTo(0,0);});
document.addEventListener('click',e=>{const x=e.target.closest&&e.target.closest('[data-avx]');if(!x)return;try{localStorage.setItem(KEY+'-avisos',todayStr());}catch(err){}const c=x.closest('.avcard');if(c)c.remove();});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-tema-set]');if(!b)return;const v=b.dataset.temaSet,root=document.documentElement;try{if(v==='sys'){delete root.dataset.theme;localStorage.removeItem(KEY+'-tema');}else{root.dataset.theme=v;localStorage.setItem(KEY+'-tema',v);}}catch(x){}render();});
const app=document.getElementById('app'),hdr=document.getElementById('hdr');
try{new ResizeObserver(()=>document.documentElement.style.setProperty('--hh',hdr.offsetHeight+'px')).observe(hdr);}catch(e){}
/* Los montos muy largos (millones) se achican para caber en su caja en vez de cortarse o empujar la página. */
function fitNums(){document.querySelectorAll('.kv,.hero-v,.cap-big').forEach(e=>{e.style.fontSize='';if(!e.clientWidth||getComputedStyle(e).display==='inline')return;let s=parseFloat(getComputedStyle(e).fontSize);const min=Math.max(11,s*.45);let g=0;while(e.scrollWidth>e.clientWidth+1&&s>min&&g++<60){s-=1;e.style.fontSize=s+'px';}});}
function syncBar(){try{let m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m);}let c=getComputedStyle(hdr).backgroundColor;if(!c||/rgba\(0, 0, 0, 0\)|transparent/.test(c))c=getComputedStyle(document.body).backgroundColor;m.content=c;}catch(x){}}
let FT=0;const fitSoon=()=>{cancelAnimationFrame(FT);FT=requestAnimationFrame(()=>{fitNums();syncBar();hmInk();});};
new MutationObserver(fitSoon).observe(app,{childList:true,subtree:true,characterData:true});
new MutationObserver(fitSoon).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
addEventListener('resize',fitSoon);try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',fitSoon);}catch(x){}
hdr.addEventListener('change',e=>{if(e.target.id==='yr'){year=e.target.value;render();}});
hdr.addEventListener('click',e=>{const cl=e.target.closest&&e.target.closest('.caplink');if(cl&&view!=='capturar'&&matchMedia('(min-width:900px) and (pointer:fine)').matches){e.preventDefault();openSheet(true);sheetFrom=cl;return;}if(e.target.id==='aj'){location.hash='#ajustes';return;}if(e.target.id==='syn'){if(sync.state==='saving'||sync.state==='loading')return;if(sync.state==='conflict'){toast(sync.msg);}else if(sync.dirty||sync.state==='dirty'){pushNow(false);}else{loadFromSheet();}return;}if(e.target.id==='ed'){edit=!edit;if(!edit)closePanel();render();return;}if(e.target.id==='th'){
  const root=document.documentElement,dark=root.dataset.theme==='dark'||(!root.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme=dark?'light':'dark';try{localStorage.setItem(KEY+'-tema',root.dataset.theme);}catch(x){}
  render();}});
app.addEventListener('input',e=>{
  const save=saveSoon;
  const t=e.target,d=t.dataset;
  if(d.gs==='id'){sync.id=sheetId(t.value);sync.tabs=false;persistSync();return;}
  if(d.cfg){cfg[d.cfg]=parseFloat(t.value)||0;save();return;}
  if(d.cortedia!==undefined){const v=Math.round(parseFloat(t.value));cfg.corteDia=Object.assign({},cfg.corteDia);if(v>=1&&v<=31)cfg.corteDia[d.cortedia]=v;else delete cfg.corteDia[d.cortedia];save();if(typeof view==='number')refreshMonth(false);return;}
  if(d.pagodia!==undefined){const v=Math.round(parseFloat(t.value));cfg.pagoDia=Object.assign({},cfg.pagoDia);if(v>=1&&v<=31)cfg.pagoDia[d.pagodia]=v;else delete cfg.pagoDia[d.pagodia];save();if(typeof view==='number')refreshMonth(false);return;}
  if(d.credito!==undefined){if(!cfg.credito)cfg.credito={bbva:0,bcp:0,oh:0};cfg.credito[d.credito]=parseFloat(t.value)||0;save();if(typeof view==='number')refreshMonth(false);return;}
  if(d.tc){cfg.tc[d.tc]=parseFloat(t.value)||0;cfg.tcDate=new Date().toLocaleDateString((LANG==='en'?'en-US':'es-PE'));save();return;}
  if(d.tcm&&typeof view==='number'){const mm=S[year][view],v=parseFloat(t.value);mm.tc=mm.tc||{};if(v>0)mm.tc[d.tcm]=v;else delete mm.tc[d.tcm];if(!(+mm.tc['$']||+mm.tc['€']))delete mm.tc;else{mm.tc.s='Manual';mm.tc.f=fxToday();delete mm.tc.c;}save();refreshMonth(false);return;}
  if(d.ec!==undefined){cfg.eurCols[+d.ec]=t.value;save();return;}
  if(typeof view!=='number')return;
  const m=S[year][view];
  if(d.copen!==undefined){if(!m.copen)m.copen={};m.copen[d.copen]=parseFloat(t.value)||0;save();refreshMonth(false);return;}
  if(d.nota){m.nota=t.value;save();return;}
  if(d.p!==undefined){const k=PM().k;if(!m.q)m.q=[50,30,20];m[k][+d.p]=parseFloat(t.value)||0;save();refreshMonth(false);return;}
  if(d.s){const r=m[d.s][+d.i];const wasM=d.k==='m';r[d.k]=(d.s==='eur'||d.k==='m')?(parseFloat(t.value)||0):t.value;if(wasM&&r.src)reconcile(m,r,d.s);if(d.s==='aho'&&wasM){if((m.aho||[]).some(x=>+x.m))delete m.az;else m.az=1;}save();refreshMonth(false);}
});
app.addEventListener('change',e=>{if(e.target.id==='bk-file'){const f=e.target.files&&e.target.files[0];if(f){const r=new FileReader();r.onload=()=>restoreFrom(String(r.result));r.onerror=()=>bkMsg('No pude leer el archivo.',true);r.readAsText(f);}e.target.value='';return;}if(e.target.dataset.cfgt){cfg[e.target.dataset.cfgt]=e.target.value;save();render();return;}if(e.target.dataset.gs==='auto'){sync.auto=e.target.checked;persistSync();if(sync.auto&&sync.dirty&&sync.ready)queueSync();return;}if(e.target.dataset.gs==='id'){e.target.value=sync.id;return;}if(e.target.dataset.fx==='auto'){cfg.tcAuto=e.target.checked;save();if(cfg.tcAuto)fxUpdate(true);return;}if(e.target.dataset.tcm){return;}if(e.target.dataset.cfg||e.target.dataset.tc){if(PTRBTN&&Date.now()-PTRBTN<600)setTimeout(render,450);else setTimeout(()=>{const a=document.activeElement;if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)&&app.contains(a)){NEEDR=1;return;}render();},0);}});
let NEEDR=0;document.addEventListener('focusout',e=>{if(!NEEDR)return;setTimeout(()=>{const a=document.activeElement;if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)&&app.contains(a))return;if(PTRBTN&&Date.now()-PTRBTN<600)return;NEEDR=0;render();},0);});
let PTRBTN=0;document.addEventListener('pointerdown',e=>{PTRBTN=e.target.closest&&e.target.closest('button,[data-act],[data-s]')?Date.now():0;},true);
app.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.fold!==undefined){FOLD[d.fold]=!isFold(d.fold);try{localStorage.setItem(FOLDK,JSON.stringify(FOLD));}catch(x){}const c=b.closest('.bcard'),bd=c&&c.querySelector('.sbody');if(bd)bd.hidden=isFold(d.fold);b.setAttribute('aria-expanded',String(!isFold(d.fold)));return;}
  if(d.act==='new'){openSheet(true);return;}
  if(d.act==='pagar'){openSheet();ent.t='pago';ent.card=d.card;const cc=curOf(d.card);if(cc!==curOf('fij'))ent.cur=cc;presetSrc();const st=stmtNow(d.card,year,view),dbt=st?st.due:cardEnding(year,view,d.card),sa=document.getElementById('sa');if(dbt>0&&sa)sa.value=dbt.toFixed(2);syncSheet();if(sa){sa.focus();try{sa.select();}catch(e){}}return;}
  if(d.new!==undefined){const k=d.new,card=CARD_ALL.includes(k);openSheet(true);ent.t=card?'compra':k;ent.lock=ent.t;if(card)ent.card=k;presetSrc();syncSheet();return;}
  if(d.edit!==undefined){openEdit(d.edit,+d.i);return;}
  if(d.capedit!==undefined){const a=d.capedit.split(':');openEdit(a[0],+a[1]);return;}
  if(d.capdel!==undefined){const a=d.capdel.split(':'),mi=(year===String(now.getFullYear()))?now.getMonth():0;delMov(S[year][mi],a[0],+a[1]);save();render();toast('Movimiento borrado');return;}
  if(d.act==='atasa'){const w=b.closest('.aa-t'),tz=tasaOf(d.acct);if(w){w.innerHTML='<div class="aa-te"><select class="aa-ts" aria-label="Tipo de tasa"><option value="TREA"'+(tz&&tz.t==='TEA'?'':' selected')+'>TREA</option><option value="TEA"'+(tz&&tz.t==='TEA'?' selected':'')+'>TEA</option></select><input class="aa-tv" type="text" inputmode="decimal" placeholder="Tasa anual %" value="'+(tz?esc(tz.v):'')+'" data-acct="'+esc(d.acct)+'" aria-label="Tasa anual en porcentaje"><button type="button" class="b p" data-act="atasasave" data-acct="'+esc(d.acct)+'">Guardar</button>'+(tz?'<button type="button" class="b" data-act="atasadel" data-acct="'+esc(d.acct)+'">Quitar</button>':'')+'</div><div class="ms aa-th">La TREA ya incluye comisiones y es la que mejor mide lo que ganas. Usa la TEA solo si tu banco no te muestra la TREA.</div>';const i=w.querySelector('input');i.focus();i.select();}return;}
  if(d.act==='atasasave'){const w=b.closest('.aa-t');saveTasa(d.acct,w.querySelector('.aa-ts').value,w.querySelector('.aa-tv').value);return;}
  if(d.act==='atasadel'){const k=String(d.acct).trim().toLowerCase();cfg.ahoTasa=Object.assign({},cfg.ahoTasa);delete cfg.ahoTasa[k];save();render();toast('Tasa quitada de '+d.acct);return;}
  if(d.act==='adel'){const nm=String(d.acct),yl=Object.keys(S).sort().pop(),a=ahoOf(yl,11,nm);
    if(a&&Math.abs(a.v)>=.005){toast(nm+' tiene '+fmt(a.v)+'. Retira o mueve ese dinero antes de quitarla.');return;}
    const prev=(cfg.ahoOcultas||[]).slice();cfg.ahoOcultas=prev.concat(nm.toLowerCase());save();render();
    toast('Cuenta quitada: '+nm,{fn:()=>{cfg.ahoOcultas=prev;}});return;}
  if(d.act==='aren'){const h=b.closest('.aa-h');if(h){h.innerHTML='<input class="aa-ren" type="text" value="'+esc(d.acct)+'" data-old="'+esc(d.acct)+'" aria-label="Nuevo nombre de la cuenta"><button type="button" class="b p" data-act="arensave" data-acct="'+esc(d.acct)+'">Guardar</button>';const i=h.querySelector('input');i.focus();i.select();}return;}
  if(d.act==='arensave'){const i=b.closest('.aa-h').querySelector('input');renameAho(d.acct,i?i.value:'');return;}
  if(d.act==='mover'){openSheet();ent.t='aho';ent.ax='mov';syncSheet();return;}
  if(d.act==='adep'||d.act==='aret'||d.act==='aadj'||d.act==='anew'){openSheet();ent.t='aho';ent.ax=d.act==='aret'?'ret':d.act==='adep'?'dep':'aj';ent.from=d.acct?'aho:'+d.acct:(d.act==='anew'?'aho:+':'');syncSheet();const sa=document.getElementById('sa');if(sa)sa.focus();return;}
  if(d.pay!==undefined){payRec(+d.pay);return;}
  if(d.vp!==undefined&&typeof view==='number'){const [ix,vv]=String(d.vp).split(':'),rw=S[year][view].hor[+ix];if(rw){const nv=+vv;if(rw.v===nv)delete rw.v;else rw.v=nv;save();render();}return;}
  if(d.act==='alta'){showOnboard(true);return;}
  if(d.act==='hist'){openHist(+d.i);return;}
  if(d.act==='cierre'){openCierre();return;}
  if(d.act==='liqedit'){liqEdit=!liqEdit;render();return;}
  if(d.act==='prev'){doPrev();return;}
  if(d.act==='rec'){doRec();return;}
  if(d.act==='rep'){openReport();return;}if(d.act==='cuad'){openCuadre();return;}
  if(d.recdel!==undefined){cfg.rec.splice(+d.recdel,1);save();render();return;}
  if(b.id==='rc-add'){const g=id=>document.getElementById(id),c=g('rc-c').value.trim(),m=parseMonto(g('rc-m').value);
    if(!c||!(m>0)){toast('Escribe el concepto y el monto del recurrente.');return;}
    cfg.rec=cfg.rec||[];cfg.rec.push({sec:g('rc-s').value,s:g('rc-s').value,c,m,k:g('rc-k').value,src:g('rc-src').value,f:Math.min(31,Math.max(1,+g('rc-d').value||1))});save();render();return;}
  if(b.id==='bk-json'){saveFile('mis-finanzas-copia-'+BK()+'.json',JSON.stringify({v:1,fecha:BK(),S,cfg,LAY},null,1)).then(()=>{const m=document.getElementById('bk-msg');if(m&&/^(Listo|Descargado|Done|Downloaded)/.test(m.textContent)){cfg.bkAt=Date.now();save();const a=document.getElementById('bk-age');if(a){const g=bkAge();a.textContent=g.txt;a.classList.toggle('bkw',g.warn);}}});return;}
  if(d.hist){if(d.hist==='ask')histAsk=d.hid;else if(d.hist==='no')histAsk=null;else if(d.hist==='mas')histOpen=!histOpen;else if(d.hist==='si'){histRestore(d.hid,b);return;}const h=document.getElementById('hist');if(h&&HC)h.innerHTML=histHtml(HC.l);return;}
  if(b.id==='bk-csv'){saveFile('mis-finanzas-movimientos-'+BK()+'.csv','\ufeff'+[REGHEAD].concat(toRows()).map(r=>r.map(csvCell).join(',')).join('\n'));return;}
  if(b.id==='bk-load'){document.getElementById('bk-file').click();return;}if(b.id==='imp-open'){document.getElementById('imp-file').click();return;}if(b.id==='imp-undo'){const u=impUltima();if(u&&confirm(T('¿Quitar los movimientos de la última importación? Los que editaste después se conservan.'))){const n=impQuitar(u.id);save();render();toast('Se quitaron '+n+' movimientos importados.');}return;}
  if(b.id==='nm-save'){const g=id=>document.getElementById(id);applyNames(liqNamesAll().map((_,j)=>g('nm-l'+j)?g('nm-l'+j).value:''),CARDS.map((_,j)=>g('nm-b'+j)?g('nm-b'+j).value:''));save();render();toast('Nombres guardados.');return;}
  if(b.id==='nm-addc'){const g=id=>document.getElementById(id),nm=g('nm-newc').value;if(CARDS.some(k=>BANKN[k].toLowerCase()===nm.trim().toLowerCase())){toast('Ya tienes una tarjeta con ese nombre.');return;}applyNames(liqNamesAll().map((_,j)=>g('nm-l'+j)?g('nm-l'+j).value:''),CARDS.map((_,j)=>g('nm-b'+j)?g('nm-b'+j).value:''));const k=cardAdd(nm);if(k){save();render();toast('Tarjeta agregada: '+BANKN[k]);}return;}
  if(b.dataset.cardrm){const k=b.dataset.cardrm;if(cardHas(k)){toast('Esta tarjeta tiene movimientos o deuda. Bórralos antes de quitarla.');return;}if(confirm(T('¿Quitar esta tarjeta? No tiene movimientos ni deuda.'))&&cardRm(k)){save();render();toast('Tarjeta quitada.');}return;}
  if(b.id==='nm-addl'){const g=id=>document.getElementById(id);const nm=g('nm-newl').value;applyNames(liqNamesAll().map((_,j)=>g('nm-l'+j)?g('nm-l'+j).value:''),CARDS.map((_,j)=>g('nm-b'+j)?g('nm-b'+j).value:''));if(liqAdd(nm)){save();render();toast('Cuenta agregada: '+(cfg.liqNames[cfg.liqNames.length-1]));}return;}
  if(b.dataset&&b.dataset.metasug){const a=avgGasto(),g=id=>document.getElementById(id);if(!g('mn').value.trim())g('mn').value=(cfg.metas&&cfg.metas[0])?cfg.metas[0].n:'Fondo de emergencia';g('mobj').value=Math.round(a*(+b.dataset.metasug));g('mobj').focus();return;}
  if(b.id==='sb-logout'){sbLogout();return;}if(b.id==='rec-on'){recActivar();return;}if(b.id==='rec-off'){recDesactivar();return;}if(b.id==='mfa-on'){showMfaEnroll();return;}if(b.id==='mfa-off'){showMfaOff();return;}
  if(b.id==='del-go'){sbDelete(b);return;}
  if(b.id==='fx-now'||b.id==='tcm-sunat'){fxUpdate(true);return;}
  if(b.id==='gs-load'){if((sync.dirty||sync.state==='conflict')&&!confirm(T('Tienes cambios en este dispositivo que todavía no se subieron. Si recargas, se reemplazan por los de tu cuenta. ¿Recargar igual?')))return;loadFromSheet();return;}
  if(b.id==='gs-push'){if(sync.state==='conflict'&&!confirm(T('Tu cuenta tiene cambios hechos desde otro dispositivo. Si guardas ahora, se reemplazan por los de aquí. ¿Guardar igual?')))return;pushNow(true);return;}
  if(d.cfgcard){openPanel(d.cfgcard,b);return;}
  if(d.show){cs(d.show).hide=false;saveLay();render();return;}
  if(d.undel){delete cs(d.undel).del;saveLay();render();return;}
  if(b.id==='ldone'){edit=false;closePanel();render();return;}
  if(b.id==='lreset'){delete LAY[grp()];saveLay();closePanel();render();return;}
  if(d.add&&typeof view==='number'){const arr=S[year][view][d.add];arr.push(d.add==='eur'?{a:0,b:0,d:0,s:0,p:0}:row());pf=[d.add,arr.length-1,d.add==='eur'?'a':'c'];save();render();}
  else if(d.del&&typeof view==='number'){delMov(S[year][view],d.del,+d.i);save();render();}
  else if(d.cat!==undefined){const nm0=cfg.cats[+d.cat];if(nm0&&catCuenta(nm0)>0){toast('Tiene movimientos. Para quitarla, únela con otra escribiendo su nombre.');return;}const nm=cfg.cats.splice(+d.cat,1)[0];if(nm&&cfg.catGrupo)delete cfg.catGrupo[nm.trim().toLowerCase()];save();render();}
  else if(b.id==='addcat'){const v=catNom(document.getElementById('nc').value);if(v&&catFind(v)){toast('Ya tienes esa categoría.');return;}if(v){cfg.cats.push(v);const gv=(document.getElementById('nc-g')||{}).value;if(gv&&gv!=='-'){cfg.catGrupo=cfg.catGrupo||{};cfg.catGrupo[v.toLowerCase()]=gv;}save();}render();}
  else if(b.id==='addmeta'){const n=document.getElementById('mn').value.trim(),o=parseFloat(document.getElementById('mobj').value)||0;if(!n){toast('Escribe el nombre de la meta.');return;}cfg.metas=cfg.metas||[];const ex=cfg.metas.find(x=>x.n.toLowerCase()===n.toLowerCase());if(ex){if(o>0){ex.o=o;save();render();toast('Objetivo actualizado.');}else toast('Ya existe esa meta. Escribe un objetivo para actualizarla.');return;}cfg.metas.push({n,o});save();render();}
  else if(d.metadel!==undefined){cfg.metas.splice(+d.metadel,1);save();render();return;}
  else if(b.id==='reset'){S=build();cfg=CFG0();save();render();}
});
app.addEventListener('keydown',e=>{const t=e.target;if(t.classList&&t.classList.contains('aa-tv')){if(e.key==='Enter'){e.preventDefault();saveTasa(t.dataset.acct,t.closest('.aa-t').querySelector('.aa-ts').value,t.value);}else if(e.key==='Escape'){e.preventDefault();render();}return;}
  if(!t.classList||!t.classList.contains('aa-ren'))return;if(e.key==='Enter'){e.preventDefault();renameAho(t.dataset.old,t.value);}else if(e.key==='Escape'){e.preventDefault();render();}});
app.addEventListener('submit',e=>{
  if(e.target.id!=='qa')return;e.preventDefault();
  const q=document.getElementById('qi'),r=quickAdd(q.value.trim());
  if(r.err){const m=document.getElementById('qm');m.textContent=r.err;m.className='qm err';return;}
  save();render();toast('Guardado: '+r.ok,r.u);
});
app.addEventListener('keydown',e=>{
  const t=e.target;if(e.key!=='Enter'||e.isComposing||t.tagName!=='INPUT'||!t.dataset||!t.dataset.s||typeof view!=='number')return;
  if(t.dataset.k==='c'){const row=t.closest('.rw'),ins=row?[...row.querySelectorAll('input')]:[],nx=ins[ins.indexOf(t)+1];if(nx){e.preventDefault();nx.focus();if(nx.select)nx.select();}return;}
  if(t.dataset.k!=='m'&&t.dataset.k!=='f')return;
  e.preventDefault();const sc=t.dataset.s,i=+t.dataset.i,arr=S[year][view][sc];
  if(i>=arr.length-1){arr.push(row());pf=[sc,arr.length-1,'c'];save();render();}
  else{const nx=document.getElementById(sc+'-'+(i+1)+'-c');if(nx)nx.focus();}
});
app.addEventListener('pointerdown',e=>{
  if(!edit||(e.pointerType==='mouse'&&e.button!==0))return;
  const g=e.target.closest('[data-drag]'),r=e.target.closest('[data-rz]');if(!g&&!r)return;
  const c=e.target.closest('.bcard'),board=document.getElementById('board');if(!c||!board)return;
  e.preventDefault();closePanel();
  if(g)startDrag(e,c,board);else startResize(e,c,board);
});
document.addEventListener('click',e=>{
  const p=document.getElementById('cpanel');if(!p)return;
  const pc=e.target.closest('[data-pc]');
  if(pc&&p.contains(pc)){
    const id=p.dataset.id,k=pc.dataset.pc;
    if(k==='hide'){cs(id).hide=true;saveLay();closePanel();render();}
    else if(k==='reset'){delete L().c[id];saveLay();closePanel();render();}
    else if(k==='del'){
      if(pc.dataset.arm){cs(id).del=true;saveLay();closePanel();render();}
      else{pc.dataset.arm='1';pc.textContent='Confirmar eliminar';pc.classList.add('danger');}
    }
    else closePanel();
    return;
  }
  if(!p.contains(e.target)&&!e.target.closest('[data-cfgcard]'))closePanel();
});
function panelField(e,live){
  const t=e.target,p=document.getElementById('cpanel');
  if(!p||!p.contains(t)||!t.dataset.pf)return;
  const id=p.dataset.id,k=t.dataset.pf,s=cs(id);
  if(k==='t'){
    if(!live)return;
    s.t=t.value.trim()||undefined;saveLay();
    const el=document.querySelector('.bcard[data-cid="'+id+'"] .ttl');if(el)el.textContent=s.t||CNAME[id]||'';
    return;
  }
  if(live)return;
  if(k==='w')s.w=+t.value;
  else if(k==='h'){if(+t.value)s.h=+t.value;else delete s.h;}
  else if(k==='ty')s.ty=t.value;
  else if(k==='cur'){if(t.value==='S/')delete s.cur;else s.cur=t.value;}
  saveLay();render();
}
document.addEventListener('input',e=>panelField(e,true));
document.addEventListener('change',e=>panelField(e,false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();});
/* Atajos de teclado. Los de una sola tecla se pueden apagar en Ajustes (accesibilidad, WCAG 2.1.4). Preferencia del dispositivo. */
function openAtajos(){
  closeSheet();closePanel();sheetFrom=document.activeElement;
  const bg=document.createElement('div');bg.id='sheetbg';bg.className='sheetbg';
  const sh=document.createElement('div');sh.id='sheet';sh.className='sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Atajos de teclado');
  const filas=[['N','Registrar un movimiento'],['← →','Mes anterior o siguiente'],['R','Ir al resumen del año'],['?','Ver estos atajos'],['Esc','Cerrar la ventana'],['Ctrl + Enter','Guardar al registrar'],['Ctrl + Z','Deshacer lo último']];
  sh.innerHTML='<div class="sh-h"><b>Atajos de teclado</b><button type="button" data-s="close" aria-label="Cerrar">×</button></div><dl class="atk">'+filas.map(f=>'<div><dt><kbd>'+f[0]+'</kbd></dt><dd>'+f[1]+'</dd></div>').join('')+'</dl><div class="ms">Puedes apagarlos en Ajustes.</div>';
  document.body.append(bg,sh);sh.querySelector('button').focus();
  bg.addEventListener('click',closeSheet);sh.addEventListener('click',e=>{if(e.target.closest('[data-s="close"]'))closeSheet();});
  sh.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
}
document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!atajosOn())return;
  const t=e.target;if(t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"],[role=radiogroup],[role=tablist],[role=listbox],[role=slider]'))return;
  if(document.querySelector('#sheet,#cpanel,.authbg,#onbg,#impbg,#tabwarn'))return;
  const k=e.key;
  if(k==='n'||k==='N'){if(e.repeat)return;e.preventDefault();openSheet(true);const c=document.querySelector('.caplink');if(c)sheetFrom=c;}
  else if(k==='r'||k==='R'){if(e.repeat)return;e.preventDefault();location.hash='resumen';}
  else if((k==='ArrowLeft'||k==='ArrowRight')&&!e.shiftKey&&typeof view==='number'){const j=view+(k==='ArrowRight'?1:-1);if(j>=0&&j<12){e.preventDefault();location.hash=SLUG[j];}}
  else if(k==='?'){e.preventDefault();openAtajos();}
});
window.addEventListener('hashchange',()=>{const comp=location.hash==='#compartido';closePanel();if(document.getElementById('sheet'))closeSheet();parseHash();render();window.scrollTo(0,0);if(comp&&(!IS_SB||sbUser))shareAbrir();});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',render);}catch(e){}
try{const th=localStorage.getItem(KEY+'-tema');if(th==='dark'||th==='light')document.documentElement.dataset.theme=th;}catch(e){}
if(window.Chart){Chart.defaults.font.family=getComputedStyle(document.body).fontFamily;}
render();
initSync();initDl();if(!IS_SB)shareAbrir();
if(!IS_SB&&!IS_GAS)fxAuto();
if('serviceWorker' in navigator && !(window.claude&&window.claude.use) && !IS_GAS){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
})();
