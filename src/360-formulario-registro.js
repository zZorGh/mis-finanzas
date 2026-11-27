/* ---------- Formulario de registro (botón +) ---------- */
const TIPOS=[['hor','Cotidiano','--c-hor'],['fij','Gasto fijo','--c-fij'],['compra','Compra tarjeta','--h-bcp'],['pago','Pago tarjeta','--h-oh'],['ing','Ingreso','--c-ing'],['aho','Ahorro','--c-aho'],['inv','Inversión','--c-inv']];
const TIPO_AHO=['aho','Ahorro','--c-aho'];
const GRUPOS=[['gasto','Gasto','--c-hor',['fij','hor']],['ing','Ingreso','--c-ing',['ing']],['ahorro','Ahorro','--c-aho',['aho','inv']],['tarjeta','Tarjeta','--h-bcp',['compra','pago']]];
const SUBN={ant:['Antojo','--c-hor'],hor:['Cotidiano','--c-hor'],fij:['Fijo','--c-fij'],aho:['Cuenta de ahorro','--c-aho'],inv:['Inversión','--c-inv'],compra:['Compra','--h-bcp'],pago:['Pago','--h-oh'],ing:['Ingreso','--c-ing']};
const grpOf=t=>(GRUPOS.find(g=>g[3].indexOf(t)>=0)||GRUPOS[0])[0];
function presetSrc(){
  if(!ent||ent.src)return;const t=ent.t;if(!(t==='hor'||t==='fij'||t==='pago'))return;
  let ls='';try{ls=localStorage.getItem(KEY+'-src')||'';}catch(e){}
  if(ls&&srcList(t==='pago'?false:true).some(x=>x[0]===ls))ent.src=ls;
}
/* ¿Le alcanza a la cuenta? Cubre gastos, pago de tarjeta, depósitos a ahorro y movimientos desde liquidez, y retiros o movimientos desde una cuenta de ahorro.
   Devuelve null si alcanza (o si no aplica); si no, el saldo, lo que falta y otras cuentas de liquidez a las que sí les alcanza. */
function shortInfo(){
  const sa=document.getElementById('sa');if(!ent||!sa)return null;
  const amt=parseMonto(sa.value);if(!(amt>0)||(ent.multi&&ent.multi.length>1))return null;
  const t=ent.t,m=(S[ent.yr]||[])[+ent.mo];if(!m)return null;
  const liqAt=id=>(id&&id.slice(0,4)==='liq:')?m.liq[+id.slice(4)]:null;
  let id=null,fld='src',kind='liq',name='',bal=0,need=0;
  if(t==='hor'||t==='fij'||t==='pago'){
    const l=liqAt(ent.src);if(!l)return null;id=ent.src;name=(l.c||'').trim();bal=+l.m||0;need=dedAmt(m,{m:amt,cur:ent.cur},t==='pago'?'fij':t);
    if(ent.edit){const o=((S[ent.edit.yr][ent.edit.mo]||{})[ent.edit.s]||[])[ent.edit.i];if(o&&o.src===ent.src&&o._d!=null)bal+=o._d;}
  }else if(t==='aho'){
    const cur=entCur(),sol=Math.round(amt*rateC(cur,m)*100)/100;
    if(ent.ax==='dep'){const l=liqAt(ent.src);if(!l)return null;id=ent.src;name=(l.c||'').trim();bal=+l.m||0;need=dedAmt(m,{m:amt,cur:ent.cur},'aho');}
    else if(ent.ax==='mov'&&liqAt(ent.from)){const l=liqAt(ent.from);id=ent.from;fld='from';name=(l.c||'').trim();bal=+l.m||0;need=Math.round(sol/rate('liq',m)*100)/100;}
    else if((ent.ax==='ret'||ent.ax==='mov')&&ent.from&&ent.from.slice(0,4)==='aho:'&&ent.from!=='aho:+'){
      const a=ahoOf(ent.yr,+ent.mo,ent.from.slice(4));if(!a)return null;kind='aho';name=a.c;bal=+a.v||0;need=sol;}
    else return null;
  }else return null;
  const after=Math.round((bal-need)*100)/100;if(after>=-0.004)return null;
  const alts=kind==='liq'?m.liq.map((r,i)=>[i,r]).filter(([i,r])=>'liq:'+i!==id&&(r.c||'').trim()&&(+r.m||0)-need>=0).slice(0,4).map(([i,r])=>['liq:'+i,r.c.trim()+' · '+fmtC('liq',+r.m||0)]):[];
  let sp=null;
  if(kind==='liq'&&(t==='hor'||t==='fij'||t==='pago')&&!ent.edit&&bal>0.004){
    const part=Math.floor(amt*bal/need*100)/100,rest=Math.round((amt-part)*100)/100,rn=Math.round((need-bal)*100)/100;
    const a2=m.liq.map((r,i)=>[i,r]).filter(([i,r])=>'liq:'+i!==id&&(r.c||'').trim()&&(+r.m||0)-rn>=0).slice(0,4).map(([i,r])=>['liq:'+i,r.c.trim(),+r.m||0]);
    if(part>0&&rest>0&&a2.length)sp={part,rest,alts:a2};
  }
  return{kind,fld,name:name||'Esa cuenta',bal,need,after,alts,sp,amt};
}
/* ¿La persona eligió completar el pago con otra cuenta, y sigue siendo válido para este monto y esta cuenta? */
function splitOk(si){
  const s=ent&&ent.split;si=si||shortInfo();
  if(!s||!si||!si.sp||s.key!==ent.src+'|'+si.amt)return null;
  const a=si.sp.alts.find(x=>x[0]===s.to);return a?{to:a[0],name:a[1],part:si.sp.part,rest:si.sp.rest,from:si.name}:null;
}
function splitHtml(sp){
  const f=v=>esc(entCur()+' '+num2(v));
  return '<div class="sst"><span aria-hidden="true">✓</span><span>Pago dividido en dos cuentas</span></div>'
   +'<div><span>'+esc(sp.from)+'</span> <b>'+f(sp.part)+'</b> + <span>'+esc(sp.name)+'</span> <b>'+f(sp.rest)+'</b></div>'
   +'<div class="sfx"><button type="button" class="cp sm" data-ssplit="">Quitar división</button></div>';
}
function shortHtml(si){
  const fm=v=>esc(si.kind==='aho'?fmt(v):fmtC('liq',v));
  let h='<div class="sst"><span aria-hidden="true">⚠</span><span>No te alcanza el saldo</span></div>';
  h+='<div><span>'+esc(si.name)+'</span> <span class="k">tiene</span> <b>'+fm(si.bal)+'</b> · <span class="k">este movimiento</span> <b>'+fm(si.need)+'</b></div>';
  h+='<div><span class="k">Quedaría en</span> <b class="ng">'+fm(si.after)+'</b></div>';
  if(cfg.bloquearNeg)h+='<div class="k">Tu configuración no permite dejar una cuenta en negativo.</div>';
  if(si.alts.length)h+='<div class="sfx"><span class="k">Usar otra cuenta:</span>'+si.alts.map(a=>'<button type="button" class="cp sm" data-sfix="'+esc(a[0])+'" data-sfld="'+si.fld+'">'+esc(a[1])+'</button>').join('')+'</div>';
  if(si.sp)h+='<div class="sfx"><span class="k">O completa el resto con:</span>'+si.sp.alts.map(a=>'<button type="button" class="cp sm" data-ssplit="'+esc(a[0])+'">'+esc(a[1]+' · '+entCur()+' '+num2(si.sp.rest))+'</button>').join('')+'</div>';
  return h;
}
/* Muestra el aviso y ajusta los botones: sin saldo, «Guardar» pasa a «Guardar igual» (o se bloquea si la persona lo pidió en Ajustes). */
/* Estado de cuenta dentro de la hoja de pago: lo del periodo, lo que va al siguiente y un aviso si se paga más. */
function pagoMas(){
  const x=document.getElementById('spagox');if(!x)return;x.hidden=true;x.innerHTML='';
  if(!ent||ent.t!=='pago'||ent.edit)return;const st=stmtNow(ent.card,ent.yr,+ent.mo);if(!st)return;
  const f=fechaL(st.cut);let h=st.due>0.004?'<span>Corte del '+f+': toca pagar '+fmtC(ent.card,st.due)+'.</span>':'<span>Corte del '+f+': ya no debes nada de este periodo.</span>';
  if(st.next>0.004)h+=' <span>Lo de después del corte ('+fmtC(ent.card,st.next)+') va al siguiente periodo.</span>';
  const a=parseMonto((document.getElementById('sa')||{}).value);
  if(entCur()===curOf(ent.card)&&a>st.due+0.004)h+=' <span class="err">Es más que lo del periodo: el resto adelanta el siguiente.</span>';
  x.innerHTML=h;x.hidden=false;
}
function negWarn(){
  const w=document.getElementById('sshort');if(!w||!ent)return;
  const si=shortInfo(),sv=document.querySelector('#sheet [data-s="save"]'),mo=document.querySelector('#sheet [data-s="more"]');
  if(sv&&!sv.dataset.lbl)sv.dataset.lbl=sv.textContent;
  if(!si){w.classList.remove('on');w.innerHTML='';if(sv){sv.disabled=false;sv.classList.remove('warn');if(sv.dataset.lbl&&sv.textContent!==sv.dataset.lbl)sv.textContent=sv.dataset.lbl;}if(mo)mo.style.display='';if(sv&&sv.parentElement)sv.parentElement.style.gridTemplateColumns='';return;}
  const so=splitOk(si);
  if(so){w.classList.add('on');w.innerHTML=splitHtml(so);if(sv){sv.disabled=false;sv.classList.remove('warn');sv.textContent='Guardar dividido';}if(mo){mo.style.display='none';if(sv&&sv.parentElement)sv.parentElement.style.gridTemplateColumns='1fr';}return;}
  w.classList.add('on');w.innerHTML=shortHtml(si);
  if(sv){if(cfg.bloquearNeg){sv.disabled=true;}else{sv.classList.add('warn');sv.textContent='Guardar igual';}}
  if(mo){mo.style.display='none';if(sv&&sv.parentElement)sv.parentElement.style.gridTemplateColumns='1fr';}
}
function rove(root){(root||document).querySelectorAll('.grp[role=radiogroup]').forEach(g=>{const bs=[...g.querySelectorAll('button')];if(!bs.length)return;const on=bs.find(x=>x.getAttribute('aria-checked')==='true')||bs[0];bs.forEach(x=>x.tabIndex=x===on?0:-1);});}
const BANCOS=[['bbva','BBVA','--h-bbva'],['bcp','BCP','--h-bcp'],['oh','oh!','--h-oh']];
const SECN={hor:'Gastos cotidianos',fij:'Gastos fijos',ing:'Ingresos',aho:'Ahorros',inv:'Inversiones',bbva:'BBVA',bcp:'BCP',oh:'oh!'};
const BANKN={bbva:'BBVA',bcp:'BCP',oh:'oh!'};
function hormAlert(b,a,t){
  if(t!=='hor'||!(cfg.alerta>0))return'';
  const mi=ent?+ent.mo:view,yr=ent?ent.yr:year,cur=yr===String(now.getFullYear())&&mi===now.getMonth(),dl=cur?new Date(+yr,mi+1,0).getDate()-now.getDate():0;
  const resto=cur&&dl>0?' y quedan '+dl+(dl===1?' día':' días')+' del mes':'';
  if(b<=cfg.alerta&&a>cfg.alerta)return' · Llevas '+fmt(a)+' de '+fmt(cfg.alerta)+' en gastos cotidianos'+resto+'. Mira tus gastos chicos de esta semana';
  if(b<cfg.alerta*.8&&a>=cfg.alerta*.8&&a<=cfg.alerta)return' · Te quedan '+fmt(cfg.alerta-a)+' de tu límite de cotidianos'+(cur&&dl>0?' para '+dl+(dl===1?' día':' días'):'');
  return'';
}
function srcList(none){
  const m=S[ent.yr][+ent.mo],out=[];
  (m.liq||[]).forEach((r,i)=>{if((r.c||'').trim())out.push(['liq:'+i,r.c.trim()+' · '+curOf('liq')+' '+num2(+r.m||0),'--h-liq']);});
  if(none)out.push(['none',typeof none==='string'?none:'No descontar','--muted']);
  return out;
}
function liqRef(m,src){return (src&&src.slice(0,4)==='liq:')?m.liq[+src.slice(4)]:null;}
function dedAmt(m,r,sec){return Math.round((+r.m||0)*rateC(rowCur(sec,r),m)/rate('liq',m)*100)/100;}
function applyDed(m,r,sec){const l=liqRef(m,r.src);if(!l)return'';const a=(sec==='ing'?-1:1)*dedAmt(m,r,sec);l.m=Math.round(((+l.m||0)-a)*100)/100;r._d=a;return sec==='ing'?' · sumado a '+l.c:' · descontado de '+l.c+(l.m<0?' (quedó en negativo)':'');}
function revDed(m,r){const l=liqRef(m,r.src);if(l&&r._d!=null)l.m=Math.round(((+l.m||0)+r._d)*100)/100;delete r._d;}
function reconcile(m,r,sec){if(!r.src)return;revDed(m,r);applyDed(m,r,sec);}
function paymentsTo(m,k){let d=0;(m.fij||[]).forEach(r=>{if(r.card===k)d+=(+r.m||0)*rateC(rowCur('fij',r),m)/rate(k,m);});return d;}
function cardDebt(m,k){return Math.round((sumIn(m,k)-paymentsTo(m,k))*100)/100;}
function cardEnding(y,i,k){const m=S[y]&&S[y][i];if(!m)return 0;const open=+((m.copen||{})[k])||0;return Math.round((open+cardDebt(m,k))*100)/100;}
function delMov(m,sec,i){const a=m[sec];if(!a||!a[i])return;const r=a[i];if(r.src)revDed(m,r);if(sec==='aho'&&r.t&&r.t.indexOf('tr:')===0){m.aho=a.filter(x=>x.t!==r.t);if(!m.aho.length)m.aho.push(row());return;}a.splice(i,1);if(!a.length)a.push(sec==='eur'?{a:0,b:0,d:0,s:0,p:0}:row());}
let ent=null,lastUndo=null,toastT=0,pf=null,sheetFrom=null;
const tsec=()=>ent.t==='compra'?ent.card:ent.t==='pago'?'fij':ent.t==='mov'?'aho':ent.t;
const lastType=()=>{try{const t=localStorage.getItem(KEY+'-tipo')||'hor';return TIPOS.some(x=>x[0]===t)?t:'hor';}catch(e){return 'hor';}};
const entCur=()=>ent.cur||curOf(tsec());
const chipH=(items,sel,attr,sm)=>items.map(i=>`<button type="button" class="cp${sm?' sm':''}" role="radio" aria-checked="${i[0]===sel}" data-${attr}="${esc(i[0])}" style="--cc:var(${i[2]||'--accent'})">${esc(i[1])}</button>`).join('');
/* Conceptos de gasto ya usados: cuántas veces, en qué clase (cotidiano/fijo) y el último monto y cuenta.
   Se calcula una vez por formulario abierto (ent.cst) y sirve para sugerir y para elegir la clase sola. */
