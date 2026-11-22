// t123: compartir a MiS²oles. Lectura de mensajes reales de ejemplo, nada se guarda solo, y el texto no llega al servidor.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1',ROOT=path.join(__dirname,'..');
const data=JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})});
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const posts=[];
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(q.method==='POST'){posts.push(u);r.writeHead(405);r.end();return;}if(u.endsWith('/'))u+='index.html';if(u==='/sw-prueba.html'){r.writeHead(200,{'content-type':'text/html'});r.end('<!doctype html><title>x</title>');return;}const f=path.join(ROOT,u);if(!f.startsWith(ROOT+path.sep)){r.writeHead(403);r.end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});});
const CASOS=[
 ['Yape enviado','Yapeaste S/ 25.50 a Juan Perez',{a:25.5,d:'Juan Perez',cur:'S/'}],
 ['Yape recibido','Maria Lopez te yapeó S/ 40.00',{a:40,d:'Maria Lopez',has:'Ingreso'}],
 ['Crédito ignora línea','BBVA: Consumo con tarjeta de crédito por S/ 89.90 en TOTTUS MIRAFLORES. Línea disponible S/ 3,200.00',{a:89.9,d:'Tottus Miraflores',has:'BBVA'}],
 ['Dólares e ignora saldo','Saldo disponible: S/ 1,000.00. Transferencia enviada. Monto: USD 15.00',{a:15,cur:'$'}],
 ['Miles y operación','Pago en PLAZA VEA S/ 1,200.50 Operación 123456',{a:1200.5,d:'Plaza Vea'}],
 ['Fecha de ayer','Compra en WONG por S/ 30.00 el 20/11/2026',{a:30,d:'Wong',has:'Ayer'}],
 ['Frase corta','almuerzo 25 yape',{a:25,d:'Almuerzo'}],
];
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';
 const b=await chromium.launch();
 const mk=async(x)=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||390,height:844},locale:'es-PE',timezoneId:'America/Lima'});await c.clock.setFixedTime(new Date('2026-11-21T15:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[data,K,x.lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>{p.dialogo=1;d.dismiss();});await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#board');return p;};
 const share=async(p,x,edad)=>{await p.keyboard.press('Escape');await p.evaluate(async([x,edad])=>{const c=await caches.open('misoles-share');await c.put('./__compartido',new Response(JSON.stringify({x,t:Date.now()-(edad||0)})));location.hash='#noviembre';await new Promise(r=>setTimeout(r,60));location.hash='#compartido';},[x,edad]);await p.waitForTimeout(260);};
 const filas=p=>p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)).S['2026'];return JSON.stringify(s).length;},K);

 let p=await mk();const f0=await filas(p);
 for(const [n,x,e] of CASOS){await share(p,x);const r=await p.evaluate(()=>({m:(document.getElementById('sheet')||{dataset:{}}).dataset.mode,a:+((document.getElementById('sa')||{}).value||0),d:(document.getElementById('sd')||{}).value,pv:(document.getElementById('sapv')||{}).innerText||''}));
  T(n+': abre Automático',r.m==='auto');T(n+': monto '+r.a,r.a===e.a);if(e.d)T(n+': concepto «'+r.d+'»',r.d===e.d);if(e.cur)T(n+': moneda',r.pv.includes(e.cur+' '));if(e.has)T(n+': muestra '+e.has,r.pv.includes(e.has));}
 T('nada se guarda solo',await filas(p)===f0);
 await share(p,'Tu código de verificación es 123456');let v=await p.evaluate(()=>({a:document.getElementById('sa').value,st:document.getElementById('smicst').textContent}));T('sin moneda no inventa monto',v.a===''&&/No encontré el monto/.test(v.st));
 await share(p,'Monto S/ 20.00 Saldo S/ 900.00 Comisión S/ 1.00 Total S/ 21.00');v=await p.evaluate(()=>({a:+document.getElementById('sa').value,st:document.getElementById('smicst').textContent}));T('avisa si hay varios montos',/varios montos/.test(v.st));
 await share(p,'<img src=x onerror="window.__x=1"> Pago S/ 10.00 a <b>Hack</b>');T('sin inyección de HTML',await p.evaluate(()=>!window.__x&&!document.querySelector('#sheet img,#sapv b b')));
 await p.keyboard.press('Escape');await p.evaluate(async()=>{const c=await caches.open('misoles-share');await c.put('./__compartido',new Response(JSON.stringify({x:'Pago S/ 5.00',t:Date.now()-16*60000})));location.hash='#octubre';await new Promise(r=>setTimeout(r,60));location.hash='#compartido';});await p.waitForTimeout(250);T('lo vencido no se abre',!(await p.locator('#sheet').count()));
 await share(p,'Yapeaste S/ 12.00 a Rosa');T('se borra al abrirlo',await p.evaluate(async()=>!(await (await caches.open('misoles-share')).match('./__compartido'))));T('limpia la dirección',await p.evaluate(()=>location.hash===''));
 const chips=p.locator('#sapv [data-aacct]');const nch=await chips.count();T('pide la cuenta',nch>0);await chips.nth(0).click();await p.click('[data-s="save"]');await p.waitForTimeout(250);T('al tocar Guardar sí se registra',await filas(p)!==f0&&!(await p.locator('#sheet').count()));T('app sin errores',!p.errs.length);await p.context().close();
 p=await mk({lang:'en',w:360});await share(p,'Yapeaste S/ 25.50 a Juan Perez');v=await p.evaluate(()=>document.getElementById('smicst').textContent);T('en inglés',v==='Review and save.');T('sin desborde a 360 px',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.context().close();

 const m=JSON.parse(fs.readFileSync(ROOT+'/manifest.webmanifest','utf8')).share_target;T('manifiesto por POST',m&&m.method==='POST'&&m.action==='./compartir'&&m.params.text==='text');
 T('cerrar sesión lo borra',/function wipeLocal\(\)\{try\{if\('caches' in window\)caches\.delete\('misoles-share'\)/.test(fs.readFileSync(ROOT+'/index.html','utf8')));
 // Service worker real: el POST no llega al servidor.
 const ctx=await b.newContext();await ctx.route(/cdn|fonts|supabase/,r=>r.abort());const q=await ctx.newPage();await q.goto(base+'sw-prueba.html');await q.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r));});
 const res=await q.evaluate(async()=>{const r=await fetch('/compartir',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({title:'Yape',text:'Yapeaste S/ 7.00 a Ana'}),redirect:'manual'});const c=await caches.open('misoles-share'),h=await c.match('./__compartido');return{t:r.type,o:h?(await h.json()).x:''};});
 T('el service worker lo guarda',res.o==='Yape\nYapeaste S/ 7.00 a Ana');T('redirige sin llevar el texto',res.t==='opaqueredirect');T('el texto no llegó al servidor',posts.length===0);await ctx.close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();srv.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
