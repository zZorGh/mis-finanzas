/* ---------- Reportes descargables (Excel y PDF) con formato de estado de cuenta ---------- */
const ISO={'S/':'PEN','$':'USD','€':'EUR'};
const r2=v=>Math.round((+v||0)*100)/100;
const mkey=(y,i)=>(+y)*12+i;
const perOf=(y,i)=>MES[i]+' '+y;
const dmy=d=>d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear():'';
function repMonths(a,b){const out=[];YEARS.slice().sort().forEach(y=>{for(let i=0;i<12;i++){const k=mkey(y,i);if(k>=a&&k<=b&&S[y]&&S[y][i])out.push({y,i,m:S[y][i]});}});return out;}
function trimEmpty(ms){let s=0,e=ms.length-1;while(s<=e&&!dv(ms[s].m).on)s++;while(e>=s&&!dv(ms[e].m).on)e--;return ms.slice(s,e+1);}
const dayDate=(y,i,f)=>{const d=parseInt(f,10);if(!(d>=1))return null;const last=new Date(+y,i+1,0).getDate();return new Date(+y,i,Math.min(d,last));};
const usedRow=r=>r&&(((r.c||'').trim())||+r.m);
function avgGasto(){if(!passOn)return avgGasto0();if(passAvg===undefined)passAvg=avgGasto0();return passAvg;}
function avgGasto0(){const now=limaD(),cy=now.getFullYear(),ci=now.getMonth(),arr=[];
  YEARS.forEach(y=>(S[y]||[]).forEach((m,i)=>{if(+y>cy||(+y===cy&&i>=ci))return;const g=dv(m).gas;if(g>0)arr.push({k:+y*12+i,g});}));
  arr.sort((a,b)=>a.k-b.k);const l=arr.slice(-6);return l.length?l.reduce((a,x)=>a+x.g,0)/l.length:0;}

