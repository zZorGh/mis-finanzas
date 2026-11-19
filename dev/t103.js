// t103: Antojo. Un tipo de gasto más junto a Fijo y Cotidiano (se guarda como cotidiano con una marca, así los totales no cambian),
// la tarjeta «Antojos» del mes con «¿Valió la pena?» (👍/👎 en cada uno), Automático («antojo helado 8 yape») y 50/30/20 (un antojo es un deseo).
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const S=JSON.parse(JSON.stringify(demo.S));if(o.fila)S['2026'][10].hor.push(o.fila);
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S,cfg:demo.cfg}),K,o.lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(250);
const vis=(p,s)=>p.locator(s).first().isVisible();
const fila=(p,c)=>p.evaluate(([k,c])=>JSON.parse(localStorage.getItem(k)).S['2026'][10].hor.find(r=>r.c===c)||null,[K,c]);
const auto=async(p,frase)=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg',frase);await W(p);};
const guardar=async p=>{await p.click('[data-s="save"]');await p.waitForTimeout(450);};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // 1. Al registrar (Manual por pasos)
  await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);
  T('el tipo de gasto ofrece Fijo, Cotidiano y Antojo',await p.evaluate(()=>[...document.querySelectorAll('#ssub [data-t]')].map(b=>b.dataset.t).join()==='fij,hor,ant')&&/Antojo/.test(await p.innerText('#ssub')));
  await p.click('#ssub [data-t="ant"]');await W(p);
  T('elegir Antojo sigue el camino de un gasto cotidiano (pregunta el grupo)',await p.getAttribute('#sheet','data-step')==='grp');
  await p.click('#sgrp [data-sgrp="want"]');await W(p);await p.click('[data-scatskip]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('el resumen dice «Antojo»',/Antojo/.test(await p.innerText('#swsum')));
  await p.fill('#sa','12');await p.fill('#sd','T103 helado');await guardar(p);
  {const f=await fila(p,'T103 helado');T('se guarda en gastos cotidianos con la marca de antojo',!!f&&f.t==='ant'&&f.m===12);}
  // 2. En el mes
  T('la lista de cotidianos lo marca como «Antojo»',/T103 helado[\s\S]{0,120}Antojo/.test(await p.innerText('[data-cid="hor"]')));
  T('aparece la tarjeta «Antojos» con el total y el porcentaje de tus gastos',/Antojos/.test(await p.innerText('[data-cid="ant"]'))&&/12\.00/.test(await p.innerText('[data-cid="ant"]'))&&/1 antojo/.test(await p.innerText('[data-cid="ant"]'))&&/% de tus gastos/.test(await p.innerText('[data-cid="ant"]')));
  T('el antojo sigue sumando a los gastos cotidianos (total de la lista incluye 12)',/T103 helado/.test(await p.innerText('[data-cid="hor"]')));
  // 3. ¿Valió la pena?
  await p.click('[data-cid="ant"] [data-vp$=":1"]');await p.waitForTimeout(300);
  T('«Valió la pena» queda guardado en la fila (v=1) y marcado',(await fila(p,'T103 helado')).v===1&&(await p.getAttribute('[data-cid="ant"] [data-vp$=":1"]','aria-pressed'))==='true');
  T('la lista de cotidianos lo refleja',/Valió la pena/.test(await p.innerText('[data-cid="hor"]')));
  await p.click('[data-cid="ant"] [data-vp$=":0"]');await p.waitForTimeout(300);
  T('cambiar a «No valió la pena» (v=0) y la tarjeta dice cuánto se habría ahorrado',(await fila(p,'T103 helado')).v===0&&/No valió la pena[\s\S]*12\.00[\s\S]*eso habrías ahorrado/.test(await p.innerText('[data-cid="ant"]')));
  await p.click('[data-cid="ant"] [data-vp$=":0"]');await p.waitForTimeout(300);
  T('tocar otra vez quita la respuesta (sin v) y vuelve a «Sin responder»',(await fila(p,'T103 helado')).v===undefined&&/Sin responder/.test(await p.innerText('[data-cid="ant"]')));
  await p.click('[data-cid="ant"] [data-vp$=":1"]');await p.waitForTimeout(300);
  // 4. Editar conserva marca y respuesta; cambiar a Cotidiano quita la marca
  await p.click('[data-cid="hor"] [data-edit="hor"]:has-text("T103 helado")');await W(p);
  T('al editar, el chip Antojo está marcado',await p.evaluate(()=>!!document.querySelector('#ssub [data-t="ant"][aria-checked=true]')));
  await p.fill('#sa','15');await guardar(p);
  {const f=await fila(p,'T103 helado');T('editar el monto conserva la marca y la respuesta',f.m===15&&f.t==='ant'&&f.v===1);}
  await p.click('[data-cid="hor"] [data-edit="hor"]:has-text("T103 helado")');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);await guardar(p);
  {const f=await fila(p,'T103 helado');T('cambiarlo a Cotidiano quita la marca de antojo',!!f&&f.t!=='ant');}
  T('y la tarjeta «Antojos» desaparece si ya no hay ninguno',await p.locator('[data-cid="ant"]').count()===0);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 5. Automático
  p=await nueva(b);await auto(p,'antojo helado 8 yape');
  T('en Automático, «antojo helado 8 yape» se entiende (8, Helado) y la tarjeta dice Antojo',(await p.inputValue('#sa'))==='8'&&(await p.inputValue('#sd'))==='Helado'&&/Antojo/.test(await p.innerText('#sapv')));
  await guardar(p);
  {const f=await fila(p,'Helado');T('se guarda como antojo',!!f&&f.t==='ant'&&f.m===8);}
  await auto(p,'capricho chocolate 5 yape');await guardar(p);
  {const f=await fila(p,'Chocolate');T('«capricho» también marca antojo',!!f&&f.t==='ant');}
  await auto(p,'antojo galletas 6 y almuerzo 25 yape');
  T('con varios gastos, solo el que dice antojo lo es',/Se guardarán 2 gastos/.test(await p.innerText('#sapv'))&&/Antojo/.test(await p.innerText('#sapv')));
  await guardar(p);
  {const a=await fila(p,'Galletas'),c=await fila(p,'Almuerzo');T('guardados: Galletas antojo y Almuerzo normal',!!a&&a.t==='ant'&&!!c&&c.t!=='ant');}
  await p.context().close();

  // 6. 50/30/20: un antojo es un deseo, aunque su categoría diga necesidad
  const usado=async o=>{const q=await nueva(b,o);const x=await q.evaluate(()=>({n:document.getElementById('pu0').textContent,w:document.getElementById('pu1').textContent}));await q.context().close();return x;};
  const base=await usado(),conA=await usado({fila:{c:'T103 antojo',m:100,f:'10-nov',k:'Necesidad',t:'ant'}}),conN=await usado({fila:{c:'T103 normal',m:100,f:'10-nov',k:'Necesidad'}});
  T('con categoría «Necesidad», el gasto normal suma a Necesidades pero el antojo suma a Deseos',conN.n!==base.n&&conN.w===base.w&&conA.n===base.n&&conA.w!==base.w);

  // 7. Inglés
  p=await nueva(b,{lang:'en',fila:{c:'T103 helado',m:12,f:'10-nov',k:'',t:'ant'}});
  {const x=await p.innerText('[data-cid="ant"]');T('en inglés se traduce («Impulse buys», «Worth it», «Not worth it»)',/Impulse buys/.test(x)&&/Worth it/.test(x)&&/Not worth it/.test(x)&&/1 impulse buy/.test(x));}
  await p.context().close();

  // 5. Aviso «¿Valió la pena?» justo al guardar un antojo
  p=await nueva(b);await auto(p,'antojo galleta 8 yape');await guardar(p);
  T('al guardar un antojo, el aviso pregunta «¿Valió la pena?» con Sí y No',/¿Valió la pena\?/.test(await p.innerText('#toast'))&&(await p.locator('#toast [data-vpq]').count())===2);
  await p.click('#toast [data-vpq="0"]');await p.waitForTimeout(300);
  T('responder «No» guarda v=0 en la fila y lo confirma',(await fila(p,'Galleta')).v===0&&/no valió la pena/.test(await p.innerText('#toast')));
  await p.keyboard.press('Control+z');await p.waitForTimeout(300);
  T('Deshacer sigue funcionando tras responder (la fila se quita)',(await fila(p,'Galleta'))===null);
  await auto(p,'almuerzo 15 yape');await guardar(p);
  T('un gasto que no es antojo no pregunta nada',(await p.locator('#toast [data-vpq]').count())===0);
  await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
