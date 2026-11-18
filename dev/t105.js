// t105: acceso en pantalla partida (escritorio) y Resumen en bento. La marca ocupa la mitad izquierda del acceso; en celular no estorba.
// El Resumen reparte sus tarjetas en una cuadrícula de anchos distintos sin huecos (fondo de emergencia + indicadores, gráficos 8/4, tres en fila, 7/5).
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const stub=`window.__log=[];window.__sess=null;const chain={select(){return this},eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},upsert(){return Promise.resolve({error:null})},order(){return this},limit(){return this}};
window.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:window.__sess}}),onAuthStateChange:cb=>{window.__cb=cb;return {data:{subscription:{unsubscribe(){}}}}},resetPasswordForEmail:()=>Promise.resolve({error:null}),updateUser:()=>Promise.resolve({error:null}),signOut:()=>Promise.resolve({}),signInWithPassword:()=>Promise.resolve({error:{message:'Invalid login credentials'}}),signUp:()=>Promise.resolve({error:null,data:{}})},from:()=>chain,rpc:()=>Promise.resolve({error:null})})};`;
const acceso=async(b,w,lang)=>{const ctx=await b.newContext({viewport:{width:w,height:800},isMobile:w<500,hasTouch:w<500});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();return u.startsWith('http://127.0.0.1:8765')?r.continue():r.abort();});
  await p.addInitScript(stub+(lang?`localStorage.setItem('cuadra-lang','${lang}');`:''));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html');await p.waitForTimeout(800);return p;};
const resumen=async(b,w,lang,tema)=>{const ctx=await b.newContext({viewport:{width:w,height:900},isMobile:w<500,hasTouch:w<500,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l,th])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema',th||'light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{metas:[{n:'Viaje',o:2000}]})}),K,lang||'',tema||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForSelector('#board');await p.waitForTimeout(900);return p;};
const box=(p,id)=>p.evaluate(id=>{const e=document.querySelector('[data-cid="'+id+'"]');if(!e||e.offsetParent===null)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,w:r.width,h:r.height};},id);
const vis=(p,s)=>p.locator(s).first().isVisible();
(async()=>{
  const b=await chromium.launch();let p=await acceso(b,1280);
  // Acceso
  T('en escritorio el acceso se parte en dos: panel de marca y formulario',await vis(p,'.authbg.split .authside')&&await vis(p,'#authbox'));
  {const a=await p.evaluate(()=>{const s=document.querySelector('.authside').getBoundingClientRect(),f=document.getElementById('authbox').getBoundingClientRect();return{sw:s.width,sx:s.x,fx:f.x,fw:f.width,vw:innerWidth};});
   T('el panel de marca ocupa más de la mitad izquierda y el formulario va a la derecha',a.sx===0&&a.sw>a.vw*0.5&&a.fx>a.sw);}
  T('el panel muestra el nombre, el titular y la boleta de ejemplo',/Tus cuentas,/.test(await p.innerText('.authside'))&&/cuadradas/.test(await p.innerText('.authside'))&&/datos de ejemplo/.test(await p.innerText('.authside')));
  T('el panel es decorativo (aria-hidden) y no cambia el nombre accesible del formulario',(await p.getAttribute('.authside','aria-hidden'))==='true'&&(await p.getAttribute('#authbox h2','aria-label'))==='MiSoles');
  await p.click('#au-up');await p.waitForTimeout(300);
  T('al pasar a «Crear cuenta» el panel se conserva y aparece el formulario nuevo',await vis(p,'.authside')&&await p.locator('#au-pass2').count()===1);
  await p.click('#au-sw');await p.waitForTimeout(300);
  T('y al volver a «Entrar» también',await vis(p,'.authside')&&await p.locator('#au-in').count()===1);
  T('sin errores de JavaScript (acceso)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await acceso(b,390);
  T('en celular el panel de marca no se ve y el formulario ocupa la pantalla',!(await vis(p,'.authside'))&&await vis(p,'#authbox'));
  await p.context().close();
  p=await acceso(b,1280,'en');
  T('en inglés se traduce el panel («Your accounts,», «balanced»)',/Your accounts,/.test(await p.innerText('.authside'))&&/balanced/.test(await p.innerText('.authside')));
  await p.context().close();

  // Resumen en bento
  p=await resumen(b,1280);
  const g={};for(const id of ['rf','rk','r1','r2','r3','r4','ins','r6','r7','r5','mg','rm']){g[id]=await box(p,id);}
  T('todas las tarjetas del Resumen se ven',Object.values(g).every(Boolean));
  const mismaFila=(...ids)=>ids.every(i=>Math.abs(g[i].y-g[ids[0]].y)<4);
  T('fila 1: fondo de emergencia (7) e indicadores (5) lado a lado',mismaFila('rf','rk')&&g.rf.w>g.rk.w&&Math.abs(g.rf.w/g.rk.w-7/5)<0.15);
  T('fila 2: gráfico principal (8) y ahorro sobre el ingreso (4)',mismaFila('r1','r2')&&Math.abs(g.r1.w/g.r2.w-2)<0.2);
  T('fila 3: tres tarjetas en fila (cotidianos, en qué se fue, en resumen)',mismaFila('r3','r4','ins')&&Math.abs(g.r3.w-g.r4.w)<4&&Math.abs(g.r4.w-g.ins.w)<4);
  T('fila 4: a dónde fue (7) y capital acumulado (5)',mismaFila('r6','r7')&&g.r6.w>g.r7.w);
  T('cada fila empieza donde termina la anterior, con «Metas de ahorro» como franja entera (sin huecos grandes)',g.r1.y>g.rf.y&&g.r3.y>g.r1.y&&g.r6.y>g.r3.y&&(g.r1.y-(g.mg.y+g.mg.h))<40&&(g.mg.y-(g.rf.y+Math.max(g.rf.h,g.rk.h)))<40&&(g.r3.y-(g.r1.y+Math.max(g.r1.h,g.r2.h)))<40&&(g.r6.y-(g.r3.y+Math.max(g.r3.h,g.r4.h,g.ins.h)))<40);
  T('los indicadores van en dos columnas (2×2)',await p.evaluate(()=>{const k=[...document.querySelectorAll('[data-cid="rk"] .kpi')].map(e=>Math.round(e.getBoundingClientRect().x));return k.length===4&&new Set(k).size===2;}));
  T('el número del fondo de emergencia es grande (editorial)',await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('[data-cid="rf"] .fond b')).fontSize)>=54));
  {const w=await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);T('sin desborde horizontal a 1280 px',w);}
  T('sin errores de JavaScript (Resumen)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await resumen(b,1100);
  {const a=await box(p,'rf'),k=await box(p,'rk');T('a 1100 px sigue siendo una fila 7/5 sin desbordar',a&&k&&Math.abs(a.y-k.y)<4&&await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));}
  await p.context().close();
  p=await resumen(b,390);
  {const ids=['rf','rk','r1','r2','r3','r4','ins','r6','r7'];const bx=[];for(const i of ids)bx.push(await box(p,i));
   T('en celular las tarjetas del Resumen siguen una debajo de otra, a todo el ancho',bx.every(x=>x&&x.w>330)&&bx.every((x,i)=>i===0||x.y>=bx[i-1].y+bx[i-1].h-2));}
  await p.context().close();
  p=await resumen(b,1280,'en');
  T('en inglés se traduce el Resumen (Emergency fund)',/Emergency fund/i.test(await p.innerText('[data-cid="rf"]')));
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
