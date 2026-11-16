// t93: el botón de moneda junto al monto alterna entre soles y la segunda moneda que la persona configuró en Ajustes ($ o €).
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const liq0=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[0].m,K);
const fila=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c)||null;},[K,c]);
const nueva=async(b,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const vis=(p,s)=>p.locator(s).first().isVisible();
const step=p=>p.getAttribute('#sheet','data-step');
const W=p=>p.waitForTimeout(220);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);};
const manual=async p=>{await abrir(p);await p.click('[data-mode="manual"]');await W(p);};
const mon=async p=>(await p.innerText('#scur')).trim();
const gastoHasta=async p=>{await manual(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // 1. El primer paso queda como estaba: sin pregunta de moneda
  await manual(p);
  T('el primer paso no pregunta la moneda (solo el movimiento)',await step(p)==='type'&&!/En qué moneda/.test(await p.innerText('#sheet'))&&await p.locator('#smon').count()===0);
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 2. En el monto, el botón alterna soles ↔ segunda moneda (dólares por defecto)
  const s0=await liq0(p);
  await gastoHasta(p);
  T('el monto empieza en soles',await step(p)==='form'&&await mon(p)==='S/');
  await p.click('#scur');await W(p);
  T('un toque en el botón pasa a dólares ($)',await mon(p)==='$');
  await p.click('#scur');await W(p);
  T('otro toque vuelve a soles',await mon(p)==='S/');
  await p.click('#scur');await W(p);
  await p.fill('#sa','10');await p.fill('#sd','T93 dolares');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  {const r=await fila(p,'T93 dolares');T('el gasto en dólares se guarda con su moneda',!!r&&r.cur==='$'&&+r.m===10);}
  T('y el saldo baja por el equivalente en soles (más de 10)',(s0-await liq0(p))>10);

  // 3. En soles: sin moneda en la fila y descuento exacto
  const s1=await liq0(p);
  await gastoHasta(p);await p.fill('#sa','10');await p.fill('#sd','T93 soles');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  {const r=await fila(p,'T93 soles');T('en soles la fila no guarda moneda',!!r&&!r.cur&&+r.m===10);}
  T('y descuenta exactamente 10',Math.abs((s1-await liq0(p))-10)<0.005);

  // 4. Ajustes: la segunda moneda se configura y el botón la usa
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(800);
  T('Ajustes muestra «Segunda moneda al registrar», en dólares por defecto',await p.locator('#cf-alt').count()===1&&(await p.inputValue('#cf-alt'))==='$');
  await p.selectOption('#cf-alt','€');await p.waitForTimeout(500);
  T('al elegir euros se guarda en la configuración',(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg.monedaAlt,K))==='€');
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);
  await gastoHasta(p);
  await p.click('#scur');await W(p);
  T('con euros configurados, el botón pasa de soles a euros (€), no a dólares',await mon(p)==='€');
  await p.click('#scur');await W(p);
  T('y vuelve a soles',await mon(p)==='S/');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 5. También en el formulario completo («Cambiar a manual») y en «+ Agregar …»
  await abrir(p);await p.click('[data-mode="auto"]');await W(p);await p.click('#smodesw');await W(p);
  await p.click('#scur');await W(p);
  T('el formulario completo usa la misma moneda configurada',await mon(p)==='€');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('[data-new="fij"]');await p.waitForSelector('#sheet');await p.click('[data-mode="manual"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);
  await p.click('#scur');await W(p);
  T('desde «+ Agregar gasto fijo» también alterna con la moneda configurada',await step(p)==='form'&&await mon(p)==='€');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 6. Un valor inválido en la configuración vuelve a dólares
  p=await nueva(b,{monedaAlt:'XX'});await gastoHasta(p);await p.click('#scur');await W(p);
  T('una segunda moneda inválida en los datos se corrige a dólares',await mon(p)==='$');
  await p.context().close();

  // 7. Inglés
  p=await nueva(b,null,'en');await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.reload();await p.waitForTimeout(1000);
  {const tx=await p.innerText('body');T('en inglés Ajustes traduce la segunda moneda',/Second currency when logging/.test(tx)&&/Dollars \(\$\)/.test(tx)&&!/Segunda moneda/.test(tx));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
