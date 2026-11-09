// t86: verificación de integridad de librerías externas (atributo integrity).
// Una librería alterada no se ejecuta; con las reales, los reportes PDF y Excel siguen funcionando.
// Necesita internet: baja ExcelJS y jsPDF reales de cdn.jsdelivr.net.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=fs.readFileSync(__dirname+'/demo.json','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const JS={contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}};
(async()=>{
 const b=await chromium.launch();
 const mk=async o=>{const ctx=await b.newContext({viewport:{width:1100,height:800},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();
   if(u.startsWith('http://127.0.0.1:8765'))return r.continue();
   if(u.includes('hart'))return r.fulfill({...JS,body:o.badChart?chart+'\n//alterado':chart});
   if(/cdn\.jsdelivr\.net\/npm\/(exceljs|jspdf)/.test(u)){
    if(o.badPdf&&u.includes('jspdf.umd'))return r.fulfill({...JS,body:'window.__malo=1;'});
    return r.continue();}
   return r.abort();});
  await p.addInitScript(s=>{localStorage.setItem('mis-finanzas-prototipo-v1',s);window.claude={use:async()=>null};},demo);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForTimeout(1200);p.errs=errs;return p;};
 const openRep=async p=>{await p.locator('[data-act="rep"]').first().scrollIntoViewIfNeeded();await p.locator('[data-act="rep"]').first().click();await p.waitForTimeout(300);};
 const dl=async p=>{const w=p.waitForEvent('download',{timeout:20000}).catch(()=>null);await p.locator('[data-s="rep"]').click();return await w;};

 // 1 librerías íntegras: gráficas y reportes funcionan
 let p=await mk({});
 T('1 Chart.js carga',await p.evaluate(()=>typeof Chart==='function'));
 await openRep(p);let d=await dl(p);
 T('1 descarga el PDF',!!d&&/\.pdf$/i.test(d.suggestedFilename()));
 await p.locator('button',{hasText:'Excel · para revisar las cifras'}).click();await p.waitForTimeout(200);
 d=await dl(p);T('1 descarga el Excel',!!d&&/\.xlsx$/i.test(d.suggestedFilename()));
 T('1 sin errores',p.errs.length===0);if(p.errs.length)console.log(p.errs);
 await p.context().close();

 // 2 Chart.js alterado: el navegador no lo ejecuta
 p=await mk({badChart:true});
 T('2 Chart.js alterado se bloquea',await p.evaluate(()=>typeof window.Chart==='undefined'));
 await p.context().close();

 // 3 jsPDF alterado: no se ejecuta y la app explica que no pudo crear el reporte
 p=await mk({badPdf:true});await openRep(p);d=await dl(p);
 T('3 no descarga con jsPDF alterado',!d);
 T('3 el código alterado no corrió',await p.evaluate(()=>!window.__malo));
 T('3 muestra aviso',/No pude cargar/.test(await p.locator('#rp-m').innerText()));
 await p.context().close();

 await b.close();console.log('Total',ok+bad,'ok',ok,'fallas',bad);process.exitCode=bad?1:0;
})();
