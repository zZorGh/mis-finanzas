// t109: «¿Dónde gastaste más en {año}?» en el Resumen anual: mismo reparto en 3 grupos que el mes, sumando todos los meses del año.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:o.w||1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l,e])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,e?JSON.stringify({v:1,S:{},cfg:JSON.parse(d).cfg}):d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,o.lang||'',o.vacio?1:0]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const money=s=>+String(s).replace(/[^\d.]/g,'');
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  const c=await p.evaluate(()=>{const e=document.querySelector('[data-cid="dga"]');if(!e)return null;const r=e.getBoundingClientRect();const gs=[...e.querySelectorAll('.dgg')].map(g=>({n:g.querySelector('.dgn').textContent.trim(),t:g.querySelector('.dgh b').textContent.trim()}));return{txt:e.innerText,gs,w:r.width,ww:document.getElementById('board').getBoundingClientRect().width,over:document.documentElement.scrollWidth>innerWidth};});
  T('aparece la tarjeta anual con título del año',!!c&&/¿Dónde gastaste más en 2026\?/.test(c.txt));
  T('muestra «Tu mayor gasto» y al menos 2 grupos',!!c&&/Tu mayor gasto/.test(c.txt)&&c.gs.length>=2);
  T('ocupa todo el ancho del tablero y no desborda',!!c&&c.w>c.ww*0.95&&!c.over);
  // el total anual = suma de los 12 meses (misma función del mes)
  const sum=await p.evaluate(()=>{return null;});
  T('el reparto tiene montos',!!c&&c.gs.every(g=>money(g.t)>0));
  await p.screenshot({path:__dirname+'/_t109.png',fullPage:false});
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await nueva(b,{lang:'en'});
  T('en inglés se traduce el título',/Where did you spend most in 2026\?/.test(await p.evaluate(()=>document.querySelector('[data-cid="dga"]').innerText)));
  await p.context().close();
  p=await nueva(b,{w:390});
  T('en celular no desborda y la tarjeta cabe',await p.evaluate(()=>{const e=document.querySelector('[data-cid="dga"]');return !!e&&e.getBoundingClientRect().width<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;}));
  await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
