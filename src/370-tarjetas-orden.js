/* ---------- Tarjetas: orden, tamaño y configuración ---------- */
const LKEY=KEY+'-layout';
const DEFW={resumen:{rf:7,rk:5,r1:8,r2:4,r3:4,r4:4,ins:4,dga:12,r6:7,r7:5,r5:12,mg:12,rm:12,ra:12},mes:{mk:12,cie:12,tcm:12,mc1:4,mc2:4,mc3:4,hm1:8,ing:4,pre:7,dg:5,sem:12,ant:12,eur:4,fij:4,hor:4,bbva:4,bcp:4,oh:4,c4:4,c5:4,c6:4,c7:4,c8:4,aho:7,inv:5}};
const TYPES={r1:['bar','line'],r2:['line','bar'],r3:['bar','line'],r4:['doughnut','pie'],r5:['line','bar'],r7:['line','bar'],mc1:['doughnut','pie'],mc2:['bar','line'],mc3:['bar','doughnut']};
const TNAME={bar:'Barras',line:'Líneas',doughnut:'Dona',pie:'Torta'};
const CNAME={ins:'En resumen',mg:'Metas de ahorro',rk:'Indicadores',r1:'Ingreso, gastado y ahorrado',r2:'Ahorro sobre el ingreso',r3:'Gastos cotidianos por mes',r4:'En qué se fue el año',r6:'A dónde fue tu ingreso',r7:'Capital acumulado',r5:'Año contra año',rf:'Fondo de emergencia',rm:'Meses',ra:'Ajustes',mk:'Indicadores',mc1:'Distribución del mes',mc2:'Contra el mes anterior',mc3:'Saldo por cuenta',tcm:'Tipo de cambio del mes',hm1:'Gasto por día',ing:'Ingresos',liq:'Liquidez',pre:'Presupuesto',eur:'Apuntes',fij:'Gastos fijos',hor:'Gastos cotidianos',bbva:'BBVA',bcp:'BCP',oh:'oh!',aho:'Ahorros',inv:'Inversiones'};
const WOPT=[[3,'1/4 de ancho'],[4,'1/3 de ancho'],[6,'1/2 de ancho'],[8,'2/3 de ancho'],[9,'3/4 de ancho'],[12,'Ancho completo']];
const HOPT=[[0,'Automático'],[160,'Compacto'],[240,'Normal'],[340,'Alto'],[460,'Muy alto']];
/* El diseño también llega de un respaldo o de la nube: se valida como los datos (ids simples, ancho numérico, moneda conocida). */
function saneLay(x){
  const out={};if(!isObj(x))return out;
  Object.keys(x).forEach(g=>{const v=x[g];if(g==='__proto__'||!isObj(v)){if(g!=='__proto__'&&!isObj(v))out[g]=(typeof v==='number'||typeof v==='boolean')?v:undefined;if(out[g]===undefined)delete out[g];return;}
    const o=Object.assign({},v);o.order=Array.isArray(v.order)?v.order.filter(s=>typeof s==='string'&&/^[a-z0-9_-]{1,24}$/i.test(s)):[];
    const c={};if(isObj(v.c))Object.keys(v.c).forEach(id=>{if(!/^[a-z0-9_-]{1,24}$/i.test(id)||!isObj(v.c[id]))return;const e=Object.assign({},v.c[id]);
      if('cur' in e&&e.cur!=='S/'&&e.cur!=='$'&&e.cur!=='€')delete e.cur;if('w' in e&&!(Number.isInteger(+e.w)&&+e.w>=1&&+e.w<=12))delete e.w;else if('w' in e)e.w=+e.w;
      if('ty' in e&&(typeof e.ty!=='string'||!/^[a-z0-9_-]{1,24}$/i.test(e.ty)))delete e.ty;c[id]=e;});
    o.c=c;out[g]=o;});
  return out;
}
let LAY={};try{LAY=saneLay(JSON.parse(localStorage.getItem(LKEY)));}catch(e){LAY={};}
const localLay=()=>{try{localStorage.setItem(LKEY,JSON.stringify(LAY));}catch(e){}};
const saveLay=()=>{localLay();queueSync();};
const grp=()=>(view==='resumen'||view==='ajustes')?'resumen':'mes';
const PM=()=>({k:'q',rows:[['Necesidades','var(--c-fij)','need','max'],['Deseos','var(--c-hor)','want','max'],['Ahorro e inversión','var(--c-aho)','ai','min']]});
const SECS=['ing','liq','fij','hor','bbva','bcp','oh','c4','c5','c6','c7','c8','aho','inv'];
const L=()=>LAY[grp()]||(LAY[grp()]={order:[],c:{}});
const cs=id=>L().c[id]||(L().c[id]={});
const cwid=id=>(L().c[id]||{}).w||DEFW[grp()][id]||12;
const ctype=(id,def)=>{const t=(L().c[id]||{}).ty;return (TYPES[id]||[]).indexOf(t)>=0?t:def;};
let edit=false;

