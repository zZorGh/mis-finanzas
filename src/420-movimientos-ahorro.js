/* ---------- Movimientos de ahorro: depositar, retirar, ajustar y mover ---------- */
function moveAccts(y,i,to){
  const m=S[y][i],out=[];
  (m.liq||[]).forEach((r,j)=>{if((r.c||'').trim())out.push(['liq:'+j,r.c.trim()+' · '+curOf('liq')+' '+num2(+r.m||0),'--h-liq']);});
  ahoAccts(y,i).forEach(a=>{if(Math.abs(a.v)>=.005)out.push(['aho:'+a.c,a.c+' · '+fmt(a.v),'--c-aho']);});
  if(to)out.push(['aho:+','+ Nueva cuenta de ahorro','--c-aho']);
  return out;
}
function ahoPreview(){
  const m=S[ent.yr][+ent.mo],el=document.getElementById('sa'),amt=parseMonto(el?el.value:'')||0,ax=ent.ax||'dep';
  if(ax==='mov')return 'No es gasto ni ingreso: solo cambia dónde está tu dinero';
  const id=ent.from||'';
  if(!id)return ax==='aj'?'Elige la cuenta y escribe su saldo real':'Elige la cuenta';
  const nm=(id.slice(0,4)==='aho:'&&id!=='aho:+')?id.slice(4):'',a=nm?ahoOf(ent.yr,+ent.mo,nm):null,cur0=a?a.v:0,lbl=nm||'Cuenta nueva',sol=amt*rateC(entCur(),m);
  if(ax==='aj'){const d=sol-cur0;return lbl+': '+fmt(cur0)+' → '+fmt(sol)+(Math.abs(d)>=.005?' (ajuste '+(d>0?'+':'−')+fmt(Math.abs(d))+')':'')+' · No cambia lo que te queda';}
  if(!amt)return lbl+': saldo '+fmt(cur0);
  const sg=ax==='dep'?1:-1;
  return lbl+': '+fmt(cur0)+' → '+fmt(cur0+sg*sol)+' · Te quedan '+fmt(dv(m).res-sg*sol)+' este mes';
}
function doAho(o){
  const m=S[o.yr][o.mo],cur=o.cur||curOf('aho'),def=curOf('aho');
  const nameOf=id=>id==='aho:+'?((o.desc||'').trim()||'Nueva cuenta'):id.slice(4);
  const mk=(n,v)=>{const r=row(n,Math.round(v*100)/100,o.fch,'');if(cur!==def)r.cur=cur;return r;};
  const add=r=>addRow(o.yr,o.mo,'aho',r),bal=n=>(ahoOf(o.yr,o.mo,n)||{v:0}).v;
  if(o.ax==='dep'||o.ax==='ret'){
    const sg=o.ax==='dep'?1:-1,nm=nameOf(o.from),r=mk(nm,sg*o.amt);
    if(sg>0&&o.goal)r.k=o.goal;
    if(o.src&&o.src!=='none')r.src=o.src;
    add(r);const dd=r.src?applyDed(m,r,'aho'):'';
    return (sg>0?'Depositaste ':'Retiraste ')+cur+' '+num2(o.amt)+(sg>0?' en ':' de ')+nm+dd+' · saldo '+fmt(bal(nm));
  }
  if(o.ax==='aj'){
    const nm=nameOf(o.from),b0=bal(nm),target=o.amt*rateC(cur,m),d=Math.round((target-b0)*100)/100;
    if(Math.abs(d)<.005)return nm+' ya tenía ese saldo: '+fmt(b0);
    const r=mk(nm,d/rateC(cur,m));r.t='aj';add(r);
    return 'Saldo de '+nm+' ajustado: '+fmt(b0)+' → '+fmt(target)+' (no cuenta como ahorro del mes)';
  }
  const fa=o.from.slice(0,4)==='aho:',ta=o.to.slice(0,4)==='aho:';
  const fn=fa?nameOf(o.from):((m.liq[+o.from.slice(4)]||{}).c||'Liquidez'),tn=ta?nameOf(o.to):((m.liq[+o.to.slice(4)]||{}).c||'Liquidez');
  if(fa&&ta){const id='tr:'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36),a=mk(fn,-o.amt),b=mk(tn,o.amt);a.t=b.t=id;add(a);add(b);}
  else if(fa){const r=mk(fn,-o.amt);r.src=o.to;add(r);applyDed(m,r,'aho');}
  else if(ta){const r=mk(tn,o.amt);r.src=o.from;if(o.goal)r.k=o.goal;add(r);applyDed(m,r,'aho');}
  else{
    const sol=o.amt*rateC(cur,m),L1=m.liq[+o.from.slice(4)],L2=m.liq[+o.to.slice(4)];
    if(L1)L1.m=Math.round(((+L1.m||0)-sol/rate('liq',m))*100)/100;
    if(L2)L2.m=Math.round(((+L2.m||0)+sol/rate('liq',m))*100)/100;
  }
  return 'Moviste '+cur+' '+num2(o.amt)+' de '+fn+' a '+tn;
}
function saveTasa(acct,tipo,val){
  const v=parseFloat(String(val).replace(',','.').replace('%',''));
  if(!(v>0&&v<1000)){toast('Escribe la tasa anual en %, por ejemplo 4.5');return;}
  cfg.ahoTasa=Object.assign({},cfg.ahoTasa,{[String(acct).trim().toLowerCase()]:{t:tipo==='TEA'?'TEA':'TREA',v:Math.round(v*1000)/1000}});
  save();render();toast('Guardado: '+(tipo==='TEA'?'TEA':'TREA')+' '+num2(v)+'% en '+acct);
}
function renameAho(old,nu){
  nu=String(nu||'').trim();
  if(!nu){toast('Escribe un nombre para la cuenta.');return;}
  if(nu===old){render();return;}
  const snap=[],had=!!ahoOf(String(year),11,nu),lo=old.toLowerCase(),T0=cfg.ahoTasa;
  Object.keys(S).forEach(y=>S[y].forEach(m=>(m.aho||[]).forEach(r=>{if((r.c||'').trim().toLowerCase()===lo){snap.push([r,r.c]);r.c=nu;}})));
  {const T=cfg.ahoTasa||{},nk=nu.toLowerCase();if(T[lo]&&!T[nk]){cfg.ahoTasa=Object.assign({},T);cfg.ahoTasa[nk]=T[lo];delete cfg.ahoTasa[lo];}}
  save();render();
  toast(had&&nu.toLowerCase()!==lo?old+' ahora es parte de '+nu+' (se juntaron sus saldos)':'Cuenta renombrada: '+old+' → '+nu,{fn:()=>{snap.forEach(x=>{x[0].c=x[1];});cfg.ahoTasa=T0;}});
}
function ahoDo(o){
  const m=S[o.yr][o.mo],snap=JSON.stringify({liq:m.liq,aho:m.aho}),msg=doAho(o);
  return{msg,u:{fn:()=>{const s=JSON.parse(snap);m.liq=s.liq;m.aho=s.aho;}}};
}
/* Por pagar este mes: los recurrentes (cfg.rec) de gastos que aún no están registrados en el mes. Un toque en «Pagado» los registra. */
function pendRec(i){const m=S[year][i];return (cfg.rec||[]).map((r,k)=>[k,r]).filter(([k,r])=>(r.s==='fij'||r.s==='hor')&&(r.c||'').trim()&&+r.m>0&&!(m[r.s]||[]).some(x=>(x.c||'').trim().toLowerCase()===r.c.trim().toLowerCase()));}
function recAdd(r,i){const m=S[year][i];const u=addRow(year,i,r.s,row(r.c,r.m,Math.min(31,Math.max(1,+r.f||1))+'-'+ABR[i].toLowerCase(),r.k||'',(r.src&&r.src!=='none')?r.src:''));if(u.r.src)applyDed(m,u.r,r.s);return u;}
/* Avisos del mes en curso (hasta 3, los más urgentes primero): cotidianos a ritmo de pasarse, cuenta en negativo, tarjeta por pagar y meta de ahorro.
   Se calculan con lo que ya hay; no hay servidor, así que aparecen al abrir la app. «Entendido por hoy» los oculta hasta mañana. */
