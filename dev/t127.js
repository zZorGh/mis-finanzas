// t127: solo tres grupos de gasto (Necesidades, Deseos, Ahorro e inversión). Los conceptos los escribe la persona; el grupo se
// propone y se cambia con un toque. Los movimientos antiguos conservan su palabra y no cambian los totales. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const base=()=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,catGrupo:{transporte:'need',netflix:'want',fondo:'ai',necesidad:'want'}})}));const m=d.S['2026'][10];
  const f=(c,m,k,x)=>Object.assign({c,m,f:'5-nov',k},x||{});
  m.fij=[f('Renta',1000,'Alquiler'),f('Serie',40,'Netflix'),f('Colchón',100,'Fondo')];
  m.hor=[f('Almuerzo',10,'Menú'),f('Bus',20,'Transporte'),f('Helado',5,'Necesidad',{t:'ant'}),f('Pan',8,'Necesidad'),f('Peluquería Sol',40,'Deseo'),f('constructor',3,'constructor')];
  m.ing=[f('Sueldo',3000,'')];m.aho=[];m.inv=[];return d;};
(async()=>{
 const b=await chromium.launch();
 const mk=async x=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||390,height:844},locale:'es-PE',timezoneId:'America/Lima'});await c.clock.setFixedTime(new Date('2026-11-22T12:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');localStorage.setItem(k+'-src','liq:0');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify(x.d||base()),K,x.lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(x.h||'#noviembre'));await p.waitForSelector('#board');await p.waitForTimeout(300);return p;};
 const J=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);const W=p=>p.waitForTimeout(220);
 const fila=async(p,c)=>{const m=(await J(p)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c);};
 // Total y conceptos de cada grupo en «¿Dónde gastas más?»
 const grupos=p=>p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#dgbox .dgg')].map(g=>[g.querySelector('.dgn').textContent.trim(),{t:g.querySelector('.dgh b').textContent,i:[...g.querySelectorAll('li span:first-child')].map(s=>s.textContent)}])));
 const abre=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await W(p);};
 const auto=async(p,t)=>{await abre(p);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg',t);await W(p);};
 const sel=(p,caja)=>p.evaluate(c=>{const e=document.querySelector(c+' [data-sgrp][aria-checked="true"]');return e?e.dataset.sgrp:'';},caja);
 const guarda=async p=>{await p.click('[data-s="save"]');await W(p);};

 // 1. Datos antiguos: mismos totales que antes, ahora por concepto
 let p=await mk();let g=await grupos(p);
 T('1 solo hay tres grupos',Object.keys(g).every(n=>['Necesidades','Deseos','Ahorro e inversión'].includes(n)));
 T('1 Necesidades: alquiler, bus (clasificado) y «Necesidad» escrito',/1,028\.00/.test(g.Necesidades.t));
 T('1 Deseos: serie, almuerzo, antojo, peluquería y la palabra suelta',/98\.00/.test(g.Deseos.t));
 T('1 Ahorro e inversión: lo que estaba clasificado así',/100\.00/.test(g['Ahorro e inversión'].t));
 T('1 se ven los conceptos, no las categorías antiguas',g.Necesidades.i.includes('Renta')&&!g.Necesidades.i.includes('Alquiler')&&g.Deseos.i.includes('Almuerzo')&&!g.Deseos.i.includes('Menú'));
 T('1 lo menor se agrupa en «Otros» y la palabra «constructor» no rompe nada',g.Deseos.i.includes('Otros')&&!p.errs.length);
 T('1 ya no existe «Sin clasificar»',!/Sin clasificar/.test(await p.innerText('#dgbox')));

 // 2. Pantalla rápida: tres grupos, uno propuesto
 await abre(p);
 T('2 sin lista de categorías',!(await p.locator('#sacat,#scat,#scsug,#scatw2').filter({has:p.locator('option')}).count()));
 T('2 tres fichas y la de cotidiano propone Deseos',await p.locator('#sqk [data-sgrp]').count()===3&&await sel(p,'#sqk')==='want');
 await p.fill('#sa','6');await p.fill('#sd','taxi aeropuerto');await W(p);T('3 propone por pista (taxi)',await sel(p,'#sqk')==='need');
 await p.fill('#sd','peluquería sol');await W(p);T('3 propone por tu historial',await sel(p,'#sqk')==='want');
 await p.click('#sqk [data-sgrp="need"]');await W(p);await p.fill('#sd','peluquería sol 2');await W(p);T('3 respeta lo que elegiste',await sel(p,'#sqk')==='need');
 T('3 el foco se queda en la ficha elegida o en el campo',await p.evaluate(()=>!!document.activeElement.closest('#sheet')));
 await guarda(p);let r=await fila(p,'peluquería sol 2');T('3 se guarda el grupo',r&&r.k==='Necesidad');

 // 4. Editar un movimiento antiguo
 const editar=async(q,sec,c)=>{const i=await q.evaluate(([k,sec,c])=>JSON.parse(localStorage.getItem(k)).S['2026'][10][sec].findIndex(r=>r.c===c),[K,sec,c]);await q.evaluate(([s,i])=>document.querySelector('[data-edit="'+s+'"][data-i="'+i+'"]').click(),[sec,i]);await q.waitForSelector('#sheet');await W(q);};
 await editar(p,'hor','Bus');const marcado=await p.evaluate(()=>{const e=document.querySelector('#scat [data-sgrp][aria-checked="true"]');return e?e.dataset.sgrp:'';});
 T('4 al editar sale marcado su grupo',marcado==='need');
 const sinCuenta=()=>p.click('#ssrc [data-src="none"]');await p.fill('#sa','21');await sinCuenta();await guarda(p);{const f=await fila(p,'Bus');T('4 cambiar solo el monto conserva la palabra antigua',f.m===21&&f.k==='Transporte');}
 await editar(p,'hor','Bus');await p.evaluate(()=>{document.getElementById('smore').open=true;});await p.click('#scat [data-sgrp="want"]');await W(p);await sinCuenta();await guarda(p);
 T('4 cambiar el grupo guarda el nuevo',(await fila(p,'Bus')).k==='Deseo');
 const j=await J(p);T('4 no se reclasifica nada más ni se crean categorías',j.cfg.catGrupo.transporte==='need'&&j.cfg.cats.length===demo.cfg.cats.length);
 T('sin errores 1',!p.errs.length);if(p.errs.length)console.log(p.errs);await p.context().close();

 // 5. Automático y varios gastos
 p=await mk();await auto(p,'taxi 15 soles yape');T('5 Automático muestra los tres grupos con uno marcado',await p.locator('#sapv [data-sgrp]').count()===3&&await sel(p,'#sapv')==='need');
 await p.click('#sapv [data-sgrp="want"]');await W(p);await guarda(p);T('5 guarda el grupo elegido',(await fila(p,'Taxi')||{}).k==='Deseo');
 await auto(p,'netflix 44 soles yape y bus 3 yape');T('6 varios muestran sus grupos',/Grupos/.test(await p.innerText('#sapv')));await guarda(p);
 {const n=await fila(p,'Netflix'),u=await fila(p,'Bus');T('6 cada uno con el suyo',!!n&&n.k==='Deseo'&&[].concat((await J(p)).S['2026'][10].hor,(await J(p)).S['2026'][10].fij).some(r=>r.c==='Bus'&&+r.m===3&&r.k==='Necesidad'));}
 const antes=+(await grupos(p)).Deseos.t.replace(/[^0-9.]/g,'');await auto(p,'antojo chocolate 9 yape');T('7 un antojo no pregunta grupo',!(await p.locator('#sapv [data-sgrp]').count()));await guarda(p);
 g=await grupos(p);T('7 y suma en Deseos',Math.abs(+g.Deseos.t.replace(/[^0-9.]/g,'')-antes-9)<.01);
 T('sin errores 2',!p.errs.length);await p.context().close();

 // 8. Manual por pasos: grupo y directo a la cuenta
 p=await mk();await abre(p);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="fij"]');await W(p);
 T('8 pregunta el grupo con tres opciones',await p.getAttribute('#sheet','data-step')==='grp'&&await p.locator('#sgrp [data-sgrp]').count()===3);
 await p.click('#sgrp [data-sgrp="ai"]');await W(p);T('8 y pasa directo a «de dónde sale»',await p.getAttribute('#sheet','data-step')==='src');
 await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa','12');await p.fill('#sd','T127 manual');await guarda(p);
 T('8 se guarda como Ahorro e inversión',(await fila(p,'T127 manual')||{}).k==='Ahorro e inversión');
 T('sin errores 3',!p.errs.length);await p.context().close();

 // 9. Ajustes y modo «Editar»
 p=await mk({h:'#ajustes',w:1280});
 T('9 Ajustes ya no tiene categorías',!/Categorías/.test(await p.innerText('.ajboard'))&&!(await p.locator('#nc,#addcat,[data-catg],[data-catn]').count()));
 T('9 el recurrente elige entre los tres grupos',(await p.locator('#rc-k option').allInnerTexts()).join('|')==='Grupo|Necesidades|Deseos|Ahorro e inversión');
 await p.context().close();
 p=await mk({lang:'en'});await abre(p);T('10 en inglés',/Needs/.test(await p.innerText('#sqk'))&&!/Necesidades|Grupo/.test(await p.innerText('#sqk')));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
