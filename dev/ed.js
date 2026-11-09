const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');const demo=fs.readFileSync('demo.json','utf8');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1200,height:800},colorScheme:process.argv[2]||'dark'})).newPage();
await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',body:chart});return r.abort();});
await p.addInitScript(([d,s])=>{localStorage.setItem('mis-finanzas-prototipo-v1',d);localStorage.setItem('mis-finanzas-prototipo-v1-skin',s);window.claude={use:async()=>null};},[demo,process.argv[3]||'cuadre']);
await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(900);await p.click('[data-act="liqedit"]');await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(()=>{const r=document.querySelector('.liq .rw');const i=r.querySelector('input');const cs=getComputedStyle(i);return {html:r.outerHTML.slice(0,300),color:cs.color,bg:cs.backgroundColor,op:cs.opacity,rwOp:getComputedStyle(r).opacity,rwColor:getComputedStyle(r).color}})));
await p.locator('.liq').screenshot({path:'ed-'+(process.argv[3]||'cuadre')+'.png'});await b.close();})();