function cstat(){
  if(ent&&ent.cst)return ent.cst;const n=Object.create(null);
  Object.keys(S).sort().forEach(y=>S[y].forEach(m=>['hor','fij'].forEach(sec=>(m[sec]||[]).forEach(r=>{
    const c=(r.c||'').trim();if(!c||r.card||/^total|^resta$|^saldo$/i.test(c))return;
    const k=c.toLowerCase(),o=n[k]||(n[k]={c,n:0,s:{hor:0,fij:0},last:null,a:[]});o.n++;o.s[sec]++;
    if(+r.m>0){o.last={m:+r.m,src:r.src||'',cur:r.cur||''};o.a.push(+r.m);if(o.a.length>3)o.a.shift();}}))));
  if(ent)ent.cst=n;return n;
}
/* Atajos: solo los gastos recurrentes que la persona configuró (en Ajustes) o creó marcando «Repetir cada mes». Un toque los registra. */
const atajosRec=()=>(cfg.rec||[]).map((r,i)=>[i,r]).filter(([i,r])=>(r.s==='hor'||r.s==='fij')&&(r.c||'').trim()&&+r.m>0).slice(0,6);
/* Tres grupos fijos (antes había categorías); las categorías se ordenan por uso y se sugieren por lo que la persona ya registró.
   Una sugerencia nunca cambia el grupo de una categoría existente, para no mover los totales de meses pasados. */
const CAT_PISTAS=[
  ['Alquiler','need',/\b(alquiler|arriendo|renta del|mantenimiento del edificio)\b/],
  ['Servicios','need',/\b(luz|agua|internet|celular|telefono|recarga|movistar|claro|entel|bitel|enel|sedapal|calidda|luz del sur)\b/],
  ['Transporte','need',/\b(taxi|uber|indriver|didi|cabify|bus|combi|metropolitano|corredor|pasaje|peaje|gasolina|grifo|cochera)\b/],
  ['Mercado','need',/\b(mercado|supermercado|super|tottus|wong|plaza vea|vivanda|makro|mass|bodega|verduras|abarrotes)\b/],
  ['Menú','need',/\b(menu|almuerzo|desayuno|cena)\b/],
  ['Salud','need',/\b(farmacia|inkafarma|mifarma|clinica|doctor|medico|dentista|medicina|pastillas|consulta medica)\b/],
  ['Estudios','need',/\b(universidad|instituto|colegio|pension|matricula|curso|academia)\b/],
  ['Suscripciones','want',/\b(netflix|spotify|disney|hbo|prime video|youtube premium|icloud|chatgpt|crunchyroll)\b/],
  ['Comida','want',/\b(pizza|hamburguesa|kfc|bembos|mcdonalds|rappi|pedidosya|cafe|starbucks|helado|pollo a la brasa|chifa)\b/],
  ['Ropa','want',/\b(ropa|zapatillas|zapatos|polo|pantalon|casaca|vestido)\b/],
  ['Ocio','want',/\b(cine|bar|discoteca|concierto|juego|videojuego|cerveza|chela|salida|viaje)\b/]
];
const CAT_STOP=new Set(['para','pago','compra','gasto','sin','descripcion','tienda','del','con','por','mes']);
const catLow=s=>String(s||'').trim().toLowerCase();
const catSecs=()=>['fij','hor'].concat(CARDS);
const catValida=r=>!!(r&&(r.k||'').trim()&&!r.card&&r.k!=='Pago tarjeta');
let catMemoFijo=null;
function catMem0(){
  const ex=Object.create(null),pal=Object.create(null),suma=(o,w,k)=>{const e=o[w]||(o[w]=new Map());e.set(k,(e.get(k)||0)+1);};
  Object.keys(S).sort().forEach(y=>(S[y]||[]).forEach(m=>['fij','hor'].forEach(s=>(m[s]||[]).forEach(r=>{
    if(!catValida(r)||!(+r.m)||r.t==='ant')return;const c=normTxt(r.c).trim();if(!c)return;const k=grupoDe(s,r);suma(ex,c,k);
    c.split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!CAT_STOP.has(w)).forEach(w=>suma(pal,w,k));}))));
  return{ex,pal};
}
const catMem=()=>catMemoFijo||(ent?(ent.ckm||(ent.ckm=catMem0())):catMem0());
const catMayor=e=>{let b='',n=0,t=0;e.forEach((v,k)=>{t+=v;if(v>=n){b=k;n=v;}});return{k:b,n,t};};
/* Grupo propuesto para un concepto: lo que usaste antes con él y, si no, las pistas. */
function catSugiere(name){
  const n=normTxt(name).trim();if(!n||n==='sin descripcion')return null;
  const mem=catMem(),own=Object.prototype.hasOwnProperty,sal=g=>({g,k:GNOM[g]});
  if(own.call(mem.ex,n))return sal(catMayor(mem.ex[n]).k);
  const jun=new Map();n.split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!CAT_STOP.has(w)).forEach(w=>{if(own.call(mem.pal,w))mem.pal[w].forEach((v,k)=>jun.set(k,(jun.get(k)||0)+v));});
  if(jun.size){const b=catMayor(jun);if(b.n/b.t>=.6)return sal(b.k);}
  for(const p of CAT_PISTAS)if(p[2].test(n))return sal(p[1]);
  return null;
}
const catDeFila=it=>{if(it.ant||!(it.sec==='hor'||it.sec==='fij'))return'';const s=catSugiere(it.name);return s?s.k:'';};
function catAuto(name){
  if(ent.catTocada)return;
  const s=(ent.t==='hor'||ent.t==='fij')&&!ent.ant&&!ent.multi?catSugiere(name):null;
  ent.cat=s?s.k:'';
}
/* Siempre hay un grupo a la vista: el propuesto, el elegido o el de la clase de gasto */
const grpSel=()=>ent.ant?'want':(catG(ent.cat)||(ent.t==='fij'?'need':'want'));
const grpChips=()=>chipH(GRUPOS3.map(x=>[x[0],x[1],({need:'--c-fij',want:'--c-hor',ai:'--c-aho'})[x[0]]]),grpSel(),'sgrp');
function catAutoHtml(){
  if(!(ent.t==='hor'||ent.t==='fij')||ent.ant)return'';
  return '<div class="pvf"><span class="k">Grupo</span><div class="grp" role="radiogroup" aria-label="Grupo del gasto">'+grpChips()+'</div></div>';
}
function autoCls(name){
  if(!ent||ent.edit||ent.lock||ent.clsManual||(ent.t!=='hor'&&ent.t!=='fij'))return false;
  const o=cstat()[String(name||'').trim().toLowerCase()];if(!o)return false;
  const t2=o.s.fij>o.s.hor?'fij':'hor';if(t2===ent.t)return false;ent.t=t2;return true;
}
/* Aviso con «Deshacer»: dura 10 s (6 s si no tiene «Deshacer»), se detiene mientras lo señalas o tienes el foco
   en él, y se puede deshacer con Ctrl+Z (⌘Z) sin buscar el botón. */
