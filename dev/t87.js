// t87: lote 1 de la prueba de carga previa al beta.
// Datos dañados o con código dentro, lectura de montos, almacenamiento lleno y sincronización
// (reintentos, tiempo límite, carga lenta, cierre de sesión y dos pestañas) con un Supabase simulado.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demoTxt=fs.readFileSync(__dirname+'/demo.json','utf8');const demo=JSON.parse(demoTxt);
const K='mis-finanzas-prototipo-v1',X='"><img src=x onerror=window.__xss=1>';
let ok=0,bad=0;const T=(n,c,x)=>{c?ok++:(bad++,console.log('FALLA',n,x===undefined?'':JSON.stringify(x)));};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const JS={contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}};

/* ---------- Parte 1: modo local (sin cuenta) ---------- */
async function local(b,estado,hash,extra){
  const ctx=await b.newContext({viewport:{width:1100,height:800}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});return r.abort();});
  await p.addInitScript(([s,k,x])=>{if(!localStorage.getItem('qa')){if(s)localStorage.setItem(k,s);localStorage.setItem(k+'-instalar','1');localStorage.setItem('qa','1');}window.claude={use:async()=>null};if(x)eval(x);},[estado,K,extra||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(hash||'#noviembre'));await p.waitForTimeout(900);return p;}

