// t117: el saldo anterior de las tarjetas se trae solo al mes actual al abrir la app (si no hay saldo anotado); no toca lo que la persona ya puso, ni meses pasados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const C=(c,m,f,card)=>({c,m,f,k:card?'Pago tarjeta':'',src:'',card:card||'',cur:'',t:''});
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-19T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const S=JSON.parse(JSON.stringify(demo.S));const O=S['2026'][9],N=S['2026'][10];
  O.bbva=[C('Compra',300,'5-oct')];O.copen={bbva:0};O.fij=(O.fij||[]).filter(r=>!r.card).concat([C('Pago BBVA',100,'20-oct','bbva')]);
  N.bbva=o.compras?[C('Compra nov',40,'3-nov')]:[];N.fij=(N.fij||[]).filter(r=>!r.card);delete N.copen;if(o.copen!=null)N.copen={bbva:o.copen};
  await p.addInitScript(([d,k])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');}},[JSON.stringify({v:1,S,cfg:Object.assign({},demo.cfg,{alerta:5000})}),K]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.hash||'#noviembre'));await p.waitForSelector('#app');await p.waitForTimeout(1000);return p;};
const copen=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].copen,K);
const deuda=p=>p.evaluate(()=>(document.getElementById('cd-bbva')||{}).textContent||'');
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  T('octubre termina debiendo 200 (300 − 100) y noviembre lo trae solo',((await copen(p))||{}).bbva===200&&/200\.00/.test(await deuda(p)));
  T('avisa con un mensaje lo que trajo',/Traje del mes anterior/.test(await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'')));
  T('sin errores de JavaScript',p.errs.length===0);await p.context().close();
  p=await nueva(b,{compras:true});T('si noviembre ya tiene consumos, la deuda anterior se suma igual (200 + 40)',((await copen(p))||{}).bbva===200&&/240\.00/.test(await deuda(p)));await p.context().close();
  p=await nueva(b,{copen:0});T('si la persona anotó 0 a propósito, se respeta',((await copen(p))||{}).bbva===0&&/0\.00/.test(await deuda(p)));await p.context().close();
  p=await nueva(b,{copen:75});T('si ya anotó un saldo (75), se respeta',((await copen(p))||{}).bbva===75);await p.context().close();
  // Desde el 28 nov. 2026 la deuda llega al mes en curso al abrir la app, se mire el mes que se mire; el mes pasado no se toca
  p=await nueva(b,{hash:'#octubre'});{const oct=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][9],K);T('mirando octubre: octubre no cambia y noviembre (el mes en curso) ya tiene la deuda',oct.copen.bbva===0&&oct.bbva.length===1&&((await copen(p))||{}).bbva===200);}await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
