/* ---------- Detalle de un mes ---------- */
const inp=(s,i,k,v,t,ph)=>`<input id="${s}-${i}-${k}" data-s="${s}" data-i="${i}" data-k="${k}" type="${t}" ${t==='number'?'step="0.01" inputmode="decimal" value="'+esc(v?v:'')+'"':'value="'+esc(v)+'"'} placeholder="${esc(ph)}" aria-label="${esc(ph==='0.00'?'Monto':ph)}">`;
const catSel=(s,i,v)=>`<select class="f" id="${s}-${i}-k" data-s="${s}" data-i="${i}" data-k="k" aria-label="Categoría"><option value="">Categoría</option>${v&&cfg.cats.indexOf(v)<0?`<option selected>${esc(v)}</option>`:''}${cfg.cats.map(c=>`<option${c===v?' selected':''}>${esc(c)}</option>`).join('')}</select>`;
const del=(s,i)=>`<button type="button" class="x" data-del="${s}" data-i="${i}" aria-label="Quitar fila">×</button>`;
const TPL={ing:'1fr 58px 90px 44px',gas:'1fr 88px 112px 58px 44px',aho:'1fr 90px 58px 44px',bnk:'1fr 100px 44px'};
const EDITABLE=['ing','fij','hor','aho','inv'];
const act=(s,i)=>`<div class="rwx">${EDITABLE.indexOf(s)>=0?`<button type="button" class="x ed-row" data-edit="${s}" data-i="${i}" aria-label="Editar fila" title="Editar"><svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>`:''}<button type="button" class="x" data-del="${s}" data-i="${i}" aria-label="Quitar fila">×</button></div>`;
const HEAD={ing:['Concepto','Fecha','Monto',''],gas:['Concepto','Monto','Categoría','Fecha',''],aho:['Cuenta','Saldo','Fecha',''],bnk:['Concepto','Monto','']};
const mInp=(s,i,r,ph)=>{const v=inp(s,i,'m',r.m,'number',ph||'0.00');return (r.cur&&r.cur!==curOf(s))?`<span class="mwrap"><b class="curb" aria-hidden="true">${r.cur}</b>${v}</span>`:v;};
function rowsHtml(m,s,t){return m[s].map((r,i)=>{
  let c='';
  if(t==='ing')c=inp(s,i,'c',r.c,'text','Concepto')+inp(s,i,'f',r.f,'text','Fecha')+mInp(s,i,r);
  else if(t==='gas')c=inp(s,i,'c',r.c,'text','Concepto')+mInp(s,i,r)+catSel(s,i,r.k)+inp(s,i,'f',r.f,'text','Fecha');
  else if(t==='aho')c=inp(s,i,'c',r.c,'text','Cuenta')+mInp(s,i,r)+inp(s,i,'f',r.f,'text','Fecha');
  else c=inp(s,i,'c',r.c,'text','Concepto')+mInp(s,i,r);
  return `<div class="rw${t==='bnk'?'':' r'+t}" style="grid-template-columns:${TPL[t]}">${c}${act(s,i)}</div>`;}).join('');}
