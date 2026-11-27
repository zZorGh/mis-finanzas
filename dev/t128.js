// t128: registro en una pantalla. Monto y concepto primero; cuenta, tipo y categoría deducidos y editables. Solo datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const base=x=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3},x||{})}));const m=d.S['2026'][10];m.liq[0].m=500;m.liq[1].m=300;m.fij.push({c:'Gimnasio Sol',m:80,f:'3-nov',k:'Salud',src:'liq:1',_d:80});return d;};
(async()=>{
 const b=await chromium.launch();
 const mk=async x=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||390,height:844},locale:'es-PE',timezoneId:'America/Lima'});await c.clock.setFixedTime(new Date('2026-11-22T12:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l,s])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);if(s)localStorage.setItem(k+'-src',s);}},[JSON.stringify(x.d||base()),K,x.lang||'',x.src===undefined?'liq:0':x.src]);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#board');await p.waitForTimeout(250);return p;};
 const J=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K),W=p=>p.waitForTimeout(150),abre=async p=>{await p.click('#fab');await p.waitForSelector('#sheet[data-quick]');await W(p);};
 const fila=async(p,c)=>{const m=(await J(p)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c);},liq=async(p,i)=>+(await J(p)).S['2026'][10].liq[i].m;

 let p=await mk();await abre(p);
 T('1 el cursor empieza en el monto',await p.evaluate(()=>document.activeElement.id==='sa'));
 T('2 monto, concepto, cuenta y tipo en la misma pantalla',await p.isVisible('#sa')&&await p.isVisible('#sd')&&await p.isVisible('#ssrc')&&await p.isVisible('#ssub'));
 T('3 cuenta usada antes, visible y marcada',await p.getAttribute('#ssrc [data-src="liq:0"]','aria-checked')==='true');
 await p.fill('#sa','18');await p.keyboard.press('Enter');await W(p);T('4 Enter en el monto pasa al concepto',await p.evaluate(()=>document.activeElement.id==='sd'));
 await p.fill('#sd','taxi aeropuerto');await W(p);T('5 propone el grupo',await p.getAttribute('#sqk [data-sgrp="need"]','aria-checked')==='true');
 const l0=await liq(p,0);await p.keyboard.press('Enter');await W(p);let r=await fila(p,'taxi aeropuerto');
 T('6 guarda en una pantalla',r&&r.m===18&&r.k==='Necesidad'&&r.src==='liq:0');T('7 descuenta la cuenta',Math.abs(await liq(p,0)-(l0-18))<.01);
 T('8 sugerir no reclasifica',!('transporte' in ((await J(p)).cfg.catGrupo||{})));
 await p.click('#toast [data-undo]');await W(p);T('9 deshacer',!(await fila(p,'taxi aeropuerto'))&&Math.abs(await liq(p,0)-l0)<.01);

 await abre(p);await p.fill('#sa','80');await p.fill('#sd','Gimnasio Sol');await W(p);
 T('10 deduce tipo por historial',await p.getAttribute('#ssub [data-t="fij"]','aria-checked')==='true');T('11 deduce cuenta por concepto',await p.getAttribute('#ssrc [data-src="liq:1"]','aria-checked')==='true');T('12 deduce el grupo',await p.getAttribute('#sqk [data-sgrp="need"]','aria-checked')==='true');
 await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);await p.click('#sqk [data-sgrp="want"]');await p.fill('#sd','Gimnasio Sol ');await p.fill('#sd','Gimnasio Sol');await W(p);
 T('13 respeta lo que la persona cambió',await p.getAttribute('#ssrc [data-src="liq:0"]','aria-checked')==='true'&&await p.getAttribute('#ssub [data-t="hor"]','aria-checked')==='true'&&await p.getAttribute('#sqk [data-sgrp="want"]','aria-checked')==='true');await p.keyboard.press('Escape');await W(p);

 await abre(p);await p.fill('#sa','9999');await W(p);T('14 avisa saldo insuficiente',await p.isVisible('#sshort'));await p.keyboard.press('Escape');await W(p);
 await abre(p);await p.fill('#sa','12');await p.fill('#sd','café');await W(p);await p.click('#sheet [data-s="more"]');await W(p);T('15 guardar y otro sigue en la pantalla y conserva la cuenta',await p.locator('#sheet[data-quick]').count()===1&&await p.inputValue('#sa')===''&&await p.getAttribute('#ssrc [data-src="liq:0"]','aria-checked')==='true');
 await p.fill('#sa','25');await p.fill('#sd','almuerzo');await W(p);await p.click('#sheet [data-mode="auto"]');await W(p);T('16 a Automático lleva lo escrito',/almuerzo 25/.test(await p.inputValue('#smsg'))&&await p.getAttribute('#sheet','data-mode')==='auto');await p.keyboard.press('Escape');await W(p);
 await abre(p);await p.fill('#sa','33');await p.click('#sheet [data-mode="manual"]');await W(p);T('17 otras formas siguen disponibles',await p.getAttribute('#sheet','data-step')==='type');await p.click('[data-wz="back"]');await W(p);T('18 Atrás vuelve a la pantalla',await p.locator('#sheet[data-quick]').count()===1&&await p.inputValue('#sa')==='33');await p.keyboard.press('Escape');await W(p);
 await p.click('[data-new="ing"]');await p.waitForSelector('#sheet');await W(p);T('19 agregar un ingreso usa la pantalla rápida con el tipo fijo',await p.locator('#sheet[data-quick]').count()===1&&!(await p.isVisible('#stype'))&&!(await p.locator('#sqk [data-sgrp]').count()));T('sin errores 1',!p.errs.length);await p.context().close();

 p=await mk({src:''});await abre(p);await p.fill('#sa','10');await p.fill('#sd','prueba sin cuenta');await p.click('#sheet [data-s="save"]');await W(p);T('20 sin cuenta no guarda a ciegas',!(await fila(p,'prueba sin cuenta'))&&await p.locator('#sheet').count()===1);await p.context().close();
 p=await mk({lang:'en'});await abre(p);T('21 inglés',/Prefer another way/.test(await p.innerText('#sheet')));T('22 sin desborde',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
