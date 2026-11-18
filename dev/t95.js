// t95: «Por pagar este mes». Los gastos recurrentes (cfg.rec) que aún no están registrados en el mes aparecen en una tarjeta; «Pagado» los registra con un toque.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const REC=[{sec:'fij',s:'fij',c:'T95 Colegio',m:50,k:'',src:'liq:0',f:5},{sec:'fij',s:'fij',c:'T95 Seguro',m:90,k:'',src:'liq:1',f:25},{sec:'fij',s:'fij',c:'Alquiler',m:800,k:'',src:'liq:0',f:1}];
const nueva=async(b,hash,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,{rec:REC},cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const liq=(p,i)=>p.evaluate(([k,i])=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[i].m,[K,i]);
const filas=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).filter(r=>r.c===c).length;},[K,c]);
const card=p=>p.evaluate(()=>{const e=document.querySelector('.ppcard');return e?e.innerText:'';});
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,'#noviembre');
  const c0=await card(p);
  T('aparece la tarjeta «Por pagar este mes» con los recurrentes que faltan',/Por pagar este mes/.test(c0)&&/T95 Colegio/.test(c0)&&/T95 Seguro/.test(c0));
  T('no aparece lo que ya está registrado en el mes (Alquiler)',!/Alquiler/.test(c0));
  T('muestra el estado de cada uno (vencido / vence / en N días)',/venció hace 12 días/.test(c0)&&/en 8 días/.test(c0));
  await p.click('[data-pay="0"]');await p.waitForTimeout(400);
  T('«Pagado» registra el gasto y lo descuenta de su cuenta (Yape 430 → 380)',await filas(p,'T95 Colegio')===1&&Math.abs((await liq(p,0))-380)<0.005);
  T('el gasto sale de la lista y queda el otro',!/Colegio/.test(await card(p))&&/T95 Seguro/.test(await card(p)));
  await p.evaluate(()=>{const b=document.querySelector('#toast button');if(b)b.click();});await p.waitForTimeout(400);
  T('Deshacer lo vuelve a poner por pagar y devuelve el saldo',await filas(p,'T95 Colegio')===0&&Math.abs((await liq(p,0))-430)<0.005&&/Colegio/.test(await card(p)));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // Sin saldo: abre el registro con el aviso en vez de dejar la cuenta en negativo
  p=await nueva(b,'#noviembre',{rec:[{sec:'fij',s:'fij',c:'T95 Grande',m:600,k:'',src:'liq:0',f:3}]});
  await p.click('[data-pay="0"]');await p.waitForTimeout(500);
  T('si no alcanza el saldo, abre el registro con el monto y el aviso (no lo guarda)',await p.locator('#sheet').count()===1&&await filas(p,'T95 Grande')===0&&/No te alcanza el saldo/.test(await p.evaluate(()=>document.getElementById('sshort').innerText))&&(await p.inputValue('#sa'))==='600');
  await p.context().close();

  // Meses pasados y otros años: no molesta
  p=await nueva(b,'#octubre');
  T('en un mes anterior al actual no aparece',(await card(p))==='');
  await p.context().close();
  p=await nueva(b,'#diciembre');
  T('en un mes futuro aparece como «Por pagar» con «día N»',/Por pagar/.test(await card(p))&&!/este mes/.test(await card(p))&&/día 5/.test(await card(p)));
  await p.context().close();

  // Sin recurrentes: no hay tarjeta
  p=await nueva(b,'#noviembre',{rec:[]});
  T('sin recurrentes no hay tarjeta',(await card(p))==='');
  await p.context().close();

  // Inglés
  p=await nueva(b,'#noviembre',null,'en');
  {const c=await card(p);T('en inglés se traduce («Due this month», «Paid»)',/Due this month/.test(c)&&/Paid/.test(c)&&/overdue/.test(c)&&!/Por pagar/.test(c));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