/* Reúne todo lo que va en el reporte para los meses de a hasta b (claves año*12+mes). */
function repData(a,b){
  const ms=trimEmpty(repMonths(a,b));
  if(!ms.length)return null;
  const first=ms[0],last=ms[ms.length-1];
  const mens=[],mov=[],fx=new Map(),T={ing:0,fij:0,hor:0,gas:0,aho:0,inv:0,res:0};
  ms.forEach(({y,i,m})=>{
    const d=dv(m);mens.push({y,i,per:perOf(y,i),ing:d.ing,fij:d.fij,hor:d.hor,gas:d.gas,aho:d.aho,inv:d.inv,res:d.res});
    Object.keys(T).forEach(k=>{T[k]+=d[k];});
    const per=perOf(y,i),liqN=r=>{const l=liqRef(m,r.src);return l?(l.c||'').trim():'';};
    const push=(sec,r,tipo,sent,concepto,cuenta,catg,sign)=>{
      const cur=rowCur(sec,r),tc=rateC(cur,m),amt=+r.m||0;
      if(cur!=='S/')fx.set(cur+'|'+per,{cur,per,tc});
      const sol=r2(amt*tc),o={sec,fecha:dayDate(y,i,r.f),y,i,dia:parseInt(r.f,10)||99,per,tipo,sent,concepto:(concepto||'').trim(),cat:catg||'',cuenta:cuenta||'',cur,amt,tc,sol,firm:sign?r2(sign*sol):sol};mov.push(o);return o;
    };
    (m.ing||[]).forEach(r=>{if(usedRow(r))push('ing',r,'Ingreso','Entrada',r.c,liqN(r),r.k,1);});
    (m.fij||[]).forEach(r=>{if(usedRow(r))push('fij',r,r.card?'Pago de tarjeta '+SECN[r.card]:'Gasto fijo','Salida',r.c,liqN(r),r.card?'Pago de tarjetas':kNom('fij',r),-1);});
    (m.hor||[]).forEach(r=>{if(usedRow(r)){const an=r.t==='ant',o=push('hor',r,an?'Antojo':'Gasto variable','Salida',r.c,liqN(r),kNom('hor',r),-1);if(an){o.ant=1;o.vp=r.v===1?'Sí':r.v===0?'No':'';}}});
    (m.inv||[]).forEach(r=>{if(usedRow(r))push('inv',r,'Inversión','Salida',r.c,liqN(r),r.k,-1);});
    (m.aho||[]).forEach(r=>{if(!usedRow(r))return;const k=ahoKind(r);
      const tipo={dep:'Depósito a ahorro',ret:'Retiro de ahorro',aj:'Ajuste de saldo de ahorro',tr:'Traspaso entre cuentas de ahorro'}[k];
      const sent={dep:'Hacia ahorro',ret:'Desde ahorro',aj:'Ajuste',tr:'Interno'}[k];
      push('aho',r,tipo,sent,r.k?'Meta: '+r.k:'',ahoName(r),'',(k==='dep'||k==='ret')?-1:0).ak=k;});
    CARDS.forEach(ck=>(m[ck]||[]).forEach(r=>{if(usedRow(r))push(ck,r,'Compra con tarjeta '+SECN[ck],'Cargo a tarjeta',r.c,'Tarjeta '+SECN[ck],kNom(ck,r),-1);}));
  });
  mov.sort((p,q)=>mkey(p.y,p.i)-mkey(q.y,q.i)||p.dia-q.dia);
  Object.keys(T).forEach(k=>{T[k]=r2(T[k]);});
  /* Gastos por concepto (gastos fijos + variables, igual que «Total gastado») */
  const cm=new Map();mov.filter(x=>x.sec==='fij'||x.sec==='hor').forEach(x=>{const k=x.cat==='Pago de tarjetas'?x.cat:concNom({c:x.concepto});cm.set(k,(cm.get(k)||0)+x.sol);});
  const cat=[...cm.entries()].map(([c,v])=>({c,v:r2(v)})).filter(x=>Math.abs(x.v)>=.005).sort((p,q)=>q.v-p.v);
  /* Gastos por grupo (Necesidades, Deseos, Ahorro e inversión), igual que «¿Dónde gastas más?» */
  const gm=gruposMes(ms.map(x=>x.m)),grupos=gm.G.map(g=>({n:g.n,t:r2(g.t),l:[...g.l.values()].map(e=>({c:e.n,v:r2(e.v)})).filter(e=>e.v>0).sort((p,q)=>q.v-p.v)})).filter(g=>g.t>0).sort((p,q)=>q.t-p.t),gT=r2(gm.total);
  /* Antojos y si valieron la pena */
  const antL=mov.filter(x=>x.ant).map(x=>({fecha:x.fecha,per:x.per,concepto:x.concepto||'Sin descripción',sol:x.sol,vp:x.vp})),
    ant={list:antL,tot:r2(antL.reduce((a,x)=>a+x.sol,0)),no:r2(antL.filter(x=>x.vp==='No').reduce((a,x)=>a+x.sol,0)),si:antL.filter(x=>x.vp==='Sí').length,pend:antL.filter(x=>!x.vp).length};
  /* Ahorros por cuenta: saldo inicial + movimientos del período = saldo final */
  const pk=mkey(first.y,first.i)-1,py=String(Math.floor(pk/12)),pi=((pk%12)+12)%12;
  const ini=new Map(),fin=new Map();
  (S[py]?ahoAccts(py,pi):[]).forEach(a=>ini.set(a.c.toLowerCase(),a));
  ahoAccts(last.y,last.i).forEach(a=>fin.set(a.c.toLowerCase(),a));
  const am=new Map(),acc=k=>{if(!am.has(k))am.set(k,{dep:0,ret:0,aj:0,tr:0});return am.get(k);};
  mov.filter(x=>x.sec==='aho').forEach(x=>{const a=acc(x.cuenta.toLowerCase()),k=x.ak;
    if(k==='dep')a.dep+=x.sol;else if(k==='ret')a.ret+=-x.sol;else a[k]+=x.sol;});
  const names=new Map();[...ini.values(),...fin.values()].forEach(a=>names.set(a.c.toLowerCase(),a.c));
  mov.filter(x=>x.sec==='aho').forEach(x=>{if(!names.has(x.cuenta.toLowerCase()))names.set(x.cuenta.toLowerCase(),x.cuenta);});
  const ahorros=[...names.entries()].map(([k,c])=>{const a=am.get(k)||{dep:0,ret:0,aj:0,tr:0},i0=(ini.get(k)||{v:0}).v,f0=(fin.get(k)||{v:0}).v,tz=tasaOf(c);
    return {c,ini:r2(i0),dep:r2(a.dep),ret:r2(a.ret),aj:r2(a.aj),tr:r2(a.tr),fin:r2(f0),tasa:tz?tz.t+' '+(+tz.v).toFixed(2)+'%':'',gana:r2(ahoGana(f0,tz,360))};})
    .filter(a=>[a.ini,a.dep,a.ret,a.aj,a.tr,a.fin].some(v=>Math.abs(v)>=.005)).sort((p,q)=>q.fin-p.fin);
  /* Tarjetas de crédito */
  const tarjetas=CARDS.map(ck=>{let cons=0,pag=0;ms.forEach(({m})=>{cons+=sumIn(m,ck);pag+=paymentsTo(m,ck);});const deuda=cardEnding(last.y,last.i,ck),cur=curOf(ck);
    return {k:ck,n:SECN[ck],cur,cons:r2(cons),pag:r2(pag),deuda:r2(deuda),deudaS:r2(deuda*rateC(cur,last.m))};}).filter(t=>t.cons||t.pag||t.deuda);
  const lc=curOf('liq'),liq=(last.m.liq||[]).filter(r=>(r.c||'').trim()).map(r=>({c:r.c.trim(),cur:lc,v:r2(r.m),s:r2((+r.m||0)*rateC(lc,last.m))}));
  const label=first===last?perOf(first.y,first.i):perOf(first.y,first.i)+' – '+perOf(last.y,last.i);
  return {first,last,label,mens,mov,T,cat,grupos,gT,ant,ahorros,tarjetas,liq,fx:[...fx.values()],
    ahoTot:r2(ahorros.reduce((s,a)=>s+a.fin,0)),deudaTot:r2(tarjetas.reduce((s,t)=>s+t.deudaS,0)),liqTot:r2(liq.reduce((s,l)=>s+l.s,0)),
    tasa:T.ing>0?(T.aho+T.inv)/T.ing:null};
}
function repWho(){return {nombre:(cfg.titular||'').trim(),correo:(typeof sbUser!=='undefined'&&sbUser&&sbUser.email)||''};}
/* Reportes en segundo plano: el armado de PDF y Excel (lo pesado) corre en un Web Worker (reportes.js)
   y la pantalla sigue respondiendo. Si el navegador no permite workers, se carga el mismo archivo y corre aquí. */
