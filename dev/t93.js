// t93: el botón de moneda junto al monto rota entre soles y las monedas que la persona dejó activas en Ajustes ($ y € por defecto).
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const liq0=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].liq[0].m,K);
const fila=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c)||null;},[K,c]);
const monedas=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg.monedas,K);
const nueva=async(b,cfgExtra,lang,extraRow)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{}),S=JSON.parse(JSON.stringify(demo.S));if(extraRow)S['2026'][10].hor.push(extraRow);
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const vis=(p,s)=>p.locator(s).first().isVisible();
const step=p=>p.getAttribute('#sheet','data-step');
const W=p=>p.waitForTimeout(220);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);};
const manual=async p=>{await abrir(p);await p.click('[data-mode="manual"]');await W(p);};
const mon=async p=>(await p.innerText('#scur')).trim();
const gastoHasta=async p=>{await manual(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);await p.click('#sgrp [data-sgrp="need"]');await p.waitForTimeout(230);await p.click('#ssrc [data-src="liq:0"]');await W(p);};
// toca el botón varias veces y devuelve la secuencia de monedas que fue mostrando (desde la inicial)
const rota=async(p,veces)=>{const s=[await mon(p)];for(let i=0;i<veces;i++){await p.click('#scur');await W(p);s.push(await mon(p));}return s.join(' > ');};
const ajustes=async p=>{await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(800);};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);
  // 1. El primer paso queda sin pregunta de moneda y sin botón
  await manual(p);
  T('el primer paso no pregunta la moneda (solo el movimiento) ni muestra el botón',await step(p)==='type'&&!/En qué moneda/.test(await p.innerText('#sheet'))&&!(await vis(p,'#scur')));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  // 2. Rotación completa por defecto: S/ > $ > € > S/
  const s0=await liq0(p);
  await gastoHasta(p);
  T('el monto empieza en soles',await step(p)==='form'&&await mon(p)==='S/');
  {const g=await p.evaluate(()=>{const a=document.getElementById('samt').getBoundingClientRect(),c=document.getElementById('scur').getBoundingClientRect(),n=document.getElementById('sa'),sym=document.getElementById('samtcur');return {dentro:c.left>=a.left&&c.right<=a.right+1&&c.top>=a.top&&c.bottom<=a.bottom,derecha:c.left>a.left+a.width/2,centrado:Math.abs((c.top+c.bottom)/2-(a.top+a.bottom)/2)<=4,visible:c.width>=44&&c.height>=36,fuente:parseFloat(getComputedStyle(n).fontSize),simbolo:sym.textContent,simboloFuente:parseFloat(getComputedStyle(sym).fontSize)};});
    T('el botón de moneda está dentro del recuadro del monto, a la derecha y centrado en vertical',g.dentro&&g.derecha&&g.centrado);
    T('y se ve bien (al menos 44 × 36 px)',g.visible);
    T('el monto es grande (≥ 30 px) y la moneda se ve junto al número (≥ 30 px)',g.fuente>=30&&g.simbolo==='S/'&&g.simboloFuente>=30);}
  T('el botón rota por todas: S/ > $ > € > S/',await rota(p,3)==='S/ > $ > € > S/');
  await p.click('#scur');await W(p);
  T('el símbolo grande junto al monto acompaña al botón ($)',(await p.innerText('#samtcur')).trim()==='$');
  await p.fill('#sa','10');await p.fill('#sd','T93 dolares');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  {const r=await fila(p,'T93 dolares');T('un gasto en dólares se guarda con su moneda',!!r&&r.cur==='$'&&+r.m===10);}
  T('y el saldo baja por el equivalente en soles (más de 10)',(s0-await liq0(p))>10);
  await gastoHasta(p);await p.click('#scur');await W(p);await p.click('#scur');await W(p);
  await p.fill('#sa','5');await p.fill('#sd','T93 euros');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  {const r=await fila(p,'T93 euros');T('un gasto en euros también se guarda con su moneda',!!r&&r.cur==='€'&&+r.m===5);}
  const s1=await liq0(p);
  await gastoHasta(p);await p.fill('#sa','10');await p.fill('#sd','T93 soles');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  {const r=await fila(p,'T93 soles');T('en soles la fila no guarda moneda y descuenta exacto',!!r&&!r.cur&&+r.m===10&&Math.abs((s1-await liq0(p))-10)<0.005);}

  // 3. Ajustes: la persona marca qué monedas aparecen
  await ajustes(p);
  T('Ajustes ofrece «Monedas al registrar» con dólares y euros marcados',await p.locator('#cm-d').count()===1&&await p.isChecked('#cm-d')&&await p.isChecked('#cm-e'));
  await p.uncheck('#cm-e');await W(p);
  T('al desmarcar euros se guarda solo [$]',JSON.stringify(await monedas(p))==='["$"]');
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);await gastoHasta(p);
  T('sin euros, el botón rota S/ > $ > S/',await rota(p,2)==='S/ > $ > S/');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await ajustes(p);await p.check('#cm-e');await p.uncheck('#cm-d');await W(p);
  T('con solo euros se guarda [€]',JSON.stringify(await monedas(p))==='["€"]');
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);await gastoHasta(p);
  T('con solo euros, el botón rota S/ > € > S/',await rota(p,2)==='S/ > € > S/');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await ajustes(p);await p.uncheck('#cm-e');await W(p);
  T('sin monedas extra se guarda []',JSON.stringify(await monedas(p))==='[]');
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);await gastoHasta(p);
  T('sin monedas extra, el botón de moneda no se muestra y todo es en soles',!(await vis(p,'#scur'))&&(await p.innerText('#samtcur')).trim()==='S/');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await ajustes(p);await p.check('#cm-e');await p.check('#cm-d');await W(p);
  T('al marcar de nuevo en cualquier orden se guarda [$,€] (orden fijo)',JSON.stringify(await monedas(p))==='["$","€"]');

  // 4. Otras entradas usan la misma rotación
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(700);
  await abrir(p);await p.click('[data-mode="auto"]');await W(p);await p.click('#smodesw');await W(p);
  T('el formulario completo (Cambiar a manual) rota igual',await rota(p,3)==='S/ > $ > € > S/');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('[data-new="fij"]');await p.waitForSelector('#sheet');await p.click('[data-mode="manual"]');await W(p);await p.click('#sgrp [data-sgrp="need"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('desde «+ Agregar gasto fijo» también rota por todas',await step(p)==='form'&&await rota(p,3)==='S/ > $ > € > S/');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 5. Datos de otras versiones: una lista inválida se corrige; la configuración vieja (monedaAlt) no estorba
  p=await nueva(b,{monedas:['XX','$']});await gastoHasta(p);
  T('una lista de monedas inválida en los datos se filtra (solo $)',await rota(p,2)==='S/ > $ > S/');
  await p.context().close();
  p=await nueva(b,{monedas:undefined,monedaAlt:'€'});await gastoHasta(p);
  T('con la configuración antigua (monedaAlt) rota por las dos de siempre',await rota(p,3)==='S/ > $ > € > S/');
  await p.context().close();

  // 6. Editar un movimiento en una moneda que ya no está activa: se puede volver a soles
  p=await nueva(b,{monedas:['$']},null,{c:'T93 euro viejo',m:5,f:'3-nov',k:'',src:'liq:0',cur:'€'});
  {const i=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].hor.findIndex(r=>r.c==='T93 euro viejo'),K);
   await p.click('[data-cid=hor] [data-edit="hor"][data-i="'+i+'"]');await p.waitForSelector('#sheet');await p.waitForTimeout(200);
   T('al editar un gasto en € (desactivado) el botón lo muestra y un toque lo pasa a soles',await mon(p)==='€'&&await rota(p,1)==='€ > S/');}
  await p.context().close();

  // 7. Inglés
  p=await nueva(b,null,'en');await ajustes(p);await p.reload();await p.waitForTimeout(1000);
  {const tx=await p.innerText('body');T('en inglés Ajustes traduce «Monedas al registrar»',/Currencies when logging/.test(tx)&&/Dollars \(\$\)/.test(tx)&&/cycles through soles/.test(tx)&&!/Monedas al registrar/.test(tx));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
