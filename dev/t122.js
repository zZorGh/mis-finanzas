// t122: recordatorios push. Activar, cambiar, desactivar, errores, cerrar sesión, inglés, y el service worker real.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=fs.readFileSync(__dirname+'/demo.json','utf8');const K='mis-finanzas-prototipo-v1',ROOT=path.join(__dirname,'..');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const PUB='BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const stub=o=>`(()=>{const O=${JSON.stringify(o)};window.__rpc=[];window.__subs=0;window.__unsub=0;let perm=O.perm||'default';
 const keyB=(()=>{const s='${PUB}';const b=atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0));})();
 const mk=ep=>({endpoint:ep,options:{applicationServerKey:keyB.buffer},unsubscribe(){window.__unsub++;sessionStorage.removeItem('__sub');return Promise.resolve(true);}});
 const reg={pushManager:{getSubscription:()=>{const e=sessionStorage.getItem('__sub');return Promise.resolve(e?mk(e):null);},subscribe:()=>{window.__subs++;const e=O.nuevo||'https://fcm.googleapis.com/fcm/send/abc';sessionStorage.setItem('__sub',e);return Promise.resolve(mk(e));}}};
 if(O.sub&&!sessionStorage.getItem('__i')){sessionStorage.setItem('__i','1');sessionStorage.setItem('__sub',O.sub);}
 Object.defineProperty(navigator,'serviceWorker',{value:{ready:Promise.resolve(reg),register:()=>Promise.resolve(reg),addEventListener(){}},configurable:true});
 window.PushManager=window.PushManager||function(){};
 window.Notification=function(){};Object.defineProperty(window.Notification,'permission',{get:()=>perm});window.Notification.requestPermission=()=>{perm=O.responde||'granted';return Promise.resolve(perm);};
 const chain={select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},upsert(){return Promise.resolve({error:null})}};
 const tok='h.'+btoa(JSON.stringify({aal:'aal1'})).replace(/=+$/,'')+'.s';
 window.supabase={createClient:()=>({from:()=>chain,rpc:(f,a)=>{window.__rpc.push([f,a]);try{const l=JSON.parse(sessionStorage.getItem('__rl')||'[]');l.push([f,a]);sessionStorage.setItem('__rl',JSON.stringify(l));}catch(e){}return Promise.resolve(O.rpcFalla?{error:{message:'x'}}:{error:null});},auth:{getSession:()=>Promise.resolve({data:{session:sessionStorage.getItem('__out')?null:{access_token:tok,user:{id:'u1',email:'x@y.pe',factors:[]}}}}),getUser:()=>Promise.resolve({data:{user:{id:'u1',factors:[]}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:()=>{sessionStorage.setItem('__out','1');return Promise.resolve({});},mfa:{}}})};})();`;
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';if(u==='/sw-prueba.html'){r.writeHead(200,{'content-type':'text/html'});r.end('<!doctype html><title>x</title>');return;}const f=path.join(ROOT,u);if(!f.startsWith(ROOT+path.sep)){r.writeHead(403);r.end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});});
(async()=>{
 const b=await chromium.launch();
 const mk=async(o,x)=>{x=x||{};const ctx=await b.newContext({viewport:{width:x.w||1280,height:900},locale:'es-PE',userAgent:x.ua});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('/functions/v1/recordatorios'))return o.claveFalla?r.fulfill({status:500,body:'{}'}):r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({k:PUB})});if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(`if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem('${K}',${JSON.stringify(demo)});localStorage.setItem('${K}-owner','u1');localStorage.setItem('${K}-instalar','1');${x.lang?`localStorage.setItem('cuadra-lang','${x.lang}');`:''}${x.pref?`localStorage.setItem('${K}-recordatorio',${JSON.stringify(JSON.stringify(x.pref))});`:''}}`);
  if(x.ua&&x.sinPush)await p.addInitScript(`delete window.PushManager;`);
  await p.addInitScript(x.sinPush?`window.supabase=undefined;`+stub(o)+`delete window.PushManager;`:stub(o));await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(1000);return p;};
 const pref=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),K+'-recordatorio');const rpc=p=>p.evaluate(()=>window.__rpc);const fin=async p=>{T('sin errores de JS',!p.errs.length);await p.context().close();};
 const EP='https://fcm.googleapis.com/fcm/send/abc';
 // 1. Activar
 let p=await mk({});T('1 ofrece activar',await p.locator('#rec-on').isVisible());T('1 no pide permiso solo',(await p.evaluate(()=>Notification.permission))==='default');
 await p.selectOption('#rec-h','21');await p.waitForTimeout(150);await p.click('#rec-on');await p.waitForTimeout(350);
 let P=await pref(p),R=await rpc(p);T('1 queda activado',P.on===true&&P.ep===EP&&await p.locator('#rec-off').isVisible());
 T('1 guarda solo dirección, frecuencia, hora y día',R.length===1&&R[0][0]==='recordatorio_guardar'&&Object.keys(R[0][1]).sort().join()==='p_dia,p_endpoint,p_frecuencia,p_hora'&&R[0][1].p_hora===21);
 // 2. Cambiar
 await p.selectOption('#rec-f','semanal');await p.waitForTimeout(250);T('2 aparece el día',await p.locator('#rec-d').isVisible());await p.selectOption('#rec-d','5');await p.waitForTimeout(250);
 R=await rpc(p);const l=R[R.length-1];T('2 actualiza la nube',l[0]==='recordatorio_guardar'&&l[1].p_frecuencia==='semanal'&&l[1].p_dia===5);
 // 3. Desactivar
 await p.click('#rec-off');await p.waitForTimeout(300);P=await pref(p);R=await rpc(p);T('3 desactiva',!P.on&&await p.locator('#rec-on').isVisible());T('3 borra de la nube',R[R.length-1][0]==='recordatorio_quitar'&&R[R.length-1][1].p_endpoint===EP);T('3 cancela la suscripción',(await p.evaluate(()=>window.__unsub))===1);await fin(p);
 // 4. Errores
 p=await mk({responde:'denied'});await p.click('#rec-on');await p.waitForTimeout(300);T('4 permiso negado: no activa ni llama',!((await pref(p))||{}).on&&!(await rpc(p)).length);T('4 explica cómo permitirlo',/Bloqueaste/.test(await p.locator('#recbox').innerText()));await fin(p);
 p=await mk({rpcFalla:true});await p.click('#rec-on');await p.waitForTimeout(350);T('4 si la nube falla no queda activado',!((await pref(p))||{}).on);T('4 no deja una suscripción huérfana',(await p.evaluate(()=>window.__unsub))===1);await fin(p);
 p=await mk({claveFalla:true});await p.click('#rec-on');await p.waitForTimeout(350);T('4 si falla la clave no activa',!((await pref(p))||{}).on&&(await p.evaluate(()=>window.__subs))===0);await fin(p);
 // 5. Al abrir
 p=await mk({perm:'granted',sub:EP});await p.waitForTimeout(300);T('5 suscripción de otra cuenta se cancela',(await p.evaluate(()=>window.__unsub))===1);await fin(p);
 p=await mk({perm:'granted',sub:'https://fcm.googleapis.com/fcm/send/nuevo'},{pref:{on:true,f:'diario',h:20,d:0,ep:EP}});await p.waitForTimeout(300);P=await pref(p);R=await rpc(p);T('5 dirección nueva se actualiza',P.ep.endsWith('/nuevo')&&R.some(x=>x[0]==='recordatorio_guardar'&&x[1].p_endpoint.endsWith('/nuevo'))&&R.some(x=>x[0]==='recordatorio_quitar'&&x[1].p_endpoint===EP));await fin(p);
 p=await mk({perm:'denied',sub:EP},{pref:{on:true,f:'diario',h:20,d:0,ep:EP}});await p.waitForTimeout(300);P=await pref(p);T('5 permiso retirado: se apaga y se borra',!P.on&&(await rpc(p)).some(x=>x[0]==='recordatorio_quitar'));await fin(p);
 // 6. Cerrar sesión
 p=await mk({perm:'granted',sub:EP},{pref:{on:true,f:'diario',h:20,d:0,ep:EP}});await p.waitForTimeout(250);await p.click('#sb-logout');await p.waitForTimeout(700);
 const rl=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__rl')||'[]'));T('6 al salir se borra de la nube',rl.some(x=>x[0]==='recordatorio_quitar'&&x[1].p_endpoint===EP));T('6 y deja de estar suscrito',!(await p.evaluate(()=>sessionStorage.getItem('__sub'))));T('6 no queda la preferencia',!(await pref(p)));await p.context().close();
 // 7. iPhone sin instalar
 p=await mk({},{sinPush:true,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',w:390});T('7 iPhone explica que hay que instalar',/Agregar a inicio/.test(await p.locator('#recbox').innerText())&&!(await p.locator('#rec-on').count()));await fin(p);
 // 8. Inglés y celular
 p=await mk({},{lang:'en',w:360});let x=await p.locator('#recbox').innerText();T('8 en inglés',/Reminders: off/.test(x)&&/Every day/.test(x)&&/Turn on/.test(x)&&/carries no amounts/.test(x)&&!/Recordatorios|Frecuencia/.test(x));T('8 sin desborde a 360 px',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await fin(p);
 // 9. Service worker real: muestra el aviso sin contenido, en el idioma guardado, y no toca los datos
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';
 const ctx=await b.newContext({permissions:['notifications']});const q=await ctx.newPage();await q.route(/cdn|fonts|supabase/,r=>r.abort());await q.goto(base+'sw-prueba.html');
 await q.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;const c=await caches.open('misoles-pref');await c.put('./__pref',new Response(JSON.stringify({l:'en',f:'semanal'})));});
 let sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');await q.waitForTimeout(300);
 const n=await sw.evaluate(async()=>{const l=[];self.registration.showNotification=(t,o)=>{l.push({t,b:o.body,tag:o.tag});return Promise.resolve();};const e=new ExtendableEvent('push');let w;e.waitUntil=x=>{w=x;};self.dispatchEvent(e);await w;return l;}).catch(e=>'ERR '+e.message);
 T('9 muestra el aviso',Array.isArray(n)&&n.length===1&&n[0].t==='MiS²oles'&&n[0].tag==='recordatorio');T('9 usa idioma y frecuencia guardados',Array.isArray(n)&&/how your week went/.test(n[0]&&n[0].b));
 T('9 la preferencia sobrevive a la limpieza de cachés',await q.evaluate(async()=>(await caches.keys()).includes('misoles-pref')));await ctx.close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();srv.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
