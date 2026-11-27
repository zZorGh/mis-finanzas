// t133: ventana de registro en escritorio (sin bajar) y atajos de teclado, con sus frenos. Datos inventados.
const {chromium}=require('playwright');const fs=require('fs');
const chart=fs.readFileSync(__dirname+'/node_modules/chart.js/dist/chart.umd.js','utf8');
const demo=JSON.parse(fs.readFileSync(__dirname+'/demo.json','utf8'));const K='mis-finanzas-prototipo-v1';
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FALLA',n));};
(async()=>{
 const b=await chromium.launch();
 const mk=async x=>{x=x||{};const c=await b.newContext({viewport:{width:x.w||1366,height:x.h||768}});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765'))return r.continue();if(u.includes('hart'))return r.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chart});return r.abort();});
  await c.addInitScript(([d,k,l])=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem(k,d);localStorage.setItem(k+'-instalar','1');localStorage.setItem(k+'-src','liq:0');if(l)localStorage.setItem('cuadra-lang',l);}},[JSON.stringify({v:1,S:demo.S,cfg:Object.assign({},demo.cfg,{onb:1,ahoV:3})}),K,x.lang||'']);
  const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto('http://127.0.0.1:8765/wrap-repo.html'+(x.hash||'#noviembre'));await p.waitForSelector('#app .card');await p.waitForTimeout(300);return p;};
 const W=p=>p.waitForTimeout(200),tecla=async(p,k)=>{await p.keyboard.press(k);await W(p);},abierta=p=>p.locator('#sheet').count(),hash=p=>p.evaluate(()=>location.hash);
 const sinFoco=p=>p.evaluate(()=>{if(document.activeElement)document.activeElement.blur();});
 const filas=async p=>{const m=JSON.parse(await p.evaluate(k=>localStorage.getItem(k),K)).S['2026'][10];return m.hor.length+m.fij.length;};

 let p=await mk();
 await tecla(p,'n');T('1 N abre el registro rápido con el cursor en el monto',await p.locator('#sheet[data-quick]').count()===1&&await p.evaluate(()=>document.activeElement.id==='sa'&&!document.activeElement.value));
 const sobra=()=>p.evaluate(()=>{const s=document.getElementById('sheet');return s.scrollHeight-s.clientHeight;});
 T('2 sin bajar en una ventana de 1366×768 (gasto)',await sobra()<=0);
 await p.click('#stype [data-g="ahorro"]');await W(p);T('3 sin bajar en una ventana de 1366×768 (ahorro, el más largo)',await sobra()<=0);
 await p.click('#stype [data-g="gasto"]');await W(p);
 const n0=await filas(p);await p.fill('#sa','12');await p.fill('#sd','T133 nnn');await W(p);T('4 escribir «n» dentro del formulario no abre nada raro',await p.inputValue('#sd')==='T133 nnn');
 await p.locator('#sd').press('Control+Enter');await W(p);T('5 Ctrl+Enter guarda una sola vez',!(await abierta(p))&&await filas(p)===n0+1);
 await sinFoco(p);await p.evaluate(()=>{for(const m of ['ctrlKey','altKey','metaKey'])document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'n',[m]:true,bubbles:true,cancelable:true}));});await W(p);T('6 con Ctrl no hace nada',!(await abierta(p)));
 await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app .card');await W(p);await sinFoco(p);
 await tecla(p,'ArrowLeft');T('7 ← va al mes anterior',await hash(p)==='#octubre');
 await tecla(p,'ArrowRight');await tecla(p,'ArrowRight');T('8 → va al mes siguiente',await hash(p)==='#diciembre');
 await tecla(p,'ArrowRight');T('9 → no pasa de diciembre',await hash(p)==='#diciembre');
 await tecla(p,'r');T('10 R abre el resumen',await hash(p)==='#resumen');
 await tecla(p,'ArrowLeft');T('11 en el resumen las flechas no cambian de vista',await hash(p)==='#resumen');
 await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app .card');await W(p);
 await p.focus('#yr');await tecla(p,'n');T('12 con el foco en un selector, N no abre',!(await abierta(p)));await sinFoco(p);
 await tecla(p,'Shift+?');T('13 ? muestra la ayuda',/Atajos de teclado/.test(await p.innerText('#sheet')));
 await tecla(p,'ArrowLeft');T('14 con una ventana abierta no cambia de mes',await hash(p)==='#noviembre');
 await tecla(p,'Escape');T('15 Esc la cierra',!(await abierta(p)));
 T('16 el botón Registrar anuncia el atajo',await p.getAttribute('.caplink','aria-keyshortcuts')==='n');T('sin errores',!p.errs.length);await p.context().close();

 p=await mk({hash:'#ajustes'});await p.uncheck('#atk');await W(p);await sinFoco(p);await tecla(p,'n');T('17 apagados en Ajustes, N no abre',!(await abierta(p)));
 await p.goto('http://127.0.0.1:8765/wrap-repo.html#noviembre');await p.waitForSelector('#app .card');await W(p);await tecla(p,'ArrowLeft');T('18 apagados, las flechas tampoco y se recuerda',await hash(p)==='#noviembre'&&!(await p.getAttribute('.caplink','aria-keyshortcuts')));await p.context().close();

 p=await mk({lang:'en'});await sinFoco(p);await tecla(p,'Shift+?');const tx=await p.innerText('#sheet');T('19 la ayuda sale en inglés',/Keyboard shortcuts/.test(tx)&&/Previous or next month/.test(tx)&&!/Registrar|Mes anterior|Ajustes/.test(tx));await p.context().close();
 p=await mk({w:390,h:844});T('20 en celular la ventana sigue a todo el ancho',await p.evaluate(()=>{document.getElementById('fab').click();return true;})&&(await p.waitForSelector('#sheet'),await p.evaluate(()=>Math.round(document.getElementById('sheet').getBoundingClientRect().width)===390)));await p.context().close();
 for(const lang of ['es','en']){p=await mk({w:1349,lang});const r=await p.evaluate(()=>{const s=document.getElementById('syn');if(s){s.hidden=false;s.textContent='Guardado 10:30 p. m.';}const h=document.getElementById('hdr'),t=h.querySelector('.tabs');return{alto:h.getBoundingClientRect().height,oculto:t.scrollWidth-t.clientWidth,fuera:h.querySelector('.ctl').getBoundingClientRect().right>innerWidth+1};});T('21 menú en una fila en una laptop de 1366 ('+lang+')',r.alto<75&&r.oculto<=0&&!r.fuera);await p.context().close();}
 console.log('Total '+(ok+bad)+' ok '+ok+' fallas '+bad);await b.close();process.exit(bad?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