const FOLDK=KEY+'-fold';let FOLD={};try{FOLD=JSON.parse(localStorage.getItem(FOLDK))||{};}catch(e){FOLD={};}
const isFold=s=>false;
function secHead(s,title,extra,solid){return `<div class="sh${solid?' solid':''}"><i></i><h2 class="ttl"><span class="fold-t">${title}</span></h2>${extra||''}</div>`;}
const ADDL={ing:'+ Agregar ingreso',fij:'+ Agregar gasto fijo',hor:'+ Agregar gasto cotidiano',inv:'+ Agregar inversión',bbva:'+ Agregar consumo',bcp:'+ Agregar consumo',oh:'+ Agregar consumo',c4:'+ Agregar consumo',c5:'+ Agregar consumo',c6:'+ Agregar consumo',c7:'+ Agregar consumo',c8:'+ Agregar consumo'};
const EMPTYTXT={ing:'Todavía no registras ingresos este mes.',fij:'Sin gastos fijos este mes. En «Cierre de mes» puedes cargar tus recurrentes.',hor:'Sin gastos cotidianos este mes.',inv:'Sin inversiones este mes.'};
function mvList(m,s){
  const rows=(m[s]||[]).map((r,i)=>({r,i})).filter(x=>((x.r.c||'').trim())||+x.r.m);
  if(!rows.length)return `<div class="mv-empty">${EMPTYTXT[s]||'Sin consumos este mes.'}</div>`;
  const out=s==='fij'||s==='hor';
  return '<ul class="mvl">'+rows.map(({r,i})=>{
    const v=+r.m||0,cu=r.cur||curOf(s),l=liqRef(m,r.src);
    const meta=[r.f?esc(r.f):'',r.card?'Pago de '+BANKN[r.card]:(r.k?esc(r.k):''),l?esc((l.c||'').trim()):'',s==='hor'&&r.t==='ant'?'Antojo'+(r.v===1?' · Valió la pena':r.v===0?' · No valió la pena':''):''].filter(Boolean).join(' · ');
    const sg=out?(v>=0?'−':'+'):(v<0?'−':'');
    return `<li><button type="button" class="mvr" data-edit="${s}" data-i="${i}"><span class="sr">Editar: </span><span class="mvc"><span class="mvn">${esc((r.c||'').trim()||'Sin descripción')}</span>${meta?`<span class="mvd">${meta}</span>`:''}</span><span class="mvm">${sg}${cu} ${num2(Math.abs(v))}</span></button></li>`;}).join('')+'</ul>';
}
/* Resumen del ingreso del mes (solo escritorio, en el hueco de la tarjeta Ingresos): a dónde se fue cada sol que entró. */
function ingSumInner(m){
  const D=dv(m);if(!(D.ing>0))return'<div class="ms">Cuando registres un ingreso verás aquí a dónde se fue.</div>';
  const ai=D.aho+D.inv,disp=Math.max(0,D.res),w=v=>Math.max(0,Math.min(100,v/D.ing*100)),p=v=>Math.round(w(v))+'%';
  const row=(c,l,v)=>'<li><span><i style="background:'+c+'"></i>'+l+'</span><b>'+fmt(v)+'</b><span class="dgp">'+p(v)+'</span></li>';
  return '<div class="k">Del ingreso del mes</div><div class="pbar" aria-hidden="true"><span style="width:'+w(D.fij)+'%;background:var(--c-fij)"></span><span style="width:'+w(D.hor)+'%;background:var(--c-hor)"></span><span style="width:'+w(ai)+'%;background:var(--c-aho)"></span></div><ul>'
    +row('var(--c-fij)','Gastos fijos',D.fij)+row('var(--c-hor)','Gastos cotidianos',D.hor)+row('var(--c-aho)','Ahorro e inversión',ai)+row('var(--line,#ccc)','Disponible',disp)+'</ul>'
    +(D.res<0?'<div class="ms ingneg">Gastaste más de lo que ingresó este mes.</div>':'');
}
function sec(m,s,title,hue,t,cls,solid){
  if(s==='aho')return ahoCard(m);
  if(['ing','fij','hor','inv'].indexOf(s)>=0)return `<section class="card bcard ${cls||''}" data-cid="${s}" style="--h:var(--${hue})">${secHead(s,title)}<div class="sbody"${isFold(s)?' hidden':''}>${mvList(m,s)}<button type="button" class="b add" data-new="${s}">${ADDL[s]}</button>${s==='ing'?'<div class="ingsum" id="ingsum">'+ingSumInner(m)+'</div>':''}</div><div class="tot"><span>Total</span><span id="t-${s}">S/ 0.00</span></div></section>`;
  return `<section class="card bcard ${cls||''}" data-cid="${s}" style="--h:var(--${hue})"><div class="sh${solid?' solid':''}"><i></i><span class="ttl">${title}</span></div><div class="tb"><div class="rw lb${t==='bnk'?'':' r'+t}" style="grid-template-columns:${TPL[t]}">${HEAD[t].map(h=>`<span>${h}</span>`).join('')}</div>${rowsHtml(m,s,t)}</div><button type="button" class="b add" data-add="${s}">+ Agregar fila</button><div class="tot"><span>Total</span><span id="t-${s}">S/ 0.00</span></div></section>`;
}
function tasaHtml(a){
  const tz=tasaOf(a.c),k=esc(a.c);
  if(!tz)return `<button type="button" class="aa-tb" data-act="atasa" data-acct="${k}">+ Agregar TREA o TEA para ver cuánto ganas</button>`;
  const mes=ahoGana(a.v,tz,30),anio=ahoGana(a.v,tz,360);
  return `<button type="button" class="aa-tb on" data-act="atasa" data-acct="${k}" title="Cambiar la tasa"><b>${esc(tz.t)} ${num2(tz.v)}%</b> · ganas ≈ ${fmt(mes)} al mes · ${fmt(anio)} al año <svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>`;
}
function ahoCard(m){
  const p=ahoPos(m),y=p?p[0]:year,i=p?p[1]:0,accs=ahoAccts(y,i),ml=m.aho||[];
  const touched={};ml.forEach(r=>{if((r.c||'').trim()||+r.m)touched[ahoName(r).toLowerCase()]=1;});
  const isLeg=a=>/^total ahorrado$/i.test(a.c),list=accs.filter(a=>!isLeg(a)&&!ahoHid(a)&&(Math.abs(a.v)>=.005||touched[a.c.toLowerCase()])),hasLeg=accs.some(a=>isLeg(a)&&Math.abs(a.v)>=.005),bal=ahoBal(y,i)||0;
  let dp=0,rt=0,aj=0;
  ml.forEach(r=>{const v=(+r.m||0)*rateC(rowCur('aho',r),m),k=ahoKind(r);if(k==='dep')dp+=v;else if(k==='ret')rt-=v;else if(k==='aj')aj+=v;});
  const parts=[];if(dp)parts.push('depositaste '+fmt(dp));if(rt)parts.push('retiraste '+fmt(rt));if(Math.abs(aj)>=.005)parts.push('ajustaste '+(aj>0?'+':'−')+fmt(Math.abs(aj)));
  let gm=0,ga=0,conT=0;list.forEach(a=>{const tz=tasaOf(a.c);if(tz&&a.v>0){conT++;gm+=ahoGana(a.v,tz,30);ga+=ahoGana(a.v,tz,360);}});
  const gana=conT?`<div class="ms ahogana">Con las tasas que anotaste ganarías ≈ <b>${fmt(gm)}</b> al mes y <b>${fmt(ga)}</b> al año${conT<list.length?' (solo cuentas con tasa)':''}.</div>`:'';
  const sum=parts.length?`<div class="ms ahoflow">En ${MES[i].toLowerCase()} ${parts.join(' y ')}.</div>`:'';
  const accH=list.length?list.map(a=>`<div class="aacct"><div class="aa-h"><span class="aa-l"><b class="aa-n" title="${esc(a.c)}">${esc(a.c)}</b><button type="button" class="x aa-ed" data-act="aren" data-acct="${esc(a.c)}" aria-label="Cambiar el nombre de ${esc(a.c)}" title="Cambiar nombre"><svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button><button type="button" class="x aa-ed" data-act="adel" data-acct="${esc(a.c)}" aria-label="Quitar cuenta ${esc(a.c)}" title="Quitar cuenta"><svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg></button></span><b class="aa-v">${fmt(a.v)}</b></div><div class="aa-t">${tasaHtml(a)}</div></div>`).join(''):(hasLeg?'<div class="empty ahoempty">Tu saldo viene de meses que solo traían totales. Crea tus cuentas con «+ Nueva cuenta».</div>':'<div class="empty ahoempty">Todavía no tienes cuentas de ahorro. Crea la primera con «+ Nueva cuenta» y tu saldo actual.</div>');
  const led=ml.map((r,j)=>({r,j})).filter(x=>(x.r.c||'').trim()||+x.r.m),nm={dep:'Depósito',ret:'Retiro',aj:'Ajuste',tr:'Traspaso'};
  const ledH=led.length?`<div class="movl"><div class="ms">Movimientos de ${MES[i].toLowerCase()}</div>${led.map(({r,j})=>{const k=ahoKind(r),v=+r.m||0,cu=rowCur('aho',r);return `<div class="aml"><span class="amt-t ${k}">${nm[k]}</span><span class="aml-c">${esc(ahoName(r))}${r.f?' · '+esc(r.f):''}</span><b class="aml-v${v<0?' neg':''}">${v>0?'+':v<0?'−':''}${cu} ${num2(Math.abs(v))}</b><span class="rwx">${(k==='dep'||k==='ret')?`<button type="button" class="x ed-row" data-edit="aho" data-i="${j}" aria-label="Editar movimiento" title="Editar"><svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>`:''}<button type="button" class="x" data-del="aho" data-i="${j}" aria-label="Quitar movimiento">×</button></span></div>`;}).join('')}</div>`:'';
  return `<section class="card bcard ahocard" data-cid="aho" style="--h:var(--h-aho)">${secHead('aho','Ahorros')}<div class="sbody"${isFold('aho')?' hidden':''}><div class="ahobody">${sum}${accH}${gana}</div>${ledH}<button type="button" class="b add" data-act="anew">+ Nueva cuenta</button><button type="button" class="b add" data-act="mover">Mover dinero</button></div><div class="tot"><span>Saldo total</span><span id="t-aho">${fmt(bal)}</span></div></section>`;
}
/* Estado de cuenta de una tarjeta (solo mes actual, con día de corte): lo que se paga es lo consumido hasta el último corte
   (la deuda de hoy menos lo consumido después del corte; los pagos ya hechos lo reducen solos). Lo posterior va al siguiente periodo.
   Las filas sin día cuentan como del periodo que se cierra. Devuelve null si no hay día de corte. */
