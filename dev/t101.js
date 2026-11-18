// t101: historial por cuenta. Al tocar el nombre de una cuenta en «Dónde está tu dinero» se ve qué movió su saldo ese mes:
// saldo ahora, saldo de partida, movimientos con su efecto (+/−) y el saldo después de cada uno; tocar un movimiento lo abre para editarlo.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(250);
const auto=async(p,frase)=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg',frase);await W(p);await p.click('[data-s="save"]');await p.waitForTimeout(450);};
const abrir=async(p,nom)=>{await p.click('.liq-nm:has-text("'+nom+'")');await p.waitForSelector('#sheet.hist');await W(p);};
const txt=p=>p.evaluate(()=>document.getElementById('sheet').innerText);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  T('cada cuenta de «Dónde está tu dinero» es un botón con nombre accesible',await p.locator('.liq-nm').count()>=4&&/Ver los movimientos de Yape/.test(await p.getAttribute('.liq-nm','aria-label')));
  await abrir(p,'Yape');let x=await txt(p);
  T('sin movimientos registrados: saldo ahora = partida = 430 y lo dice',/Yape · Noviembre/.test(x)&&/430\.00/.test(x)&&/todavía no hay movimientos/.test(x));
  T('los gastos viejos sin descuento guardado no se listan (Almuerzos de la demo)',!/Almuerzos/.test(x));
  await p.keyboard.press('Escape');await W(p);
  T('Escape cierra la ventana',await p.locator('#sheet').count()===0);

  await auto(p,'taxi 20 yape');await auto(p,'sueldo 100 yape');await auto(p,'cena 15 yape');
  await abrir(p,'Yape');x=await txt(p);
  T('Saldo ahora = 430 − 20 + 100 − 15 = 495',/Saldo ahora[\s\S]*495\.00/.test(x));
  T('Saldo de partida = 430 y movimientos del mes = + 65',/Saldo de partida[\s\S]*430\.00/.test(x)&&/\+ S\/ 65\.00/.test(x));
  const filas=await p.evaluate(()=>[...document.querySelectorAll('#sheet .hr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()));
  T('lista los tres movimientos con su efecto y el saldo después (530, 510, 495; el mismo día salen primero los ingresos)',filas.length===3&&/Sueldo/.test(filas[0])&&/\+ S\/ 100\.00/.test(filas[0])&&/530\.00/.test(filas[0])&&/Taxi/.test(filas[1])&&/− S\/ 20\.00/.test(filas[1])&&/510\.00/.test(filas[1])&&/Cena/.test(filas[2])&&/495\.00/.test(filas[2]));
  T('cada movimiento dice su tipo (Ingreso / Cotidiano)',/Ingreso/.test(filas[0])&&/Cotidiano/.test(filas[1]));
  T('el ingreso se ve en positivo y el gasto en negativo (colores distintos)',await p.evaluate(()=>{const r=[...document.querySelectorAll('#sheet .hr b')];return r[0].className==='pos'&&r[1].className==='neg';}));
  await p.keyboard.press('Escape');await W(p);
  await abrir(p,'Plin');x=await txt(p);
  T('otra cuenta (Plin) no se ve afectada',/todavía no hay movimientos/.test(x)&&/130\.00/.test(x));
  await p.keyboard.press('Escape');await W(p);

  // Tocar un movimiento lo abre para editarlo; el historial se actualiza
  await abrir(p,'Yape');await p.click('#sheet .hr:has-text("Taxi")');await W(p);
  T('tocar un movimiento abre «Editar movimiento»',/Editar movimiento/.test(await txt(p)));
  await p.fill('#sa','30');await p.click('[data-s="save"]');await p.waitForTimeout(450);
  await abrir(p,'Yape');x=await txt(p);
  T('al corregir el taxi a 30, el historial y el saldo se actualizan (485)',/Saldo ahora[\s\S]*485\.00/.test(x)&&/− S\/ 30\.00/.test(x));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // Inglés
  p=await nueva(b,'en');await abrir(p,'Yape');
  T('en inglés se traduce',/Balance now/.test(await txt(p))&&/Starting balance/.test(await txt(p)));
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
