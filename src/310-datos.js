/* ---------- Datos de entrada: se normalizan antes de usarlos ----------
   Lo que llega de localStorage, de un respaldo .json o de la nube puede venir dañado o manipulado.
   saneS/saneCfg fuerzan tipos y estructura (números finitos, textos, 12 meses por año, monedas válidas),
   así que un respaldo «casi válido» ya no deja la pantalla en blanco ni mete valores raros en el HTML. */
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const fin=v=>{const n=+v;return Number.isFinite(n)?n:0;};
const sStr=v=>typeof v==='string'?v:(typeof v==='number'&&Number.isFinite(v)?String(v):'');
const SECS9=['liq','ing','fij','hor','bbva','bcp','oh','aho','inv'];
function saneRow(r){
  if(!isObj(r))return null;
  const o={};
  Object.keys(r).forEach(k=>{const v=r[k];
    if(k==='__proto__'||k==='constructor'||k==='prototype')return;
    if(k==='m')o.m=fin(v);
    else if(k==='_d'){if(typeof v==='number'&&Number.isFinite(v))o._d=v;}
    else if(k==='cur'){if(['S/','$','€'].indexOf(v)>=0)o.cur=v;}
    else if(typeof v==='string'||typeof v==='boolean')o[k]=v;
    else if(typeof v==='number'&&Number.isFinite(v))o[k]=v;});
  if(!('m' in o))o.m=0;
  ['c','f','k'].forEach(k=>{if(typeof o[k]!=='string')o[k]=sStr(o[k]);});
  return o;
}
const saneRows=(a,mk)=>{const o=Array.isArray(a)?a.map(saneRow).filter(Boolean):[];return o.length?o:mk();};
const saneEur=a=>{const o=(Array.isArray(a)?a:[]).filter(isObj).map(r=>({a:fin(r.a),b:fin(r.b),d:fin(r.d),s:fin(r.s),p:fin(r.p)}));return o.length?o:[{a:0,b:0,d:0,s:0,p:0}];};
const sane3=(a,d)=>(Array.isArray(a)&&a.length>=3)?[fin(a[0]),fin(a[1]),fin(a[2])]:d.slice();
function saneMonth(m){
  if(!isObj(m))return blank();
  const o={};
  SECS9.forEach(k=>{o[k]=saneRows(m[k],k==='liq'?()=>LIQ():()=>[row()]);});
  CARD_X.forEach(k=>{if(Array.isArray(m[k]))o[k]=saneRows(m[k],()=>[row()]);});
  o.eur=saneEur(m.eur);o.p=sane3(m.p,[50,30,20]);o.q=sane3(m.q,[50,30,20]);
  o.nota=typeof m.nota==='string'?m.nota:'';
  o.tot=false;
  if(isObj(m.tot)){const t={};Object.keys(m.tot).forEach(k=>{if(k!=='__proto__'&&Number.isFinite(+m.tot[k]))t[k]=+m.tot[k];});o.tot=t;}
  if(isObj(m.tc)){const t={};['$','€'].forEach(c=>{const v=+m.tc[c];if(Number.isFinite(v)&&v>0)t[c]=v;});
    ['s','f'].forEach(k=>{if(typeof m.tc[k]==='string')t[k]=m.tc[k];});
    if(m.tc.c!=null&&typeof m.tc.c!=='object')t.c=m.tc.c;
    if(Object.keys(t).length)o.tc=t;}
  if(isObj(m.copen)){const t={};CARD_ALL.forEach(k=>{const v=+m.copen[k];if(Number.isFinite(v))t[k]=v;});o.copen=t;}
  if(m.az)o.az=1;
  if(Array.isArray(m.lb))o.lb=m.lb.slice(0,40).map(b=>Array.isArray(b)?[String(b[0]).slice(0,60),fin(b[1])]:null);else if(isObj(m.lb))o.lb={x:1};
  return o;
}
function saneS(s0){
  const o={};
  if(isObj(s0))Object.keys(s0).forEach(y=>{if(!/^\d{4}$/.test(y))return;const a=Array.isArray(s0[y])?s0[y]:[];o[y]=Array.from({length:12},(_,i)=>saneMonth(a[i]));});
  return o;
}
function saneCfg(c0){
  const d=CFG0(),c=isObj(c0)?c0:{},o={};
  Object.keys(c).forEach(k=>{if(k!=='__proto__'&&k!=='constructor'&&k!=='prototype')o[k]=c[k];});
  Object.keys(d).forEach(k=>{const dv=d[k],v=o[k];
    if(Array.isArray(dv)){if(!Array.isArray(v))o[k]=dv;}
    else if(isObj(dv)){if(!isObj(v))o[k]=dv;}
    else if(typeof dv==='number'){const n=(v===null||v===''||typeof v==='boolean')?NaN:+v;o[k]=Number.isFinite(n)?n:dv;}
    else if(typeof dv==='string'){if(typeof v!=='string')o[k]=dv;}});
  const pos=(v,dflt)=>{const n=+v;return Number.isFinite(n)&&n>0?n:dflt;};
  o.tc=Object.assign({},o.tc,{'€':pos(o.tc['€'],4.1),'$':pos(o.tc['$'],3.4)});
  o.eurCols=[0,1,2,3].map(i=>typeof o.eurCols[i]==='string'?o.eurCols[i]:d.eurCols[i]);
  o.cats=o.cats.filter(x=>typeof x==='string');
  if(['ask','auto','manual'].indexOf(o.modoReg)<0)o.modoReg='ask';
  {const cg={};if(isObj(o.catGrupo))Object.keys(o.catGrupo).forEach(k=>{const v=o.catGrupo[k];if(k!=='__proto__'&&['need','want','ai','-'].indexOf(v)>=0)cg[String(k).trim().toLowerCase()]=v;});o.catGrupo=cg;}
  if('liqNames' in o){o.liqNames=Array.isArray(o.liqNames)?o.liqNames.filter(s=>typeof s==='string').map(s=>s.trim().replace(/\s+/g,' ').slice(0,28)).slice(0,8):[];if(!o.liqNames.length||o.liqNames.some(s=>!s))delete o.liqNames;}
  if('bancos' in o){if(isObj(o.bancos)){const b={};['bbva','bcp','oh'].forEach(k=>{if(typeof o.bancos[k]==='string'){const n=o.bancos[k].replace(/[<>"'`]/g,'').trim().replace(/\s+/g,' ').slice(0,28);if(n)b[k]=n;}});o.bancos=b;}else delete o.bancos;}
  const cr0=o.credito;o.credito={bbva:fin(cr0.bbva),bcp:fin(cr0.bcp),oh:fin(cr0.oh)};CARD_X.forEach(k=>{if(cr0[k]!=null)o.credito[k]=fin(cr0[k]);});
  if('tarjetasX' in o){const vis={},dia=v=>+v>=1&&+v<=31?Math.round(+v):0;o.tarjetasX=(Array.isArray(o.tarjetasX)?o.tarjetasX:[]).filter(x=>isObj(x)&&CARD_X.includes(x.k)&&!vis[x.k]&&(vis[x.k]=1)).map(x=>({k:x.k,n:String(x.n||'').replace(/[<>"'`]/g,'').trim().replace(/\s+/g,' ').slice(0,28)||('Tarjeta '+(CARD_ALL.indexOf(x.k)+1)),l:Math.max(0,fin(x.l)),cd:dia(x.cd),pd:dia(x.pd)}));}
  /* La tasa de ahorro llega a la pantalla: solo un tipo conocido y un número (un respaldo manipulado podía colar código aquí). */
  if('ahoTasa' in o){const t={};if(isObj(o.ahoTasa))Object.keys(o.ahoTasa).forEach(k=>{const x=o.ahoTasa[k],v=isObj(x)?+x.v:NaN;if(k!=='__proto__'&&Number.isFinite(v)&&v>0&&v<=1000)t[String(k).trim().toLowerCase()]={t:x.t==='TEA'?'TEA':'TREA',v};});o.ahoTasa=t;}
  if('tarjetasD' in o&&!isObj(o.tarjetasD))delete o.tarjetasD;
  o.metas=o.metas.filter(isObj).map(g=>Object.assign({},g,{n:sStr(g.n),o:fin(g.o)}));
  /* El día de un recurrente es un número de 1 a 31; cualquier otra cosa se descarta (se muestra en Ajustes). */
  o.rec=o.rec.map(saneRow).filter(Boolean).map(r=>{const n=parseInt(r.f,10);r.f=(String(n)===String(r.f).trim()&&n>=1&&n<=31)?r.f:'';return r;});
  if(isObj(o.pagoDia)){const p={};Object.keys(o.pagoDia).forEach(k=>{if(k!=='__proto__'&&Number.isFinite(+o.pagoDia[k]))p[k]=+o.pagoDia[k];});o.pagoDia=p;}
  if(isObj(o.corteDia)){const p={};Object.keys(o.corteDia).forEach(k=>{if(k!=='__proto__'&&CARD_ALL.includes(k)&&+o.corteDia[k]>=1&&+o.corteDia[k]<=31)p[k]=Math.round(+o.corteDia[k]);});o.corteDia=p;}else if('corteDia' in o)delete o.corteDia;
  if('tcLast' in o){if(isObj(o.tcLast)){const t=o.tcLast;o.tcLast=Object.assign({},t,{usd:fin(t.usd),s:sStr(t.s),f:sStr(t.f)});if('eur' in t)o.tcLast.eur=fin(t.eur);}else delete o.tcLast;}
  ['titular','fondoMes','tcDate'].forEach(k=>{if(typeof o[k]!=='string')o[k]='';});
  o.monedas=['$','€'].filter(m=>o.monedas.indexOf(m)>=0);delete o.monedaAlt;o.bloquearNeg=o.bloquearNeg===true;
  return o;
}

/* Monto escrito por una persona: acepta «1,200», «1.200», «1,234.50», «1.234,50», «12,5», «S/ 12.50».
   Devuelve NaN si no es un número claro (letras, dos decimales, notación científica, Infinity, más de mil millones). */
function parseMonto(v){
  const t=String(v==null?'':v).trim().replace(/^(s\/\.?|\$|€|usd|pen|eur)\s*/i,'').replace(/\s+/g,'');
  if(!/^[\d.,]+$/.test(t)||!/\d/.test(t))return NaN;
  const lc=t.lastIndexOf(','),ld=t.lastIndexOf('.');
  let n;
  if(lc>=0&&ld>=0){
    const dec=lc>ld?',':'.',mil=dec===','?'.':',';
    if(t.split(dec).length!==2)return NaN;
    const ent=t.split(dec)[0];
    if(ent.split(mil).some((g,i)=>i>0?g.length!==3:g.length<1||g.length>3))return NaN;
    n=t.split(mil).join('').replace(dec,'.');
  }else if(lc>=0||ld>=0){
    const s=lc>=0?',':'.',p=t.split(s);
    if(p.length>2){if(p[0].length<1||p[0].length>3||!p.slice(1).every(x=>x.length===3))return NaN;n=p.join('');}
    else if(p[1].length===3&&p[0].length>=1&&p[0].length<=3&&p[0]!=='0')n=p[0]+p[1];
    else n=(p[0]||'0')+'.'+p[1];
  }else n=t;
  const x=parseFloat(n);
  return Number.isFinite(x)&&x>=0&&x<=1e9?x:NaN;
}
let S=build(),cfg=CFG0();
try{const raw=localStorage.getItem(KEY);if(raw){const j=JSON.parse(raw);if(j&&j.v===1&&j.S&&j.cfg){S=saneS(j.S);cfg=saneCfg(j.cfg);if(cfg.pv!==2){cfg.pmode='c';cfg.pv=2;}}}}catch(e){}
{const B0=build();YEARS.forEach(y=>{if(!S[y])S[y]=B0[y];});['Deseo','Necesidad'].forEach(c=>{if(cfg.cats.indexOf(c)<0)cfg.cats.unshift(c);});}
/* Guardado local. Si el almacenamiento está lleno: primero se libera la copia diaria local y se reintenta;
   si aun así no cabe, se avisa con un cartel permanente (antes se perdía en silencio). */
let saveWarned=false,authLocked=false,tabClash=false;
/* Cada guardado lleva una versión (r) en el mismo valor, así se escribe de una sola vez. Si la guardada no es la que
   esta pestaña conoce, otra pestaña escribió después: no se pisa, se pregunta (tabConflict). */
const revOf=raw=>{const x=/^\{"v":1,"r":"([^"]+)"/.exec(raw||'');return x?x[1]:null;};
let myRev=null;try{myRev=revOf(localStorage.getItem(KEY));}catch(e){}
/* Cada movimiento lleva un id propio y estable (r.id): sirve para reconocer la misma fila en otro dispositivo o versión sin depender de su posición.
   Las filas que ya existían reciben un id calculado de su contenido (igual en todos los dispositivos); las nuevas, uno al azar. No usa constantes de más abajo: corre al arrancar. */
const ID_SECS=['ing','fij','hor','bbva','bcp','oh','c4','c5','c6','c7','c8','aho','inv','liq'];
const idRand=()=>{try{const a=new Uint8Array(6);crypto.getRandomValues(a);return 'm'+Array.from(a).map(x=>x.toString(16).padStart(2,'0')).join('');}catch(e){return 'm'+Math.random().toString(16).slice(2,14).padEnd(12,'0');}};
const idLegacy=s=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)>>>0;}return 'l'+x.toString(16).padStart(8,'0');};
function idsAsegura(){
  const seen=new Set(),leg=!cfg.idV;let n=0;
  Object.keys(S).forEach(y=>(S[y]||[]).forEach((m,mi)=>ID_SECS.forEach(sec=>{const cnt=Object.create(null);((m&&m[sec])||[]).forEach(r=>{
    if(!r||(!r.c&&!(+r.m)))return;
    if(typeof r.id==='string'&&r.id&&!seen.has(r.id)){seen.add(r.id);return;}
    let id;
    if(leg){const b=[y,mi,sec,r.c,r.m,r.f,r.k,r.src||'',r.card||''].join('|');cnt[b]=(cnt[b]||0)+1;id=idLegacy(b+'|'+cnt[b]);}else id=idRand();
    while(seen.has(id))id=idRand();
    r.id=id;seen.add(id);n++;});})));
  cfg.idV=1;return n;
}
const localSave=()=>{
  if(authLocked||tabClash)return;
  try{idsAsegura();}catch(e){}
  try{const rv=revOf(localStorage.getItem(KEY));if(rv&&rv!==myRev){tabConflict();return;}}catch(e){}
  const tok=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  cardsMirror();let data;try{data=JSON.stringify({v:1,r:tok,S,cfg});}catch(e){return;}
  try{localStorage.setItem(KEY,data);myRev=tok;if(saveWarned)saveWarn(false);return;}catch(e){}
  try{localStorage.removeItem(KEY+'-hist');localStorage.setItem(KEY,data);myRev=tok;if(saveWarned)saveWarn(false);return;}catch(e){}
  saveWarn(true);
};
function saveWarn(on){
  let b=document.getElementById('savewarn');
  if(!on){if(b)b.remove();saveWarned=false;return;}
  saveWarned=true;
  if(b||!document.body)return;
  b=document.createElement('div');b.id='savewarn';b.className='savewarn';b.setAttribute('role','alert');
  b.innerHTML='<span><b>No se pudo guardar en este dispositivo.</b> El almacenamiento está lleno y lo que registres ahora se perderá al cerrar la página.</span><button class="b" type="button" data-savewarn="1">Descargar una copia ahora</button>';
  document.body.appendChild(b);
}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-savewarn]'))saveFile('mis-finanzas-copia-'+BK()+'.json',JSON.stringify({v:1,fecha:BK(),S,cfg,LAY},null,1));});
/* Al teclear se guarda con una espera corta: antes se reescribía todo el almacenamiento en cada tecla.
   Los guardados normales (botones, diálogos) siguen siendo inmediatos y cancelan la espera pendiente.
   Si la pestaña se oculta o se cierra, lo pendiente se guarda al instante. */
let ssT=0;
const save=()=>{clearTimeout(ssT);ssT=0;liqSync();localSave();queueSync();if(typeof localDaily==='function')localDaily();};
const saveSoon=()=>{queueSync();clearTimeout(ssT);ssT=setTimeout(()=>{ssT=0;liqSync();localSave();if(typeof localDaily==='function')localDaily();},350);};
const flushSave=()=>{if(ssT){clearTimeout(ssT);ssT=0;localSave();if(typeof localDaily==='function')localDaily();}};
window.addEventListener('pagehide',flushSave);
window.addEventListener('beforeunload',flushSave);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSave();});

let now=new Date();
let year=String(now.getFullYear());if(YEARS.indexOf(year)<0)year='2026';
let view='resumen';
const LIMA_DF=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
const limaD=()=>{const p={};LIMA_DF.formatToParts(new Date()).forEach(x=>{p[x.type]=x.value;});return new Date(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second);};
now=limaD();{const y=String(now.getFullYear());if(YEARS.indexOf(y)>=0)year=y;}
function dayTick(){const n=limaD();if(n.getDate()===now.getDate()&&n.getMonth()===now.getMonth()&&n.getFullYear()===now.getFullYear())return;now=n;const a=document.activeElement;if(document.getElementById('sheet')||(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))return;try{render();}catch(e){}}
setInterval(dayTick,60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')dayTick();});
function anyData(){try{return Object.keys(S).some(y=>(S[y]||[]).some(m=>m&&(['liq','ing','fij','hor','aho','inv','eur'].concat(CARDS).some(k=>(m[k]||[]).some(r=>+r.m))||(m.tot&&Object.values(m.tot).some(v=>+v)))));}catch(e){return false;}}
function parseHash(){let h=location.hash.slice(1);if(h==='compartido'){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}h='';}if(h==='capturar'){view='capturar';return;}if(h==='ajustes'){view='ajustes';return;}const i=SLUG.indexOf(h);if(i>=0){view=i;return;}
  if(h===''&&anyData()){const d=limaD(),y=String(d.getFullYear());if(YEARS.indexOf(y)>=0){year=y;view=d.getMonth();return;}}
  view='resumen';}
parseHash();

const curOf=id=>{const c=((LAY.mes&&LAY.mes.c&&LAY.mes.c[id])||{}).cur;return c==='$'||c==='€'?c:'S/';};
const rateC=(c,m)=>c==='S/'?1:((m&&m.tc&&+m.tc[c])||(+((cfg.tc||{})[c]))||1);
const rate=(id,m)=>rateC(curOf(id),m);
const CURS=['S/','$','€'];
const rowCur=(k,r)=>(r&&r.cur)||curOf(k);
/* Total de una sección en soles, respetando la moneda de cada fila */
const solesOf=(m,k)=>(m&&m[k]||[]).reduce((a,r)=>a+(+r.m||0)*rateC(rowCur(k,r),m),0);
/* Total en la moneda de la sección */
const sumIn=(m,k)=>{const rc=rate(k,m);return (m&&m[k]||[]).reduce((a,r)=>a+(+r.m||0)*rateC(rowCur(k,r),m)/rc,0);};
const mixedCur=(m,k)=>(m[k]||[]).some(r=>r.cur&&r.cur!==curOf(k)&&+r.m);
