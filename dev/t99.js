// t99: Automático más listo. Entiende números en palabras («veinticinco», «treinta y cinco»), «lucas» (en Perú son soles), «dos mil»,
// «ayer / anteayer», dólares, y varios gastos en una sola frase («almuerzo 25 y taxi 12»).
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,cfgExtra,lang,fecha)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date(fecha||'2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(250);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="auto"]');await W(p);};
const frase=async(p,t)=>{await p.fill('#smsg','');await p.fill('#smsg',t);await W(p);};
const campos=p=>p.evaluate(()=>({a:document.getElementById('sa').value,d:document.getElementById('sd').value,prev:document.getElementById('sapv').innerText,btn:document.querySelector('#sheet [data-s="save"]').textContent.trim(),dis:document.querySelector('#sheet [data-s="save"]').disabled,mo:document.getElementById('smo').value,day:document.getElementById('sday').value,cur:document.getElementById('scur').textContent.trim()}));
const filas=(p,pref)=>p.evaluate(([k,pref])=>{const s=JSON.parse(localStorage.getItem(k)).S;return Object.keys(s).flatMap(y=>s[y].flatMap((m,i)=>[].concat(m.hor,m.fij).filter(r=>(r.c||'').indexOf(pref)===0).map(r=>({c:r.c,m:r.m,f:r.f,src:r.src,mes:i,y,cur:r.cur||''}))));},[K,pref]);
const liq=(p,i)=>p.evaluate(([k,i])=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[i].m,[K,i]);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);await abrir(p);let c;
  // 1. Números en palabras
  await frase(p,'almuerzo veinticinco yape');c=await campos(p);
  T('«veinticinco» se entiende como 25 y la cuenta Yape',c.a==='25'&&/Almuerzo/.test(c.d)&&/Yape/.test(c.prev));
  await frase(p,'taxi treinta y cinco plin');c=await campos(p);T('«treinta y cinco» = 35',c.a==='35'&&/Taxi/.test(c.d)&&/Plin/.test(c.prev));
  await frase(p,'regalo ciento veinte');c=await campos(p);T('«ciento veinte» = 120',c.a==='120');
  await frase(p,'cena dos mil');c=await campos(p);T('«dos mil» = 2000',c.a==='2000');
  await frase(p,'laptop 2 mil');c=await campos(p);T('«2 mil» = 2000',c.a==='2000');
  await frase(p,'curso mil quinientos');c=await campos(p);T('«mil quinientos» = 1500',c.a==='1500');
  // 2. «lucas» son soles (no miles)
  await frase(p,'pan 5 lucas');c=await campos(p);T('«5 lucas» = S/ 5 (en Perú una luca es un sol) y no queda «lucas» en el nombre',c.a==='5'&&c.d==='Pan');
  await frase(p,'chicles una luca');c=await campos(p);T('«una luca» = 1',c.a==='1'&&/Chicles/.test(c.d));
  await frase(p,'menú diez soles');c=await campos(p);T('«diez soles» = 10 y «soles» no queda en el nombre',c.a==='10'&&c.d==='Menú');
  // 3. Palabras que no son números
  await frase(p,'un taxi 12');c=await campos(p);T('«un» suelto no es número: «un taxi 12» = 12',c.a==='12'&&/taxi/i.test(c.d));
  await frase(p,'once 25');c=await campos(p);T('«once» (la comida) no se vuelve 11',c.a==='25'&&/Once/.test(c.d));
  // 4. Lo de siempre sigue igual
  await frase(p,'sueldo 3000');c=await campos(p);T('«sueldo 3000» sigue siendo un ingreso',c.a==='3000'&&/Ingreso/.test(c.prev));
  await frase(p,'almuerzo 1,200.50');c=await campos(p);T('montos con coma y decimales siguen igual',c.a==='1200.5');
  // 5. Moneda
  await frase(p,'almuerzo 10 dólares');c=await campos(p);T('«dólares» pone el monto en $',c.a==='10'&&c.cur==='$'&&!/dólares/i.test(c.d));
  await frase(p,'almuerzo 10');c=await campos(p);T('al quitar «dólares» vuelve a soles',c.cur==='S/');
  T('sin errores de JavaScript (palabras)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 6. Ayer y anteayer
  p=await nueva(b);await abrir(p);
  await frase(p,'ayer taxi 12 yape');c=await campos(p);
  T('«ayer» pone la fecha de ayer (16) y la tarjeta lo dice',c.day==='16'&&c.mo==='10'&&/Ayer/.test(c.prev)&&c.d==='Taxi');
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  {const f=(await filas(p,'Taxi')).filter(x=>/^16-nov/.test(x.f||''));T('el gasto se guarda con la fecha de ayer',f.length===1&&f[0].mes===10&&f[0].m===12);}
  await p.context().close();
  p=await nueva(b);await abrir(p);await frase(p,'anteayer taxi 12 yape');c=await campos(p);T('«anteayer» = día 15',c.day==='15'&&/Anteayer/.test(c.prev));
  await frase(p,'taxi 12 yape');c=await campos(p);T('al quitar «anteayer» vuelve a hoy (17)',c.day==='17'&&!/Anteayer/.test(c.prev));
  await p.context().close();
  p=await nueva(b,null,null,'2026-12-01T10:00:00-05:00');await abrir(p);await frase(p,'ayer taxi 12 yape');c=await campos(p);
  T('el 1 de diciembre, «ayer» es el 30 de noviembre',c.day==='30'&&c.mo==='10');
  await p.context().close();

  // 7. Varios gastos en una frase
  p=await nueva(b);await abrir(p);
  await frase(p,'almuerzo 25 y taxi 12 yape');c=await campos(p);
  T('«almuerzo 25 y taxi 12 yape» se separa en dos gastos con su total y cuenta',/Se guardarán 2 gastos/.test(c.prev)&&/Almuerzo/.test(c.prev)&&/Taxi/.test(c.prev)&&/37\.00/.test(c.prev)&&c.btn==='Guardar 2 gastos');
  const y0=await liq(p,0);
  await p.click('[data-s="save"]');await p.waitForTimeout(500);
  {const f=await filas(p,'Almuerzo');const g=await filas(p,'Taxi');T('al guardar se crean los dos movimientos y se descuentan de Yape (37)',f.some(x=>x.m===25&&x.src==='liq:0')&&g.some(x=>x.m===12&&x.src==='liq:0'));}
  T('el saldo de Yape bajó 37 en total',Math.abs(y0-37-(await liq(p,0)))<0.005);
  await p.evaluate(()=>{const b=document.querySelector('#toast button');if(b)b.click();});await p.waitForTimeout(400);
  T('Deshacer revierte los dos y devuelve el saldo',Math.abs(y0-(await liq(p,0)))<0.005);
  T('sin errores de JavaScript (varios)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await nueva(b);await abrir(p);await frase(p,'pan y queso 25 y taxi 12 plin');c=await campos(p);
  T('«y» dentro de un nombre no corta («Pan y queso») y el nombre del segundo es Taxi',/Se guardarán 2 gastos/.test(c.prev)&&/Pan y queso/.test(c.prev)&&/Taxi/.test(c.prev));
  await frase(p,'25 pan, 12 taxi yape');c=await campos(p);T('también con la coma y el monto primero',/Se guardarán 2 gastos/.test(c.prev));
  await frase(p,'almuerzo 25 yape y taxi 12 plin');c=await campos(p);T('cada gasto con su cuenta',/Yape/.test(c.prev)&&/Plin/.test(c.prev));
  await frase(p,'almuerzo 25');c=await campos(p);T('con un solo monto no es «varios»',!/Se guardarán/.test(c.prev)&&c.btn==='Guardar');
  await frase(p,'sueldo 3000 y ahorro 100');c=await campos(p);T('un ingreso y un ahorro no se mezclan: solo el primero (comportamiento de siempre)',!/Se guardarán/.test(c.prev));
  await p.context().close();

  // 8. Saldo con varios gastos (Plin tiene 130)
  p=await nueva(b);await abrir(p);await frase(p,'cena 100 y taxi 50 plin');c=await campos(p);
  T('si la cuenta no alcanza para todos, avisa y el botón dice «Guardar igual»',/No te alcanza el saldo/.test(c.prev)&&/Plin/.test(c.prev)&&c.btn==='Guardar igual'&&!c.dis);
  await p.context().close();
  p=await nueva(b,{bloquearNeg:true});await abrir(p);await frase(p,'cena 100 y taxi 50 plin');c=await campos(p);
  T('con «No permitir negativo» el botón queda desactivado',c.dis===true);
  await p.context().close();

  // 9. Sin cuenta: se pide al pasar a manual
  p=await nueva(b);await abrir(p);await frase(p,'almuerzo 25 y taxi 12');c=await campos(p);
  T('sin cuenta dicha ni usada antes, la tarjeta ofrece elegir la cuenta de los que no la dicen',/Cuenta de los que no la dicen/.test(c.prev)&&/Elige la cuenta/.test(c.prev));
  await p.click('[data-s="save"]');await W(p);
  T('al guardar sin elegir cuenta se queda en Automático y lo avisa (no pasa a manual ni guarda)',await p.getAttribute('#sheet','data-mode')==='auto'&&/Elige de qué cuenta sale/.test(await p.innerText('#sheet')));
  await p.click('#sapv [data-aacct="liq:0"]');await W(p);await p.click('[data-s="save"]');await p.waitForTimeout(450);
  T('al elegir la cuenta con una ficha, se guardan los dos gastos',(await filas(p,'Almuerzo')).some(x=>x.src==='liq:0')&&(await filas(p,'Taxi')).some(x=>x.src==='liq:0'));
  await p.context().close();

  // 10. Inglés
  p=await nueva(b,null,'en');await abrir(p);await frase(p,'almuerzo 25 y taxi 12 yape');c=await campos(p);
  T('en inglés se traduce («2 expenses will be saved», «Save 2 expenses»)',/2 expenses will be saved/.test(c.prev)&&c.btn==='Save 2 expenses');
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
