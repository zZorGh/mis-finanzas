// t85: datos en un equipo compartido. Los datos del navegador nunca pasan a otra cuenta y se borran al cerrar sesión.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=fs.readFileSync(__dirname+'/demo.json','utf8');
const K='mis-finanzas-prototipo-v1',MARK='ETF VOO';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
// Supabase simulado: la cuenta remota está vacía; cada upsert se anota (sobrevive a recargas).
const stub=uid=>`window.__push=x=>{try{const a=JSON.parse(sessionStorage.getItem('__L')||'[]');a.push(x);sessionStorage.setItem('__L',JSON.stringify(a));}catch(e){}};
const chain={select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},
 upsert(o){if(sessionStorage.getItem('__fail'))return Promise.reject(new Error('Failed to fetch'));window.__push(['upsert',JSON.stringify(o&&o.registro)]);return Promise.resolve({error:null})}};
window.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:sessionStorage.getItem('__out')?null:{user:{id:'${uid}',email:'x@y.pe'}}}}),
 onAuthStateChange:cb=>{window.__cb=cb;return {data:{subscription:{unsubscribe(){}}}}},
 signOut:()=>{sessionStorage.setItem('__out','1');window.__push(['out']);return Promise.resolve({})}},
 from:()=>chain,rpc:()=>Promise.resolve({error:null})})};`;
// Siembra datos solo en la primera carga (el init script corre también al recargar).
const seed=(owner,dirty)=>`if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');
 localStorage.setItem('${K}',${JSON.stringify(demo)});localStorage.setItem('${K}-skin','escalon');
 ${owner?`localStorage.setItem('${K}-owner','${owner}');`:''}${dirty?`localStorage.setItem('${K}-sync',JSON.stringify({connected:true,dirty:true,stamp:'v1'}));`:''}}`;
(async()=>{
 const b=await chromium.launch();
 const mk=async(uid,owner,dirty,hash,offline)=>{const ctx=await b.newContext({viewport:{width:1100,height:800}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(stub(uid)+seed(owner,dirty)+(offline?`sessionStorage.setItem('__fail','1');`:''));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(hash||''));await p.waitForTimeout(1500);p.errs=errs;return p;};
 const ups=async p=>JSON.parse(await p.evaluate(()=>sessionStorage.getItem('__L')||'[]'));
 const ls=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);

 // 1 Otra cuenta entra en un equipo con datos de A (con cambios pendientes): no se suben y se borran.
 let p=await mk('uB','uA',true);await p.waitForTimeout(800);
 let L=await ups(p);
 T('1 no sube datos de A a la cuenta de B',!L.some(x=>x[0]==='upsert'&&(x[1]||'').includes(MARK)));
 T('1 borra los datos de A del navegador',!((await ls(p,K))||'').includes(MARK));
 T('1 marca a B como dueño',(await ls(p,K+'-owner'))==='uB');
 T('1 conserva el estilo',(await ls(p,K+'-skin'))==='escalon');
 T('1 sin errores',p.errs.length===0);await p.context().close();

 // 2 Datos sin dueño (de antes de iniciar sesión): la primera cuenta los adopta y se suben.
 p=await mk('uA',null,false);await p.waitForTimeout(800);L=await ups(p);
 T('2 sube los datos sin dueño',L.some(x=>x[0]==='upsert'&&(x[1]||'').includes(MARK)));
 T('2 marca dueño',(await ls(p,K+'-owner'))==='uA');
 T('2 sin errores',p.errs.length===0);await p.context().close();

 // 3 Mismo dueño: los datos se quedan.
 p=await mk('uA','uA',false);
 T('3 conserva sus datos',((await ls(p,K))||'').includes(MARK));
 T('3 sin errores',p.errs.length===0);await p.context().close();

 // 4 Cerrar sesión borra los datos del navegador pero no el estilo.
 p=await mk('uA','uA',false,'#resumen');
 await p.locator('#sb-logout').scrollIntoViewIfNeeded();await p.click('#sb-logout');await p.waitForTimeout(1500);
 L=await ups(p);
 T('4 llama a signOut',L.some(x=>x[0]==='out'));
 T('4 borra los datos',!((await ls(p,K))||'').includes(MARK)&&!(await ls(p,K+'-owner')));
 T('4 conserva el estilo',(await ls(p,K+'-skin'))==='escalon');
 T('4 muestra el acceso',await p.locator('#authbox').count()===1);
 T('4 sin errores',p.errs.length===0);await p.context().close();

 // 5 Cerrar sesión con cambios sin subir (sin señal): avisa; si cancela, no cierra ni borra.
 p=await mk('uA','uA',true,'#resumen',true);
 let asked='';p.once('dialog',d=>{asked=d.message();d.dismiss();});
 await p.locator('#sb-logout').scrollIntoViewIfNeeded();await p.click('#sb-logout');await p.waitForTimeout(1200);
 T('5 avisa de cambios sin subir',/no se subieron/.test(asked));
 T('5 al cancelar no cierra sesión',!(await ups(p)).some(x=>x[0]==='out'));
 T('5 al cancelar conserva los datos',((await ls(p,K))||'').includes(MARK));
 p.once('dialog',d=>d.accept());await p.locator('#sb-logout').scrollIntoViewIfNeeded();await p.click('#sb-logout');await p.waitForTimeout(1500);
 T('5 al aceptar cierra y borra',(await ups(p)).some(x=>x[0]==='out')&&!((await ls(p,K))||'').includes(MARK));
 await p.context().close();

 await b.close();console.log('Total',ok+bad,'ok',ok,'fallas',bad);process.exitCode=bad?1:0;
})();
