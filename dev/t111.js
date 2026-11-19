// t111: la tarjeta Ingresos (mes, escritorio) llena su hueco con «Del ingreso del mes»: cuánto fue a fijos, cotidianos, ahorro/inversión y lo disponible.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=fs.readFileSync(__dirname+'/demo.json','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,w,lang)=>{const ctx=await b.newContext({viewport:{width:w,height:900},locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[demo,'mis-finanzas-prototipo-v1',lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const box=p=>p.evaluate(()=>{const e=document.getElementById('ingsum');if(!e)return null;const r=e.getBoundingClientRect(),c=document.querySelector('[data-cid="ing"]').getBoundingClientRect();return{vis:r.height>0,txt:e.innerText,inside:r.bottom<=c.bottom&&r.right<=c.right+1,over:document.documentElement.scrollWidth>innerWidth};});
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,1280);let c=await box(p);
  T('en escritorio se ve el resumen dentro de la tarjeta, sin desbordar',!!c&&c.vis&&c.inside&&!c.over);
  T('muestra fijos, cotidianos, ahorro e inversión y disponible con sus montos',!!c&&/Gastos fijos[\s\S]*2,015\.00/.test(c.txt)&&/Gastos cotidianos[\s\S]*485\.00/.test(c.txt)&&/Ahorro e inversión[\s\S]*500\.00/.test(c.txt)&&/Disponible[\s\S]*2,300\.00/.test(c.txt));
  // al registrar otro ingreso se actualiza solo
  await p.click('[data-new="ing"]');await p.waitForSelector('#sheet');await p.waitForTimeout(200);
  await p.evaluate(()=>{const a=document.getElementById('sa');if(a){a.value='700';a.dispatchEvent(new Event('input',{bubbles:true}));}const d=document.getElementById('sd');if(d){d.value='Extra';d.dispatchEvent(new Event('input',{bubbles:true}));}});
  await p.waitForTimeout(150);
  await p.evaluate(()=>{const s=document.querySelector('#sheet [data-s="save"]');if(s)s.click();});await p.waitForTimeout(600);
  c=await box(p);T('después de guardar otro ingreso, el resumen se actualiza (disponible sube)',!!c&&/Disponible[\s\S]*3,000\.00/.test(c.txt));
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();
  p=await nueva(b,390);c=await box(p);T('en celular el resumen no se muestra',!!c&&!c.vis);await p.context().close();
  p=await nueva(b,1280,'en');c=await box(p);T('en inglés se traduce',!!c&&/Of this month's income/.test(c.txt)&&/Available/.test(c.txt)&&/Fixed expenses/.test(c.txt));await p.context().close();
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