function toast(msg,u,q){
  const t=document.getElementById('toast');if(!t)return;
  t.innerHTML='<span></span>'+(q?'<span class="tq">¿Valió la pena? <button type="button" data-vpq="1">Sí</button> <button type="button" data-vpq="0">No</button></span>':'')+(u?'<button type="button" data-undo="1" title="Ctrl+Z">Deshacer</button>':'');
  t.classList.toggle('tqq',!!q);  t.firstChild.textContent=msg;t.hidden=false;lastUndo=u||null;
  armToast(q?12000:u?10000:6000);
}
function armToast(ms){clearTimeout(toastT);toastT=setTimeout(()=>{const t=document.getElementById('toast');if(t)t.hidden=true;lastUndo=null;},ms);}
(()=>{const t=document.getElementById('toast');if(!t)return;
  const stop=()=>clearTimeout(toastT),go=()=>{if(!t.hidden)armToast(4000);};
  t.addEventListener('mouseenter',stop);t.addEventListener('focusin',stop);t.addEventListener('mouseleave',go);t.addEventListener('focusout',go);})();
document.addEventListener('keydown',e=>{
  if(!((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&String(e.key).toLowerCase()==='z'&&lastUndo))return;
  const el=e.target;if(el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable))return;
  e.preventDefault();const u=lastUndo;lastUndo=null;undoRow(u);toast('Movimiento deshecho');});
function syncSheet(){
  const g=id=>document.getElementById(id);if(!g('sheet'))return;
  const t=ent.t,gasto=t==='hor'||t==='fij',compra=t==='compra',pago=t==='pago',card=compra||pago,sec=tsec();
  {const gr=GRUPOS.find(x=>x[0]===grpOf(t));g('stype').innerHTML=chipH(GRUPOS.map(x=>[x[0],x[1],x[2]]),gr[0],'g');const ss=g('ssub');if(ss){ss.hidden=gr[3].length<2;{const its=gr[3].map(k=>[k,SUBN[k][0],SUBN[k][1]]);if(gr[0]==='gasto')its.push(['ant','Antojo','--c-hor']);ss.innerHTML=gr[3].length<2?'':chipH(its,(t==='hor'&&ent.ant)?'ant':t,'t',true);}}}
  {const ax=g('sax');if(ax){ax.hidden=t!=='aho';if(t==='aho')ax.innerHTML=chipH([['dep','Depositar','--c-aho'],['ret','Retirar','--c-aho'],['mov','Mover','--c-aho'],['aj','Ajustar saldo','--c-aho']],ent.ax,'ax',true);}g('sa').placeholder=(t==='aho'&&ent.ax==='aj')?'Saldo real ahora':'0.00';}
  const mov=t==='aho'&&ent.ax==='mov',mw=g('smovw');if(mw){mw.hidden=t!=='aho';if(t==='aho'){
    const accs=ahoAccts(ent.yr,+ent.mo).filter(a=>Math.abs(a.v)>=.005||('aho:'+a.c)===ent.from);
    if(mov){g('sfromlbl').textContent='Desde';g('sfrom').innerHTML=chipH(moveAccts(ent.yr,+ent.mo,false),ent.from,'from',true);g('stow').hidden=false;g('sto').innerHTML=chipH(moveAccts(ent.yr,+ent.mo,true),ent.to,'to',true);}
    else{
      if(!ent.from){let ls='';try{ls=localStorage.getItem(KEY+'-ahoacct')||'';}catch(e){}const c=accs.find(a=>a.c===ls)||(accs.length===1?accs[0]:null);if(c)ent.from='aho:'+c.c;}
      g('sfromlbl').textContent=ent.ax==='aj'?'¿Qué cuenta ajustas?':'Cuenta';
      const items=accs.map(a=>['aho:'+a.c,a.c+' · '+fmt(a.v),'--c-aho']);if(ent.ax!=='ret')items.push(['aho:+','+ Nueva cuenta','--c-aho']);
      g('sfrom').innerHTML=chipH(items,ent.from,'from',true);g('stow').hidden=true;
    }}}
  const sdl=g('sdlbl');if(sdl)sdl.firstChild.textContent=t==='aho'?((ent.ax==='mov'?ent.to:ent.from)==='aho:+'?'Nombre de la cuenta nueva':'Nota (opcional)'):'Concepto';
  g('sbank').hidden=!card;g('sbank').innerHTML=chipH(BANCOS,ent.card,'b');
  g('ssug').innerHTML=(gasto&&!ent.edit)?atajosRec().map(([i,r])=>`<button type="button" class="cp sm fast" data-rec1="${i}" title="Un toque: se registra al instante">${esc(r.c)} · ${esc(fmt(r.m))}</button>`).join(''):'';
  {const gw=g('sgrpw');if(gw){gw.hidden=!gasto;g('sgrp').innerHTML=gasto?chipH(GRUPOS3.slice(0,3).map(x=>[x[0],x[1],({need:'--c-fij',want:'--c-hor',ai:'--c-aho'})[x[0]]]),ent.grp||'','sgrp'):'';}
  }
  {const rw=g('srecw');if(rw)rw.hidden=!(gasto&&!ent.edit);}{const qk=!!g('sheet').dataset.quick;g('scatw').hidden=!gasto||qk||!!ent.ant;g('scat').innerHTML=gasto&&!qk&&!ent.ant?grpChips():'';}
  const aho=t==='aho'&&(ent.ax==='dep'||(ent.ax==='mov'&&ent.to&&ent.to.slice(0,4)==='aho:')),sgw=g('sgoalw');if(sgw){sgw.hidden=!(aho&&(cfg.metas||[]).length);g('sgoal').innerHTML=aho?chipH((cfg.metas||[]).map(x=>[x.n,x.n]),ent.g,'meta',true):'';}
  const ahoMv=t==='aho'&&(ent.ax==='dep'||ent.ax==='ret'),srcOn=gasto||pago||ahoMv||t==='ing';
  {const sp=g('sprev');if(sp){sp.hidden=!(t==='aho'&&ent.ax!=='mov');if(!sp.hidden)sp.textContent=ahoPreview();}}
  g('ssrcw').hidden=!srcOn;
  const sl=g('ssrclbl');if(sl)sl.textContent=pago?'¿Con qué pagas la tarjeta?':ahoMv?(ent.ax==='dep'?'¿De dónde sale el dinero? (opcional)':'¿A dónde va el dinero? (opcional)'):t==='ing'?'¿En qué cuenta se deposita?':'¿De dónde sale este gasto?';
  g('ssrc').innerHTML=srcOn?chipH(srcList(ahoMv?'No mover de liquidez':t==='ing'?'No sumar a ninguna cuenta':gasto),ent.src,'src',true):'';
  g('scur').textContent=entCur();g('samtcur').textContent=entCur();g('scur').style.display=(cfg.monedas||[]).length?'':'none';g('scur').disabled=false;g('scur').title='Toca para cambiar la moneda';
  let dest;
  if(compra)dest='Compra en '+BANKN[ent.card]+' · sube tu deuda, no es gasto';
  else if(pago)dest='Pago de '+BANKN[ent.card]+' · cuenta como gasto del mes';
  else if(t==='aho')dest=ent.ax==='mov'?'No es gasto ni ingreso: solo cambia dónde está tu dinero':ent.ax==='aj'?'Corrige el saldo · no cuenta como ahorro del mes':ent.ax==='ret'?'Retiro de ahorro · ese dinero vuelve a lo que te queda':'Depósito de ahorro · se descuenta de lo que te queda';
  else dest=entCur()!==curOf(sec)?'Se guardará en '+SECN[sec]+' · en '+entCur()+', convertido con la tasa del mes':'';
  g('sdest').textContent=(dest||S[ent.yr][+ent.mo].tot)?dest+' · '+MES[+ent.mo]+' '+ent.yr+(S[ent.yr][+ent.mo].tot?' (mes con solo totales)':''):'';
  g('sdest').classList.remove('err');pagoMas();
  {const sm=g('ssrcmsg');if(sm)sm.hidden=true;const su=g('smsum');if(su){const bits=[ent.day+' '+ABR[+ent.mo].toLowerCase()+(ent.yr!==year?' '+ent.yr:'')];if(gasto)bits.push(GLAB[grpSel()]);if(ent.g)bits.push('Meta: '+ent.g);su.textContent=bits.join(' · ');}}
  {const q=g('sqk'),qk=!!g('sheet').dataset.quick;if(q)q.innerHTML=qk?catAutoHtml():'';const st=g('stype');if(st)st.hidden=qk&&!!ent.lock;}
  negWarn();rove(g('sheet'));updateAuto();
}
/* Modo del formulario: ask = elegir, manual = formulario, auto = una frase con tarjeta de confirmación. */
/* Registro en una pantalla: un gasto con monto y concepto. La cuenta, el tipo y la categoría se deducen, se ven y se pueden cambiar antes de guardar. */
function qkEntra(){
  const sh=document.getElementById('sheet');if(!sh||!ent||ent.edit)return;
  sh.dataset.quick='1';ent.ant=ent.lock==='hor'||ent.t!=='hor'?0:ent.ant;ent.grp='';ent.clsManual=0;
  presetSrc();qkRecuerda();
  if(!ent.src&&(ent.t==='hor'||ent.t==='fij'||ent.t==='ing'||ent.t==='pago')){const l=srcList().filter(x=>x[0].slice(0,4)==='liq:');if(l.length===1)ent.src=l[0][0];}
  qkDeduce();syncSheet();const a=document.getElementById('sa');if(a)a.focus();
}
/* Cada tipo recuerda lo último que usaste: la cuenta de tus ingresos y la tarjeta de tus compras y pagos. */
function qkRecuerda(){
  if(!ent||ent.edit)return;let ls='',lc='';
  try{ls=localStorage.getItem(KEY+'-srcing')||'';lc=localStorage.getItem(KEY+'-card')||'';}catch(e){}
  if(ent.t==='ing'&&!ent.src&&ls&&srcList('x').some(x=>x[0]===ls))ent.src=ls;
  if((ent.t==='compra'||ent.t==='pago')&&!ent.cardTocada&&!ent.lock&&CARDS.indexOf(lc)>=0)ent.card=lc;
}
function qkDeduce(){
  if(!ent||(ent.t!=='hor'&&ent.t!=='fij'))return;
  const d=document.getElementById('sd'),v=d?d.value:'';autoCls(v);catAuto(v);
  if(ent.srcTocada)return;const o=cstat()[v.trim().toLowerCase()],s=o&&o.last&&o.last.src;
  if(s&&s.slice(0,4)==='liq:'&&srcList().some(x=>x[0]===s))ent.src=s;
}
/* Al pasar a Automático, lo ya escrito se vuelve frase para no perderlo ni guardarlo a ciegas. */
function qkAFrase(){
  const g=id=>document.getElementById(id),a=g('sa'),d=g('sd'),i=g('smsg'),src=ent.src,n=parseMonto(a.value),ok=n>0;
  const fr=ok?(d.value.trim()+' '+n).trim():'';a.value='';d.value='';if(!ent.catTocada)ent.cat='';
  i.value=fr;if(fr){sheetInput({target:i});if(!ent.src&&src){ent.src=src;syncSheet();}}
}
function setMode(m,wiz){
  const sh=document.getElementById('sheet');if(!sh)return;if(m==='auto'&&sh.dataset.quick)qkAFrase();delete sh.dataset.quick;sh.dataset.mode=m;if(m!=='auto')vozStop();
  if(m!=='ask')track('reg_modo',m==='auto'?'auto':(wiz?'manual_pasos':'manual_completo'));
  if(!(m==='manual'&&wiz)){delete sh.dataset.wiz;delete sh.dataset.step;sh.querySelectorAll('.wzshow').forEach(e=>e.classList.remove('wzshow'));}
  const w=document.getElementById('smodesw');if(w){w.dataset.mode=m==='auto'?'manual':'auto';w.textContent=m==='auto'?'Cambiar a manual':'Cambiar a automático';}
  if(m==='auto'){updateAuto();const i=document.getElementById('smsg');if(i)i.focus();}
  else if(m==='manual'){if(wiz)wizGo(wizFlow()[0]);else{const a=document.getElementById('sa');if(a)a.focus();}}
  else if(m==='ask')qkEntra();
}
/* Asistente por pasos: tras elegir «Manual», una ventana por decisión (movimiento → tipo → cuenta/tarjeta → monto).
   Los pasos salen del estado: wizFlow() los calcula y wizGo() muestra solo el grupo del paso actual. */
