// t139: el ahorro en otra moneda se valora al tipo de cambio del mes que se mira. Retirar todo deja cero, suba o baje el
// cambio, y la liquidez recibe lo que valen hoy. Por la interfaz. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');const zlib=require('zlib');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
const JS={contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}};
const unzip=buf=>{const out={};let e=buf.length-22;while(buf.readUInt32LE(e)!==0x06054b50)e--;const n=buf.readUInt16LE(e+10);let p=buf.readUInt32LE(e+16);
  for(let i=0;i<n;i++){const m=buf.readUInt16LE(p+10),cs=buf.readUInt32LE(p+20),nl=buf.readUInt16LE(p+28),xl=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42),name=buf.slice(p+46,p+46+nl).toString();
    const ln=buf.readUInt16LE(lo+26),lx=buf.readUInt16LE(lo+28),d=buf.slice(lo+30+ln+lx,lo+30+ln+lx+cs);out[name]=m===8?zlib.inflateRawSync(d):d;p+=46+nl+xl+cl;}return out;};
const fila=(m,dia,cur,extra)=>Object.assign({c:'Dólares',m,f:dia,k:''},cur?{cur}:{},extra||{});
// aho: {mes: filas}; tc: {mes: dólar}. Respaldo 3.50 a propósito, distinto de los de cada mes
const datos=(aho,tc,cfgx)=>{const d=JSON.parse(JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3,rec:[],tcAuto:false,tc:{'$':3.5,'€':4}},cfgx)}));
  Object.values(d.S).forEach(a=>a.forEach(m=>{m.aho=[{c:'',m:0,f:'',k:''}];delete m.tc;}));
  Object.entries(aho).forEach(([i,r])=>d.S['2026'][i].aho=r);Object.entries(tc).forEach(([i,v])=>d.S['2026'][i].tc={'$':v});return JSON.stringify(d);};
