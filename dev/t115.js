// t115: cuentas de liquidez más allá de 4: Ajustes lista todas, permite renombrarlas y agregar nuevas (hasta 8) en todos los meses.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const S=JSON.parse(JSON.stringify(demo.S));if(o.quinta){S['2026'][10].liq.push({c:'Interbank',m:900,f:'',k:''});}
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S,cfg:demo.cfg}),K,o.lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const datos=p=>p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));const lens=[];Object.keys(d.S).forEach(y=>d.S[y].forEach(m=>lens.push((m.liq||[]).length)));return{names:d.cfg.liqNames,lens:[...new Set(lens)],nov:d.S['2026'][10].liq.map(r=>r.c+':'+r.m)};},K);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  T('Ajustes muestra las 4 cuentas y el campo para agregar',await p.locator('[id^="nm-l"]').count()===4&&await p.locator('#nm-newl').count()===1);
  await p.fill('#nm-newl','Interbank');await p.click('#nm-addl');await p.waitForTimeout(500);
  T('al agregar «Interbank» aparecen 5 campos',await p.locator('[id^="nm-l"]').count()===5&&(await p.inputValue('#nm-l4'))==='Interbank');
  {const d=await datos(p);T('la cuenta existe en todos los meses (todos con 5) y en la lista de nombres',d.lens.length===1&&d.lens[0]===5&&d.names&&d.names.length===5&&d.names[4]==='Interbank');}
  await p.fill('#nm-l4','Interbank Ahorros');await p.click('#nm-save');await p.waitForTimeout(500);
  {const d=await datos(p);T('renombrar la quinta cambia su nombre en el mes',d.nov[4].startsWith('Interbank Ahorros'));}
  T('«Gastos recurrentes» ofrece también la quinta cuenta',(await p.locator('#rc-src option').allInnerTexts()).includes('Interbank Ahorros'));
  // en el mes aparece y se puede usar
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(800);
  T('en el mes, «Dónde está tu dinero» lista la quinta',/Interbank Ahorros/.test(await p.innerText('.liq-list')));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  // una quinta cuenta agregada con «Editar» en un solo mes: Ajustes la reconoce
  p=await nueva(b,{quinta:true});
  T('si ya hay una quinta en algún mes, Ajustes la muestra',await p.locator('[id^="nm-l"]').count()===5&&(await p.inputValue('#nm-l4'))==='Interbank');
  await p.fill('#nm-newl','Caja');await p.click('#nm-addl');await p.waitForTimeout(500);
  {const d=await datos(p);T('agregar otra la pone en sexta posición en todos los meses (6) sin mover la quinta',d.lens.length===1&&d.lens[0]===6&&d.nov[4].startsWith('Interbank')&&d.nov[5].startsWith('Caja'));}
  // tope de 8
  for(const n of ['A7','A8']){await p.fill('#nm-newl',n);await p.click('#nm-addl');await p.waitForTimeout(400);}
  T('con 8 cuentas el botón de agregar se bloquea',await p.locator('#nm-addl').isDisabled()&&await p.locator('[id^="nm-l"]').count()===8);
  await p.context().close();
  p=await nueva(b,{lang:'en'});T('en inglés se traduce',/Add account/.test(await p.innerText('#nm-addl'))&&/up to 8 money accounts/.test(await p.innerText('#app')));await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