function avisosMes(i){
  const cur=Number(year)*12+i,nowI=now.getFullYear()*12+now.getMonth();if(cur!==nowI)return[];
  const m=S[year][i],D=dv(m),d=now.getDate(),dim=new Date(now.getFullYear(),i+1,0).getDate(),out=[];
  if(cfg.alerta>0&&D.hor>0){
    if(D.hor>cfg.alerta)out.push({s:3,t:'Ya pasaste tu alerta de gastos cotidianos: '+fmt(D.hor)+' de '+fmt(cfg.alerta)+'.'});
    else if(d>=5){const pr=D.hor/d*dim;if(pr>cfg.alerta*1.05)out.push({s:2,t:'A este ritmo cerrarás cotidianos en '+fmt(pr)+' (tu alerta es '+fmt(cfg.alerta)+'). Quedan '+(dim-d)+(dim-d===1?' día':' días')+'.'});}}
  (m.liq||[]).forEach(r=>{if((r.c||'').trim()&&(+r.m||0)<-0.004)out.push({s:3,t:'«'+r.c.trim()+'» está en negativo ('+fmt(+r.m)+'). Cuadra tus cuentas o mueve dinero.'});});
  const lq=sumIn(m,'liq'),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  CARDS.forEach(k=>{
    const pd=+((cfg.pagoDia||{})[k])||0,st=cardStmt(k),debt=st?st.due:cardEnding(year,i,k);if(!pd||!(debt>0))return;
    if(st&&st.dueDate){const dl=st.dl;if(dl>5)return;const cuando=dl===0?'hoy':dl===1?'mañana':dl>0?'en '+dl+' días':'venció hace '+(-dl)+(dl===-1?' día':' días');
      out.push({s:dl<=1?3:2,t:(dl<0?'El pago de '+BANKN[k]+' '+cuando+': debes '+fmtC(k,debt)+' del corte del '+fechaL(st.cut):'Pagas '+BANKN[k]+' '+cuando+': debes '+fmtC(k,debt)+' del corte del '+fechaL(st.cut))+(lq<debt?'; tu liquidez es '+fmt(lq)+', no alcanza.':'.')});return;}
    let y=t0.getFullYear(),mo=t0.getMonth();if(t0.getDate()>Math.min(pd,new Date(y,mo+1,0).getDate())){mo++;if(mo>11){mo=0;y++;}}
    const fd=new Date(y,mo,Math.min(pd,new Date(y,mo+1,0).getDate())),dl=Math.round((fd-t0)/864e5);if(dl>5)return;
    const cuando=dl===0?'hoy':dl===1?'mañana':'en '+dl+' días';
    out.push({s:dl<=1?3:2,t:'Pagas '+BANKN[k]+' '+cuando+': debes '+fmtC(k,debt)+(lq<debt?'; tu liquidez es '+fmt(lq)+', no alcanza.':'.')});});
  if(D.ing>0&&d>=20&&cfg.meta>0){const pc=D.aho/D.ing*100;if(pc<cfg.meta)out.push({s:1,t:'Llevas ahorrado el '+Math.round(Math.max(0,pc))+'% de tu ingreso; tu meta es '+cfg.meta+'%. Faltan '+fmt(D.ing*cfg.meta/100-D.aho)+'.'});}
  return out.sort((a,b)=>b.s-a.s).slice(0,3);
}
function avisosHtml(i){
  let hide='';try{hide=localStorage.getItem(KEY+'-avisos')||'';}catch(e){}
  if(hide===todayStr())return'';
  const a=avisosMes(i);if(!a.length)return'';
  return '<section class="avcard" aria-label="Avisos"><div class="pph"><b>Para tener en cuenta</b><button type="button" class="lnk" data-avx="1">Entendido por hoy</button></div><ul>'
    +a.map(x=>'<li class="av s'+x.s+'"><i aria-hidden="true"></i><span>'+esc(x.t)+'</span></li>').join('')+'</ul></section>';
}
function porPagarHtml(i){
  const cur=Number(year)*12+i,nowI=now.getFullYear()*12+now.getMonth();if(cur<nowI)return'';
  const p=pendRec(i);if(!p.length)return'';
  const isNow=cur===nowI,td=now.getDate(),tot=p.reduce((a,x)=>a+(+x[1].m),0);
  const rows=p.map(([k,r])=>{
    const f=Math.min(31,Math.max(1,+r.f||1));let w='día '+f,cls='';
    if(isNow){const d=f-td;if(d<0){w='venció hace '+(-d)+(d===-1?' día':' días');cls=' late';}else if(d===0){w='vence hoy';cls=' today';}else w='en '+d+(d===1?' día':' días');}
    const acct=(r.src&&r.src!=='none')?(LIQN()[+r.src.slice(4)]||''):'';
    return '<li class="pp'+cls+'"><div><b>'+esc(r.c)+'</b><span class="ms"><span class="w">'+w+'</span>'+(acct?'<span>· '+esc(acct)+'</span>':'')+'</span></div><b class="ppm">'+fmt(+r.m)+'</b><button type="button" class="b pbtn" data-pay="'+k+'" aria-label="Marcar '+esc(r.c)+' como pagado">Pagado</button></li>';}).join('');
  return '<section class="ppcard" aria-label="Por pagar"><div class="pph"><b>'+(isNow?'Por pagar este mes':'Por pagar')+'</b><span class="ms">'+p.length+' · '+fmt(tot)+'</span></div><ul>'+rows+'</ul></section>';
}
function payRec(k){
  const r=(cfg.rec||[])[k];if(!r||typeof view!=='number')return;const m=S[year][view];
  const l=(r.src&&r.src!=='none')?liqRef(m,r.src):null;
  if(l&&(+l.m||0)-dedAmt(m,{m:r.m},r.s)<-0.004){
    /* No alcanza: pasa por el registro, que avisa y ofrece otras cuentas o dividir el pago */
    openSheet();ent.t=r.s;ent.clsManual=1;ent.cat=r.k||'';ent.src=r.src;
    const sd=document.getElementById('sd'),sa=document.getElementById('sa');if(sd)sd.value=r.c;if(sa)sa.value=String(r.m);
    syncSheet();negWarn();return;}
  const u=recAdd(r,view);track('atajo','por_pagar');save();render();toast('Pagado: '+r.c+' · '+fmt(+r.m),u);
}
function doRec(){
  const rec=cfg.rec||[];
  if(!rec.length){toast('Todavía no tienes recurrentes. Agrégalos en Ajustes, dentro del Resumen.');return;}
  const m=S[year][view];let n=0,sinSaldo=0;const neg=[];
  rec.forEach(r=>{
    if(m[r.s].some(x=>(x.c||'').trim().toLowerCase()===r.c.trim().toLowerCase()))return;
    const l=(r.src&&r.src!=='none')?liqRef(m,r.src):null;
    if(l&&(+l.m||0)-dedAmt(m,{m:r.m},r.s)<-0.004){
      if(cfg.bloquearNeg){sinSaldo++;return;}
      if(neg.indexOf(l.c)<0)neg.push(l.c);
    }
    recAdd(r,view);n++;
  });
  if(!n&&!sinSaldo){toast('Tus recurrentes ya están cargados en este mes.');return;}
  if(n){save();render();}
  if(sinSaldo)toast('Cargados: '+n+'. Sin saldo, no se cargaron: '+sinSaldo+'.');
  else if(neg.length)toast('Cargados: '+n+'. Ojo, queda en negativo: '+neg.join(', ')+'.');
  else toast('Se cargaron '+n+(n===1?' recurrente':' recurrentes')+' en '+MES[view]);
}
function openCierre(){
  closeSheet();closePanel();sheetFrom=document.activeElement;
  const pn=view>0?MES[view-1].toLowerCase():'diciembre';
  const it=[['cuad','Cuadrar cuentas','Escribe el saldo real de Yape, Plin y efectivo; la app ajusta las diferencias.'],['rec','Cargar recurrentes','Agrega tus gastos de cada mes: alquiler, servicios, estudios. No se duplican.'],['prev','Traer del mes anterior','Trae tus saldos y lo que debes en tarjetas de '+pn+'. Los gastos de cada mes se marcan en «Por pagar».'],['rep','Descargar reporte','Tu estado de cuenta en PDF o Excel.']];
  const bg=document.createElement('div');bg.id='sheetbg';bg.className='sheetbg';
  const sh=document.createElement('div');sh.id='sheet';sh.className='sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Cierre de mes');
  sh.innerHTML=`<div class="sh-h"><b>Cierre de ${MES[view].toLowerCase()}</b><button type="button" data-s="close" aria-label="Cerrar">×</button></div><div class="ms">Lo que conviene hacer al empezar o terminar el mes.</div><div class="cmenu">${it.map(x=>`<button type="button" class="cm-i" data-act="${x[0]}"><b>${x[1]}</b><span>${x[2]}</span></button>`).join('')}</div>`;
  document.body.append(bg,sh);
  bg.addEventListener('click',closeSheet);
  sh.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
  sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.s==='close'){closeSheet();return;}const a=b.dataset.act;if(!a)return;closeSheet();if(a==='prev')doPrev();else if(a==='rec')doRec();else if(a==='cuad')openCuadre();else if(a==='rep')openReport();});
  const f=sh.querySelector('.cm-i');if(f)f.focus();
}
/* Historial de una cuenta de liquidez en el mes: todo lo que movió su saldo y quedó registrado (gastos, ingresos, pago de tarjeta, depósitos y retiros de ahorro).
   Cada fila guarda en _d cuánto descontó (o sumó, con signo negativo), así que el saldo de partida sale de restar eso al saldo de ahora:
   incluye lo traído del mes anterior, los ajustes de «Cuadrar cuentas» y los movimientos entre cuentas de liquidez, que no dejan fila. */