function cardStmt(k){
  const cd=+((cfg.corteDia||{})[k])||0;if(!cd)return null;
  const y0=now.getFullYear(),mi=now.getMonth(),t0=new Date(y0,mi,now.getDate()),dim=(y,mo)=>new Date(y,mo+1,0).getDate();
  const cutOf=(y,mo)=>new Date(y,mo,Math.min(cd,dim(y,mo)));
  let cut=cutOf(y0,mi);if(cut>t0)cut=mi?cutOf(y0,mi-1):cutOf(y0-1,11);
  let next=0;
  [[cut.getFullYear(),cut.getMonth()],[y0,mi]].filter((p,j,a)=>j===0||p[0]!==a[0][0]||p[1]!==a[0][1]).forEach(([y,mo])=>{
    const m=(S[String(y)]||[])[mo];if(!m)return;
    (m[k]||[]).forEach(r=>{const dt=dayDate(y,mo,r.f);if(dt&&dt>cut&&(+r.m||0)>0)next+=(+r.m)*rateC(rowCur(k,r),m)/rate(k,m);});});
  const D=cardEnding(String(y0),mi,k),due=Math.max(0,Math.round(Math.min(D,D-next)*100)/100);
  next=Math.round(Math.min(Math.max(0,next),Math.max(0,D))*100)/100;
  const pd=+((cfg.pagoDia||{})[k])||0;let dueDate=null,dl=null;
  if(pd){let c=new Date(cut.getFullYear(),cut.getMonth(),Math.min(pd,dim(cut.getFullYear(),cut.getMonth())));
    if(c<=cut){const ny=cut.getMonth()===11?cut.getFullYear()+1:cut.getFullYear(),nm=(cut.getMonth()+1)%12;c=new Date(ny,nm,Math.min(pd,dim(ny,nm)));}
    dueDate=c;dl=Math.round((c-t0)/864e5);}
  return{cut,due,next,debt:D,dueDate,dl};
}
const stmtNow=(k,y,i)=>(String(y)===String(now.getFullYear())&&+i===now.getMonth())?cardStmt(k):null;
const fechaL=x=>x.getDate()+' de '+MES[x.getMonth()].toLowerCase();
function payInfo(k,i){
  const d=+((cfg.pagoDia||{})[k])||0,cd=+((cfg.corteDia||{})[k])||0,debt=cardEnding(year,i,k);
  if(!d&&!cd)return {h:'<span class="ms">Agrega tu día de corte y de pago abajo, en «Saldo anterior, línea, corte y pago».</span>'};
  const curM=year===String(now.getFullYear())&&i===now.getMonth();
  if(!curM)return {h:'<span class="ms">'+(cd&&d?'Día de corte: '+cd+' · Día de pago: '+d+' de cada mes':cd?'Día de corte: '+cd+' de cada mes':'Día de pago: '+d+' de cada mes')+'</span>'};
  const st=cd?cardStmt(k):null;
  if(st){
    let h='';
    if(st.dueDate){const dl=st.dl,cuando=dl===0?'hoy':dl===1?'mañana':dl>0?'en '+dl+' días':dl===-1?'venció hace 1 día':'venció hace '+(-dl)+' días',urg=st.due>0&&dl<=5;
      h+='<span class="pdate'+(urg?' urg':'')+'">Fecha de pago: <b>'+fechaL(st.dueDate)+'</b> · '+cuando+'</span>';}
    h+='<span class="ms stl">'+(st.due>0.004?'Corte del '+fechaL(st.cut)+' · A pagar este periodo: '+fmtC(k,st.due):'Corte del '+fechaL(st.cut)+': sin saldo por pagar.')+'</span>';
    if(st.next>0.004)h+='<span class="ms stl">Desde el corte llevas '+fmtC(k,st.next)+': va al siguiente periodo.</span>';
    return {h};
  }
  const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let y=t0.getFullYear(),mo=t0.getMonth();if(t0.getDate()>Math.min(d,new Date(y,mo+1,0).getDate())){mo++;if(mo>11){mo=0;y++;}}
  const fd=new Date(y,mo,Math.min(d,new Date(y,mo+1,0).getDate())),dl=Math.round((fd-t0)/864e5),fecha=fd.getDate()+' de '+MES[fd.getMonth()].toLowerCase();
  const urg=debt>0&&dl<=5,cuando=dl===0?'hoy':dl===1?'mañana':'en '+dl+' días';
  return {h:'<span class="pdate'+(urg?' urg':'')+'">Fecha de pago: <b>'+fecha+'</b> · '+cuando+'</span>'};
}
function cardSec(i,k){
  const m=S[year][i],name=BANKN[k],open=+((m.copen||{})[k])||0,debt=cardEnding(year,i,k),lim=+(cfg.credito||{})[k]||0,av=lim-debt;
  return `<section class="card bcard" data-cid="${k}" style="--h:var(--h-${k})">${secHead(k,name,'<span class="cbadge">Crédito</span>',true)}<div class="cb sbody"${isFold(k)?' hidden':''}>
    <div class="cardtop"><div><div class="ms">Debes</div><b class="carddebt${debt>0?' neg':''}" id="cd-${k}">${fmtC(k,debt)}</b></div><div style="text-align:right"><div class="ms">Disponible</div><b class="cardav" id="ca-${k}">${fmtC(k,av)}</b></div></div>
    <div class="meter cardmeter" aria-hidden="true"><div id="cm-${k}" style="width:${lim>0?Math.min(100,Math.max(0,debt/lim*100)):0}%;background:var(--h-${k})"></div></div>
    <div class="cardpd" id="cp-${k}">${payInfo(k,i).h}</div>
    <details class="cardcfg"${lim>0?'':' open'}><summary>Saldo anterior, línea, corte y pago</summary><div class="cardfields"><label class="fld">Saldo anterior<input type="number" step="10" data-copen="${k}" value="${open||''}" placeholder="0.00" inputmode="decimal" aria-label="Saldo anterior de ${name}"></label><label class="fld">Línea de crédito<input type="number" step="50" data-credito="${k}" value="${lim||''}" placeholder="0.00" inputmode="decimal" aria-label="Línea de crédito de ${name}"></label><label class="fld">Día de corte<input type="number" min="1" max="31" step="1" data-cortedia="${k}" value="${(cfg.corteDia||{})[k]||''}" placeholder="Ej. 20" inputmode="numeric" aria-label="Día de corte de ${name}"></label><label class="fld">Día de pago<input type="number" min="1" max="31" step="1" data-pagodia="${k}" value="${(cfg.pagoDia||{})[k]||''}" placeholder="Ej. 15" inputmode="numeric" aria-label="Día de pago de ${name}"></label></div></details>
    <div class="ms">Consumos de este mes (suben tu deuda)</div>
    ${mvList(m,k)}
    <button type="button" class="b add" data-new="${k}">+ Agregar consumo</button>
    <button type="button" class="b p cardpay" data-act="pagar" data-card="${k}">Pagar ${name}</button>
  </div></section>`;
}
function eurSec(m){
  const hd=(cfg.eurCols||['Anterior','Actual','Debe','Saldo']).slice(0,4),ks=['a','b','d','s'];
  const rows=m.eur.map((r,i)=>`<div class="rw reur" style="grid-template-columns:repeat(4,1fr) 22px;min-width:360px">${ks.map((k,j)=>inp('eur',i,k,r[k],'number',hd[j])).join('')}${del('eur',i)}</div>`).join('');
  return `<section class="card bcard" data-cid="eur" style="--h:var(--h-eur)">${secHead('eur','Apuntes')}<div class="sbody"${isFold('eur')?' hidden':''}><div class="tb">${m.eur.length?'':'<div class="ms">Anota aquí lo que quieras seguir aparte; no entra en tus totales.</div>'}<div class="rw lb reur"${m.eur.length?'':' hidden'} style="grid-template-columns:repeat(4,1fr) 22px;min-width:360px">${hd.map((h,j)=>`<input type="text" class="eh" data-ec="${j}" value="${esc(h)}" aria-label="Nombre de la columna ${j+1}">`).join('')}<span></span></div>${rows}<label class="sr" for="nota">Notas</label><textarea id="nota" data-nota="1" rows="3" placeholder="Notas para recordar">${esc(m.nota||'')}</textarea></div><button type="button" class="b add" data-add="eur">+ Agregar fila</button></div><div class="tot"><span>Apuntes personales</span><span>No entra en los totales</span></div></section>`;
}
let liqEdit=false;
/* ¿Dónde gastas más? Reparte lo que salió del mes (gastos fijos y cotidianos, ahorro e inversión) en los 3 grupos; dentro de cada uno, por categoría. */
function gruposMes(mm){
  const LM=Array.isArray(mm)?mm:[mm];
  const G=[['need','Necesidades','var(--c-fij)'],['want','Deseos','var(--c-hor)'],['ai','Ahorro e inversión','var(--c-aho)']].map(x=>({id:x[0],n:x[1],c:x[2],t:0,l:new Map()}));
  const by={};G.forEach(g=>{by[g.id]=g;});let sinCl=0;
  const add=(g,name,v)=>{const o=by[g],k=name.toLowerCase(),e=o.l.get(k)||{n:name,v:0};e.v+=v;o.l.set(k,e);o.t+=v;};
  LM.forEach(m=>{[['fij','need'],['hor','want']].forEach(([s,def])=>(m[s]||[]).forEach(r=>{const v=(+r.m||0)*rateC(rowCur(s,r),m);if(!(v>0))return;const an=s==='hor'&&r.t==='ant',c=an?'want':catG(r.k);if(!c&&!r.card)sinCl+=v;add(c||def,(r.k||'').trim()||(an?'Antojos':'Sin categoría'),v);}));
  const d=dv(m);if(d.aho>0)add('ai','Ahorro',d.aho);if(d.inv>0)add('ai','Inversión',d.inv);});
  return{G,total:G.reduce((a,g)=>a+g.t,0),sinCl};
}
function dgInner(m){
  const an=Array.isArray(m),{G,total,sinCl}=gruposMes(m);
  if(!(total>0))return'<div class="ms">'+(an?'Cuando registres gastos en el año verás aquí a qué grupo van y en cuál gastas más.':'Cuando registres gastos verás aquí a qué grupo van y en cuál gastas más.')+'</div>';
  const pc=v=>Math.round(v/total*100);let best=null;G.forEach(g=>g.l.forEach(e=>{if(!best||e.v>best.v)best=e;}));
  let h=best?'<div class="dgtop"><span>Tu mayor gasto</span> <b>'+esc(best.n)+'</b> · '+fmt(best.v)+' <span class="ms">('+pc(best.v)+'%)</span></div>':'';
  h+=G.filter(g=>g.t>0).sort((a,b)=>b.t-a.t).map(g=>{
    const rows=[...g.l.values()].sort((a,b)=>b.v-a.v),top=rows.slice(0,6),rest=rows.slice(6).reduce((a,e)=>a+e.v,0);
    return'<div class="dgg"><div class="dgh"><span class="dgn"><i style="background:'+g.c+'"></i>'+g.n+'</span><b>'+fmt(g.t)+'</b><span class="dgp">'+pc(g.t)+'%</span></div><div class="dgbar"><div style="width:'+pc(g.t)+'%;background:'+g.c+'"></div></div><ul>'
      +top.map(e=>'<li><span>'+esc(e.n)+'</span><span>'+fmt(e.v)+'</span><span class="dgp">'+pc(e.v)+'%</span></li>').join('')
      +(rest>0?'<li class="ms"><span>Otras</span><span>'+fmt(rest)+'</span><span class="dgp">'+pc(rest)+'%</span></li>':'')+'</ul></div>';}).join('');
  if(an)h='<div class="dgy">'+h+'</div>';
  if(sinCl>0)h+='<div class="ms dghint"><span>Sin clasificar</span> <b>'+fmt(sinCl)+'</b> · <span>cuenta según su sección (fijos: necesidades, cotidianos: deseos).</span> <a href="#ajustes">Clasificar categorías</a></div>';
  return h;
}
function catGruposHtml(){
  catsAdopta();const uso=catUso(),pes=c=>uso.get(catLow(c))||0;
  const opts=sel=>GRUPOS3.map(g=>'<option value="'+(g[0]||'-')+'"'+(g[0]===sel?' selected':'')+'>'+g[1]+'</option>').join('');
  return '<div class="ms cgh">Se ordenan por lo que más usas. Cambia un nombre y se actualizan tus movimientos. Escribe el nombre de otra para unirlas.</div>'+GRUPOS3.map(g=>{
    const its=cfg.cats.map((c,i)=>[c,i]).filter(x=>catG(x[0])===g[0]).sort((a,b)=>(pes(b[0])-pes(a[0]))||(a[1]-b[1]));
    if(!its.length&&!g[0])return'';
    return '<div class="cgg"><b>'+g[1]+'</b>'+(its.length?its.map(([c,i])=>'<div class="cgr"><input class="cgn" type="text" maxlength="28" autocomplete="off" data-catn="'+i+'" value="'+esc(c)+'" aria-label="Nombre de '+esc(c)+'"><span class="cgu" title="Movimientos">'+catCuenta(c)+'</span><select data-catg="'+i+'" aria-label="Grupo de '+esc(c)+'">'+opts(g[0])+'</select><button type="button" class="chip" data-cat="'+i+'" aria-label="Quitar '+esc(c)+'">×</button></div>').join(''):'<div class="ms">Ninguna todavía</div>')+'</div>';}).join('');
}
/* Antojos del mes (gastos cotidianos con la marca t:'ant'). «¿Valió la pena?» se guarda en la fila (v: 1 sí, 0 no) y se puede cambiar o quitar. */
function antojosHtml(m){
  const rows=(m.hor||[]).map((r,i)=>({r,i})).filter(x=>x.r&&x.r.t==='ant'&&(+x.r.m||0)>0);
  if(!rows.length)return'';
  const val=x=>(+x.r.m||0)*rateC(rowCur('hor',x.r),m),tot=rows.reduce((a,x)=>a+val(x),0),gas=dv(m).gas||0,pct=gas>0?Math.round(tot/gas*100):0;
  const no=rows.filter(x=>x.r.v===0).reduce((a,x)=>a+val(x),0),si=rows.filter(x=>x.r.v===1).length,pend=rows.filter(x=>x.r.v!==0&&x.r.v!==1).length;
  let h='<div class="atop"><b>'+fmt(tot)+'</b> <span class="ms">en '+rows.length+(rows.length===1?' antojo':' antojos')+' · '+pct+'% de tus gastos</span></div><ul class="anl">'
   +rows.map(({r,i})=>'<li><div class="anr"><span class="and">'+esc((r.f||'').replace('-',' '))+'</span><span class="ann">'+esc((r.c||'').trim()||'Sin descripción')+'</span><b>'+fmtC('hor',+r.m||0)+'</b></div><div class="anb"><button type="button" class="vp'+(r.v===1?' on':'')+'" data-vp="'+i+':1" aria-pressed="'+(r.v===1)+'">Valió la pena</button><button type="button" class="vp'+(r.v===0?' no':'')+'" data-vp="'+i+':0" aria-pressed="'+(r.v===0)+'">No valió la pena</button></div></li>').join('')+'</ul>';
  h+='<div class="afoot">'+(no>0?'<div class="ano"><span>No valió la pena</span> <b>'+fmt(no)+'</b> · <span>eso habrías ahorrado</span></div>':'')
    +(si>0?'<div class="ms"><span>Valió la pena</span> <b>'+si+'</b></div>':'')+(pend>0?'<div class="ms"><span>Sin responder</span> <b>'+pend+'</b></div>':'')+'</div>';
  return '<section class="card bcard" data-cid="ant" style="--h:var(--h-hor)">'+secHead('ant','Antojos')+'<div class="cb sbody">'+h+'</div></section>';
}
/* Tu semana: los últimos 7 días (hasta hoy) contra los 7 de antes. Solo gastos fijos y cotidianos (dinero que sale de tus cuentas), igual que «Gasto por día».
   Solo en el mes actual y cuando hay gastos en esta semana. Puede cruzar de mes: busca en los meses que toque. */
