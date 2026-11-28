/* ---------- Conexión con Google Sheets (conector, sin servidor propio) ---------- */
const SRV='Google Sheets',SHEET_DEFAULT='',SKEY=KEY+'-sync';
const APART={ing:'Ingresos',fij:'Gastos fijos',hor:'Gastos cotidianos',bbva:'BBVA',bcp:'BCP',oh:'oh!',c4:'Tarjeta 4',c5:'Tarjeta 5',c6:'Tarjeta 6',c7:'Tarjeta 7',c8:'Tarjeta 8',aho:'Ahorros',inv:'Inversiones',liq:'Liquidez'};
const APART_INV={};Object.keys(APART).forEach(k=>{APART_INV[APART[k]]=k;});
const SECKEYS=Object.keys(APART);
const REGHEAD=['año','mes','mes_nombre','apartado','concepto','monto','categoría','fecha','a','b','d','s','p','fuente','tarjeta'];
const DEFLIQ=['Yape','Plin','Efectivo billetes','Efectivo monedas'];
const LIQN=()=>(cfg.liqNames&&cfg.liqNames.length>=1)?cfg.liqNames:DEFLIQ;
const LIQMAX=8;
/* Todas las cuentas de liquidez por posición: los nombres de Ajustes y, si en algún mes se agregaron más con «Editar», los nombres de esas. */
function liqNamesAll(){
  const n=LIQN().slice();
  Object.keys(S).forEach(y=>(S[y]||[]).forEach(m=>(m.liq||[]).forEach((r,j)=>{const c=(r.c||'').trim();if(j>=n.length&&c&&!n[j])n[j]=c;})));
  for(let j=0;j<n.length;j++)if(!n[j])n[j]='Cuenta '+(j+1);
  return n.slice(0,LIQMAX);
}
/* Agrega una cuenta de liquidez en la misma posición en todos los meses (así «liq:N» sigue apuntando a la misma cuenta). */
function liqAdd(name){
  const L=liqNamesAll();if(L.length>=LIQMAX)return false;
  name=String(name||'').trim().replace(/\s+/g,' ').slice(0,28)||('Cuenta '+(L.length+1));
  Object.keys(S).forEach(y=>(S[y]||[]).forEach(m=>{if(!m.liq)m.liq=[];while(m.liq.length<L.length)m.liq.push(row(L[m.liq.length]));m.liq.push(row(name));}));
  cfg.liqNames=L.concat([name]);return true;
}
const BANK0={bbva:'BBVA',bcp:'BCP',oh:'oh!'};
/* ¿La tarjeta tiene algo que se perdería al quitarla? Consumos, saldo anterior, pagos o un recurrente. */
function cardHas(k){
  const usa=r=>r&&r.card===k;
  return (cfg.rec||[]).some(usa)||Object.keys(S).some(y=>(S[y]||[]).some(m=>(m[k]||[]).some(r=>(r.c||'').trim()||+r.m)||+((m.copen||{})[k])||['fij','hor'].some(s=>(m[s]||[]).some(usa))));
}
/* Copia de las tarjetas extra dentro de cfg: una pestaña con la versión anterior conserva cfg pero borra m.c4…; así nada se pierde. */
function cardsMirror(){
  const X=cfg.tarjetasX||[];if(!X.length){delete cfg.tarjetasD;return;}
  const D={};Object.keys(S).forEach(y=>(S[y]||[]).forEach((m,mi)=>{let e=null;X.forEach(x=>{const k=x.k,a=(m[k]||[]).filter(r=>(r.c||'').trim()||+r.m),o=(m.copen||{})[k];if(a.length||o!=null){e=e||{};if(a.length)e[k]=a;if(o!=null)(e.o=e.o||{})[k]=o;}});if(e)(D[y]=D[y]||{})[mi]=e;}));
  cfg.tarjetasD=D;X.forEach(x=>{x.l=+(cfg.credito||{})[x.k]||0;x.cd=+(cfg.corteDia||{})[x.k]||0;x.pd=+(cfg.pagoDia||{})[x.k]||0;});
}
/* Deja CARDS y los meses de acuerdo con cfg, y recupera lo que una versión anterior haya quitado. */
function cardsSync(){
  const X=Array.isArray(cfg.tarjetasX)?cfg.tarjetasX.filter(x=>x&&CARD_X.includes(x.k)):[];
  CARD_X.forEach((k,i)=>{if(!X.some(x=>x.k===k)&&cardHas(k))X.push({k,n:'Tarjeta '+(i+4),l:0,cd:0,pd:0});});
  X.sort((a,b)=>CARD_X.indexOf(a.k)-CARD_X.indexOf(b.k));
  if(X.length||cfg.tarjetasX)cfg.tarjetasX=X;
  CARDS.length=0;CARDS.push(...CARD_BASE,...X.map(x=>x.k));
  const D=isObj(cfg.tarjetasD)?cfg.tarjetasD:{};
  Object.keys(S).forEach(y=>(S[y]||[]).forEach((m,mi)=>{
    const b=isObj(D[y])&&isObj(D[y][mi])?D[y][mi]:{};
    X.forEach(x=>{const k=x.k;if(!Array.isArray(m[k]))m[k]=saneRows(b[k],()=>[row()]);const o=isObj(b.o)?+b.o[k]:NaN;if(Number.isFinite(o)&&!(m.copen&&m.copen[k]!=null))(m.copen=m.copen||{})[k]=o;});
    CARD_X.forEach(k=>{if(!X.some(x=>x.k===k))delete m[k];});
  }));
  if(!cfg.credito)cfg.credito={bbva:0,bcp:0,oh:0};
  X.forEach(x=>{if(cfg.credito[x.k]==null&&x.l)cfg.credito[x.k]=x.l;if(x.cd&&!(cfg.corteDia||{})[x.k])(cfg.corteDia=cfg.corteDia||{})[x.k]=x.cd;if(x.pd&&!(cfg.pagoDia||{})[x.k])(cfg.pagoDia=cfg.pagoDia||{})[x.k]=x.pd;});
}
function applyBanks(){
  cardsSync();BANCOS.length=0;
  CARD_X.forEach(k=>{delete BANKN[k];delete SECN[k];delete CNAME[k];});
  CARDS.forEach(k=>{const x=(cfg.tarjetasX||[]).find(t=>t.k===k),n=x?x.n:(String((cfg.bancos||{})[k]||'').replace(/[<>"'`]/g,'').trim()||BANK0[k]);BANKN[k]=n;SECN[k]=n;CNAME[k]=n;BANCOS.push([k,n,'--h-'+k]);});
  const n=CARDS.length,r=n%3,seis=r===2?2:r===1?4:0;CARDS.forEach((k,i)=>{DEFW.mes[k]=i>=n-seis?6:4;});
}
/* Busca una tarjeta por su nombre en un texto ya normalizado; admite varias palabras y gana el nombre más largo («Ripley Oro» antes que «Ripley»). */
function cardEnTexto(nt){
  let best='',len=0;
  Object.keys(BANKN).forEach(k=>{const w=normTxt(BANKN[k]).split(/[^a-z0-9]+/).filter(Boolean),n=w.join('').length;if(n<2||n<=len)return;if(new RegExp('(?<![a-z0-9])'+w.map(escRe).join('[^a-z0-9]*')+'(?![a-z0-9])').test(nt)){best=k;len=n;}});
  return best;
}
function cardAdd(name){
  if(CARDS.length>=CARDMAX)return '';
  const k=CARD_X.find(c=>!CARDS.includes(c));if(!k)return '';
  const n=String(name||'').replace(/[<>"'`]/g,'').trim().replace(/\s+/g,' ').slice(0,28)||('Tarjeta '+(CARDS.length+1));
  cfg.tarjetasX=(cfg.tarjetasX||[]).concat([{k,n,l:0,cd:0,pd:0}]);applyBanks();return k;
}
function cardRm(k){
  if(!CARD_X.includes(k)||cardHas(k))return false;
  cfg.tarjetasX=(cfg.tarjetasX||[]).filter(x=>x.k!==k);
  [cfg.credito,cfg.corteDia,cfg.pagoDia].forEach(o=>{if(o)delete o[k];});
  Object.keys(S).forEach(y=>(S[y]||[]).forEach(m=>{delete m[k];if(m.copen)delete m.copen[k];}));
  Object.keys(LAY||{}).forEach(g=>{const l=LAY[g];if(l&&l.c)delete l.c[k];if(l&&Array.isArray(l.order))l.order=l.order.filter(i=>i!==k);});
  applyBanks();return true;
}
function cardsAjHtml(){
  const full=CARDS.length>=CARDMAX,X=cfg.tarjetasX||[],off=full?' disabled':'';
  return `<div class="ms" style="margin:14px 0 6px">Puedes tener hasta ${CARDMAX} tarjetas de crédito. La nueva aparece en todos tus meses con deuda cero.</div><div class="qa"><input type="text" id="nm-newc" maxlength="28" placeholder="Nueva tarjeta, por ejemplo Ripley" aria-label="Nombre de la nueva tarjeta" autocomplete="off"${off}><button class="b" id="nm-addc" type="button"${off}>Agregar tarjeta</button></div>${X.length?`<div class="qa">${X.map(x=>`<button class="b gh" type="button" data-cardrm="${x.k}">Quitar tarjeta: ${esc(BANKN[x.k])}</button>`).join('')}</div>`:''}`;
}
applyBanks();
function applyNames(liq,cards){
  const cl=(v,fb)=>{v=String(v||'').trim().replace(/\s+/g,' ').slice(0,28);return v||fb;};
  const old=liqNamesAll();
  const nl=old.map((o,j)=>j<liq.length?cl(liq[j],o):o);
  const nb={};CARD_BASE.forEach((k,i)=>{nb[k]=cl(String(cards[i]||'').replace(/[<>"'`]/g,''),BANKN[k]);});
  (cfg.tarjetasX||[]).forEach(x=>{const j=CARDS.indexOf(x.k);x.n=cl(String(cards[j]||'').replace(/[<>"'`]/g,''),x.n);});
  cfg.liqNames=nl;cfg.bancos=nb;
  Object.keys(S).forEach(y=>S[y].forEach(m=>{const l=m.liq||[];nl.forEach((n,j)=>{if(l[j])l[j].c=n;});}));
  applyBanks();
}
/* Alta inicial guiada: una decisión por pantalla (cuentas → saldos de hoy → tarjetas → un gasto fijo → listo).
   Lo que se escribe se guarda al terminar o al «Terminar aquí»; «Omitir por ahora» deja todo como estaba. Se puede volver a abrir desde el Resumen. */
function showOnboard(force){
  if(document.getElementById('onbg'))return;
  const mm=()=>S[String(now.getFullYear())][now.getMonth()];
  const st={liq:LIQN().slice(),bal:mm().liq.slice(0,4).map(r=>force&&+r.m?String(+r.m):''),
    cards:['bbva','bcp','oh'].map(k=>({n:(force&&cfg.bancos&&cfg.bancos[k])?cfg.bancos[k]:'',l:force&&+((cfg.credito||{})[k])?String(+cfg.credito[k]):'',d:force&&+((mm().copen||{})[k])?String(+mm().copen[k]):'',cd:force&&+((cfg.corteDia||{})[k])?String(+cfg.corteDia[k]):'',pd:force&&+((cfg.pagoDia||{})[k])?String(+cfg.pagoDia[k]):''})),fijos:[]};
  if(!force)st.liq=DEFLIQ.slice();
  let paso=0;const N=5;
  const bg=document.createElement('div');bg.id='onbg';bg.className='authbg';bg.setAttribute('role','region');bg.setAttribute('aria-label','MiSoles');document.body.appendChild(bg);
  const g=id=>document.getElementById(id),v=id=>{const e=g(id);return e?e.value:'';};
  const nombres=()=>st.liq.map((n,j)=>(n||'').trim()||DEFLIQ[j]);
  const leer=()=>{
    if(paso===0)st.liq=[0,1,2,3].map(j=>v('ob-l'+j).trim());
    else if(paso===1)st.bal=[0,1,2,3].map(j=>v('ob-s'+j).trim());
    else if(paso===2)st.cards=st.cards.map((c,j)=>({n:v('ob-b'+j).trim(),l:v('ob-c'+j).trim(),d:v('ob-d'+j).trim(),cd:v('ob-k'+j).trim(),pd:v('ob-p'+j).trim()}));
  };
  const err=m=>{const e=g('ob-err');if(e){e.textContent=m;e.hidden=!m;}};
  const aplicar=()=>{
    applyNames(nombres(),st.cards.map((c,j)=>c.n||('Tarjeta '+(j+1))));
    const m=mm();
    st.bal.forEach((b,j)=>{const x=parseMonto(b);if(b&&Number.isFinite(x)&&m.liq[j]){m.liq[j].m=Math.round(x*100)/100;m.lb={x:1};}});
    ['bbva','bcp','oh'].forEach((k,j)=>{const c=st.cards[j],l=parseMonto(c.l),d=parseMonto(c.d);
      if(c.l&&Number.isFinite(l)&&l>=0){cfg.credito=Object.assign({bbva:0,bcp:0,oh:0},cfg.credito);cfg.credito[k]=l;}
      if(c.d&&Number.isFinite(d)&&d>0){if(!m.copen)m.copen={};m.copen[k]=d;}
      const kd=Math.round(parseFloat(c.cd)),pd=Math.round(parseFloat(c.pd));
      if(c.cd&&kd>=1&&kd<=31){cfg.corteDia=Object.assign({},cfg.corteDia);cfg.corteDia[k]=kd;}
      if(c.pd&&pd>=1&&pd<=31){cfg.pagoDia=Object.assign({},cfg.pagoDia);cfg.pagoDia[k]=pd;}});
    st.fijos.forEach(f=>{cfg.rec=cfg.rec||[];if(!cfg.rec.some(r=>(r.c||'').trim().toLowerCase()===f.c.toLowerCase()))cfg.rec.push({sec:'fij',s:'fij',c:f.c,m:f.m,k:'',src:f.src,f:f.f});});
    cfg.onb=1;save();
  };
  const terminar=(ir)=>{try{aplicar();}catch(e){}bg.remove();render();if(ir)location.hash='#'+SLUG[now.getMonth()];setTimeout(ofrecerInstalar,1500);};
  const STEPS=['Tus cuentas','Saldos de hoy','Tarjetas','Un gasto fijo','Listo'];
  const side=()=>'<aside class="authside obside" aria-hidden="true"><b class="wm"><i>S/</i><span>Mi<span class="sw">S<sup class="sq">2</sup></span>oles</span></b><h2><span class="l1">Armemos</span> <span class="l2">tu app</span> <span class="l3">a tu medida.</span></h2><ol class="obsteps">'+STEPS.map((s,i)=>'<li'+(i===paso?' class="on"':(i<paso?' class="done"':''))+'><i>'+(i<paso?'✓':(i+1))+'</i><span>'+s+'</span></li>').join('')+'</ol></aside>';
  const hd=(q,sub)=>'<div class="authlogo" aria-hidden="true">S/</div><div class="ms ob-st">Paso '+(paso+1)+' de '+N+'</div><h2 id="ob-q">'+q+'</h2>'+(sub?'<p class="ms">'+sub+'</p>':'');
  const pie=(sig,atras)=>'<div class="sdest err" id="ob-err" role="alert" hidden></div><button class="b p" type="submit" id="ob-go">'+sig+'</button>'+(atras?'<button class="lnk" type="button" id="ob-back">← Atrás</button>':'')+'<button class="lnk" type="button" id="ob-skip">'+(paso===0?'Omitir por ahora':'Terminar aquí')+'</button><button class="lnk" type="button" data-lang-toggle data-notr>'+langTxt(0)+'</button>';
  const dibujar=()=>{
    let h='';
    if(paso===0){
      h=hd('¿Dónde tienes tu dinero hoy?','Escribe cómo se llama cada cuenta. Si no usas alguna, déjala como está. Puedes cambiarlo cuando quieras en Personalizar.')
       +'<div class="nmg">'+DEFLIQ.map((n,j)=>'<label class="fld">Cuenta '+(j+1)+'<input type="text" id="ob-l'+j+'" value="'+esc(st.liq[j]||'')+'" placeholder="Ej. '+esc(n)+'" maxlength="28" autocomplete="off"></label>').join('')+'</div><div class="ms" style="margin-top:8px">¿Tienes más cuentas? Podrás agregarlas después en Ajustes.</div>'+pie('Siguiente',false);
    }else if(paso===1){
      h=hd('¿Cuánto hay hoy en cada una?','Mira el saldo real en tu app o tu billetera. Lo que dejes vacío queda en cero.')
       +'<div class="nmg">'+nombres().map((n,j)=>'<label class="fld">'+esc(n)+'<input type="text" inputmode="decimal" id="ob-s'+j+'" value="'+esc(st.bal[j]||'')+'" placeholder="0.00" autocomplete="off"></label>').join('')+'</div>'+pie('Siguiente',true);
    }else if(paso===2){
      h=hd('¿Usas tarjetas de crédito?','Opcional. Con el nombre, tu línea de crédito y lo que debes hoy, la app te dice cuánto te queda disponible. Si no usas, pasa al siguiente.')
       +st.cards.map((c,j)=>'<div class="ob-row"><label class="fld">Tarjeta '+(j+1)+'<input type="text" id="ob-b'+j+'" value="'+esc(c.n)+'" placeholder="'+['Ej. Interbank','Ej. Falabella','Otra tarjeta'][j]+'" maxlength="28" autocomplete="off"></label><div class="ob-two"><label class="fld">Línea de crédito<input type="text" inputmode="decimal" id="ob-c'+j+'" value="'+esc(c.l)+'" placeholder="0.00" autocomplete="off"></label><label class="fld">Debes hoy<input type="text" inputmode="decimal" id="ob-d'+j+'" value="'+esc(c.d)+'" placeholder="0.00" autocomplete="off"></label><label class="fld">Día de corte<input type="text" inputmode="numeric" id="ob-k'+j+'" value="'+esc(c.cd)+'" placeholder="Ej. 15" maxlength="2" autocomplete="off"></label><label class="fld">Día de pago<input type="text" inputmode="numeric" id="ob-p'+j+'" value="'+esc(c.pd)+'" placeholder="Ej. 5" maxlength="2" autocomplete="off"></label></div></div>').join('')+pie('Siguiente',true);
    }else if(paso===3){
      h=hd('¿Tienes un gasto fijo cada mes?','Por ejemplo alquiler, internet o el colegio. Queda como recurrente y aparece en «Por pagar este mes» para marcarlo con un toque.')
       +(st.fijos.length?'<div class="chips">'+st.fijos.map(f=>'<span class="chip">'+esc(f.c)+' · '+num2(f.m)+' · día '+f.f+'</span>').join('')+'</div>':'')
       +'<div class="ob-row"><label class="fld">Concepto<input type="text" id="ob-fc" placeholder="Ej. Alquiler" maxlength="40" autocomplete="off"></label><div class="ob-two"><label class="fld">Monto<input type="text" inputmode="decimal" id="ob-fm" placeholder="0.00" autocomplete="off"></label><label class="fld">Día del mes<input type="number" id="ob-fd" min="1" max="31" value="1" inputmode="numeric"></label></div><label class="fld">Sale de<select id="ob-fs" class="f">'+nombres().map((n,j)=>'<option value="liq:'+j+'">'+esc(n)+'</option>').join('')+'<option value="none">No descontar</option></select></label></div>'
       +'<button class="b" type="button" id="ob-more">Agregar otro</button>'+pie('Siguiente',true);
    }else{
      const tot=st.bal.reduce((a,b)=>{const x=parseMonto(b);return a+(Number.isFinite(x)?x:0);},0),nt=st.cards.filter(c=>c.n).length;
      h=hd('¡Listo!','Así quedó tu punto de partida. Desde ahora cada gasto que registres se descuenta de la cuenta que elijas.')
       +'<ul class="welcome-ul ms"><li><b>'+esc('S/ '+num2(tot))+'</b> en tus cuentas</li><li><b>'+nt+'</b> '+(nt===1?'tarjeta':'tarjetas')+'</li><li><b>'+st.fijos.length+'</b> '+(st.fijos.length===1?'gasto fijo por pagar':'gastos fijos por pagar')+'</li></ul>'
       +'<button class="b p" type="submit" id="ob-go">Ir a mi mes</button><button class="lnk" type="button" id="ob-back">← Atrás</button><button class="lnk" type="button" data-lang-toggle data-notr>'+langTxt(0)+'</button>';
    }
    bg.classList.add('split');
    bg.innerHTML=side()+'<form class="authbox onbox" id="onbox" role="dialog" aria-modal="true" aria-labelledby="ob-q" novalidate>'+h+'</form>';
    const f=bg.querySelector('input,select');if(f)f.focus();
  };
  const agregarFijo=()=>{
    const c=v('ob-fc').trim();if(!c&&!v('ob-fm').trim())return true;
    const m=parseMonto(v('ob-fm'));if(!c){err('Escribe el concepto del gasto.');g('ob-fc').focus();return false;}
    if(!(m>0)){err('Escribe el monto, por ejemplo 350.');g('ob-fm').focus();return false;}
    st.fijos.push({c,m,f:Math.max(1,Math.min(31,Math.round(+v('ob-fd'))||1)),src:v('ob-fs')||'none'});return true;
  };
  bg.addEventListener('submit',e=>{e.preventDefault();
    if(paso===4){terminar(true);return;}
    if(paso===1){const mal=[0,1,2,3].find(j=>{const s=v('ob-s'+j).trim();return s&&!Number.isFinite(parseMonto(s));});if(mal!==undefined){err('No entiendo ese monto. Escríbelo así: 1,200.50 o 25.');g('ob-s'+mal).focus();return;}}
    if(paso===2){const dm=st.cards.map((c,j)=>[v('ob-k'+j).trim(),v('ob-p'+j).trim(),j]).find(x=>[x[0],x[1]].some(s=>s&&!(Math.round(parseFloat(s))>=1&&Math.round(parseFloat(s))<=31)));if(dm){err('El día de corte y de pago van del 1 al 31.');g('ob-'+(dm[0]&&!(Math.round(parseFloat(dm[0]))>=1&&Math.round(parseFloat(dm[0]))<=31)?'k':'p')+dm[2]).focus();return;}}
    if(paso===2){const mal=st.cards.map((c,j)=>[v('ob-c'+j).trim(),v('ob-d'+j).trim(),j]).find(x=>(x[0]&&!Number.isFinite(parseMonto(x[0])))||(x[1]&&!Number.isFinite(parseMonto(x[1]))));if(mal){err('No entiendo ese monto. Escríbelo así: 1,200.50 o 25.');g('ob-'+(mal[0]&&!Number.isFinite(parseMonto(mal[0]))?'c':'d')+mal[2]).focus();return;}}
    if(paso===3){if(!agregarFijo())return;}else leer();
    paso++;dibujar();});
  bg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.id==='ob-skip'){if(paso<=2)leer();terminar(false);}
    else if(b.id==='ob-back'){if(paso<=2)leer();paso=Math.max(0,paso-1);dibujar();}
    else if(b.id==='ob-more'){if(agregarFijo()){paso=3;dibujar();}}});
  dibujar();
}

let mcp=null,backend=null;const IS_GAS=(typeof google!=='undefined')&&!!(google.script&&google.script.run);
/* Producción es SOLO la web oficial. Cualquier otra copia (tu computadora, previsualizaciones de Cloudflare) usa el proyecto de PRUEBAS, sin datos reales.
   Si cambias de dominio oficial, añádelo aquí y en inicio/index.html, o esa web se conectará a pruebas. */
const ES_PROD=/^(zzorgh\.github\.io|(www\.)?misoles\.pe)$/.test(location.hostname);
const SB_URL=ES_PROD?'https://lmjhlghwthydpeismulb.supabase.co':'https://qfnqqhwfzzmheztcarbo.supabase.co',SB_KEY=ES_PROD?'sb_publishable_Chi2CqOxqdL_15IggSgUZA_09aZ4XEf':'sb_publishable_3rPtVgvz3OT3P77J1BXZWg_pqZ98siA';