const WZ={type:['stype','ssug'],sub:['ssub'],grp:['sgrpw'],ax:['sax'],acct:['smovw'],bank:['sbank'],src:['ssrcw'],form:['swsum','samt','sshort','sprev','sdlbl','smore','sdest','sact','smodesw']};
function wizFlow(){
  const t=ent.t,gr=GRUPOS.find(x=>x[0]===grpOf(t))||GRUPOS[0],f=[];
  if(!ent.lock){f.push('type');if(gr[3].length>=2)f.push('sub');}
  if(t==='aho'){f.push('ax','acct');if(ent.ax==='dep'||ent.ax==='ret')f.push('src');}
  else if(t==='compra'){if(!ent.lock)f.push('bank');}
  else if(t==='pago')f.push('bank','src');
  else if(t==='hor'&&ent.ant)f.push('src');
  else if(t==='hor'||t==='fij')f.push('grp','src');
  else if(t==='ing')f.push('src');
  f.push('form');return f;
}
function wizSum(){
  const s=document.getElementById('swsum');if(!s||!ent)return;
  const gr=GRUPOS.find(x=>x[0]===grpOf(ent.t))||GRUPOS[0],bits=[gr[1]];
  if(gr[3].length>=2)bits.push((ent.t==='hor'&&ent.ant)?'Antojo':SUBN[ent.t][0]);
  if((ent.t==='hor'||ent.t==='fij')&&ent.grp)bits.push(GLAB[ent.grp]);
  if(ent.t==='aho'){bits.push(({dep:'Depositar',ret:'Retirar',mov:'Mover',aj:'Ajustar saldo'})[ent.ax]||'');}
  if(ent.t==='compra'||ent.t==='pago')bits.push(BANKN[ent.card]||'');
  if((ent.t==='hor'||ent.t==='fij'||ent.t==='pago'||ent.t==='ing')&&ent.src&&ent.src!=='none'){const sl=(srcList(true).find(x=>x[0]===ent.src)||[])[1];if(sl)bits.push(sl.split(' · ')[0]);}
  s.innerHTML=bits.filter(Boolean).map(b=>'<span>'+esc(b)+'</span>').join(' · ')+'<button type="button" class="lnk" data-wz="chg">Cambiar</button>';
}
function wizGo(step){
  const sh=document.getElementById('sheet');if(!sh||!ent)return;
  sh.dataset.wiz='1';sh.dataset.step=step;track('reg_paso',step);
  sh.querySelectorAll('.wzshow').forEach(e=>e.classList.remove('wzshow'));
  (WZ[step]||[]).forEach(id=>{const e=document.getElementById(id);if(e)e.classList.add('wzshow');});
  const gr=GRUPOS.find(x=>x[0]===grpOf(ent.t))||GRUPOS[0];
  const Q={type:'¿Qué movimiento es?',sub:({gasto:'¿Qué tipo de gasto es?',ahorro:'¿Es ahorro o inversión?',tarjeta:'¿Es una compra o un pago?'})[gr[0]]||'',ax:'¿Qué haces con tu ahorro?',bank:'¿Con qué tarjeta?',grp:'¿En qué grupo cae este gasto?'};
  const q=document.getElementById('swq');if(q)q.textContent=Q[step]||'';
  if(step==='form'){wizSum();negWarn();}
  requestAnimationFrame(()=>{
    if(step==='form'){const a=document.getElementById('sa');if(a)a.focus();return;}
    const gid={type:'stype',sub:'ssub',ax:'sax',acct:'sfrom',bank:'sbank',src:'ssrc',grp:'sgrp'}[step],gx=gid&&document.getElementById(gid);
    const b=gx&&(gx.querySelector('[aria-checked="true"]')||gx.querySelector('button'));if(b)b.focus();});
}
function wizAdvance(step){
  if(step==='acct'&&(!ent.from||(ent.ax==='mov'&&!ent.to)))return;
  const f=wizFlow(),i=f.indexOf(step);wizGo(f[Math.min(i<0?0:i+1,f.length-1)]);
}
function wizBack(){
  const sh=document.getElementById('sheet');if(!sh)return;
  const f=wizFlow(),i=f.indexOf(sh.dataset.step);
  if(i<=0)setMode('ask');else wizGo(f[i-1]);
}
function wizClickStep(e){
  const sh=document.getElementById('sheet');if(!sh||!sh.dataset.wiz)return '';
  const b=e.target.closest&&e.target.closest('button');if(!b)return '';
  const IN={type:'#stype',sub:'#ssub',ax:'#sax',acct:'#sfrom,#sto',bank:'#sbank',src:'#ssrc',grp:'#sgrp'},s=sh.dataset.step;
  return IN[s]&&b.closest(IN[s])?s:'';
}
/* Varios gastos en una frase: lista, cuenta de cada uno y aviso si una cuenta no alcanza para todos. */
function multiNeed(){
  const m=(S[ent.yr]||[])[+ent.mo];if(!m||!ent.multi)return{rows:[],bad:[],sinCuenta:false};const by={};let sin=false;
  const rows=ent.multi.map(it=>{const id=it.src||ent.src||'';const need=dedAmt(m,{m:it.amt,cur:it.cur||ent.cur},it.sec);if(!id)sin=true;else by[id]=(by[id]||0)+need;return{it,id};});
  const bad=Object.keys(by).map(id=>{const l=m.liq[+id.slice(4)];return l&&(+l.m||0)-by[id]<-0.004?{id,name:(l.c||'').trim(),bal:+l.m||0,need:by[id]}:null;}).filter(Boolean);
  return{rows,bad,sinCuenta:sin};
}
function multiHtml(){
  const m=(S[ent.yr]||[])[+ent.mo],mn=multiNeed(),nm=id=>{const l=id&&m?m.liq[+id.slice(4)]:null;return l?(l.c||'').trim():'';};
  const tot=ent.multi.reduce((a,x)=>a+x.amt*rateC(x.cur||entCur(),m),0);
  let h='<div class="k">Se guardarán '+ent.multi.length+' gastos</div>'+mn.rows.map(r=>'<div class="pvl"><b>'+esc((r.it.cur||entCur())+' '+num2(r.it.amt))+'</b><span>'+esc(r.it.name||'Sin descripción')+'</span>'+(r.it.ant?'<span class="k">· Antojo</span>':'')+(nm(r.id)?'<span class="k">· '+esc(nm(r.id))+'</span>':'')+'</div>').join('')+'<div class="pvm"><span class="k">Total</span> <b>'+esc(fmt(Math.round(tot*100)/100))+'</b></div>';
  if(ent.multi.some(it=>!it.src))h+='<div class="pvf"><span class="k">Cuenta de los que no la dicen</span><div class="grp" role="radiogroup" aria-label="Cuenta">'+chipH(srcList('No descontar').map(x=>[x[0],x[1].split(' · ')[0]]),ent.src||'','aacct',true)+'</div></div>';
  if(mn.sinCuenta)h+='<div class="ms err" role="status">Elige la cuenta de los que no la dicen.</div>';
  if(mn.bad.length)h+='<div class="sshort on" style="display:grid;margin-top:8px"><div class="sst"><span aria-hidden="true">⚠</span><span>No te alcanza el saldo</span></div>'+mn.bad.map(b=>'<div><span>'+esc(b.name||'Esa cuenta')+'</span> <span class="k">tiene</span> <b>'+esc(fmtC('liq',b.bal))+'</b> · <span class="k">estos gastos</span> <b>'+esc(fmtC('liq',b.need))+'</b></div>').join('')+(cfg.bloquearNeg?'<div class="k">Tu configuración no permite dejar una cuenta en negativo.</div>':'')+'</div>';
  const sv=document.querySelector('#sheet [data-s="save"]');if(sv){sv.textContent='Guardar '+ent.multi.length+' gastos';sv.disabled=!!(cfg.bloquearNeg&&mn.bad.length);sv.classList.toggle('warn',!!mn.bad.length&&!cfg.bloquearNeg);if(mn.bad.length&&!cfg.bloquearNeg)sv.textContent='Guardar igual';}
  return h;
}
function saveMulti(){
  const g=id=>document.getElementById(id),m=S[ent.yr][+ent.mo],mo=+ent.mo,mn=multiNeed();
  if(mn.sinCuenta){const d=g('sdest');if(d){d.textContent='Elige de qué cuenta sale lo que no dice cuenta.';d.classList.add('err');}return;}
  if(cfg.bloquearNeg&&mn.bad.length){const d=g('sdest');d.textContent='No te alcanza el saldo de esa cuenta.';d.classList.add('err');return;}
  const day=Math.max(1,Math.min(31,+g('sday').value||ent.day)),fch=day+'-'+ABR[mo].toLowerCase(),hBefore=dv(m).hor,us=[];
  mn.rows.forEach(r=>{const u=addRow(ent.yr,mo,r.it.sec,row(r.it.name||'Sin descripción',r.it.amt,fch,catDeFila(r.it),r.id));if(r.it.ant&&r.it.sec==='hor')u.r.t='ant';{const cc=r.it.cur||ent.cur;if(cc&&cc!==curOf(r.it.sec))u.r.cur=cc;}applyDed(m,u.r,r.it.sec);us.push(u);});
  try{localStorage.setItem(KEY+'-src',mn.rows[mn.rows.length-1].id);}catch(e){}
  track('reg_guardar','auto:multi');ent.saved=1;save();
  const tot=ent.multi.reduce((a,x)=>a+x.amt*rateC(x.cur||entCur(),m),0),n=ent.multi.length;
  closeSheet();render();toast('Guardados '+n+' gastos · '+fmt(Math.round(tot*100)/100)+hormAlert(hBefore,dv(m).hor,'hor'),{fn:()=>{us.slice().reverse().forEach(u=>{const mm=S[u.yr][u.mi],arr=mm[u.sec],k=arr.indexOf(u.r);if(k<0)return;if(u.r.src)revDed(mm,u.r);if(u.rep)arr[k]=row();else arr.splice(k,1);if(!arr.length)arr.push(row());});}});
}
function updateAuto(){
  const sh=document.getElementById('sheet');if(!sh||sh.dataset.mode!=='auto'||!ent)return;
  const g=id=>document.getElementById(id),pv=g('sapv'),amt=parseMonto(g('sa').value);
  if(!(amt>0)){pv.innerHTML='<div class="ms">Di o escribe: <b>concepto, precio, moneda y cuenta</b>.</div><div class="ms">Por ejemplo: «almuerzo 25 soles yape», «uber 12 dólares plin» o «café 4 euros efectivo».</div><div class="ms">También sirve: «ayer taxi quince plin» o «almuerzo 25 y taxi 12».</div>';return;}
  const src=(srcList(false).find(x=>x[0]===ent.src)||[])[1]||'';
  const fchH=ent.ago?'<div class="pvm"><span>'+(ent.ago===1?'Ayer':ent.ago===2?'Anteayer':'Fecha del mensaje')+'</span> · <span class="k">'+ent.day+' '+ABR[+ent.mo].toLowerCase()+'</span></div>':'';
  if(ent.multi&&ent.multi.length>1){const cm=[...new Set(ent.multi.map(it=>{if(it.ant||!(it.sec==='hor'||it.sec==='fij'))return'';const s=catSugiere(it.name);return s?GLAB[s.g]:'';}).filter(Boolean))];pv.innerHTML=multiHtml()+(cm.length?'<div class="pvm"><span class="k">Grupos</span> · <span>'+esc(cm.join(', '))+'</span></div>':'')+fchH;return;}
  const esIngGasto=ent.t==='hor'||ent.t==='fij'||ent.t==='ing',cur=entCur();
  const chipsPago=ent.t==='pago'?'<div class="pvf"><span class="k">Sale de</span><div class="grp" role="radiogroup" aria-label="Cuenta">'+chipH(srcList(false).filter(x=>x[0].slice(0,4)==='liq:').map(x=>[x[0],x[1].split(' · ')[0]]),ent.src||'','aacct',true)+'</div>'+(!ent.src?'<div class="ms err" role="status">Elige de qué cuenta sale.</div>':'')+'</div>':'';
  const chips=chipsPago||(esIngGasto?'<div class="pvf"><span class="k">Moneda</span><div class="grp" role="radiogroup" aria-label="Moneda">'+chipH([['S/','Soles (S/)'],['$','Dólares ($)'],['€','Euros (€)']],cur,'acur',true)+'</div></div>'
    +'<div class="pvf"><span class="k">'+(ent.t==='ing'?'Entra a':'Sale de')+'</span><div class="grp" role="radiogroup" aria-label="Cuenta">'+chipH(srcList(ent.t==='ing'?'No sumar a ninguna cuenta':'No descontar').map(x=>[x[0],x[1].split(' · ')[0]]),ent.src||'','aacct',true)+'</div>'+(!ent.src&&ent.t!=='ing'?'<div class="ms err" role="status">Elige de qué cuenta sale.</div>':'')+'</div>':'');
  const conv=(esIngGasto&&cur!=='S/')?'<div class="pvm"><span class="k">Equivale a</span> <b>'+esc(fmt(Math.round(amt*rateC(cur,S[ent.yr][+ent.mo])*100)/100))+'</b> <span class="k">al tipo de cambio del mes</span></div>':'';
  pv.innerHTML='<div class="k">Se guardará así</div><div class="pvl"><b>'+esc(cur+' '+num2(amt))+'</b><span>'+esc(g('sd').value.trim()||'Sin descripción')+'</span></div>'+conv+chips+catAutoHtml()+'<div class="pvm"><span>'+esc((ent.t==='hor'&&ent.ant?'Antojo':(SUBN[ent.t]||['Movimiento'])[0]))+'</span>'+((ent.t==='compra'||ent.t==='pago')&&ent.card?' · <span>'+esc(BANKN[ent.card]||'')+'</span>':'')+'</div>'+fchH;
}
function closeSheet(){
  vozStop();
  {const sh=document.getElementById('sheet');if(sh&&sh.dataset.mode&&ent&&!ent.saved){const sa0=document.getElementById('sa'),con=sa0&&parseMonto(sa0.value)>0?':monto':':vacio',base=sh.dataset.quick?'rapido':sh.dataset.mode==='ask'?'elegir':sh.dataset.mode==='auto'?'auto':'manual:'+(sh.dataset.step||'completo');track('reg_abandono',(base==='auto'||base==='rapido'||base==='manual:form')?base+con:base);}}
  ['sheet','sheetbg'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove();});
  if(sheetFrom&&sheetFrom.focus&&document.body.contains(sheetFrom))sheetFrom.focus();sheetFrom=null;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('sheet')&&!e.defaultPrevented)closeSheet();});
