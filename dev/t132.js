// t132: un respaldo o una nube manipulados no pueden ejecutar código. Mete HTML malicioso en TODA la configuración y los datos,
// recorre pantallas y diálogos, y falla si algo llega a ejecutarse o a convertirse en elemento. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const P=n=>`"'><img src=x-${n} onerror="window.__xss=(window.__xss||[]).concat('${n}')">`;
function sembrado(){
  const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}));const m=d.S['2026'][10];
  const cuentas=[...new Set((m.aho||[]).concat(d.S['2026'][9].aho||[]).map(r=>r.c).filter(Boolean))].concat(['PiBank','Efectivo ahorro']);
  const tasa={};cuentas.forEach(c=>{tasa[c.toLowerCase()]={t:P('tasaTipo'),v:P('tasaValor')};});
  Object.assign(d.cfg,{ahoTasa:tasa,ahoOcultas:[P('ocultas')],ahoIni:{x:P('ahoIni')},ahoModo:P('ahoModo'),fondoMes:P('fondoMes'),tcDate:P('tcDate'),tcAt:P('tcAt'),tcAuto:P('tcAuto'),titular:P('titular'),bkAt:P('bkAt'),pmode:P('pmode'),pv:P('pv'),alerta:P('alerta'),meta:P('meta'),meses:P('meses'),idV:P('idV'),
    credito:{bbva:P('credito'),bcp:1000,oh:P('credito2')},eurCols:[P('eur0'),P('eur1'),P('eur2'),P('eur3')],metas:[{n:P('metaNombre'),m:P('metaMonto'),o:P('metaObj'),f:P('metaFecha')}],
    rec:[{c:P('recConcepto'),m:5,k:P('recCat'),src:P('recSrc'),s:'hor',sec:'hor',f:P('recDia')}],cats:demo.cfg.cats.concat([P('categoria')]),pagoDia:{bbva:P('pagoDia')},corteDia:{bbva:P('corteDia')},
    tarjetasX:[{k:'c4',n:P('tarjetaX'),l:P('tarjetaL'),cd:P('tarjetaCd'),pd:P('tarjetaPd')}],bancos:{bbva:P('banco')},catGrupo:{[P('grupoClave')]:'need'}});
  m.hor.push({c:P('filaC'),m:99999,f:P('filaF'),k:P('filaK'),src:P('filaSrc'),t:'ant',id:P('filaId')});
  m.fij.push({c:P('fijoC'),m:6,f:'5-nov',k:'x',card:P('fijoCard')});
  m.aho.push({c:P('ahorroC'),m:7,f:'5-nov',k:P('ahorroK'),t:P('ahorroT')});m.ing.push({c:P('ingC'),m:8,f:P('ingF'),imp:P('imp')});
  m.liq[0].c=P('cuentaLiq');m.nota=P('nota');m.mov=[{a:P('movA'),b:P('movB'),m:P('movM'),f:P('movF'),n:P('movN'),de:P('movDe'),to:P('movTo'),from:P('movFrom')}];m.copen={bbva:P('copen')};m.tc={'$':P('tcMes'),'€':P('tcMesE')};
  return JSON.stringify(d);
}
(async()=>{
 const b=await chromium.launch();const c=await b.newContext({viewport:{width:1280,height:900}});
 await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765/wrap-repo'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
 await c.addInitScript(([d,k])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');}},[sembrado(),K]);
 const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.dismiss());
 const hallado=new Set(),mira=async donde=>{const r=await p.evaluate(()=>({x:window.__xss||[],e:[...document.querySelectorAll('img[src^="x-"]')].map(i=>i.getAttribute('src').slice(2))}));r.x.concat(r.e).forEach(n=>hallado.add(n+' @'+donde));};
 const clic=async s=>{const l=p.locator(s).first();if(await l.count()){await l.click({timeout:1500,force:true}).catch(()=>{});await p.waitForTimeout(250);}};
 const baja=async()=>{for(let y=0;y<9000;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(40);}await p.evaluate(()=>scrollTo(0,0));};
 let vistas=0;
 for(const h of ['#noviembre','#resumen','#ajustes','#capturar','#diciembre']){
  await p.goto('http://127.0.0.1:8765/wrap-repo.html'+h);await p.waitForTimeout(700);await baja();await mira(h);if(await p.locator('#app').count())vistas++;
  // Controles que abren paneles, editores y diálogos
  for(const s of ['[data-act="atasa"]','[data-act="hist"]','[data-act="rep"]','[data-act="liqedit"]','[data-act="edit"]','[data-act="new"]','#fab','[data-act="adep"]','[data-act="aaren"]','[data-act="imp"]','[data-act="cierre"]','[data-act="pagar"]','summary']){
   await clic(s);await mira(h+' '+s);await p.keyboard.press('Escape');await p.waitForTimeout(120);}
  for(const bt of await p.locator('#app [data-act]').evaluateAll(a=>[...new Set(a.map(x=>x.dataset.act))])){if(/del|rm|quitar|borr|salir|bk-|load|push/i.test(bt))continue;await clic('#app [data-act="'+bt+'"]');await mira(h+' act:'+bt);await p.keyboard.press('Escape');await p.waitForTimeout(60);}
 }
 T('las pantallas llegaron a pintarse',vistas>=3);
 T('ningún dato manipulado se convierte en código',hallado.size===0);
 if(hallado.size)console.log('INYECTADO:',[...hallado].slice(0,20).join(' | '));
 T('sin errores de JavaScript',!p.errs.length);if(p.errs.length)console.log('ERRORES',[...new Set(p.errs)].slice(0,5));
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
