// t91: un ingreso pregunta en qué cuenta se deposita y la suma al saldo; editar, borrar o deshacer lo revierte.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const liq0=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[0].m,K);
const ing=(p,c)=>p.evaluate(([k,c])=>JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.map((r,i)=>[i,r]).filter(([i,r])=>r.c===c),[K,c]);
const igual=(a,b)=>Math.abs(a-b)<0.005;
const nueva=async(b,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const vis=(p,s)=>p.locator(s).first().isVisible();
const step=p=>p.getAttribute('#sheet','data-step');
const W=p=>p.waitForTimeout(220);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);};
// Manual por pasos hasta el formulario de un ingreso; cuenta = 'liq:0' | 'none'
const ingreso=async(p,monto,concepto,cuenta)=>{await abrir(p);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="ing"]');await W(p);await p.click('#ssrc [data-src="'+cuenta+'"]');await W(p);await p.fill('#sa',String(monto));await p.fill('#sd',concepto);await p.click('[data-s="save"]');await p.waitForTimeout(400);};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // 1. El asistente pregunta la cuenta
  await abrir(p);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="ing"]');await W(p);
  T('un ingreso pregunta «¿En qué cuenta se deposita?»',await step(p)==='src'&&await vis(p,'#ssrc')&&/En qué cuenta se deposita/.test(await p.innerText('#ssrcw')));
  T('ofrece las cuentas y «No sumar a ninguna cuenta»',await p.locator('#ssrc [data-src^="liq:"]').count()>=2&&await p.locator('#ssrc [data-src="none"]').count()===1&&/No sumar a ninguna cuenta/.test(await p.innerText('#ssrc')));
  await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('luego pide monto y concepto, con la cuenta en el resumen',await step(p)==='form'&&/Yape/.test(await p.innerText('#swsum')));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 2. Suma al saldo y avisa; Deshacer lo revierte
  const s0=await liq0(p);
  await ingreso(p,100,'T91 ingreso','liq:0');
  T('el ingreso se suma al saldo de la cuenta',igual(await liq0(p),s0+100));
  T('avisa «sumado a …» con «Deshacer»',/sumado a/.test(await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||''))&&await p.locator('#toast [data-undo]').count()===1);
  {const r=(await ing(p,'T91 ingreso'))[0];T('la fila guarda su cuenta y el monto sumado',!!r&&r[1].src==='liq:0'&&igual(r[1]._d,-100));}
  await p.click('#toast [data-undo]');await p.waitForTimeout(400);
  T('«Deshacer» devuelve el saldo y quita el ingreso',igual(await liq0(p),s0)&&(await ing(p,'T91 ingreso')).length===0);

  // 3. Editar el monto ajusta el saldo; borrar lo devuelve
  await ingreso(p,100,'T91 ingreso','liq:0');
  const i1=(await ing(p,'T91 ingreso'))[0][0];
  await p.click('[data-cid=ing] [data-edit="ing"][data-i="'+i1+'"]');await p.waitForSelector('#sheet');await p.waitForTimeout(150);
  T('al editar se ve la cuenta elegida',await p.evaluate(()=>!!document.querySelector('#ssrc [data-src="liq:0"][aria-checked=true]')));
  await p.fill('#sa','150');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('editar el monto a 150 deja el saldo en +150 (no +250)',igual(await liq0(p),s0+150));
  const i2=(await ing(p,'T91 ingreso'))[0][0];
  await p.click('[data-cid=ing] [data-edit="ing"][data-i="'+i2+'"]');await p.waitForSelector('#sheet');await p.waitForTimeout(150);
  await p.click('[data-s="del-mov"]');await p.waitForTimeout(400);
  T('borrar el ingreso devuelve el saldo',igual(await liq0(p),s0)&&(await ing(p,'T91 ingreso')).length===0);

  // 4. «No sumar a ninguna cuenta»: se registra sin tocar saldos (como antes)
  await ingreso(p,80,'T91 sin cuenta','none');
  T('con «No sumar» el ingreso se registra y el saldo no cambia',igual(await liq0(p),s0)&&(await ing(p,'T91 sin cuenta')).length===1&&!(await ing(p,'T91 sin cuenta'))[0][1].src);

  // 5. Automático: entiende la cuenta, o avisa que no suma a ninguna
  await abrir(p);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','sueldo 500 yape');await p.waitForTimeout(250);
  {const pv=await p.innerText('#sapv');T('Automático: «sueldo 500 yape» muestra a qué cuenta entra',/Ingreso/.test(pv)&&/Entra a/.test(pv)&&/Yape/.test(pv)&&/500\.00/.test(pv));}
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y la suma a Yape',igual(await liq0(p),s0+500));
  await abrir(p);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','sueldo extra 20');await p.waitForTimeout(250);
  T('sin cuenta en la frase, la tarjeta dice que no se suma a ninguna',/No se suma a ninguna cuenta/.test(await p.innerText('#sapv')));
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y no toca los saldos',igual(await liq0(p),s0+500));

  // 6. Desde «+ Agregar ingreso» también pregunta la cuenta
  await p.click('[data-new="ing"]');await p.waitForSelector('#sheet');await p.click('[data-mode="manual"]');await W(p);
  T('«+ Agregar ingreso» salta el tipo y pregunta la cuenta',await step(p)==='src');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 7. Los gastos siguen descontando igual
  await abrir(p);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);
  await p.fill('#sa','10');await p.fill('#sd','T91 gasto');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('un gasto sigue descontando del saldo',igual(await liq0(p),s0+490));

  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 8. Inglés
  p=await nueva(b,'en');await abrir(p);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="ing"]');await p.waitForTimeout(300);
  {const tx=await p.innerText('#sheet');T('en inglés la pregunta y la opción están traducidas',/Which account is it deposited into\?/.test(tx)&&/Do not add to any account/.test(tx)&&!/En qué cuenta|No sumar/.test(tx));}
  await p.click('[data-wz="back"]');await W(p);await p.click('[data-wz="back"]');await W(p);
  await p.click('[data-mode="auto"]');await p.waitForTimeout(250);await p.fill('#smsg','sueldo 500 yape');await p.waitForTimeout(250);
  {const tx=await p.innerText('#sheet');T('en inglés la tarjeta de un ingreso está traducida',/Goes into/.test(tx)&&!/Entra a/.test(tx));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
