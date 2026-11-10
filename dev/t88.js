// t88: lote 3 de la prueba de carga previa al beta: accesibilidad e inglés.
// Foco tras redibujar, diálogo de reportes, «Deshacer» con teclado, alto contraste, botones táctiles,
// zoom 400 %, etiquetas para lectores de pantalla y textos sin traducir en inglés.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demoTxt=fs.readFileSync(__dirname+'/demo.json','utf8');
const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c,x)=>{c?ok++:(bad++,console.log('FALLA',n,x===undefined?'':JSON.stringify(x)));};
const JS={contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}};
async function abrir(b,vp,o){o=o||{};
  const ctx=await b.newContext({viewport:vp,isMobile:!!o.movil,hasTouch:!!o.movil,forcedColors:o.forced?'active':'none'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});return r.abort();});
  await p.addInitScript(([s,k,en])=>{if(!localStorage.getItem('qa')){localStorage.setItem(k,s);localStorage.setItem(k+'-instalar','1');localStorage.setItem('qa','1');if(en)localStorage.setItem('cuadra-lang','en');}window.claude={use:async()=>null};},[demoTxt,K,!!o.en]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(o.hash||'#noviembre'));await p.waitForTimeout(900);return p;}
const act=p=>p.evaluate(()=>{const e=document.activeElement;return {id:e.id||'',tag:e.tagName,skin:e.dataset&&e.dataset.skinSet||'',rp:e.dataset&&e.dataset.rp||'',inSheet:!!(e.closest&&e.closest('#sheet')),body:e===document.body};});