function semanaData(){
  const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),DAY=864e5,ini=new Date(t0-6*DAY),iniP=new Date(t0-13*DAY),finP=new Date(t0-7*DAY);
  const w={tot:0,n:0,cats:new Map(),dias:new Set(),porDia:new Map(),ant:0,antTot:0,antNo:0},p={tot:0},ms=new Set();
  for(let d=new Date(iniP);d<=t0;d=new Date(d.getTime()+DAY))ms.add(d.getFullYear()+'-'+d.getMonth());
  ms.forEach(k=>{const [y,mi]=k.split('-').map(Number),mm=(S[String(y)]||[])[mi];if(!mm)return;
    (mm.ing||[]).forEach(r=>{if(!usedRow(r)||!(+r.m>0))return;const dt=dayDate(y,mi,r.f);if(dt&&dt>=ini&&dt<=t0)w.dias.add(dt.getTime());});
    ['fij','hor'].forEach(s=>(mm[s]||[]).forEach(r=>{
      if(!usedRow(r)||!(+r.m>0))return;const dt=dayDate(y,mi,r.f);if(!dt)return;const v=(+r.m)*rateC(rowCur(s,r),mm);
      if(dt>=ini&&dt<=t0){w.tot+=v;w.n++;w.dias.add(dt.getTime());w.porDia.set(dt.getTime(),(w.porDia.get(dt.getTime())||0)+v);
        const c=r.card?'Pago de tarjetas':((r.k||'').trim()||'Sin categoría');w.cats.set(c,(w.cats.get(c)||0)+v);
        if(s==='hor'&&r.t==='ant'){w.ant++;w.antTot+=v;if(r.v===0)w.antNo+=v;}}
      else if(dt>=iniP&&dt<=finP)p.tot+=v;}));});
  return{w,p};
}
function semanaHtml(i){
  if(Number(year)*12+i!==now.getFullYear()*12+now.getMonth())return'';
  const {w,p}=semanaData();if(!(w.n>0))return'';
  const DN=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  let top=null;w.cats.forEach((v,k)=>{if(!top||v>top.v)top={k,v};});
  let dia=null;w.porDia.forEach((v,k)=>{if(!dia||v>dia.v)dia={k,v};});
  const dif=p.tot>0?Math.round((w.tot-p.tot)/p.tot*100):null;
  const cmp=dif===null?'<span class="ms">Sin gastos la semana anterior para comparar.</span>'
    :dif===0?'<span class="ms">Igual que la semana pasada ('+fmt(p.tot)+').</span>'
    :'<span class="ms sem'+(dif>0?'up':'dn')+'">'+(dif>0?'▲ ':'▼ ')+Math.abs(dif)+'% '+(dif>0?'más':'menos')+' que la semana pasada ('+fmt(p.tot)+')</span>';
  const st=(k,v,s)=>'<div class="semst"><div class="k">'+k+'</div><div class="semv">'+v+'</div>'+s+'</div>';
  const ant=w.ant>0?st('Antojos',fmt(w.antTot),'<span class="ms">'+(w.antNo>0?'No valieron la pena: '+fmt(w.antNo):'en '+w.ant+(w.ant===1?' antojo':' antojos'))+'</span>')
    :st('Días con registro',w.dias.size+' de 7','<span class="ms">Anotar a diario es lo que más ayuda.</span>');
  return '<section class="card bcard" data-cid="sem" style="--h:var(--h-pre)">'+secHead('sem','Tu semana')+'<div class="cb sbody"><div class="ms">Últimos 7 días, hasta hoy.</div><div class="semgrid">'
    +st('Gastaste',fmt(w.tot),cmp)
    +st('Donde más gastaste',esc(top.k),'<span class="ms">'+fmt(top.v)+' · '+Math.round(top.v/w.tot*100)+'% de la semana</span>')
    +st('Día de más gasto',DN[new Date(dia.k).getDay()],'<span class="ms">'+fmt(dia.v)+'</span>')
    +ant+'</div></div></section>';
}
/* Cierre del mes: cuánto entró, cuánto salió, cuánto ahorraste, en qué se fue más y UNA sugerencia. Sale de los datos del mes, sin guardar nada nuevo.
   Se ve en los meses pasados con datos y en los últimos 3 días del mes actual; los primeros 7 días del mes siguiente, una franja invita a verlo. */
