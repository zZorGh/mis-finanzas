// t96: las 3 categorías principales (Necesidades, Deseos, Ahorro e inversión). La persona clasifica sus categorías en Ajustes y la tarjeta
// «¿Dónde gastas más?» del mes reparte lo gastado en esos grupos; la regla 50/30/20 usa la misma clasificación.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const nueva=async(b,hash,cfgExtra,lang)=>{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  const cfg=Object.assign({},demo.cfg,cfgExtra||{});
  await p.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin','cuadre');localStorage.setItem(k+'-tema','light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg}),K,lang||'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app');await p.waitForTimeout(900);return p;};
const dg=p=>p.evaluate(()=>{const e=document.getElementById('dgbox');return e?e.innerText:'';});
const grp=(p,n)=>p.evaluate(n=>{const g=[...document.querySelectorAll('#dgbox .dgg')].find(x=>x.querySelector('.dgn').textContent.trim()===n);return g?{t:g.querySelector('.dgh b').textContent.trim(),items:[...g.querySelectorAll('li')].map(l=>l.children[0].textContent.trim())}:null;},n);
const cfgNow=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).cfg,K);
(async()=>{
  const b=await chromium.launch();let p=await nueva(b,'#noviembre');
  // 1. Sin clasificar nada: la tarjeta existe y reparte por la regla de siempre
  T('aparece la tarjeta «¿Dónde gastas más?» en el mes',/¿Dónde gastas más\?/.test(await p.evaluate(()=>document.querySelector('[data-cid="dg"]').innerText)));
  {const n=await grp(p,'Necesidades'),w=await grp(p,'Deseos'),a=await grp(p,'Ahorro e inversión');
   T('Necesidades incluye Alquiler y las categorías «Necesidad»; Deseos incluye Menú (cotidiano sin clasificar)',!!n&&n.items.includes('Necesidad')&&!!w&&w.items.includes('Menú'));
   T('Ahorro e inversión muestra lo ahorrado e invertido del mes',!!a&&a.items.includes('Inversión'));}
  T('dice cuál es el mayor gasto del mes',/Tu mayor gasto\s*Necesidad/.test((await dg(p)).replace(/\n/g,' ')));
  T('avisa que hay gasto sin clasificar y enlaza a Ajustes',/Sin clasificar/.test(await dg(p))&&await p.locator('#dgbox a[href="#ajustes"]').count()===1);
  const pu0=await p.evaluate(()=>document.getElementById('pu0').textContent);
  await p.context().close();

  // 2. Clasificar categorías cambia el reparto y la regla 50/30/20
  p=await nueva(b,'#noviembre',{catGrupo:{'menú':'need','transporte':'ai'}});
  {const n=await grp(p,'Necesidades'),a=await grp(p,'Ahorro e inversión');
   T('Menú pasa a Necesidades',!!n&&n.items.includes('Menú'));
   T('una categoría puesta en Ahorro e inversión (Transporte) se cuenta ahí',!!a&&a.items.includes('Transporte'));}
  T('la regla 50/30/20 usa la misma clasificación (Necesidades gastado cambia)',(await p.evaluate(()=>document.getElementById('pu0').textContent))!==pu0);
  T('sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 3. Ajustes: cada categoría en su grupo, cambiar de grupo, agregar y quitar
  p=await nueva(b,'#ajustes');
  T('Ajustes muestra los tres grupos y las categorías dentro de cada uno',await p.locator('.cgg').count()>=3&&await p.locator('select[data-catg]').count()>=9);
  const iMenu=await p.evaluate(()=>{const c=JSON.parse(localStorage.getItem('mis-finanzas-prototipo-v1')).cfg.cats;return c.indexOf('Menú');});
  await p.selectOption('select[data-catg="'+iMenu+'"]','want');await p.waitForTimeout(300);
  T('elegir un grupo en Ajustes lo guarda',(await cfgNow(p)).catGrupo['menú']==='want');
  T('la categoría pasa al bloque de Deseos',await p.evaluate(()=>{const g=[...document.querySelectorAll('.cgg')].find(x=>x.querySelector('b').textContent==='Deseos');return !!g&&[...g.querySelectorAll('.cgn')].some(i=>i.value==='Menú');}));
  await p.fill('#nc','T96 Mascotas');await p.selectOption('#nc-g','need');await p.click('#addcat');await p.waitForTimeout(300);
  T('una categoría nueva se agrega con el grupo elegido',(await cfgNow(p)).catGrupo['t96 mascotas']==='need'&&(await cfgNow(p)).cats.includes('T96 Mascotas'));
  {const i=(await cfgNow(p)).cats.indexOf('T96 Mascotas');await p.click('button[data-cat="'+i+'"]');await p.waitForTimeout(300);}
  T('al quitar la categoría se borra también su grupo',!(await cfgNow(p)).cats.includes('T96 Mascotas')&&!('t96 mascotas' in (await cfgNow(p)).catGrupo));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#dgbox');await p.waitForTimeout(500);
  T('el cambio de Menú a Deseos se ve en el mes tras recargar',(await grp(p,'Deseos')).items.includes('Menú'));
  T('sin errores de JavaScript (Ajustes)',p.errs.length===0);if(p.errs.length)console.log(p.errs);
  await p.context().close();

  // 4. Datos dañados: valores inválidos se descartan
  p=await nueva(b,'#noviembre',{catGrupo:{'menú':'raro','TRANSPORTE':'ai',ocio:5}});
  {const w=await grp(p,'Deseos'),a=await grp(p,'Ahorro e inversión');T('un grupo inválido se ignora (Menú sigue en Deseos) y los nombres se leen sin importar mayúsculas (TRANSPORTE → Ahorro e inversión)',!!w&&w.items.includes('Menú')&&!!a&&a.items.includes('Transporte'));}
  T('sin errores con datos dañados',p.errs.length===0);
  await p.context().close();

  // 5. Inglés
  p=await nueva(b,'#noviembre',null,'en');
  {const x=await p.evaluate(()=>document.querySelector('[data-cid="dg"]').innerText);T('en inglés se traduce (Needs, Wants, Where do you spend the most?)',/Where do you spend the most\?/.test(x)&&/Needs/.test(x)&&/Wants/.test(x)&&!/Necesidades|Deseos/.test(x));}
  await p.context().close();

  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
