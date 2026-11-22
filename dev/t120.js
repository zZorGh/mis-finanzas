// t120: verificación en dos pasos (activar, pedir el código al entrar, desactivar) y bloqueo de contraseñas filtradas.
const {chromium}=require('playwright');const fs=require('fs'),crypto=require('crypto');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=fs.readFileSync(__dirname+'/demo.json','utf8');const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const QR='data:image/svg+xml;utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
// Supabase simulado. El código correcto es 123456. El estado sobrevive a recargas en sessionStorage.
const stub=(o)=>`(()=>{const O=${JSON.stringify(o)},ss=sessionStorage;
 if(!ss.getItem('__f'))ss.setItem('__f',JSON.stringify(O.factors||[]));if(!ss.getItem('__a'))ss.setItem('__a',O.aal||'aal1');
 const F=()=>JSON.parse(ss.getItem('__f')),setF=x=>ss.setItem('__f',JSON.stringify(x));
 const b=x=>btoa(JSON.stringify(x)).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
 const ses=()=>({access_token:'h.'+b({aal:ss.getItem('__a')})+'.s',user:{id:'u1',email:'x@y.pe',factors:O.stale?[]:F()}});
 window.__loads=0;const chain={select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle(){window.__loads++;return Promise.resolve({data:null,error:null})},upsert(){return Promise.resolve({error:null})}};
 let cb=null;const verify=({factorId,code})=>{if(code!=='123456')return Promise.resolve({error:{message:'Invalid TOTP code entered',status:422}});setF(F().map(f=>f.id===factorId?Object.assign(f,{status:'verified'}):f));ss.setItem('__a','aal2');if(cb)cb('MFA_CHALLENGE_VERIFIED',ses());return Promise.resolve({data:{},error:null});};
 window.__signups=0;
 window.supabase={createClient:()=>({from:()=>chain,rpc:()=>Promise.resolve({error:null}),auth:{
  getSession:()=>Promise.resolve({data:{session:O.out?null:ses()}}),
  getUser:()=>Promise.resolve({data:{user:{id:'u1',email:'x@y.pe',factors:F()}},error:null}),
  onAuthStateChange:c=>{cb=c;return {data:{subscription:{unsubscribe(){}}}}},
  signOut:()=>{ss.setItem('__salio','1');return Promise.resolve({})},
  signUp:()=>{window.__signups++;return Promise.resolve({data:{user:{id:'n'},session:null},error:null})},
  signInWithPassword:()=>Promise.resolve({data:{},error:{message:'Invalid login credentials'}}),
  refreshSession:()=>{ss.setItem('__a','aal1');return Promise.resolve({data:{session:ses()},error:null})},
  mfa:{listFactors:()=>Promise.resolve({data:{all:F(),totp:F().filter(f=>f.status==='verified')},error:null}),
   enroll:()=>{const f={id:'f'+(F().length+1),status:'unverified',factor_type:'totp'};setF(F().concat(f));return Promise.resolve({data:{id:f.id,totp:{qr_code:${JSON.stringify(QR)},secret:'CLAVESECRETA234',uri:'otpauth://x'}},error:null});},
   challengeAndVerify:verify,unenroll:({factorId})=>{setF(F().filter(f=>f.id!==factorId));return Promise.resolve({data:{},error:null});}}}})};})();`;
