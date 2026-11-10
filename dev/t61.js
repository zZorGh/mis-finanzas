// Revisión completa de la app: web (1500) y celular (390). Uso: node t61.js [archivo]
const pickT=async(p,t)=>{const G={hor:'gasto',fij:'gasto',compra:'tarjeta',pago:'tarjeta',ing:'ing',aho:'ahorro',inv:'ahorro'};await p.click('#stype [data-g="'+G[t]+'"]');if(t!=='ing')await p.click('#ssub [data-t="'+t+'"]');};
const cierre=async(p,a)=>{await p.click('[data-act="cierre"]');await p.click('#sheet [data-act="'+a+'"]');};
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=fs.readFileSync(__dirname+'/demo.json','utf8');
const FILE=process.argv[2]||'wrap-repo.html';
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const KEY='mis-finanzas-prototipo-v1';
const results=[];
async function suite(tag,opts,seed){
  const b=await chromium.launch();const ctx=await b.newContext(opts);const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))errs.push('console: '+m.text());});
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.startsWith('data:')||u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await p.addInitScript(([d,s])=>{if(s&&!localStorage.getItem('qa_seeded')){localStorage.setItem('mis-finanzas-prototipo-v1',d);localStorage.setItem('qa_seeded','1');}window.claude={use:async()=>null};},[demo,seed]);
  await p.goto('http://127.0.0.1:8765/'+FILE+'#resumen');await p.waitForSelector('.hero');await p.selectOption('#yr','2026');await p.waitForTimeout(400);
  const st=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const T=async s=>(await p.innerText(s)).replace(/\s+/g,' ');
  const overflow=()=>p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  const go=async h=>{await p.evaluate(x=>location.hash=x,h);await p.waitForTimeout(250);};
  const chk=async(name,fn)=>{const e0=errs.length;let r;try{r=await fn();}catch(e){r='EXCEPCIÓN '+String(e.message).split('\n')[0].slice(0,140);}
    const newErr=errs.slice(e0);const okk=(r===true||r===undefined)&&!newErr.length;results.push({tag,name,ok:okk,info:okk?'':(r!==true&&r!==undefined?r:'')+(newErr.length?' | errores: '+newErr.join(' / ').slice(0,200):'')});};
  const openSheet=async(t)=>{await p.click(await p.isVisible('#fab')?'#fab':'.caplink');await p.waitForSelector('#sheet');if(t)await pickT(p,t);};
  const save=async()=>{await p.click('[data-s="save"]');await p.waitForTimeout(250);};
  const nov=async()=>{await go('noviembre');await p.waitForSelector('#kA');};
  // ---------- navegación
  await chk('Resumen 2026 carga (hero, KPIs, gráficos)',async()=>{await go('resumen');const c=await p.evaluate(()=>document.querySelectorAll('canvas').length);const k=await p.evaluate(()=>document.querySelectorAll('[data-cid=rk] .kpi').length);return c>=5&&k>=4&&!(await overflow())||`canvas ${c}, kpis ${k}, overflow ${await overflow()}`;});
  for(const y of ['2025','2026','2027'])await chk('Resumen '+y,async()=>{await p.selectOption('#yr',y);await go('resumen');await p.waitForSelector('.hero-v');return !(await overflow())||'desborda en horizontal';});
  await p.selectOption('#yr','2026');
  await chk('Los 12 meses abren sin error ni desborde',async()=>{const bad=[];for(const m of MESES){await go(m);const ok=await p.evaluate(()=>!!document.getElementById('hR')&&!!document.querySelector('.ahocard'));if(!ok||await overflow())bad.push(m);}return bad.length?bad.join(','):true;});
  await chk('Pestañas y botones atrás/adelante',async()=>{await go('marzo');await go('mayo');await p.goBack();await p.waitForTimeout(250);return /marzo/i.test(await T('.hero h1'))||'atrás no volvió a marzo';});
  await chk('Vista Registrar (#capturar)',async()=>{await go('capturar');await p.waitForSelector('.cap-wrap');await p.click('[data-act="new"]');await p.waitForSelector('#sheet');await p.click('[data-s="close"]');return !(await overflow())||'desborda';});
  // ---------- tema y personalizar
  await chk('Tema claro/oscuro',async()=>{await go('resumen');const a=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);await p.click('#th');await p.waitForTimeout(250);const b2=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);await p.click('#th');await p.waitForTimeout(150);return a!==b2||'el fondo no cambió';});
  await chk('Personalizar (activar y desactivar)',async()=>{await go('noviembre');await p.click('#ed');await p.waitForTimeout(250);const on=await p.evaluate(()=>document.body.classList.contains('edit'));await p.click('#ed');await p.waitForTimeout(200);return on&&!(await p.evaluate(()=>document.body.classList.contains('edit')))||'no alterna';});
  // ---------- registrar cada tipo
  await nov();
  const base=await st();const cnt=(s,sec)=>s.S['2026'][10][sec].filter(r=>r.c||r.m).length;
  for(const [t,sec,amt,desc] of [['hor','hor','15','Café QA'],['fij','fij','80','Internet QA'],['ing','ing','500','Extra QA'],['inv','inv','120','XTB QA']])
    await chk('Registrar '+t,async()=>{await openSheet(t);await p.fill('#sa',amt);await p.fill('#sd',desc);if(t==='hor'||t==='fij')await p.click('#ssrc [data-src="none"]');await save();const s=await st();return s.S['2026'][10][sec].some(r=>r.c===desc&&r.m===+amt)||'no quedó la fila';});
  await chk('Compra con tarjeta BCP sube la deuda',async()=>{const d0=await T('#cd-bcp');await openSheet('compra');await p.click('#sbank [data-b="bcp"]');await p.fill('#sa','100');await p.fill('#sd','Compra QA');await save();return (await T('#cd-bcp'))!==d0||'la deuda no cambió';});
  await chk('Pago de tarjeta BCP baja la deuda',async()=>{const d0=await T('#cd-bcp');await openSheet('pago');await p.click('#sbank [data-b="bcp"]');await p.fill('#sa','50');await p.click('#ssrc [data-src="liq:0"]');await save();return (await T('#cd-bcp'))!==d0||'la deuda no cambió';});
  await chk('Moneda por movimiento ($) en hormiga',async()=>{await openSheet('hor');await p.fill('#sa','10');await p.fill('#sd','Uber USD QA');await p.click('#scur');if((await p.innerText('#scur'))!=='$')return 'no cambió a $';await p.click('#ssrc [data-src="none"]');await save();const s=await st();return s.S['2026'][10].hor.some(r=>r.c==='Uber USD QA'&&r.cur==='$')||'no guardó la moneda';});
  // ---------- ahorros
  await nov();
  await chk('Ahorro: depositar',async()=>{await openSheet('aho');await p.click('#sax [data-ax="dep"]');await p.fill('#sa','300');await p.click('#sfrom [data-from^="aho:"]');await save();return (await T('#kA')).includes('300')||('kA '+await T('#kA'));});
  await chk('Ahorro: retirar a liquidez y deshacer',async()=>{const l0=(await st()).S['2026'][10].liq[1].m;await openSheet('aho');await p.click('#sax [data-ax="ret"]');await p.fill('#sa','40');await p.click('#sfrom [data-from^="aho:"]');await p.click('#ssrc [data-src="liq:1"]');await save();const l1=(await st()).S['2026'][10].liq[1].m;if(l1!==l0+40)return 'liquidez '+l0+'→'+l1;await p.click('[data-undo]');await p.waitForTimeout(250);return (await st()).S['2026'][10].liq[1].m===l0||'deshacer no restauró';});
  await chk('Ahorro: ajustar saldo',async()=>{const k0=await T('#kA');await openSheet('aho');await p.click('#sax [data-ax="aj"]');await p.fill('#sa','7000');await p.click('#sfrom [data-from^="aho:"]');await save();return (await T('#kA'))===k0||'el ajuste cambió el ahorro del mes';});
  await chk('Ahorro: mover entre cuentas',async()=>{const accs=await p.evaluate(()=>[...document.querySelectorAll('.aa-n')].map(e=>e.textContent));if(accs.length<2)return 'menos de 2 cuentas';await openSheet('aho');await p.click('#sax [data-ax="mov"]');await p.fill('#sa','10');await p.click(`#sfrom [data-from="aho:${accs[0]}"]`);await p.click(`#sto [data-to="aho:${accs[1]}"]`);await save();return (await st()).S['2026'][10].aho.filter(r=>(r.t||'').startsWith('tr:')).length===2||'sin 2 patas';});
  await chk('Ahorro: nueva cuenta con TREA',async()=>{await p.click('[data-act="anew"]');await p.waitForSelector('#sheet');await p.fill('#sd','Cuenta QA');await p.fill('#sa','100');await save();await p.click('[data-act="atasa"][data-acct="Cuenta QA"]');await p.fill('.aa-tv','4.2');await p.press('.aa-tv','Enter');await p.waitForTimeout(250);return /TREA 4\.20%/.test(await T('.ahocard'))||'no mostró la tasa';});
  await chk('Ahorro: renombrar cuenta',async()=>{await p.click('[data-act="aren"][data-acct="Cuenta QA"]');await p.fill('.aa-ren','Cuenta QA 2');await p.press('.aa-ren','Enter');await p.waitForTimeout(250);return (await T('.ahocard')).includes('Cuenta QA 2')||'no renombró';});
  await chk('Las tarjetas de ahorro ya no tienen Depositar/Retirar/Ajustar',async()=>{const n=await p.evaluate(()=>document.querySelectorAll('.aacct [data-act="adep"],.aacct [data-act="aret"],.aacct [data-act="aadj"]').length);return n===0||n+' botones';});
  await chk('Total ahorrado: no aparece como cuenta',async()=>!(await T('.ahocard .ahobody')).includes('Total ahorrado')||'aparece');
  // ---------- edición / borrado / inline
  await chk('Editar una fila (✎) y borrar (×) en hormiga',async()=>{await nov();await p.click('[data-cid=hor] [data-edit="hor"]');await p.waitForSelector('#sheet');await p.fill('#sa','22');await save();let s=await st();if(!s.S['2026'][10].hor.some(r=>r.m===22))return 'no guardó la edición';const n0=cnt(s,'hor');await p.click('[data-cid=hor] [data-edit="hor"]');await p.waitForSelector('#sheet');await p.click('[data-s="del-mov"]');await p.waitForTimeout(250);s=await st();return cnt(s,'hor')===n0-1||'no borró';});
  await chk('Tocar un ingreso para editar actualiza KPIs',async()=>{await nov();const k0=await T('#kI');await p.click('[data-cid=ing] [data-edit="ing"]');await p.waitForSelector('#sheet');await p.fill('#sa','9999');await save();return (await T('#kI'))!==k0||'kI no cambió';});
  await chk('+ Agregar gasto fijo abre el registro en Fijo',async()=>{await p.click('[data-new="fij"]');await p.waitForSelector('#sheet');const on=await p.evaluate(()=>!!document.querySelector('#ssub [data-t="fij"][aria-checked=true]'));await p.click('[data-s="close"]');return on||'no abrió en Fijo';});
  await chk('Fondo y notas (apuntes) se guardan',async()=>{await p.fill('#nota','nota QA');await p.waitForTimeout(600);return (await st()).S['2026'][10].nota==='nota QA'||'no guardó';});
  // ---------- acciones del mes
  await chk('Traer del mes anterior',async()=>{await go('diciembre');await cierre(p,'prev');await p.waitForTimeout(300);return true;});
  await chk('Cuadrar cuentas (abre, escribe real, aplica)',async()=>{await nov();await cierre(p,'cuad');await p.waitForSelector('.cuad');await p.fill('[data-cq="0"]','777');await p.click('[data-s="apply"]');await p.waitForTimeout(300);return (await st()).S['2026'][10].liq[0].m===777||'no ajustó Yape';});
  await chk('Tipo de cambio del mes (manual)',async()=>{await nov();await p.evaluate(()=>document.querySelector('.tcmd').open=true);await p.fill('#tcm-d','3.5');await p.press('#tcm-d','Enter').catch(()=>{});await p.waitForTimeout(600);const s=await st();return (s.S['2026'][10].tc&&s.S['2026'][10].tc['$']===3.5)||('tc '+JSON.stringify(s.S['2026'][10].tc));});
  // ---------- ajustes (Resumen)
  await chk('Ajustes: alerta, categoría, meta, recurrente',async()=>{await go('ajustes');await p.fill('#cf-alerta','321');await p.fill('#nc','Mascotas');await p.click('#addcat');await p.waitForTimeout(250);await p.fill('#mn','Viaje QA');await p.fill('#mobj','5000');await p.click('#addmeta');await p.waitForTimeout(250);await p.fill('#rc-c','Recurrente QA');await p.fill('#rc-m','45');await p.click('#rc-add');await p.waitForTimeout(250);const s=await st();return (s.cfg.alerta===321&&(s.cfg.cats||[]).includes('Mascotas')&&s.cfg.metas.some(m=>m.n==='Viaje QA')&&s.cfg.rec.some(r=>r.c==='Recurrente QA'))||'cfg: '+JSON.stringify([s.cfg.alerta,s.cfg.cats]).slice(0,150);});
  await chk('Cargar recurrentes en un mes',async()=>{await go('diciembre');await cierre(p,'rec');await p.waitForTimeout(300);return (await st()).S['2026'][11].fij.some(r=>r.c==='Recurrente QA')||'no cargó';});
  await chk('Meta de ahorro: depósito con meta suma al progreso',async()=>{await nov();await openSheet('aho');await p.click('#sax [data-ax="dep"]');await p.fill('#sa','200');await p.click('#sfrom [data-from^="aho:"]');await p.click('#smore summary');await p.click('#sgoal [data-meta="Viaje QA"]');await save();await go('resumen');return /200/.test(await T('[data-cid=mg]'))||('meta: '+await T('[data-cid=mg]'));});
  await chk('Copia completa: botón no falla y no hay CSV',async()=>{await go('ajustes');await p.click('#bk-json');await p.waitForTimeout(250);return !(await p.$('#bk-csv'))||'sigue el CSV';});
  // ---------- persistencia
  await chk('Recargar conserva todo',async()=>{await nov();const before=await T('#hR');await p.waitForTimeout(800);await p.reload();await p.waitForSelector('.hero');await p.waitForTimeout(600);await p.selectOption('#yr','2026');await nov();await p.waitForTimeout(600);return (await T('#hR'))===before||('antes '+before+' después '+await T('#hR'));});
  await chk('Sin desborde horizontal al final',async()=>{for(const h of ['resumen','noviembre','capturar']){await go(h);if(await overflow())return 'desborda en '+h;}return true;});
  await b.close();
}
(async()=>{
  await suite('web',{viewport:{width:1500,height:950}},true);
  await suite('móvil',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},true);
  // datos embebidos (sin sembrar), solo navegación

  const by={};results.forEach(r=>{(by[r.name]=by[r.name]||{})[r.tag]=r;});
  let bad=0;Object.keys(by).forEach(n=>{const rs=Object.values(by[n]);const f=rs.filter(r=>!r.ok);if(f.length){bad+=f.length;console.log('FALLA  '+n+'\n'+f.map(r=>'       ['+r.tag+'] '+r.info).join('\n'));}});
  console.log('\nTotal: '+results.length+' comprobaciones, '+results.filter(r=>r.ok).length+' ok, '+bad+' con falla.');process.exitCode=bad?1:0;
})();
