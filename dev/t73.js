const {chromium}=require('playwright');let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const stub=`window.__log=[];window.__push=x=>{window.__log.push(x);try{const a=JSON.parse(sessionStorage.getItem('__L')||'[]');a.push(x);sessionStorage.setItem('__L',JSON.stringify(a));}catch(e){}};window.__sess=null;
const chain={select(){return this},eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},upsert(o){window.__push(['upsert',JSON.stringify(o&&o.config)]);return Promise.resolve({error:null})},order(){return this},limit(){return this}};
window.supabase={createClient:()=>({
 auth:{getSession:()=>Promise.resolve({data:{session:window.__sess}}),
  onAuthStateChange:cb=>{window.__cb=cb;return {data:{subscription:{unsubscribe(){}}}}},
  resetPasswordForEmail:(e,o)=>{window.__log.push(['reset',e,o&&o.redirectTo]);return Promise.resolve({error:null})},
  updateUser:p=>{window.__log.push(['update',p.password]);return Promise.resolve({error:window.__weak?{message:'Password is known to be weak and easy to guess'}:null})},
  signOut:()=>{window.__push(['out']);return Promise.resolve({})},
  signInWithPassword:()=>Promise.resolve({error:{message:'Invalid login credentials'}}),signUp:()=>Promise.resolve({error:null,data:{}})},
 from:()=>chain,rpc:n=>{window.__push(['rpc',n]);return Promise.resolve({error:null})}})};`;
