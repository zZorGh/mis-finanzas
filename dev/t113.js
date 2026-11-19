// t113: avisos proactivos del mes en curso («Para tener en cuenta»): cotidianos a ritmo de pasarse, cuenta en negativo, tarjeta por pagar y meta de ahorro.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:o.w||1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date(o.fecha||'2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const S=JSON.parse(JSON.stringify(demo.S));if(o.liqNeg)S['2026'][10].liq[3].m=-25;
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S,cfg:Object.assign({},demo.cfg,o.cfg||{})}),K,o.lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.hash||'#noviembre'));await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const av=p=>p.evaluate(()=>{const e=document.querySelector('.avcard');return e?{txt:e.innerText,n:e.querySelectorAll('.av').length,over:document.documentElement.scrollWidth>innerWidth}:null;});
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);let a=await av(p);
  T('a ritmo de pasarse en cotidianos (485 en 17 días → ≈ 855 > alerta 800): avisa',!!a&&/A este ritmo cerrarás cotidianos/.test(a.txt)&&/Quedan 13 días/.test(a.txt));
  T('no desborda',!!a&&!a.over);
  await p.context().close();
  p=await nueva(b,{cfg:{alerta:400}});a=await av(p);T('si ya pasó la alerta: «Ya pasaste tu alerta»',!!a&&/Ya pasaste tu alerta de gastos cotidianos/.test(a.txt));await p.context().close();
  p=await nueva(b,{cfg:{alerta:5000}});a=await av(p);T('sin motivo, no aparece la tarjeta',!a);await p.context().close();
  p=await nueva(b,{cfg:{alerta:5000},liqNeg:true});a=await av(p);T('una cuenta en negativo se avisa',!!a&&/«Efectivo monedas» está en negativo/.test(a.txt));await p.context().close();
  p=await nueva(b,{cfg:{alerta:5000,pagoDia:{bbva:19}}});a=await av(p);
  T('tarjeta con pago en 2 días y deuda: avisa «Pagas BBVA en 2 días»',!!a&&/Pagas BBVA en 2 días: debes/.test(a.txt));await p.context().close();
  p=await nueva(b,{cfg:{alerta:5000},fecha:'2026-11-25T15:00:00-05:00'});a=await av(p);
  T('pasado el día 20 sin llegar a la meta de ahorro (0% de 20%): avisa',!!a&&/Llevas ahorrado el 0% de tu ingreso; tu meta es 20%/.test(a.txt));await p.context().close();
  p=await nueva(b,{hash:'#octubre'});a=await av(p);T('en otro mes no hay avisos',!a);await p.context().close();
  // ocultar por hoy
  p=await nueva(b);await p.click('[data-avx]');await p.waitForTimeout(200);T('«Entendido por hoy» la oculta',!(await av(p)));
  await p.reload();await p.waitForTimeout(900);T('sigue oculta al recargar el mismo día',!(await av(p)));
  const k=await p.evaluate(k=>localStorage.getItem(k+'-avisos'),K);T('se guarda con la clave de datos (se borra al cerrar sesión)',/^\d+-nov$/.test(k||''));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);await p.context().close();
  p=await nueva(b,{w:390});a=await av(p);T('en celular cabe sin desbordar',!!a&&!a.over);await p.context().close();
  p=await nueva(b,{lang:'en'});a=await av(p);T('en inglés se traduce',!!a&&/Worth noting/.test(a.txt)&&/At this pace you'll close everyday spending at/.test(a.txt)&&!/cerrarás/.test(a.txt));await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
