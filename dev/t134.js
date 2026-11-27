// t134: al pasar el cursor, toda opción se sombrea con el color del estilo, sin confundirse con lo elegido y sin perder
// legibilidad. Recorre pantallas y ventanas en los 3 estilos, claro y oscuro. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const EXC=':disabled,[aria-pressed="true"],[aria-current],[aria-checked="true"],.p,.caplink,.cap-btn,.fab,.x,.capx,.dng';
(async()=>{
 const b=await chromium.launch();
 const mk=async(skin,theme,x)=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||1366,height:800},colorScheme:theme,reducedMotion:'reduce',hasTouch:!!x.touch,isMobile:!!x.touch});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,s])=>{localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');localStorage.setItem(k+'-skin',s);localStorage.setItem(k+'-src','liq:0');},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}),K,skin]);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app .card');
  await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});return p;};
 // Marca una muestra de controles visibles (uno de cada clase) y los recorre con el cursor
 const marca=(p,raiz)=>p.evaluate(([raiz,exc])=>{document.querySelectorAll('[data-h]').forEach(e=>e.removeAttribute('data-h'));
   const vistos={},r=[];let n=0;
   document.querySelectorAll(raiz.split(',').map(z=>['button','select','summary','label.chk','.mcard','a.tab','a.nav','a.cap-link'].map(s=>z+' '+s).join(',')).join(',')).forEach(e=>{
     const q=e.getBoundingClientRect();if(!q.width||!q.height||getComputedStyle(e).visibility==='hidden')return;
     const k=e.tagName+'.'+e.className+(e.matches(exc)?'!':'')+(e.closest('.liq')?'liq':'')+(e.closest('.hero')?'hero':'');
     if((vistos[k]=(vistos[k]||0)+1)>2)return;e.dataset.h=n;r.push({n:n++,k,exc:e.matches(exc)});});
   return r;},[raiz,EXC]);
 const lee=(p,n)=>p.evaluate(n=>{const e=document.querySelector('[data-h="'+n+'"]');const cv=document.createElement('canvas');cv.width=cv.height=1;const g=cv.getContext('2d',{willReadFrequently:true});
   const rgba=c=>{g.clearRect(0,0,1,1);g.fillStyle='#000';g.fillStyle=c;g.fillRect(0,0,1,1);const d=g.getImageData(0,0,1,1).data;return[d[0],d[1],d[2],d[3]/255];};
   const mezcla=(base,c)=>base.map((v,i)=>c[i]*c[3]+v*(1-c[3]));
   const capas=el=>{const l=[];for(let x=el;x;x=x.parentElement){const s=getComputedStyle(x),m=s.backgroundImage.startsWith('linear-gradient(color')?s.backgroundImage.match(/(color\([^)]*\)|rgba?\([^)]*\))/):null;if(m)l.push(rgba(m[1]));const c=rgba(s.backgroundColor);if(c[3]>0){l.push(c);if(c[3]>=.99)break;}}
     let r=matchMedia('(prefers-color-scheme: dark)').matches?[0,0,0]:[255,255,255];for(const c of l.reverse())r=mezcla(r,c);return r;};
   const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
   let min=99,quien='';const nodos=[e,...e.querySelectorAll('*')];
   for(const x of nodos){if(![...x.childNodes].some(t=>t.nodeType===3&&t.textContent.trim())||x.tagName==='OPTION')continue;if(!x.getClientRects().length)continue;
     const bg=capas(x),c=rgba(getComputedStyle(x).color),fg=mezcla(bg,c),a=L(fg),z=L(bg),q=(Math.max(a,z)+.05)/(Math.min(a,z)+.05);if(q<min){min=q;quien=x.textContent.trim().slice(0,24);}}
   const s=getComputedStyle(e);return{img:s.backgroundImage,color:s.backgroundColor,sombreado:s.backgroundImage.startsWith('linear-gradient(color'),min,quien};},n);
 const recorre=async(p,raiz,donde,res)=>{const l=await marca(p,raiz);
   for(const it of l){const loc=p.locator('[data-h="'+it.n+'"]');await p.mouse.move(1,799);const antes=await lee(p,it.n);
     try{await loc.hover({timeout:1200});}catch(e){continue;}
     const d=await lee(p,it.n);res.n++;
     if(it.exc){res.exc++;if(d.sombreado&&!antes.sombreado)res.elegidos.push(donde+' '+it.k);}
     else{if(!d.sombreado)res.sin.push(donde+' '+it.k);
       if(d.min<4.5&&d.min<antes.min-.05)res.bajo.push(donde+' '+it.k+' «'+d.quien+'» '+antes.min.toFixed(2)+'→'+d.min.toFixed(2));}}};
 const ir=async(p,h)=>{await p.evaluate(h=>location.hash=h,h);await p.waitForTimeout(350);};
 const esc=async p=>{await p.keyboard.press('Escape');await p.waitForTimeout(200);};
 for(const skin of ['cuadre','escalon','original'])for(const theme of ['light','dark']){
  const p=await mk(skin,theme),res={n:0,exc:0,sin:[],elegidos:[],bajo:[]},id=skin+' '+theme;
  await recorre(p,'#hdr,#app','mes',res);
  await ir(p,'resumen');await recorre(p,'#app','resumen',res);
  await ir(p,'ajustes');await recorre(p,'#app','ajustes',res);
  await ir(p,'noviembre');await p.mouse.move(1,799);await p.click('.caplink');await p.waitForSelector('#sheet');await recorre(p,'#sheet','registro',res);
  await p.click('#stype [data-g="ahorro"]');await p.waitForTimeout(200);await recorre(p,'#sheet','registro ahorro',res);await esc(p);
  await p.click('[data-act="hist"] >> nth=0').catch(()=>{});await p.waitForTimeout(250);if(await p.locator('#sheet').count()){await recorre(p,'#sheet','historial',res);await esc(p);}
  // Manual por pasos, Automático, atajos, reporte y modo «Editar»
  const abre=async()=>{await ir(p,'noviembre');await p.mouse.move(1,799);await p.click('.caplink');await p.waitForSelector('#sheet');};
  for(const [sel,n] of [['#sheet [data-smode="manual"], #sheet .modeb >> nth=0','manual'],['#sheet [data-smode="auto"], #sheet .modeb >> nth=1','automático']]){await abre();const l=p.locator('#sheet .modeb');if(await l.count()){await l.nth(n==='manual'?0:1).click();await p.waitForTimeout(250);await recorre(p,'#sheet',n,res);}await esc(p);}
  await ir(p,'noviembre');await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.keyboard.press('Shift+?');await p.waitForTimeout(250);if(await p.locator('#sheet').count()){await recorre(p,'#sheet','atajos',res);await esc(p);}
  await ir(p,'ajustes');await p.click('#app [data-act="rep"]');await p.waitForTimeout(300);if(await p.locator('#sheet').count()){await recorre(p,'#sheet','reporte',res);await esc(p);}
  await ir(p,'noviembre');await p.mouse.move(1,799);const ed=p.locator('#app [data-act="edit"]').first();if(await ed.count()){await ed.click();await p.waitForTimeout(350);await recorre(p,'#app','editar',res);}
  // Ventana de importar (sus listas tenían un fondo que tapaba el sombreado)
  await ir(p,'ajustes');await p.setInputFiles('#imp-file',{name:'b.csv',mimeType:'text/csv',buffer:Buffer.from(['Fecha,Descripcion,Monto','05/11/2026,Prueba uno,-12.50','06/11/2026,Prueba dos,-30.00'].join(String.fromCharCode(10)))});await p.waitForTimeout(700);
  T(id+': se abre la ventana de importar',await p.locator('#impbg').count()===1);await recorre(p,'#impbg','importar',res);
  T(id+': hay controles suficientes ('+res.n+')',res.n>40&&res.exc>3);
  T(id+': toda opción se sombrea',!res.sin.length);if(res.sin.length)console.log([...new Set(res.sin)].join('\n'));
  T(id+': lo elegido, lo lleno y lo desactivado no cambian',!res.elegidos.length);if(res.elegidos.length)console.log([...new Set(res.elegidos)].join('\n'));
  T(id+': el sombreado no deja textos por debajo de 4.5:1',!res.bajo.length);if(res.bajo.length)console.log([...new Set(res.bajo)].join('\n'));
  T(id+': sin errores',!p.errs.length);if(p.errs.length)console.log(p.errs.slice(0,3));
  await p.context().close();}
 {const p=await mk('cuadre','light',{w:390,touch:true});T('en celular no hay sombreado al tocar',await p.evaluate(()=>!matchMedia('(hover:hover) and (pointer:fine)').matches));await p.context().close();}
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