const REP_JS='reportes.js?v=5';
function mkReport(fmt,R,o){
  const ctx={MES,who:repWho(),lang:LANG},job={fmt,R,o:{det:o.det},ctx};
  const viaMain=()=>new Promise((res,rej)=>{
    if(window.MSRep)return res();
    const s=document.createElement('script');s.src=REP_JS;s.onload=()=>res();s.onerror=()=>{s.remove();rej(new Error('No pude cargar lo necesario para crear el reporte. Revisa tu conexión e intenta otra vez.'));};document.head.appendChild(s);
  }).then(()=>window.MSRep.build(job));
  if(!window.Worker)return viaMain();
  return new Promise((res,rej)=>{
    let w;try{w=new Worker(REP_JS);}catch(e){viaMain().then(res,rej);return;}
    w.onmessage=e=>{w.terminate();if(e.data.err)rej(new Error(e.data.err));else res(e.data.blob);};
    w.onerror=()=>{w.terminate();viaMain().then(res,rej);};
    w.postMessage(job);
  });
}
/* ----- Diálogo «Descargar reporte» ----- */
async function dlBlob(name,blob){
  if(dl){await dl.save({filename:name,data:blob});return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}
function openReport(){
  closeSheet();if(typeof closePanel==='function')closePanel();sheetFrom=document.activeElement;
  const ys=YEARS.slice().sort(),opts=[];ys.forEach(y=>{for(let i=0;i<12;i++)opts.push([mkey(y,i),ABR[i]+' '+y]);});
  const withData=opts.filter(([k])=>{const y=String(Math.floor(k/12)),i=k%12;return S[y]&&S[y][i]&&dv(S[y][i]).on;}).map(x=>x[0]);
  const lastK=withData.length?withData[withData.length-1]:mkey(year,typeof view==='number'?view:now.getMonth());
  const curK=typeof view==='number'?mkey(year,view):lastK;
  const P={mes:[curK,curK],m3:[lastK-2,lastK],m6:[lastK-5,lastK],anio:[mkey(year,0),mkey(year,11)],ant:[mkey(+year-1,0),mkey(+year-1,11)]};
  const st={p:typeof view==='number'?'mes':'anio',f:'pdf',a:0,b:0,det:true};
  const setP=p=>{st.p=p;if(P[p]){st.a=P[p][0];st.b=P[p][1];}};setP(st.p);
  const bg=document.createElement('div');bg.id='sheetbg';bg.className='sheetbg';
  const sh=document.createElement('div');sh.id='sheet';sh.className='sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Descargar reporte');
  const sel=(id,v)=>`<select id="${id}" class="f" aria-label="${id==='rp-a'?'Desde':'Hasta'}">${opts.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('')}</select>`;
  const draw=()=>{const fk=focusKey(document.activeElement);draw1();if(fk)restoreFocus(fk);};
  const draw1=()=>{
    const R=repData(st.a,st.b);
    sh.innerHTML=`<div class="sh-h"><b>Descargar reporte</b><button type="button" data-s="close" aria-label="Cerrar">×</button></div>
    <div class="ms">Un estado de cuenta ordenado con tu resumen, ingresos, gastos por concepto, ahorros, tarjetas y el detalle de cada movimiento.</div>
    <div class="rp-l">Período</div>
    <div class="grp" role="radiogroup" aria-label="Período" id="rp-p">${chipH([['mes',typeof view==='number'?'Este mes':'Último mes'],['m3','Últimos 3 meses'],['m6','Últimos 6 meses'],['anio','Año '+year],['ant','Año '+(+year-1)],['rango','Elegir meses']],st.p,'rp',true)}</div>
    ${st.p==='rango'?`<div class="rp-r"><label class="fld">Desde${sel('rp-a',st.a)}</label><label class="fld">Hasta${sel('rp-b',st.b)}</label></div>`:''}
    <div class="rp-l">Formato</div>
    <div class="grp" role="radiogroup" aria-label="Formato" id="rp-f">${chipH([['pdf','PDF · para enviar o imprimir'],['xlsx','Excel · para revisar las cifras']],st.f,'rf',true)}</div>
    <label class="fld">Nombre del titular (aparece en el reporte)<input type="text" id="rp-n" value="${esc(cfg.titular||'')}" placeholder="Tu nombre completo" autocomplete="name"></label>
    <label class="chk"><input type="checkbox" id="rp-d"${st.det?' checked':''}> Incluir el detalle de cada movimiento</label>
    <div class="rp-s" id="rp-s" role="status">${R?`<b>${esc(R.label)}</b> · ${R.mens.length} ${R.mens.length===1?'mes':'meses'} · ${R.mov.length} movimientos<br>Ingresos ${fmt(R.T.ing)} · Gastos ${fmt(R.T.gas)} · Resultado ${fmt(R.T.res)}`:'No hay movimientos en ese período. Elige otro.'}</div>
    <div class="sdest" id="rp-m" role="status"></div>
    <div class="sact"><button class="b" type="button" data-s="close">Cerrar</button><button class="b p" type="button" data-s="rep"${R?'':' disabled'}>Descargar ${st.f==='pdf'?'PDF':'Excel'}</button></div>`;
  };
  draw1();document.body.append(bg,sh);{const f1=sh.querySelector('[role=radio][aria-checked="true"]')||sh.querySelector('button');if(f1)f1.focus();}
  bg.addEventListener('click',closeSheet);
  sh.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
  sh.addEventListener('change',e=>{const t=e.target;if(t.id==='rp-a'||t.id==='rp-b'){st[t.id==='rp-a'?'a':'b']=+t.value;if(st.a>st.b){const x=st.a;st.a=st.b;st.b=x;}draw();}else if(t.id==='rp-d'){st.det=t.checked;}});
  sh.addEventListener('input',e=>{if(e.target.id==='rp-n'){cfg.titular=e.target.value;save();}});
  sh.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.s==='close'){closeSheet();return;}
    if(b.dataset.rp){if(b.dataset.rp==='rango'&&st.p!=='rango'){st.p='rango';}else setP(b.dataset.rp);draw();return;}
    if(b.dataset.rf){st.f=b.dataset.rf;draw();return;}
    if(b.dataset.s==='rep'){const R=repData(st.a,st.b);if(!R)return;const msg=document.getElementById('rp-m');
      b.disabled=true;const t0=b.textContent;b.textContent='Preparando…';msg.textContent='';
      try{const blob=await mkReport(st.f,R,st);
        const f0=R.first,f1=R.last,tag=f0.y+'-'+String(f0.i+1).padStart(2,'0')+(f0===f1?'':(LANG==='en'?'_to_':'_a_')+f1.y+'-'+String(f1.i+1).padStart(2,'0'));
        const name=(LANG==='en'?'account-statement_':'estado-de-cuenta_')+tag+'.'+(st.f==='pdf'?'pdf':'xlsx');
        await dlBlob(name,blob);msg.textContent='Listo: '+name;toast('Reporte listo: '+name);}
      catch(err){msg.textContent=err&&err.code==='user_declined'?'Cancelaste la descarga.':((err&&err.message)||'No pude crear el reporte.');msg.style.color='var(--bad)';}
      finally{b.disabled=false;b.textContent=t0;}}
  });
}