async function parteLocal(b){
  const base=()=>JSON.parse(JSON.stringify(demo));
  const casos={
    'mes null':s=>{s.S['2026'][3]=null;},'fila null':s=>{s.S['2026'][10].hor.push(null);},'cats null':s=>{s.cfg.cats=null;},
    'liq ausente':s=>{delete s.S['2026'][10].liq;},'hor string':s=>{s.S['2026'][10].hor='x';},
    'xss alerta':s=>{s.cfg.alerta=X;},'xss meta y meses':s=>{s.cfg.meta=X;s.cfg.meses=X;},'xss tc':s=>{s.cfg.tc={'€':X,'$':X};},
    'xss eur':s=>{s.S['2026'][10].eur=[{a:X,b:X,d:X,s:X}];},'xss q':s=>{s.S['2026'][10].q=[X,X,X];},'xss moneda':s=>{s.S['2026'][10].fij[0].cur=X;},
    'metas y rec null':s=>{s.cfg.metas=[null];s.cfg.rec=[null,{c:X,m:5}];}};
  for(const [n,f] of Object.entries(casos)){const s=base();f(s);const p=await local(b,JSON.stringify(s));
    for(const h of ['#resumen','#ajustes','#noviembre']){await p.evaluate(h=>location.hash=h,h);await p.waitForTimeout(350);}
    const txt=await p.evaluate(()=>document.body.innerText);const xss=await p.evaluate(()=>window.__xss===1);
    T('datos dañados «'+n+'»: abre, sin código ejecutado y conserva lo bueno',!xss&&txt.includes('Sueldo')&&p.errs.length===0,{xss,err:p.errs[0]});await p.context().close();}
  // año con menos de 12 meses: abre en blanco-pero-vivo, sin error
  {const s=base();s.S['2026']=s.S['2026'].slice(0,5);const p=await local(b,JSON.stringify(s));const txt=await p.evaluate(()=>document.body.innerText);T('año con 5 meses: la app abre',txt.length>200&&p.errs.length===0,p.errs[0]);await p.context().close();}
  // restaurar un respaldo con código y con huecos
  for(const [n,f] of [['restaurar con código',s=>{s.cfg.alerta=X;s.cfg.eurCols=[X,X,X,X];}],['restaurar con huecos',s=>{s.S['2026'][2]=null;s.S['2026'][10].hor.push(null);s.cfg.cats=null;}]]){
    const p=await local(b,demoTxt,'#ajustes');const rb=base();f(rb);
    await p.setInputFiles('#bk-file',{name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({v:1,S:rb.S,cfg:rb.cfg}))});await p.waitForTimeout(1200);
    await p.evaluate(()=>location.hash='#noviembre');await p.waitForTimeout(400);await p.reload();await p.waitForTimeout(900);
    const txt=await p.evaluate(()=>document.body.innerText);const xss=await p.evaluate(()=>window.__xss===1);
    T(n+': sin código y la app sigue viva tras recargar',!xss&&txt.includes('Sueldo')&&p.errs.length===0,{xss,err:p.errs[0]});await p.context().close();}
  // montos
  const p=await local(b,demoTxt,'#noviembre');
  const reg=async(txt)=>{await p.click('.caplink');await p.waitForSelector('#sheet');await p.click('#stype [data-g="gasto"]');await p.click('#ssub [data-t="hor"]');await p.fill('#sa',txt);await p.fill('#sd','T87 '+txt);await p.click('#ssrc [data-src="liq:0"]');await p.click('[data-s="save"]');await p.waitForTimeout(250);
    const m=await p.evaluate(([k,c])=>{const r=JSON.parse(localStorage.getItem(k)).S['2026'][10].hor.find(x=>x.c===c);return r?r.m:null;},[K,'T87 '+txt]);const msg=await p.evaluate(()=>(document.getElementById('sdest')||{}).textContent||'');if(await p.isVisible('#sheet'))await p.keyboard.press('Escape');return {m,msg};};
  for(const [txt,v] of [['1,200',1200],['1.200',1200],['1,234.50',1234.5],['1.234,50',1234.5],['25',25],['12,5',12.5],['S/ 40',40]]){const r=await reg(txt);T('monto «'+txt+'» → '+v,r.m===v,r);}
  for(const txt of ['12abc','Infinity','1e21','1.5.5']){const r=await reg(txt);T('monto «'+txt+'» no se guarda y avisa',r.m===null&&/monto/i.test(r.msg),r);}
  T('montos: sin errores de consola',p.errs.length===0,p.errs[0]);await p.context().close();
  // «Escribe rápido»
  {const q=await local(b,demoTxt,'#noviembre');
   for(const [txt,v] of [['alquiler 1,200 yape',1200],['bodega S/ 7.8',7.8],['almuerzo 12,50 yape',12.5]]){await q.click('.caplink');await q.waitForSelector('#sheet');await q.fill('#smsg',txt);await q.waitForTimeout(150);T('escribe rápido «'+txt+'»',parseFloat(await q.inputValue('#sa'))===v);await q.keyboard.press('Escape');}
   await q.context().close();}
  // uso diario: el aviso «Deshacer» no tapa «Guardar», «Eliminar» se deshace y el «+» abre en Gasto
  for(const [nom,vp] of [['escritorio',{width:1280,height:800}],['celular',{width:390,height:844}]]){
   const ctx=await b.newContext({viewport:vp,isMobile:vp.width<500,hasTouch:vp.width<500});const q=await ctx.newPage();q.errs=[];q.on('pageerror',e=>q.errs.push(e.message));
   await q.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});return r.abort();});
   await q.addInitScript(([s,k])=>{if(!localStorage.getItem('qa')){localStorage.setItem(k,s);localStorage.setItem(k+'-instalar','0');localStorage.removeItem(k+'-instalar');localStorage.setItem('qa','1');}window.claude={use:async()=>null};},[demoTxt,K]);
   await q.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await q.waitForTimeout(900);
   const abrir=async()=>{await q.click(vp.width<500?'#fab':'.caplink');await q.waitForSelector('#sheet');};
   // registrar algo para que salga el aviso con «Deshacer»
   await abrir();await q.click('#stype [data-g="ing"]');await q.fill('#sa','3');await q.fill('#sd','Pan T87');await q.click('[data-s="save"]');await q.waitForTimeout(300);
   T(nom+': tras guardar sale «Deshacer»',await q.locator('.toast [data-undo]').isVisible());
   await abrir();
   const tapa=await q.evaluate(()=>{const g=document.querySelector('[data-s="save"]').getBoundingClientRect(),el=document.elementFromPoint(g.left+g.width/2,g.top+g.height/2);return el?(el.closest('.toast')?'toast':(el.closest('.instbar')?'instalar':'ok')):'nada';});
   T(nom+': con el formulario abierto nada tapa «Guardar»',tapa==='ok',tapa);
   T(nom+': el «+» abre en Gasto',(await q.getAttribute('#stype [data-g="gasto"]','aria-checked'))==='true');
   await q.keyboard.press('Escape');await q.waitForTimeout(200);
   // eliminar y deshacer
   const antes=await q.evaluate(k=>JSON.stringify(JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.map(r=>r.c)),K);
   await q.locator('[data-edit="ing"]').first().click();await q.waitForSelector('#sheet');await q.click('[data-s="del-mov"]');await q.waitForTimeout(300);
   const durante=await q.evaluate(k=>JSON.stringify(JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.map(r=>r.c)),K);
   T(nom+': eliminar quita el movimiento y ofrece «Deshacer»',durante!==antes&&await q.locator('.toast [data-undo]').isVisible(),{antes,durante});
   await q.click('.toast [data-undo]');await q.waitForTimeout(300);
   const despues=await q.evaluate(k=>JSON.stringify(JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.map(r=>r.c)),K);
   T(nom+': «Deshacer» recupera el movimiento eliminado',despues===antes,{antes,despues});
   T(nom+': sin errores',q.errs.length===0,q.errs[0]);await ctx.close();}
  // almacenamiento lleno: avisa; al liberar espacio, el aviso se va
  {const q=await local(b,demoTxt,'#noviembre',`(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__full&&String(k).indexOf('mis-finanzas-prototipo-v1')===0)throw new DOMException('lleno','QuotaExceededError');return o.call(this,k,v);};})()`);
   await q.evaluate(()=>window.__full=true);await q.click('[data-act="liqedit"]');const i=q.locator('.liq .rw input').nth(1);await i.fill('4321');await i.dispatchEvent('change');await q.waitForTimeout(800);
   T('almacenamiento lleno: aparece el aviso permanente',await q.locator('#savewarn').count()===1&&await q.locator('#savewarn').isVisible());
   await q.evaluate(()=>window.__full=false);await i.fill('4322');await i.dispatchEvent('change');await q.waitForTimeout(800);
   T('al liberar espacio el aviso desaparece y se guarda',await q.locator('#savewarn').count()===0&&((await q.evaluate(k=>localStorage.getItem(k),K))||'').includes('4322'));
   T('almacenamiento lleno: sin errores',q.errs.length===0,q.errs[0]);await q.context().close();}
}