function cierreData(y,i){
  const m=(S[y]||[])[i];if(!m)return null;const D=dv(m);if(!D.on)return null;
  const py=i>0?y:String(+y-1),pi=i>0?i-1:11,pm=(S[py]||[])[pi],P=pm?dv(pm):null,cats=new Map();let antNo=0;
  ['fij','hor'].forEach(s=>(m[s]||[]).forEach(r=>{if(!usedRow(r)||!(+r.m>0))return;const v=(+r.m)*rateC(rowCur(s,r),m),c=r.card?'Pago de tarjetas':((r.k||'').trim()||'Sin categoría');cats.set(c,(cats.get(c)||0)+v);if(s==='hor'&&r.t==='ant'&&r.v===0)antNo+=v;}));
  let top=null,topN=null;cats.forEach((v,k)=>{if(!top||v>top.v)top={k,v};if(k!=='Sin categoría'&&k!=='Pago de tarjetas'&&(!topN||v>topN.v))topN={k,v};});
  const debt=CARDS.reduce((a,k)=>a+Math.max(0,cardEnding(y,i,k))*rateC(curOf(k),m),0);
  return{D,P:P&&P.on?P:null,pName:MES[pi].toLowerCase(),top,topN,antNo,debt};
}
function cierreIdea(c){
  const {D,topN,antNo,debt}=c,meta=+cfg.meta||0;
  if(!(D.ing>0))return'No registraste ingresos este mes. Anótalos para que tu cierre sea real.';
  if(D.gas>D.ing+0.004)return topN?'Gastaste '+fmt(D.gas-D.ing)+' más de lo que entró. Empieza por revisar «'+topN.k+'», tu mayor gasto.':'Gastaste '+fmt(D.gas-D.ing)+' más de lo que entró. Revisa tus gastos antes de tu próximo ingreso.';
  if(debt>=0.005)return'Pasas al siguiente mes debiendo '+fmt(debt)+' en tarjetas. Pagar el total evita intereses.';
  if(meta>0&&D.aho/D.ing*100<meta)return'Ahorraste el '+Math.round(Math.max(0,D.aho/D.ing*100))+'% de tu ingreso y tu meta es '+meta+'%. Aparta '+fmt(D.ing*meta/100-D.aho)+' apenas cobres.';
  if(antNo>0)return'Los antojos que no valieron la pena sumaron '+fmt(antNo)+'. El próximo mes, ese dinero puede ir a tu ahorro.';
  if(topN&&D.gas>0&&topN.v/D.gas>=0.35)return'«'+topN.k+'» fue el '+Math.round(topN.v/D.gas*100)+'% de tus gastos. Ponerle un límite es lo que más movería tu mes.';
  return'Buen mes: gastaste menos de lo que entró. Mantén el ritmo.';
}
function cierreInner(i){
  const c=cierreData(year,i);if(!c)return'';const {D,P,pName,top}=c;
  const cur=Number(year)*12+i===now.getFullYear()*12+now.getMonth(),fal=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate();
  const st=(k,v,s)=>'<div class="semst"><div class="k">'+k+'</div><div class="semv">'+v+'</div>'+s+'</div>';
  let cmp='<span class="ms">Sin gastos el mes anterior para comparar.</span>';
  if(P&&P.gas>0){const d=Math.round((D.gas-P.gas)/P.gas*100);cmp=d===0?'<span class="ms">Igual que en '+pName+' ('+fmt(P.gas)+').</span>':'<span class="ms sem'+(d>0?'up':'dn')+'">'+(d>0?'▲ ':'▼ ')+Math.abs(d)+'% '+(d>0?'más':'menos')+' que en '+pName+' ('+fmt(P.gas)+')</span>';}
  const ingS=P?'<span class="ms">En '+pName+' entró: '+fmt(P.ing)+'</span>':'';
  const pc=D.ing>0?Math.round(Math.max(0,D.aho)/D.ing*100):null,inv=D.inv>0?'Invertiste '+fmt(D.inv):'';
  const ahoS='<span class="ms">'+(pc!==null?pc+'% de tu ingreso'+(inv?' · '+inv.replace('Invertiste','invertiste'):''):inv)+'</span>';
  const nota=cur?'<div class="ms">'+(fal===0?'Hoy termina el mes: estos números todavía pueden cambiar.':fal===1?'Falta 1 día para cerrar: estos números todavía pueden cambiar.':'Faltan '+fal+' días para cerrar: estos números todavía pueden cambiar.')+'</div>':'';
  return nota+'<div class="semgrid ciegrid">'+st('Entró',fmt(D.ing),ingS)+st('Salió',fmt(D.gas),cmp)
    +st(D.aho<0?'Sacaste de tus ahorros':'Ahorraste',fmt(Math.abs(D.aho)),ahoS)
    +st('Donde más gastaste',top?esc(top.k):'Sin detalle',top?'<span class="ms">'+fmt(top.v)+' · '+Math.round(top.v/(D.gas||top.v)*100)+'% de tus gastos</span>':'')
    +'</div><div class="ciesug"><b>Una idea para el próximo mes</b><span>'+esc(cierreIdea(c))+'</span></div>';
}
function cierreHtml(i){
  const cur=Number(year)*12+i,nowI=now.getFullYear()*12+now.getMonth();if(cur>nowI)return'';
  if(cur===nowI&&new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()>2)return'';
  const h=cierreInner(i);if(!h)return'';const n=MES[i].toLowerCase();
  return '<section class="card bcard" data-cid="cie" style="--h:var(--h-pre)">'+secHead('cie',(cur===nowI?'Así va tu cierre de ':'Cierre de ')+n)+'<div class="cb sbody" id="ciebox"'+(isFold('cie')?' hidden':'')+'>'+h+'</div></section>';
}
function cierreBarHtml(i){
  if(Number(year)*12+i!==now.getFullYear()*12+now.getMonth()||now.getDate()>7)return'';
  const py=i>0?year:String(+year-1),pi=i>0?i-1:11,k=py+'-'+pi;if(YEARS.indexOf(py)<0||!cierreData(py,pi))return'';
  try{if(localStorage.getItem(KEY+'-cierre')===k)return'';}catch(e){}
  return '<section class="ciebar" aria-label="Cierre del mes"><span>'+MES[pi]+' ya cerró. Mira cuánto entró, cuánto salió y qué mejorar.</span><button type="button" class="b" data-cieir="'+k+'">Ver cierre</button><button type="button" class="lnk" data-ciex="'+k+'">Ahora no</button></section>';
}
/* Saldo anterior solo: al abrir el MES ACTUAL, si una tarjeta no tiene saldo anterior anotado (ni siquiera 0) y todavía no tiene consumos,
   se trae lo que quedó debiendo el mes anterior (la misma regla de «Traer del mes anterior», pero sin tener que acordarse). Si la persona
   anotó un saldo (aunque sea 0) o ya hay consumos, no se toca. Los meses pasados y futuros tampoco. */
