// t107: Ajustes (índice lateral en escritorio, una tarjeta por tema) y alta inicial en pantalla partida con el recorrido a la vista.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,w,hash,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:w,height:900},isMobile:w<500,hasTouch:w<500,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l,vacio])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');if(!vacio)localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{rec:[{sec:'fij',s:'fij',c:'T107 Colegio',m:350,k:'',src:'liq:0',f:25}],metas:[{n:'Viaje',o:2000}]})}),K,o.lang||'',!!o.vacio]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForTimeout(1000);return p;};
const pos=(p)=>p.evaluate(()=>{const o={};document.querySelectorAll('.ajc').forEach(e=>{const h=(e.querySelector('h3')||{}).textContent||'',r=e.getBoundingClientRect();o[h.trim()]={x:r.x,y:r.y+scrollY,w:r.width,h:r.height};});return o;});
const sinDesborde=p=>p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
const abrirAlta=async(b,w,o)=>{const p=await nueva(b,w,'#resumen',Object.assign({vacio:true},o||{}));await p.waitForSelector('[data-act="alta"]');await p.click('[data-act="alta"]');await p.waitForSelector('#onbox');await p.waitForTimeout(300);return p;};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,1280,'#ajustes');
  await p.waitForSelector('.ajc');const g=await pos(p),N=Object.keys(g);
  T('Ajustes se reparte en tarjetas por tema (al menos 11)',N.length>=11&&['Apariencia','Alertas y fondo de emergencia','Al registrar','Tipo de cambio','Cuentas y tarjetas','Categorías de gastos','Ahorros y metas','Gastos recurrentes','Reportes','Tus datos'].every(n=>N.includes(n)));
  const geo=()=>p.evaluate(()=>{const c=[...document.querySelectorAll(".ajc")].map(e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:r.y,h:r.height,hueco:r.height-e.firstElementChild.offsetHeight};});return{c,n:document.querySelectorAll("[data-ajir]").length,nav:document.querySelector(".ajnav").getBoundingClientRect().right};});
  {const q=await geo();
   T("escritorio: una sola columna, a la derecha del índice",q.c.every(v=>v.x===q.c[0].x&&v.x>q.nav));
   T("ninguna tarjeta se estira (sin huecos) y van en orden",q.c.every(v=>v.hueco<4)&&q.c.every((v,i)=>!i||(v.y-q.c[i-1].y-q.c[i-1].h)<32));
   T("el índice tiene una entrada por tarjeta",q.n===q.c.length);}
  T('todos los controles siguen en su sitio (ids de los formularios)',await p.evaluate(()=>['cf-alerta','cf-meta','cf-meses','tc-e','tc-d','cf-neg','fx-auto','fx-now','nm-save','nc','nc-g','addcat','mn','mobj','rc-c','rc-m','st-on','bk-json','bk-load','hist'].every(i=>document.getElementById(i))&&document.querySelectorAll('input[name="modoreg"]').length===3&&document.querySelectorAll('select[data-catg]').length>=5));
  T('el título «Ajustes» queda arriba y sin tarjeta propia',await p.evaluate(()=>{const h=document.querySelector('.aj-top h1');return !!h&&h.textContent==='Ajustes'&&!h.closest('.ajc');}));
  T('sin desborde horizontal a 1280 px',await sinDesborde(p));
  await p.fill('#cf-alerta','900');await p.waitForTimeout(400);
  T('cambiar un ajuste lo guarda (alerta de cotidianos = 900)',(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg.alerta,K))===900);
  T('sin errores de JavaScript (Ajustes)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await nueva(b,1100,'#ajustes');await p.waitForSelector('.ajc');{const q=await pos(p);const xs=Object.values(q).map(v=>Math.round(v.x));
   T('1100 px: las tarjetas pasan a dos columnas y no hay desborde',new Set(xs).size===2&&await sinDesborde(p));}await p.context().close();
  p=await nueva(b,390,'#ajustes');await p.waitForSelector('.ajc');{const q=await pos(p);const v=Object.values(q);
   T('390 px: una tarjeta debajo de otra, a todo el ancho, sin desborde',v.every(x=>x.w>330)&&v.every((x,i)=>i===0||x.y>=v[i-1].y+v[i-1].h-2)&&await sinDesborde(p));}await p.context().close();
  p=await nueva(b,1280,'#ajustes',{lang:'en'});await p.waitForSelector('.ajc');
  T('en inglés se traducen los títulos («Appearance», «Exchange rate»)',/Appearance/.test(await p.innerText('.ajboard'))&&/Exchange rate/.test(await p.innerText('.ajboard')));await p.context().close();

  // Índice lateral
  const estado=(q,i)=>q.evaluate(i=>{const c=document.querySelectorAll(".ajc")[i],h=document.getElementById("hdr").getBoundingClientRect().bottom,r=c.getBoundingClientRect(),a=document.querySelector("[data-ajir][aria-current]");return{hash:location.hash,top:r.top-h,visible:r.top<innerHeight&&r.bottom>h,actual:a?+a.dataset.ajir:-1,foco:document.activeElement===c.querySelector("h3")};},i);
  for(const w of [1101,1200,1366,1920]){p=await nueva(b,w,"#ajustes");await p.setViewportSize({width:w,height:650});await p.waitForSelector(".ajc");await p.waitForTimeout(300);
    await p.click("[data-ajir=\"4\"]");await p.waitForTimeout(900);const e=await estado(p,4);
    T(w+" px: el índice lleva a la sección, justo bajo el encabezado, sin cambiar la ruta",e.hash==="#ajustes"&&e.top>=0&&e.top<40&&e.actual===4&&e.foco);
    T(w+" px: con la página bajada el índice entero se ve",await p.evaluate(()=>{const n=document.querySelector(".ajnav"),r=n.getBoundingClientRect();return n.scrollHeight<=n.clientHeight+1&&r.top>=document.getElementById("hdr").getBoundingClientRect().bottom&&r.bottom<=innerHeight;}));
    T(w+" px: sin desborde",await sinDesborde(p));await p.context().close();}
  p=await nueva(b,1366,"#ajustes");await p.setViewportSize({width:1366,height:650});await p.waitForSelector(".ajc");await p.waitForTimeout(300);
  {const n=await p.locator("[data-ajir]").count();
   for(const j of [n-1,n-3]){await p.click("[data-ajir=\""+j+"\"]");await p.waitForTimeout(900);const e=await estado(p,j);T("las últimas secciones quedan marcadas aunque no lleguen arriba ("+j+")",e.actual===j&&e.visible);}
   await p.mouse.move(700,400);await p.mouse.wheel(0,-9000);await p.waitForTimeout(500);T("al desplazarse a mano, el índice sigue a la vista",(await estado(p,0)).actual===0);
   await p.mouse.wheel(0,1500);await p.waitForTimeout(500);const m=(await estado(p,0)).actual;T("a media página marca una sección intermedia",m>0&&m<n-1);
   await p.mouse.wheel(0,9000);await p.waitForTimeout(500);T("al final de la página marca la última",(await estado(p,n-1)).actual===n-1);
   await p.focus("[data-ajir=\"2\"]");await p.keyboard.press("Enter");await p.waitForTimeout(900);const k=await estado(p,2);T("con teclado (Enter) también lleva y deja el foco en el título",k.actual===2&&k.foco);
   await p.click("[data-ajir=\"0\"]");await p.waitForTimeout(900);await p.click("[data-skin-set=\"escalon\"]");await p.waitForTimeout(500);T("al cambiar de estilo se redibuja y el índice sigue marcado",await p.locator("[data-ajir]").count()===n&&(await estado(p,0)).actual===0);}
  T("sin errores de JavaScript (índice)",p.errs.length===0);await p.context().close();
  for(const w of [1100,390]){p=await nueva(b,w,"#ajustes");await p.waitForSelector(".ajc");T(w+" px: sin índice, como antes",!(await p.locator(".ajnav").isVisible()));await p.context().close();}
  p=await nueva(b,1366,"#ajustes",{lang:"en"});await p.waitForSelector(".ajc");await p.waitForTimeout(400);
  {const x=await p.innerText(".ajnav");T("en inglés el índice se traduce",/Appearance/.test(x)&&/Exchange rate/.test(x)&&!/Apariencia|Tipo de cambio|Reportes|Cuentas|Privacidad|Dónde|Al registrar/.test(x)&&await p.getAttribute(".ajnav","aria-label")==="Settings sections");if(/Apariencia|Reportes|Cuentas|Dónde/.test(x))console.log(x);}await p.context().close();

  // Alta inicial
  p=await abrirAlta(b,1280);
  T('alta en escritorio: panel de marca con el recorrido a la izquierda y el paso a la derecha',await p.locator('.authbg.split .obside').isVisible()&&await p.locator('.obsteps li').count()===5&&/Paso 1 de 5/.test(await p.innerText('#onbox')));
  T('el recorrido marca el paso actual («Tus cuentas»)',/Tus cuentas/.test(await p.innerText('.obsteps li.on')));
  T('en el formulario ya no se repite el logo (está en el panel)',!(await p.locator('#onbox>.authlogo').isVisible()));
  await p.click('#ob-go');await p.waitForTimeout(300);
  T('al avanzar, el paso 1 queda con ✓ y el activo pasa a «Saldos de hoy»',/✓/.test(await p.innerText('.obsteps li.done'))&&/Saldos de hoy/.test(await p.innerText('.obsteps li.on')));
  await p.click('#ob-skip');await p.waitForTimeout(400);
  T('«Terminar aquí» sigue cerrando el asistente',await p.locator('#onbg').count()===0);
  await p.context().close();
  p=await abrirAlta(b,390);
  T('alta en celular: sin panel de marca; el formulario ocupa la pantalla',!(await p.locator('.obside').isVisible())&&await p.locator('#onbox').isVisible());await p.context().close();
  p=await abrirAlta(b,1280,{lang:'en'});
  T('alta en inglés: se traduce el panel («Your accounts»)',/Your accounts/.test(await p.innerText('.obsteps')));await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
