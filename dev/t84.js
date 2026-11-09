const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const d=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
async function run(fakeISO,data,url,nm){
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:420,height:900},timezoneId:'America/Lima'});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
 await p.addInitScript(([s,iso])=>{const R=Date,off=new R(iso).getTime()-R.now();class D extends R{constructor(...a){a.length?super(...a):super(R.now()+off)}static now(){return R.now()+off}}window.Date=D;localStorage.setItem('mis-finanzas-prototipo-v1',s);window.claude={use:async()=>null};},[JSON.stringify(data),fakeISO]);
 await p.goto(url);await p.waitForTimeout(900);
 const h=await p.evaluate(()=>location.hash);const cur=await p.locator('[aria-current="page"]').first().innerText().catch(()=>'' );
 const dots=await p.locator('.cdot').count();
 return {p,b,errs,h,cur,dots,nm};
}
(async()=>{
 const U='http://127.0.0.1:8765/wrap-repo.html';
 // 1 usuario con datos, 8 nov 2026 Lima -> Noviembre
 let r=await run('2026-11-08T15:00:00-05:00',d,U);
 T('abre en Nov',/nov/i.test(r.cur));T('marca mes actual',r.dots===1);
 await r.p.screenshot({path:'cur-month.png'});
 // hash explícito se respeta
 await r.p.goto(U+'#resumen');await r.p.reload();await r.p.waitForTimeout(600);
 T('#resumen se respeta',/resumen/i.test(await r.p.locator('[aria-current="page"]').first().innerText()));
 await r.p.goto(U+'#marzo');await r.p.reload();await r.p.waitForTimeout(600);
 T('#marzo se respeta',/mar/i.test(await r.p.locator('[aria-current="page"]').first().innerText()));
 T('sin errores 1',r.errs.length===0);await r.b.close();
 // 2 borde: 31 dic 23:30 Lima = ya es 1 ene UTC -> debe ser Diciembre
 r=await run('2026-12-31T23:30:00-05:00',d,U);T('Lima 31 dic 23:30 -> Dic',/dic/i.test(r.cur));await r.b.close();
 // 3 usuario sin datos -> Resumen
 const e=JSON.parse(JSON.stringify(d));for(const y of Object.keys(e.S))for(const m of e.S[y])if(m)for(const k of Object.keys(m))if(Array.isArray(m[k]))m[k]=[];
 r=await run('2026-11-08T15:00:00-05:00',e,U);T('sin datos -> no salta a mes',!/nov/i.test(r.cur)||/resumen/i.test(r.cur)||r.cur==='');console.log('vacío cur=',JSON.stringify(r.cur));await r.b.close();
 // 4 nosnap
 console.log(ok,'ok',bad,'mal');
})();
