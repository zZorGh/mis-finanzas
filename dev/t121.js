// t121: Cierre del mes. Cuándo se ve, cifras, sugerencia, franja del mes siguiente, cambio de año, inglés y celular.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const vacio=()=>{const o=JSON.parse(JSON.stringify(demo.S['2026'][10]));['ing','fij','hor','bbva','bcp','oh','aho','inv','eur'].forEach(k=>{o[k]=[];});o.copen={};o.liq=(o.liq||[]).map(r=>Object.assign({},r,{m:1000}));return o;};
const fila=(c,m,k,x)=>Object.assign({c,m,f:'5-nov',k:k||''},x||{});
const datos=(mod,extra)=>{const S=JSON.parse(JSON.stringify(demo.S));S['2026']=S['2026'].map(()=>vacio());S['2025']=(S['2025']||Array.from({length:12},vacio)).map(()=>vacio());if(mod)mod(S);return JSON.stringify({v:1,S,cfg:Object.assign({},demo.cfg,{onb:1,meta:20,ahoV:3},extra||{})});};
const base=S=>{const o=S['2026'][9],n=S['2026'][10];o.ing=[fila('Sueldo',3000)];o.fij=[fila('Alquiler',800,'Vivienda')];o.hor=[fila('Menú',200,'Comida')];n.ing=[fila('Sueldo',3000)];n.fij=[fila('Alquiler',800,'Vivienda')];n.hor=[fila('Menú',400,'Comida')];n.aho=[fila('Fondo',900,'',{t:'dep'})];};
(async()=>{
 const b=await chromium.launch();
 const abrir=async(fecha,json,hash,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:o.w||1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date(fecha+'T15:00:00-05:00'));
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await ctx.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}window.__x=()=>{window.__hit=1;};},[json,K,o.lang||'']);
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.q||'')+hash);await p.waitForSelector('#board');await p.waitForTimeout(350);return p;};
 const card=p=>p.locator('[data-cid="cie"]');const txt=async p=>(await card(p).count())?(await card(p).innerText()):'';const fin=async p=>{T('sin errores de JS',!p.errs.length);await p.context().close();};
 // 1. Cuándo se ve
 let p=await abrir('2026-11-15',datos(base),'#noviembre');T('1 a mitad de mes no aparece',!(await card(p).count()));await fin(p);
 p=await abrir('2026-11-15',datos(base),'#diciembre');T('1 un mes futuro no lo muestra',!(await card(p).count()));await fin(p);
 p=await abrir('2026-11-15',datos(base),'#marzo');T('1 un mes pasado sin datos no lo muestra',!(await card(p).count()));await fin(p);
 p=await abrir('2026-11-28',datos(base),'#noviembre');let x=await txt(p);T('1 en los últimos 3 días aparece como avance',/Así va tu cierre de noviembre/i.test(x)&&/Faltan 2 días/.test(x));await fin(p);
 p=await abrir('2026-11-27',datos(base),'#noviembre');T('1 cuatro días antes todavía no',!(await card(p).count()));await fin(p);
 // 2. Cifras y comparación
 p=await abrir('2026-12-10',datos(base),'#noviembre');x=await txt(p);
 T('2 título de mes cerrado',/Cierre de noviembre/i.test(x)&&!/Faltan/.test(x));T('2 entró',/S\/ 3,000\.00/.test(x));T('2 salió',/S\/ 1,200\.00/.test(x));
 T('2 compara con octubre',/20% más que en octubre \(S\/ 1,000\.00\)/.test(x));T('2 ahorro y porcentaje',/S\/ 900\.00/.test(x)&&/30% de tu ingreso/.test(x));T('2 mayor gasto',/Vivienda/.test(x)&&/67% de tus gastos/.test(x));
 T('2 sugerencia concreta',/fue el 67% de tus gastos/.test(x));await fin(p);
 // 3. Una sola sugerencia, por prioridad
 const idea=async(mod,cfgx,re,n)=>{const q=await abrir('2026-12-10',datos(S=>{base(S);mod(S['2026'][10]);},cfgx),'#noviembre');const s=await q.locator('.ciesug span').innerText();T('3 '+n,re.test(s));await fin(q);};
 await idea(m=>{m.ing=[];},null,/No registraste ingresos/,'sin ingresos');
 await idea(m=>{m.fij=[fila('Alquiler',4000,'Vivienda')];},null,/Gastaste S\/ 1,400\.00 más.*Vivienda/,'gastó más de lo que entró');
 await idea(m=>{m.bbva=[fila('Tienda',250)];},null,/debiendo S\/ 250\.00/,'deuda de tarjeta');
 await idea(m=>{m.aho=[fila('Fondo',150,'',{t:'dep'})];},null,/Ahorraste el 5%.*meta es 20%.*S\/ 450\.00/,'bajo la meta');
 await idea(m=>{m.fij=[fila('Luz',100,'Casa'),fila('Agua',100,'Agua')];m.hor=[fila('Café',50,'Café',{t:'ant',v:0}),fila('Menú',100,'Comida')];},null,/antojos.*S\/ 50\.00/,'antojo que no valió');
 await idea(m=>{m.fij=[fila('Luz',100,'Casa'),fila('Agua',100,'Agua'),fila('Gas',100,'Gas')];m.hor=[fila('Bus',100,'Bus')];},null,/Buen mes/,'buen mes');
 // 4. Franja del mes siguiente
 p=await abrir('2026-12-03',datos(base),'#diciembre');T('4 aparece la franja',/Noviembre ya cerró/.test(await p.locator('.ciebar').innerText()));
 await p.click('[data-cieir]');await p.waitForTimeout(400);T('4 lleva al cierre',/Cierre de noviembre/i.test(await txt(p))&&(await p.evaluate(()=>location.hash))==='#noviembre');
 await p.evaluate(()=>{location.hash='#diciembre';});await p.waitForTimeout(350);T('4 ya vista, no vuelve',!(await p.locator('.ciebar').count()));await fin(p);
 p=await abrir('2026-12-03',datos(base),'#diciembre');await p.click('[data-ciex]');await p.waitForTimeout(150);T('4 «Ahora no» la quita',!(await p.locator('.ciebar').count()));await p.reload();await p.waitForSelector('#board');await p.waitForTimeout(300);T('4 y sigue quitada al recargar',!(await p.locator('.ciebar').count()));await fin(p);
 p=await abrir('2026-12-08',datos(base),'#diciembre');T('4 después del día 7 no aparece',!(await p.locator('.ciebar').count()));await fin(p);
 // 5. Cambio de año
 p=await abrir('2026-01-04',datos(S=>{S['2025'][11].ing=[fila('Sueldo',2500)];S['2025'][11].fij=[fila('Luz',100,'Casa')];}),'#enero');T('5 enero ofrece diciembre',/Diciembre ya cerró/.test(await p.locator('.ciebar').innerText()));
 await p.click('[data-cieir]');await p.waitForTimeout(450);x=await txt(p);T('5 abre diciembre del año anterior',/Cierre de diciembre/i.test(x)&&/S\/ 2,500\.00/.test(x)&&(await p.evaluate(()=>document.getElementById('yr')&&document.getElementById('yr').value))==='2025');await fin(p);
 // 6. Texto de la persona no se ejecuta
 p=await abrir('2026-12-10',datos(S=>{base(S);S['2026'][10].fij=[fila('X',4000,'<img src=x onerror=__x()>')];}),'#noviembre');await p.waitForTimeout(200);T('6 categoría maliciosa no se ejecuta',!(await p.evaluate(()=>window.__hit))&&!(await card(p).locator('img').count()));await fin(p);
 // 7. Inglés
 p=await abrir('2026-12-03',datos(base),'#diciembre',{lang:'en'});T('7 franja en inglés',/November has closed/.test(await p.locator('.ciebar').innerText()));await p.click('[data-cieir]');await p.waitForTimeout(450);x=await txt(p);
 T('7 tarjeta en inglés',/Came in/.test(x)&&/Went out/.test(x)&&/You saved/.test(x)&&/An idea for next month/.test(x));T('7 sin español suelto',!/Entró|Salió|Ahorraste|de tus gastos|% más que|% de tu ingreso|Una idea/.test(x));await fin(p);
 // 8. Celular: pestaña Resumen, sin desborde
 p=await abrir('2026-12-10',datos(base),'#noviembre',{w:360,q:'?tabs=on'});await p.evaluate(()=>{const t=document.querySelector('#mtabs [data-mtab="resumen"]');if(t)t.click();});await p.waitForTimeout(250);
 T('8 se ve en la pestaña Resumen',await card(p).isVisible());T('8 sin desborde a 360 px',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.evaluate(()=>{const t=document.querySelector('#mtabs [data-mtab="mov"]');if(t)t.click();});await p.waitForTimeout(200);T('8 no aparece en Movimientos',!(await card(p).isVisible()));await fin(p);
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
