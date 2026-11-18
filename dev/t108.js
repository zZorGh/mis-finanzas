// t108: dictado con estructura «concepto, precio, moneda y cuenta». La frase se entiende con cualquier cuenta por su nombre y con la moneda dicha
// (soles, dólares, euros); la tarjeta de confirmación muestra los cuatro datos con fichas para corregir la moneda y la cuenta.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const FAKE=`window.__vz={inst:null};window.SpeechRecognition=window.webkitSpeechRecognition=function(){const s=this;window.__vz.inst=s;s.start=function(){setTimeout(()=>s.onstart&&s.onstart(),10);};s.stop=function(){setTimeout(()=>s.onend&&s.onend(),10);};};`;
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(FAKE);
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');localStorage.setItem('cuadra-voz','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,o.cfg||{})}),K,o.lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(250);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="auto"]');await W(p);};
const frase=async(p,t)=>{await p.fill('#smsg','');await p.fill('#smsg',t);await W(p);};
const card=p=>p.evaluate(()=>{const pv=document.getElementById('sapv');const sel=s=>[...pv.querySelectorAll(s+'[aria-checked=true]')].map(e=>e.dataset.acur||e.dataset.aacct);return{txt:pv.innerText,monto:document.getElementById('sa').value,concepto:document.getElementById('sd').value,cur:sel('[data-acur]')[0]||'',cta:sel('[data-aacct]')[0]||'',nCur:pv.querySelectorAll('[data-acur]').length,nCta:pv.querySelectorAll('[data-aacct]').length,btn:document.querySelector('#sheet [data-s="save"]').textContent.trim()};});
const fila=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c)||null;},[K,c]);
const liq=(p,i)=>p.evaluate(([k,i])=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[i].m,[K,i]);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);await abrir(p);let c;
  c=await card(p);
  T('antes de dictar, la guía dice qué decir: concepto, precio, moneda y cuenta, con ejemplos',/concepto, precio, moneda y cuenta/.test(c.txt)&&/dólares/.test(c.txt)&&/euros/.test(c.txt));
  T('el campo sugiere el formato («almuerzo 25 soles yape»)',/25 soles yape/.test(await p.getAttribute('#smsg','placeholder')));
  // 1. Soles con una cuenta por su nombre completo
  await frase(p,'almuerzo 25 soles con efectivo monedas');c=await card(p);
  T('«almuerzo 25 soles con efectivo monedas»: concepto Almuerzo, S/ 25, cuenta Efectivo monedas (no la primera «efectivo»)',c.concepto==='Almuerzo'&&c.monto==='25'&&c.cur==='S/'&&c.cta==='liq:3');
  T('en el concepto no quedan «con», «efectivo» ni «monedas»',!/con|efectivo|monedas|soles/i.test(c.concepto));
  // 2. Dólares y otra cuenta
  await frase(p,'uber 12 dólares desde Plin');c=await card(p);
  T('«uber 12 dólares desde Plin»: Uber, $ 12, cuenta Plin',c.concepto==='Uber'&&c.monto==='12'&&c.cur==='$'&&c.cta==='liq:1');
  T('con dólares, la tarjeta dice cuánto equivale en soles (12 × 3.40 = S/ 40.80)',/Equivale a/.test(c.txt)&&/40\.80/.test(c.txt));
  // 3. Euros y la palabra «efectivo»
  await frase(p,'café 4 euros efectivo');c=await card(p);
  T('«café 4 euros efectivo»: € y la primera cuenta de efectivo; equivale a S/ 16.40',c.cur==='€'&&c.cta==='liq:2'&&/16\.40/.test(c.txt));
  // 4. Números en palabras y preposiciones de cuenta
  await frase(p,'cena treinta soles de mi cuenta Yape');c=await card(p);
  T('«cena treinta soles de mi cuenta Yape»: Cena, 30, Yape, sin «de mi cuenta» en el concepto',c.concepto==='Cena'&&c.monto==='30'&&c.cta==='liq:0'&&c.cur==='S/');
  // 5. Fichas: cuatro cuentas + «No descontar», tres monedas
  await frase(p,'almuerzo 25 yape');c=await card(p);
  T('la tarjeta ofrece 3 monedas y las 4 cuentas más «No descontar»',c.nCur===3&&c.nCta===5);
  await p.click('#sapv [data-aacct="liq:1"]');await W(p);c=await card(p);
  T('tocar otra cuenta la elige (Plin)',c.cta==='liq:1');
  await p.click('#sapv [data-acur="$"]');await W(p);c=await card(p);
  T('tocar $ cambia la moneda y muestra el equivalente (25 × 3.40 = S/ 85.00)',c.cur==='$'&&/85\.00/.test(c.txt));
  const p0=await liq(p,1);
  await p.click('[data-s="save"]');await p.waitForTimeout(500);
  {const f=await fila(p,'Almuerzo');T('se guarda en dólares y descuenta 85 de Plin',!!f&&f.cur==='$'&&f.m===25&&f.src==='liq:1'&&Math.abs(p0-85-(await liq(p,1)))<0.005);}
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 6. Sin cuenta: la tarjeta la pide y no guarda a ciegas
  p=await nueva(b);await abrir(p);await frase(p,'pan 8');c=await card(p);
  T('sin cuenta dicha ni usada antes, ninguna ficha de cuenta queda marcada y se pide elegir',c.cta===''&&/Elige de qué cuenta sale/.test(c.txt));
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('al guardar se queda en Automático, lo avisa y no guarda nada',await p.getAttribute('#sheet','data-mode')==='auto'&&/Elige de qué cuenta sale/.test(await p.innerText('#sheet'))&&(await fila(p,'Pan'))===null);
  await p.click('#sapv [data-aacct="liq:0"]');await W(p);await p.click('[data-s="save"]');await p.waitForTimeout(500);
  {const f=await fila(p,'Pan');T('al elegir la cuenta con una ficha, guarda y descuenta de ahí',!!f&&f.m===8&&f.src==='liq:0');}
  await p.context().close();

  // 7. Moneda dicha aunque esté desactivada en Ajustes
  p=await nueva(b,{cfg:{monedas:[]}});await abrir(p);await frase(p,'uber 10 dólares plin');c=await card(p);
  T('si la moneda dicha está desactivada en Ajustes, igual se respeta ($)',c.cur==='$'&&c.cta==='liq:1');await p.context().close();

  // 8. Varios gastos, cada uno con su moneda y su cuenta
  p=await nueva(b);await abrir(p);await frase(p,'almuerzo 25 soles yape y taxi 12 dólares plin');c=await card(p);
  T('«almuerzo 25 soles yape y taxi 12 dólares plin»: dos gastos, uno en soles y otro en dólares',/Se guardarán 2 gastos/.test(c.txt)&&/S\/ 25\.00/.test(c.txt)&&/\$ 12\.00/.test(c.txt)&&/Yape/.test(c.txt)&&/Plin/.test(c.txt));
  const y0=await liq(p,0),pl0=await liq(p,1);
  await p.click('[data-s="save"]');await p.waitForTimeout(500);
  {const a=await fila(p,'Almuerzo'),t2=await fila(p,'Taxi');
   T('se guardan con su moneda y su cuenta (25 de Yape; 12 $ = 40.80 de Plin)',!!a&&!!t2&&!a.cur&&t2.cur==='$'&&a.src==='liq:0'&&t2.src==='liq:1'&&Math.abs(y0-25-(await liq(p,0)))<0.005&&Math.abs(pl0-40.8-(await liq(p,1)))<0.005);}
  await p.context().close();

  // 9. Por voz (reconocedor simulado)
  p=await nueva(b);await abrir(p);await p.click('#smic');await W(p);
  T('al dictar, el aviso recuerda el formato',/concepto, precio, moneda y cuenta/.test(await p.innerText('#smicst')));
  await p.evaluate(()=>window.__vz.inst.onresult({results:[[{transcript:'almuerzo veinticinco soles yape'}]]}));await W(p);c=await card(p);
  T('«almuerzo veinticinco soles yape» dictado: Almuerzo, S/ 25, Yape',c.concepto==='Almuerzo'&&c.monto==='25'&&c.cur==='S/'&&c.cta==='liq:0');
  await p.evaluate(()=>window.__vz.inst.onresult({results:[[{transcript:'uber doce dólares plin'}]]}));await W(p);c=await card(p);
  T('«uber doce dólares plin» dictado: Uber, $ 12, Plin',c.concepto==='Uber'&&c.monto==='12'&&c.cur==='$'&&c.cta==='liq:1');
  await p.context().close();

  // 10. Inglés
  p=await nueva(b,{lang:'en'});await abrir(p);await frase(p,'uber 12 dólares plin');c=await card(p);
  T('en inglés se traducen las etiquetas («Currency», «Paid from», «Equals»)',/Currency/.test(c.txt)&&/Paid from/.test(c.txt)&&/Equals/.test(c.txt));
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
