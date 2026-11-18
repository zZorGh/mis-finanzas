// t107: Ajustes en bento (una tarjeta por tema) y alta inicial en pantalla partida con el recorrido a la vista.
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
  const fila=(...n)=>n.every(x=>Math.abs(g[x].y-g[n[0]].y)<4);
  T('fila 1: Apariencia, Alertas y Al registrar, tres iguales',fila('Apariencia','Alertas y fondo de emergencia','Al registrar')&&Math.abs(g['Apariencia'].w-g['Al registrar'].w)<4);
  T('fila 2: Tipo de cambio y Cuentas y tarjetas, mitad y mitad',fila('Tipo de cambio','Cuentas y tarjetas')&&Math.abs(g['Tipo de cambio'].w-g['Cuentas y tarjetas'].w)<4);
  {const c=g['Categorías de gastos'],a=g['Ahorros y metas'],r=g['Gastos recurrentes'];
   T('Categorías (alta) ocupa dos filas y a su derecha se apilan Ahorros y metas y Gastos recurrentes',Math.abs(a.y-c.y)<4&&r.y>a.y+a.h-2&&Math.abs(a.x-r.x)<4&&c.w>a.w&&Math.abs((r.y+r.h)-(c.y+c.h))<20);}
  T('Privacidad y Reportes comparten fila',fila('Privacidad','Reportes'));
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
