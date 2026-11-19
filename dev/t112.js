// t112: Automático/voz con frases habladas de verdad («gasté 15 en taxi con plin», «me llegó el sueldo de 3500», «pagué la tarjeta bbva 300 desde yape»):
// el concepto sale limpio, el tipo se adivina (ingreso, inversión, fijo, tarjeta) y las tarjetas de crédito se entienden.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
// [frase, concepto, monto, tipo en la vista]
const CASOS=[
 ['gasté 15 en taxi con plin','Taxi','15','Cotidiano'],['pagué 120 de luz','Luz','120','Fijo'],['compré pan por 5 soles','Pan','5','Cotidiano'],
 ['compré una polera por 60 soles con yape','Polera','60','Cotidiano'],['pagué el internet 90 soles con plin','Internet','90','Fijo'],
 ['gasté 30 soles en el super con yape','Super','30','Cotidiano'],['comí un pollo a la brasa por cuarenta soles','Pollo a la brasa','40','Cotidiano'],
 ['cien soles en el mercado yape','Mercado','100','Cotidiano'],['50 soles de gasolina','Gasolina','50','Cotidiano'],['pagué mil doscientos de alquiler plin','Alquiler','1200','Fijo'],
 ['almorcé en el trabajo 18 soles efectivo billetes','Almuerzo en el trabajo','18','Cotidiano'],
 ['me llegó el sueldo de 3500','Sueldo','3500','Ingreso'],['cobré 200 soles de un trabajo','Trabajo','200','Ingreso'],
 ['invertí 500 soles','','500','Inversión'],['netflix 45','Netflix','45','Fijo'],
 ['pagué la tarjeta bbva 300 desde yape','','300','Pago'],['pago bbva 500 soles desde yape','','500','Pago'],
 ['compré con la tarjeta oh 120 soles','','120','Compra'],['compras 85 con la tarjeta bcp','Compras','85','Compra'],
 ['almuerzo 25 soles yape','Almuerzo','25','Cotidiano'],['antojo helado 8 soles yape','Helado','8','Antojo']];
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await p.waitForTimeout(250);
  for(const [f,c,m,tp] of CASOS){await p.fill('#smsg','');await p.fill('#smsg',f);await p.waitForTimeout(150);
    const r=await p.evaluate(()=>({m:document.getElementById('sa').value,c:document.getElementById('sd').value,pm:(document.querySelector('#sapv .pvm span')||{}).textContent||''}));
    T('«'+f+'» → '+(c||'(sin concepto)')+' · '+m+' · '+tp+' (salió: '+r.c+' · '+r.m+' · '+r.pm+')',r.c===c&&r.m===m&&r.pm===tp);}
  await p.keyboard.press('Escape');await p.waitForTimeout(200);await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await p.waitForTimeout(250);
  // pago de tarjeta: pide la cuenta con fichas y descuenta de ahí
  await p.fill('#smsg','pago bbva 500');await p.waitForTimeout(250);
  T('pago de tarjeta sin cuenta: la vista ofrece las fichas «Sale de» y pide elegir',await p.locator('#sapv [data-aacct]').count()===4&&/Elige de qué cuenta sale/.test(await p.innerText('#sapv')));
  await p.click('[data-s="save"]');await p.waitForTimeout(300);
  T('al guardar sin cuenta no se guarda y se queda en Automático',await p.getAttribute('#sheet','data-mode')==='auto');
  const liq0=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[1].m,K);
  await p.click('#sapv [data-aacct="liq:1"]');await p.waitForTimeout(200);await p.click('[data-s="save"]');await p.waitForTimeout(500);
  const r2=await p.evaluate(k=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return{liq:m.liq[1].m,f:m.fij.filter(x=>x.card==='bbva').slice(-1)[0]};},K);
  T('al elegir Plin, guarda el pago de BBVA y descuenta 500 de Plin',!!r2.f&&r2.f.m===500&&r2.f.src==='liq:1'&&Math.abs(liq0-500-r2.liq)<0.005);
  T('sin errores de JavaScript',errs.length===0);if(errs.length)console.log(errs);
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
