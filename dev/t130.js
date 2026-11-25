// t130: cada movimiento tiene su id estable, y la nube guarda todos sus campos (antojo, «¿valió la pena?»). Supabase simulado, datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const sembrado=()=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}));d.S['2026'][10].hor.push({c:'Helado T130',m:9,f:'5-nov',k:'',t:'ant',v:1,src:'liq:0'},{c:'Taxi T130',m:12,f:'6-nov',k:'Transporte'},{c:'Taxi T130',m:12,f:'6-nov',k:'Transporte'});return JSON.stringify(d);};
const mkServer=()=>({rows:{}});
async function handle(srv,route,req){
  const b=JSON.parse(req.postData()||'{}'),H={'access-control-allow-origin':'*'};
  const J=(st,o)=>route.fulfill({status:st,contentType:'application/json',headers:H,body:JSON.stringify(o)}).catch(()=>{});
  if(b.op==='upsert'&&b.table==='estado'){srv.rows[b.uid]={registro:b.row.registro,config:b.row.config,stamp:b.row.stamp};return J(200,{});}
  if(b.op==='select'&&b.table==='estado'){const r=srv.rows[b.uid]||null;if(b.cols==='stamp')return J(200,r?{stamp:r.stamp}:null);return J(200,r?{registro:r.registro,config:r.config}:null);}
  return J(200,null);}
const stub=uid=>`window.__uid='${uid}';
window.__call=async(o)=>{let r;try{r=await fetch('http://sb.test/rest',{method:'POST',body:JSON.stringify(o)});}catch(e){return {data:null,error:{message:'TypeError: Failed to fetch'}};}
 let j=null;try{j=await r.json();}catch(e){}if(r.status>=400)return {data:null,error:{message:(j&&j.message)||('HTTP '+r.status),status:r.status}};return {data:j,error:null};};
const mkq=t=>{const q={t,cols:''};q.select=c=>{q.cols=c;return q};q.eq=()=>q;q.order=()=>q;q.limit=()=>q;
 q.maybeSingle=()=>window.__call({op:'select',table:t,cols:q.cols,uid:window.__uid});q.upsert=row=>window.__call({op:'upsert',table:t,row,uid:window.__uid});
 q.then=(a,c)=>window.__call({op:'select',table:t,cols:q.cols,uid:window.__uid}).then(a,c);return q;};
window.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'${uid}',email:'x@y.pe'}}}}),
 onAuthStateChange:cb=>{window.__cb=cb;return {data:{subscription:{unsubscribe(){}}}}},signOut:()=>Promise.resolve({})},
 from:t=>mkq(t),rpc:()=>Promise.resolve({error:null})})};`;
async function cuenta(b,srv,uid,seed){
  const ctx=await b.newContext({viewport:{width:1100,height:800}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await ctx.route('**/*',async r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});
    if(u.startsWith('http://sb.test/rest')){if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});return handle(srv,r,r.request());}return r.abort();});
  await p.addInitScript(stub(uid)+(seed?`if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem('${K}',${JSON.stringify(seed)});localStorage.setItem('${K}-owner','${uid}');localStorage.setItem('${K}-instalar','1');}`:''));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(2500);return p;}
const local=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
const filasNube=(srv,uid)=>((srv.rows[uid]||{}).registro||[]);
const MOV=['Ingresos','Gastos fijos','Gastos cotidianos','BBVA','BCP','oh!','Ahorros','Inversiones','Liquidez'];
(async()=>{
 const b=await chromium.launch();
 // 1. Subir: cada movimiento sale con su id y con sus campos extra
 const srv=mkServer();let p=await cuenta(b,srv,'uA',sembrado());
 let reg=filasNube(srv,'uA');const movs=reg.filter(r=>MOV.indexOf(r[3])>=0&&(r[4]||+r[5]));
 T('1 se guardó en la nube',movs.length>20);
 T('2 cada movimiento lleva su id en la columna 16',movs.every(r=>{try{return /^[lm][0-9a-f]{8,12}$/.test(JSON.parse(r[15]).id);}catch(e){return false;}}));
 const ids=movs.map(r=>JSON.parse(r[15]).id);T('3 los id no se repiten (ni dos filas idénticas)',new Set(ids).size===ids.length);
 const he=movs.find(r=>r[4]==='Helado T130'),hx=he&&JSON.parse(he[15]);T('4 la marca de antojo y «¿valió la pena?» viajan a la nube',!!hx&&hx.t==='ant'&&hx.v===1);
 T('5 las dos filas idénticas tienen id distinto',movs.filter(r=>r[4]==='Taxi T130').length===2&&new Set(movs.filter(r=>r[4]==='Taxi T130').map(r=>JSON.parse(r[15]).id)).size===2);
 const l1=await local(p);const m1=l1.S['2026'][10].hor.find(r=>r.c==='Helado T130');T('6 en el dispositivo la fila también tiene su id',!!m1&&m1.id===hx.id&&l1.cfg.idV===1);
 // 2. Recargar: mismos id
 await p.reload();await p.waitForTimeout(1800);const l2=await local(p);T('7 al recargar los id no cambian',l2.S['2026'][10].hor.find(r=>r.c==='Helado T130').id===hx.id);T('sin errores 1',!p.errs.length);await p.context().close();
 // 3. Otro dispositivo, sin datos: recupera el antojo y los id desde la nube
 p=await cuenta(b,srv,'uA',null);const l3=await local(p);const m3=l3.S['2026'][10].hor.find(r=>r.c==='Helado T130');
 T('8 otro dispositivo recupera el antojo',!!m3&&m3.t==='ant'&&m3.v===1);T('9 y el mismo id',!!m3&&m3.id===hx.id);T('sin errores 2',!p.errs.length);await p.context().close();
 // 4. Mismos datos antiguos en dos dispositivos distintos: reciben los mismos id
 const srvB=mkServer(),srvC=mkServer();const pb=await cuenta(b,srvB,'uB',sembrado()),pc=await cuenta(b,srvC,'uC',sembrado());
 const ib=(await local(pb)).S['2026'][10].hor.map(r=>r.id),ic=(await local(pc)).S['2026'][10].hor.map(r=>r.id);T('10 los mismos movimientos antiguos reciben el mismo id en cada dispositivo',ib.length>3&&JSON.stringify(ib)===JSON.stringify(ic));
 await pb.context().close();await pc.context().close();
 // 5. Una versión anterior de la app (sin columna 16) sigue pudiendo leer y no se rompe
 const srvD=mkServer();srvD.rows.uD={registro:reg.map(r=>r.slice(0,15)),config:srv.rows.uA.config,stamp:'v1'};
 p=await cuenta(b,srvD,'uD',null);const l5=await local(p);T('11 un respaldo sin columna 16 carga igual',l5.S['2026'][10].hor.some(r=>r.c==='Helado T130'&&r.id)&&!p.errs.length);await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