function saveSheet(more){
  if(!document.getElementById('sa')||!ent)return;
  adoptForSheet();
  {const sh0=document.getElementById('sheet');if(sh0&&sh0.dataset.mode==='auto'&&ent.multi&&ent.multi.length>1){saveMulti();return;}}
  {const sh0=document.getElementById('sheet');if(sh0&&sh0.dataset.mode==='auto'&&(ent.t==='hor'||ent.t==='fij'||ent.t==='pago')&&!ent.src&&!(ent.multi&&ent.multi.length>1)&&parseMonto(document.getElementById('sa').value)>0){const d=document.getElementById('sdest');if(d){d.textContent='Elige de qué cuenta sale.';d.classList.add('err');}track('auto_fallback','sin_cuenta');return;}}
  {const sh0=document.getElementById('sheet');if(sh0&&sh0.dataset.mode==='auto'){const t0=ent.t;if(((t0==='hor'||t0==='fij')&&!ent.src)||(t0==='aho'&&!ent.from)||!(parseMonto(document.getElementById('sa').value)>0)){track('auto_fallback',!(parseMonto(document.getElementById('sa').value)>0)?'sin_monto':'sin_cuenta');setMode('manual');}}}
  const g=id=>document.getElementById(id),amt=parseMonto(g('sa').value);
  const t=ent.t,gasto=t==='hor'||t==='fij',compra=t==='compra',pago=t==='pago';
  const err=t2=>{g('sdest').textContent=t2;g('sdest').classList.add('err');};
  if(!(amt>0)&&!(t==='aho'&&ent.ax==='aj'&&amt>=0)){err(g('sa').value.trim()&&Number.isNaN(amt)?'No entiendo ese monto. Escríbelo así: 1,200.50 o 25.':(t==='aho'&&ent.ax==='aj'?'Escribe el saldo real de la cuenta.':'Escribe el monto para guardar.'));g('sa').focus();return;}
  const spl=splitOk();
  if(cfg.bloquearNeg&&!spl&&shortInfo()){err('No te alcanza el saldo de esa cuenta.');return;}
  if(t==='aho'){
    if(ent.ax==='mov'){
      if(!ent.from||!ent.to){err('Elige desde y hacia qué cuenta mueves el dinero.');return;}
      if(ent.from===ent.to){err('Elige dos cuentas distintas.');return;}
      if(ent.to==='aho:+'&&!g('sd').value.trim()){err('Escribe el nombre de la cuenta nueva.');g('sd').focus();return;}
    }else{
      if(!ent.from){err('Elige la cuenta.');return;}
      if(ent.from==='aho:+'&&!g('sd').value.trim()){err('Escribe el nombre de la cuenta nueva.');g('sd').focus();return;}
    }
  }
  const errSrc=t2=>{err(t2);const x=g('ssrcmsg');if(x){x.textContent=t2;x.hidden=false;}g('ssrcw').scrollIntoView({block:'center'});};
  if(gasto&&!ent.src){errSrc('Elige de dónde sale el gasto, o «No descontar».');return;}
  {const q=document.getElementById('sheet');if(q&&q.dataset.quick&&!ent.src&&(t==='ing'||(t==='aho'&&(ent.ax==='dep'||ent.ax==='ret')))){errSrc('Elige una cuenta, o la opción de no mover dinero.');return;}}
  if((compra||pago)&&!ent.card){err('Elige la tarjeta.');return;}
  if(pago&&(!ent.src||ent.src==='none')){errSrc('Elige con qué pagas la tarjeta.');return;}
  const m=S[ent.yr][+ent.mo],mo=+ent.mo,desc=g('sd').value.trim(),day=Math.max(1,Math.min(31,+g('sday').value||ent.day)),fch=day+'-'+ABR[mo].toLowerCase();
  /* Se guarda el grupo; al editar sin cambiarlo se conserva la palabra que ya tenía la fila */
  if(gasto)ent.cat=(ent.k0!==undefined&&(catG(ent.k0)||(ent.t==='fij'?'need':'want'))===grpSel())?ent.k0:GNOM[grpSel()];
  const editing=!!ent.edit;if(editing)delMov(S[ent.edit.yr][ent.edit.mo],ent.edit.s,ent.edit.i);
  const hBefore=dv(m).hor;let u,msg;
  const withCur=o=>{const c=ent.cur;if(c&&c!==curOf(o.sec))o.r.cur=c;return o;};
  if(t==='aho'){
    const r0=ahoDo({yr:ent.yr,mo,ax:ent.ax||'dep',from:ent.from,to:ent.to,amt,desc,fch,goal:ent.g,src:ent.src,cur:ent.cur});
    msg=r0.msg;u=r0.u;
    try{if(ent.from&&ent.from!=='aho:+')localStorage.setItem(KEY+'-ahoacct',ent.from.slice(4));}catch(e){}
  }else if(compra){
    u=withCur(addRow(ent.yr,mo,ent.card,row(desc||'Compra',amt,fch,'')));
    msg='Compra en '+BANKN[ent.card]+' · '+curOf(ent.card)+' '+num2(amt)+' · deuda '+fmtC(ent.card,cardDebt(m,ent.card));
  }else if(pago){
    if(spl){
      const nm='Pago '+BANKN[ent.card];
      const u1=withCur(addRow(ent.yr,mo,'fij',row(nm,spl.part,fch,'Pago tarjeta',ent.src,ent.card)));const d1=applyDed(m,u1.r,'fij');
      const u2=withCur(addRow(ent.yr,mo,'fij',row(nm,spl.rest,fch,'Pago tarjeta',spl.to,ent.card)));const d2=applyDed(m,u2.r,'fij');
      u={fn:()=>{undoRow(u2);undoRow(u1);}};
      msg='Pago de '+BANKN[ent.card]+' · '+curOf('fij')+' '+num2(amt)+' dividido: '+num2(spl.part)+d1+' y '+num2(spl.rest)+d2+' · deuda '+fmtC(ent.card,cardDebt(m,ent.card));
    }else{
      u=withCur(addRow(ent.yr,mo,'fij',row('Pago '+BANKN[ent.card],amt,fch,'Pago tarjeta',ent.src,ent.card)));
      const dd=applyDed(m,u.r,'fij');
      msg='Pago de '+BANKN[ent.card]+' · '+curOf('fij')+' '+num2(amt)+dd+' · deuda '+fmtC(ent.card,cardDebt(m,ent.card));
    }
  }else{
    const sec=t,marca=r=>{if(t==='hor'){if(ent.ant)r.t='ant';if(typeof ent.vp==='number')r.v=ent.vp;}return r;};
    if(spl&&gasto){
      const nm=desc||'Sin descripción',cl=gasto?ent.cat:'';
      const u1=withCur(addRow(ent.yr,mo,sec,row(nm,spl.part,fch,cl,ent.src)));const d1=applyDed(m,u1.r,sec);
      const u2=withCur(addRow(ent.yr,mo,sec,row(nm,spl.rest,fch,cl,spl.to)));const d2=applyDed(m,u2.r,sec);
      marca(u1.r);marca(u2.r);u={fn:()=>{undoRow(u2);undoRow(u1);}};
      msg='Guardado en '+SECN[sec]+' · '+entCur()+' '+num2(amt)+' dividido: '+num2(spl.part)+d1+' y '+num2(spl.rest)+d2;
    }else{
      u=withCur(addRow(ent.yr,mo,sec,row(desc||'Sin descripción',amt,fch,gasto?ent.cat:(t==='aho'?(ent.g||''):''),(gasto||t==='ing')?ent.src:'')));
      marca(u.r);const dd=(gasto||t==='ing')?applyDed(m,u.r,sec):'';
      msg='Guardado en '+SECN[sec]+' · '+entCur()+' '+num2(amt)+dd;
    }
  }
  try{localStorage.setItem(KEY+'-tipo',t);const sm=JSON.parse(localStorage.getItem(KEY+'-sub')||'{}');sm[grpOf(t)]=t;localStorage.setItem(KEY+'-sub',JSON.stringify(sm));if((gasto||pago)&&ent.src&&ent.src.slice(0,4)==='liq:')localStorage.setItem(KEY+'-src',ent.src);if(t==='ing'&&ent.src&&ent.src.slice(0,4)==='liq:')localStorage.setItem(KEY+'-srcing',ent.src);if(compra||pago)localStorage.setItem(KEY+'-card',ent.card);}catch(e){}
  if(gasto&&!editing&&g('srec')&&g('srec').checked){const c0=(desc||'').trim();if(c0&&!(cfg.rec||[]).some(r=>(r.c||'').trim().toLowerCase()===c0.toLowerCase())){cfg.rec=cfg.rec||[];cfg.rec.push({sec:t,s:t,c:c0,m:amt,k:ent.cat||'',src:(ent.src&&ent.src.slice(0,4)==='liq:')?ent.src:'none',f:day});}}
  {const sh2=document.getElementById('sheet'),md=sh2?(sh2.dataset.quick?'rapido':sh2.dataset.mode==='auto'?'auto':(sh2.dataset.wiz?'pasos':'completo')):'';track('reg_guardar',md+':'+t+(editing?':edicion':''));if(gasto&&!editing&&g('srec')&&g('srec').checked)track('atajo','crear');ent.saved=1;}
  save();
  msg+=(mo!==view||ent.yr!==year?' · '+MES[mo]:'')+hormAlert(hBefore,dv(m).hor,t==='hor'?'hor':'');
  if(more&&!editing){g('sa').value='';g('sd').value='';g('smsg').value='';ent.multi=null;ent.d0=null;ent.ant=0;ent.vp=null;ent.cat='';ent.grp='';ent.src='';ent.g='';ent.from='';ent.to='';ent.split=null;ent.cst=null;ent.ckm=null;ent.catTocada=0;ent.clsManual=0;ent.srcTocada=0;if(g('sheet').dataset.quick)qkEntra();else syncSheet();g('sa').focus();}else closeSheet();
  render();toast(editing?('Movimiento actualizado · '+msg):msg,editing?null:u,!editing&&u&&u.r&&u.sec==='hor'&&u.r.t==='ant'&&typeof u.r.v!=='number');
}
function sheetClick(e){
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.g!==undefined){const gr=GRUPOS.find(x=>x[0]===d.g);if(!gr)return;let last='';try{last=(JSON.parse(localStorage.getItem(KEY+'-sub')||'{}'))[d.g]||'';}catch(e){}if(gr[3].indexOf(ent.t)<0){ent.t=gr[3].indexOf(last)>=0?last:(d.g==='gasto'?'hor':gr[3][0]);ent.cat='';if(document.getElementById('sheet').dataset.quick){ent.src='';ent.srcTocada=0;ent.ant=0;}presetSrc();if(document.getElementById('sheet').dataset.quick){qkRecuerda();qkDeduce();}}syncSheet();}
  else if(d.t){const qk=!!document.getElementById('sheet').dataset.quick,pc=ent.cat;if(d.t==='ant'){ent.t='hor';ent.ant=1;}else{ent.t=d.t;ent.ant=0;}ent.clsManual=1;ent.cat='';if(!qk)ent.catTocada=0;ent.grp=d.t==='ant'?'want':'';if(qk){if(ent.ant)ent.catTocada=0;else if(ent.catTocada)ent.cat=pc;else catAuto(document.getElementById('sd').value);}presetSrc();syncSheet();}
  else if(b.id==='scur'){const lst=['S/'].concat(cfg.monedas||[]),i=lst.indexOf(entCur());ent.cur=lst[(i+1)%lst.length];syncSheet();}
  else if(d.ax!==undefined){ent.ax=d.ax;ent.to='';if(d.ax==='ret'&&ent.from==='aho:+')ent.from='';syncSheet();}
  else if(d.from!==undefined){ent.from=d.from;syncSheet();}
  else if(d.to!==undefined){ent.to=d.to;syncSheet();}
  else if(d.b){ent.card=d.b;ent.cardTocada=1;syncSheet();}
  else if(d.rec1!==undefined){const r=(cfg.rec||[])[+d.rec1];if(!r)return;track('atajo','usar');
    const sdE=document.getElementById('sd'),saE=document.getElementById('sa');
    ent.t=r.s==='fij'?'fij':'hor';ent.clsManual=1;sdE.value=r.c;saE.value=String(r.m);if(r.k){ent.cat=r.k;ent.catTocada=1;}
    if(r.src&&r.src!=='none'&&srcList(true).some(x=>x[0]===r.src))ent.src=r.src;
    syncSheet();
    if(ent.src&&ent.src!=='none'){if(shortInfo()){const sh=document.getElementById('sheet');if(sh&&sh.dataset.wiz)wizGo('form');return;}saveSheet(false);return;}
    saE.focus();try{saE.select();}catch(e){}}
  else if(d.src!==undefined){ent.src=d.src;ent.srcTocada=1;syncSheet();}
  else if(d.meta!==undefined){ent.g=ent.g===d.meta?'':d.meta;syncSheet();}
  else if(d.ssplit!==undefined){const si=shortInfo();ent.split=(d.ssplit&&si&&si.sp)?{to:d.ssplit,key:ent.src+'|'+si.amt}:null;negWarn();}
  else if(b.id==='smic'){vozStart();}
  else if(d.vozok!==undefined){const bx=document.getElementById('smicok');if(bx)bx.hidden=true;if(d.vozok==='1'){try{localStorage.setItem('cuadra-voz','1');}catch(e){}vozStart();}else{const m=document.getElementById('smsg');if(m)m.focus();}}
  else if(d.aacct!==undefined){ent.src=d.aacct;syncSheet();const x=document.querySelector('#sapv [data-aacct="'+d.aacct+'"]');if(x)x.focus();}
  else if(d.acur!==undefined){ent.cur=d.acur;ent.autoCur=0;syncSheet();const x=document.querySelector('#sapv [data-acur="'+d.acur+'"]');if(x)x.focus();}
  else if(d.sgrp!==undefined){ent.grp=d.sgrp;ent.cat=GNOM[d.sgrp];ent.catTocada=1;const box=b.closest('#sqk,#sapv,#scat');syncSheet();if(box){const x=document.querySelector('#'+box.id+' [data-sgrp="'+d.sgrp+'"]');if(x)x.focus();}}
  else if(d.sfix!==undefined){ent[d.sfld==='from'?'from':'src']=d.sfix;syncSheet();{const sh=document.getElementById('sheet');if(sh&&sh.dataset.step==='form')wizSum();}}
  else if(d.wz!==undefined){if(d.wz==='back')wizBack();else if(d.wz==='chg')wizGo(wizFlow()[0]);}
  else if(d.mode!==undefined)setMode(d.mode,d.mode==='manual'&&document.getElementById('sheet').dataset.mode==='ask');
  else if(d.s==='close')closeSheet();
  else if(d.s==='save')saveSheet(false);
  else if(d.s==='del-mov'){if(ent.edit){{const yr=ent.edit.yr,mo=ent.edit.mo,sec=ent.edit.s,mm=S[yr][mo],snap=JSON.stringify({[sec]:mm[sec],liq:mm.liq});delMov(mm,sec,ent.edit.i);save();closeSheet();render();toast('Movimiento eliminado',{fn:()=>{Object.assign(S[yr][mo],JSON.parse(snap));}});}}}
  else if(d.s==='more')saveSheet(true);
}
/* «ayer» / «anteayer» en la frase mueven la fecha del movimiento; al quitarlas vuelve a la fecha con la que se abrió. */
function aplicarFecha(ago){
  if(!ent)return;const g=id=>document.getElementById(id);
  if(!ent.d0)ent.d0={yr:ent.yr,mo:+ent.mo,day:ent.day};
  let yr=ent.d0.yr,mo=ent.d0.mo,day=ent.d0.day;
  if(ago>0){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-ago);if(S[String(d.getFullYear())]){yr=String(d.getFullYear());mo=d.getMonth();day=d.getDate();}else ago=0;}
  ent.yr=yr;ent.mo=mo;ent.day=day;ent.ago=ago;
  if(g('smo'))g('smo').value=mo;if(g('syr'))g('syr').value=yr;if(g('sday'))g('sday').value=day;
}
function sheetInput(e){
  const t=e.target,g=id=>document.getElementById(id);
  if(t.id==='smsg'){if(!g('sa')||!g('sd'))return;/* el dictado puede llegar cuando la ventana ya cambió de modo o se cerró */const mm=(S[ent.yr]||[])[+ent.mo]||{liq:[]},p=parseMsg(t.value,(mm.liq||[]).map(r=>(r.c||'').trim()));ent.multi=null;
    if(!p){g('sa').value='';g('sd').value='';aplicarFecha(0);if(!ent.catTocada)ent.cat='';syncSheet();}
    if(p){const sec0=ent.lock||p.sec;if((sec0==='compra'||sec0==='pago')&&p.card)ent.card=p.card;g('sa').value=String(p.amt);g('sd').value=p.name;ent.t=sec0;ent.ant=(sec0==='hor'&&p.ant)?1:0;
      if(sec0==='aho'){g('sd').value='';ent.ax=ent.ax||'dep';const low=t.value.toLowerCase(),ac=ahoAccts(ent.yr,+ent.mo).find(x=>low.indexOf(x.c.toLowerCase())>=0);if(ac)ent.from='aho:'+ac.c;}
      const srcId=w=>{if(!w)return'';const wl=normTxt(w),ls=srcList().filter(x=>x[0].slice(0,4)==='liq:'),nm=x=>normTxt(x[1].split(' · ')[0]);const li=ls.find(x=>nm(x)===wl)||ls.find(x=>nm(x).indexOf(wl)===0);return li?li[0]:'';};
      const sid=srcId(p.pay);if(sec0==='hor'||sec0==='fij'||sec0==='ing'||sec0==='pago')ent.src=sid;
      if(p.cur){ent.cur=p.cur;ent.autoCur=1;}else if(ent.autoCur){ent.cur='';ent.autoCur=0;}
      aplicarFecha(p.ago||ent.agoMsg||0);
      if(p.multi&&!ent.lock){ent.multi=p.multi.map(it=>Object.assign({},it,{src:srcId(it.pay)}));ent.cur='';ent.autoCur=0;}
      catAuto(p.name);syncSheet();}}
  else if(t.id==='sa'){if(ent.t==='aho')syncSheet();else{negWarn();pagoMas();}}
  else if(t.id==='smo'){ent.mo=+t.value;ent.src='';ent.from='';ent.to='';presetSrc();syncSheet();}
  else if(t.id==='syr'){ent.yr=t.value;ent.src='';ent.from='';ent.to='';presetSrc();syncSheet();}
  else if(t.id==='sd'){if(g('sheet').dataset.quick){qkDeduce();syncSheet();}else if(autoCls(t.value))syncSheet();}
  else if(t.id==='sday'){ent.day=+t.value||1;const su=g('smsum');if(su)syncSheet();}
}
function openSheet(ask){
  closeSheet();closePanel();sheetFrom=document.activeElement;
  const mi=(typeof view!=='number')?(year===String(now.getFullYear())?now.getMonth():0):view;
  ent={t:'hor',ax:'dep',card:'bbva',cat:'',src:'',g:'',from:'',to:'',cur:'',mo:mi,yr:year,day:now.getDate()};
  const bg=document.createElement('div');bg.id='sheetbg';bg.className='sheetbg';
  const sh=document.createElement('div');sh.id='sheet';sh.className='sheet';
  sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Nuevo movimiento');sh.dataset.mode=ask?'ask':'manual';if(ask)sh.dataset.ch='1';
  sh.innerHTML=`<div class="sh-h"><b>Nuevo movimiento</b><button type="button" data-s="close" aria-label="Cerrar">×</button></div>
  <div class="swnav" id="swnav"><button type="button" class="lnk" data-wz="back">← Atrás</button></div>
  <div class="swq" id="swq"></div>
  <label class="sr" for="smsg">Escribe rápido</label><div id="smwrap"><div class="smrow"><input id="smsg" type="text" placeholder="Escribe o dicta: almuerzo 25 soles yape" autocomplete="off"><button type="button" id="smic" class="smic" aria-pressed="false" aria-label="Dictar" title="Dictar con tu voz"${SR_OK?'':' hidden'}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button></div>
    <div class="ms" id="smicst" role="status" aria-live="polite"></div>
    <div class="smicok" id="smicok" hidden><div>Al dictar, el audio lo procesa el servicio de voz de tu navegador (por ejemplo, Google en Chrome o Apple en Safari). MiS²oles no recibe ni guarda el audio: solo el texto, que tú revisas antes de guardar.</div><div class="srow"><button type="button" class="b p" data-vozok="1">Entendido, dictar</button><button type="button" class="b" data-vozok="0">Ahora no</button></div></div></div>
  <div class="sapv" id="sapv" role="status"></div>
  <div class="grp" id="ssug" aria-label="De siempre"></div>
  <div class="swsum" id="swsum"></div>
  <div class="amt" id="samt"><span class="amt-cur" id="samtcur" aria-hidden="true">S/</span><input id="sa" type="text" inputmode="decimal" placeholder="0.00" aria-label="Monto" autocomplete="off"><button type="button" id="scur" class="curbtn" aria-label="Cambiar moneda" title="Toca para cambiar la moneda">S/</button></div>
  <div class="sshort" id="sshort" role="alert"></div>
  <div class="sprev" id="sprev" role="status" hidden></div>
  <label class="fld" id="sdlbl">Concepto<input id="sd" type="text" placeholder="¿En qué fue?" autocomplete="off"></label>
  <div class="grp" role="radiogroup" aria-label="Tipo de movimiento" id="stype"></div>
  <div class="grp" role="radiogroup" aria-label="Clase" id="ssub" hidden></div>
  <div class="grp" role="radiogroup" aria-label="Qué haces con tu ahorro" id="sax" hidden></div>
  <div class="grp" role="radiogroup" aria-label="Tarjeta" id="sbank" hidden></div>
  <div id="smovw" hidden><div class="ms" id="sfromlbl" style="margin-bottom:6px">Cuenta</div><div class="grp" role="radiogroup" aria-label="Cuenta" id="sfrom"></div><div id="stow" hidden><div class="ms" style="margin:10px 0 6px">Hacia</div><div class="grp" role="radiogroup" aria-label="Hacia" id="sto"></div></div></div>
  <div id="sgrpw" hidden><div class="grp" role="radiogroup" aria-label="Grupo del gasto" id="sgrp"></div></div>
  <div id="ssrcw" hidden><div class="ms" id="ssrclbl" style="margin-bottom:6px">¿De dónde sale este gasto?</div><div class="grp" role="radiogroup" aria-label="De dónde sale" id="ssrc"></div><div class="sdest err" id="ssrcmsg" hidden></div></div>
  <div id="sqk"></div>
  <details class="smore" id="smore"><summary>Más detalles <span id="smsum"></span></summary>
  <label class="chk" id="srecw" hidden><input type="checkbox" id="srec"> Repetir cada mes y dejarlo como atajo</label>
  <div id="scatw" hidden><div class="ms" style="margin-bottom:6px">Grupo</div><div class="grp" role="radiogroup" aria-label="Grupo del gasto" id="scat"></div></div>
  <div id="sgoalw" hidden><div class="ms" style="margin-bottom:6px">Meta (opcional)</div><div class="grp" role="radiogroup" aria-label="Meta de ahorro" id="sgoal"></div></div>
  <div class="srow"><label class="fld">Mes<select id="smo">${MES.map((m,i)=>`<option value="${i}"${i===+ent.mo?' selected':''}>${m}</option>`).join('')}</select></label>
  <label class="fld">Año<select id="syr">${YEARS.map(y=>`<option${y===ent.yr?' selected':''}>${y}</option>`).join('')}</select></label>
  <label class="fld">Día<input id="sday" type="number" min="1" max="31" inputmode="numeric" value="${ent.day}"></label></div>
  </details>
  <div class="sdest" id="sdest" role="status"></div>
  <div class="sdest" id="spagox" role="status" hidden></div>
  <div class="sact" id="sact"><button class="b" type="button" data-s="more">Guardar y agregar otro</button><button class="b p" type="button" data-s="save">Guardar</button></div>
  <div class="smodes" id="smodes"><div class="ms">¿Cómo quieres registrar?</div><div class="ms qko">¿Prefieres otra forma de registrar?</div>
    <button type="button" class="modeb" data-mode="manual"><b>Manual</b><span>Eliges el tipo, la cuenta y escribes el monto</span></button>
    <button type="button" class="modeb" data-mode="auto"><b>Automático</b><span>Escribes o dictas una frase y la app la llena</span></button></div>
  <button type="button" class="lnk" id="smodesw" data-mode="auto">Cambiar a automático</button>`;
  document.body.append(bg,sh);presetSrc();syncSheet();
  bg.addEventListener('click',closeSheet);sh.addEventListener('click',e=>{const st=wizClickStep(e);sheetClick(e);if(st)wizAdvance(st);});sh.addEventListener('input',sheetInput);
  sh.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();if(!e.repeat&&(!sh.dataset.wiz||sh.dataset.step==='form'))saveSheet(false);}else if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();if(e.target.id==='scn'){const bt=sh.querySelector('[data-scatnew]');if(bt)bt.click();}else if(e.target.id==='sa'&&sh.dataset.quick&&!document.getElementById('sd').value.trim())document.getElementById('sd').focus();else saveSheet(false);}else if(e.key==='Escape')closeSheet();});
  track('reg_abrir',ask?'elegir':'directo');
  if(ask&&(cfg.modoReg==='auto'||cfg.modoReg==='manual')){const pf=cfg.modoReg;queueMicrotask(()=>{const s=document.getElementById('sheet');if(s!==sh||sh.dataset.mode!=='ask'||!ent)return;const md=(pf==='auto'&&!ent.lock)?'auto':'manual';setMode(md,md==='manual');});}
  if(ask){const b0=sh.querySelector('[data-mode="manual"]');if(b0)b0.focus();queueMicrotask(()=>{if(document.getElementById('sheet')===sh&&sh.dataset.mode==='ask'&&ent){qkEntra();track('reg_modo','rapido');}});}else document.getElementById('sa').focus();
}
/* Compartir a MiS²oles (Android, app instalada): sw.js recibe el texto sin enviarlo a ningún servidor y lo deja unos minutos en este dispositivo.
   Aquí se lee, se borra y se abre Automático para revisar: nunca se guarda solo. */
