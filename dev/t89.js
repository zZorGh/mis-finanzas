// t89: atajos «De siempre». Un concepto con el mismo monto las últimas veces (pasaje) se registra con un toque;
// uno que varía (menú) solo se llena y deja escribir el monto. Un monto ya escrito nunca se pisa ni se guarda solo.
const {chromium}=require('playwright');const fs=require('fs');
const man=async(p,m)=>{if(await p.locator('#sheet[data-mode="ask"]').count())await p.click('#sheet [data-mode="'+(m||'manual')+'"]');};
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
// Siembra: 20 pasajes de S/ 1.50 y 20 menús de monto variable, con la cuenta Yape (liq:0)
const H=demo.S['2026'][10].hor;for(let i=0;i<20;i++){H.push({c:'Pasaje',m:1.5,f:(1+i%28)+'-nov',k:'',src:'liq:0'});H.push({c:'Menú',m:[11,12,14][i%3],f:(1+i%28)+'-nov',k:'',src:'liq:0'});}
const count=(p,c)=>p.evaluate(([k,c])=>{const S=JSON.parse(localStorage.getItem(k)).S;let n=0;Object.keys(S).forEach(y=>S[y].forEach(m=>['hor','fij'].forEach(s=>(m[s]||[]).forEach(r=>{if(r.c===c)n++;}))));return n;},[K,c]);
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');}},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),K]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);
  const abrir=async()=>{await p.click('#fab');await p.waitForSelector('#sheet');await man(p);await p.waitForTimeout(200);};
  const chip=n=>p.locator('#ssug [data-sg2="'+n+'"]');

  await abrir();
  T('«Pasaje» aparece como atajo',await chip('Pasaje').count()===1);
  T('«Pasaje» (monto estable) lleva su monto y marca de un toque',/1\.50/.test(await chip('Pasaje').innerText())&&/fast/.test(await chip('Pasaje').getAttribute('class')));
  T('«Menú» (monto variable) no se marca como un toque',await chip('Menú').count()===1&&!/fast/.test(await chip('Menú').getAttribute('class'))&&!/\d/.test(await chip('Menú').innerText()));
  T('los atajos están arriba, antes del monto',await p.evaluate(()=>{const a=document.getElementById('ssug'),m=document.getElementById('sa');return !!(a.compareDocumentPosition(m)&4);}));

  const n0=await count(p,'Pasaje');
  await chip('Pasaje').click();await p.waitForTimeout(500);
  T('un toque en «Pasaje» lo registra y cierra el formulario',await p.locator('#sheet').count()===0&&(await count(p,'Pasaje'))===n0+1);
  T('avisa con «Deshacer»',/Guardado en Gastos cotidianos/.test(await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||''))&&await p.locator('#toast [data-undo]').count()===1);
  await p.click('#toast [data-undo]');await p.waitForTimeout(400);
  T('«Deshacer» quita el pasaje',(await count(p,'Pasaje'))===n0);

  await abrir();const m0=await count(p,'Menú');
  await chip('Menú').click();await p.waitForTimeout(300);
  T('«Menú» (variable) solo se llena: no se guarda solo',await p.locator('#sheet').count()===1&&(await count(p,'Menú'))===m0&&(await p.inputValue('#sd'))==='Menú'&&(await p.inputValue('#sa'))!=='');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);

  await abrir();await p.fill('#sa','9');
  await chip('Pasaje').click();await p.waitForTimeout(300);
  T('con un monto ya escrito, el atajo no lo pisa ni guarda solo',await p.locator('#sheet').count()===1&&(await p.inputValue('#sa'))==='9'&&(await count(p,'Pasaje'))===n0);

  T('sin errores de JavaScript',errs.length===0);if(errs.length)console.log(errs);
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
