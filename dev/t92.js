// t92: métricas anónimas y reporte de errores. Encendidas por defecto en producción (la política de privacidad lo explica) pero NO en localhost; se fuerzan con cuadra-stats=1 y se apagan con cuadra-stats=0.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,stats)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.posts=[];p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const q=r.request(),u=q.url();
    if(u.includes('/rest/v1/eventos')){if(q.method()==='POST')p.posts.push(JSON.parse(q.postData()||'[]'));return r.fulfill({status:201,body:''});}
    if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();
    if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,s])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(s!=null)localStorage.setItem('cuadra-stats',s);}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,stats==null?null:stats]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(220);
const flush=async p=>{await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(300);};
const todos=p=>[].concat(...p.posts);
(async()=>{
  const b=await chromium.launch();

  // 1. En localhost no se mide por defecto (las pruebas no ensucian las métricas reales); en producción el valor por defecto es «encendido»
  let p=await nueva(b);
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="manual"]');await W(p);await p.keyboard.press('Escape');await W(p);await flush(p);
  T('en localhost, por defecto, no se envía nada',p.posts.length===0);
  T('en producción el valor por defecto está encendido (TRACK_DEFAULT=true)',/const TRACK_DEFAULT=true,/.test(fs.readFileSync(__dirname+'/../index.html','utf8')));
  T('Ajustes muestra la tarjeta de privacidad',await (async()=>{await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(700);return (await p.locator('#st-on').count())===1;})());
  await p.context().close();

  // 2. Apagado por la persona: no se envía nada
  p=await nueva(b,'0');
  await p.click('#fab');await p.waitForSelector('#sheet');await p.keyboard.press('Escape');await W(p);await flush(p);
  T('con cuadra-stats=0 no se envía nada',p.posts.length===0);
  await p.context().close();

  // 3. Encendido: eventos del registro, sin datos personales
  p=await nueva(b,'1');
  await p.click('#fab');await p.waitForSelector('#sheet');await W(p);
  await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="fij"]');await W(p);await p.click('#ssrc [data-src="liq:0"]');await W(p);
  await p.fill('#sa','777.77');await p.fill('#sd','T92 secreto');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','almuerzo 25 yape');await p.waitForTimeout(200);await p.click('[data-s="save"]');await p.waitForTimeout(400);
  await p.click('#fab');await p.waitForSelector('#sheet');await W(p);await p.keyboard.press('Escape');await W(p);
  await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.keyboard.press('Escape');await W(p);
  await flush(p);
  const ev=todos(p),dn=(e,d)=>ev.some(x=>x.ev===e&&(d==null||x.dato===d));
  T('envía los eventos con id de dispositivo y versión',ev.length>5&&ev.every(x=>/^[0-9a-f]{8,40}$/.test(x.sid)&&x.ver&&x.ev));
  T('abrir y elegir modo',dn('reg_abrir','elegir')&&dn('reg_modo','manual_pasos')&&dn('reg_modo','auto'));
  T('cada paso del asistente',['type','sub','src','form'].every(s=>dn('reg_paso',s)));
  T('guardar, con modo y tipo',dn('reg_guardar','pasos:fij')&&dn('reg_guardar','auto:hor'));
  T('abandonar, con el último paso o modo',dn('reg_abandono','elegir')&&dn('reg_abandono','manual:sub'));
  {const crudo=JSON.stringify(ev);T('NO viaja ningún monto, concepto, cuenta ni correo',!/777|T92|secreto|almuerzo|yape|@|liq:/i.test(crudo));}
  T('«día activo» se envía una sola vez',ev.filter(x=>x.ev==='dia_activo').length<=1);
  T('el id de dispositivo es siempre el mismo',new Set(ev.map(x=>x.sid)).size===1);

  // 4. Errores: llegan sin ruido de red
  p.posts.length=0;
  await p.evaluate(()=>{setTimeout(()=>{throw new Error('boom T92');},0);Promise.reject(new Error('Failed to fetch'));});
  await p.waitForTimeout(300);await flush(p);
  {const e2=todos(p).filter(x=>x.ev==='error');T('un error de JavaScript se reporta',e2.some(x=>/boom T92/.test(x.dato)));T('los errores de red (sin internet) no se reportan',!e2.some(x=>/failed to fetch/i.test(x.dato)));}

  // 5. Ajustes: la persona puede apagarlo
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.waitForTimeout(800);
  T('Ajustes muestra la tarjeta de privacidad, activada',await p.locator('#st-on').count()===1&&await p.isChecked('#st-on'));
  await p.uncheck('#st-on');await W(p);
  T('al desmarcarla se guarda en el navegador (cuadra-stats=0)',(await p.evaluate(()=>localStorage.getItem('cuadra-stats')))==='0');
  await p.context().close();

  // 6. Inglés
  p=await nueva(b,'1');await p.evaluate(()=>localStorage.setItem('cuadra-lang','en'));await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.reload();await p.waitForTimeout(1000);
  {const tx=await p.innerText('body');T('en inglés la tarjeta de privacidad está traducida',/Help improve MisSoles with anonymous usage statistics/.test(tx)&&!/Ayudar a mejorar/.test(tx));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
