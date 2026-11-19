// t110: los reportes (Excel y PDF) incluyen «Gastos por grupo» y «Antojos» (con si valieron la pena).
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
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:800},acceptDownloads:true,locale:'es-PE',timezoneId:'America/Lima'});await ctx.clock.setFixedTime(new Date('2026-11-17T15:00:00-05:00'));const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});if(/cdn\.jsdelivr\.net\/npm\/(exceljs|jspdf)/.test(u))return r.continue();return r.abort();});
  await p.addInitScript(s=>{localStorage.setItem('mis-finanzas-prototipo-v1',s);},JSON.stringify({v:1,S:demo.S,cfg:demo.cfg}));
  await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForTimeout(1200);
  const dl=async()=>{const w=p.waitForEvent('download',{timeout:60000}).catch(()=>null);await p.locator('[data-s="rep"]').click();return await w;};
  await p.locator('[data-act="rep"]').first().scrollIntoViewIfNeeded();await p.locator('[data-act="rep"]').first().click();await p.waitForTimeout(300);
  // Excel
  await p.locator('button',{hasText:'Excel · para revisar las cifras'}).click();await p.waitForTimeout(200);
  let d=await dl();T('descarga el Excel',!!d);
  if(d){const f=await d.path();const z=unzip(fs.readFileSync(f));const wbx=z['xl/workbook.xml'].toString();
    T('el libro trae la hoja «Gastos por grupo»',/Gastos por grupo/.test(wbx));T('el libro trae la hoja «Antojos»',/name="Antojos"/.test(wbx));
    const ss=(z['xl/sharedStrings.xml']||Buffer.from('')).toString();
    T('«Antojos» lista Galleta, Helado y Chicle',/Galleta/.test(ss)&&/Helado/.test(ss)&&/Chicle/.test(ss));
    T('trae «Sí» y los grupos Necesidades y Deseos',/Necesidades/.test(ss)&&/Deseos/.test(ss)&&/>Sí</.test(ss));
    T('los antojos salen como tipo «Antojo» en Movimientos',/>Antojo</.test(ss));}
  // PDF
  await p.locator('#sheet button',{hasText:/^PDF/}).first().click();await p.waitForTimeout(300);
  d=await dl();if(d&&process.env.PDF_OUT)await d.saveAs(process.env.PDF_OUT);T('descarga el PDF',!!d&&/\.pdf$/i.test(d.suggestedFilename()));
  T('sin errores de JavaScript',errs.length===0);if(errs.length)console.log(errs);
  console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
