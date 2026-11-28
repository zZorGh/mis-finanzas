// t104: pantalla del mes en celular con pestañas (Resumen · Movimientos · Tarjetas · Ahorro · Análisis · Todo).
// Antes eran ~9 pantallas de scroll; ahora cada pestaña muestra solo sus tarjetas. En escritorio no cambia nada. Se abre con ?tabs=on
// porque el esqueleto de pruebas arranca en «Todo» para no alterar las demás pruebas.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const REC=[{sec:'fij',s:'fij',c:'T104 Colegio',m:350,k:'',src:'liq:0',f:25}];
const nueva=async(b,o)=>{o=o||{};const w=o.w||390;const ctx=await b.newContext({viewport:{width:w,height:o.h||844},isMobile:w<500,hasTouch:w<500,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l,tab])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);if(tab)localStorage.setItem(k+'-tab',tab);}},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{rec:REC})}),K,o.lang||'',o.tab||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.sinTabs?'':'?tabs=on')+'#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(300);
const vis=(p,s)=>p.locator(s).first().isVisible();
const visibles=(p,ids)=>p.evaluate(ids=>ids.map(i=>{const e=i==='pp'?document.querySelector('.ppcard'):document.querySelector('[data-cid="'+i+'"]');return !!e&&e.offsetParent!==null;}),ids);
const todas=['mk','pre','dg','ing','fij','hor','bbva','bcp','oh','aho','inv','mc1','mc2','mc3','hm1','tcm','eur'];
const solo=async(p,grupo)=>{const v=await visibles(p,todas);return todas.every((id,i)=>v[i]===grupo.includes(id));};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  T('en el celular hay una barra con 6 pestañas',await vis(p,'#mtabs')&&await p.locator('#mtabs button').count()===6);
  T('por defecto abre en «Resumen» y solo ese está marcado',(await p.getAttribute('#mtabs [aria-current]','data-mtab'))==='resumen'&&await p.locator('#mtabs [aria-current]').count()===1);
  T('Resumen muestra KPIs, Presupuesto, «¿Dónde gastas más?» y «Por pagar»; nada más',await solo(p,['mk','pre','dg'])&&(await visibles(p,['pp']))[0]===true);
  T('el encabezado del mes se ve en todas las pestañas (hero con «Tienes disponible»)',/Tienes disponible/.test(await p.innerText('#app')));
  T('las pestañas se ven en la primera pantalla, sin bajar (arriba del todo)',await p.evaluate(()=>{const r=document.getElementById('mtabs').getBoundingClientRect();return r.top<260&&r.bottom<400;}));
  T('en «Resumen» el encabezado va completo (con «Dónde está tu dinero»)',await vis(p,'.hero .liq')&&await vis(p,'.hero .hbud'));
  await p.click('#mtabs [data-mtab="mov"]');await W(p);
  T('en las otras pestañas el encabezado se compacta (mes y «Tienes disponible», sin el panel de cuentas)',await vis(p,'.hero h1')&&/Tienes disponible/.test(await p.innerText('.hero'))&&!(await vis(p,'.hero .liq'))&&!(await vis(p,'.hero .hbud')));
  T('Movimientos: ingresos, fijos y cotidianos',await solo(p,['ing','fij','hor'])&&!(await visibles(p,['pp']))[0]);
  await p.click('#mtabs [data-mtab="tar"]');await W(p);T('Tarjetas: BBVA, BCP y oh!',await solo(p,['bbva','bcp','oh']));
  await p.click('#mtabs [data-mtab="aho"]');await W(p);T('Ahorro: ahorros e inversiones',await solo(p,['aho','inv']));
  await p.click('#mtabs [data-mtab="ana"]');await W(p);await p.waitForTimeout(700);
  T('Análisis: gráficos, gasto por día, tipo de cambio y apuntes',await solo(p,['mc1','mc2','mc3','hm1','tcm','eur']));
  T('los gráficos se dibujan al mostrarse (tienen tamaño)',await p.evaluate(()=>['mc1','mc2','mc3'].every(id=>{const c=document.getElementById(id);return c&&c.clientWidth>50&&c.clientHeight>50;})));
  await p.click('#mtabs [data-mtab="todo"]');await W(p);
  T('Todo: muestra todas las tarjetas, como la pantalla larga de siempre',(await visibles(p,todas)).every(Boolean));
  T('en «Todo» la página vuelve a ser larga (más de 4,000 px) y en «Resumen» es corta (menos de 3,000 px)',await p.evaluate(()=>document.documentElement.scrollHeight)>4000);
  await p.click('#mtabs [data-mtab="resumen"]');await W(p);
  T('en «Resumen» la página es corta (menos de 3,000 px; con la tarjeta de avisos y la de «Tu semana» suman ≈330 px)',await p.evaluate(()=>document.documentElement.scrollHeight)<3000);

  // Recordar la pestaña y mantenerla al cambiar de mes y al guardar
  await p.click('#mtabs [data-mtab="mov"]');await W(p);
  await p.evaluate(()=>{location.hash='#octubre';});await p.waitForTimeout(700);
  T('al cambiar de mes se queda en la misma pestaña',(await p.getAttribute('#mtabs [aria-current]','data-mtab'))==='mov'&&await solo(p,['ing','fij','hor']));
  await p.evaluate(()=>{location.hash='#noviembre';});await p.waitForTimeout(700);
  await p.click('[data-cid="hor"] [data-new="hor"]');await p.waitForSelector('#sheet');await p.waitForTimeout(200);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','cafecito 7 yape');await W(p);await p.click('[data-s="save"]');await p.waitForTimeout(500);
  T('registrar un gasto desde Movimientos mantiene la pestaña y lo muestra',(await p.getAttribute('#mtabs [aria-current]','data-mtab'))==='mov'&&/Cafecito/i.test(await p.innerText('[data-cid="hor"]')));
  await p.reload();await p.waitForSelector('#mtabs');await p.waitForTimeout(700);
  T('al recargar recuerda la pestaña',(await p.getAttribute('#mtabs [aria-current]','data-mtab'))==='mov');

  // La barra se queda pegada y al cambiar de pestaña vuelve al inicio del contenido
  await p.evaluate(()=>scrollTo(0,1500));await W(p);
  T('al bajar, la barra de pestañas queda pegada debajo del encabezado',await p.evaluate(()=>{const r=document.getElementById('mtabs').getBoundingClientRect(),h=document.getElementById('hdr').getBoundingClientRect().bottom;return Math.abs(r.top-h)<=20;}));
  await p.click('#mtabs [data-mtab="tar"]');await W(p);
  T('al cambiar de pestaña estando abajo, sube al inicio del contenido (no se queda a media página)',await p.evaluate(()=>scrollY)<900);
  T('las pestañas son tocables (altura ≥ 44 px)',await p.evaluate(()=>[...document.querySelectorAll('#mtabs button')].every(b=>b.getBoundingClientRect().height>=44)));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // Esqueleto de pruebas: sin ?tabs=on arranca en «Todo»
  p=await nueva(b,{sinTabs:true});
  T('el esqueleto de pruebas arranca en «Todo» (así las demás pruebas ven todo)',(await p.getAttribute('#mtabs [aria-current]','data-mtab'))==='todo'&&(await visibles(p,todas)).every(Boolean));
  await p.context().close();

  // Escritorio: no hay barra y se ven todas las tarjetas aunque haya una pestaña guardada
  p=await nueva(b,{w:1280,h:900,tab:'tar'});
  T('en escritorio no hay barra de pestañas y se ven todas las tarjetas',!(await vis(p,'#mtabs'))&&(await visibles(p,todas)).every(Boolean));
  await p.context().close();

  // Valor guardado inválido → Resumen
  p=await nueva(b,{tab:'raro'});
  T('una pestaña guardada que no existe se trata como «Resumen»',(await p.getAttribute('#mtabs [aria-current]','data-mtab'))==='resumen');
  await p.context().close();

  // Inglés
  p=await nueva(b,{lang:'en'});
  {const x=await p.innerText('#mtabs');T('en inglés se traducen las pestañas',/Summary/.test(x)&&/Transactions/.test(x)&&/Cards/.test(x)&&/Savings/.test(x)&&/Analysis/.test(x)&&/All/.test(x));}
  await p.context().close();

  // Fuera de Resumen el contenido empieza arriba: encabezado de una línea y sin «Para tener en cuenta»
  {const q=await (await b.newContext({viewport:{width:390,height:760},isMobile:true,hasTouch:true})).newPage();
   await q.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765')?r.continue():r.abort());
   await q.addInitScript(([d,k])=>{localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');},[JSON.stringify({v:1,S:require('./demo.json').S,cfg:Object.assign({},require('./demo.json').cfg,{onb:1})}),'mis-finanzas-prototipo-v1']);
   await q.goto('http://127.0.0.1:8765/wrap-repo.html?tabs=on#noviembre');await q.waitForSelector('#mtabs');await q.waitForTimeout(600);
   const ve=s=>q.evaluate(s=>[...document.querySelectorAll(s)].some(e=>e.getClientRects().length),s);
   T('el aviso se ve en «Resumen»',await ve('#app .avcard'));
   for(const id of ['mov','tar','aho','ana']){await q.click('#mtabs [data-mtab="'+id+'"]');await q.waitForTimeout(500);
     const m=await q.evaluate(()=>{scrollTo(0,0);const c=[...document.querySelectorAll('#app .board .bcard')].find(e=>e.getClientRects().length),h=document.querySelector('#app .hero'),v=h.querySelector('.hero-v');return{y:Math.round(c.getBoundingClientRect().top),alto:Math.round(h.getBoundingClientRect().height),cabe:v.scrollWidth<=v.clientWidth+1,desb:document.documentElement.scrollWidth-innerWidth};});
     T(id+': el primer contenido empieza antes de 320 px ('+m.y+'), con encabezado de una línea ('+m.alto+')',m.y<320&&m.alto<90&&m.cabe&&m.desb<=0);
     T(id+': sin el aviso, con el mes y el disponible a la vista',!(await ve('#app .avcard'))&&await ve('#app .hero h1')&&/Tienes disponible/.test(await q.innerText('#app .hero')));}
   await q.click('#mtabs [data-mtab="todo"]');await q.waitForTimeout(400);T('el aviso vuelve en «Todo»',await ve('#app .avcard'));
   await q.context().close();}
  // Un saldo de cinco cifras cabe en la misma línea en un celular angosto
  {const q=await (await b.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true})).newPage();await q.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765')?r.continue():r.abort());
   const d=require('./demo.json'),S=JSON.parse(JSON.stringify(d.S));S['2026'][8].liq[0].c='Yape';S['2026'][8].liq[0].m=12345.67;
   await q.addInitScript(([x,k])=>{localStorage.setItem(k,x);localStorage.setItem(k+'-instalar','1');localStorage.setItem(k+'-tab','mov');},[JSON.stringify({v:1,S,cfg:Object.assign({},d.cfg,{onb:1})}),'mis-finanzas-prototipo-v1']);
   await q.goto('http://127.0.0.1:8765/wrap-repo.html?tabs=on#septiembre');await q.waitForSelector('#mtabs');await q.waitForTimeout(800);
   const h=await q.evaluate(()=>Math.round(document.querySelector('#app .hero').getBoundingClientRect().height));T('360 px: «Septiembre» y cinco cifras en una línea ('+h+')',h<90);await q.context().close();}
  // Punto de aviso en «Resumen»
  for(const [caso,rec,hoy,esperado] of [['con aviso',null,'',true],['avisos entendidos y nada vencido',null,'22-nov',false],['recurrente vencido',[{sec:'fij',s:'fij',c:'T104 Luz',m:50,k:'',src:'liq:0',f:5}],'22-nov',true],['recurrente para más adelante',[{sec:'fij',s:'fij',c:'T104 Agua',m:50,k:'',src:'liq:0',f:29}],'22-nov',false]]){
   const q=await (await b.newContext({viewport:{width:390,height:760},isMobile:true,hasTouch:true,timezoneId:'America/Lima'})).newPage();await q.context().clock.setFixedTime(new Date('2026-11-22T12:00:00-05:00'));
   await q.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765')?r.continue():r.abort());
   const d=require('./demo.json');
   await q.addInitScript(([x,k,h])=>{localStorage.setItem(k,x);localStorage.setItem(k+'-instalar','1');localStorage.setItem(k+'-tab','mov');if(h)localStorage.setItem(k+'-avisos',h);},[JSON.stringify({v:1,S:d.S,cfg:Object.assign({},d.cfg,{onb:1},rec?{rec}:{rec:[]})}),'mis-finanzas-prototipo-v1',hoy]);
   await q.goto('http://127.0.0.1:8765/wrap-repo.html?tabs=on#noviembre');await q.waitForSelector('#mtabs');await q.waitForTimeout(700);
   T('punto: '+caso+' → '+(esperado?'se ve':'no se ve'),await q.locator('#mtabs .mdot').isVisible()===esperado);
   if(caso==='con aviso'){T('punto: el lector de pantalla lo dice',/hay avisos/.test(await q.locator('#mtabs [data-mtab="resumen"]').innerText()));
     await q.click('#mtabs [data-mtab="resumen"]');await q.waitForTimeout(400);await q.click('#app [data-avx]');await q.waitForTimeout(500);T('punto: «Entendido por hoy» lo apaga',!(await q.locator('#mtabs .mdot').isVisible()));}
   await q.context().close();}
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
