// t102: alta inicial guiada. Una decisión por pantalla: cuentas → saldos de hoy → tarjetas → gastos fijos → listo.
// Lo escrito se guarda en el mes actual (saldos, deuda anterior), en la configuración (nombres, línea de crédito) y como recurrentes («Por pagar este mes»).
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem('mis-finanzas-prototipo-v1-skin','cuadre');localStorage.setItem('mis-finanzas-prototipo-v1-tema','light');localStorage.setItem('mis-finanzas-prototipo-v1-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(250);
const vis=(p,s)=>p.locator(s).first().isVisible();
const dlg=p=>p.evaluate(()=>{const e=document.getElementById('onbox');return e?e.innerText:'';});
const st=p=>p.evaluate(k=>{const o=JSON.parse(localStorage.getItem(k)||'{}');return{S:o.S,cfg:o.cfg};},K);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  T('en un Resumen vacío, la bienvenida ofrece «Configurar mis cuentas y tarjetas»',await vis(p,'[data-act="alta"]'));
  await p.click('[data-act="alta"]');await p.waitForSelector('#onbox');await W(p);
  T('abre el asistente en el paso 1 de 5, como diálogo, preguntando dónde tienes tu dinero',/Paso 1 de 5/.test(await dlg(p))&&/Dónde tienes tu dinero/.test(await dlg(p))&&(await p.getAttribute('#onbox','role'))==='dialog'&&await p.locator('input[id^="ob-l"]').count()===4);
  await p.fill('#ob-l1','BCP ahorro');await p.click('#ob-go');await W(p);
  T('paso 2: pregunta cuánto hay hoy y usa los nombres escritos',/Paso 2 de 5/.test(await dlg(p))&&/Cuánto hay hoy/.test(await dlg(p))&&/BCP ahorro/.test(await dlg(p)));
  await p.fill('#ob-s0','430');await p.fill('#ob-s1','abc');await p.click('#ob-go');await W(p);
  T('un monto que no se entiende no deja avanzar y lo explica',/Paso 2 de 5/.test(await dlg(p))&&/No entiendo ese monto/.test(await p.innerText('#ob-err')));
  await p.fill('#ob-s1','130');await p.fill('#ob-s2','1,200.50');await p.click('#ob-go');await W(p);
  T('paso 3: tarjetas (nombre, línea de crédito y deuda de hoy)',/Paso 3 de 5/.test(await dlg(p))&&/crédito/.test(await dlg(p))&&await p.locator('#ob-b0,#ob-c0,#ob-d0').count()===3);
  await p.click('#ob-back');await W(p);
  T('«← Atrás» vuelve al paso 2 y conserva lo escrito',/Paso 2 de 5/.test(await dlg(p))&&(await p.inputValue('#ob-s2'))==='1,200.50'&&(await p.inputValue('#ob-s0'))==='430');
  await p.click('#ob-go');await W(p);
  await p.fill('#ob-b0','Interbank');await p.fill('#ob-c0','5000');await p.fill('#ob-d0','1200');await p.fill('#ob-k0','40');await p.click('#ob-go');await W(p);
  T('un día de corte fuera de 1–31 se rechaza',/del 1 al 31/.test(await p.innerText('#ob-err')));
  await p.fill('#ob-k0','15');await p.fill('#ob-p0','5');await p.click('#ob-go');await W(p);
  T('paso 4: gasto fijo con concepto, monto, día y cuenta',/Paso 4 de 5/.test(await dlg(p))&&await p.locator('#ob-fc,#ob-fm,#ob-fd,#ob-fs').count()===4&&/BCP ahorro/.test(await p.innerText('#ob-fs')));
  await p.fill('#ob-fc','Alquiler');await p.click('#ob-more');await W(p);
  T('concepto sin monto: lo pide y no agrega',/Escribe el monto/.test(await p.innerText('#ob-err')));
  await p.fill('#ob-fm','800');await p.fill('#ob-fd','5');await p.click('#ob-more');await W(p);
  T('«Agregar otro» deja el primero en una etiqueta y limpia el formulario',/Alquiler · 800\.00 · día 5/.test(await dlg(p))&&(await p.inputValue('#ob-fc'))==='');
  await p.fill('#ob-fc','Internet');await p.fill('#ob-fm','90');await p.fill('#ob-fd','10');await p.selectOption('#ob-fs','liq:1');await p.click('#ob-go');await W(p);
  T('paso 5: resumen (S/ 1,760.50 en cuentas, 1 tarjeta, 2 gastos fijos)',/Paso 5 de 5/.test(await dlg(p))&&/1,760\.50/.test(await dlg(p))&&/1 tarjeta/.test(await dlg(p))&&/2 gastos fijos por pagar/.test(await dlg(p)));
  await p.click('#ob-go');await p.waitForTimeout(500);
  T('«Ir a mi mes» cierra el asistente y abre noviembre',await p.locator('#onbg').count()===0&&/noviembre/.test(await p.evaluate(()=>location.hash)));
  {const s=await st(p),m=s.S['2026'][10];
   T('guarda el día de corte (15) y de pago (5) de la tarjeta',(s.cfg.corteDia||{}).bbva===15&&(s.cfg.pagoDia||{}).bbva===5);
   T('guarda nombres y saldos del mes actual (Yape 430, BCP ahorro 130, billetes 1,200.50)',s.cfg.liqNames[1]==='BCP ahorro'&&m.liq[0].m===430&&m.liq[1].m===130&&m.liq[2].m===1200.5);
   T('guarda la tarjeta: nombre, línea 5000 y deuda anterior 1200',s.cfg.bancos.bbva==='Interbank'&&s.cfg.credito.bbva===5000&&m.copen.bbva===1200);
   T('guarda los dos gastos fijos como recurrentes con su cuenta y su día',s.cfg.rec.length===2&&s.cfg.rec.some(r=>r.c==='Alquiler'&&r.m===800&&r.f===5&&r.src==='liq:0')&&s.cfg.rec.some(r=>r.c==='Internet'&&r.f===10&&r.src==='liq:1'));
   T('marca el alta como hecha',s.cfg.onb===1);}
  await p.waitForSelector('.ppcard');
  T('«Por pagar este mes» ya muestra los gastos fijos desde el primer día',/Alquiler/.test(await p.innerText('.ppcard'))&&/Internet/.test(await p.innerText('.ppcard')));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  // Volver a abrirlo: viene con lo que ya hay
  await p.evaluate(()=>{location.hash='#resumen';});await p.waitForTimeout(600);
  if(await p.locator('[data-act="alta"]').count()){await p.click('[data-act="alta"]');await p.waitForSelector('#onbox');await W(p);
    T('al volver a abrirlo trae los nombres ya guardados',(await p.inputValue('#ob-l1'))==='BCP ahorro');
    await p.click('#ob-go');await W(p);T('y los saldos',(await p.inputValue('#ob-s2'))==='1200.5');}
  await p.context().close();

  // «Terminar aquí» guarda lo escrito hasta ahí
  p=await nueva(b);await p.click('[data-act="alta"]');await p.waitForSelector('#onbox');await W(p);
  await p.fill('#ob-l0','Mi billetera');await p.click('#ob-go');await W(p);await p.fill('#ob-s0','75');await p.click('#ob-skip');await p.waitForTimeout(500);
  {const s=await st(p);T('«Terminar aquí» guarda lo escrito (nombre y saldo) y cierra',await p.locator('#onbg').count()===0&&s.cfg.liqNames[0]==='Mi billetera'&&s.S['2026'][10].liq[0].m===75&&s.cfg.onb===1);}
  await p.context().close();
  // «Omitir por ahora» deja todo como estaba
  p=await nueva(b);await p.click('[data-act="alta"]');await p.waitForSelector('#onbox');await W(p);await p.click('#ob-skip');await p.waitForTimeout(500);
  {const s=await st(p);T('«Omitir por ahora» cierra, no cambia saldos y no vuelve a preguntar',await p.locator('#onbg').count()===0&&s.S['2026'][10].liq.every(r=>!+r.m)&&s.cfg.onb===1);}
  await p.context().close();

  // Inglés
  p=await nueva(b,'en');await p.click('[data-act="alta"]');await p.waitForSelector('#onbox');await W(p);
  T('en inglés se traduce el asistente',/Where is your money today\?/.test(await dlg(p))&&/Step 1 of 5/.test(await dlg(p)));
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
