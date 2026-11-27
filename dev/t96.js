// t96: las 3 categorías principales (Necesidades, Deseos, Ahorro e inversión). La persona clasifica sus categorías en Ajustes y la tarjeta
// «¿Dónde gastas más?» del mes reparte lo gastado en esos grupos; la regla 50/30/20 usa la misma clasificación.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,hash,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const dg=p=>p.evaluate(()=>{const e=document.getElementById('dgbox');return e?e.innerText:'';});
const grp=(p,n)=>p.evaluate(n=>{const g=[...document.querySelectorAll('#dgbox .dgg')].find(x=>x.querySelector('.dgn').textContent.trim()===n);return g?{t:g.querySelector('.dgh b').textContent.trim(),items:[...g.querySelectorAll('li')].map(l=>l.children[0].textContent.trim())}:null;},n);
const cfgNow=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg,K);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,'#noviembre');
  // 1. Sin clasificar nada: la tarjeta existe y reparte por la regla de siempre
  T('aparece la tarjeta «¿Dónde gastas más?» en el mes',/¿Dónde gastas más\?/.test(await p.evaluate(()=>document.querySelector('[data-cid="dg"]').innerText)));
  {const n=await grp(p,'Necesidades'),w=await grp(p,'Deseos'),a=await grp(p,'Ahorro e inversión');
   T('los grupos listan los conceptos de sus gastos',!!n&&n.items.length>0&&!!w&&w.items.length>0&&!n.items.includes('Necesidad')&&!w.items.includes('Menú'));
   T('Ahorro e inversión muestra lo ahorrado e invertido del mes',!!a&&a.items.includes('Inversión'));}
  T('dice cuál es el mayor gasto del mes',/Tu mayor gasto\s*\S/.test((await dg(p)).replace(/\n/g,' ')));
  T('ya no pide clasificar nada',!/Sin clasificar/.test(await dg(p))&&await p.locator('#dgbox a[href="#ajustes"]').count()===0);
  const pu0=await p.evaluate(()=>document.getElementById('pu0').textContent);
  await p.context().close();

  // 2 y 3. La clasificación antigua (cfg.catGrupo) se sigue respetando: ver t127
  // 4. Datos dañados: valores inválidos se descartan
  p=await nueva(b,'#noviembre',{catGrupo:{'menú':'raro','TRANSPORTE':'ai',ocio:5}});
  {const w=await grp(p,'Deseos'),a=await grp(p,'Ahorro e inversión');const cap=s=>s.charAt(0).toUpperCase()+s.slice(1),de=k=>demo.S['2026'][10].hor.filter(r=>r.k===k).map(r=>cap(r.c));T('un grupo inválido se ignora (lo de «Menú» sigue en Deseos) y los nombres antiguos se leen sin importar mayúsculas (TRANSPORTE → Ahorro e inversión)',!!w&&w.items.some(x=>de('Menú').includes(x))&&!!a&&a.items.some(x=>de('Transporte').includes(x)));}
  T('sin errores con datos dañados',p.errs.length===0);
  await p.context().close();

  // 5. Inglés
  p=await nueva(b,'#noviembre',null,'en');
  {const x=await p.evaluate(()=>document.querySelector('[data-cid="dg"]').innerText);T('en inglés se traduce (Needs, Wants, Where do you spend the most?)',/Where do you spend the most\?/.test(x)&&/Needs/.test(x)&&/Wants/.test(x)&&!/Necesidades|Deseos/.test(x));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
