// t98: al registrar un gasto (Manual, por pasos) se pregunta el grupo (Necesidades, Deseos, Ahorro e inversión) y luego la categoría dentro de ese grupo.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(230);
const step=p=>p.getAttribute('#sheet','data-step');
const vis=(p,s)=>p.locator(s).first().isVisible();
const hastaGrupo=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);};
const guardar=async(p,monto,concepto)=>{await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa',monto);await p.fill('#sd',concepto);await p.click('[data-s="save"]');await p.waitForTimeout(400);};
const fila=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c)||null;},[K,c]);
const cfgNow=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg,K);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,{catGrupo:{'ocio':'want','menú':'need'}});
  await hastaGrupo(p);
  T('después del tipo, pregunta «¿En qué grupo cae este gasto?» con los tres grupos',await step(p)==='grp'&&/En qué grupo/.test(await p.innerText('#swq'))&&await p.locator('#sgrp button').count()===3);
  await p.click('#sgrp [data-sgrp="want"]');await W(p);
  T('luego pregunta «¿En qué categoría?» mostrando las del grupo elegido (Ocio) y no las de otro (Menú)',await step(p)==='cat'&&/En qué categoría/.test(await p.innerText('#swq'))&&/Ocio/.test(await p.innerText('#scat2'))&&!/Menú/.test(await p.innerText('#scat2')));
  T('las categorías sin clasificar aparecen aparte, con el aviso de que se suman al grupo',await vis(p,'#scat2o')&&/Alquiler/.test(await p.innerText('#scat2o'))&&/se suma a este grupo/.test(await p.innerText('#scat2ol')));
  await p.click('#scat2 [data-sc="Ocio"]');await W(p);
  T('elegir la categoría avanza solo a «de dónde sale»',await step(p)==='src');
  await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('el resumen muestra el grupo y la categoría elegidos',/Deseos/.test(await p.innerText('#swsum'))&&/Ocio/.test(await p.innerText('#swsum')));
  await p.fill('#sa','12');await p.fill('#sd','T98 cine');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('el gasto se guarda con esa categoría',(await fila(p,'T98 cine')||{}).k==='Ocio');
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // Una categoría sin clasificar queda en el grupo donde se elige
  p=await nueva(b,{catGrupo:{'ocio':'want'}});await hastaGrupo(p);
  await p.click('#sgrp [data-sgrp="need"]');await W(p);
  T('un grupo sin categorías muestra el mensaje y deja escribir una',/Todavía no tienes categorías en este grupo/.test(await p.innerText('#scat2e')));
  await p.click('#scat2o [data-sc="Salud"]');await W(p);await guardar(p,'30','T98 farmacia');
  T('el gasto queda con la categoría Salud',(await fila(p,'T98 farmacia')||{}).k==='Salud');
  T('y Salud quedó clasificada en Necesidades para siempre',(await cfgNow(p)).catGrupo.salud==='need');
  await p.context().close();

  // Categoría nueva, con Enter
  p=await nueva(b);await hastaGrupo(p);await p.click('#sgrp [data-sgrp="want"]');await W(p);
  await p.fill('#scn','T98 Mascotas');await p.press('#scn','Enter');await W(p);
  T('escribir una categoría nueva y pulsar Enter avanza sin guardar el gasto',await step(p)==='src'&&await p.locator('#sheet').count()===1);
  await guardar(p,'20','T98 croquetas');
  T('la categoría nueva queda creada y en el grupo elegido (Deseos)',(await fila(p,'T98 croquetas')||{}).k==='T98 Mascotas'&&(await cfgNow(p)).cats.includes('T98 Mascotas')&&(await cfgNow(p)).catGrupo['t98 mascotas']==='want');
  await p.context().close();

  // Sin categoría
  p=await nueva(b);await hastaGrupo(p);await p.click('#sgrp [data-sgrp="need"]');await W(p);await p.click('[data-scatskip]');await W(p);await guardar(p,'8','T98 sin cat');
  T('«Sin categoría» guarda el gasto sin categoría',(await fila(p,'T98 sin cat')||{}).k==='');
  await p.context().close();

  // Automático no pregunta grupo ni categoría
  p=await nueva(b);await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','almuerzo 25 yape');await W(p);
  T('Automático no muestra el grupo ni la categoría',!(await vis(p,'#sgrpw'))&&!(await vis(p,'#scatw2')));
  await p.context().close();

  // Inglés
  p=await nueva(b,null,'en');await hastaGrupo(p);
  T('en inglés se traduce la pregunta del grupo',/Which group does this expense fall into\?/.test(await p.innerText('#swq'))&&/Needs/.test(await p.innerText('#sgrp')));
  await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
