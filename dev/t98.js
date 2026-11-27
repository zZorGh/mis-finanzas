// t98: al registrar un gasto (Manual, por pasos) se pregunta el grupo (Necesidades, Deseos, Ahorro e inversión) y se sigue con la cuenta; no hay categorías.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(230);
const step=p=>p.getAttribute('#sheet','data-step');
const vis=(p,s)=>p.locator(s).first().isVisible();
const hastaGrupo=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="manual"]');await W(p);await p.click('#stype [data-g="gasto"]');await W(p);await p.click('#ssub [data-t="hor"]');await W(p);};
const guardar=async(p,monto,concepto)=>{await p.click('#ssrc [data-src="liq:0"]');await W(p);await p.fill('#sa',monto);await p.fill('#sd',concepto);await p.click('[data-s="save"]');await p.waitForTimeout(400);};
const fila=(p,c)=>p.evaluate(([k,c])=>{const m=JSON.parse(localStorage.getItem(k)).S['2026'][10];return [].concat(m.hor,m.fij).find(r=>r.c===c)||null;},[K,c]);
const cfgNow=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg,K);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,{catGrupo:{'ocio':'want','menú':'need'}});
  await hastaGrupo(p);
  T('después del tipo, pregunta «¿En qué grupo cae este gasto?» con los tres grupos',await step(p)==='grp'&&/En qué grupo/.test(await p.innerText('#swq'))&&await p.locator('#sgrp button').count()===3);
  await p.click('#sgrp [data-sgrp="want"]');await W(p);
  T('y pasa directo a «de dónde sale»: ya no hay categorías',await step(p)==='src'&&!(await p.locator('#scat2,[data-scatskip]').count()));
  await p.click('#ssrc [data-src="liq:0"]');await W(p);
  T('el resumen muestra el grupo elegido',/Deseos/.test(await p.innerText('#swsum')));
  await p.fill('#sa','12');await p.fill('#sd','T98 cine');await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('el gasto se guarda con su grupo',(await fila(p,'T98 cine')||{}).k==='Deseo');
  T('no se crean categorías ni cambia la clasificación antigua',(await cfgNow(p)).cats.length===demo.cfg.cats.length||!(await cfgNow(p)).cats.includes('T98 cine'));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  for(const [g,k] of [['need','Necesidad'],['ai','Ahorro e inversión']]){p=await nueva(b);await hastaGrupo(p);await p.click('#sgrp [data-sgrp="'+g+'"]');await W(p);await guardar(p,'8','T98 '+g);T('el grupo '+g+' se guarda como '+k,(await fila(p,'T98 '+g)||{}).k===k);await p.context().close();}

  // Automático no pregunta el grupo por pasos: lo propone en la tarjeta
  p=await nueva(b);await p.click('#fab');await p.waitForSelector('#sheet');await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg','almuerzo 25 yape');await W(p);
  T('Automático no muestra el paso del grupo y sí las fichas en su tarjeta',!(await vis(p,'#sgrpw'))&&await p.locator('#sapv [data-sgrp]').count()===3);
  await p.context().close();

  // Inglés
  p=await nueva(b,null,'en');await hastaGrupo(p);
  T('en inglés se traduce la pregunta del grupo',/Which group does this expense fall into\?/.test(await p.innerText('#swq'))&&/Needs/.test(await p.innerText('#sgrp')));
  await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