(async()=>{const b=await chromium.launch();
const mk=async(hash,sess)=>{const p=await (await b.newContext({viewport:{width:1100,height:800}})).newPage();
 await p.route('**/*',r=>{const u=r.request().url();return u.startsWith('http://127.0.0.1:8765')?r.continue():r.abort();});
 await p.addInitScript(stub+(sess?`window.__sess={user:{id:'u1',email:'a@b.pe'}};`:''));
 await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(hash||''));await p.waitForTimeout(700);return p;};
// 1 olvidé contraseña
let p=await mk();
T('auth visible',await p.locator('#authbox').count()===1);
T('enlace olvidé',await p.locator('#au-fp').count()===1);
T('ojito en contraseña',await p.locator('#authbox .pwb').count()===1);
await p.fill('#au-pass','Clave1234');await p.click('#authbox .pwb');T('muestra contraseña',(await p.getAttribute('#au-pass','type'))==='text'&&(await p.getAttribute('#authbox .pwb','aria-pressed'))==='true');
await p.click('#authbox .pwb');T('oculta contraseña',(await p.getAttribute('#au-pass','type'))==='password');
await p.fill('#au-pass','');
await p.click('#au-fp');T('pide correo',/Escribe tu correo/.test(await p.innerText('#au-msg')));
await p.fill('#au-email','ana@mail.pe');await p.click('#au-fp');await p.waitForTimeout(200);
const lg=await p.evaluate(()=>window.__log);T('reset llamado con correo',lg.some(x=>x[0]==='reset'&&x[1]==='ana@mail.pe'&&/wrap-repo/.test(x[2]||'')));
T('mensaje genérico',/Si ese correo tiene cuenta/.test(await p.innerText('#au-msg')));
await p.fill('#au-pass','x');await p.click('#au-in');await p.waitForTimeout(200);T('error traducido',/incorrectos/.test(await p.innerText('#au-msg')));
await p.fill('#au-pass','corta');await p.click('#au-up');T('mín 8 al crear',/8 caracteres/.test(await p.innerText('#au-msg')));
await p.close();
// 2 recuperación
p=await mk('#access_token=x&type=recovery',true);
T('form recuperar',await p.locator('#rcbox').count()===1&&await p.locator('#authbox').count()===0);
T('ojitos en recuperar',await p.locator('#rcbox .pwb').count()===2);await p.locator('#rcbox .pwb').first().click();T('recuperar muestra',(await p.getAttribute('#rc-p1','type'))==='text'&&(await p.getAttribute('#rc-p2','type'))==='password');await p.locator('#rcbox .pwb').first().click();
await p.fill('#rc-p1','abc');await p.fill('#rc-p2','abc');await p.click('#rc-go');T('corta rechazada',/8 caracteres/.test(await p.innerText('#rc-msg')));
await p.fill('#rc-p1','Segura12345');await p.fill('#rc-p2','Otra12345');await p.click('#rc-go');T('no coinciden',/no coinciden/.test(await p.innerText('#rc-msg')));
await p.evaluate(()=>window.__weak=true);await p.fill('#rc-p2','Segura12345');await p.click('#rc-go');await p.waitForTimeout(250);T('contraseña filtrada explicada',/muy común|filtraciones/.test(await p.innerText('#rc-msg')));
await p.evaluate(()=>window.__weak=false);await p.click('#rc-go');await p.waitForTimeout(400);
T('updateUser con la clave',(await p.evaluate(()=>window.__log)).some(x=>x[0]==='update'&&x[1]==='Segura12345'));
T('entra a la app y limpia el enlace',await p.locator('#authbg').count()===0&&!/type=recovery/.test(await p.evaluate(()=>location.hash)));
await p.close();
// 3 evento PASSWORD_RECOVERY
p=await mk();await p.evaluate(()=>window.__cb('PASSWORD_RECOVERY',{user:{id:'u1'}}));await p.waitForTimeout(200);T('evento abre recuperar',await p.locator('#rcbox').count()===1);await p.close();
// 4 eliminar cuenta
p=await mk('',true);await p.waitForTimeout(700);if(await p.locator('#ob-skip').count())await p.click('#ob-skip');await p.waitForTimeout(200);
T('sesión activa sin auth',await p.locator('#authbg').count()===0);
let found=await p.locator('#del-go').count();
if(!found){for(const t of ['Personalizar','Tema']){const bt=p.locator('button',{hasText:t}).first();if(await bt.count()){await bt.click({timeout:2000}).catch(()=>{});await p.waitForTimeout(300);if(await p.locator('#del-go').count()){found=1;break;}}}}
T('botón eliminar existe',found>0);
if(found){await p.locator('details.danger summary').scrollIntoViewIfNeeded();await p.locator('details.danger summary').click();
 T('deshabilitado al inicio',await p.locator('#del-go').isDisabled());
 await p.fill('#del-txt','eliminar mal');T('sigue deshabilitado',await p.locator('#del-go').isDisabled());
 await p.fill('#del-txt','ELIMINAR');T('habilita con ELIMINAR',!(await p.locator('#del-go').isDisabled()));
 await p.evaluate(()=>{window.__reloaded=0;});
 p.on('framenavigated',()=>{});
 await p.click('#del-go');await p.waitForTimeout(600);
 const l2=JSON.parse(await p.evaluate(()=>sessionStorage.getItem('__L')||'[]'));
 T('rpc delete_my_account + signOut',Array.isArray(l2)?(l2.some(x=>x[0]==='rpc'&&x[1]==='delete_my_account')&&l2.some(x=>x[0]==='out')):true);}

// 5 onboarding cuenta vacía
p=await mk('',true);await p.waitForTimeout(700);
T('asistente aparece',await p.locator('#onbox').count()===1);
await p.fill('#ob-l0','Mi billetera');await p.fill('#ob-b0','Interbank');
await p.click('#ob-go');await p.waitForTimeout(400);
T('asistente se cierra',await p.locator('#onbg').count()===0);
await p.evaluate(()=>{location.hash='noviembre'});await p.waitForTimeout(600);const txt=await p.innerText('body');T('cuenta renombrada visible',/Mi billetera/.test(txt));
await p.waitForTimeout(3600);
const up=JSON.parse(await p.evaluate(()=>sessionStorage.getItem('__L')||'[]')).filter(x=>x[0]==='upsert');
T('se guarda en la nube con los nombres',up.some(x=>/Mi billetera/.test(x[1])&&/Interbank/.test(x[1])));
await p.close();
// 6 omitir
p=await mk('',true);await p.waitForTimeout(700);await p.click('#ob-skip');await p.waitForTimeout(300);
T('omitir cierra',await p.locator('#onbg').count()===0);await p.close();
await b.close();console.log('Total',ok+bad,'ok',ok,'fallas',bad);process.exitCode=bad?1:0;})();
