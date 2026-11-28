// t136: los saldos de las cuentas pasan solos al mes nuevo, siguen al mes anterior si se corrige algo y nunca pisan ni
// duplican saldos que ya existían. «Traer del mes anterior» no marca los gastos fijos como pagados. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const base=mod=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,rec:[]})}));if(mod)mod(d.S,d.cfg);return d;};
(async()=>{
 const b=await chromium.launch();
 const abre=async(fecha,hash,datos,lang)=>{const c=await b.newContext({viewport:{width:1366,height:800}});await c.clock.setFixedTime(new Date(fecha+'T12:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);},[JSON.stringify(datos||base()),K,lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',x=>x.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app');await W(p);await W(p);return p;};
 const W=p=>p.waitForTimeout(320);
 const mes=(p,i,y)=>p.evaluate(([k,i,y])=>JSON.parse(localStorage.getItem(k)).S[y][i],[K,i,y||'2026']);
 const saldos=async(p,i,y)=>(await mes(p,i,y)).liq.map(r=>+r.m);
 const igual=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<.005);
 const NOV=[430,130,200,18];
 const registro=async p=>{await p.click('.caplink');await p.waitForSelector('#sheet');await W(p);};
 const guarda=async p=>{await p.click('#sheet .sact button.p');await W(p);};
 const frase=async(p,t)=>{await registro(p);await p.click('[data-mode="auto"]');await W(p);await p.fill('#smsg',t);await W(p);await guarda(p);};

 // 1. Primero de mes
 let p=await abre('2026-12-01','#diciembre');
 T('1 diciembre arranca con los saldos de noviembre',igual(await saldos(p,11),NOV));
 T('1 noviembre no cambia',igual(await saldos(p,10),NOV));
 T('1 la pantalla muestra el disponible',/778\.00/.test(await p.locator('#app .hero-v').first().innerText()));
 await p.reload();await p.waitForSelector('#app');await W(p);await W(p);
 T('1 abrir otra vez no vuelve a sumar',igual(await saldos(p,11),NOV));
 T('1 los gastos fijos no se copian solos',!(await mes(p,11)).fij.some(r=>+r.m));

 // 2. «ayer» el día 1: baja noviembre y también diciembre; Deshacer lo revierte en los dos
 await frase(p,'ayer taxi 15 yape');
 T('2 «ayer» baja Yape en noviembre',(await saldos(p,10))[0]===415);T('2 y también en diciembre',(await saldos(p,11))[0]===415);
 await p.click('#toast [data-undo]');await W(p);
 T('2 Deshacer devuelve los dos meses',igual(await saldos(p,10),NOV)&&igual(await saldos(p,11),NOV));

 // 3. Un gasto de diciembre no toca noviembre
 await frase(p,'taxi 10 yape');T('3 gasto de diciembre',(await saldos(p,11))[0]===420&&(await saldos(p,10))[0]===430);
 // y corregir noviembre después mueve diciembre en la misma cantidad
 await frase(p,'ayer pan 5 yape');T('3 corregir noviembre mueve diciembre sin perder lo de diciembre',(await saldos(p,10))[0]===425&&(await saldos(p,11))[0]===415);

 // 4. Cuadrar a mano: ese mes deja de seguir al anterior
 await p.click('#app [data-act="cierre"]');await p.waitForSelector('#sheet');await W(p);await p.click('#sheet [data-act="cuad"]');await W(p);
 await p.locator('#sheet input[inputmode="decimal"], #sheet input[type="number"], #sheet input').first().fill('500');await p.click('#sheet [data-s="apply"]');await W(p);
 T('4 cuadrar fija el saldo',(await saldos(p,11))[0]===500);
 await frase(p,'ayer jugo 3 yape');T('4 y ya no lo mueve una corrección del mes anterior',(await saldos(p,11))[0]===500&&(await saldos(p,10))[0]===422);
 T('sin errores 1',!p.errs.length);if(p.errs.length)console.log(p.errs);await p.context().close();

 // 5. Registrar desde el Resumen, sin haber abierto diciembre
 p=await abre('2026-12-01','#resumen');await frase(p,'taxi 25 yape');
 T('5 desde el Resumen también parte de los saldos de noviembre',(await saldos(p,11))[0]===405&&(await saldos(p,10))[0]===430);await p.context().close();

 // 6. Quien ya tenía saldos no ve ningún cambio
 p=await abre('2026-11-22','#noviembre',base(S=>{S['2026'][10].liq.forEach((r,i)=>r.m=[99,0,1,2][i]);}));
 T('6 a mitad de mes, los saldos propios no se tocan',igual(await saldos(p,10),[99,0,1,2]));await p.context().close();
 p=await abre('2026-12-05','#diciembre',base(S=>{S['2026'][11].liq.forEach((r,i)=>r.m=[50,60,0,0][i]);}));
 T('6 diciembre escrito a mano no se pisa ni se suma',igual(await saldos(p,11),[50,60,0,0]));await p.context().close();

 // 7. Anotado en diciembre desde noviembre: al llegar diciembre se suma a lo heredado
 p=await abre('2026-12-02','#diciembre',base(S=>{const m=S['2026'][11];m.hor=[{c:'Adelantado',m:30,f:'1-dic',k:'Deseo',src:'liq:0',_d:30}];m.liq[0].m=-30;}));
 T('7 lo anotado por adelantado se descuenta del saldo heredado',(await saldos(p,11))[0]===400);await p.context().close();

 // 8. Mes saltado y cambio de año
 p=await abre('2027-01-02','#resumen');
 T('8 en enero llegan los saldos aunque no se abriera diciembre',igual(await saldos(p,0,'2027'),NOV)&&igual(await saldos(p,11),NOV));await p.context().close();

 // 9. Si se pierde la marca (pestaña sin actualizar), no se vuelve a sumar
 p=await abre('2026-12-01','#diciembre');
 await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));delete d.S['2026'][11].lb;localStorage.setItem(k,JSON.stringify(d));},K);await p.reload();await p.waitForSelector('#app');await W(p);await W(p);
 T('9 sin la marca no se duplica',igual(await saldos(p,11),NOV));await p.context().close();

 // 10. Gastar todo no hace que vuelvan a traerse
 p=await abre('2026-12-01','#diciembre');await frase(p,'compra 430 yape');await p.reload();await p.waitForSelector('#app');await W(p);await W(p);
 T('10 una cuenta que quedó en cero se queda en cero',(await saldos(p,11))[0]===0);await p.context().close();

 // 11. «Traer del mes anterior» no marca gastos fijos como pagados
 p=await abre('2026-11-28','#diciembre');
 await p.click('#app [data-act="cierre"]');await p.waitForSelector('#sheet');await W(p);
 T('11 el texto ya no promete copiar gastos fijos',!/Copia tus gastos fijos/.test(await p.innerText('#sheet'))&&/Por pagar/.test(await p.innerText('#sheet')));
 await p.click('#sheet [data-act="prev"]');await W(p);
 T('11 trae saldos y no los fijos',igual(await saldos(p,11),NOV)&&!(await mes(p,11)).fij.some(r=>+r.m));
 T('11 el aviso dice lo que trajo',/saldos de tus cuentas/.test(await p.innerText('#toast')));await p.context().close();

 // 13. Cuenta nueva que nunca anotó saldos: el origen son sus movimientos
 p=await abre('2026-12-01','#diciembre',base(S=>{Object.values(S).forEach(a=>a.forEach(m=>{['liq','ing','fij','hor','aho','inv','bbva','bcp','oh'].forEach(k=>{m[k]=k==='liq'?m.liq.map(r=>({c:r.c,m:0})):[{c:'',m:0,f:'',k:''}];});m.copen={};}));const n=S['2026'][10];n.ing=[{c:'Sueldo',m:3000,f:'1-nov',k:'',src:'liq:0',_d:-3000}];n.hor=[{c:'Gasto',m:100,f:'2-nov',k:'Deseo',src:'liq:0',_d:100}];n.liq[0].m=2900;}));
 T('13 cuenta nueva: diciembre abre con 2,900',(await saldos(p,11))[0]===2900);await p.context().close();

 // 14. Si las cuentas se corren (una sin nombre se pierde en la nube), no se mueve dinero de una a otra
 p=await abre('2026-12-01','#diciembre');
 await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)),m=d.S['2026'][11];m.liq.splice(1,1);d.S['2026'][10].liq[1].m=130;localStorage.setItem(k,JSON.stringify(d));},K);await p.reload();await p.waitForSelector('#app');await W(p);await frase(p,'taxi 1 yape');
 T('14 cuentas corridas: ninguna toma el saldo de otra',igual(await saldos(p,11),[429,200,18]));await p.context().close();

 // 15. Depósito de ahorro fechado el mes anterior y su Deshacer
 p=await abre('2026-12-01','#diciembre');await registro(p);await p.click('#stype [data-g="ahorro"]');await W(p);await p.click('#sax [data-ax="dep"]');await W(p);await p.evaluate(()=>document.getElementById('smore').open=true);await p.selectOption('#smo','10');await p.fill('#sday','30');await W(p);await p.locator('#sfrom [role=radio]').first().click();await p.fill('#sa','40');await p.click('#ssrc [data-src="liq:0"]');await guarda(p);
 T('15 depósito del 30 de noviembre: baja en los dos meses',(await saldos(p,10))[0]===390&&(await saldos(p,11))[0]===390);
 await p.click('#toast [data-undo]');await W(p);await p.reload();await p.waitForSelector('#app');await W(p);await W(p);
 T('15 Deshacer lo devuelve en los dos',igual(await saldos(p,10),NOV)&&igual(await saldos(p,11),NOV));await p.context().close();

 // 12. Inglés
 p=await abre('2026-12-01','#diciembre',null,'en');T('12 el aviso en inglés',/balances carry on/i.test(await p.innerText('#toast')));await p.context().close();

 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
