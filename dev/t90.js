// t90: ventana «¿Cómo quieres registrar?» (Manual / Automático) y el nombre «Cotidiano» en lugar de «Hormiga».
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const rows=(p,c,m)=>p.evaluate(([k,c,m])=>{const S=JSON.parse(localStorage.getItem(k)).S;let n=0;Object.keys(S).forEach(y=>S[y].forEach(mm=>['hor','fij'].forEach(s=>(mm[s]||[]).forEach(r=>{if(r.c===c&&(m==null||+r.m===m))n++;}))));return n;},[K,c,m]);
const nueva=async(b,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadra'==='x'?'':'cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const vis=(p,s)=>p.locator(s).first().isVisible();
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // el nombre nuevo
  {const tx=await p.innerText('body');T('el mes dice «Gastos cotidianos» y no «hormiga»',/Gastos cotidianos/.test(tx)&&!/hormiga/i.test(tx));}
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForTimeout(900);
  T('el resumen no dice «hormiga»',!/hormiga/i.test(await p.innerText('body')));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);

  // 1. la ventana de elección
  await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(200);
  T('«+» abre primero la ventana de elección',await p.getAttribute('#sheet','data-mode')==='ask');
  T('ofrece Manual y Automático',await vis(p,'[data-mode="manual"]')&&await vis(p,'[data-mode="auto"]'));
  T('en la elección no se ve el formulario',!(await vis(p,'#sa'))&&!(await vis(p,'#stype')));
  T('en la elección tampoco se ven los atajos: solo Manual y Automático',await p.locator('#sheet [data-rec1]').evaluateAll(els=>els.every(e=>e.offsetParent===null)));
  T('Escape cierra la ventana',await (async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(200);return (await p.locator('#sheet').count())===0;})());

  // 2. Manual
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="manual"]');await p.waitForTimeout(200);
  T('Manual muestra el formulario de siempre',await p.getAttribute('#sheet','data-mode')==='manual'&&await vis(p,'#sa')&&await vis(p,'#stype')&&!(await vis(p,'#smsg')));
  T('en Gasto, primero va «Fijo» y al costado «Cotidiano»',await p.evaluate(()=>[...document.querySelectorAll('#ssub [data-t]')].map(b=>b.dataset.t).join()==='fij,hor'));
  T('Fijo y Cotidiano vuelven a la vista principal',await vis(p,'#ssub [data-t="hor"]')&&await vis(p,'#ssub [data-t="fij"]')&&/Cotidiano/.test(await p.innerText('#ssub'))&&!/hormiga/i.test(await p.innerText('#sheet')));
  T('hay enlace para cambiar a automático',await vis(p,'#smodesw')&&/automático/i.test(await p.innerText('#smodesw')));

  // 3. Automático sin cuenta conocida: pide la cuenta en vez de guardar a ciegas
  await p.click('#smodesw');await p.waitForTimeout(200);
  T('Automático muestra solo la frase y la confirmación',await p.getAttribute('#sheet','data-mode')==='auto'&&await vis(p,'#smsg')&&!(await vis(p,'#sa'))&&!(await vis(p,'#stype')));
  await p.fill('#smsg','almuerzo');await p.waitForTimeout(150);
  T('sin monto, la tarjeta explica qué escribir',/monto/i.test(await p.innerText('#sapv')));
  await p.fill('#smsg','cafe 5');await p.waitForTimeout(150);
  const n0=await rows(p,'Cafe',null);
  await p.click('[data-s="save"]');await p.waitForTimeout(300);
  T('si falta la cuenta, pasa a manual y la pide (no guarda a ciegas)',await p.locator('#sheet').count()===1&&await p.getAttribute('#sheet','data-mode')==='manual'&&(await rows(p,'Cafe',null))===n0&&/Elige de dónde sale/.test(await p.innerText('#sheet')));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 4. Automático completo
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await p.waitForTimeout(200);
  await p.fill('#smsg','almuerzo 25 yape');await p.waitForTimeout(200);
  const pv=await p.innerText('#sapv');
  T('la tarjeta muestra monto, concepto, tipo y cuenta',/25\.00/.test(pv)&&/Almuerzo/.test(pv)&&/Cotidiano/.test(pv)&&/Yape/.test(pv));
  const a0=await rows(p,'Almuerzo',25);
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('Guardar registra el gasto y cierra',await p.locator('#sheet').count()===0&&(await rows(p,'Almuerzo',25))===a0+1);
  T('avisa con «Deshacer»',await p.locator('#toast [data-undo]').count()===1);

  // 5. Las demás entradas no preguntan
  // cada «+ Agregar …» pregunta Manual o Automático y deja el tipo fijo
  await p.click('[data-new="fij"]');await p.waitForSelector('#sheet');
  T('«+ Agregar gasto fijo» también pregunta Manual o Automático',await p.getAttribute('#sheet','data-mode')==='ask');
  await p.click('[data-mode="manual"]');await p.waitForTimeout(200);
  T('en Manual abre el formulario ya en «Fijo»',await vis(p,'#sa')&&await p.evaluate(()=>!!document.querySelector('#ssub [data-t="fij"][aria-checked=true]')));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('[data-new="fij"]');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await p.waitForTimeout(200);await p.fill('#smsg','netflix 30 yape');await p.waitForTimeout(250);
  T('en Automático desde «Agregar gasto fijo» el tipo queda en Fijo',/Fijo/.test(await p.innerText('#sapv')));
  const f0=await rows(p,'Netflix',30);await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y se guarda como gasto fijo',(await rows(p,'Netflix',30))===f0+1&&await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].fij.some(r=>r.c==='Netflix'),K));
  await p.click('[data-new="ing"]');await p.waitForSelector('#sheet');
  T('«+ Agregar ingreso» también pregunta',await p.getAttribute('#sheet','data-mode')==='ask');
  await p.click('[data-mode="auto"]');await p.waitForTimeout(200);await p.fill('#smsg','bono 300');await p.waitForTimeout(250);
  T('en Automático desde «Agregar ingreso» el tipo queda en Ingreso',/Ingreso/.test(await p.innerText('#sapv')));
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y se guarda como ingreso',await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.some(r=>r.c==='Bono'&&+r.m===300),K));
  await p.click('[data-cid=hor] [data-edit="hor"]');await p.waitForSelector('#sheet');
  T('editar un movimiento abre el formulario directo, sin enlace de cambio',await p.getAttribute('#sheet','data-mode')==='manual'&&!(await vis(p,'#smodesw')));
  await p.keyboard.press('Escape');

  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 6. Inglés
  p=await nueva(b,'en');await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(300);
  {const tx=await p.innerText('#sheet');T('en inglés la elección está traducida',/How do you want to log it\?/.test(tx)&&/Automatic/.test(tx)&&!/Cómo quieres|Escribes o dictas|Eliges el tipo/.test(tx));}
  await p.click('[data-mode="auto"]');await p.waitForTimeout(250);await p.fill('#smsg','lunch 25 yape');await p.waitForTimeout(250);
  {const tx=await p.innerText('#sheet');T('en inglés la tarjeta está traducida',/It will be saved like this/.test(tx)&&/Paid from/.test(tx)&&!/Se guardará|Sale de/.test(tx));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