/* ---------- Parte 2: sincronización con un Supabase simulado ---------- */
const mkServer=()=>({rows:{},mode:{upsert:'ok'},hold:null,stats:{upserts:0}});
async function handle(srv,route,req){
  const b=JSON.parse(req.postData()||'{}'),op=b.op,H={'access-control-allow-origin':'*'};
  const J=(st,o)=>route.fulfill({status:st,contentType:'application/json',headers:H,body:JSON.stringify(o)}).catch(()=>{});
  if(op==='select'&&b.table==='estado'&&b.cols!=='stamp'&&srv.hold)await srv.hold;
  if(op==='upsert'&&b.table==='estado'){srv.stats.upserts++;const m=srv.mode.upsert;if(m==='hang')return;if(m==='e500')return J(500,{message:'Internal Server Error'});srv.rows[b.uid]={registro:b.row.registro,config:b.row.config,stamp:b.row.stamp};return J(200,{});}
  if(op==='select'){const r=srv.rows[b.uid]||null;if(b.cols==='stamp')return J(200,r?{stamp:r.stamp}:null);return J(200,r?{registro:r.registro,config:r.config}:null);}
  return J(200,null);}
const stub=uid=>`window.__uid='${uid}';
window.__call=async(o)=>{let r;try{r=await fetch('http://sb.test/rest',{method:'POST',body:JSON.stringify(o)});}catch(e){return {data:null,error:{message:'TypeError: Failed to fetch'}};}
 let j=null;try{j=await r.json();}catch(e){}if(r.status>=400)return {data:null,error:{message:(j&&j.message)||('HTTP '+r.status),status:r.status}};return {data:j,error:null};};
const mkq=t=>{const q={t,cols:''};q.select=c=>{q.cols=c;return q};q.eq=()=>q;q.order=()=>q;q.limit=()=>q;
 q.maybeSingle=()=>window.__call({op:'select',table:t,cols:q.cols,uid:window.__uid});q.upsert=row=>window.__call({op:'upsert',table:t,row,uid:window.__uid});
 q.then=(a,c)=>window.__call({op:'select',table:t,cols:q.cols,uid:window.__uid}).then(a,c);return q;};
window.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:sessionStorage.getItem('__out')?null:{user:{id:'${uid}',email:'x@y.pe'}}}}),
 onAuthStateChange:cb=>{window.__cb=cb;return {data:{subscription:{unsubscribe(){}}}}},signOut:()=>{sessionStorage.setItem('__out','1');return Promise.resolve({})}},
 from:t=>mkq(t),rpc:()=>Promise.resolve({error:null})})};`;
async function cuenta(b,srv,uid,o){o=o||{};const ctx=o.ctx||await b.newContext({viewport:{width:1100,height:800}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
  if(!ctx.__r){ctx.__r=1;ctx.__srv=srv;await ctx.route('**/*',async r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});
    if(u.startsWith('http://sb.test/rest')){if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});return handle(ctx.__srv,r,r.request());}return r.abort();});}
  await p.addInitScript(stub(uid)+(o.noseed?'':`if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');localStorage.setItem('${K}',${JSON.stringify(demoTxt)});localStorage.setItem('${K}-owner','${uid}');localStorage.setItem('${K}-instalar','1');}`)+(o.out?`sessionStorage.setItem('__out','1');`:''));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.hash||'#noviembre'));await p.waitForTimeout(o.wait||1600);return p;}
