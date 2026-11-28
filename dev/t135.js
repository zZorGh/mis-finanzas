// t135: lo que cada movimiento sumó o restó a su cuenta sobrevive a la nube, y el cambio de mes con sesión. Con sesión simulada (la «nube» vive en
// sessionStorage) y por la interfaz: registrar, cerrar y abrir, editar sin cambios y borrar. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const stub=`(()=>{const tabla=t=>{const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},abortSignal(){return q;},
 maybeSingle(){return Promise.resolve({data:t==='estado'?JSON.parse(sessionStorage.getItem('__nube')||'null'):null,error:null});},
 upsert(o){if(t==='estado')sessionStorage.setItem('__nube',JSON.stringify(o));const r=Promise.resolve({error:null});r.abortSignal=()=>r;r.select=()=>r;return r;},
 insert(){const r=Promise.resolve({error:null});r.abortSignal=()=>r;return r;},update(){return q;},delete(){return q;},then(f){return Promise.resolve({data:[],error:null}).then(f);}};return q;};
 window.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1',email:'a@b.pe'},access_token:'x'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:()=>Promise.resolve({}),
 mfa:{listFactors:()=>Promise.resolve({data:{totp:[]},error:null}),getAuthenticatorAssuranceLevel:()=>Promise.resolve({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null})},getUser:()=>Promise.resolve({data:{user:{id:'u1',factors:[]}},error:null})},from:tabla,rpc:()=>Promise.resolve({error:null})})};})();`;
(async()=>{
 const b=await chromium.launch();
 const abre=async()=>{const c=await b.newContext({viewport:{width:1366,height:800}});await c.clock.install({time:new Date('2026-11-22T12:00:00-05:00')});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(stub);
  await c.addInitScript(([d,k])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}),K]);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',x=>x.accept());
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app .card');await avanza(p,2000);return p;};
 const avanza=async(p,ms)=>{await p.clock.runFor(ms);await p.waitForTimeout(450);};
 const mes=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10],K);
 const yape=async p=>(await mes(p)).liq[0].m;
 const recarga=async p=>{await avanza(p,4000);await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);};
 const lapiz=async(p,sec,c)=>{const i=(await mes(p))[sec].findIndex(r=>r.c===c);await p.evaluate(([s,i])=>document.querySelector('[data-edit="'+s+'"][data-i="'+i+'"]').click(),[sec,i]);await p.waitForSelector('#sheet');await avanza(p,400);};
 const guarda=async p=>{await p.click('#sheet .sact button.p');await avanza(p,1500);};
 const borra=async(p,sec,c)=>{await lapiz(p,sec,c);await p.click('#sheet [data-s="del-mov"]');await avanza(p,400);if(await p.locator('#sheet [data-s="del-mov"]').count())await p.click('#sheet [data-s="del-mov"]');await avanza(p,1500);};
 const ingreso=async(p,monto,c)=>{await p.click('.caplink');await p.waitForSelector('#sheet');await p.click('#stype [data-g="ing"]');await avanza(p,300);await p.fill('#sa',monto);await p.fill('#sd',c);await p.click('#ssrc [data-src="liq:0"]');await guarda(p);};

 // 1. Ingreso: sobrevive a cerrar y abrir
 let p=await abre();const ini=await yape(p);await ingreso(p,'100','T135 bono');T('1 el ingreso suma',await yape(p)===ini+100);
 await recarga(p);let r=(await mes(p)).ing.find(x=>x.c==='T135 bono');T('1 tras abrir de nuevo conserva lo que sumó',!!r&&r._d===-100&&await yape(p)===ini+100);
 await lapiz(p,'ing','T135 bono');await guarda(p);T('1 guardar sin cambios no vuelve a sumar',await yape(p)===ini+100);
 await recarga(p);await borra(p,'ing','T135 bono');T('1 borrar devuelve el saldo',await yape(p)===ini&&!(await mes(p)).ing.some(x=>x.c==='T135 bono'));

 // 2. Gasto en dólares: se devuelve lo que se descontó aunque cambie la tasa del mes
 await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S['2026'][10].tc={'$':3.4};localStorage.setItem(k,JSON.stringify(d));sessionStorage.removeItem('__nube');},K);await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);
 const a=await yape(p);await p.click('.caplink');await p.waitForSelector('#sheet');await p.fill('#sa','10');await p.fill('#sd','T135 libro');await p.click('#scur');await p.click('#ssrc [data-src="liq:0"]');await guarda(p);const desc=a-await yape(p);
 await avanza(p,4000);await p.evaluate(()=>{const n=JSON.parse(sessionStorage.getItem('__nube'));n.registro.forEach(f=>{if(f[1]===11&&f[3]==='_TC')f[4]=JSON.stringify({'$':3.8});});sessionStorage.setItem('__nube',JSON.stringify(n));});
 await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);await borra(p,'hor','T135 libro');
 T('2 gasto en dólares: vuelve exactamente lo descontado ('+desc.toFixed(2)+')',desc>0&&Math.abs(await yape(p)-a)<.005);

 // 3. Nube guardada por una versión anterior (sin _d): el ingreso se recupera
 const z=await yape(p);await ingreso(p,'50','T135 viejo');await avanza(p,4000);
 await p.evaluate(()=>{const n=JSON.parse(sessionStorage.getItem('__nube'));n.registro.forEach(f=>{if(typeof f[15]==='string'&&f[15]){const j=JSON.parse(f[15]);delete j._d;f[15]=JSON.stringify(j);}});sessionStorage.setItem('__nube',JSON.stringify(n));});
 await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);r=(await mes(p)).ing.find(x=>x.c==='T135 viejo');
 T('3 nube antigua: el ingreso recupera lo que sumó',!!r&&r._d===-50);await borra(p,'ing','T135 viejo');T('3 y borrarlo devuelve el saldo',Math.abs(await yape(p)-z)<.005);

 T('sin errores',!p.errs.length);if(p.errs.length)console.log(p.errs.slice(0,3));
 await p.context().close();
 // 4. Primero de mes con sesión: el arrastre espera a la nube, se guarda y no se repite en otro dispositivo
 const NOV='430,130,200,18';
 const sesion=async(nube,local,fecha)=>{const c=await b.newContext({viewport:{width:1366,height:800}});await c.clock.install({time:new Date((fecha||'2026-12-01')+'T12:00:00-05:00')});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(stub);
  await c.addInitScript(([d,n,k])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');if(d){localStorage.setItem(k,d);}localStorage.setItem(k+'-instalar','1');if(n)sessionStorage.setItem('__nube',n);},[local,nube,K]);
  const q=await c.newPage();q.errs=[];q.on('pageerror',e=>q.errs.push(e.message));q.on('dialog',x=>x.accept());await q.goto('http://127.0.0.1:8765/wrap-repo.html#diciembre');await q.waitForSelector('#app .card');await avanza(q,2000);await avanza(q,4000);return q;};
 const dic=async q=>(await q.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][11],K)).liq.map(r=>+r.m).join(',');
 const nube=q=>q.evaluate(()=>sessionStorage.getItem('__nube'));
 const chip=async q=>(await q.locator('#syn').innerText());
 const datos=JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,rec:[]})});
 let q=await sesion(null,datos);T('4 con sesión, diciembre recibe los saldos',await dic(q)===NOV);
 T('4 queda guardado, sin conflicto',/Guardado/.test(await chip(q)));const n1=await nube(q);T('4 la nube tiene la marca del mes (_Liq)',JSON.parse(n1).registro.some(f=>f[3]==='_Liq'&&f[1]===12));
 await q.reload();await q.waitForSelector('#app .card');await avanza(q,2000);await avanza(q,4000);T('4 abrir otra vez no vuelve a sumar',await dic(q)===NOV&&/Guardado/.test(await chip(q)));
 T('4 sin errores',!q.errs.length);await q.context().close();
 q=await sesion(n1,null);T('5 otro dispositivo ve los mismos saldos, sin sumar dos veces ni conflicto',await dic(q)===NOV&&/Guardado/.test(await chip(q)));await q.context().close();
 // 6. Datos locales viejos y una nube más nueva: manda la nube, nada se pisa antes de leerla
 const nueva=JSON.parse(n1);nueva.registro.forEach(f=>{if(f[1]===12&&f[3]!=='_Liq'&&f[4]==='Yape')f[5]=999;});
 q=await sesion(JSON.stringify(nueva),datos);T('6 con datos locales viejos se respeta lo de la nube',(await dic(q)).startsWith('999'));
 T('6 y la nube no fue pisada',JSON.parse(await nube(q)).registro.some(f=>f[1]===12&&f[4]==='Yape'&&+f[5]===999));await q.context().close();

 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