const DEP={9:[fila(100,'5-oct','$')]};
(async()=>{
 const b=await chromium.launch();
 const abre=async(local,hash,fecha)=>{const c=await b.newContext({viewport:{width:1366,height:800},acceptDownloads:true,locale:'es-PE',timezoneId:'America/Lima'});await c.clock.setFixedTime(new Date((fecha||'2026-11-22')+'T12:00:00-05:00'));
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});if(/cdn\.jsdelivr\.net\/npm\/(exceljs|jspdf)/.test(u))return r.continue();return r.abort();});
  await c.addInitScript(([d,k])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');},[local,K]);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',x=>x.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html#'+(hash||'noviembre'));await p.waitForTimeout(900);return p;};
 const cierra=async p=>{T('sin errores',!p.errs.length);if(p.errs.length)console.log(p.errs);await p.context().close();};
 const total=async p=>(await p.locator('#t-aho').innerText()).trim();
 const guardado=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
 const cartera=async p=>(await p.locator('#app .ahocard .aacct').innerText()).replace(/\s+/g,' ');
 const ahorro=async(p,ax,monto,cur,liq)=>{await p.click('.caplink');await p.waitForSelector('#sheet');await p.click('#stype [data-g="ahorro"]');await p.click('#sheet [data-ax="'+ax+'"]');await p.click('#sheet [data-from="aho:Dólares"]');
  await p.fill('#sa',monto);for(let i=0;i<3&&(await p.locator('#scur').innerText()).trim().indexOf(cur)!==0;i++)await p.click('#scur');
  if(liq)await p.click('#ssrc [data-src="'+liq+'"]');await p.waitForTimeout(300);
  const v={aviso:await p.locator('#sshort').isVisible()?await p.locator('#sshort').innerText():'',prev:await p.locator('#sprev').innerText(),boton:await p.locator('#sheet .sact button.p').isDisabled()};return v;};
 const guarda=async p=>{await p.click('#sheet .sact button.p');await p.waitForTimeout(700);};

 // 1. El cambio sube y baja: saldo al cambio del mes, retirar todo con el bloqueo puesto, cero y la liquidez recibe su valor
 for(const [de,a,vale] of [[3.4,3.8,380],[3.8,3.4,340]]){
  const p=await abre(datos(DEP,{9:de,10:a},{bloquearNeg:true}));const n=de+'→'+a;
  T(n+' saldo al cambio de noviembre',await total(p)==='S/ '+vale+'.00');
  T(n+' muestra los dólares y el cambio usado',(await cartera(p)).includes('$ 100.00 · 1 $ = S/ '+a));
  const liq0=+(await guardado(p)).S['2026'][10].liq[0].m;
  const v=await ahorro(p,'ret','100','$','liq:0');
  T(n+' retirar todo no avisa ni se bloquea',!v.aviso&&!v.boton);
  T(n+' la vista previa llega a cero',/→ S\/ 0\.00/.test(v.prev));
  await guarda(p);T(n+' queda en cero',await total(p)==='S/ 0.00');
  T(n+' la liquidez recibe lo que valen',Math.abs(+(await guardado(p)).S['2026'][10].liq[0].m-liq0-vale)<.005);
  await p.locator('#app [data-act="adel"]').click();await p.waitForTimeout(500);T(n+' la cuenta vacía se puede quitar',await p.locator('#app .ahocard .aacct').count()===0);
  await cierra(p);
 }
 // 2. Retirar en soles (la moneda que sale por defecto) gasta dólares: no vuelve a descuadrar cuando cambia el tipo de cambio
 {const p=await abre(datos(DEP,{9:3.4,10:3.8}));await ahorro(p,'ret','380','S/','liq:0');await guarda(p);
  T('2 retirar S/ 380 deja cero',await total(p)==='S/ 0.00');
  const d=await guardado(p);d.S['2026'][11].tc={'$':3.2};const q=await abre(JSON.stringify(d),'diciembre','2026-12-02');T('2 y sigue en cero con otro cambio en diciembre',await total(q)==='S/ 0.00');await cierra(q);
  await cierra(p);}
 // 2b. Retirar en soles o ajustar a 0 en soles y que el cambio de ESE mismo mes se mueva después (SUNAT lo cambia a diario)
 for(const [que,ax,monto] of [['retirar S/ 380','ret','380'],['ajustar a 0 en soles','aj','0']]){const p=await abre(datos(DEP,{9:3.4,10:3.8}));await ahorro(p,ax,monto,'S/',ax==='ret'?'liq:0':null);await guarda(p);
  for(const tc of [3.9,3.7]){const d=await guardado(p);d.S['2026'][10].tc={'$':tc};const q=await abre(JSON.stringify(d));
   T('2b '+que+', luego el cambio pasa a '+tc+': sigue en cero',await total(q)==='S/ 0.00');
   if(tc===3.7){await q.locator('#app [data-act="adel"]').click();await q.waitForTimeout(500);T('2b '+que+': la cuenta se puede quitar',await q.locator('#app .ahocard .aacct').count()===0);}await cierra(q);}
  await cierra(p);}
 // 2c. Retiro parcial en soles: salen dólares al cambio de ese momento y lo que queda son dólares
 {const p=await abre(datos(DEP,{9:3.4,10:3.8}));await ahorro(p,'ret','190','S/','liq:0');await guarda(p);const d=await guardado(p);d.S['2026'][10].tc={'$':4};const q=await abre(JSON.stringify(d));
  T('2c quedan $ 50, valgan lo que valgan',(await cartera(q)).includes('$ 50.00')&&await total(q)==='S/ 200.00');await cierra(q);await cierra(p);}
 // 2d. Cuenta con S/ 50 y $ 100: retirar S/ 430 la vacía aunque luego cambie el dólar
 {const p=await abre(datos({9:[fila(50,'4-oct'),fila(100,'5-oct','$')]},{9:3.4,10:3.8}));await ahorro(p,'ret','430','S/','liq:0');await guarda(p);const d=await guardado(p);d.S['2026'][10].tc={'$':3.5};const q=await abre(JSON.stringify(d));
  T('2d mezcla vaciada',await total(q)==='S/ 0.00');await cierra(q);await cierra(p);}
 // 2e. Una fila manipulada no mete nada en la pantalla
 {const p=await abre(datos({9:[fila(100,'5-oct','$'),fila(-10,'6-oct','S/',{tvc:'<img src=x onerror=window.__x=1>',tv:2,tvm:10})]},{9:3.4,10:3.8}));
  T('2e moneda falsa descartada',await p.evaluate(()=>!window.__x&&!document.querySelector('#app .ahocard img')));await cierra(p);}
 // 2f. Editar un retiro en soles: se vuelve a calcular, sin arrastrar el cambio guardado
 {const p=await abre(datos(DEP,{9:3.4,10:3.8}));await ahorro(p,'ret','380','S/','liq:0');await guarda(p);
  const edita=async(monto,cur)=>{await p.evaluate(()=>{const l=document.querySelectorAll('#app [data-edit="aho"]');l[l.length-1].click();});await p.waitForSelector('#sheet');await p.waitForTimeout(300);await p.fill('#sa',monto);for(let i=0;i<3&&(await p.locator('#scur').innerText()).trim().indexOf(cur)!==0;i++)await p.click('#scur');await guarda(p);};
  const conCambio=async tc=>{const d=await guardado(p);d.S['2026'][10].tc={'$':tc};const q=await abre(JSON.stringify(d));const v={t:await total(q),c:await q.locator('#app .ahocard .aacct').count()?await cartera(q):''};await cierra(q);return v;};
  await edita('190','S/');let v=await conCambio(4);T('2f S/ 380 → S/ 190 deja $ 50',v.t==='S/ 200.00'&&v.c.includes('$ 50.00'));
  await edita('100','$');v=await conCambio(4);T('2f cambiarlo a $ 100 deja cero',v.t==='S/ 0.00');
  const f=(await guardado(p)).S['2026'][10].aho.find(r=>r.m<0);T('2f la fila ya no arrastra el cambio guardado',!!f&&!f.tvc&&!f.tv);await cierra(p);}
 // 2g. Nube: otro dispositivo ve la cuenta en cero aunque el cambio se mueva, y una moneda falsa se descarta
 {const stub=eval(fs.readFileSync(__dirname+'/t135.js','utf8').match(/const stub=(`[\s\S]*?`);\n/)[1]);
  const con=async(local,nube)=>{const c=await b.newContext({viewport:{width:1366,height:800}});await c.clock.install({time:new Date('2026-11-22T12:00:00-05:00')});
   await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({...JS,body:chart});return r.abort();});await c.addInitScript(stub);
   await c.addInitScript(([d,n,k])=>{if(sessionStorage.getItem('__s'))return;sessionStorage.setItem('__s','1');if(d)localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');if(n)sessionStorage.setItem('__nube',n);},[local,nube,K]);
   const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',x=>x.accept());await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app .card');for(const ms of [2000,4000]){await p.clock.runFor(ms);await p.waitForTimeout(450);}return p;};
  const p=await con(datos(DEP,{9:3.4,10:3.8}),null);await ahorro(p,'ret','380','S/','liq:0');await p.click('#sheet .sact button.p');for(const ms of [2000,4000,4000]){await p.clock.runFor(ms);await p.waitForTimeout(450);}
  const nube=await p.evaluate(()=>sessionStorage.getItem('__nube'));T('2g la nube lleva el cambio guardado',/tvc/.test(nube||''));await cierra(p);
  const j=JSON.parse(nube);j.registro.forEach(f=>{if(f[1]===11&&f[3]==='_TC')f[4]=JSON.stringify({'$':4.2});});
  const q=await con(null,JSON.stringify(j));const d=await guardado(q);T('2g el otro dispositivo recibió el cambio nuevo',+d.S['2026'][10].tc['$']===4.2);T('2g y sigue en cero',await total(q)==='S/ 0.00');
  await q.locator('#app [data-act="adel"]').click();await q.clock.runFor(500);T('2g la cuenta se puede quitar',await q.locator('#app .ahocard .aacct').count()===0);await cierra(q);
  const h=JSON.parse(nube);h.registro.forEach(f=>{if(typeof f[15]==='string'&&/tvc/.test(f[15])){const x=JSON.parse(f[15]);x.tvc='<img src=x onerror=window.__x=1>';f[15]=JSON.stringify(x);}});
  const w=await con(null,JSON.stringify(h));T('2g moneda falsa desde la nube descartada',await w.evaluate(()=>!window.__x&&!document.querySelector('#app .ahocard img'))&&!/onerror/.test(JSON.stringify((await guardado(w)).S)));await cierra(w);}
 // 3. Lo anotado antes de este cambio: se retiró en soles el mismo mes
 {const p=await abre(datos({9:[fila(100,'5-oct','$'),fila(-340,'20-oct')]},{9:3.4,10:3.8}));T('3 un retiro antiguo en soles sigue dando cero',await total(p)==='S/ 0.00');await cierra(p);}
 // 4. Mes sin tipo de cambio propio: usa el último, no el de respaldo, y todo coincide
 {const p=await abre(datos(DEP,{9:3.4,10:3.8}),'diciembre','2026-12-02');T('4 diciembre usa el de noviembre',await total(p)==='S/ 380.00');
  const v=await ahorro(p,'ret','100','$','liq:0');T('4 retirar todo no avisa',!v.aviso&&/→ S\/ 0\.00/.test(v.prev));await guarda(p);T('4 queda en cero',await total(p)==='S/ 0.00');await cierra(p);}
 // 5. Soles y dólares en la misma cuenta
 {const p=await abre(datos({9:[fila(50,'4-oct'),fila(100,'5-oct','$')]},{9:3.4,10:3.8}));T('5 suma las dos monedas',await total(p)==='S/ 430.00');
  T('5 y las muestra',(await cartera(p)).includes('S/ 50.00 + $ 100.00'));await cierra(p);}
 // 6. Ajustar saldo en dólares deja justo lo escrito; ajustar a 0 en soles deja la cuenta vacía en las dos monedas
 {const p=await abre(datos(DEP,{9:3.4,10:3.8}));await ahorro(p,'aj','90','$');await guarda(p);
  T('6 quedan $ 90',(await cartera(p)).includes('$ 90.00')&&await total(p)==='S/ 342.00');
  await ahorro(p,'aj','0','S/');await guarda(p);T('6 ajustar a cero',await total(p)==='S/ 0.00'&&!(await cartera(p)).includes('$'));await cierra(p);}
 // 7. Solo soles: nada cambia ni aparece la línea del cambio
 {const p=await abre(datos({9:[fila(200,'5-oct')],10:[fila(-50,'5-nov')]},{9:3.4,10:3.8}));T('7 en soles igual que siempre',await total(p)==='S/ 150.00'&&await p.locator('#app .aa-fx').count()===0);await cierra(p);}
 // 8. El reporte cuadra: la diferencia de cambio tiene su columna
 {const p=await abre(datos(DEP,{9:3.4,10:3.8}),'resumen');
  await p.locator('[data-act="rep"]').first().scrollIntoViewIfNeeded();await p.locator('[data-act="rep"]').first().click();await p.waitForTimeout(300);
  await p.locator('#sheet button',{hasText:/^Excel/}).first().click();const w=p.waitForEvent('download',{timeout:60000});await p.locator('[data-s="rep"]').click();const f=await (await w).path();
  const z=unzip(fs.readFileSync(f));const ss=z['xl/sharedStrings.xml'].toString();T('8 columna «Dif. de cambio»',/Dif\. de cambio/.test(ss));
  const hojas=Object.keys(z).filter(n=>/worksheets\/sheet/.test(n)).map(n=>z[n].toString());T('8 aparecen los S/ 40 de diferencia (340 + 40 = 380)',hojas.some(x=>/<v>40<\/v>/.test(x)&&/<v>380<\/v>/.test(x)&&/<v>340<\/v>/.test(x)));
  await p.locator('#sheet button',{hasText:/^PDF/}).first().click();await p.waitForTimeout(300);const w2=p.waitForEvent('download',{timeout:60000});await p.locator('[data-s="rep"]').click();T('8 el PDF sale',/\.pdf$/i.test((await w2).suggestedFilename()));
  await cierra(p);}
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e.message.slice(0,600));process.exit(1);});
