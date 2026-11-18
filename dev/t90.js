// t90: ventana «¿Cómo quieres registrar?» (Manual / Automático), asistente por pasos de Manual (una ventana por decisión)
// y el nombre «Cotidiano» en lugar de «Hormiga».
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const rows=(p,c,m)=>p.evaluate(([k,c,m])=>{const S=JSON.parse(localStorage.getItem(k)).S;let n=0;Object.keys(S).forEach(y=>S[y].forEach(mm=>['hor','fij'].forEach(s=>(mm[s]||[]).forEach(r=>{if(r.c===c&&(m==null||+r.m===m))n++;}))));return n;},[K,c,m]);
const nueva=async(b,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const vis=(p,s)=>p.locator(s).first().isVisible();
const step=p=>p.getAttribute('#sheet','data-step');
const W=p=>p.waitForTimeout(220);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);};
const manual=async p=>{await abrir(p);await p.click('[data-mode="manual"]');await W(p);};
const cerrar=async p=>{await p.keyboard.press('Escape');await p.waitForTimeout(200);};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // el nombre nuevo
  {const tx=await p.innerText('body');T('el mes dice «Gastos cotidianos» y no «hormiga»',/Gastos cotidianos/.test(tx)&&!/hormiga/i.test(tx));}
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForTimeout(900);
  T('el resumen no dice «hormiga»',!/hormiga/i.test(await p.innerText('body')));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);

  // 1. la ventana de elección
  await abrir(p);
  T('«+» abre primero la ventana de elección',await p.getAttribute('#sheet','data-mode')==='ask');
  T('ofrece Manual y Automático',await vis(p,'[data-mode="manual"]')&&await vis(p,'[data-mode="auto"]'));
  T('en la elección no se ve el formulario',!(await vis(p,'#sa'))&&!(await vis(p,'#stype')));
  T('en la elección tampoco se ven los atajos: solo Manual y Automático',await p.locator('#sheet [data-rec1]').evaluateAll(els=>els.every(e=>e.offsetParent===null)));
  await cerrar(p);T('Escape cierra la ventana',await p.locator('#sheet').count()===0);

  // 2. Manual = asistente por pasos: tipo de movimiento → tipo de gasto → cuenta → monto
  await manual(p);
  T('Manual empieza por «¿Qué movimiento es?» y solo muestra esas opciones',await step(p)==='type'&&await vis(p,'#stype')&&/Qué movimiento es/.test(await p.innerText('#swq'))&&!(await vis(p,'#sa'))&&!(await vis(p,'#ssrc'))&&!(await vis(p,'#ssub')));
  T('las 4 opciones: Gasto, Ingreso, Ahorro, Tarjeta',await p.locator('#stype button').count()===4);
  T('hay botón «Atrás»',await vis(p,'[data-wz="back"]'));
  await p.click('#stype [data-g="gasto"]');await W(p);
  T('tras elegir Gasto, aparece solo «¿Qué tipo de gasto es?»',await step(p)==='sub'&&await vis(p,'#ssub')&&!(await vis(p,'#stype'))&&/tipo de gasto/.test(await p.innerText('#swq')));
  T('primero «Fijo» y al costado «Cotidiano»',await p.evaluate(()=>[...document.querySelectorAll('#ssub [data-t]')].map(b=>b.dataset.t).join()==='fij,hor')&&/Cotidiano/.test(await p.innerText('#ssub'))&&!/hormiga/i.test(await p.innerText('#sheet')));
  await p.click('#ssub [data-t="fij"]');await W(p);
  T('luego pregunta «¿En qué grupo cae este gasto?» con los tres grupos',await step(p)==='grp'&&await vis(p,'#sgrp')&&await p.locator('#sgrp button').count()===3&&/Necesidades/.test(await p.innerText('#sgrp'))&&/Deseos/.test(await p.innerText('#sgrp'))&&/Ahorro e inversión/.test(await p.innerText('#sgrp'))&&!(await vis(p,'#ssub')));
  await p.click('#sgrp [data-sgrp="need"]');await W(p);
  T('después pregunta «¿En qué categoría?» y deja omitirla',await step(p)==='cat'&&/categoría/.test(await p.innerText('#swq'))&&await vis(p,'[data-scatskip]')&&!(await vis(p,'#sgrp')));
  await p.click('[data-scatskip]');await W(p);
  T('luego pregunta de dónde sale el dinero',await step(p)==='src'&&await vis(p,'#ssrc')&&!(await vis(p,'#ssub')));
  await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('y por último pide monto y concepto, con un resumen de lo elegido',await step(p)==='form'&&await vis(p,'#sa')&&await vis(p,'#sd')&&!(await vis(p,'#stype'))&&/Gasto/.test(await p.innerText('#swsum'))&&/Fijo/.test(await p.innerText('#swsum'))&&/Yape/.test(await p.innerText('#swsum')));
  await p.fill('#sa','45');await p.fill('#sd','T90 fijo');
  const f0=await rows(p,'T90 fijo',45);await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('Guardar registra el gasto fijo',await p.locator('#sheet').count()===0&&(await rows(p,'T90 fijo',45))===f0+1&&await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].fij.some(r=>r.c==='T90 fijo'),K));

  // 3. Atrás y Cambiar
  await manual(p);await p.click('#stype [data-g="gasto"]');await W(p);
  await p.click('[data-wz="back"]');await W(p);
  T('«Atrás» vuelve al paso anterior',await step(p)==='type');
  await p.click('[data-wz="back"]');await W(p);
  T('«Atrás» desde el primer paso vuelve a Manual/Automático',await p.getAttribute('#sheet','data-mode')==='ask'&&await vis(p,'[data-mode="auto"]'));
  await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="ing"]');await W(p);
  T('Ingreso no tiene tipo: pregunta en qué cuenta se deposita',await step(p)==='src');
  await p.click('#ssrc [data-src="none"]');await W(p);
  T('y luego va a monto y concepto',await step(p)==='form'&&await vis(p,'#sa'));
  await p.click('[data-wz="chg"]');await W(p);
  T('«Cambiar» en el resumen vuelve a elegir el movimiento',await step(p)==='type');
  await cerrar(p);

  // 4. Ahorro y Tarjeta: una ventana por cada opción
  await manual(p);await p.click('#stype [data-g="ahorro"]');await W(p);
  const sec=[await step(p)];
  await p.click('#ssub [data-t="aho"]');await W(p);sec.push(await step(p));
  await p.click('#sax [data-ax="dep"]');await W(p);sec.push(await step(p));
  await p.click('#sfrom [data-from^="aho:"]');await W(p);sec.push(await step(p));
  await p.click('#ssrc [data-src="none"]');await W(p);sec.push(await step(p));
  T('Ahorro > Cuenta de ahorro > Depositar: pasos sub, ax, acct, src y form',sec.join()==='sub,ax,acct,src,form');
  await cerrar(p);
  await manual(p);await p.click('#stype [data-g="tarjeta"]');await W(p);
  const tj=[await step(p)];
  await p.click('#ssub [data-t="compra"]');await W(p);tj.push(await step(p));
  await p.click('#sbank [data-b="bcp"]');await W(p);tj.push(await step(p));
  T('Tarjeta > Compra: pasos sub, bank y form (sin cuenta de origen)',tj.join()==='sub,bank,form');
  await cerrar(p);
  await manual(p);await p.click('#stype [data-g="tarjeta"]');await W(p);await p.click('#ssub [data-t="pago"]');await W(p);
  const pg=[await step(p)];await p.click('#sbank [data-b="bcp"]');await W(p);pg.push(await step(p));
  T('Tarjeta > Pago: pregunta tarjeta y luego con qué paga',pg.join()==='bank,src');
  await cerrar(p);

  // 5. Automático (sin cuenta usada antes, para que no haya una por defecto)
  await p.evaluate(k=>localStorage.removeItem(k+'-src'),K);
  await abrir(p);await p.click('[data-mode="auto"]');await W(p);
  T('Automático muestra solo la frase y la confirmación',await p.getAttribute('#sheet','data-mode')==='auto'&&await vis(p,'#smsg')&&!(await vis(p,'#sa'))&&!(await vis(p,'#stype')));
  await p.fill('#smsg','almuerzo');await p.waitForTimeout(150);
  T('sin monto, la tarjeta explica qué escribir',/monto/i.test(await p.innerText('#sapv')));
  await p.fill('#smsg','cafe 5');await p.waitForTimeout(150);
  const n0=await rows(p,'Cafe',null);
  await p.click('[data-s="save"]');await p.waitForTimeout(300);
  T('si falta la cuenta, pasa al formulario completo y la pide (no guarda a ciegas)',await p.locator('#sheet').count()===1&&await p.getAttribute('#sheet','data-mode')==='manual'&&(await rows(p,'Cafe',null))===n0&&/Elige de dónde sale/.test(await p.innerText('#sheet')));
  await cerrar(p);
  await abrir(p);await p.click('[data-mode="auto"]');await W(p);
  await p.fill('#smsg','almuerzo 25 yape');await p.waitForTimeout(200);
  const pv=await p.innerText('#sapv');
  T('la tarjeta muestra monto, concepto, tipo y cuenta',/25\.00/.test(pv)&&/Almuerzo/.test(pv)&&/Cotidiano/.test(pv)&&/Yape/.test(pv));
  const a0=await rows(p,'Almuerzo',25);await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('Guardar registra el gasto y cierra',await p.locator('#sheet').count()===0&&(await rows(p,'Almuerzo',25))===a0+1);
  T('avisa con «Deshacer»',await p.locator('#toast [data-undo]').count()===1);

  // 6. «+ Agregar …»: también pregunta, y el tipo queda fijo (salta los pasos de tipo)
  await p.click('[data-new="fij"]');await p.waitForSelector('#sheet');
  T('«+ Agregar gasto fijo» también pregunta Manual o Automático',await p.getAttribute('#sheet','data-mode')==='ask');
  await p.click('[data-mode="manual"]');await W(p);
  T('en Manual salta el tipo y empieza por el grupo del gasto',await step(p)==='grp');
  await p.click('#sgrp [data-sgrp="need"]');await W(p);await p.click('[data-scatskip]');await W(p);
  T('y luego pregunta de dónde sale',await step(p)==='src');
  await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('y luego pide monto y concepto, ya como «Fijo»',await step(p)==='form'&&/Fijo/.test(await p.innerText('#swsum')));
  await p.click('[data-wz="back"]');await W(p);
  T('«Atrás» desde «Fijo» vuelve a su paso de cuenta',await step(p)==='src');
  await p.click('[data-wz="back"]');await W(p);await p.click('[data-wz="back"]');await W(p);
  T('«Atrás» atraviesa categoría y grupo hasta su primer paso',await step(p)==='grp');
  await p.click('[data-wz="back"]');await W(p);
  T('«Atrás» desde su primer paso vuelve a Manual/Automático',await p.getAttribute('#sheet','data-mode')==='ask');
  await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','netflix 30 yape');await p.waitForTimeout(250);
  T('en Automático desde «Agregar gasto fijo» el tipo queda en Fijo',/Fijo/.test(await p.innerText('#sapv')));
  const f1=await rows(p,'Netflix',30);await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y se guarda como gasto fijo',(await rows(p,'Netflix',30))===f1+1&&await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].fij.some(r=>r.c==='Netflix'),K));
  await p.click('[data-new="ing"]');await p.waitForSelector('#sheet');
  T('«+ Agregar ingreso» también pregunta',await p.getAttribute('#sheet','data-mode')==='ask');
  await p.click('[data-mode="manual"]');await W(p);
  T('en Manual, un ingreso salta el tipo y pregunta la cuenta',await step(p)==='src');
  await cerrar(p);
  await p.click('[data-new="ing"]');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','bono 300');await p.waitForTimeout(250);
  T('en Automático desde «Agregar ingreso» el tipo queda en Ingreso',/Ingreso/.test(await p.innerText('#sapv')));
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y se guarda como ingreso',await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.some(r=>r.c==='Bono'&&+r.m===300),K));

  // 7. Las demás entradas no preguntan
  await p.click('[data-cid=hor] [data-edit="hor"]');await p.waitForSelector('#sheet');
  T('editar un movimiento abre el formulario directo, sin asistente ni enlace de cambio',await p.getAttribute('#sheet','data-mode')==='manual'&&!(await p.getAttribute('#sheet','data-wiz'))&&await vis(p,'#sa')&&!(await vis(p,'#smodesw')));
  await cerrar(p);

  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 8. Inglés
  p=await nueva(b,'en');await abrir(p);await W(p);
  {const tx=await p.innerText('#sheet');T('en inglés la elección está traducida',/How do you want to log it\?/.test(tx)&&/Automatic/.test(tx)&&!/Cómo quieres|Escribes o dictas|Eliges el tipo/.test(tx));}
  await p.click('[data-mode="manual"]');await p.waitForTimeout(300);
  {const tx=await p.innerText('#sheet');T('en inglés el primer paso está traducido',/What kind of entry is it\?/.test(tx)&&/Back/.test(tx)&&!/Qué movimiento|Atrás/.test(tx));}
  await p.click('#stype [data-g="gasto"]');await p.waitForTimeout(300);
  {const tx=await p.innerText('#sheet');T('en inglés el segundo paso está traducido',/What kind of expense is it\?/.test(tx)&&!/Qué tipo de gasto/.test(tx));}
  await p.click('[data-wz="back"]');await W(p);await p.click('[data-wz="back"]');await W(p);
  await p.click('[data-mode="auto"]');await p.waitForTimeout(250);await p.fill('#smsg','lunch 25 yape');await p.waitForTimeout(250);
  {const tx=await p.innerText('#sheet');T('en inglés la tarjeta está traducida',/It will be saved like this/.test(tx)&&/Paid from/.test(tx)&&!/Se guardará|Sale de/.test(tx));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