const SHARE_CACHE='misoles-share',SHARE_URL='./__compartido',SHARE_TTL=15*60*1000;
async function shareTomar(){
  try{
    if(!('caches' in window)||!(await caches.has(SHARE_CACHE)))return'';
    const c=await caches.open(SHARE_CACHE),r=await c.match(SHARE_URL);if(!r)return'';
    const o=await r.json();await c.delete(SHARE_URL);
    return o&&typeof o.x==='string'&&Date.now()-o.t<SHARE_TTL?o.x.slice(0,600).trim():'';
  }catch(e){return'';}
}
const shareTitulo=x=>x===x.toUpperCase()?x.toLowerCase().replace(/(^|\s)\p{L}/gu,u=>u.toUpperCase()):x;
function shareConcepto(t,monto,ing){
  const limpia=x=>{x=String(x||'').split(/[.;:](?:\s|$)/)[0].split(/[ \t](?:por|el|con|fecha|hora|s)(?=[ \t]|$)/i)[0].replace(/[\d*]+/g,' ').replace(/[\s.,:;-]+$/,'').replace(/\s+/g,' ').trim();return x.length>=2&&!/^(?:tu|su|mi|la|el|las|los|un|una|cuenta|tarjeta|fecha|hora|yape|plin|bcp|bbva|interbank)$/i.test(x)?shareTitulo(x):'';};
  const et=/(?:comercio|establecimiento|beneficiario|destinatario|destino|remitente|origen)\s*:?[ \t]+([^\n.,;]{2,40})/i.exec(t);if(et&&limpia(et[1]))return limpia(et[1]);
  const nom="((?:\\p{Lu}[\\p{L}\\d&.'*-]*[ \\t]*)+)";
  if(ing){const m=new RegExp("(\\p{Lu}[\\p{L}.']*(?:[ \\t]+\\p{Lu}[\\p{L}.']*)*)[ \\t]+te[ \\t]+(?:yape|envi|pag|transfir|deposit|abon)",'u').exec(t);if(m&&limpia(m[1]))return limpia(m[1]);}
  const re=new RegExp('(?<![\\p{L}\\d])'+(ing?'(?:de|desde)':'(?:a|en|para)')+'[ \\t]+'+nom,'u'),m=re.exec(t.slice(monto))||re.exec(t);
  return m?limpia(m[1]):'';
}
function leerCompartido(x,accts){
  const NM='(\\d{1,3}(?:[.,]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)',curDe=w=>/^(?:us|\$|d[oó]lar)/i.test(w)?'$':/^(?:€|eur)/i.test(w)?'€':'S/',hall=[];
  let m,re=new RegExp('(?<![\\p{L}\\d])(S\\/\\.?|PEN|US\\$|USD|\\$|€|EUR)\\s*'+NM,'giu');
  while((m=re.exec(x)))hall.push({i:m.index,e:m.index+m[0].length,amt:parseMonto(m[2]),cur:curDe(m[1])});
  re=new RegExp('(?<![\\d.,])'+NM+'\\s*(soles?|lucas?|d[oó]lares?|usd|euros?)(?![\\p{L}])','giu');
  while((m=re.exec(x)))if(!hall.some(a=>m.index<a.e&&m.index+m[0].length>a.i))hall.push({i:m.index,e:m.index+m[0].length,amt:parseMonto(m[1]),cur:curDe(m[2])});
  hall.sort((a,b)=>a.i-b.i);
  const antes=a=>{const k=hall.indexOf(a),p=k>0?hall[k-1].e:0;return x.slice(Math.max(p,a.i-28),a.i);},buenos=hall.filter(a=>a.amt>0&&!/saldo|disponible|l[ií]nea|comisi[oó]n|m[ií]nimo/i.test(antes(a)));
  if(!buenos.length)return x.length<=60&&/\d/.test(x)&&!/\d[\/-]\d/.test(x)&&!/c[oó]digo|clave|otp/i.test(x)?{frase:x}:{sinMonto:true};
  const pick=buenos.find(a=>/monto|importe|total/i.test(antes(a)))||buenos[0],varios=new Set(buenos.map(a=>a.amt+a.cur)).size>1,nt=normTxt(x);
  const ing=/\bte\s+(?:yape|envi|pag|transfir|deposit|abon)|recibiste|has recibido|\babono\b|abonaron|te llego|(?:deposito|pago|transferencia) recibid/.test(nt);
  const cred=!ing&&/tarjeta\s+(?:de\s+)?credito|\btc\b/.test(nt);
  const card=cred?cardEnTexto(nt):'';
  let pay='';if(!card){(accts||[]).forEach(a=>{const n=normTxt(a).trim();if(n.length>=3&&n.length>normTxt(pay).length&&new RegExp('(?<![\\p{L}\\d])'+escRe(n)+'(?![\\p{L}\\d])','u').test(nt))pay=a.trim();});if(!pay){const w=/\b(yape|plin|efectivo)/.exec(nt);if(w)pay=w[1];}}
  const name=shareConcepto(x,pick.e,ing)||(ing?'Ingreso':card?'Compra':pay?pay.charAt(0).toUpperCase()+pay.slice(1):'Gasto');
  const fij=RULES.find(r=>r[0]==='fij')[1].test(name.toLowerCase());
  let ago=0;{const d=/(?<![\d\/-])(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(?![\d\/-])/.exec(x.slice(0,pick.i)+' '+x.slice(pick.e));
    if(d){const dd=+d[1],mm=+d[2]-1;let yy=d[3]?+d[3]:now.getFullYear();if(yy<100)yy+=2000;let f=new Date(yy,mm,dd);if(!d[3]&&f>now)f=new Date(yy-1,mm,dd);
      if(f.getMonth()===mm&&f.getDate()===dd){const n=Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-f)/864e5);if(n>0&&n<=62)ago=n;}}}
  return{amt:pick.amt,cur:pick.cur,name,sec:ing?'ing':card?'compra':fij?'fij':'hor',card,pay,ago,varios,tarjetaSinBanco:cred&&!card};
}
async function shareAbrir(){
  const x=await shareTomar();if(!x)return false;
  try{
    openSheet(true);setMode('auto');track('atajo','compartir');
    const g=id=>document.getElementById(id),st=g('smicst'),mes=()=>((S[ent.yr]||[])[+ent.mo]||{liq:[]}).liq||[],c=leerCompartido(x,mes().map(r=>(r.c||'').trim()));
    if(c.sinMonto){st.textContent=T('No encontré el monto en lo que compartiste. Escríbelo aquí.')+' «'+x.slice(0,90)+'»';g('smsg').focus();return true;}
    if(c.frase){g('smsg').value=c.frase;g('smsg').dispatchEvent(new Event('input',{bubbles:true}));st.textContent=T('Revisa y guarda.');return true;}
    aplicarFecha(c.ago);ent.agoMsg=c.ago;ent.t=c.sec;ent.ant=0;ent.cur=c.cur;ent.autoCur=1;if(c.card)ent.card=c.card;
    g('sa').value=String(c.amt);g('sd').value=c.name;
    g('smsg').value=c.name+' '+num2(c.amt).replace(/,/g,'')+' '+({'S/':'soles','$':'dólares','€':'euros'})[c.cur]+(c.pay?' '+c.pay:'')+(c.card?' tarjeta '+BANKN[c.card]:'');
    if(c.sec!=='compra'){const w=normTxt(c.pay),ls=srcList().filter(y=>y[0].slice(0,4)==='liq:'),nm=y=>normTxt(y[1].split(' · ')[0]),li=w?(ls.find(y=>nm(y)===w)||ls.find(y=>nm(y).indexOf(w)===0)):null;ent.src=li?li[0]:'';}
    syncSheet();
    st.textContent=T(c.varios?'Encontré varios montos. Revisa que sea el correcto.':c.tarjetaSinBanco?'Parece una compra con tarjeta. Si es así, cámbialo a manual.':'Revisa y guarda.');
    return true;
  }catch(e){return false;}
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='st-on'){try{localStorage.setItem('cuadra-stats',e.target.checked?'1':'0');}catch(x){}}});
document.addEventListener('change',e=>{const m=e.target&&e.target.dataset&&e.target.dataset.cmon;if(!m)return;cfg.monedas=['$','€'].filter(x=>x===m?e.target.checked:(cfg.monedas||[]).indexOf(x)>=0);save();});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='cf-neg'){cfg.bloquearNeg=!!e.target.checked;save();}
  if(e.target&&e.target.id==='atk'){try{localStorage.setItem(ATK,e.target.checked?'1':'0');}catch(x){}render();return;}
  if(e.target&&e.target.name==='modoreg'&&['ask','auto','manual'].indexOf(e.target.value)>=0){cfg.modoReg=e.target.value;save();}
});
document.getElementById('fab').addEventListener('click',()=>{openSheet(true);sheetFrom=document.getElementById('fab');});
(()=>{const f=document.getElementById('fab');let y0=scrollY;addEventListener('scroll',()=>{const y=scrollY,fin=y+innerHeight>=document.documentElement.scrollHeight-80;if(Math.abs(y-y0)<8&&!fin)return;f.classList.toggle('oculto',y>y0&&y>120&&!fin);y0=y;},{passive:true});})();
function openEdit(s,i,mo){
  const mi=(mo==null)?(typeof view==='number'?view:((year===String(now.getFullYear()))?now.getMonth():0)):mo;
  const r=S[year][mi]&&S[year][mi][s]&&S[year][mi][s][i];if(!r)return;
  openSheet();
  let t=s,card='';
  if(s==='fij'&&r.card){t='pago';card=r.card;}
  else if(CARD_ALL.includes(s)){t='compra';card=s;}
  ent.t=t;if(card)ent.card=card;ent.ant=(s==='hor'&&r.t==='ant')?1:0;ent.vp=(s==='hor'&&typeof r.v==='number')?r.v:null;ent.cat=(s==='fij'||s==='hor')?GNOM[grupoDe(s,r)]:'';if(s==='fij'||s==='hor'){ent.k0=r.k||'';ent.catTocada=1;ent.grp=grupoDe(s,r);}ent.g=(s==='aho')?(r.k||''):'';ent.src=r.src||'';ent.cur=r.cur||'';ent.mo=mi;ent.yr=year;ent.day=parseInt(r.f)||ent.day;ent.edit={yr:year,mo:mi,s:s,i:i};
  const g=id=>document.getElementById(id);
  if(s==='aho'){ent.ax=(+r.m<0)?'ret':'dep';ent.from='aho:'+(r.c||'').trim();}g('sa').value=(s==='aho'?Math.abs(+r.m):(+r.m))||'';if(t!=='pago')g('sd').value=(s==='aho')?'':(r.c||'');
  g('smo').value=mi;g('syr').value=year;g('sday').value=ent.day;
  const h=document.querySelector('#sheet .sh-h b');if(h)h.textContent='Editar movimiento';{const shd=document.getElementById('sheet');if(shd)shd.setAttribute('aria-label','Editar movimiento');}
  const more=document.querySelector('#sheet [data-s="more"]');if(more){more.textContent='Eliminar';more.dataset.s='del-mov';more.classList.add('danger');}
  syncSheet();g('sa').focus();try{g('sa').select();}catch(e){}
}
document.addEventListener('keydown',e=>{
  const sh=document.getElementById('sheet');if(!sh)return;
  if(e.key==='Tab'){const f=[...sh.querySelectorAll('button,input,select,textarea,summary,a[href]')].filter(x=>!x.disabled&&x.tabIndex>=0&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(!sh.contains(document.activeElement)){e.preventDefault();a.focus();}else if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}return;}
  const g=e.target.closest&&e.target.closest('.grp[role=radiogroup]');
  if(g&&['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].indexOf(e.key)>=0){const bs=[...g.querySelectorAll('button')],i=bs.indexOf(e.target.closest('button'));if(i<0)return;e.preventDefault();const n=bs[(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+bs.length)%bs.length];n.click();const id=g.id,v=Object.keys(n.dataset)[0],val=n.dataset[v];requestAnimationFrame(()=>{const g2=document.getElementById(id);const nb=g2&&[...g2.querySelectorAll('button')].find(x=>x.dataset[v]===val);if(nb)nb.focus();});}
});
document.addEventListener('click',e=>{const q=e.target.closest('[data-vpq]');if(q&&lastUndo&&lastUndo.r){const u=lastUndo,mm=S[u.yr]&&S[u.yr][u.mi],k=mm?mm.hor.indexOf(u.r):-1;if(k>=0){u.r.v=+q.dataset.vpq;save();render();toast(u.r.v?'Anotado: valió la pena':'Anotado: no valió la pena',u);}return;}if(e.target.closest('[data-undo]')&&lastUndo){const u=lastUndo;lastUndo=null;undoRow(u);toast('Movimiento deshecho');}});