function applyLayout(){
  const board=document.getElementById('board');if(!board)return;
  const l=L(),cards=[].slice.call(board.querySelectorAll('.bcard')),order=l.order||[];
  const idx=c=>{const i=order.indexOf(c.dataset.cid);return i<0?1e6+cards.indexOf(c):i;};
  cards.slice().sort((a,b)=>idx(a)-idx(b)).forEach(c=>board.appendChild(c));
  cards.forEach(c=>{
    const id=c.dataset.cid,s=l.c[id]||{},w=cwid(id);
    if(s.del){c.remove();return;}
    c.style.setProperty('--w',w);c.classList.toggle('w-s',w<6);
    c.hidden=!!s.hide;
    if(s.h){c.dataset.h='1';c.style.setProperty('--bh',s.h+'px');}else{delete c.dataset.h;c.style.removeProperty('--bh');}
    if(s.t){const t=c.querySelector('.fold-t')||c.querySelector('.ttl');if(t)t.textContent=s.t;}
    if(edit){
      const tb=document.createElement('div');tb.className='ctb';
      tb.innerHTML=`<button type="button" class="gh" data-drag="1" aria-label="Mover ${esc(CNAME[id]||id)}" title="Arrastra para mover">⠿</button><button type="button" data-cfgcard="${id}" aria-label="Configurar ${esc(CNAME[id]||id)}" title="Configurar">⚙</button>`;
      c.appendChild(tb);
      const rz=document.createElement('div');rz.className='rz';rz.dataset.rz='1';rz.title='Arrastra para cambiar el tamaño';c.appendChild(rz);
    }
  });
  board.classList.toggle('editing',edit);
}
function editBar(){
  const hid=Object.keys(L().c).filter(k=>L().c[k].hide&&!L().c[k].del),gone=Object.keys(L().c).filter(k=>L().c[k].del);
  return `<div class="ebar"><div style="min-width:0"><b>Modo personalizar</b><div class="ms">Arrastra con ⠿, tira de la esquina para cambiar el tamaño o abre ⚙ para configurar cada tarjeta. Aplica a ${view==='resumen'?'el resumen':'todos los meses'}.</div>${hid.length?`<div class="chips"><span class="ms">Ocultas:</span>${hid.map(k=>`<span class="chip">${esc(CNAME[k]||k)}<button type="button" data-show="${k}" aria-label="Mostrar ${esc(CNAME[k]||k)}">+</button></span>`).join('')}</div>`:''}${gone.length?`<div class="chips"><span class="ms">Eliminadas:</span>${gone.map(k=>`<span class="chip">${esc(CNAME[k]||k)}<button type="button" data-undel="${k}" aria-label="Recuperar ${esc(CNAME[k]||k)}">↺</button></span>`).join('')}</div>`:''}</div><div class="pills"><button class="b" id="lreset" type="button">Restablecer diseño</button><button class="b p" id="ldone" type="button">Listo</button></div></div>`;
}
function closePanel(){const p=document.getElementById('cpanel');if(p)p.remove();}
function openPanel(id,btn){
  closePanel();
  const s=cs(id),c=btn.closest('.bcard'),ttl=c&&c.querySelector('.ttl'),tys=TYPES[id],w=cwid(id);
  const wo=WOPT.some(o=>o[0]===w)?WOPT:WOPT.concat([[w,w+'/12 de ancho']]);
  const ho=(!s.h||HOPT.some(o=>o[0]===s.h))?HOPT:HOPT.concat([[s.h,s.h+' px']]);
  const p=document.createElement('div');p.id='cpanel';p.className='cpanel';p.dataset.id=id;p.setAttribute('role','dialog');p.setAttribute('aria-label','Configurar tarjeta');
  p.innerHTML=`<div class="cph"><b>${esc(CNAME[id]||id)}</b><button type="button" data-pc="close" aria-label="Cerrar">×</button></div>
  <label>Ancho<select data-pf="w">${wo.map(o=>`<option value="${o[0]}"${o[0]===w?' selected':''}>${o[1]}</option>`).join('')}</select></label>
  <label>Alto<select data-pf="h">${ho.map(o=>`<option value="${o[0]}"${o[0]===(s.h||0)?' selected':''}>${o[1]}</option>`).join('')}</select></label>
  ${ttl?`<label>Título<input type="text" data-pf="t" value="${esc(s.t||origText(ttl))}"></label>`:''}
  ${SECS.indexOf(id)>=0?`<label>Moneda<select data-pf="cur">${['S/','€','$'].map(c=>`<option value="${c}"${curOf(id)===c?' selected':''}>${c}</option>`).join('')}</select></label><div class="ms">Los indicadores se convierten a soles con el tipo de cambio de Ajustes.</div>`:''}
  ${tys?`<label>Tipo de gráfico<select data-pf="ty">${tys.map(t=>`<option value="${t}"${ctype(id,tys[0])===t?' selected':''}>${TNAME[t]}</option>`).join('')}</select></label>`:''}
  <div class="cpb"><button class="b" type="button" data-pc="hide">Ocultar</button><button class="b" type="button" data-pc="reset">Restablecer</button><button class="b" type="button" data-pc="del">Eliminar</button></div><div class="ms">Eliminar quita la tarjeta del tablero. Tus datos no se borran y puedes recuperarla arriba, en Eliminadas.</div>`;
  document.body.appendChild(p);
  const r=btn.getBoundingClientRect(),pw=Math.min(268,innerWidth-16);
  p.style.width=pw+'px';p.style.left=Math.max(8,Math.min(r.right-pw,innerWidth-pw-8))+'px';
  p.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-p.offsetHeight-8))+'px';
}
function track(e,onMove,onEnd){
  const mv=ev=>{if(ev.pointerId===e.pointerId)onMove(ev);};
  const up=ev=>{if(ev.pointerId!==e.pointerId)return;removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);onEnd();};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);
}
function startDrag(e,c,board){
  c.classList.add('dragging');
  track(e,ev=>{
    if(ev.clientY<90)scrollBy(0,-14);else if(ev.clientY>innerHeight-90)scrollBy(0,14);
    const over=document.elementsFromPoint(ev.clientX,ev.clientY).find(x=>x.classList&&x.classList.contains('bcard')&&x!==c&&!x.hidden);
    if(!over)return;
    const rc=over.getBoundingClientRect(),bw=board.getBoundingClientRect().width;
    const before=rc.width<bw*.9?(ev.clientX<rc.left+rc.width/2):(ev.clientY<rc.top+rc.height/2);
    if(before){if(over.previousElementSibling!==c)board.insertBefore(c,over);}
    else if(over.nextElementSibling!==c)board.insertBefore(c,over.nextSibling);
  },()=>{
    c.classList.remove('dragging');
    L().order=[].slice.call(board.querySelectorAll('.bcard')).map(x=>x.dataset.cid);saveLay();
  });
}
function startResize(e,c,board){
  const id=c.dataset.cid,w0=cwid(id),h0=c.getBoundingClientRect().height,colW=(board.getBoundingClientRect().width+16)/12;
  track(e,ev=>{
    if(innerWidth>680){const w=Math.max(2,Math.min(12,Math.round(w0+(ev.clientX-e.clientX)/colW)));cs(id).w=w;c.style.setProperty('--w',w);c.classList.toggle('w-s',w<6);}
    const dy=ev.clientY-e.clientY;
    if(Math.abs(dy)>12||cs(id).h){const h=Math.max(120,Math.min(900,Math.round(h0+dy)));cs(id).h=h;c.dataset.h='1';c.style.setProperty('--bh',h+'px');}
  },()=>{saveLay();});
}