async function edit(p,n,val){if(!(await p.locator('.liq .rw input').count())){await p.click('[data-act="liqedit"]');await p.waitForTimeout(200);}const i=p.locator('.liq .rw input').nth(n);await i.fill(String(val));await i.dispatchEvent('change');await i.blur();}
const tiene=(srv,uid,v)=>JSON.stringify((srv.rows[uid]||{}).registro||'').includes(String(v));
const estado=p=>p.evaluate(()=>{const c=document.getElementById('syn');return c&&c.dataset.s;});
const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);

async function parteSync(b){
  // 1. Error del servidor (500): se reintenta solo y no se pierde nada
  {const srv=mkServer();const p=await cuenta(b,srv,'uA');srv.mode.upsert='e500';await edit(p,1,7001.11);await W(3500);
   T('500: queda en error con los cambios pendientes',(await estado(p))==='error'&&JSON.parse(await ls(p,K+'-sync')).dirty===true);
   srv.mode.upsert='ok';await W(11000);
   T('500: se reintenta solo y llega al servidor',tiene(srv,'uA','7001.11')&&(await estado(p))==='saved',{st:await estado(p)});await p.context().close();}
  // 2. Petición colgada: el tiempo límite libera la sincronización y se reintenta
  {const srv=mkServer();const p=await cuenta(b,srv,'uA');srv.mode.upsert='hang';await edit(p,1,7101.11);await W(33500);
   T('colgada: pasado el tiempo límite se sale de «Guardando…»',(await estado(p))==='error',{st:await estado(p)});
   srv.mode.upsert='ok';await W(11000);
   T('colgada: luego se sube sola',tiene(srv,'uA','7101.11')&&(await estado(p))==='saved',{st:await estado(p)});await p.context().close();}
  // 3. Carga lenta: lo que editas mientras carga no se pisa
  {const srv=mkServer();let liberar;srv.hold=new Promise(r=>liberar=r);srv.rows.uA={registro:[],config:[],stamp:'v1'};
   const p=await cuenta(b,srv,'uA',{wait:1200});T('carga lenta: está cargando',(await estado(p))==='loading');
   await edit(p,1,7201.11);liberar();await W(3500);
   T('carga lenta: tu edición se conserva',((await ls(p,K))||'').includes('7201.11')&&JSON.parse(await ls(p,K+'-sync')).dirty===true);
   T('carga lenta: no se aplicó lo remoto encima (sin errores)',p.errs.length===0,p.errs[0]);await p.context().close();}
  // 4. Otra pestaña cierra sesión: esta se recarga y no vuelve a guardar datos de la cuenta anterior
  {const srv=mkServer();const T1=await cuenta(b,srv,'uA');const ctx=T1.context();
   const T2=await cuenta(b,srv,'uA',{ctx,noseed:true,wait:1800,hash:'#ajustes'});
   await T1.evaluate(()=>{window.__marca=1;sessionStorage.setItem('__out','1');});
   await T2.locator('#sb-logout').scrollIntoViewIfNeeded();await T2.click('#sb-logout');await W(2500);
   T('otra pestaña cierra sesión: esta se recargó',(await T1.evaluate(()=>window.__marca))!==1);
   T('otra pestaña cierra sesión: nada de la cuenta anterior queda guardado',!((await ls(T1,K))||'').includes('ETF VOO')&&(await ls(T1,K+'-owner'))===null);
   T('otra pestaña cierra sesión: se muestra el acceso',(await T1.locator('#authbox').count())===1);await ctx.close();}
  // 5. Dos pestañas: la que está quieta adopta lo de la otra y no lo pisa
  {const srv=mkServer();const T1=await cuenta(b,srv,'uA');const ctx=T1.context();const T2=await cuenta(b,srv,'uA',{ctx,noseed:true,wait:1800});
   await edit(T1,1,8001.11);await W(1500);
   await edit(T2,2,8002.22);await W(1000);
   const j=(await ls(T2,K))||'';
   T('dos pestañas: se conservan los cambios de las dos',j.includes('8001.11')&&j.includes('8002.22'),{a:j.includes('8001.11'),b:j.includes('8002.22')});await ctx.close();}
}

(async()=>{
  const b=await chromium.launch();
  await parteLocal(b);
  await parteSync(b);
  await b.close();console.log('Total',ok+bad,'ok',ok,'fallas',bad);process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
