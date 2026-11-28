// t106: la pantalla del mes en escritorio. El encabezado ocupa todo el ancho de la ventana y el contenido se alinea a la columna de las tarjetas;
// las tarjetas forman un bento sin huecos (7/5, 4/4/4, 4/4/4, 7/5, 4/4/4, 8/4, franja). En celular nada cambia.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const mes=async(b,w,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:w,height:900},isMobile:w<500,hasTouch:w<500,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765')||u.startsWith('https://fonts.g'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,k,l,sk,th])=>{if(!sessionStorage.getItem('qa')){sessionStorage.setItem('qa','1');localStorage.setItem(k,d);localStorage.setItem(k+'-skin',sk||'cuadre');localStorage.setItem(k+'-tema',th||'light');localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{rec:[{sec:'fij',s:'fij',c:'T106 Colegio',m:350,k:'',src:'liq:0',f:25}]})}),K,o.lang||'',o.skin,o.tema]);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#board');await p.waitForTimeout(900);return p;};
const box=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e||e.offsetParent===null&&getComputedStyle(e).position!=='fixed')return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,w:r.width,h:r.height,r:r.right};},s);
const card=(p,id)=>box(p,'[data-cid="'+id+'"]');
const sinDesborde=p=>p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
(async()=>{
  const b=await chromium.launch();
  for(const w of [1280,1920]){
    const p=await mes(b,w);const vw=await p.evaluate(()=>document.documentElement.clientWidth);
    const h=await box(p,'.hero');
    T(w+' px: el encabezado ocupa todo el ancho de la ventana',!!h&&h.x<=1&&Math.abs(h.w-vw)<=1);
    T(w+' px: el encabezado no tiene esquinas redondeadas',await p.evaluate(()=>getComputedStyle(document.querySelector('.hero')).borderTopLeftRadius==='0px'));
    const bd=await card(p,'mk'),hm=await box(p,'.hero .hero-main');
    T(w+' px: el texto del encabezado se alinea con el borde izquierdo de las tarjetas',!!hm&&!!bd&&Math.abs(hm.x-bd.x)<=2);
    const lq=await box(p,'.hero .liq');
    T(w+' px: el panel «Dónde está tu dinero» termina en el borde derecho de las tarjetas',!!lq&&Math.abs(lq.r-bd.r)<=2);
    T(w+' px: «Por pagar» y las tarjetas comparten la misma columna',Math.abs((await box(p,'.ppcard')).x-bd.x)<=1&&Math.abs((await box(p,'.ppcard')).w-bd.w)<=1);
    T(w+' px: sin desborde horizontal',await sinDesborde(p));
    T(w+' px: sin errores de JavaScript',p.errs.length===0);if(p.errs.length)console.log(p.errs);
    if(w===1280){
      const g={};for(const id of ['pre','dg','sem','ing','fij','hor','bbva','bcp','oh','aho','inv','mc1','mc2','mc3','hm1','eur','tcm'])g[id]=await card(p,id);
      T('todas las tarjetas del mes se ven',Object.values(g).every(Boolean));
      const fila=(...ids)=>ids.every(i=>Math.abs(g[i].y-g[ids[0]].y)<4);
      T('fila: presupuesto (7) y «¿Dónde gastas más?» (5)',fila('pre','dg')&&Math.abs(g.pre.w/g.dg.w-7/5)<0.15);
      T('fila: ingresos, gastos fijos y cotidianos, tres iguales',fila('ing','fij','hor')&&Math.abs(g.ing.w-g.fij.w)<4&&Math.abs(g.fij.w-g.hor.w)<4);
      T('fila: BBVA, BCP y oh! tres iguales',fila('bbva','bcp','oh')&&Math.abs(g.bbva.w-g.bcp.w)<4);
      T('fila: ahorros (7) e inversiones (5)',fila('aho','inv')&&g.aho.w>g.inv.w);
      T('fila: los tres gráficos del mes',fila('mc1','mc2','mc3'));
      T('fila: gasto por día (8) y apuntes (4); el tipo de cambio es una franja entera debajo',fila('hm1','eur')&&g.hm1.w>g.eur.w&&g.tcm.w>g.hm1.w*1.4&&g.tcm.y>g.hm1.y+g.hm1.h-2);
      T('las tarjetas de una misma fila tienen la misma altura (sin escalones)',[['pre','dg'],['ing','fij','hor'],['bbva','bcp','oh'],['aho','inv'],['mc1','mc2','mc3']].every(f=>f.every(i=>Math.abs(g[i].h-g[f[0]].h)<4)));
      T('cada fila empieza donde termina la anterior (sin huecos grandes)',(g.sem?(g.sem.y-(g.pre.y+g.pre.h))<40&&(g.ing.y-(g.sem.y+g.sem.h))<40:(g.ing.y-(g.pre.y+g.pre.h))<40)&&(g.bbva.y-(g.ing.y+g.ing.h))<40&&(g.aho.y-(g.bbva.y+g.bbva.h))<40&&(g.mc1.y-(g.aho.y+g.aho.h))<40&&(g.hm1.y-(g.mc1.y+g.mc1.h))<40);
      T('el botón «Pagar» de cada tarjeta queda abajo, alineado en las tres',await p.evaluate(()=>{const r=['bbva','bcp','oh'].map(k=>{const c=document.querySelector('[data-cid="'+k+'"]').getBoundingClientRect(),bt=document.querySelector('[data-cid="'+k+'"] .cardpay').getBoundingClientRect();return Math.round(c.bottom-bt.bottom);});return Math.max(...r)-Math.min(...r)<=3&&r[0]<40;}));
      // Personalizar sigue funcionando
      await p.click('button:has-text("Personalizar")');await p.waitForTimeout(500);
      T('«Personalizar» sigue mostrando los asideros para mover y cambiar tamaño',await p.locator('.bcard .ctb').count()>=10&&await p.locator('.bcard .rz').count()>=10);
    }
    await p.context().close();
  }
  // 1100 px: sigue entero y sin desborde
  {const p=await mes(b,1100);const a=await card(p,'pre'),d=await card(p,'dg');
   T('1100 px: presupuesto y «dónde gastas» siguen en una fila y no hay desborde',!!a&&!!d&&Math.abs(a.y-d.y)<4&&await sinDesborde(p));await p.context().close();}
  // 900 px (límite)
  {const p=await mes(b,900);T('900 px: sin desborde horizontal',await sinDesborde(p));await p.context().close();}
  // Celular: el encabezado sigue siendo una tarjeta dentro de la columna
  {const p=await mes(b,390);const h=await box(p,'.hero');
   T('390 px: el encabezado sigue dentro de los márgenes (tarjeta redondeada, no a pantalla completa)',!!h&&h.x>=8&&h.w<=390-16&&await p.evaluate(()=>getComputedStyle(document.querySelector('.hero')).borderTopLeftRadius!=='0px'));
   T('390 px: sin desborde horizontal',await sinDesborde(p));await p.context().close();}
  // Los tres estilos y oscuro: el encabezado sigue a pantalla completa
  for(const [sk,th] of [['escalon','dark'],['original','light']]){const p=await mes(b,1280,{skin:sk,tema:th});const vw=await p.evaluate(()=>document.documentElement.clientWidth),h=await box(p,'.hero');
   T('estilo '+sk+' ('+th+'): encabezado a pantalla completa y sin desborde',!!h&&h.x<=1&&Math.abs(h.w-vw)<=1&&await sinDesborde(p));await p.context().close();}
  // Inglés
  {const p=await mes(b,1280,{lang:'en'});T('en inglés se mantiene el layout y se traduce («You have available»)',/available/i.test(await p.innerText('.hero'))&&(await card(p,'pre'))!==null);await p.context().close();}
  // Tira de papel (Cuadre): blanco cálido en claro y papel oscuro en oscuro, con todo legible, también un saldo negativo.
  for(const [tema,neg] of [["dark",false],["dark",true],["light",false]]){const c=await b.newContext({viewport:{width:1366,height:800},colorScheme:tema});await c.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:8765")?r.continue():r.abort());
   const d=require("./demo.json"),S=JSON.parse(JSON.stringify(d.S));if(neg)S["2026"][10].liq[0].m=-5000;
   await c.addInitScript(([x,k])=>{localStorage.setItem(k,x);localStorage.setItem(k+"-instalar","1");localStorage.setItem(k+"-skin","cuadre");},[JSON.stringify({v:1,S,cfg:Object.assign({},d.cfg,{onb:1})}),"mis-finanzas-prototipo-v1"]);
   const q=await c.newPage();await q.goto("http://127.0.0.1:8765/wrap-repo.html#noviembre");await q.waitForSelector("#app .hero .liq");await q.waitForTimeout(600);
   const m=await q.evaluate(()=>{const L=s=>{const [r,g,b]=s.match(/[0-9.]+/g).map(Number),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
     const l=document.querySelector("#app .hero .liq"),bg=getComputedStyle(l).backgroundColor;let min=99;for(const e of l.querySelectorAll("*")){if(!e.getClientRects().length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const a=L(getComputedStyle(e).color),z=L(bg);min=Math.min(min,(Math.max(a,z)+.05)/(Math.min(a,z)+.05));}return{bg,min};});
   T("tira "+tema+(neg?" con saldo negativo":"")+": "+(tema==="dark"?"papel oscuro":"blanco cálido")+" y legible ("+m.min.toFixed(1)+":1)",(tema==="dark"?m.bg==="rgb(32, 36, 34)":m.bg==="rgb(233, 231, 226)")&&m.min>=4.5);await c.close();}
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