const FV=[{id:'f1',status:'verified',factor_type:'totp'}];
const sha=s=>crypto.createHash('sha1').update(s).digest('hex').toUpperCase();
(async()=>{
 const b=await chromium.launch();
 const mk=async(o,hash,lang,hibp)=>{const ctx=await b.newContext({viewport:{width:1100,height:800},locale:'es-PE'});const p=await ctx.newPage();p.errs=[];p.hibp=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});
   if(u.includes('api.pwnedpasswords.com')){p.hibp.push(u);if(hibp==='caido')return r.abort();const suf=sha('password123').slice(5);return r.fulfill({status:200,contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:'0000000000000000000000000000000000A:0\r\n'+suf+':99\r\n'});}return r.abort();});
  await p.addInitScript(`if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem('${K}',${JSON.stringify(demo)});localStorage.setItem('${K}-instalar','1');${lang?`localStorage.setItem('cuadra-lang','${lang}');`:''}}`);
  await p.addInitScript(stub(o));await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(hash||'#ajustes'));await p.waitForTimeout(1100);return p;};
 const codigo=async(p,c)=>{await p.fill('#mfa-code',c);await p.click('#mfa-go');await p.waitForTimeout(350);};

 // 1. Activar
 let p=await mk({});
 T('1 Ajustes ofrece activar',await p.locator('#mfa-on').isVisible());
 await p.click('#mfa-on');await p.waitForSelector('#mfaset');await p.waitForTimeout(200);
 T('1 muestra el QR',(await p.getAttribute('#mfa-qr','src')||'').startsWith('data:image/svg+xml'));
 T('1 muestra la clave',(await p.textContent('#mfa-key'))==='CLAVESECRETA234');
 await p.fill('#mfa-code','123456');T('1 sin marcar «guardé» no deja activar',await p.locator('#mfa-go').isDisabled());
 await p.check('#mfa-saved');await p.fill('#mfa-code','000000');await p.click('#mfa-go');await p.waitForTimeout(300);
 T('1 código malo: avisa y sigue abierto',/no es correcto/.test(await p.textContent('#mfa-msg'))&&await p.locator('#mfaset').isVisible());
 await p.fill('#mfa-code','123456');await p.click('#mfa-go');await p.waitForTimeout(400);
 T('1 queda activada',await p.locator('#mfa-off').isVisible()&&!(await p.locator('#mfaset').count()));
 // 2. Desactivar
 await p.click('#mfa-off');await p.waitForSelector('#mfaset');await codigo(p,'999999');
 T('2 no desactiva con código malo',await p.locator('#mfaset').isVisible()&&(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__f')).length))===1);
 await codigo(p,'123456');await p.waitForTimeout(200);
 T('2 desactiva con el código',await p.locator('#mfa-on').isVisible()&&(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__f')).length))===0);
 T('2 sin errores',!p.errs.length);await p.context().close();
 // 3. Cancelar no deja un factor a medias
 p=await mk({});await p.click('#mfa-on');await p.waitForSelector('#mfaset');await p.click('#mfa-cancel');await p.waitForTimeout(200);
 T('3 cancelar borra el pendiente',(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__f')).length))===0);await p.context().close();
 // 4. Entrar con la verificación activa
 p=await mk({factors:FV,aal:'aal1'});
 T('4 pide el código',await p.locator('#mfabg').isVisible());
 T('4 no carga datos de la nube antes del código',(await p.evaluate(()=>window.__loads))===0);
 await codigo(p,'111111');
 T('4 código malo: sigue bloqueado',await p.locator('#mfabg').isVisible()&&(await p.evaluate(()=>window.__loads))===0);
 await codigo(p,'123456');await p.waitForTimeout(500);
 T('4 código bueno: entra y carga',!(await p.locator('#mfabg').count())&&(await p.evaluate(()=>window.__loads))>0);
 T('4 Ajustes la muestra activa',await p.locator('#mfa-off').isVisible());T('4 sin errores',!p.errs.length);await p.context().close();
 // 5. Sesión ya verificada: no pregunta. Sesión vieja de otro dispositivo: sí.
 p=await mk({factors:FV,aal:'aal2'});T('5 con aal2 no pide código',!(await p.locator('#mfabg').count()));await p.context().close();
 p=await mk({factors:FV,aal:'aal1',stale:true});T('5 sesión guardada antes de activar: pide código',await p.locator('#mfabg').isVisible());T('5 y no carga datos',(await p.evaluate(()=>window.__loads))===0);await p.context().close();
 // 6. Salir desde la pantalla del código
 p=await mk({factors:FV,aal:'aal1'});await p.click('#mfa-out');await p.waitForTimeout(500);
 T('6 «Salir» cierra sesión',(await p.evaluate(()=>sessionStorage.getItem('__salio')))==='1');
 T('6 no borra los datos del navegador',!!(await p.evaluate(k=>localStorage.getItem(k),K)));await p.context().close();
 // 7. Contraseñas filtradas
 const alta=async(p,pw)=>{await p.fill('#au-email','nuevo@ejemplo.pe');await p.fill('#au-pass',pw);const c=p.locator('#au-pass2,#au-terms,#au-ok');for(let i=0;i<await c.count();i++){const e=c.nth(i);if(await e.getAttribute('type')==='checkbox')await e.check();else await e.fill(pw);}await p.click('#au-go');await p.waitForTimeout(500);};
 p=await mk({out:true},'#crear',null);await alta(p,'password123');
 T('7 bloquea la contraseña filtrada',(await p.evaluate(()=>window.__signups))===0&&/filtraciones/.test(await p.textContent('#au-msg')));
 T('7 solo envía 5 caracteres del hash',p.hibp.length===1&&p.hibp[0].endsWith('/range/'+sha('password123').slice(0,5)));
 T('7 la contraseña no viaja en la URL',!p.hibp[0].includes('password123')&&!p.hibp[0].includes(sha('password123').slice(5)));
 T('7 el botón vuelve a funcionar',await p.locator('#au-go').isEnabled());
 await alta(p,'Cuy-del-Rimac-2026!');T('7 deja pasar una contraseña no filtrada',(await p.evaluate(()=>window.__signups))===1);await p.context().close();
 p=await mk({out:true},'#crear',null,'caido');await alta(p,'password123');T('7 si el servicio cae, no bloquea el registro',(await p.evaluate(()=>window.__signups))===1);await p.context().close();
 // 8. Inglés
 p=await mk({},'#ajustes','en');T('8 Ajustes en inglés',/Two-step verification: off/.test(await p.textContent('.mfast:not(#recbox)')));
 await p.click('#mfa-on');await p.waitForSelector('#mfaset');T('8 activación en inglés',/Turn on two-step verification/.test(await p.textContent('#mfaset')));await p.context().close();
 p=await mk({factors:FV,aal:'aal1'},'#ajustes','en');T('8 pantalla del código en inglés',/Enter your code/.test(await p.textContent('#mfabg')));await codigo(p,'000000');T('8 error en inglés',/wrong or expired/.test(await p.textContent('#mfa-msg')));await p.context().close();
 p=await mk({out:true},'#crear','en');await alta(p,'password123');T('8 contraseña filtrada en inglés',/data breaches/.test(await p.textContent('#au-msg')));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