function autoOpen(i){
  if(String(year)!==String(now.getFullYear())||i!==now.getMonth())return;
  try{if(backend&&!sync.ready)return;}catch(e){return;}/* con sesión, espera a que cargue la nube: un cambio automático antes de eso se vería como una edición propia (conflicto) */
  const m=S[year]&&S[year][i];if(!m||m.tot)return;
  const prevY=i>0?year:String(+year-1),prevI=i>0?i-1:11;if(!(S[prevY]&&S[prevY][prevI]))return;
  const got=[];
  CARDS.forEach(k=>{if(m.copen&&m.copen[k]!=null)return;if((m[k]||[]).some(r=>+r.m))return;const pe=cardEnding(prevY,prevI,k);if(Math.abs(pe)>=0.005){if(!m.copen)m.copen={};m.copen[k]=pe;got.push(BANKN[k]+' '+fmtC(k,pe));}});
  if(got.length){save();setTimeout(()=>toast('Traje del mes anterior lo que debes en tarjetas: '+got.join(', ')+'.'),400);}
}
function viewMes(i){
  autoOpen(i);
  const m=S[year][i],D=dv(m);
  const today=(year===String(now.getFullYear()))?now.getMonth():-1;
  const kp=(l,id,v)=>`<div class="kpi"><div class="kl">${l}</div><div class="kv" id="${id}">${v}</div></div>`;
  const prev=i>0?`<a class="nav" href="#${SLUG[i-1]}" aria-label="Mes anterior">←</a>`:`<span class="nav dis" aria-hidden="true">←</span>`;
  const next=i<11?`<a class="nav" href="#${SLUG[i+1]}" aria-label="Mes siguiente">→</a>`:`<span class="nav dis" aria-hidden="true">→</span>`;
  if(!m.liq)m.liq=LIQ();
  const pm=PM();if(!m.q)m.q=[50,30,20];
  const pr=pm.rows.map((r,j)=>`<div class="pr"><div class="l"><span>${r[0]}</span><input id="p-${j}" type="number" data-p="${j}" value="${m[pm.k][j]}" aria-label="Porcentaje de ${r[0]}"><span class="ms">%</span><b id="pm${j}" style="min-width:92px;text-align:right;font-family:var(--font-num);font-weight:500">S/ 0.00</b></div><div class="bar"><div id="pb${j}" style="background:${r[1]}"></div></div><div class="l"><span class="ms" id="pu${j}"></span><span class="pill" id="ps${j}"></span></div></div>`).join('');
  const lq=sum(m.liq),hsub=i===today?'Lo que tienes hoy en Yape, Plin y efectivo.':'Lo que tenías al cierre de '+MES[i].toLowerCase()+' en Yape, Plin y efectivo.';
  const liqRead=`<div class="liq-h"><span class="hero-l">Dónde está tu dinero</span><button type="button" class="liq-ed" data-act="liqedit">Editar</button></div><ul class="liq-list">${m.liq.map((r,j)=>[r,j]).filter(x=>(x[0].c||'').trim()||+x[0].m).map(([r,j])=>`<li><button type="button" class="liq-nm" data-act="hist" data-i="${j}" aria-label="Ver los movimientos de ${esc((r.c||'').trim()||'esta cuenta')}"><span>${esc((r.c||'').trim()||'Sin nombre')}</span><span class="liq-chev" aria-hidden="true">›</span></button><b class="${+r.m<0?'neg':''}">${fmtC('liq',+r.m||0)}</b></li>`).join('')||'<li class="ms">Agrega tus cuentas con «Editar».</li>'}</ul>`;
  const liqEditH=`<div class="liq-h"><span class="hero-l">Edita tus cuentas</span><button type="button" class="liq-ed" data-act="liqedit">Listo</button></div><div class="liq-rows">${rowsHtml(m,'liq','bnk')}</div><button type="button" class="b add" data-add="liq">+ Agregar cuenta</button><div class="liq-n">Para dejar todo igual que tu banco usa «Cuadrar cuentas» en Cierre de mes.</div>`;
  return `${mtabsHtml()}<section class="hero with-liq"><div class="hero-main">
    <div class="hero-top"><div><div class="hero-k">${year}</div><h1>${MES[i]}</h1><div class="pills" style="margin-top:6px">${i===today?'<span class="pill">Mes actual</span>':''}<span class="pill" id="pillh" hidden>Cotidiano sobre ${fmt(cfg.alerta)}</span></div></div><div class="pills">${prev}${next}</div></div>
    <div><div class="hero-l">Tienes disponible</div><div class="hero-v${lq<0?' neg':''}" id="hL">${fmtC('liq',lq)}</div><div class="hero-s">${hsub}</div></div>
    <div class="hbud"><div class="hbud-t"><span class="hbud-l">Te queda según tu presupuesto</span><span class="hbud-h">Ingresos de ${MES[i].toLowerCase()} menos gastos, ahorro e inversión.</span></div><b id="hR">${fmt(D.res)}</b></div>
    <div class="hbar" id="hbar" aria-hidden="true"></div><div class="hleg" id="hleg"></div>
    <div class="acts"><button type="button" data-act="cierre" aria-haspopup="dialog">Cierre de mes</button><button type="button" data-act="rep">Descargar reporte</button></div></div>
    <aside class="liq" aria-label="Dónde está tu dinero">${liqEdit?liqEditH:liqRead}<div class="liq-t"><span>Total</span><b id="t-liq">${fmtC('liq',lq)}</b></div></aside>
  </section>
  ${m.tot?'<div class="banner">Este mes trae solo totales de tu registro anterior. Lo que registres se suma a esos totales.</div>':''}
  ${cierreBarHtml(i)}${avisosHtml(i)}${porPagarHtml(i)}<div class="board" id="board"><div class="kpis bcard bare" data-cid="mk">${kp('Ingreso total','kI',fmt(D.ing))}${kp('Total gastado','kG',fmt(D.gas))}${kp('Total invertido','kV',fmt(D.inv))}${kp('Ahorro del mes','kA',fmt(D.aho))}</div>
  <div class="secs">
    ${cierreHtml(i)}
    <section class="card bcard" data-cid="pre" style="--h:var(--h-pre)">${secHead('pre','Presupuesto')}<div class="cb sbody"${isFold('pre')?' hidden':''}><div class="ms" style="margin-bottom:12px">Regla 50/30/20: necesidades, deseos y ahorro, según la categoría de cada gasto.</div>${pr}</div><div class="note" id="psum"></div></section>
    <section class="card bcard" data-cid="dg" style="--h:var(--h-pre)">${secHead('dg','¿Dónde gastas más?')}<div class="cb sbody" id="dgbox">${dgInner(m)}</div></section>
    ${semanaHtml(i)}
    ${sec(m,'ing','Ingresos','h-ing','ing')}
    ${sec(m,'fij','Gastos fijos','h-fij','gas','span2')}
    ${sec(m,'hor','Gastos cotidianos','h-hor','gas','span2')}
    ${antojosHtml(m)}
    ${CARDS.map(k=>cardSec(i,k)).join('')}
    ${sec(m,'aho','Ahorros','h-aho','aho')}
    ${sec(m,'inv','Inversiones','h-inv','bnk')}
  </div>
  <div class="g3">
    <section class="card bcard" data-cid="mc1"><div class="cb"><h2 class="ttl">Distribución del mes</h2><div class="cap">Cómo se repartió tu ingreso.</div><div id="w1" class="cw s"><canvas id="mc1" role="img" aria-label="Distribución del mes"></canvas></div><div class="empty" id="e1" hidden>Sin movimientos todavía en ${MES[i].toLowerCase()}.</div><div class="lg" id="lg1"></div></div></section>
    <section class="card bcard" data-cid="mc2"><div class="cb"><h2 class="ttl">Contra el mes anterior</h2><div class="cap">Fijos, cotidianos, ahorros e inversión.</div><div id="w2" class="cw s"><canvas id="mc2" role="img" aria-label="Comparación con el mes anterior"></canvas></div><div class="empty" id="e2" hidden>Sin movimientos todavía en ${MES[i].toLowerCase()}.</div><div class="lg" id="lg2"></div></div></section>
    <section class="card bcard" data-cid="mc3"><div class="cb"><h2 class="ttl">Saldo por cuenta</h2><div class="cap">Ahorros e inversiones son tu dinero. Las barras claras son el crédito que te queda en cada tarjeta.</div><div id="w3" class="cw s"><canvas id="mc3" role="img" aria-label="Saldo por cuenta"></canvas></div><div class="empty" id="e3" hidden>Agrega montos en los bancos, ahorros o inversiones para verlos aquí.</div></div></section>
  </div>
  <section class="card bcard" data-cid="hm1"><div class="cb"><h2 class="ttl">Gasto por día</h2><div class="cap">Calendario de ${MES[i].toLowerCase()}: más oscuro, más gasto ese día.</div><div id="hmgrid" class="hm7"></div><div class="ms" id="hmleg" style="margin-top:10px"></div></div></section>
  ${tcmCard(m,i)}
  ${eurSec(m)}
  </div>`;
}
function drawMonthCharts(anim){
  killCharts();
  const m=S[year][view],D=dv(m),prev=view>0?dv(S[year][view-1]):null;
  const vis=(w,e,on)=>{const a=document.getElementById(w),b=document.getElementById(e);if(a)a.hidden=!on;if(b)b.hidden=on;};
  const avOf=k=>{const l=+(cfg.credito||{})[k]||0;return l>0?l-cardEnding(year,view,k):0;},nC=CARDS.length;
  const bankOn=(CARDS.reduce((a,k)=>a+avOf(k),0)+D.sAho+D.inv)>0;
  vis('w1','e1',D.on);vis('w2','e2',D.on);vis('w3','e3',bankOn);
  const b=base(anim);
  const lg1=document.getElementById('lg1'),lg2=document.getElementById('lg2');
  if(D.on){
    const Lb=['Gastos fijos','Gastos cotidianos','Ahorros','Inversión','Restante'],C=[cv('--c-fij'),cv('--c-hor'),cv('--c-aho'),cv('--c-inv'),cv('--c-res')],V=[D.fij,D.hor,D.aho,D.inv,Math.max(0,D.res)];
    if(lg1)lg1.innerHTML=Lb.map((l,k)=>`<span><i style="background:${C[k]}"></i>${l} ${num2(V[k])}</span>`).join('');
    const t1=ctype('mc1','doughnut');
    mkChart('mc1',{type:t1,data:{labels:Lb,datasets:[{data:V,backgroundColor:C,borderColor:cv('--surface'),borderWidth:2}]},options:{...b,cutout:t1==='doughnut'?'64%':0,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.label+': '+fmt(c.parsed)}}}}});
    const ds=[],mk=(l,d,c)=>({label:l,data:d,backgroundColor:c,borderColor:c,borderRadius:4,maxBarThickness:18,tension:.25,pointRadius:3});
    if(prev&&prev.on)ds.push(mk(MES[view-1],[prev.fij,prev.hor,prev.aho,prev.inv],cv('--c-res')));
    ds.push(mk(MES[view],[D.fij,D.hor,D.aho,D.inv],cv('--accent')));
    if(lg2)lg2.innerHTML=ds.map(d=>`<span><i style="background:${d.backgroundColor}"></i>${d.label}</span>`).join('');
    mkChart('mc2',{type:ctype('mc2','bar'),data:{labels:['Fijos','Cotidiano','Ahorros','Inversión'],datasets:ds},options:{...b,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:tipMoney},scales:axes()}});
  }else{if(lg1)lg1.innerHTML='';if(lg2)lg2.innerHTML='';}
  if(bankOn){
    const t3=ctype('mc3','bar'),dn=t3==='doughnut',alp=(c,x)=>{const h=/^#?([0-9a-f]{6})$/i.exec(String(c||'').trim());if(!h)return c;const n=parseInt(h[1],16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+x+')';};
    const full=CARDS.map(k=>cv('--h-'+k)).concat([cv('--h-aho'),cv('--h-inv')]),fill=full.map((c,j)=>j<nC?alp(c,.22):c);
    mkChart('mc3',{type:t3,data:{labels:CARDS.map(k=>T('Crédito')+' '+BANKN[k]).concat(['Ahorros','Inversiones']),datasets:[{label:'Disponible',data:CARDS.map(avOf).concat([D.sAho,D.inv]),backgroundColor:fill,borderColor:dn?cv('--surface'):full,borderWidth:dn?2:CARDS.map(()=>2).concat([0,0]),borderRadius:dn?0:4,maxBarThickness:34}]},options:{...b,cutout:dn?'60%':undefined,plugins:{legend:{display:dn,position:'bottom',labels:{color:cv('--muted'),boxWidth:10,font:{size:11}}},tooltip:{callbacks:{label:c=>' '+T(c.dataIndex<nC?'Crédito disponible (no es tu dinero)':'Tu dinero')+': '+fmt(dn?c.parsed:c.parsed.y)}}},scales:dn?{}:axes()}});
  }
  drawHeatmap();
}
function drawHeatmap(){
  const g=document.getElementById('hmgrid');if(!g)return;
  const m=S[year][view],days=new Date(+year,view+1,0).getDate(),first=(new Date(+year,view,1).getDay()+6)%7;
  const tot={};let max=0;
  ['fij','hor'].forEach(s=>(m[s]||[]).forEach(r=>{const d=parseInt(r.f)||0,v=+r.m||0;if(d>=1&&d<=days&&v){tot[d]=(tot[d]||0)+v;if(tot[d]>max)max=tot[d];}}));
  let html=['L','M','M','J','V','S','D'].map(h=>`<div class="hmhead">${h}</div>`).join('');
  for(let i=0;i<first;i++)html+='<div class="hmcell empty"></div>';
  for(let d=1;d<=days;d++){const v=tot[d]||0,int=max>0?v/max:0,bg=v>0?`color-mix(in srgb, var(--accent) ${Math.round(14+int*76)}%, var(--surface-2))`:'var(--surface-2)';html+=`<div class="hmcell${v>0?' on':''}"${v>0?` data-p="${Math.round(14+int*76)}"`:''} style="background:${bg}" title="${MES[view]} ${d}: ${fmt(v)}" role="img" aria-label="${MES[view]} ${d}: ${fmt(v)}"><span>${d}</span></div>`;}
  g.innerHTML=html;hmInk();
  const lg=document.getElementById('hmleg');if(lg)lg.textContent=max>0?'Día de mayor gasto: '+fmt(max)+'. Toca o pasa el cursor por cada día para ver el detalle.':'Sin gastos fijos ni cotidianos este mes todavía. Los consumos de tarjeta están en cada tarjeta, más arriba.';
}
/* Número legible en cada día del calendario: con mucho color de fondo, el texto normal se pierde
   (en temas oscuros el acento es claro; en los claros, oscuro). Se usa el texto normal o el color
   de la superficie, el que contraste más; si ninguno llega a 4.5:1, se mueve un poco la intensidad. */