function histCuenta(m,i){
  const out=[];
  [['ing','Ingreso'],['fij','Gasto fijo'],['hor','Cotidiano'],['aho','Ahorro']].forEach(([s,lb])=>(m[s]||[]).forEach((r,k)=>{
    if(r&&r.src==='liq:'+i&&typeof r._d==='number'&&Number.isFinite(r._d)&&r._d!==0){
      const tipo=s==='fij'&&r.card?'Pago de tarjeta':s==='aho'?(+r.m<0?'Retiro de ahorro':'Depósito a ahorro'):lb;
      out.push({s,k,r,ef:-r._d,day:parseInt(r.f)||0,tipo,nom:s==='aho'?(r.c||'Ahorro'):(r.c||'Sin descripción')});}
  }));
  out.sort((a,b)=>a.day-b.day);
  const ahora=+((m.liq[i]||{}).m)||0,suma=out.reduce((a,x)=>a+x.ef,0),partida=Math.round((ahora-suma)*100)/100;
  let run=partida;out.forEach(x=>{run=Math.round((run+x.ef)*100)/100;x.saldo=run;});
  return{out,ahora,suma:Math.round(suma*100)/100,partida};
}
function openHist(i){
  if(typeof view!=='number')return;
  closeSheet();closePanel();sheetFrom=document.activeElement;
  const m=S[year][view],l=m.liq[i];if(!l)return;
  const h=histCuenta(m,i),nm=(l.c||'').trim()||'Cuenta',sg=v=>(v>0?'+ ':v<0?'− ':'')+fmtC('liq',Math.abs(v));
  const bg=document.createElement('div');bg.id='sheetbg';bg.className='sheetbg';
  const sh=document.createElement('div');sh.id='sheet';sh.className='sheet hist';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Movimientos de '+nm);
  sh.innerHTML='<div class="sh-h"><b>'+esc(nm)+' · '+MES[view]+'</b><button type="button" data-s="close" aria-label="Cerrar">×</button></div>'
    +'<div class="hsum"><div class="hbig"><span>Saldo ahora</span><b class="'+(h.ahora<0?'neg':'')+'">'+fmtC('liq',h.ahora)+'</b></div>'
    +'<div><span class="ms">Saldo de partida</span><b>'+fmtC('liq',h.partida)+'</b></div>'
    +'<div><span class="ms">Movimientos del mes</span><b class="'+(h.suma>0?'pos':h.suma<0?'neg':'')+'">'+(h.out.length?sg(h.suma):fmtC('liq',0))+'</b></div></div>'
    +(h.out.length?'<ul>'+h.out.map(x=>'<li><button type="button" class="hr" data-hedit="'+x.s+':'+x.k+'" aria-label="Editar '+esc(x.nom)+'"><span class="hd">'+esc((x.r.f||'').replace('-',' '))+'</span><span class="hc"><span>'+esc(x.nom)+'</span><span>'+x.tipo+'</span></span><span class="hm"><b class="'+(x.ef>0?'pos':'neg')+'">'+sg(x.ef)+'</b><span>'+fmtC('liq',x.saldo)+'</span></span></button></li>').join('')+'</ul>'
      :'<div class="ms">Este mes todavía no hay movimientos registrados con esta cuenta.</div>')
    +'<div class="ms hnote">El saldo de partida incluye lo que traías del mes anterior, los ajustes de «Cuadrar cuentas» y lo que moviste entre tus cuentas de liquidez, que no se detalla aquí.</div>';
  document.body.append(bg,sh);
  bg.addEventListener('click',closeSheet);
  sh.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
  sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.s==='close'){closeSheet();return;}
    if(b.dataset.hedit){const [s,k]=b.dataset.hedit.split(':');closeSheet();openEdit(s,+k,view);}});
  const f=sh.querySelector('button');if(f)f.focus();
}
function openCuadre(){
  closeSheet();closePanel();sheetFrom=document.activeElement;
  const m=S[year][view],items=[];
  m.liq.forEach((r,i)=>{if((r.c||'').trim())items.push({k:'liq',i,label:r.c.trim(),cur:curOf('liq'),val:+r.m||0});});
  const bg=document.createElement('div');bg.id='sheetbg';bg.className='sheetbg';
  const sh=document.createElement('div');sh.id='sheet';sh.className='sheet';
  sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Cuadrar cuentas');
  sh.innerHTML=`<div class="sh-h"><b>Cuadrar cuentas · ${MES[view]}</b><button type="button" data-s="close" aria-label="Cerrar">×</button></div>
  <div class="ms">Escribe el saldo real que ves en tu app o tu billetera. Lo que no escribas se deja igual.</div>
  <div class="cuad">${items.map((it,j)=>`<div class="cr"><div><b>${esc(it.label)}</b><div class="ms">En la página: ${it.cur} ${num2(it.val)}</div></div><input type="text" inputmode="decimal" data-cq="${j}" placeholder="Real" aria-label="Saldo real de ${esc(it.label)}"><span class="cd" id="cd${j}"></span></div>`).join('')}</div>
  <div class="sdest" id="cmsg" role="status"></div>
  <div class="sact"><button class="b" type="button" data-s="close">Cerrar</button><button class="b p" type="button" data-s="apply">Aplicar ajustes</button></div>`;
  document.body.append(bg,sh);
  const val=j=>{const v=document.getElementById('sheet').querySelector('[data-cq="'+j+'"]').value.trim();return v===''?null:num(v);};
  bg.addEventListener('click',closeSheet);
  sh.addEventListener('input',e=>{const j=e.target.dataset.cq;if(j===undefined)return;const v=val(j),it=items[+j],c=document.getElementById('cd'+j);
    if(v===null){c.textContent='';c.className='cd';return;}
    const d=Math.round((v-it.val)*100)/100;c.textContent=d===0?'Coincide':(d>0?'Sobran ':'Faltan ')+num2(Math.abs(d));c.className='cd '+(d===0?'ok':'bad');});
  sh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.s==='close')closeSheet();
    else if(b.dataset.s==='apply'){
      let n=0;
      items.forEach((it,j)=>{const v=val(j);if(v===null)return;const d=Math.round((v-it.val)*100)/100;if(d===0)return;
        if(it.k==='liq'){m.liq[it.i].m=v;m.lb={x:1};}n++;});
      if(!n){document.getElementById('cmsg').textContent='No hay diferencias para ajustar.';return;}
      save();closeSheet();render();toast('Ajusté '+n+(n===1?' cuenta':' cuentas')+' para que cuadren con tu saldo real');
    }});
  sh.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
  const f=sh.querySelector('input');if(f)f.focus();
}
let dl=null;
const BK=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
/* Importar movimientos del banco. El archivo se lee solo en este navegador; a la nube llega únicamente lo que la persona revisa y confirma,
   como filas normales con la marca `imp` (permite deshacer la última importación también después del aviso). */
