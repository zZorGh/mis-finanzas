// t119: no perder datos. Dos pestañas no se pisan, y editar un movimiento y «Cargar recurrentes» respetan el saldo. La otra cuenta se prueba en t85.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const URL0='http://127.0.0.1:8765/wrap-repo.html#noviembre';
const mes=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10],K);
const W=(p,ms=450)=>p.waitForTimeout(ms);
const ctxNuevo=async(b,cfgExtra,lang,stub)=>{
  const ctx=await b.newContext({viewport:{width:1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-21T15:00:00-05:00'));
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const d=JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1},cfgExtra||{})});
  await ctx.addInitScript(([d,k,l])=>{if(!localStorage.getItem(k+'-qa')){localStorage.setItem(k+'-qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[d,K,lang||'']);
  if(stub)await ctx.addInitScript(stub);
  return ctx;};
const abrir=async ctx=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(URL0);await p.waitForSelector('[data-act="liqedit"]');await p.click('[data-act="liqedit"]');await p.waitForSelector('#liq-0-m');await W(p,500);return p;};
const escribir=async(p,id,v)=>{await p.locator(id).scrollIntoViewIfNeeded();await p.fill(id,v);await W(p);};
const salir=async p=>{await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await W(p,250);};
const toast=p=>p.evaluate(()=>{const t=document.getElementById('toast');return t&&!t.hidden?t.textContent:'';});
const nuevoGasto=async(p,monto,nombre)=>{await p.setViewportSize({width:390,height:844});await W(p,250);await p.click('#fab');await p.waitForSelector('#sheet');await W(p,150);await p.click('[data-mode="auto"]');await W(p,150);await p.fill('#smsg',nombre+' '+monto+' con yape');await W(p,250);};

(async()=>{
  const b=await chromium.launch();
  // 1. Pestaña desactualizada: pregunta y no pisa.
  let ctx=await ctxNuevo(b);let A=await abrir(ctx),B=await abrir(ctx);
  await B.locator('#liq-2-m').focus();                     // B se queda con el cursor en un campo y no adopta
  await escribir(A,'#liq-0-m','111');await salir(A);await W(A,500);
  T('1 lo de la pestaña A quedó guardado',(await mes(A)).liq[0].m===111);
  await escribir(B,'#liq-1-m','77');await W(B,500);
  T('1 la pestaña B avisa del choque',await B.locator('#tabwarn').isVisible());
  T('1 B no pisó lo de A',(await mes(B)).liq[0].m===111&&(await mes(B)).liq[1].m===130);
  await B.click('[data-tabc="suya"]');await W(B);
  T('1 «usar la otra» trae lo de A',(await B.inputValue('#liq-0-m'))==='111'&&!(await B.locator('#tabwarn').count()));
  await escribir(B,'#liq-1-m','78');await salir(B);await W(B,500);
  T('1 después B guarda normal',(await mes(B)).liq[1].m===78&&(await mes(B)).liq[0].m===111);
  await W(A,900);T('1 A adopta lo de B',(await A.inputValue('#liq-1-m'))==='78');
  // Choque resuelto conservando lo propio
  await B.locator('#liq-2-m').focus();
  await escribir(A,'#liq-0-m','222');await salir(A);await W(A,500);
  await escribir(B,'#liq-1-m','79');await W(B,500);
  await B.click('[data-tabc="mia"]');await W(B);
  T('1 «conservar» guarda lo de esta pestaña',(await mes(B)).liq[1].m===79&&(await mes(B)).liq[0].m===111);
  T('1 sin errores',!A.errs.length&&!B.errs.length);await ctx.close();

  // 2. Con el registro abierto, un gasto nuevo suma sobre lo de la otra pestaña.
  ctx=await ctxNuevo(b);A=await abrir(ctx);B=await abrir(ctx);
  await nuevoGasto(B,5,'Chicle');
  await escribir(A,'#liq-0-m','300');await salir(A);await W(A,500);
  await B.click('#sheet [data-s="save"]');await W(B,500);
  let m=await mes(B);
  T('2 descuenta sobre el saldo que puso A',m.liq[0].m===295);
  T('2 guarda el gasto nuevo de B',m.hor.some(r=>/chicle/i.test(r.c)));
  T('2 no hubo choque',!(await B.locator('#tabwarn').count()));
  T('2 sin errores',!A.errs.length&&!B.errs.length);await ctx.close();

  // 3. Editar un movimiento pasa por el registro, que avisa del saldo.
  const editar=async p=>{await p.locator('[data-cid="hor"] [data-edit]').first().click();await p.waitForSelector('#sheet #sa');await W(p,200);await p.fill('#sa','900');await W(p,250);};
  ctx=await ctxNuevo(b);let p=await abrir(ctx);await editar(p);
  T('3 al editar avisa si no alcanza',await p.locator('#sshort.on').isVisible());
  T('3 pide «Guardar igual»',(await p.locator('#sheet [data-s="save"]').innerText()).trim()==='Guardar igual');await ctx.close();
  ctx=await ctxNuevo(b,{bloquearNeg:true});p=await abrir(ctx);await editar(p);
  T('3 con bloqueo no deja guardar',await p.locator('#sheet [data-s="save"]').isDisabled());await ctx.close();

  // 4. Cargar recurrentes.
  const rec=[{sec:'fij',s:'fij',c:'Alquiler prueba',m:5000,k:'',src:'liq:0',f:'5'},{sec:'fij',s:'fij',c:'Luz prueba',m:10,k:'',src:'liq:1',f:'5'}];
  const cargar=async p=>{await p.click('[data-act="cierre"]');await p.waitForSelector('#sheet [data-act="rec"]');await p.click('#sheet [data-act="rec"]');await W(p);};
  ctx=await ctxNuevo(b,{rec});p=await abrir(ctx);await cargar(p);m=await mes(p);
  T('4 sin bloqueo carga y avisa',m.fij.some(r=>r.c==='Alquiler prueba')&&/queda en negativo: Yape/.test(await toast(p)));await ctx.close();
  ctx=await ctxNuevo(b,{rec,bloquearNeg:true});p=await abrir(ctx);const y1=(await mes(p)).liq[0].m;await cargar(p);m=await mes(p);
  T('4 con bloqueo no carga el que no alcanza',!m.fij.some(r=>r.c==='Alquiler prueba')&&m.liq[0].m===y1);
  T('4 con bloqueo carga el que sí alcanza',m.fij.some(r=>r.c==='Luz prueba'));
  T('4 con bloqueo dice cuántos faltaron',/Cargados: 1\. Sin saldo, no se cargaron: 1/.test(await toast(p)));await ctx.close();

  // 5. Inglés.
  ctx=await ctxNuevo(b,{rec},'en');p=await abrir(ctx);await cargar(p);
  T('5 aviso de recurrentes en inglés',/Loaded: 2\. Heads up, now negative: Yape/.test(await toast(p)));await ctx.close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
