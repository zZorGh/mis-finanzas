// t138: quitar una cuenta en «Editar» no cruza los movimientos de las demás. Por la interfaz, con sesión simulada. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
const stub=eval(fs.readFileSync(__dirname+'/t135.js','utf8').match(/const stub=(`[\s\S]*?`);\n/)[1]);
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const datos=()=>JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,rec:[]})});
(async()=>{
 const b=await chromium.launch();
 const avanza=async(p,ms)=>{await p.clock.runFor(ms);await p.waitForTimeout(450);};
 const abre=async(fecha,hash,local,nube,lang)=>{const c=await b.newContext({viewport:{width:1366,height:800}});await c.clock.install({time:new Date(fecha+'T12:00:00-05:00')});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(stub);
  await c.addInitScript(([d,n,k,l])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');if(d)localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(n)sessionStorage.setItem('__nube',n);if(l)localStorage.setItem('cuadra-lang',l);},[local,nube||null,K,lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',x=>x.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html'+hash);await p.waitForSelector('#app .card');await avanza(p,2000);await avanza(p,4000);return p;};
 const mes=(p,i)=>p.evaluate(([k,i])=>JSON.parse(localStorage.getItem(k)).S['2026'][i],[K,i]);
 const cuentas=async(p,i)=>(await mes(p,i===undefined?10:i)).liq.map(r=>r.c+'='+r.m+(r.h?' (quitada)':'')).join(', ');
 const guarda=async p=>{await p.click('#sheet .sact button.p');await avanza(p,1500);};
 const gasto=async(p,monto,c,src)=>{await p.click('.caplink');await p.waitForSelector('#sheet');await avanza(p,400);await p.fill('#sa',monto);await p.fill('#sd',c);await p.click('#ssrc [data-src="'+src+'"]');await guarda(p);};
 const editar=async p=>{await p.click('#app [data-act="liqedit"]');await avanza(p,500);};
 const quita=async(p,i)=>{await p.click('#app .liq [data-del="liq"][data-i="'+i+'"]');await avanza(p,800);};
 const borraGasto=async(p,c)=>{const i=(await mes(p,10)).hor.findIndex(r=>r.c===c);await p.evaluate(i=>document.querySelector('[data-edit="hor"][data-i="'+i+'"]').click(),i);await p.waitForSelector('#sheet');await avanza(p,400);await p.click('#sheet [data-s="del-mov"]');await avanza(p,300);if(await p.locator('#sheet [data-s="del-mov"]').count())await p.click('#sheet [data-s="del-mov"]');await avanza(p,1500);};
 const filas=p=>p.locator('#app .liq .liq-list li').allInnerTexts();

 let p=await abre('2026-11-22','#noviembre',datos());
 await gasto(p,'30','T138 pan','liq:2');
 T('0 el gasto sale de la tercera cuenta',(await mes(p,10)).liq[2].m===170);
 await editar(p);await quita(p,1);
 T('1 las demás cuentas no cambian de lugar',(await cuentas(p))==='Yape=430, Plin=0 (quitada), Efectivo billetes=170, Efectivo monedas=18');
 T('1 el aviso dice lo que tenía y deja deshacer',/Quitaste Plin, que tenía S\/ 130\.00/.test(await p.innerText('#toast'))&&await p.locator('#toast [data-undo]').count()===1);
 T('1 ya no aparece en el editor y se puede recuperar',await p.locator('#app .liq-rows [data-del="liq"]').count()===3&&await p.locator('#app [data-liqback="1"]').count()===1);
 await editar(p);T('1 ni en la lista de cuentas ni en el total',(await filas(p)).every(t=>!/Plin/.test(t))&&/618\.00/.test(await p.locator('#app .hero-v').first().innerText()));
 await p.click('.caplink');await p.waitForSelector('#sheet');await avanza(p,400);T('1 no se ofrece al registrar',!/Plin/.test(await p.innerText('#ssrc'))&&/Efectivo billetes/.test(await p.innerText('#ssrc')));await p.keyboard.press('Escape');await avanza(p,400);
 await borraGasto(p,'T138 pan');
 T('2 borrar el gasto devuelve el dinero a su cuenta, no a otra',(await cuentas(p))==='Yape=430, Plin=0 (quitada), Efectivo billetes=200, Efectivo monedas=18');
 // Nube: la cuenta quitada conserva su lugar
 await avanza(p,4000);await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);await avanza(p,4000);
 T('3 tras la nube sigue en su sitio y quitada',(await cuentas(p))==='Yape=430, Plin=0 (quitada), Efectivo billetes=200, Efectivo monedas=18'&&/Guardado/.test(await p.innerText('#syn')));
 await editar(p);await p.click('#app [data-liqback="1"]');await avanza(p,800);
 T('4 Recuperar la vuelve a mostrar (en cero)',(await cuentas(p))==='Yape=430, Plin=0, Efectivo billetes=200, Efectivo monedas=18'&&await p.locator('#app .liq-rows [data-del="liq"]').count()===4);
 await quita(p,0);await p.click('#toast [data-undo]');await avanza(p,800);T('5 Deshacer devuelve la cuenta con su saldo',(await cuentas(p)).startsWith('Yape=430, Plin=0, '));
 // Una cuenta nueva sin nombre ni dinero sí se borra del todo
 await p.click('#app [data-add="liq"]');await avanza(p,500);await quita(p,4);T('6 una fila vacía recién agregada desaparece',(await mes(p,10)).liq.length===4);
 T('sin errores 1',!p.errs.length);if(p.errs.length)console.log(p.errs);await p.context().close();

 // Mes nuevo: la cuenta quitada no vuelve, y las posiciones se mantienen
 p=await abre('2026-11-30','#noviembre',datos());await editar(p);await quita(p,1);await avanza(p,4000);const nube=await p.evaluate(()=>sessionStorage.getItem('__nube'));await p.context().close();
 p=await abre('2026-12-01','#diciembre',null,nube);
 T('7 en diciembre sigue quitada y las demás en su sitio',(await cuentas(p,11))==='Yape=430, Plin=0 (quitada), Efectivo billetes=200, Efectivo monedas=18');
 T('7 y no se muestra',(await filas(p)).every(t=>!/Plin/.test(t)));await p.context().close();

 // 9. Lo recordado o un recurrente no guardan contra una cuenta que no se ve
 const conRec=JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,rec:[{sec:'fij',s:'fij',c:'T138 internet',m:90,k:'',src:'liq:1',f:5}]})});
 p=await abre('2026-11-22','#noviembre',conRec);await p.evaluate(k=>localStorage.setItem(k+'-src','liq:1'),K);await editar(p);await quita(p,1);await editar(p);
 await p.click('.caplink');await p.waitForSelector('#sheet');await avanza(p,400);await p.fill('#sa','9');await p.fill('#sd','Delivery');await avanza(p,400);
 T('9 la cuenta recordada o del historial no queda elegida',await p.locator('#ssrc [data-src="liq:1"]').count()===0);await p.click('#sheet .sact button.p');await avanza(p,600);
 T('9 y no guarda sin elegir otra',await p.locator('#sheet').count()===1&&(await mes(p,10)).liq[1].m===0);await p.keyboard.press('Escape');await avanza(p,400);
 await p.click('#app [data-pay]');await avanza(p,800);if(await p.locator('#sheet').count()){T('9 «Pagado» de un recurrente de esa cuenta pide otra',await p.locator('#ssrc [data-src="liq:1"]').count()===0);await p.keyboard.press('Escape');await avanza(p,300);}else T('9 «Pagado» no descuenta de la cuenta quitada',(await mes(p,10)).liq[1].m===0);
 T('9 la cuenta quitada sigue en cero',(await mes(p,10)).liq[1].m===0&&!!(await mes(p,10)).liq[1].h);await p.context().close();

 // 10. Recuperar en noviembre la recupera también en diciembre; deshacer con diciembre ya heredado devuelve los dos
 p=await abre('2026-12-01','#diciembre',datos());await p.evaluate(()=>{location.hash='#noviembre';});await avanza(p,800);await editar(p);await quita(p,1);
 T('10 quitada en noviembre, en diciembre queda en cero y oculta',(await cuentas(p,11))==='Yape=430, Plin=0 (quitada), Efectivo billetes=200, Efectivo monedas=18');
 await p.click('#toast [data-undo]');await avanza(p,800);T('10 Deshacer devuelve los dos meses',(await cuentas(p,10))==='Yape=430, Plin=130, Efectivo billetes=200, Efectivo monedas=18'&&(await cuentas(p,11))==='Yape=430, Plin=130, Efectivo billetes=200, Efectivo monedas=18');
 await quita(p,1);await p.click('#app [data-liqback="1"]');await avanza(p,800);T('10 Recuperar la muestra también en diciembre',!(await mes(p,11)).liq[1].h&&!(await mes(p,10)).liq[1].h);await p.context().close();

 // 11. Dejar una cuenta sin nombre no corre las demás tras la nube
 p=await abre('2026-11-22','#noviembre',datos());await gasto(p,'30','T138 luz','liq:2');
 await p.evaluate(()=>{location.hash='#noviembre';});await editar(p);await p.fill('#app .liq-rows #liq-1-c','');await p.fill('#app .liq-rows #liq-1-m','0');await avanza(p,5000);await p.reload();await p.waitForSelector('#app .card');await avanza(p,2000);await avanza(p,4000);
 await borraGasto(p,'T138 luz');const c11=(await mes(p,10)).liq;T('11 sin nombre: la tercera sigue siendo la tercera',c11.length===4&&c11[2].c==='Efectivo billetes'&&c11[2].m===200&&c11[3].m===18);await p.context().close();

 p=await abre('2026-11-22','#noviembre',datos(),null,'en');await editar(p);await quita(p,1);
 T('8 en inglés',/You removed Plin, which had/.test(await p.innerText('#toast'))&&/Restore Plin/.test(await p.innerText('#app .liq')));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
