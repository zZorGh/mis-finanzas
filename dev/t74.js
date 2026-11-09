const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const d=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();
await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
await p.addInitScript(s=>{if(!localStorage.getItem('qa_x')){localStorage.setItem('mis-finanzas-prototipo-v1',s);localStorage.setItem('qa_x','1');}window.claude={use:async()=>null};},JSON.stringify(d));
await p.goto('http://127.0.0.1:8765/wrap-repo.html#resumen');await p.waitForTimeout(900);
const hint=await p.locator('[data-metasug="3"]').count();T('aparecen sugerencias',hint===1);
if(hint){const lbl=await p.locator('[data-metasug="3"]').innerText();console.log('3 meses ->',lbl);
 await p.click('[data-metasug="3"]');const v=+await p.inputValue('#mobj');T('rellena objetivo',v>0);
 const nm=await p.inputValue('#mn');T('rellena nombre',nm==='Fondo de emergencia'||nm.length>0);
 await p.click('#addmeta');await p.waitForTimeout(300);
 let st=JSON.parse(await p.evaluate(()=>localStorage.getItem('mis-finanzas-prototipo-v1')));
 const m1=st.cfg.metas.find(m=>m.n===nm);T('meta guardada con objetivo',m1&&m1.o===v);
 await p.fill('#mn',nm);await p.fill('#mobj','12345');await p.click('#addmeta');await p.waitForTimeout(300);
 st=JSON.parse(await p.evaluate(()=>localStorage.getItem('mis-finanzas-prototipo-v1')));
 T('actualiza objetivo de meta existente',st.cfg.metas.filter(m=>m.n===nm).length===1&&st.cfg.metas.find(m=>m.n===nm).o===12345);}
await b.close();console.log('Total',ok+bad,'ok',ok,'fallas',bad);process.exitCode=bad?1:0;})();