(async()=>{
  const b=await chromium.launch();

  /* ----- Foco ----- */
  {const p=await abrir(b,{width:1280,height:800});
   await p.focus('#th');await p.keyboard.press('Enter');await p.waitForTimeout(400);let a=await act(p);T('foco: tras cambiar el tema sigue en «Tema»',a.id==='th',a);
   await p.focus('#lg');await p.keyboard.press('Enter');await p.waitForTimeout(500);a=await act(p);T('foco: tras cambiar el idioma sigue en el botón de idioma',a.id==='lg',a);
   await p.keyboard.press('Enter');await p.waitForTimeout(500);
   await p.evaluate(()=>location.hash='#ajustes');await p.waitForTimeout(400);
   await p.focus('[data-skin-set="escalon"]');await p.keyboard.press('Enter');await p.waitForTimeout(500);a=await act(p);T('foco: tras cambiar el estilo sigue en esa opción',a.skin==='escalon',a);
   await p.evaluate(()=>location.hash='#noviembre');await p.waitForTimeout(400);
   // diálogo de reportes
   await p.focus('[data-act="rep"]');await p.keyboard.press('Enter');await p.waitForSelector('#sheet');await p.waitForTimeout(200);a=await act(p);T('reportes: al abrirse el foco entra al diálogo',a.inSheet,a);
   await p.focus('[data-rp="m3"]');await p.keyboard.press('Enter');await p.waitForTimeout(300);a=await act(p);T('reportes: tras elegir un período el foco no se pierde',a.rp==='m3'&&a.inSheet,a);
   await p.keyboard.press('Escape');await p.waitForTimeout(300);T('reportes: Escape cierra el diálogo',await p.locator('#sheet').count()===0);
   a=await act(p);T('reportes: al cerrar el foco vuelve a quien lo abrió',a.tag==='BUTTON'&&!a.inSheet&&!a.body,a);
   await p.focus('[data-act="rep"]');await p.keyboard.press('Enter');await p.waitForSelector('#sheet');await p.keyboard.press('Escape');await p.waitForTimeout(200);
   T('reportes: Escape cierra sin haber tabulado dentro',await p.locator('#sheet').count()===0);
   T('foco: sin errores',p.errs.length===0,p.errs[0]);await p.context().close();}

  /* ----- «Deshacer» con teclado y sin prisa ----- */
  {const p=await abrir(b,{width:1280,height:800});
   await p.click('.caplink');await p.waitForSelector('#sheet');await p.click('#stype [data-g="ing"]');await p.fill('#sa','7');await p.fill('#sd','T88 ingreso');await p.click('[data-s="save"]');await p.waitForTimeout(300);
   const hay=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.some(r=>r.c==='T88 ingreso'),K);
   T('deshacer: el movimiento quedó guardado',await hay());
   await p.waitForTimeout(7500);T('deshacer: el aviso sigue visible pasados 7 s',await p.locator('.toast [data-undo]').isVisible());
   await p.keyboard.press('Control+z');await p.waitForTimeout(400);T('deshacer: Ctrl+Z lo deshace sin buscar el botón',!(await hay()));
   // en un campo de texto Ctrl+Z no se roba
   await p.click('.caplink');await p.waitForSelector('#sheet');await p.click('#stype [data-g="ing"]');await p.fill('#sa','8');await p.fill('#sd','T88 b');await p.click('[data-s="save"]');await p.waitForTimeout(300);
   await p.click('.caplink');await p.waitForSelector('#sheet');await p.focus('#sd');await p.keyboard.press('Control+z');await p.waitForTimeout(300);
   T('deshacer: con el cursor en un campo, Ctrl+Z no toca los movimientos',await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).S['2026'][10].ing.some(r=>r.c==='T88 b'),K));
   await p.context().close();}

  /* ----- Alto contraste ----- */
  {const p=await abrir(b,{width:1280,height:800},{forced:true});
   await p.click('.caplink');await p.waitForSelector('#sheet');
   const o=await p.evaluate(()=>{const f=e=>{const c=getComputedStyle(e);return {w:parseFloat(c.outlineWidth)||0,s:c.outlineStyle};};const a=document.querySelector('#stype [aria-checked="true"]'),n=document.querySelector('#stype [aria-checked="false"]');return {sel:f(a),no:f(n)};});
   T('alto contraste: lo seleccionado tiene contorno y lo demás no',o.sel.w>=3&&o.sel.s!=='none'&&(o.no.w===0||o.no.s==='none'),o);await p.context().close();}

  /* ----- Celular: botones táctiles, zoom 400 %, tarjeta vacía ----- */
  {const p=await abrir(b,{width:390,height:844},{movil:true});
   const peques=await p.evaluate(()=>[...document.querySelectorAll('.tab,.jump .chip,button.b,summary,.cap-link,#lg,.bnav a,.bnav button')].filter(e=>e.offsetParent!==null).map(e=>({t:(e.innerText||e.id||e.className).toString().trim().slice(0,20),h:Math.round(e.getBoundingClientRect().height),w:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.h<44||x.w<44).filter(x=>!(x.h>=44)||x.w<30));
   T('celular: botones, pestañas y atajos miden al menos 44 px de alto',peques.every(x=>x.h>=44),peques.slice(0,6));
   await p.evaluate(()=>location.hash='#resumen');await p.waitForTimeout(500);
   T('celular: la tarjeta de un mes sin datos no se ve apagada',await p.evaluate(()=>{const c=document.querySelector('.mcard.off');return !c||getComputedStyle(c).opacity==='1';}));
   T('celular: sin errores',p.errs.length===0,p.errs[0]);await p.context().close();}
  {const p=await abrir(b,{width:320,height:256},{movil:true});
   const o=await p.evaluate(()=>({pos:getComputedStyle(document.querySelector('header')).position,sobra:Math.round(innerHeight-document.querySelector('.bnav').getBoundingClientRect().height)}));
   T('zoom 400 %: la cabecera no se queda fija y la barra inferior se compacta',o.pos==='static'&&o.sobra>150,o);await p.context().close();}

  /* ----- Etiquetas para lectores de pantalla ----- */
  {const p=await abrir(b,{width:1280,height:800});
   T('etiquetas: «Tema» informa si está activado (aria-pressed)',(await p.getAttribute('#th','aria-pressed'))!==null);
   T('etiquetas: el botón de idioma incluye «EN» en su nombre',/EN/.test(await p.getAttribute('#lg','aria-label')));
   await p.keyboard.press('Tab');const a=await act(p);T('saltar al contenido: es lo primero que recibe el foco',await p.evaluate(()=>document.activeElement.hasAttribute('data-skip')),a);
   await p.keyboard.press('Enter');T('saltar al contenido: lleva el foco al contenido',await p.evaluate(()=>document.activeElement.id==='app'));
   const g=await p.evaluate(()=>{const c=document.querySelector('canvas');return {n:[...document.querySelectorAll('canvas')].map(c=>(c.getAttribute('aria-label')||'').length)};});
   T('etiquetas: los gráficos describen sus datos (no solo el título)',g.n.length>0&&g.n.every(n=>n>40),g);
   T('etiquetas: los días del calendario se pueden leer',await p.evaluate(()=>{const c=[...document.querySelectorAll('.hmcell[role="img"]')];return c.length>20&&c.every(x=>/\d/.test(x.getAttribute('aria-label')||''));}));
   await p.evaluate(()=>location.hash='#ajustes');await p.waitForTimeout(400);
   T('etiquetas: Ajustes tiene su encabezado principal',await p.evaluate(()=>{const h=document.querySelector('h1');return !!h&&/Ajustes/.test(h.textContent);}));
   await p.click('.caplink');await p.waitForSelector('#sheet');T('etiquetas: el formulario de registro dice «Nuevo movimiento»',(await p.getAttribute('#sheet','aria-label'))==='Nuevo movimiento');
   await p.keyboard.press('Escape');
   await p.evaluate(()=>location.hash='#noviembre');await p.waitForTimeout(400);await p.locator('[data-edit="fij"]').first().click();await p.waitForSelector('#sheet');
   T('etiquetas: el formulario de edición dice «Editar movimiento»',(await p.getAttribute('#sheet','aria-label'))==='Editar movimiento');
   await p.context().close();}

  /* ----- Inglés: textos que estaban sin traducir ----- */
  {const p=await abrir(b,{width:1280,height:800},{en:true});
   const todo=async()=>p.evaluate(()=>{const o=[document.body.innerText];document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(e=>['aria-label','title','placeholder'].forEach(a=>{const v=e.getAttribute(a);if(v)o.push(v);}));return o.join('\n');});
   const noDebe=['Pagar BBVA','Pagar BCP','Apuntes','Fijos 2,015','Hormiga 485','Gastos fijos 2,015','Gastos hormiga 485','Yape, Plin y efectivo','Remove movimiento','Noviembre 2:','Descargar PDF','Descargar Excel'];
   let txt=await todo();T('inglés: el mes (noviembre) está traducido',noDebe.every(s=>!txt.includes(s)),noDebe.filter(s=>txt.includes(s)));
   await p.evaluate(()=>location.hash='#enero');await p.waitForTimeout(500);txt=await todo();T('inglés: un mes cerrado: «Lo que tenías al cierre…» traducido',!txt.includes('Yape, Plin y efectivo')&&!/Fijos \d/.test(txt),txt.match(/.{0,30}Yape, Plin y.{0,20}/));
   await p.evaluate(()=>location.hash='#noviembre');await p.waitForTimeout(400);
   await p.focus('[data-act="rep"]');await p.keyboard.press('Enter');await p.waitForSelector('#sheet');await p.waitForTimeout(300);
   txt=await todo();const noRep=['Año 2026','Año 2025','Descargar PDF','Descargar Excel','Ingresos S/','Resultado S/',' mes ·',' meses ·','Noviembre 2026','Enero 2026'];
   T('inglés: el diálogo de reportes está traducido',noRep.every(s=>!txt.includes(s)),noRep.filter(s=>txt.includes(s)));
   T('inglés: sin errores',p.errs.length===0,p.errs[0]);await p.context().close();}

  await b.close();console.log('Total',ok+bad,'ok',ok,'fallas',bad);process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
