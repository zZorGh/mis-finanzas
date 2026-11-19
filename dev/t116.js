// t116: tarjetas con día de corte y de pago: el estado de cuenta calcula lo del periodo, «Pagar» propone solo eso y lo posterior al corte queda para el siguiente periodo.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const C=(c,m,f)=>({c,m,f,k:'',src:'',card:'',cur:'',t:''});
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:o.w||1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date(o.fecha||'2026-11-19T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const S=JSON.parse(JSON.stringify(demo.S));const cfg=Object.assign({},demo.cfg,{alerta:5000,credito:{bbva:2000,bcp:0,oh:0},corteDia:o.sinCorte?{}:{bbva:o.corte||15},pagoDia:{bbva:o.pago||22}});
  if(o.cruce){S['2026'][10].bbva=[C('Compra A',100,'10-nov'),C('Compra B',40,'29-nov')];S['2026'][10].copen={bbva:0};S['2026'][11].bbva=[C('Compra C',60,'1-dic')];S['2026'][11].copen={bbva:140};S['2026'][11].fij=[];}
  else{S['2026'][10].bbva=[C('Compra A',200,'10-nov'),C('Compra B',50,'18-nov'),C('Compra C',30,'15-nov')];S['2026'][10].copen={bbva:100};}
  S['2026'][10].fij=(S['2026'][10].fij||[]).filter(r=>!r.card);
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S,cfg}),K,o.lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.hash||'#noviembre'));await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const info=p=>p.evaluate(()=>{const e=document.getElementById('cp-bbva');return e?e.innerText.replace(/\n+/g,' | '):'';});
const deuda=p=>p.evaluate(()=>(document.getElementById('cd-bbva')||{}).textContent||'');
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // deuda total: saldo anterior 100 + 200 + 50 + 30 = 380; lo de después del corte (15-nov): 50; el periodo es 330
  T('la deuda total sigue siendo 380 (100 + 280)',/380\.00/.test(await deuda(p)));
  let t=await info(p);
  T('el estado de cuenta dice el corte (15 de noviembre) y A pagar este periodo: 330',/Corte del 15 de noviembre/.test(t)&&/A pagar este periodo: S\/ 330\.00/.test(t));
  T('lo consumido después del corte (50) se avisa como del siguiente periodo',/Desde el corte llevas S\/ 50\.00/.test(t)&&/siguiente periodo/.test(t));
  T('la fecha de pago es el 22 de noviembre, en 3 días',/22 de noviembre/.test(t)&&/en 3 días/.test(t));
  T('aparece el aviso «Pagas BBVA en 3 días» con el monto del periodo (330), no el total',/Pagas BBVA en 3 días: debes S\/ 330\.00 del corte del 15 de noviembre/.test(await p.evaluate(()=>(document.querySelector('.avcard')||{innerText:''}).innerText)));
  // Pagar propone solo el periodo
  await p.click('[data-act="pagar"][data-card="bbva"]');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  T('«Pagar» propone 330.00 (solo el periodo), no 380',(await p.inputValue('#sa'))==='330.00');
  T('la hoja explica el corte y que lo de después va al siguiente periodo',/Corte del 15 de noviembre: toca pagar S\/ 330\.00/.test(await p.innerText('#spagox'))&&/Lo de después del corte \(S\/ 50\.00\) va al siguiente periodo/.test(await p.innerText('#spagox'))&&!/Es más que/.test(await p.innerText('#spagox')));
  await p.fill('#sa','380');await p.waitForTimeout(200);
  T('si escribes más que el periodo (380 > 330) avisa que el resto adelanta el siguiente',/Es más que lo del periodo/.test(await p.innerText('#spagox')));
  await p.fill('#sa','330');await p.waitForTimeout(200);
  T('con el monto del periodo el aviso desaparece',!/Es más que/.test(await p.innerText('#spagox')));
  await p.click('#ssrc [data-src="liq:0"]');await p.waitForTimeout(250);
  const antes=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[0].m,K);
  await p.click('[data-s="save"]');await p.waitForTimeout(450);
  const desp=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[0].m,K);
  T('la cuenta baja solo 330 (lo del periodo)',Math.abs((antes-desp)-330)<0.005);
  T('después de pagar la deuda queda en 50 (lo del siguiente periodo)',/50\.00/.test(await deuda(p))&&!/380\.00/.test(await deuda(p)));
  t=await info(p);
  T('el periodo queda saldado («sin saldo por pagar») y se sigue avisando el consumo posterior',/sin saldo por pagar/.test(t)&&/Desde el corte llevas S\/ 50\.00/.test(t));
  T('ya no hay aviso de pago urgente',!/Pagas BBVA/.test(await p.evaluate(()=>(document.querySelector('.avcard')||{innerText:''}).innerText)));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  // sin día de corte: todo como antes (propone la deuda completa)
  p=await nueva(b,{sinCorte:true});
  T('sin día de corte no aparece estado de cuenta',!/Corte del/.test(await info(p)));
  await p.click('[data-act="pagar"][data-card="bbva"]');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  T('sin día de corte «Pagar» propone toda la deuda (380)',(await p.inputValue('#sa'))==='380.00');
  await p.context().close();
  // cruza de mes: corte 28; hoy 3 dic; periodo = 140 + 100 de nov... compras después del corte: 29-nov (40) y 1-dic (60)
  p=await nueva(b,{cruce:true,corte:28,pago:10,fecha:'2026-12-03T15:00:00-05:00',hash:'#diciembre'});
  t=await info(p);
  T('cruzando de mes: deuda 200, después del corte 100 (29-nov y 1-dic), a pagar 100',/200\.00/.test(await deuda(p))&&/Corte del 28 de noviembre · A pagar este periodo: S\/ 100\.00/.test(t)&&/Desde el corte llevas S\/ 100\.00/.test(t));
  T('la fecha de pago es el 10 de diciembre',/10 de diciembre/.test(t));
  await p.context().close();
  // en otro mes solo se recuerdan los días
  p=await nueva(b,{hash:'#octubre'});t=await info(p);
  T('en otro mes solo se muestran los días de corte y de pago',/Día de corte: 15 · Día de pago: 22 de cada mes/.test(t));await p.context().close();
  // capturar el día de corte desde la tarjeta
  p=await nueva(b,{sinCorte:true});
  await p.evaluate(()=>{const d=document.querySelector('.cardcfg');if(d)d.open=true;});
  await p.fill('[data-cortedia="bbva"]','15');await p.dispatchEvent('[data-cortedia="bbva"]','change');await p.waitForTimeout(500);
  T('escribir el día de corte lo guarda en la configuración y recalcula',(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg.corteDia,K)||{}).bbva===15&&/Corte del 15 de noviembre/.test(await info(p)));
  await p.context().close();
  p=await nueva(b,{lang:'en'});t=await info(p);
  T('en inglés se traduce',/Cut-off on 15 de noviembre|Cut-off on 15/.test(t)&&/Due this period: S\/ 330\.00/.test(t)&&/goes to the next period/.test(t)&&/You pay BBVA in 3 days: you owe S\/ 330\.00 from the/.test(await p.evaluate(()=>(document.querySelector('.avcard')||{innerText:''}).innerText)));await p.context().close();
  p=await nueva(b,{w:390});t=await info(p);
  T('en celular el estado de cuenta no desborda',!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
