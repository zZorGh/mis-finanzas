// t137: la deuda de tarjetas sigue al mes anterior (pagos y compras anotados después, meses saltados), respeta lo escrito a
// mano (también el cero) y sobrevive a la nube. Con sesión simulada. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
const stub=eval(fs.readFileSync(__dirname+'/t135.js','utf8').match(/const stub=(`[\s\S]*?`);\n/)[1]);
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
// Octubre termina debiendo 1,000 en BBVA; nada más
const datos=mod=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,rec:[]})}));
  Object.values(d.S).forEach(a=>a.forEach(m=>{['bbva','bcp','oh'].forEach(k=>m[k]=[{c:'',m:0,f:'',k:''}]);m.copen={};m.fij=m.fij.filter(r=>!r.card);}));d.S['2026'][9].bbva=[{c:'TV',m:1000,f:'5-oct',k:''}];if(mod)mod(d.S,d.cfg);return JSON.stringify(d);};
(async()=>{
 const b=await chromium.launch();
 const avanza=async(p,ms)=>{await p.clock.runFor(ms);await p.waitForTimeout(450);};
 const abre=async(fecha,hash,local,nube)=>{const c=await b.newContext({viewport:{width:1366,height:800}});await c.clock.install({time:new Date(fecha+'T12:00:00-05:00')});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(stub);
  await c.addInitScript(([d,n,k])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');if(d)localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(n)sessionStorage.setItem('__nube',n);},[local,nube||null,K]);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',x=>x.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app .card');await avanza(p,2000);await avanza(p,4000);return p;};
 // Deuda con que cierra cada mes, calculada igual que la app: saldo anterior + consumos − pagos
 const deuda=(p,i,k,y)=>p.evaluate(([K,i,k,y])=>{const m=JSON.parse(localStorage.getItem(K)).S[y][i];const s=(m[k]||[]).reduce((a,r)=>a+(+r.m||0),0),pg=(m.fij||[]).filter(r=>r.card===k).reduce((a,r)=>a+(+r.m||0),0);return Math.round((((m.copen||{})[k]||0)+s-pg)*100)/100;},[K,i,k||'bbva',y||'2026']);
 const nube=p=>p.evaluate(()=>sessionStorage.getItem('__nube'));
 const recarga=async p=>{await avanza(p,4000);await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);await avanza(p,4000);};
 const guarda=async p=>{await p.click('#sheet .sact button.p');await avanza(p,1500);};
 const registro=async p=>{await p.click('.caplink');await p.waitForSelector('#sheet');await avanza(p,400);};
 const tarjeta=async(p,tipo,monto,mes,dia)=>{await registro(p);await p.click('#stype [data-g="tarjeta"]');await avanza(p,300);await p.click('#ssub [data-t="'+tipo+'"]');await avanza(p,300);
  await p.evaluate(()=>document.getElementById('smore').open=true);await p.selectOption('#smo',String(mes));await p.fill('#sday',String(dia));await avanza(p,300);await p.click('#sbank [data-b="bbva"]');await p.fill('#sa',String(monto));await p.fill('#sd','T137');
  if(tipo==='pago')await p.click('#ssrc [data-src="liq:0"]');await guarda(p);};

 // 1. Primero de diciembre sin haber abierto noviembre (mes saltado)
 let p=await abre('2026-12-02','#diciembre',datos());
 T('1 la deuda llega a diciembre aunque no se abriera noviembre',await deuda(p,10)===1000&&await deuda(p,11)===1000);
 // 2. Pago fechado el 30 de noviembre y su Deshacer
 await tarjeta(p,'pago',100,10,30);T('2 un pago fechado en noviembre baja noviembre y diciembre',await deuda(p,10)===900&&await deuda(p,11)===900);
 await p.click('#toast [data-undo]');await avanza(p,1500);T('2 Deshacer devuelve los dos',await deuda(p,10)===1000&&await deuda(p,11)===1000);
 // 3. Compra olvidada de octubre
 await tarjeta(p,'compra',200,9,30);T('3 una compra olvidada de octubre llega hasta diciembre',await deuda(p,11)===1200);
 await recarga(p);T('3 tras abrir otra vez no se duplica',await deuda(p,11)===1200&&/Guardado/.test(await p.innerText('#syn')));
 const n1=await nube(p);T('3 la nube marca la deuda como heredada',JSON.parse(n1).registro.some(f=>f[3]==='_Card'&&f[1]===12&&/"_h":\["bbva"/.test(f[4])));
 T('sin errores 1',!p.errs.length);if(p.errs.length)console.log(p.errs);await p.context().close();
 // 4. Otro dispositivo
 p=await abre('2026-12-02','#diciembre',null,n1);T('4 otro dispositivo ve la misma deuda',await deuda(p,11)===1200);
 await tarjeta(p,'pago',50,10,29);T('4 y sigue al mes anterior',await deuda(p,11)===1150);await p.context().close();

 // 5. «Saldo anterior» escrito en 0: se respeta, también tras la nube y tras corregir meses pasados
 p=await abre('2026-12-02','#diciembre',datos());
 await p.evaluate(()=>{const i=document.querySelector('input[data-copen="bbva"]');const d=i.closest('details');if(d)d.open=true;i.value='0';i.dispatchEvent(new Event('input',{bubbles:true}));});await avanza(p,4000);
 await recarga(p);T('5 el cero escrito a mano no vuelve tras la nube',await deuda(p,11)===0);
 await tarjeta(p,'compra',200,9,28);T('5 y no lo mueve una compra de meses pasados',await deuda(p,11)===0&&await deuda(p,10)===1200);await p.context().close();

 // 6. Un mes con consumos que nunca heredó no se toca (la deuda pudo anotarse como consumo)
 p=await abre('2026-11-02','#noviembre',datos(S=>{S['2026'][10].bbva=[{c:'Saldo',m:40,f:'1-nov',k:''}];}));
 T('6 mes con consumos sin heredar: queda en 40',await deuda(p,10)===40);await p.context().close();
 // 7. Registrar desde el Resumen el día 1: la deuda llega antes de la compra
 p=await abre('2026-11-02','#resumen',datos());await tarjeta(p,'compra',50,10,2);
 T('7 la compra del día 1 se suma a lo que ya se debía',await deuda(p,10)===1050);await p.context().close();

 // 8. Pestaña sin actualizar: pierde la marca y la deuda queda como está, sin duplicarse
 p=await abre('2026-12-02','#diciembre',datos());
 const vieja=JSON.parse(await nube(p));vieja.registro.forEach(f=>{if(f[3]==='_Card'){const j=JSON.parse(f[4]);delete j._h;f[4]=JSON.stringify(j);}});await p.context().close();
 p=await abre('2026-12-02','#diciembre',null,JSON.stringify(vieja));T('8 sin la marca no se duplica',await deuda(p,11)===1000);await p.context().close();

 // 9. Enero y una tarjeta en dólares (cuarta)
 p=await abre('2027-01-03','#resumen',datos((S,cfg)=>{cfg.tarjetasX=[{k:'c4',n:'Extra',l:0,cd:0,pd:0}];S['2026'][9].c4=[{c:'Hotel',m:30,f:'2-oct',k:'',cur:'$'}];}));
 T('9 en enero llegan las deudas de las dos tarjetas',await deuda(p,0,'bbva','2027')===1000&&await deuda(p,0,'c4','2027')>0);
 T('sin errores 2',!p.errs.length);if(p.errs.length)console.log(p.errs);await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
