// t110: los reportes (Excel y PDF) incluyen «Gastos por grupo» y «Antojos» (con si valieron la pena), y salen en el idioma de la app (ES/EN).
const {chromium}=require('playwright');const fs=require('fs');const zlib=require('zlib');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));
demo.S['2026'][10].hor.push({c:'Galleta',m:8,f:'16-nov',k:'Deseo',src:'liq:0',t:'ant',v:0},{c:'Helado',m:12,f:'17-nov',k:'Deseo',src:'liq:0',t:'ant',v:1},{c:'Chicle',m:2,f:'17-nov',k:'Deseo',src:'liq:0',t:'ant'});
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const JS={contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}};
/* lector mínimo de zip: devuelve {nombre: Buffer} */
const unzip=buf=>{const out={};let e=buf.length-22;while(buf.readUInt32LE(e)!==0x06054b50)e--;const n=buf.readUInt16LE(e+10);let p=buf.readUInt32LE(e+16);
  for(let i=0;i<n;i++){const m=buf.readUInt16LE(p+10),cs=buf.readUInt32LE(p+20),nl=buf.readUInt16LE(p+28),xl=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42),name=buf.slice(p+46,p+46+nl).toString();
    const ln=buf.readUInt16LE(lo+26),lx=buf.readUInt16LE(lo+28),d=buf.slice(lo+30+ln+lx,lo+30+ln+lx+cs);out[name]=m===8?zlib.inflateRawSync(d):d;p+=46+nl+xl+cl;}return out;};
(async()=>{
  const b=await chromium.launch();
  for(const L of ['es','en']){const EN=L==='en';
  const ctx=await b.newContext({viewport:{width:1100,height:800},acceptDownloads:true,locale:EN?'en-US':'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});if(/cdn\.jsdelivr\.net\/npm\/(exceljs|jspdf)/.test(u))return r.continue();return r.abort();});
  await p.addInitScript(([s,l])=>{localStorage.setItem('mis-finanzas-prototipo-v1',s);if(l)localStorage.setItem('cuadra-lang',l);},[JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}),EN?'en':'']);
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForTimeout(1200);
  const dl=async()=>{const w=p.waitForEvent('download',{timeout:60000}).catch(()=>null);await p.locator('[data-s="rep"]').click();return await w;};
  await p.locator('[data-act="rep"]').first().scrollIntoViewIfNeeded();await p.locator('[data-act="rep"]').first().click();await p.waitForTimeout(300);
  // Excel
  await p.locator('#sheet button',{hasText:EN?/^Excel/:/^Excel/}).first().click();await p.waitForTimeout(200);
  let d=await dl();T(L+' descarga el Excel',!!d);
  if(d){const f=await d.path();const z=unzip(fs.readFileSync(f));const wbx=z['xl/workbook.xml'].toString();const ss=(z['xl/sharedStrings.xml']||Buffer.from('')).toString();
    T(L+' nombre del archivo en su idioma',EN?/^account-statement_/.test(d.suggestedFilename()):/^estado-de-cuenta_/.test(d.suggestedFilename()));
    T(L+' hojas de grupos y antojos',EN?(/Spending by group/.test(wbx)&&/name="Impulse buys"/.test(wbx)&&/Spending by item/.test(wbx)&&/name="Transactions"/.test(wbx)):(/Gastos por grupo/.test(wbx)&&/name="Antojos"/.test(wbx)));
    T(L+' Antojos lista Galleta, Helado y Chicle',/Galleta/.test(ss)&&/Helado/.test(ss)&&/Chicle/.test(ss));
    if(EN){T('en inglés: grupos, encabezados y tipos traducidos',/Needs/.test(ss)&&/Wants/.test(ss)&&/Worth it\?/.test(ss)&&/>Impulse buy</.test(ss)&&/Personal account statement/.test(ss)&&/Yes/.test(ss));
      T('en inglés: no quedan textos fijos en español',!/Estado de cuenta|Necesidades|Deseos|Gasto variable|Resumen|Antojo/.test(ss)&&!/Resumen|Mensual/.test(wbx));
      T('en inglés: los meses salen en inglés',/January 2026/.test(ss)&&!/Enero/.test(ss));}
    else T('es: grupos y tipos en español',/Necesidades/.test(ss)&&/Deseos/.test(ss)&&/>Antojo</.test(ss)&&/>Sí</.test(ss));}
  // PDF
  await p.locator('#sheet button',{hasText:/^PDF/}).first().click();await p.waitForTimeout(300);
  d=await dl();if(d&&process.env.PDF_OUT)await d.saveAs(process.env.PDF_OUT+'.'+L+'.pdf');T(L+' descarga el PDF',!!d&&/\.pdf$/i.test(d.suggestedFilename()));
  T(L+' sin errores de JavaScript',errs.length===0);if(errs.length)console.log(errs);
  await ctx.close();}
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
