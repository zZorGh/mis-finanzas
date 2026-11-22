// t126: la versión para Cloudflare solo lleva archivos públicos, usa misoles.pe, trae cabeceras y abre sin errores desde la raíz.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),{execFileSync}=require('child_process');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const OUT=fs.mkdtempSync(path.join(os.tmpdir(),'cf-'));
const lista=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?lista(path.join(d,e.name)):[path.join(d,e.name)]);
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain'};
(async()=>{
 const repo=path.join(__dirname,'..'),antes=fs.readFileSync(repo+'/index.html','utf8');
 execFileSync(process.execPath,[path.join(__dirname,'cf-build.js')],{env:{...process.env,CF_OUT:OUT},stdio:'ignore'});
 const rel=lista(OUT).map(f=>path.relative(OUT,f).replace(/\\/g,'/'));
 T('1 sin archivos internos',!rel.some(f=>/^(dev|supabase|docs|\.git)\/|^(CLAUDE|CUADRA|README)|\.json$|\.sql$/i.test(f)));T('1 trae lo público',['index.html','legal.html','sw.js','manifest.webmanifest','reportes.js','inicio/index.html','robots.txt','sitemap.xml','_headers'].every(f=>rel.includes(f)));
 T('2 repo intacto',fs.readFileSync(repo+'/index.html','utf8')===antes);
 const txt=rel.filter(f=>/\.(html|js|webmanifest|txt|xml)$/.test(f));T('2 sin la dirección anterior',!txt.some(f=>fs.readFileSync(path.join(OUT,f),'utf8').includes('zzorgh.github.io')));T('2 enlaces nuevos',fs.readFileSync(OUT+'/sitemap.xml','utf8').includes('https://misoles.pe/inicio/')&&fs.readFileSync(OUT+'/sitemap.xml','utf8').includes('https://misoles.pe/legal<'));
 const h=fs.readFileSync(OUT+'/_headers','utf8');T('3 cabeceras',["frame-ancestors 'none'",'nosniff','microphone=(self)','Strict-Transport-Security','Cross-Origin-Opener-Policy'].every(x=>h.includes(x)));
 const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(OUT,u);if(!f.startsWith(OUT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','x-frame-options':'DENY','cross-origin-opener-policy':'same-origin'});fs.createReadStream(f).pipe(r);});
 await new Promise(a=>srv.listen(8791,'127.0.0.1',a));
 const b=await chromium.launch(),c=await b.newContext({viewport:{width:1280,height:900}});await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8791')?r.continue():r.abort());
 for(const u of ['/','/inicio/','/legal.html']){const p=await c.newPage(),e=[],n=[];p.on('pageerror',x=>e.push(x.message));p.on('response',x=>{if(x.status()===404&&x.url().startsWith('http://127.0.0.1:8791'))n.push(x.url());});await p.goto('http://127.0.0.1:8791'+u);await p.waitForTimeout(500);T('4 sin 404 en '+u,!n.length);T('4 sin error propio en '+u,!e.some(x=>!/supabase|Chart|fetch|network/i.test(x)));await p.close();}
 const p=await c.newPage();const m=await p.goto('http://127.0.0.1:8791/manifest.webmanifest');T('5 manifiesto en la raíz',(await m.json()).scope==='./');
 const assets=await p.evaluate(async()=>{const t=await (await fetch('/sw.js')).text(),l=(/const ASSETS = \[([\s\S]*?)\]/.exec(t)||[])[1]||'',a=[...l.matchAll(/'(\.\/[^']*)'/g)].map(x=>x[1]);const o=[];for(const u of a)o.push([u,(await fetch(u)).status]);return o;});T('5 todo lo que guarda el service worker existe',assets.length>0&&assets.every(x=>x[1]===200));T('5 no precarga rutas .html',!assets.some(x=>/\.html$/.test(x[0])));if(assets.some(x=>/\.html$/.test(x[0])))console.log(assets.filter(x=>/\.html$/.test(x[0])));
 await b.close();srv.close();fs.rmSync(OUT,{recursive:true,force:true});
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
