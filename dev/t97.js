// t97: modo preferido de registro. En Ajustes la persona elige qué pasa al tocar «+»: preguntar cada vez, siempre manual (por pasos) o siempre automático.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,hash,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadra');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const mode=p=>p.evaluate(()=>{const s=document.getElementById('sheet');return s?{m:s.dataset.mode,wiz:!!s.dataset.wiz,step:s.dataset.step||''}:null;});
(async()=>{
  const b=await chromium.launch();let p;
  // 1. Por defecto pregunta
  p=await nueva(b,'#noviembre');await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  T('por defecto, «+» pregunta cómo registrar',(await mode(p)).m==='ask');
  await p.context().close();
  // 2. Siempre manual: va directo al asistente por pasos
  p=await nueva(b,'#noviembre',{modoReg:'manual'});await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  {const m=await mode(p);T('siempre manual: abre directo el asistente por pasos (sin preguntar)',m.m==='manual'&&m.wiz&&m.step==='type');}
  await p.click('[data-wz="back"]');await p.waitForTimeout(250);
  T('«← Atrás» en el primer paso vuelve a la ventana para elegir otro modo',(await mode(p)).m==='ask');
  await p.context().close();
  // 3. Siempre automático: abre la frase
  p=await nueva(b,'#noviembre',{modoReg:'auto'});await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  T('siempre automático: abre directo la frase y el cursor está ahí',(await mode(p)).m==='auto'&&await p.evaluate(()=>document.activeElement&&document.activeElement.id==='smsg'));
  await p.fill('#smsg','almuerzo 25 yape');await p.waitForTimeout(300);
  T('y registra con una frase como siempre',await p.locator('#sapv').isVisible());
  await p.context().close();
  // 4. Los botones «+ Agregar…» (tipo fijo) usan manual aunque se prefiera automático
  p=await nueva(b,'#noviembre',{modoReg:'auto'});await p.click('[data-new="hor"]');await p.waitForSelector('#sheet');await p.waitForTimeout(300);
  {const m=await mode(p);T('«+ Agregar…» con preferencia automático abre manual con el tipo fijo (se salta el paso de tipo)',m.m==='manual'&&m.wiz&&m.step!=='type');}
  await p.context().close();
  // 6. Ajustes: elegir y que se guarde
  p=await nueva(b,'#ajustes');
  T('Ajustes muestra las tres opciones y «preguntar» está marcada',await p.locator('input[name="modoreg"]').count()===3&&await p.locator('input[name="modoreg"][value="ask"]').isChecked());
  await p.check('input[name="modoreg"][value="auto"]');await p.waitForTimeout(300);
  T('elegir «automático» se guarda',(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg.modoReg,K))==='auto');
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#fab');await p.waitForTimeout(600);
  await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  T('tras recargar, «+» abre en automático',(await mode(p)).m==='auto');
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  // 7. Valor dañado vuelve a «preguntar»
  p=await nueva(b,'#noviembre',{modoReg:'raro'});await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(250);
  T('un valor inválido en la configuración se trata como «preguntar»',(await mode(p)).m==='ask'&&p.errs.length===0);
  await p.context().close();
  // 8. Inglés
  p=await nueva(b,'#ajustes',null,'en');
  T('en inglés se traduce («Ask me every time»)',/Ask me every time/.test(await p.evaluate(()=>document.body.innerText))&&/Always automatic/.test(await p.evaluate(()=>document.body.innerText)));
  await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
