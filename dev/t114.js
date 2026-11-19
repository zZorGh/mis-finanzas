// t114: «Tu semana» en el mes en curso: gastado en los últimos 7 días contra los 7 anteriores, categoría y día de más gasto, y antojos. Cruza de mes si hace falta.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const R=(c,m,f,k,x)=>Object.assign({c,m,f,k,src:'liq:0'},x||{});
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:o.w||1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date(o.fecha||'2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const S=JSON.parse(JSON.stringify(demo.S));
  if(!o.demo){S['2026'][10].hor=[R('Almuerzos',100,'12-nov','Menú'),R('Taxi',50,'15-nov','Transporte'),R('Cena',80,'5-nov','Menú'),R('Helado',20,'16-nov','Deseo',{t:'ant',v:0})];S['2026'][10].fij=[R('Gym',30,'16-nov','Salud')];}
  if(o.cruce){S['2026'][10].hor=[R('Pan',40,'28-nov','Menú'),R('Cena vieja',10,'20-nov','Menú')];S['2026'][10].fij=[];S['2026'][11].hor=[R('Café',60,'1-dic','Menú')];S['2026'][11].fij=[];}
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S,cfg:Object.assign({},demo.cfg,{alerta:5000})}),K,o.lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.hash||'#noviembre'));await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const sem=p=>p.evaluate(()=>{const e=document.querySelector('[data-cid="sem"]');if(!e)return null;const r=e.getBoundingClientRect();return{txt:e.innerText.replace(/\n+/g,' | '),w:r.width,over:document.documentElement.scrollWidth>innerWidth,vis:e.offsetParent!==null};});
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);let s=await sem(p);
  T('aparece «Tu semana»',!!s&&/Tu semana/.test(s.txt));
  T('gastaste 200 esta semana (100+50+30+20), 150% más que la anterior (80)',!!s&&/Gastaste \| S\/ 200\.00/.test(s.txt)&&/▲ 150% más que la semana pasada \(S\/ 80\.00\)/.test(s.txt));
  T('mayor categoría: Menú 100 (50%)',!!s&&/Menú \| S\/ 100\.00 · 50% de la semana/.test(s.txt));
  T('día de más gasto: jueves (12-nov) con 100',!!s&&/Jueves \| S\/ 100\.00/.test(s.txt));
  T('antojos: S/ 20 que no valieron la pena',!!s&&/Antojos \| S\/ 20\.00 \| No valieron la pena: S\/ 20\.00/.test(s.txt));
  T('ocupa todo el ancho del tablero y no desborda',!!s&&s.w>1200&&!s.over);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await nueva(b,{cruce:true,fecha:'2026-12-02T15:00:00-05:00',hash:'#diciembre'});s=await sem(p);
  T('cruzando de mes: del 26 nov al 2 dic suma 40 + 60 = 100 y la semana anterior (20-nov, 10) da +900%',!!s&&/Gastaste \| S\/ 100\.00/.test(s.txt)&&/▲ 900% más que la semana pasada \(S\/ 10\.00\)/.test(s.txt));
  await p.context().close();
  p=await nueva(b,{hash:'#octubre'});T('en otro mes no aparece',!(await sem(p)));await p.context().close();
  p=await nueva(b,{w:390});s=await sem(p);T('en celular se ve en «Resumen» sin desbordar',!!s&&s.vis&&!s.over);await p.context().close();
  p=await nueva(b,{lang:'en'});s=await sem(p);T('en inglés se traduce',!!s&&/Your week/.test(s.txt)&&/Highest-spending day \| Thursday/.test(s.txt)&&/150% more than last week/.test(s.txt)&&/Where you spent most/.test(s.txt));await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
