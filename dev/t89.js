// t89: atajos de un toque. Solo salen de los gastos recurrentes que la persona configuró (o creó marcando «Repetir cada mes»);
// nunca se inventan desde el historial. Un toque los registra; sin recurrentes no hay atajos.
const {chromium}=require('playwright');const fs=require('fs');
const man=async(p,m)=>{if(await p.locator('#sheet[data-mode="ask"]').count()){if(m==='auto')await p.click('#sheet [data-mode="auto"]');else if(m==='wizard')await p.click('#sheet [data-mode="manual"]');else{await p.click('#sheet [data-mode="auto"]');await p.click('#smodesw');}}};
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
// Historial con muchos «Menú» y «Café» (antes salían como sugerencias; ya no deben salir)
const H=demo.S['2026'][10].hor;for(let i=0;i<20;i++){H.push({c:'Menú',m:[11,12,14][i%3],f:(1+i%28)+'-nov',k:'',src:'liq:0'});H.push({c:'Café',m:5,f:(1+i%28)+'-nov',k:'',src:'liq:0'});}
const REC=[{sec:'hor',s:'hor',c:'Pasaje',m:1.5,k:'',src:'liq:0',f:1},{sec:'fij',s:'fij',c:'Alquiler',m:1300,k:'',src:'liq:0',f:1}];
const count=(p,c)=>p.evaluate(([k,c])=>{const S=JSON.parse(localStorage.getItem(k)).S;let n=0;Object.keys(S).forEach(y=>S[y].forEach(m=>['hor','fij'].forEach(s=>(m[s]||[]).forEach(r=>{if(r.c===c)n++;}))));return n;},[K,c]);
const recs=p=>p.evaluate(k=>(JSON.parse(localStorage.getItem(k)).cfg.rec||[]).map(r=>r.c),K);
const nueva=async(b,rec)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,{rec});
  await p.addInitScript(([d,k])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');}},[JSON.stringify({v:1,S:demo.S,cfg}),K]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const abrir=async p=>{await p.click('#fab');await p.waitForSelector('#sheet');await man(p);await p.waitForTimeout(200);};
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,REC);
  await abrir(p);
  T('con recurrentes configurados, salen sus atajos con el monto',await p.locator('#ssug [data-rec1]').count()===2&&/Pasaje/.test(await p.innerText('#ssug'))&&/1\.50/.test(await p.innerText('#ssug'))&&/Alquiler/.test(await p.innerText('#ssug'))&&/1,300/.test(await p.innerText('#ssug')));
  T('el historial NO inventa atajos (Menú, Café…)',!/Menú|Café|Almuerzos|Transporte/.test(await p.innerText('#ssug')));
  const n0=await count(p,'Pasaje');
  await p.click('#ssug [data-rec1="0"]');await p.waitForTimeout(500);
  T('un toque en «Pasaje» lo registra y cierra el formulario',await p.locator('#sheet').count()===0&&(await count(p,'Pasaje'))===n0+1);
  T('avisa con «Deshacer»',await p.locator('#toast [data-undo]').count()===1);
  await p.click('#toast [data-undo]');await p.waitForTimeout(400);
  T('«Deshacer» lo quita',(await count(p,'Pasaje'))===n0);
  await abrir(p);await p.click('#stype [data-g="ing"]');
  T('en un ingreso no salen atajos de gasto',await p.locator('#ssug [data-rec1]').count()===0);
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // sin recurrentes no hay atajos
  p=await nueva(b,[]);await abrir(p);
  T('sin recurrentes no sale ningún atajo',await p.locator('#ssug [data-rec1]').count()===0&&(await p.innerText('#ssug')).trim()==='');

  // crear un atajo desde «Más detalles» → «Repetir cada mes»
  T('«Repetir cada mes» está dentro de «Más detalles» y se ve al abrirlo',!(await p.locator('#srec').isVisible())&&await (async()=>{await p.click('#smore summary');await p.waitForTimeout(150);return p.locator('#srec').isVisible();})());
  await p.fill('#sa','7');await p.fill('#sd','Gimnasio');await p.click('#ssrc [data-src="liq:0"]');await p.check('#srec');
  const g0=await count(p,'Gimnasio');
  await p.click('[data-s="save"]');await p.waitForTimeout(500);
  T('al guardar con «Repetir cada mes» queda como recurrente',(await count(p,'Gimnasio'))===g0+1&&(await recs(p)).includes('Gimnasio'));
  await abrir(p);
  T('la próxima vez «Gimnasio» sale como atajo',/Gimnasio/.test(await p.innerText('#ssug'))&&/7\.00/.test(await p.innerText('#ssug')));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.click('[data-cid=hor] [data-edit="hor"]');await p.waitForSelector('#sheet');
  T('al editar un movimiento no se ofrece repetirlo',!(await p.locator('#srecw').isVisible()));
  T('sin errores de JavaScript (2)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
