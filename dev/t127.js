// t127: categorías que se adaptan, con los 3 grupos fijos. Sugerencias, orden por uso, renombrar, unir, borrar y que no cambien totales pasados. Solo datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const base=()=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}));const m=d.S['2026'][10];m.hor.push({c:'Peluquería Sol',m:40,f:'5-nov',k:'Cuidado'},{c:'Peluquería Sol',m:40,f:'9-nov',k:'Cuidado'},{c:'constructor',m:5,f:'9-nov',k:'constructor'});return d;};
(async()=>{
 const b=await chromium.launch();
 const mk=async x=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||390,height:844},locale:'es-PE',timezoneId:'America/Lima'});await c.clock.setFixedTime(new Date('2026-11-22T12:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify(x.d||base()),K,x.lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(x.h||'#noviembre'));await p.waitForSelector(x.h==='#ajustes'?'.cgn':'#board');await p.waitForTimeout(250);return p;};
 const J=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);const W=p=>p.waitForTimeout(200);
 const fila=async(p,c)=>{const m=(await J(p)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c);};
 const auto=async(p,t)=>{await p.click('#fab');await p.waitForSelector('#sheet');await W(p);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg',t);await W(p);};
 const hastaCat=async(p,tp)=>{await p.click('#fab');await p.waitForSelector('#sheet');await W(p);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="'+tp+'"]');await W(p);};

 // Automático
 let p=await mk();const pu0=await p.evaluate(()=>document.getElementById('pu0').textContent);
 await auto(p,'taxi 15 soles yape');T('1 sugiere por pista',await p.inputValue('#sacat')==='Transporte');await p.click('[data-s="save"]');await W(p);let r=await fila(p,'Taxi');T('1 guarda la categoría',r&&r.k==='Transporte');
 let j=await J(p);T('1 no reclasifica una categoría existente',!('transporte' in (j.cfg.catGrupo||{})));
 await auto(p,'peluquería sol 40 soles yape');T('2 aprende del historial',await p.inputValue('#sacat')==='Cuidado');await p.selectOption('#sacat','Salud');await p.fill('#smsg','peluquería sol 41 soles yape');await W(p);T('2 respeta lo que eligió la persona',await p.inputValue('#sacat')==='Salud');await p.keyboard.press('Escape');await W(p);
 await auto(p,'netflix 44 soles yape');T('3 categoría nueva propuesta',await p.inputValue('#sacat')==='Suscripciones');T('3 aún no se crea',!(await J(p)).cfg.cats.includes('Suscripciones'));await p.click('[data-s="save"]');await W(p);j=await J(p);T('3 se crea al guardar con su grupo',j.cfg.cats.includes('Suscripciones')&&j.cfg.catGrupo.suscripciones==='want');
 await auto(p,'almuerzo 20 yape y taxi 10 yape');T('4 varios muestran categorías',/Categorías/.test(await p.innerText('#sapv')));await p.click('[data-s="save"]');await W(p);T('4 varios guardan su categoría',(await fila(p,'Almuerzo')||{}).k==='Menú');
 await auto(p,'antojo helado 9 yape');T('5 antojo sin selector',!(await p.locator('#sacat').count()));await p.click('[data-s="save"]');await W(p);T('5 antojo sin categoría forzada',(await fila(p,'Helado')||{}).k==='');
 T('sin errores 1',!p.errs.length);await p.context().close();

 // Manual
 p=await mk();await hastaCat(p,'ant');T('6 antojo salta el grupo',await p.getAttribute('#sheet','data-step')==='cat');await p.click('#scat2o [data-sc="Alquiler"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa','7');await p.fill('#sd','T127 gusto');await p.click('[data-s="save"]');await W(p);j=await J(p);T('6 antojo no reclasifica',!('alquiler' in (j.cfg.catGrupo||{})));
 await hastaCat(p,'hor');await p.click('#sgrp [data-sgrp="need"]');await W(p);await p.click('#swnav [data-wz="skip"], [data-scatskip]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa','12');await p.fill('#sd','taxi aeropuerto');await W(p);T('7 manual sugiere',/Transporte/.test(await p.innerText('#scsug')));await p.click('[data-scsug]');await W(p);T('7 al usar desaparece',!(await p.locator('#scsug.on').count()));await p.click('[data-s="save"]');await W(p);T('7 guarda',(await fila(p,'taxi aeropuerto')||{}).k==='Transporte');T('sin errores 2',!p.errs.length);await p.context().close();

 // Ajustes
 p=await mk({h:'#ajustes'});j=await J(p);
 T('8 adopta categorías de movimientos',await p.locator('.cgn[value="Cuidado"]').count()===1);
 const nInput=n=>p.locator('.cgn[value="'+n+'"]');
 await nInput('Cuidado').fill('Belleza');await nInput('Cuidado').press('Tab').catch(()=>{});await W(p);j=await J(p);T('9 renombra en movimientos',j.S['2026'][10].hor.filter(r=>r.k==='Belleza').length===2&&!j.cfg.cats.includes('Cuidado'));
 await p.locator('.cgn[value="Belleza"]').fill('salud');await p.keyboard.press('Tab');await W(p);j=await J(p);T('10 une sin duplicar',j.S['2026'][10].hor.filter(r=>r.k==='Salud').length===2&&!j.cfg.cats.includes('Belleza')&&j.cfg.cats.filter(c=>c.toLowerCase()==='salud').length===1);
 const usada=j.cfg.cats.indexOf('Salud');await p.click('button[data-cat="'+usada+'"]');await W(p);T('11 no borra una usada',(await J(p)).cfg.cats.includes('Salud'));
 await p.fill('#nc','OCIO');await p.click('#addcat');await W(p);T('12 no duplica por mayúsculas',(await J(p)).cfg.cats.filter(c=>c.toLowerCase()==='ocio').length===1);
 T('13 sin desborde a 390',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));T('sin errores 3',!p.errs.length);await p.context().close();

 // Totales
 p=await mk();T('14 abrir no cambia el 50/30/20',await p.evaluate(()=>document.getElementById('pu0').textContent)===pu0);
 const dg=await p.evaluate(()=>document.getElementById('dgbox').innerText);T('15 categoría «constructor» no rompe el reparto',/constructor/.test(dg));T('sin errores 4',!p.errs.length);await p.context().close();
 const soloPago=base();const mp=soloPago.S['2026'][10];mp.fij=[{c:'Pago BBVA',m:100,f:'5-nov',k:'Pago tarjeta',card:'bbva'}];mp.hor=[{c:'x',m:10,f:'5-nov',k:'Ocio'}];soloPago.cfg.catGrupo={ocio:'want'};
 p=await mk({d:soloPago});T('16 pago de tarjeta no sale como sin clasificar',!/Sin clasificar/.test(await p.evaluate(()=>document.getElementById('dgbox').innerText)));await p.context().close();
 p=await mk({h:'#ajustes',lang:'en',w:1280});T('17 inglés',/Sorted by what you use most/.test(await p.locator('.ajc:has(.cgn)').innerText()));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
