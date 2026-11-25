// t125: más de 3 tarjetas. Datos actuales intactos, alta y baja, deuda, arrastre, respaldo, versión anterior, reportes de datos y diseño. Solo datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
const data=JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})});
const sinId=(k,v)=>k==='id'?undefined:v;
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
(async()=>{
 const b=await chromium.launch();
 const mk=async x=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||1280,height:900},locale:'es-PE',timezoneId:'America/Lima'});await c.clock.setFixedTime(new Date('2026-11-22T12:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(l)localStorage.setItem('cuadra-lang',l);}},[x.data||data,K,x.lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(x.h||'#ajustes'));await p.waitForSelector(x.h?'#board':'#nm-addc');return p;};
 const J=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
 const add=async(p,n)=>{await p.fill('#nm-newc',n);await p.click('#nm-addc');await p.waitForTimeout(80);};
 const gaps=p=>p.evaluate(()=>{const a=[...document.querySelectorAll('#board .bcard[data-cid^="c"],#board [data-cid=bbva],#board [data-cid=bcp],#board [data-cid=oh]')].filter(e=>/^(bbva|bcp|oh|c[4-8])$/.test(e.dataset.cid)&&e.offsetParent);const f={};a.forEach(e=>{const r=e.getBoundingClientRect(),y=Math.round(r.top);f[y]=(f[y]||0)+r.width;});const m=Math.max(...Object.values(f));return Object.values(f).every(w=>w>m*.97);});

 let p=await mk();let j=await J(p);const s0=JSON.stringify(j.S);
 T('1 sin tarjetas extra no cambia nada',!j.cfg.tarjetasX&&!j.cfg.tarjetasD);T('1 tres nombres',await p.locator('[id^=nm-b]').count()===3);
 await add(p,'Ripley');await add(p,'Falabella');j=await J(p);
 T('2 agrega dos',j.cfg.tarjetasX.length===2&&j.cfg.tarjetasX[0].k==='c4'&&j.cfg.tarjetasX[1].n==='Falabella');
 T('2 existen en todos los meses',Object.values(j.S).every(y=>y.every(m=>Array.isArray(m.c4)&&Array.isArray(m.c5))));
 T('2 no toca lo anterior',['bbva','bcp','oh','fij','hor','ing','liq'].every(k=>Object.keys(j.S).every(y=>j.S[y].every((m,i)=>JSON.stringify(m[k],sinId)===JSON.stringify(JSON.parse(s0)[y][i][k],sinId)))));
 await add(p,'ripley');T('2 no repite nombre',(await J(p)).cfg.tarjetasX.length===2);
 await p.fill('#nm-b3','Ripley Oro');await p.click('#nm-save');await p.waitForTimeout(80);T('3 renombra',(await J(p)).cfg.tarjetasX[0].n==='Ripley Oro');
 await p.evaluate(()=>{location.hash='#noviembre';});await p.waitForSelector('[data-cid=c4]');
 T('4 aparece en el mes',/Ripley Oro/.test(await p.textContent('[data-cid=c4]')));T('4 cinco tarjetas sin huecos',await gaps(p));
 await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));const m=d.S['2026'][10];m.c4=[{c:'Zapatillas',m:300,f:'10-nov'}];m.copen=Object.assign({},m.copen,{c4:100});d.cfg.credito.c4=2000;d.cfg.corteDia=Object.assign({},d.cfg.corteDia,{c4:15});localStorage.setItem(k,JSON.stringify(d));},K);await p.reload();await p.waitForSelector('[data-cid=c4]');
 T('5 deuda con saldo anterior',/400\.00/.test(await p.textContent('#cd-c4')));T('5 disponible',/1,600\.00/.test(await p.textContent('#ca-c4')));
 await p.evaluate(()=>{location.hash='#ajustes';});await p.waitForSelector('[data-cardrm=c4]');await p.click('[data-cardrm=c4]');await p.waitForTimeout(80);T('6 no quita con deuda',(await J(p)).cfg.tarjetasX.some(x=>x.k==='c4'));
 await p.click('[data-cardrm=c5]');await p.waitForTimeout(80);j=await J(p);T('6 quita la vacía',!j.cfg.tarjetasX.some(x=>x.k==='c5')&&Object.values(j.S).every(y=>y.every(m=>!('c5' in m))));
 await p.click('#nm-save');await p.waitForTimeout(80);j=await J(p);T('7 copia protectora',j.cfg.tarjetasD['2026'][10].c4[0].c==='Zapatillas'&&j.cfg.tarjetasD['2026'][10].o.c4===100);

 const viejo=JSON.parse(JSON.stringify(j));Object.values(viejo.S).forEach(y=>y.forEach(m=>{delete m.c4;if(m.copen)delete m.copen.c4;}));viejo.cfg.credito={bbva:viejo.cfg.credito.bbva,bcp:viejo.cfg.credito.bcp,oh:viejo.cfg.credito.oh};if(viejo.cfg.corteDia)delete viejo.cfg.corteDia.c4;
 T('sin errores de JS',!p.errs.length);await p.context().close();
 p=await mk({data:JSON.stringify(viejo),h:'#noviembre'});await p.waitForSelector('[data-cid=c4]');
 T('8 recupera tras una versión anterior',/400\.00/.test(await p.textContent('#cd-c4'))&&/1,600\.00/.test(await p.textContent('#ca-c4')));T('8 sin errores',!p.errs.length);await p.context().close();

 p=await mk({data:JSON.stringify(j),h:'#noviembre'});
 await p.click('[data-act=pagar][data-card=c4]');await p.waitForTimeout(150);T('12 pagar propone la deuda',await p.inputValue('#sa')==='400.00');await p.keyboard.press('Escape');await p.waitForTimeout(100);
 await p.evaluate(async()=>{const c=await caches.open('misoles-share');await c.put('./__compartido',new Response(JSON.stringify({x:'Ripley Oro: Consumo con tarjeta de crédito por S/ 50.00 en TIENDA EJEMPLO',t:Date.now()})));location.hash='#compartido';});await p.waitForTimeout(450);T('12 Automático reconoce la tarjeta',/Ripley Oro/.test(await p.locator('#sapv').innerText()));await p.keyboard.press('Escape');await p.waitForTimeout(100);
 await p.evaluate(()=>{location.hash='#ajustes';});await p.waitForSelector('#imp-file',{state:'attached'});await p.setInputFiles('#imp-file',{name:'tarjeta.csv',mimeType:'text/csv',buffer:Buffer.from('Fecha;Comercio;Importe\n12/11/2026;LIBRERIA EJEMPLO;35,00\n')});await p.waitForSelector('.imr');await p.selectOption('#imp-dest','c4');await p.waitForTimeout(100);await p.click('#imp-go');await p.waitForTimeout(200);T('12 importa a la tarjeta',(await J(p)).S['2026'][10].c4.some(r=>r.c==='LIBRERIA EJEMPLO'&&r.m===35));T('12 sin errores',!p.errs.length);await p.context().close();

 const lleno=JSON.parse(data);lleno.cfg.tarjetasX=['c4','c5','c6','c7','c8'].map((k,i)=>({k,n:'Tarjeta Demo '+(i+4)}));
 for(const w of [1280,390]){p=await mk({data:JSON.stringify(lleno),h:'#noviembre',w});if(w===1280)T('9 ocho tarjetas sin huecos',await gaps(p));T('9 sin desborde '+w,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));T('9 sin errores '+w,!p.errs.length);await p.context().close();}
 p=await mk({data:JSON.stringify(lleno)});T('9 tope de 8',await p.isDisabled('#nm-addc'));await p.context().close();
 const raro=JSON.parse(data);raro.cfg.tarjetasX=[{k:'__proto__',n:'x'},{k:'c4',n:'<img src=x onerror=window.__x=1>'}];
 p=await mk({data:JSON.stringify(raro),h:'#noviembre'});T('10 limpia datos raros',await p.evaluate(()=>!window.__x&&!document.querySelector('[data-cid=c4] img')&&!document.querySelector('[data-cid=__proto__]')));await p.context().close();
 p=await mk({data:JSON.stringify(lleno),lang:'en'});const x=await p.locator('.ajc:has(#nm-addc)').innerText();T('11 inglés',/Add card/.test(x)&&/up to 8 credit cards/.test(x)&&/Remove card/.test(x)&&!/Agregar tarjeta|Quitar tarjeta/.test(x));await p.context().close();
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
