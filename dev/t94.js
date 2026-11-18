// t94: saldo insuficiente. Un gasto, un pago de tarjeta o un movimiento que supera el saldo de la cuenta avisa con claridad
// (en todos los modos), ofrece otras cuentas, pide «Guardar igual» y, si la persona lo activa en Ajustes, no se puede guardar.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const liq=(p,i)=>p.evaluate(([k,i])=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[i].m,[K,i]);
const filas=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).filter(r=>r.c===c).length;},[K,c]);
const nueva=async(b,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const vis=(p,s)=>p.locator(s).first().isVisible();
const W=p=>p.waitForTimeout(230);
const step=p=>p.getAttribute('#sheet','data-step');
const manual=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="manual"]');await W(p);};
const gastoForm=async(p,i)=>{await manual(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);await p.click('#ssrc [data-src="liq:'+i+'"]');await W(p);};
const lbl=p=>p.evaluate(()=>document.querySelector('#sheet [data-s="save"]').textContent.trim());
const dis=p=>p.evaluate(()=>document.querySelector('#sheet [data-s="save"]').disabled);
const aviso=p=>p.evaluate(()=>{const w=document.getElementById('sshort');return w&&w.classList.contains('on')&&w.offsetParent!==null&&getComputedStyle(w).display!=='none'?w.innerText:'';});
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // 1. Alcanza: sin aviso
  await gastoForm(p,0);await p.fill('#sa','100');await W(p);
  T('si alcanza (S/ 100 de S/ 430), no hay aviso y el botón dice «Guardar»',(await aviso(p))===''&&await lbl(p)==='Guardar'&&!(await dis(p)));
  // 2. No alcanza: aviso claro, «Guardar igual», sin alternativas si ninguna otra cuenta alcanza
  await p.fill('#sa','500');await W(p);
  {const a=await aviso(p);
   T('si no alcanza (S/ 500 de S/ 430), muestra el aviso con la cuenta, el saldo y cómo quedaría',/No te alcanza el saldo/.test(a)&&/Yape/.test(a)&&/430\.00/.test(a)&&/500\.00/.test(a)&&/Quedaría en/.test(a)&&/-70\.00/.test(a));}
  T('el botón pasa a «Guardar igual» y se oculta «Guardar y agregar otro»',await lbl(p)==='Guardar igual'&&await p.evaluate(()=>getComputedStyle(document.querySelector('#sheet [data-s="more"]')).display==='none'));
  T('sin otra cuenta con saldo suficiente no se ofrecen alternativas',await p.locator('#sshort [data-sfix]').count()===0);
  // 3. Guardar igual: se guarda y la cuenta queda en negativo (como el dueño decida)
  await p.fill('#sd','T94 sobregiro');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('«Guardar igual» registra el gasto y la cuenta queda en negativo (-70)',await p.locator('#sheet').count()===0&&await filas(p,'T94 sobregiro')===1&&Math.abs((await liq(p,0))+70)<0.005);
  T('el aviso de después lo dice («negativo»)',/negativo/.test(await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'')));
  await p.context().close();

  // 4. Alternativas: Plin (130) con S/ 150 → otras cuentas con saldo suficiente, un toque para cambiar
  p=await nueva(b);await gastoForm(p,1);await p.fill('#sa','150');await W(p);
  T('si no alcanza en Plin, ofrece Yape y Efectivo billetes (no Efectivo monedas, que no alcanza)',await p.locator('#sshort [data-sfix]').count()===2&&/Yape/.test(await p.innerText('#sshort'))&&/billetes/.test(await p.innerText('#sshort'))&&!/monedas/.test(await p.innerText('#sshort')));
  await p.click('#sshort [data-sfix="liq:0"]');await W(p);
  T('tocar «Yape» cambia la cuenta: el aviso desaparece, el resumen dice Yape y el botón vuelve a «Guardar»',(await aviso(p))===''&&/Yape/.test(await p.innerText('#swsum'))&&await lbl(p)==='Guardar');
  await p.fill('#sd','T94 cambio');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('y se guarda descontando de Yape (430 → 280)',Math.abs((await liq(p,0))-280)<0.005&&Math.abs((await liq(p,1))-130)<0.005);

  // 5. Editar: considera lo que ese mismo gasto ya descontó
  await p.click('[data-cid=hor] [data-edit="hor"][data-i="'+(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].hor.findIndex(r=>r.c==='T94 cambio'),K))+'"]');await p.waitForSelector('#sheet');await W(p);
  T('al editar sin cambiar el monto no hay aviso (su propio descuento se tiene en cuenta)',(await aviso(p))==='');
  await p.fill('#sa','450');await W(p);
  T('si al editar sube a S/ 450 (hay 280 + 150 de este gasto = 430), avisa',/No te alcanza/.test(await aviso(p)));
  await p.fill('#sa','400');await W(p);
  T('y con S/ 400 ya alcanza: sin aviso',(await aviso(p))==='');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 6. Los ingresos nunca avisan
  await manual(p);await p.click('#stype [data-g="ing"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa','99999');await W(p);
  T('un ingreso grande no genera aviso de saldo',(await aviso(p))===''&&await lbl(p)==='Guardar');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 7. Otros movimientos: pago de tarjeta, depósito a ahorro, retiro de ahorro
  await manual(p);await p.click('#stype [data-g="tarjeta"]');await W(p);await p.click('#ssub [data-t="pago"]');await W(p);await p.click('#sbank [data-b="bcp"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa','900');await W(p);
  T('un pago de tarjeta que supera el saldo también avisa',/No te alcanza el saldo/.test(await aviso(p)));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await manual(p);await p.click('#stype [data-g="ahorro"]');await W(p);await p.click('#ssub [data-t="aho"]');await W(p);await p.click('#sax [data-ax="dep"]');await W(p);await p.click('#sfrom [data-from^="aho:"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa','900');await W(p);
  T('depositar a ahorro más de lo que hay en la cuenta de origen también avisa',/No te alcanza el saldo/.test(await aviso(p)));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await manual(p);await p.click('#stype [data-g="ahorro"]');await W(p);await p.click('#ssub [data-t="aho"]');await W(p);await p.click('#sax [data-ax="ret"]');await W(p);await p.click('#sfrom [data-from^="aho:"]');await W(p);await p.click('#ssrc [data-src="none"]');await W(p);await p.fill('#sa','9999999');await W(p);
  T('retirar de una cuenta de ahorro más de lo que tiene también avisa',/No te alcanza el saldo/.test(await aviso(p)));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 8. Automático: el aviso sale en la tarjeta de confirmación
  p=await nueva(b);await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','almuerzo 500 yape');await W(p);
  T('en Automático, la frase «almuerzo 500 yape» avisa que no alcanza y ofrece «Guardar igual»',/No te alcanza el saldo/.test(await aviso(p))&&await lbl(p)==='Guardar igual'&&await vis(p,'#sapv'));
  await p.fill('#smsg','almuerzo 50 yape');await W(p);
  T('y si se baja el monto a 50, el aviso desaparece',(await aviso(p))===''&&await lbl(p)==='Guardar');
  await p.context().close();

  // 9. Un atajo de un toque no se guarda si no alcanza
  p=await nueva(b,{rec:[{sec:'fij',s:'fij',c:'T94 Alquiler',m:1300,k:'',src:'liq:0',f:1}]});await manual(p);
  T('el atajo aparece en el primer paso',await p.locator('#ssug [data-rec1]').count()===1);
  await p.click('#ssug [data-rec1="0"]');await W(p);
  T('al tocarlo, no se guarda: abre el monto con el aviso para decidir',await p.locator('#sheet').count()===1&&await step(p)==='form'&&/No te alcanza/.test(await aviso(p))&&await filas(p,'T94 Alquiler')===0);
  await p.context().close();

  // 10. Opción de Ajustes: no permitir negativos
  p=await nueva(b);await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(800);
  T('Ajustes ofrece «No permitir que un gasto deje una cuenta en negativo», apagado por defecto',await p.locator('#cf-neg').count()===1&&!(await p.isChecked('#cf-neg')));
  await p.check('#cf-neg');await W(p);
  T('al marcarlo se guarda en la configuración',(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg.bloquearNeg,K))===true);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);
  await gastoForm(p,0);await p.fill('#sa','500');await W(p);
  T('con la opción activada, el botón «Guardar» se bloquea y el aviso lo explica',await dis(p)&&/no permite dejar una cuenta en negativo/.test(await aviso(p)));
  await p.fill('#sd','T94 estricto');await p.press('#sd','Enter');await p.waitForTimeout(400);
  T('y ni siquiera con Enter se guarda (queda el mensaje y no se registra)',await p.locator('#sheet').count()===1&&await filas(p,'T94 estricto')===0&&/No te alcanza el saldo de esa cuenta/.test(await p.innerText('#sdest')));
  await p.fill('#sa','100');await W(p);
  T('con un monto que sí alcanza se puede guardar',!(await dis(p))&&(await aviso(p))==='');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','almuerzo 500 yape');await W(p);
  T('en Automático con la opción activada, tampoco se puede guardar',await dis(p));
  await p.context().close();

  // 11. Datos de otras versiones: un valor raro en la opción se toma como apagado
  p=await nueva(b,{bloquearNeg:'si'});await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(800);
  T('un valor inválido en bloquearNeg se corrige a apagado',!(await p.isChecked('#cf-neg')));
  await p.context().close();

  // 12. Inglés
  p=await nueva(b,null,'en');await gastoForm(p,0);await p.fill('#sa','500');await W(p);
  {const a=await aviso(p);T("en inglés el aviso y el botón están traducidos",/There isn't enough balance/.test(a)&&/It would be/.test(a)&&/has/.test(a)&&!/No te alcanza|Quedaría|tiene/.test(a)&&await lbl(p)==='Save anyway');}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