const IMP_MAX=3000,IMP_BYTES=5*1024*1024,IMP_SEC=['ing','fij','hor'].concat(CARD_ALL),IMP_PAG=40;
const IMP_XLSX='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',IMP_SRI='sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz';
const IMP_MES={ene:0,jan:0,feb:1,mar:2,abr:3,apr:3,may:4,jun:5,jul:6,ago:7,aug:7,set:8,sep:8,oct:9,nov:10,dic:11,dec:11};
const IMP_FLAG={dup:'Ya está registrado',pos:'Posible duplicado',tr:'Entre tus cuentas',pago:'Pago a la tarjeta',fuera:'Fecha fuera de rango'};
let imp=null;
function impCsv(txt){
  txt=String(txt).replace(/^﻿/,'');
  const muestra=txt.split(/\r?\n/).slice(0,40).filter(l=>l.trim());let sep=',',best=-1;
  [',',';','\t','|'].forEach(d=>{const cs=muestra.map(l=>{let q=false,n=0;for(const ch of l){if(ch==='"')q=!q;else if(ch===d&&!q)n++;}return n;}).filter(n=>n>0);if(!cs.length)return;
    const f={};cs.forEach(n=>{f[n]=(f[n]||0)+1;});const moda=Object.keys(f).sort((a,b)=>f[b]-f[a])[0],s=f[moda]*Math.min(+moda,8);if(s>best){best=s;sep=d;}});
  const rows=[];let r=[],c='',q=false;const fin=()=>{r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r.map(x=>x.trim()));r=[];};
  for(let i=0;i<txt.length&&rows.length<=IMP_MAX+60;i++){const ch=txt[i];
    if(q){if(ch==='"'){if(txt[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch;continue;}
    if(ch==='"'&&!c){q=true;continue;}
    if(ch===sep){r.push(c);c='';continue;}
    if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;fin();continue;}
    c+=ch;}
  if(c||r.length)fin();
  return rows;
}
function impCelda(v){
  if(v==null)return'';if(v instanceof Date)return Number.isNaN(+v)?'':v.toISOString().slice(0,10);
  if(typeof v==='number')return v;if(typeof v!=='object')return String(v).trim();
  if('result' in v)return impCelda(v.result);if(Array.isArray(v.richText))return v.richText.map(x=>x.text||'').join('').trim();
  return v.text!=null?String(v.text).trim():'';
}
function impExcelJS(){
  if(window.ExcelJS)return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement('script');s.src=IMP_XLSX;s.integrity=IMP_SRI;s.crossOrigin='anonymous';s.onload=()=>ok();s.onerror=()=>{s.remove();no(new Error('No pude abrir el Excel. Revisa tu conexión o usa un CSV.'));};document.head.appendChild(s);});
}
async function impLeer(file){
  const buf=await file.arrayBuffer(),u=new Uint8Array(buf);
  if(u[0]===0x50&&u[1]===0x4B){
    await impExcelJS();const wb=new window.ExcelJS.Workbook();
    try{await wb.xlsx.load(buf);}catch(e){throw new Error('No pude leer ese Excel. Prueba guardarlo como CSV.');}
    let ws=null;wb.worksheets.forEach(x=>{if(!ws||x.rowCount>ws.rowCount)ws=x;});if(!ws)return[];
    const rows=[];ws.eachRow({includeEmpty:false},r=>{if(rows.length>IMP_MAX+60)return;const a=[];for(let i=1;i<=r.cellCount;i++)a.push(impCelda(r.getCell(i).value));if(a.some(x=>x!==''))rows.push(a);});
    return rows;
  }
  if(u[0]===0xD0&&u[1]===0xCF)throw new Error('Ese Excel es de formato antiguo (.xls). Ábrelo y guárdalo como .xlsx o CSV.');
  let txt;
  if(u[0]===0xFF&&u[1]===0xFE)txt=new TextDecoder('utf-16le').decode(u);
  else{try{txt=new TextDecoder('utf-8',{fatal:true}).decode(u);}catch(e){txt=new TextDecoder('windows-1252').decode(u);}}
  if(/^\s*<(?:!doctype|html|table|meta|head)/i.test(txt.slice(0,600))){
    const d=new DOMParser().parseFromString(txt,'text/html');let t=null;d.querySelectorAll('table').forEach(x=>{if(!t||x.rows.length>t.rows.length)t=x;});if(!t)return[];
    return [...t.rows].slice(0,IMP_MAX+60).map(r=>[...r.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim())).filter(r=>r.some(Boolean));
  }
  return impCsv(txt);
}
function impDetectar(rows){
  const roles=h=>{const q={fecha:-1,conc:-1,monto:-1,cargo:-1,abono:-1,moneda:-1};
    h.forEach((v,i)=>{if(typeof v!=='string'||!v)return;const n=normTxt(v).trim();if(n.length>40||/saldo|balance/.test(n))return;
      if(/\bfecha\b|^date\b|^f\.?\s*(?:oper|proc)/.test(n)){if(q.fecha<0||/oper|consumo|transac/.test(n)&&!/oper|consumo|transac/.test(normTxt(String(h[q.fecha]))))q.fecha=i;return;}
      if(/moneda|divisa|currency/.test(n)){if(q.moneda<0)q.moneda=i;return;}
      if(/descrip|concepto|detalle|glosa|comercio|establecimiento|movimiento|referencia/.test(n)){if(q.conc<0)q.conc=i;return;}
      if(/cargo|debito|retiro|egreso|\bdebe\b|salida/.test(n)&&!/tipo/.test(n)){if(q.cargo<0)q.cargo=i;return;}
      if(/abono|credito|deposito|ingreso|\bhaber\b|entrada/.test(n)&&!/tipo/.test(n)){if(q.abono<0)q.abono=i;return;}
      if(/^(?:monto|importe|valor|amount)/.test(n)&&q.monto<0)q.monto=i;});return q;};
  for(let i=0;i<Math.min(rows.length,40);i++){const q=roles(rows[i]);if(q.fecha>=0&&(q.monto>=0||q.cargo>=0||q.abono>=0))return{h:i,map:q};}
  return{h:0,map:roles(rows[0]||[])};
}
function impNum(v){
  if(typeof v==='number')return Number.isFinite(v)?{n:v,cur:''}:null;
  let s=String(v==null?'':v).trim();if(!s)return null;const low=s.toLowerCase();
  const cur=/us\$|usd|\$|d[oó]lar/.test(low)?'$':/€|eur/.test(low)?'€':/s\/|pen|soles?/.test(low)?'S/':'';
  const neg=/^\(.*\)$/.test(s)||/^[-−–]/.test(s)||/[-−–]\s*$/.test(s)||/^(?:s\/\.?|us\$|\$|€|usd|pen|eur)\s*[-−–]/i.test(s);
  s=s.replace(/[()\-−–\s]/g,'').replace(/us\$|usd|pen|eur|soles?|d[oó]lar(?:es)?|s\/\.?|[$€]/gi,'');
  const n=parseMonto(s);return Number.isFinite(n)?{n:neg?-n:n,cur}:null;
}
function impOrden(vals){let dmy=0,mdy=0;vals.forEach(v=>{const x=typeof v==='string'&&/^(\d{1,2})[-\/.](\d{1,2})(?:[-\/.]\d{2,4})?/.exec(v.trim());if(!x)return;if(+x[1]>12)dmy++;else if(+x[2]>12)mdy++;});return mdy>0&&dmy===0?'mdy':'dmy';}
function impFecha(v,ord){
  let y=0,m,d;
  if(typeof v==='number'){if(v<20000||v>80000)return null;const t=new Date(Math.round((v-25569)*864e5));y=t.getUTCFullYear();m=t.getUTCMonth();d=t.getUTCDate();}
  else{const s=normTxt(String(v||'')).trim();let x;
    if((x=/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s))){y=+x[1];m=+x[2]-1;d=+x[3];}
    else if((x=/^(\d{1,2})[-\/.](\d{1,2})(?:[-\/.](\d{2,4}))?(?!\d)/.exec(s))){const a=+x[1],b=+x[2];d=ord==='mdy'?b:a;m=(ord==='mdy'?a:b)-1;y=x[3]?+x[3]:0;}
    else if((x=/^(\d{1,2})[\s\-\/.]*(?:de\s+)?([a-z]{3})[a-z]*\.?(?:[\s\-\/.]*(?:de\s+)?(\d{2,4}))?/.exec(s))&&IMP_MES[x[2]]!=null){d=+x[1];m=IMP_MES[x[2]];y=x[3]?+x[3]:0;}
    else return null;}
  if(y>0&&y<100)y+=2000;
  const hoy=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(!y){y=now.getFullYear();if(new Date(y,m,d)>hoy)y--;}
  const f=new Date(y,m,d);return f.getFullYear()===y&&f.getMonth()===m&&f.getDate()===d?{y,m,d,fut:f>hoy}:null;
}
const impNorm=s=>normTxt(s).replace(/[^a-z0-9]/g,'');
const impEsT=k=>Object.prototype.hasOwnProperty.call(BANKN,k);
function impArmar(){
  const q=imp.map,rows=imp.rows.slice(imp.h+1),esT=impEsT(imp.dest),ord=impOrden(rows.map(r=>r[q.fecha])),dobles=q.cargo>=0||q.abono>=0;
  if(!imp.signoU){const hayNeg=!dobles&&q.monto>=0&&rows.some(r=>{const n=impNum(r[q.monto]);return n&&n.n<0;});imp.signo=esT?'pos':hayNeg?'neg':'pos';}
  const memo={},exist={},visto={};
  Object.keys(S).forEach(y=>S[y].forEach(m=>['fij','hor'].forEach(sec=>(m[sec]||[]).forEach(r=>{const n=impNorm(r.c);if(n&&!r.card)memo[n]={t:sec,k:r.k||''};}))));
  const cargaMes=(y,mo)=>{const id=y+'-'+mo;if(visto[id])return;visto[id]=1;const m=S[y][mo];IMP_SEC.forEach(sec=>(m[sec]||[]).forEach(r=>{const d=parseInt(r.f,10),a=+r.m||0;if(!d||!a)return;const k=id+'-'+d+'|'+Math.round(a*100)+'|'+(sec==='ing'?'in':'out');(exist[k]=exist[k]||[]).push(impNorm(r.c));}));};
  const items=[];let ign=0;
  rows.forEach(r=>{
    if(items.length>=IMP_MAX){imp.cortado=true;return;}
    const f=q.fecha>=0?impFecha(r[q.fecha],ord):null;let num=null,dir='';
    if(dobles){const c=q.cargo>=0?impNum(r[q.cargo]):null,a=q.abono>=0?impNum(r[q.abono]):null;if(c&&c.n){num=c;dir='out';}else if(a&&a.n){num=a;dir='in';}}
    else if(q.monto>=0){const n=impNum(r[q.monto]);if(n&&n.n){num=n;dir=(n.n<0)===(imp.signo==='neg')?'out':'in';}}
    if(!f||!num){ign++;return;}
    let cur=num.cur;if(q.moneda>=0){const mc=normTxt(String(r[q.moneda]||''));if(/usd|dol|\$|^us/.test(mc))cur='$';else if(/eur|€/.test(mc))cur='€';else if(/pen|sol|s\//.test(mc))cur='S/';}
    const c=String(q.conc>=0?r[q.conc]:'').replace(/\s+/g,' ').trim().replace(/^[=+\-@]+/,'').trim().slice(0,60)||'Sin descripción',a=Math.round(Math.abs(num.n)*100)/100;
    const it={y:String(f.y),mo:f.m,d:f.d,c,a,dir,cur:cur||imp.curDef,st:'ok',on:true,t:'',k:''};
    if(f.fut||!S[it.y]){it.st='fuera';it.on=false;}
    else{cargaMes(it.y,it.mo);const ex=exist[it.y+'-'+it.mo+'-'+it.d+'|'+Math.round(a*100)+'|'+dir];if(ex&&ex.length){const k=ex.indexOf(impNorm(c));if(k>=0){ex.splice(k,1);it.st='dup';}else{ex.shift();it.st='pos';}it.on=false;}}
    if(esT){it.t=imp.dest;if(dir==='in'){if(it.st==='ok')it.st='pago';it.on=false;}}
    else if(dir==='in')it.t='ing';
    else{const me=memo[impNorm(c)];it.t=me?me.t:(RULES.find(x=>x[0]==='fij')[1].test(c.toLowerCase())?'fij':'hor');it.k=me?me.k:'';}
    if(!esT&&it.st==='ok'&&/pago\s+(?:de\s+)?(?:tarjeta|tc\b)|entre\s+(?:mis\s+)?cuentas|traspaso|transf(?:erencia)?\s+propia/.test(normTxt(c))){it.st='tr';it.on=false;}
    items.push(it);});
  imp.items=items;imp.ign=ign;imp.pag=0;
}
function impSum(){
  const g=id=>document.getElementById(id);if(!imp||!g('imp-sum'))return;
  const its=imp.items,n=its.filter(x=>x.on).length,rev=its.filter(x=>x.st!=='ok').length;
  g('imp-sum').textContent=n+' de '+its.length+' seleccionados'+(rev?' · '+rev+' por revisar':'')+(imp.ign?' · '+imp.ign+' filas sin fecha o monto válidos':'');
  const b=g('imp-go');b.textContent='Importar '+n;b.disabled=!n;
}
function impPintar(){
  const bx=document.getElementById('impbox');if(!bx||!imp)return;
  const hdr=imp.rows[imp.h]||[],cols=hdr.map((h,i)=>[i,(typeof h==='string'&&h)?h.slice(0,28):'Columna '+(i+1)]);
  const op=(v,l,s)=>'<option value="'+esc(String(v))+'"'+(String(v)===String(s)?' selected':'')+'>'+esc(l)+'</option>';
  const sel=(k,l)=>'<label>'+l+'<select data-im="'+k+'">'+op(-1,'—',imp.map[k])+cols.map(c=>op(c[0],c[1],imp.map[k])).join('')+'</select></label>';
  const base=(S[String(now.getFullYear())]||[])[now.getMonth()]||{liq:[]};
  const dests=(base.liq||[]).map((r,i)=>[(r.c||'').trim()?'liq:'+i:'',(r.c||'').trim()]).filter(x=>x[0]).concat(Object.keys(BANKN).map(k=>[k,'Tarjeta '+BANKN[k]]));
  const vis=imp.filtro==='rev'?imp.items.map((x,i)=>[x,i]).filter(x=>x[0].st!=='ok'):imp.items.map((x,i)=>[x,i]),pags=Math.max(1,Math.ceil(vis.length/IMP_PAG));imp.pag=Math.min(imp.pag,pags-1);
  const lista=vis.slice(imp.pag*IMP_PAG,(imp.pag+1)*IMP_PAG).map(([x,i])=>{
    const tipo=impEsT(x.t)?'<span class="ms">Compra</span>':'<select data-it="'+i+'" aria-label="Tipo de movimiento">'+op('hor','Cotidiano',x.t)+op('fij','Fijo',x.t)+op('ing','Ingreso',x.t)+'</select>';
    return '<div class="imr"><input type="checkbox" data-ion="'+i+'" aria-label="'+esc(x.c)+'"'+(x.on?' checked':'')+(x.st==='fuera'?' disabled':'')+'><div class="imt"><b>'+esc(x.c)+'</b><span>'+x.d+' '+ABR[x.mo].toLowerCase()+' '+x.y+'</span>'+(x.st!=='ok'?' <span class="imfl">'+IMP_FLAG[x.st]+'</span>':'')+'</div><b class="ima'+(x.dir==='in'?' in':'')+'">'+(x.dir==='in'?'+':'−')+' '+esc(x.cur)+' '+num2(x.a)+'</b>'+tipo+'</div>';}).join('');
  const faltan=imp.map.fecha<0||(imp.map.monto<0&&imp.map.cargo<0&&imp.map.abono<0);
  bx.innerHTML='<div class="imh"><h2>Importar movimientos</h2><button class="b" type="button" id="imp-x" aria-label="Cerrar">×</button></div><div class="ms">'+esc(imp.nombre)+' · Se lee solo en tu dispositivo.</div>'
    +'<div class="imf"><label>¿De qué cuenta es?<select id="imp-dest">'+op('','Sin cuenta',imp.dest)+dests.map(d=>op(d[0],d[1],imp.dest)).join('')+'</select></label>'
    +'<label>Moneda si el archivo no la dice<select id="imp-cur">'+op('S/','Soles (S/)',imp.curDef)+op('$','Dólares ($)',imp.curDef)+op('€','Euros (€)',imp.curDef)+'</select></label>'
    +((imp.map.cargo<0&&imp.map.abono<0)?'<label>Los montos positivos son<select id="imp-signo">'+op('pos','Gastos',imp.signo)+op('neg','Ingresos',imp.signo)+'</select></label>':'')+'</div>'
    +(String(imp.dest).slice(0,4)==='liq:'?'<label class="chk"><input type="checkbox" id="imp-saldo"'+(imp.saldo?' checked':'')+'> Actualizar el saldo de esta cuenta</label><div class="ms">Déjalo apagado si el saldo que tienes en la app ya incluye estos movimientos.</div>':'')
    +'<details class="imcol"'+(faltan?' open':'')+'><summary>Columnas del archivo</summary><div class="imf">'+sel('fecha','Fecha')+sel('conc','Concepto')+sel('monto','Monto')+sel('cargo','Cargo')+sel('abono','Abono')+sel('moneda','Moneda')+'</div></details>'
    +(faltan?'<div class="ms imfl" role="alert">Elige qué columna tiene la fecha y cuál el monto.</div>':'')
    +(imp.cortado?'<div class="ms imfl" role="alert">El archivo es muy largo: solo se muestran los primeros 3000 movimientos.</div>':'')
    +'<div class="imbar"><div class="ms" id="imp-sum" role="status"></div><select id="imp-filtro" aria-label="Filtrar">'+op('todo','Ver todos',imp.filtro)+op('rev','Ver por revisar',imp.filtro)+'</select></div>'
    +'<div class="imlist">'+(lista||'<div class="ms">No hay movimientos que mostrar.</div>')+'</div>'
    +(pags>1?'<div class="imbar"><button class="b" type="button" data-ip="-1"'+(imp.pag?'':' disabled')+'>Anterior</button><span class="ms">Página '+(imp.pag+1)+' de '+pags+'</span><button class="b" type="button" data-ip="1"'+(imp.pag<pags-1?'':' disabled')+'>Siguiente</button></div>':'')
    +'<div class="ms imfl" id="imp-err" role="alert"></div><div class="imfoot"><button class="b" type="button" id="imp-cancel">Cancelar</button><button class="b p" type="button" id="imp-go">Importar</button></div>';
  impSum();
}
function impCerrar(){const b=document.getElementById('impbg');if(b)b.remove();imp=null;document.removeEventListener('keydown',impEsc);const o=document.getElementById('imp-open');if(o)o.focus();}
function impEsc(e){if(e.key==='Escape'){e.stopPropagation();impCerrar();}}
function impGuardar(){
  if(!imp)return;adoptForSheet();
  const its=imp.items.filter(x=>x.on&&S[x.y]);if(!its.length)return;
  const liq=imp.saldo&&String(imp.dest).slice(0,4)==='liq:'?imp.dest:'',usaSaldo=t=>liq&&(t==='hor'||t==='fij'||t==='ing');
  if(liq&&cfg.bloquearNeg){const d={};its.forEach(x=>{if(!usaSaldo(x.t))return;const m=S[x.y][x.mo],r={m:x.a};if(x.cur!==curOf(x.t))r.cur=x.cur;const k=x.y+'-'+x.mo;d[k]=(d[k]||0)+(x.t==='ing'?-1:1)*dedAmt(m,r,x.t);});
    if(Object.keys(d).some(k=>{const p=k.split('-'),l=liqRef(S[p[0]][+p[1]],liq);return l&&(+l.m||0)-d[k]<0;})){document.getElementById('imp-err').textContent=T('Esto dejaría la cuenta en negativo. Apaga «Actualizar el saldo» o desactiva ese bloqueo en Ajustes.');return;}}
  const id='i'+Date.now().toString(36);catMemoFijo=catMem0();
  its.forEach(x=>{const m=S[x.y][x.mo],r=row(x.c,x.a,x.d+'-'+ABR[x.mo].toLowerCase(),x.k||catDeFila({name:x.c,sec:x.t}),usaSaldo(x.t)&&liqRef(m,liq)?liq:'');if(x.cur!==curOf(x.t))r.cur=x.cur;r.imp=id;addRow(x.y,x.mo,x.t,r);if(r.src)applyDed(m,r,x.t);});catMemoFijo=null;
  save();impCerrar();render();track('atajo','importar');toast(its.length+' movimientos importados',{fn:()=>{impQuitar(id);}});
}
function impQuitar(id){
  let n=0;Object.keys(S).forEach(y=>S[y].forEach(m=>IMP_SEC.forEach(sec=>{const a=m[sec]||[];for(let i=a.length-1;i>=0;i--)if(a[i].imp===id){delMov(m,sec,i);n++;}})));return n;
}
function impUltima(){
  const c={};Object.keys(S).forEach(y=>S[y].forEach(m=>IMP_SEC.forEach(sec=>(m[sec]||[]).forEach(r=>{if(typeof r.imp==='string')c[r.imp]=(c[r.imp]||0)+1;}))));
  const ids=Object.keys(c).sort((a,b)=>parseInt(b.slice(1),36)-parseInt(a.slice(1),36));return ids.length?{id:ids[0],n:c[ids[0]]}:null;
}
function impAjHtml(){
  const u=impUltima();
  return '<div class="bkc"><b>Importar movimientos del banco</b><div class="ms">Sube el CSV o Excel de tu banco. Se lee solo en tu dispositivo y tú eliges qué guardar.</div><div class="qa"><button class="b" id="imp-open" type="button">Elegir archivo</button><input id="imp-file" type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" hidden></div><div class="ms" id="imp-msg" role="status"></div>'
    +(u?'<div class="ms">Última importación: '+u.n+' movimientos</div><div class="qa"><button class="b" id="imp-undo" type="button">Deshacer importación</button></div>':'')+'</div>';
}
async function impAbrir(file){
  const msg=t=>{const e=document.getElementById('imp-msg');if(e){e.textContent=T(t);e.style.color=t==='Leyendo el archivo…'?'':'var(--bad)';}};
  if(file.size>IMP_BYTES){msg('El archivo pesa más de 5 MB. Exporta un periodo más corto.');return;}
  msg('Leyendo el archivo…');
  try{
    const rows=await impLeer(file);
    if(rows.length<2){msg('No encontré movimientos en ese archivo.');return;}
    const det=impDetectar(rows);
    imp={nombre:file.name.slice(0,60),rows,h:det.h,map:det.map,dest:'',saldo:false,signo:'pos',signoU:0,curDef:'S/',filtro:'todo',pag:0,items:[],ign:0};
    impArmar();
    const bg=document.createElement('div');bg.id='impbg';bg.innerHTML='<div id="impbox" role="dialog" aria-modal="true" aria-label="Importar movimientos"></div>';document.body.append(bg);
    bg.addEventListener('change',impCambio);bg.addEventListener('click',impClick);document.addEventListener('keydown',impEsc);
    impPintar();const e=document.getElementById('imp-msg');if(e)e.textContent='';const d=document.getElementById('imp-dest');if(d)d.focus();
  }catch(e){imp=null;msg(e&&e.message&&/^(?:No pude|Ese Excel)/.test(e.message)?e.message:'No pude leer ese archivo. Prueba con un CSV.');}
}
function impCambio(e){
  const t=e.target,d=t.dataset;if(!imp)return;
  if(d.ion!==undefined){imp.items[+d.ion].on=t.checked;impSum();return;}
  if(d.it!==undefined){imp.items[+d.it].t=t.value;return;}
  if(t.id==='imp-saldo'){imp.saldo=t.checked;return;}
  if(t.id==='imp-filtro'){imp.filtro=t.value;imp.pag=0;impPintar();return;}
  if(d.im!==undefined)imp.map[d.im]=+t.value;
  else if(t.id==='imp-dest'){imp.dest=t.value;if(String(t.value).slice(0,4)!=='liq:')imp.saldo=false;}
  else if(t.id==='imp-cur')imp.curDef=t.value;
  else if(t.id==='imp-signo'){imp.signo=t.value;imp.signoU=1;}
  else return;
  impArmar();impPintar();
}
function impClick(e){
  const b=e.target.closest('button');if(!b||!imp)return;
  if(b.id==='imp-cancel'||b.id==='imp-x')impCerrar();
  else if(b.id==='imp-go')impGuardar();
  else if(b.dataset.ip){imp.pag+=+b.dataset.ip;impPintar();document.getElementById('impbox').scrollIntoView();}
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='imp-file'){const f=e.target.files&&e.target.files[0];if(f)impAbrir(f);e.target.value='';}});
function bkMsg(t,bad){const e=document.getElementById('bk-msg');if(e){e.textContent=t;e.style.color=bad?'var(--bad)':'';}}
async function saveFile(name,data){
  if(dl){try{await dl.save({filename:name,data});bkMsg('Listo: confirma la descarga de '+name+'.');}catch(e){bkMsg(e&&e.code==='user_declined'?'Cancelaste la descarga.':'No se pudo descargar ('+((e&&e.code)||'error')+').',true);}return;}
  try{const blob=new Blob([data],{type:name.endsWith('.json')?'application/json':'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);bkMsg('Descargado '+name+'.');}
  catch(e){bkMsg('No se pudo descargar en esta vista.',true);}
}
const csvCell=v=>{const t=String(v==null?'':v).replace(/^'/,'');return /[",\n;]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;};
function restoreFrom(text){
  let j;try{j=JSON.parse(text);}catch(e){bkMsg('Ese archivo no es un respaldo válido.',true);return;}
  if(!j||typeof j.S!=='object'||!j.cfg){bkMsg('Ese archivo no parece un respaldo de Mis finanzas.',true);return;}
  const ys=Object.keys(j.S);
  if(!ys.length||!ys.every(y=>/^\d{4}$/.test(y)&&Array.isArray(j.S[y])&&j.S[y].length===12)){bkMsg('El respaldo tiene un formato que no reconozco.',true);return;}
  try{histApi.keep('antes_de_restaurar',snapNow()).catch(()=>{});HC=null;}catch(e){}
  ys.forEach(y=>{if(YEARS.indexOf(y)<0)YEARS.push(y);});YEARS.sort();
  const sj=saneS(j.S),ns={};YEARS.forEach(y=>{ns[y]=sj[y]||Array.from({length:12},blank);});
  S=ns;cfg=saneCfg(j.cfg);if(isObj(j.LAY))LAY=saneLay(j.LAY);applyBanks();
  if(!S[year])year=YEARS[YEARS.length-1];
  save();saveLay();render();toast('Respaldo restaurado');
}
