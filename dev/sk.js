const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');const demo=fs.readFileSync('demo.json','utf8');
(async()=>{const b=await chromium.launch();let errs=[];
for(const sk of ['original','cuadre','escalon'])for(const cs of ['light','dark']){
const p=await (await b.newContext({viewport:{width:400,height:820},colorScheme:cs})).newPage();p.on('pageerror',e=>errs.push(sk+e.message));
await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
await p.addInitScript(([d,s])=>{localStorage.setItem('mis-finanzas-prototipo-v1',d);localStorage.setItem('mis-finanzas-prototipo-v1-skin',s);window.claude={use:async()=>null};},[demo,sk]);
await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForTimeout(1000);await p.screenshot({path:`sk-${sk}-${cs}.png`});
console.log(sk,cs,await p.evaluate(()=>document.documentElement.dataset.skin+' '+(document.documentElement.scrollWidth>innerWidth+1)));
if(cs==='light'){await p.goto('http://127.0.0.1:8765/wrap-repo.html#ajustes');await p.reload();await p.waitForTimeout(900);
 if(sk==='original'){await p.locator('.skins').scrollIntoViewIfNeeded();await p.click('[data-skin-set="escalon"]');await p.waitForTimeout(500);console.log('click ->',await p.evaluate(()=>document.documentElement.dataset.skin+' '+localStorage.getItem('mis-finanzas-prototipo-v1-skin')+' '+document.querySelector('[data-skin-set="escalon"]').getAttribute('aria-pressed')));}}
await p.close();}
console.log(errs.join('|')||'sin errores');await b.close();})();