let hmPal=null;
function hmInk(){
  const g=document.getElementById('hmgrid');if(!g)return;const cells=g.querySelectorAll('.hmcell[data-p]');if(!cells.length)return;
  const pk=themeKey();
  if(!hmPal||hmPal.k!==pk){
    const pr=document.createElement('i');g.appendChild(pr);
    const rgb=v=>{pr.style.color=v;const c=getComputedStyle(pr).color,n=(c.match(/[\d.]+/g)||[]).map(Number);return /^color\(/.test(c)?n.slice(0,3).map(x=>x*255):n.slice(0,3);};
    hmPal={k:pk,acc:rgb('var(--accent)'),s2:rgb('var(--surface-2)'),fg:rgb('var(--fg)'),su:rgb('var(--surface)')};pr.remove();
  }
  const {acc,s2,fg,su}=hmPal;
  const lum=c=>{const l=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;});return .2126*l[0]+.7152*l[1]+.0722*l[2];};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const ink=p=>{const bg=acc.map((a,i)=>a*p/100+s2[i]*(1-p/100)),f=cr(fg,bg),s=cr(su,bg);return f>=s?{c:f,v:''}:{c:s,v:'var(--surface)'};};
  cells.forEach(el=>{const p0=+el.dataset.p;let p=p0,k=ink(p);
    for(let d=2;k.c<4.5&&d<=40;d+=2){for(const q of [p0+d,p0-d]){if(q<14||q>100)continue;const t=ink(q);if(t.c>=4.5){p=q;k=t;break;}}}
    if(p!==p0)el.style.background=`color-mix(in srgb, var(--accent) ${p}%, var(--surface-2))`;
    el.firstChild.style.color=k.v;});
}
function refreshMonth(anim){passBegin();try{refreshMonth1(anim);}finally{passEnd();}}
function refreshMonth1(anim){
  const m=S[year][view],D=dv(m);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('tcm-st',tcmInfo(m));
  set('kI',fmt(D.ing));set('kG',fmt(D.gas));set('kV',fmt(D.inv));set('kA',fmt(D.aho));set('kR',fmt(D.res));
  const r=document.getElementById('kR');if(r)r.classList.toggle('neg',D.res<0);
  ['ing','liq','fij','hor','inv'].forEach(s=>{const v=sumIn(m,s);const fx={};(m[s]||[]).forEach(r=>{if(r.cur&&r.cur!==curOf(s)&&+r.m)fx[r.cur]=(fx[r.cur]||0)+(+r.m);});const inc=Object.keys(fx).map(c=>c+' '+num2(fx[c])).join(' y ');set('t-'+s,fmtC(s,v)+(curOf(s)!=='S/'?' ≈ '+fmt(solesOf(m,s)):'')+(inc?' · incluye '+inc:''));});
  CARDS.forEach(k=>{const debt=cardEnding(year,view,k),lim=+(cfg.credito||{})[k]||0,cd=document.getElementById('cd-'+k);set('cd-'+k,fmtC(k,debt));set('ca-'+k,fmtC(k,lim-debt));const cm=document.getElementById('cm-'+k);if(cm)cm.style.width=(lim>0?Math.min(100,Math.max(0,debt/lim*100)):0)+'%';if(cd)cd.classList.toggle('neg',debt>0);const cp=document.getElementById('cp-'+k);if(cp)cp.innerHTML=payInfo(k,view).h;});
  {const dg=document.getElementById('dgbox');if(dg)dg.innerHTML=dgInner(m);}
  {const c=document.getElementById('ciebox');if(c)c.innerHTML=cierreInner(view);}
  {const is=document.getElementById('ingsum');if(is)is.innerHTML=ingSumInner(m);}
  const pm=PM();if(!m.q)m.q=[50,30,20];
  pm.rows.forEach((r,j)=>{
    const used=r[2]==='ai'?D.aho+D.inv+D.aiG:D[r[2]],amt=D.ing*m[pm.k][j]/100,over=used>amt&&amt>0,bar=document.getElementById('pb'+j);
    set('pm'+j,fmt(amt));
    if(bar){bar.style.width=(amt>0?Math.min(100,used/amt*100):0)+'%';bar.style.background=(r[3]==='max'&&over)?'var(--bad)':r[1];}
    set('pu'+j,(r[3]==='max'?'Gastado ':'Llevas ')+fmt(used)+' de '+fmt(amt));
    const st=document.getElementById('ps'+j);
    if(st){let txt,cls;
      if(amt<=0){txt='Sin ingreso';cls='pill';}
      else if(r[3]==='max'){txt=over?'Te pasaste '+fmt(used-amt):'Dentro del límite';cls='pill '+(over?'bad':'ok');}
      else{txt=used>=amt?'Meta cumplida':'Faltan '+fmt(amt-used);cls='pill '+(used>=amt?'ok':'warn');}
      st.textContent=txt;st.className=cls;}
  });
  const sp=m[pm.k].reduce((a,x)=>a+(+x||0),0),ps=document.getElementById('psum');
  if(ps){ps.textContent='Suma de porcentajes: '+sp+'%'+(sp===100?'':' (debería sumar 100%)');ps.style.color=sp===100?'':'var(--bad)';}
  const hv=document.getElementById('hR');if(hv)hv.textContent=fmt(D.res);
  {const hl=document.getElementById('hL'),lq=sum(m.liq);if(hl){hl.textContent=fmtC('liq',lq);hl.classList.toggle('neg',lq<0);}}
  const hb=document.getElementById('hbar'),tot=Math.max(D.ing,D.gas+D.aho+D.inv)||1;
  const sg=[['Fijos',D.fij,'var(--c-fij)'],['Cotidiano',D.hor,'var(--c-hor)'],['Ahorro',D.aho,'var(--c-aho)'],['Inversión',D.inv,'var(--c-inv)']];
  if(hb)hb.innerHTML=sg.map(x=>`<span style="width:${x[1]/tot*100}%;background:${x[2]}"></span>`).join('')+`<span style="width:${Math.max(0,D.res)/tot*100}%;background:rgba(255,255,255,.5)"></span>`;
  const hl=document.getElementById('hleg');if(hl)hl.innerHTML=sg.map(x=>`<span><i style="background:${x[2]}"></i>${x[0]} ${num2(x[1])}</span>`).join('');
  const p=document.getElementById('pillh');if(p)p.hidden=!(D.hor>cfg.alerta);
  drawMonthCharts(!!anim);
}

