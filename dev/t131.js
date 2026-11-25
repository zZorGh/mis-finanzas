// t131: la web oficial usa la base real; cualquier otra copia usa la de PRUEBAS y lo avisa. Sin red: todo se intercepta.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const PROD='https://lmjhlghwthydpeismulb.supabase.co',PRUEBA='https://qfnqqhwfzzmheztcarbo.supabase.co';
const raiz=path.join(__dirname,'..');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const stub=`window.__urls=[];window.supabase={createClient:u=>{window.__urls.push(u);return {auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({}),rpc:()=>Promise.resolve({})};}};`;
(async()=>{
 const b=await chromium.launch();
 const wrap=fs.readFileSync(path.join(__dirname,'wrap-repo.html'),'utf8'),landing=fs.readFileSync(path.join(raiz,'inicio','index.html'),'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,'');
 // Abre la app o la landing bajo el host que se pida, sin salir a internet
 const abre=async(base,pagina,webdriver)=>{
  const c=await b.newContext();const p=await c.newPage();p.errs=[];p.pedidos=[];p.on('pageerror',e=>p.errs.push(e.message));
  await c.route('**/*',r=>{const u=r.request().url();p.pedidos.push(u);
    if(u.startsWith(base)&&/\/(index\.html|inicio\/)?(\?|#|$)/.test(u.slice(base.length-1)))return r.fulfill({contentType:'text/html;charset=utf-8',body:pagina});
    if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});
    if(u.includes('/rest/v1/lista_espera'))return r.fulfill({status:201,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'},body:''});
    return r.abort();});
  await p.addInitScript(stub);
  if(webdriver===false)await p.addInitScript(()=>Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false,configurable:true}));
  await p.goto(base);await p.waitForTimeout(900);return p;};
 const urls=p=>p.evaluate(()=>window.__urls);
 // App
 let p=await abre('https://zzorgh.github.io/mis-finanzas/',wrap,false);T('1 la web oficial usa la base real',(await urls(p))[0]===PROD);T('2 sin aviso en la web oficial',!(await p.locator('#avpruebas').count()));T('sin errores 1',!p.errs.length);await p.context().close();
 p=await abre('https://misoles.pe/',wrap,false);T('3 el dominio nuevo también es producción',(await urls(p))[0]===PROD);await p.context().close();
 p=await abre('http://localhost:8765/',wrap,false);T('4 en la computadora usa la base de pruebas',(await urls(p))[0]===PRUEBA);T('5 y avisa que son pruebas',/PRUEBAS/.test(await p.innerText('#avpruebas')));await p.context().close();
 p=await abre('https://rama.misoles.pages.dev/',wrap,false);T('6 una previsualización de Cloudflare usa pruebas',(await urls(p))[0]===PRUEBA);await p.context().close();
 p=await abre('https://zzorgh.github.io.evil.example/',wrap,false);T('7 un host parecido no cuenta como producción',(await urls(p))[0]===PRUEBA);await p.context().close();
 p=await abre('http://localhost:8765/',wrap);T('8 el aviso no aparece en pruebas automatizadas',!(await p.locator('#avpruebas').count()));await p.context().close();
 // Landing: la lista de espera va al mismo entorno
 for(const [n,base,esp] of [['9 la landing oficial apunta a la base real','https://zzorgh.github.io/mis-finanzas/inicio/',PROD],['10 la landing local apunta a pruebas','http://localhost:8765/inicio/',PRUEBA]]){
  p=await abre(base,landing);await p.fill('#w-n','Prueba');await p.fill('#w-e','prueba@example.com');await p.evaluate(()=>document.getElementById('wf').requestSubmit());await p.waitForTimeout(500);
  const q=p.pedidos.filter(u=>u.includes('/rest/v1/lista_espera'));T(n,q.length>0&&q.every(u=>u.startsWith(esp)));await p.context().close();}
 // La política de seguridad permite las dos bases
 const csp=f=>(fs.readFileSync(path.join(raiz,f),'utf8').match(/connect-src[^;"]*/)||[''])[0];
 T('11 la CSP de la app permite ambas',csp('index.html').includes(PROD)&&csp('index.html').includes(PRUEBA)&&csp('index.html').includes('wss://qfnqqhwfzzmheztcarbo'));
 T('12 la CSP de la landing permite ambas',csp('inicio/index.html').includes(PROD)&&csp('inicio/index.html').includes(PRUEBA));
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
