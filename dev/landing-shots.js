// Regenera las capturas de celular de la landing (inicio/img/*.jpg) y la imagen para compartir (og.jpg)
// con los datos de ejemplo de demo.json. Nunca usa datos reales.
// Uso: con `npm run serve` corriendo →  node landing-shots.js   (o: npm run capturas)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));
const OUT=path.join(__dirname,'..','inicio','img')+path.sep,K='mis-finanzas-prototipo-v1',Q=64;
// la cuenta de ejemplo muestra su tasa, y el historial tiene varios días
demo.cfg.ahoTasa=Object.assign({},demo.cfg.ahoTasa,{pibank:{t:'TREA',v:5.5}});
const dia=n=>{const d=new Date(Date.now()-n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const hist=[[0,404],[1,401],[2,398],[5,391]].map(([n,f])=>({dia:dia(n),tipo:'diaria',at:new Date(Date.now()-n*864e5).toISOString(),registro:Array(f).fill([]),config:[]}));
(async()=>{
  require('child_process').execSync('node build-wrap.js',{cwd:__dirname});
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,h,k])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-hist',h);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');}window.claude={use:async()=>null};},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),JSON.stringify(hist),K]);
  const go=async h=>{await p.goto('http://127.0.0.1:8765/wrap-repo.html'+h);await p.waitForSelector('#app');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(900);};
  const shot=async n=>{await p.waitForTimeout(350);await p.screenshot({path:OUT+n+'.jpg',type:'jpeg',quality:Q});console.log(n+'.jpg',Math.round(fs.statSync(OUT+n+'.jpg').size/1024)+' KB');};
  const cerrar=async()=>{if(await p.locator('#sheet').count()){await p.keyboard.press('Escape');await p.waitForTimeout(250);}await p.evaluate(()=>{const t=document.getElementById('toast');if(t)t.hidden=true;});};
  const abrir=async()=>{await p.click('#fab');await p.waitForSelector('#sheet');};

  await go('#resumen');await shot('resumen');
  await go('#noviembre');await shot('mes');
  // registrar un gasto hormiga
  await abrir();await p.click('#stype [data-g="gasto"]');await p.click('#ssub [data-t="hor"]');await p.fill('#sa','12.50');await p.fill('#sd','Menú del día');await p.click('#ssrc [data-src="liq:0"]');await p.locator('#sd').blur();await shot('registrar');await cerrar();
  // compra con tarjeta
  await abrir();await p.click('#stype [data-g="tarjeta"]');await p.click('#ssub [data-t="compra"]');await p.click('#sbank [data-b="bcp"]');await p.fill('#sa','89.90');await p.fill('#sd','Zapatillas');await p.locator('#sd').blur();await shot('tarjeta');await cerrar();
  // depósito a ahorro
  await abrir();await p.click('#stype [data-g="ahorro"]');await p.click('#ssub [data-t="aho"]');
  {const c=p.locator('#sheet [role=radio]').filter({hasText:'PiBank'}).first();if(await c.count())await c.click();}
  await p.fill('#sa','200');await p.locator('#sa').blur();await shot('ahorro-registro');await cerrar();
  // cuentas de ahorro con su tasa
  await p.evaluate(()=>{const c=document.querySelector('.bcard[data-cid="aho"]'),h=document.getElementById('hdr').offsetHeight;scrollTo(0,c.getBoundingClientRect().top+scrollY-h-10);});await shot('ahorros');
  await p.evaluate(()=>scrollTo(0,0));
  // reporte
  await p.click('[data-bnrep]');await p.waitForSelector('#sheet');await shot('reporte');await cerrar();
  // cuadrar cuentas
  await p.click('[data-act="cierre"]');await p.waitForSelector('#sheet');await p.click('#sheet [data-act="cuad"]');await p.waitForTimeout(400);await shot('cuadrar');await cerrar();
  // historial de versiones (en Ajustes)
  await go('#ajustes');await p.waitForSelector('#hist');await p.waitForTimeout(600);
  await p.evaluate(()=>{const c=document.getElementById('hist'),h=document.getElementById('hdr').offsetHeight;scrollTo(0,c.getBoundingClientRect().top+scrollY-h-70);});await shot('historial');
  await ctx.close();

  // imagen para compartir (1200×630): plantilla og.html con la captura nueva del Resumen
  const og=await b.newPage({viewport:{width:1200,height:630}});
  const html=fs.readFileSync(__dirname+'/og.html','utf8').replace(/src="[^"]*resumen\.jpg"/,'src="data:image/jpeg;base64,'+fs.readFileSync(OUT+'resumen.jpg').toString('base64')+'"');
  await og.setContent(html,{waitUntil:'networkidle'});await og.evaluate(()=>document.fonts.ready);await og.waitForTimeout(300);
  await og.screenshot({path:OUT+'og.jpg',type:'jpeg',quality:82});console.log('og.jpg',Math.round(fs.statSync(OUT+'og.jpg').size/1024)+' KB');
  await b.close();
  if(errs.length){console.log('ERRORES',errs);process.exit(1);}
})().catch(e=>{console.log('ERR',e);process.exit(1);});
