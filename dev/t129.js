// t129: la pantalla rápida registra cualquier movimiento (ingreso, tarjeta, ahorro, inversión) y recuerda cuenta y tarjeta. Solo datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const base=()=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}));const m=d.S['2026'][10];m.liq[0].m=500;m.liq[1].m=300;return d;};
(async()=>{
 const b=await chromium.launch();
 const mk=async x=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||390,height:844}});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify(base()),K,x.lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#board');await p.waitForTimeout(250);return p;};
 const J=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K),W=p=>p.waitForTimeout(150),abre=async p=>{await p.click('#fab');await p.waitForSelector('#sheet[data-quick]');await W(p);};
 const mes=async p=>(await J(p)).S['2026'][10],vis=(p,s)=>p.isVisible(s);
 const grupo=async(p,g)=>{await p.click('#stype [data-g="'+g+'"]');await W(p);};

 let p=await mk();await abre(p);
 T('1 el selector de movimiento está en la misma pantalla',await vis(p,'#stype')&&await p.locator('#stype .cp').count()===4);
 // Ingreso
 await grupo(p,'ing');T('2 ingreso pide la cuenta donde se deposita',await vis(p,'#ssrc')&&/deposita/.test(await p.innerText('#ssrcw')));T('2b sin categoría ni grupo',!(await p.locator('#sqk [data-sgrp]').count()));
 await p.fill('#sa','300');await p.fill('#sd','Bono T129');await p.click('#sheet [data-s="save"]');await W(p);T('3 ingreso sin cuenta no guarda a ciegas',!(await mes(p)).ing.some(r=>r.c==='Bono T129')&&await p.locator('#sheet').count()===1);
 const l0=+(await mes(p)).liq[1].m;await p.click('#ssrc [data-src="liq:1"]');await W(p);await p.click('#sheet [data-s="save"]');await W(p);let m=await mes(p);
 T('4 ingreso guardado y sumado a la cuenta',m.ing.some(r=>r.c==='Bono T129'&&+r.m===300&&r.src==='liq:1')&&Math.abs(+m.liq[1].m-(l0+300))<.01);
 await p.click('#toast [data-undo]');await W(p);T('5 deshacer ingreso',Math.abs(+(await mes(p)).liq[1].m-l0)<.01);
 await abre(p);await grupo(p,'ing');T('6 recuerda la cuenta del último ingreso',await p.getAttribute('#ssrc [data-src="liq:1"]','aria-checked')==='true');await p.keyboard.press('Escape');await W(p);
 // Tarjeta
 await abre(p);await grupo(p,'tarjeta');T('7 tarjeta muestra compra/pago y la tarjeta',await vis(p,'#ssub')&&await vis(p,'#sbank'));
 await p.click('#sbank [data-b="bcp"]');await p.fill('#sa','45');await p.fill('#sd','Zapatillas T129');await W(p);const d0=(await mes(p)).bcp.length;await p.click('#sheet [data-s="save"]');await W(p);
 T('8 compra con tarjeta guardada',(await mes(p)).bcp.some(r=>r.c==='Zapatillas T129'&&+r.m===45));
 await abre(p);await grupo(p,'tarjeta');T('9 recuerda la última tarjeta',await p.getAttribute('#sbank [data-b="bcp"]','aria-checked')==='true');
 await p.click('#ssub [data-t="pago"]');await W(p);T('10 pago pide con qué se paga',await vis(p,'#ssrc'));await p.fill('#sa','20');await p.click('#ssrc [data-src="liq:0"]');await W(p);const l1=+(await mes(p)).liq[0].m;await p.click('#sheet [data-s="save"]');await W(p);m=await mes(p);
 T('11 pago de tarjeta descuenta la cuenta',Math.abs(+m.liq[0].m-(l1-20))<.01&&m.fij.some(r=>r.k==='Pago tarjeta'&&+r.m===20));
 // Ahorro e inversión
 await abre(p);await grupo(p,'ahorro');T('12 ahorro muestra acciones y cuentas',await vis(p,'#sax')&&await vis(p,'#smovw'));
 await p.fill('#sa','50');await p.click('#sheet [data-s="save"]');await W(p);T('13 sin cuenta de ahorro no guarda',await p.locator('#sheet').count()===1);await p.keyboard.press('Escape');await W(p);
 await abre(p);await grupo(p,'ahorro');await p.click('#ssub [data-t="inv"]');await W(p);await p.fill('#sa','70');await p.fill('#sd','Fondo T129');await p.click('#sheet [data-s="save"]');await W(p);T('14 inversión guardada',(await mes(p)).inv.some(r=>r.c==='Fondo T129'&&+r.m===70));
 T('15 sin errores',!p.errs.length);await p.context().close();
 // «+ Agregar…» usa la misma pantalla con el tipo fijo
 p=await mk();await p.click('[data-new="ing"]');await p.waitForSelector('#sheet[data-quick]');await W(p);T('16 «+ Agregar ingreso» abre la pantalla rápida con el tipo fijo',!(await vis(p,'#stype'))&&await vis(p,'#ssrc')&&/deposita/.test(await p.innerText('#ssrcw')));
 await p.click('#sheet [data-mode="manual"]');await W(p);T('17 «Manual» sigue disponible',await p.getAttribute('#sheet','data-step')==='src');T('sin errores 2',!p.errs.length);await p.context().close();
 p=await mk({lang:'en'});await abre(p);await grupo(p,'ing');await p.fill('#sa','10');await p.click('#sheet [data-s="save"]');await W(p);T('18 inglés',/Choose an account/.test(await p.innerText('#sheet'))&&/Prefer another way/.test(await p.innerText('#sheet')));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
