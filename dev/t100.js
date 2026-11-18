// t100: botón de micrófono en el registro Automático (Web Speech API). Se prueba con un reconocedor de voz simulado:
// aviso de privacidad la primera vez, dictado que llena la frase en vivo, errores explicados, parada al cerrar, sin soporte = sin botón.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const FAKE=`window.__vz={started:0,stopped:0,lang:'',inst:null};
window.SpeechRecognition=window.webkitSpeechRecognition=function(){const s=this;window.__vz.inst=s;s.start=function(){window.__vz.started++;window.__vz.lang=s.lang;setTimeout(()=>s.onstart&&s.onstart(),10);};
 s.stop=function(){window.__vz.stopped++;setTimeout(()=>s.onend&&s.onend(),10);};};
window.__vzSay=function(t){const i=window.__vz.inst;i.onresult({results:[[{transcript:t}]]});};
window.__vzErr=function(c){const i=window.__vz.inst;i.onerror({error:c});setTimeout(()=>i.onend&&i.onend(),10);};`;
const nueva=async(b,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  if(!o.sinSoporte)await p.addInitScript(FAKE);else await p.addInitScript('delete window.SpeechRecognition;delete window.webkitSpeechRecognition;');
  await p.addInitScript(([d,k,l,v])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);if(v)localStorage.setItem('cuadra-voz','1');}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K,o.lang||'',o.acepto?1:0]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const W=p=>p.waitForTimeout(250);
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await p.waitForTimeout(150);await p.click('[data-mode="auto"]');await W(p);};
const vis=(p,s)=>p.locator(s).first().isVisible();
const vz=p=>p.evaluate(()=>window.__vz);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b);await abrir(p);
  T('con soporte, el botón del micrófono se ve en Automático',await vis(p,'#smic'));
  T('el botón tiene nombre accesible «Dictar» y no está activo',(await p.getAttribute('#smic','aria-label'))==='Dictar'&&(await p.getAttribute('#smic','aria-pressed'))==='false');
  await p.click('#smic');await W(p);
  T('la primera vez muestra el aviso de privacidad y NO empieza a escuchar',await vis(p,'#smicok')&&/servicio de voz de tu navegador/.test(await p.innerText('#smicok'))&&(await vz(p)).started===0);
  await p.click('[data-vozok="0"]');await W(p);
  T('«Ahora no» cierra el aviso sin escuchar ni recordar',!(await vis(p,'#smicok'))&&(await vz(p)).started===0&&(await p.evaluate(()=>localStorage.getItem('cuadra-voz')))===null);
  await p.click('#smic');await W(p);await p.click('[data-vozok="1"]');await W(p);
  T('«Entendido, dictar» recuerda la decisión y empieza a escuchar',(await vz(p)).started===1&&(await p.evaluate(()=>localStorage.getItem('cuadra-voz')))==='1'&&(await p.getAttribute('#smic','aria-pressed'))==='true');
  T('mientras escucha lo dice y el idioma es es-PE',/Escuchando/.test(await p.innerText('#smicst'))&&(await vz(p)).lang==='es-PE'&&(await p.getAttribute('#smic','aria-label'))==='Detener dictado');
  await p.evaluate(()=>window.__vzSay('almuerzo veinticinco yape'));await W(p);
  T('lo dictado llena la frase y se entiende en vivo (25, Yape)',(await p.inputValue('#smsg'))==='almuerzo veinticinco yape'&&(await p.inputValue('#sa'))==='25'&&/Yape/.test(await p.innerText('#sapv')));
  await p.click('#smic');await W(p);
  T('tocar de nuevo detiene el dictado',(await vz(p)).stopped===1&&(await p.getAttribute('#smic','aria-pressed'))==='false');
  T('dictar no guarda nada solo: el gasto sigue pendiente de «Guardar»',await vis(p,'#sheet'));
  await p.click('[data-s="save"]');await p.waitForTimeout(400);
  T('al guardar se registra el gasto dictado',await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].hor.some(r=>/^Almuerzo$/.test(r.c)&&r.m===25),K));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // Con aviso ya aceptado, va directo; errores explicados
  p=await nueva(b,{acepto:true});await abrir(p);await p.click('#smic');await W(p);
  T('con el aviso ya aceptado, empieza a escuchar de inmediato',(await vz(p)).started===1&&!(await vis(p,'#smicok')));
  await p.evaluate(()=>window.__vzErr('not-allowed'));await W(p);
  T('permiso denegado: lo explica en español y el botón vuelve a «Dictar»',/No tengo permiso para usar el micrófono/.test(await p.innerText('#smicst'))&&(await p.getAttribute('#smic','aria-pressed'))==='false');
  await p.click('#smic');await W(p);await p.evaluate(()=>window.__vzErr('no-speech'));await W(p);
  T('sin voz: «No te escuché»',/No te escuché/.test(await p.innerText('#smicst')));
  await p.click('#smic');await W(p);await p.evaluate(()=>window.__vzErr('network'));await W(p);
  T('sin internet: lo explica',/Sin conexión/.test(await p.innerText('#smicst')));
  // Cerrar mientras escucha detiene el micrófono
  await p.click('#smic');await W(p);const s0=(await vz(p)).stopped;
  await p.click('[data-s="close"]');await W(p);
  T('cerrar la ventana mientras escucha apaga el micrófono',(await vz(p)).stopped===s0+1);
  await p.context().close();
  // Cambiar a manual también lo apaga
  p=await nueva(b,{acepto:true});await abrir(p);await p.click('#smic');await W(p);const s1=(await vz(p)).stopped;
  await p.click('#smodesw');await W(p);
  T('cambiar a manual mientras escucha apaga el micrófono',(await vz(p)).stopped===s1+1);
  await p.context().close();

  // Sin soporte del navegador: no hay botón
  p=await nueva(b,{sinSoporte:true});await abrir(p);
  T('si el navegador no soporta dictado, no se muestra el botón (y la frase escrita sigue funcionando)',!(await vis(p,'#smic'))&&await vis(p,'#smsg'));
  await p.context().close();

  // Inglés
  p=await nueva(b,{lang:'en'});await abrir(p);await p.click('#smic');await W(p);
  T('en inglés el aviso se traduce',/processed by your browser/.test(await p.innerText('#smicok')));
  await p.click('[data-vozok="1"]');await W(p);
  T('y el reconocedor usa en-US',(await vz(p)).lang==='en-US');
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
