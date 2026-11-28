/* ---------- Resumen del año ---------- */
function metaProg(name){let s=0;YEARS.forEach(y=>(S[y]||[]).forEach(m=>(m.aho||[]).forEach(r=>{if((r.k||'')===name&&ahoKind(r)!=='tr')s+=(+r.m||0)*ahoTc(rowCur('aho',r),m);})));return Math.round(s*100)/100;}
function insights(){
  const out=[],ms=S[year].map(dv),cur=(year===String(now.getFullYear()))?now.getMonth():-1;
  const wi=ms.filter(x=>x.ing>0);
  if(wi.length){const r2=wi.reduce((a,x)=>a+x.aho/x.ing,0)/wi.length;out.push('Tu tasa de ahorro promedio este año es '+pct(r2)+'.');}
  if(cur>0&&ms[cur].on){const a=ms[cur].hor,b=ms[cur-1].hor;if(b>0){const d=Math.round((a-b)/b*100);out.push('En gastos cotidianos vas '+(d>=0?'+'+d:d)+'% frente a '+MES[cur-1]+'.');}}
  let bi=-1,bp=0;ms.forEach((x,i)=>{if(x.ing>0&&x.aho/x.ing>bp){bp=x.aho/x.ing;bi=i;}});
  if(bi>=0)out.push('Tu mejor mes de ahorro fue '+MES[bi]+' ('+pct(bp)+').');
  if(cur>=0){const m=S[year][cur],cat={};['fij','hor'].forEach(sec=>(m[sec]||[]).forEach(r=>{if(+r.m&&!r.card&&(r.c||'').trim()){const n=concNom(r);cat[n]=(cat[n]||0)+(+r.m);}}));const top=Object.keys(cat).sort((x,y)=>cat[y]-cat[x])[0];if(top)out.push('En '+MES[cur].toLowerCase()+', tu mayor gasto es '+esc(top)+' ('+fmt(cat[top])+').');}
  const r7=recentCount(7);if(r7)out.push('Registraste '+r7+(r7===1?' movimiento':' movimientos')+' en los últimos 7 días.');
  return out.slice(0,4);
}
function recentCount(days){if(!passOn)return recentCount0(days);let v=passRC.get(days);if(v===undefined){v=recentCount0(days);passRC.set(days,v);}return v;}
function recentCount0(days){
  const today=limaD();today.setHours(23,59,59,999);
  const cut=limaD();cut.setHours(0,0,0,0);cut.setDate(cut.getDate()-days+1);
  let n=0;
  YEARS.forEach(y=>S[y].forEach((m,mi)=>['ing','fij','hor','aho','inv'].concat(CARDS).forEach(sec=>(m[sec]||[]).forEach(r=>{
    if(!(+r.m))return;const dd=parseInt(r.f)||0;if(!dd)return;const dt=new Date(+y,mi,dd);if(dt>=cut&&dt<=today)n++;}))));
  return n;
}
function viewResumen(){
  const ms=S[year],D=ms.map(dv),any=D.some(x=>x.on),nOn=D.filter(x=>x.on).length;
  const gas=D.reduce((a,x)=>a+x.gas,0),aho=D.reduce((a,x)=>a+x.aho,0),inv=D.reduce((a,x)=>a+x.inv,0);
  let bi=-1,bp=0;D.forEach((x,i)=>{if(x.ing>0&&x.aho/x.ing>bp){bp=x.aho/x.ing;bi=i;}});
  const fm=D.filter(x=>x.fij>0),avg=fm.length?fm.reduce((a,x)=>a+x.fij,0)/fm.length:0;
  const saldo=ahoNow(year),meta=cfg.meses*avg,prog=meta>0?Math.max(0,saldo)/meta:0;
  const kp=(l,v,s)=>`<div class="kpi"><div class="kl">${l}</div><div class="kv">${v}</div><div class="ks">${s}</div></div>`;
  const emp=t=>`<div class="empty">${t}</div>`;
  const nodata='Todavía no hay datos en '+year+'. Abre un mes y registra el primer movimiento.';
  const chartCard=(t,cap,id,extra,small)=>`<section class="card bcard" data-cid="${id}"><div class="cb"><h2 class="ttl">${t}</h2><div class="cap">${cap}</div>${any?`<div class="cw${small?' s':''}"><canvas id="${id}" role="img" aria-label="${t}"></canvas></div>${extra||''}`:emp(nodata)}</div></section>`;
  const lg=(arr)=>`<div class="lg">${arr.map(a=>`<span><i style="background:${a[1]}"></i>${a[0]}</span>`).join('')}</div>`;
  const today=(year===String(now.getFullYear()))?now.getMonth():-1;
  const cards=D.map((x,i)=>{
    const ing=x.ing,w=v=>ing>0?Math.max(0,Math.min(100,v/ing*100)):0;
    let st='';
    if(i===today)st='<span class="pill acc">Mes actual</span>';
    else if(x.hor>cfg.alerta)st='<span class="pill bad">Cotidiano alto</span>';
    else if(x.on&&ing>0&&x.aho/ing>=cfg.meta/100)st='<span class="pill ok">Meta de ahorro</span>';
    else if(!x.on)st='<span class="pill">Sin datos</span>';
    return `<a class="mcard${x.on?'':' off'}" href="#${SLUG[i]}"><div class="mh"><b>${MES[i]}</b>${st}</div><div class="mvk">Ingreso</div><div class="mv">${fmt(ing)}</div>
    <div class="pbar" aria-hidden="true"><span style="width:${w(x.fij)}%;background:var(--c-fij)"></span><span style="width:${w(x.hor)}%;background:var(--c-hor)"></span><span style="width:${w(x.aho)}%;background:var(--c-aho)"></span><span style="width:${w(x.inv)}%;background:var(--c-inv)"></span></div>
    <div class="ms">${ing>0?'Ahorro '+pct(x.aho/ing)+' · Gastado '+fmt(x.gas):'Sin movimientos'}</div></a>`;}).join('');
  const vacio=YEARS.every(y=>S[y].every(m=>!dv(m).on));
  return `${vacio?`<section class="welcome card"><h2>Bienvenido a MiS²oles</h2><p class="ms">Aún no hay datos. Registra tu primer movimiento y verás aparecer tus gráficos, metas y el resumen del año.</p><ul class="welcome-ul ms"><li>Toca <b>Registrar</b> (o el <b>+</b> en el celular) para anotar un ingreso o un gasto.</li><li>Elige de dónde sale cada gasto y se descuenta solo de esa cuenta.</li><li>Ponle la línea de crédito a tus tarjetas para ver cuánto te queda.</li></ul><button type="button" class="b p" data-act="new">Registrar mi primer movimiento</button> <button type="button" class="b" data-act="alta">Configurar mis cuentas y tarjetas</button></section>`:''}
  <section class="hero">
    <div class="hero-top"><div><div class="hero-k">${year}</div><h1>Resumen</h1></div></div>
    <div><div class="hero-l">Tienes ahorrado</div><div class="hero-v">${fmt(saldo)}</div></div>
    <div class="hbar hfondo" aria-hidden="true"><span style="width:${Math.min(100,prog*100)}%;background:var(--c-aho)"></span></div>
    <div class="hleg hfondo"><span>Fondo de emergencia: ${Math.round(prog*100)}% de ${fmt(meta)}</span></div>
    <div class="hint">${any?nOn+(nOn===1?' mes':' meses')+' con datos'+(recentCount(7)?' · '+recentCount(7)+(recentCount(7)===1?' movimiento':' movimientos')+' en los últimos 7 días':'')+'. Toca una barra o una tarjeta para abrir el mes.':'Año sin movimientos todavía.'}</div>
    ${any?'<div class="acts"><button type="button" data-act="rep">Descargar reporte (PDF o Excel)</button></div>':''}
  </section>
  <div class="board" id="board">
  <section class="card bcard" data-cid="rf"><div class="cb"><h2 class="ttl">Fondo de emergencia</h2>
    ${meta>0?`<div class="fond"><b>${Math.round(prog*100)}%</b><span class="ms">${fmt(saldo)} ahorrados de una meta de ${fmt(meta)} (${cfg.meses} meses de gastos fijos)</span></div><div class="meter" role="img" aria-label="Avance del fondo de emergencia"><div style="width:${Math.min(100,prog*100)}%"></div></div><div class="ms" style="margin-top:8px">${fondoPlan(meta,saldo)}</div>${prog<1?`<label class="fld" style="margin-top:10px;max-width:220px">Fecha para llegar a la meta<input type="month" data-cfgt="fondoMes" value="${esc(cfg.fondoMes||'')}"></label>`:''}`:emp('Carga tus gastos fijos para calcular la meta del fondo.')}
  </div></section>
  <div class="kpis bcard bare" data-cid="rk">${kp('Gastado en el año',fmt(gas),'Fijos más cotidianos')}${kp('Ahorro neto del año',(aho>0?'+':'')+fmt(aho),aho<0?'Sacaste más de lo que guardaste':'Lo que creció tu ahorro')}${kp('Invertido',fmt(inv),'Suma de los meses')}${kp('Mejor mes de ahorro',bi>=0?MES[bi]:'Sin datos',bi>=0?pct(bp)+' del ingreso':'')}</div>
  ${(cfg.metas&&cfg.metas.length)?`<section class="card bcard" data-cid="mg"><div class="cb"><h2 class="ttl">Metas de ahorro</h2><div class="cap">Progreso de cada meta, según los ahorros que le asignaste.</div>${cfg.metas.map(gm=>{const pr=metaProg(gm.n),ob=+gm.o||0,pc=ob>0?Math.min(100,pr/ob*100):0;return `<div class="metarow"><div class="l"><b>${esc(gm.n)}</b><span class="ms">${fmt(pr)}${ob>0?' de '+fmt(ob):''}</span></div><div class="meter"><div style="width:${pc}%;background:var(--c-aho)"></div></div><div class="ms">${ob>0?(pr>=ob?'¡Meta cumplida!':'Faltan '+fmt(ob-pr)+' ('+Math.round(pc)+'%)'):'Sin objetivo fijado'}</div></div>`;}).join('')}</div></section>`:''}
  <div class="g2">
    ${chartCard('Ingreso, gastado y ahorrado','Ingreso, gasto y ahorro de cada mes. El saldo que sobra de un mes no se suma al siguiente.','r1',lg([['Ingreso','var(--c-ing)'],['Gastado','var(--c-gas)'],['Ahorrado','var(--c-aho)']]))}
    ${chartCard('Ahorro sobre el ingreso','La línea gris es tu meta de '+cfg.meta+'%.'+(year===String(now.getFullYear())?' El último tramo punteado es el mes en curso.':''),'r2')}
  </div>
  <div class="g2">
    ${chartCard('Gastos cotidianos por mes','En rojo, los meses que pasan de '+fmt(cfg.alerta)+'.','r3','',true)}
    ${chartCard('En qué se fue el año','Distribución de lo gastado, ahorrado e invertido.','r4',lg([['Gastos fijos','var(--c-fij)'],['Gastos cotidianos','var(--c-hor)'],['Ahorros','var(--c-aho)'],['Inversión','var(--c-inv)']]),true)}
  ${(()=>{const ins=insights();return ins.length?`<section class="card bcard" data-cid="ins"><div class="cb"><h2 class="ttl">En resumen</h2><ul class="inslist">${ins.map(t=>`<li>${t}</li>`).join('')}</ul></div></section>`:'';})()}
  </div>
  <section class="card bcard" data-cid="dga"><div class="cb"><h2 class="ttl">¿Dónde gastaste más en ${year}?</h2><div class="cap">Todo lo que salió en el año, repartido en tus tres grupos y por concepto.</div>${any?dgInner(ms):emp(nodata)}</div></section>
  ${chartCard('A dónde fue tu ingreso','Cómo se repartió el ingreso del año: gastos, inversión, ahorro y lo que quedó disponible.','r6')}
  ${chartCard('Capital acumulado','Tu saldo de ahorros más lo invertido en el año, mes a mes.'+(year===String(now.getFullYear())?' El tramo punteado es el mes en curso.':''),'r7')}
  ${chartCard('Año contra año','Lo ahorrado en cada mes, un año contra otro.','r5','',true)}
  <section class="bcard bare" data-cid="rm"><h2 class="ttl" style="margin:0 0 10px">Meses de ${year}</h2><div class="mgrid">${cards}</div></section>
  <section class="card bcard" data-cid="ra"><div class="cb aj-link"><div><h2 class="ttl">Ajustes</h2><div class="cap">Estilo, cuentas y tarjetas, metas, reportes y copias de tus datos.</div></div><button type="button" class="b" data-goto="ajustes">Abrir ajustes</button></div></section>
  </div>`;
}
/* Ajustes: pantalla propia, fuera del Resumen. */
function viewAjustes(){
  const tarjetas=`
  <section class="card ajc w4"><div class="cb"><div class="gs"><h3 role="heading" aria-level="2">Apariencia</h3>
    <div class="skins" role="group" aria-label="Estilo de la app"><span class="sk-l">Estilo de la app</span>${[['original','Original'],['cuadre','Cuadre'],['escalon','Escalón']].map(a=>`<button type="button" class="b" data-skin-set="${a[0]}" aria-pressed="${document.documentElement.dataset.skin===a[0]}">${a[1]}</button>`).join('')}</div>
    <div class="skins" role="group" aria-label="Tema de color"><span class="sk-l">Tema de color</span>${(()=>{const t=document.documentElement.dataset.theme||'sys';return [['light','Claro'],['dark','Oscuro'],['sys','Del sistema']].map(a=>`<button type="button" class="b" data-tema-set="${a[0]}" aria-pressed="${t===a[0]}">${a[1]}</button>`).join('');})()}</div>
    <p class="ms">El estilo cambia la forma de la app; el tema, sus colores. También puedes cambiar el tema con el botón «Tema» de arriba.</p>
    </div></div></section>
  <section class="card ajc w4"><div class="cb"><div class="gs"><h3 role="heading" aria-level="2">Alertas y fondo de emergencia</h3>
    <div class="cfg">
      <label for="cf-alerta">Alerta de gastos cotidianos (S/)<input id="cf-alerta" type="number" step="10" data-cfg="alerta" value="${cfg.alerta}"></label>
      <label for="cf-meta">Meta de ahorro (% del ingreso)<input id="cf-meta" type="number" step="1" data-cfg="meta" value="${cfg.meta}"></label>
      <label for="cf-meses">Meses de gastos fijos en el fondo<input id="cf-meses" type="number" step="1" data-cfg="meses" value="${cfg.meses}"></label>
    </div>
    ${recHtml()}
    </div></div></section>
  <section class="card ajc w4"><div class="cb"><div class="gs"><h3 role="heading" aria-level="2">Al registrar</h3>
    <div class="cfg">
      <div class="cneg" style="grid-column:1/-1"><label class="chk"><input type="checkbox" id="cf-neg"${cfg.bloquearNeg?' checked':''}> No permitir que un gasto deje una cuenta en negativo</label><div class="ms" style="margin-top:4px">Si lo dejas apagado, solo te avisamos cuando no alcance y puedes guardarlo igual.</div></div>
      <div class="cmod" style="grid-column:1/-1"><div class="ms" style="margin-bottom:6px">Al tocar «+»</div><div role="radiogroup" aria-label="Cómo registrar al tocar más" style="display:grid;gap:6px">${[['ask','Pantalla rápida (recomendado)'],['manual','Siempre manual (por pasos)'],['auto','Siempre automático (una frase)']].map(x=>`<label class="chk"><input type="radio" name="modoreg" value="${x[0]}"${(cfg.modoReg||'ask')===x[0]?' checked':''}> ${x[1]}</label>`).join('')}</div></div>
      <div class="cmon" style="grid-column:1/-1"><div class="ms" style="margin-bottom:6px">Monedas al registrar</div><div style="display:flex;gap:18px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="cm-d" data-cmon="$"${(cfg.monedas||[]).indexOf('$')>=0?' checked':''}> Dólares ($)</label><label class="chk"><input type="checkbox" id="cm-e" data-cmon="€"${(cfg.monedas||[]).indexOf('€')>=0?' checked':''}> Euros (€)</label></div><div class="ms" style="margin-top:6px">El botón de moneda del monto rota entre soles y las que marques.</div></div>
      <div class="cmod atk-set" style="grid-column:1/-1"><label class="chk"><input type="checkbox" id="atk"${atajosOn()?' checked':''}> Usar atajos de teclado</label><div class="ms" style="margin-top:6px">Pulsa ? para ver la lista.</div></div>
      <div class="ms" style="grid-column:1/-1">En Android, con la app instalada, comparte el texto de un SMS o aviso de tu banco a MiS²oles y lo dejamos listo para que lo revises.</div>
    </div>
    </div></div></section>
  <section class="card ajc w6"><div class="cb"><div class="gs"><h3 role="heading" aria-level="2">Tipo de cambio</h3>
    <div class="cfg">
      <label for="tc-e">Respaldo: 1 € en S/<input id="tc-e" type="number" step="0.01" data-tc="€" value="${(cfg.tc||{})['€']}"></label>
      <label for="tc-d">Respaldo: 1 $ en S/<input id="tc-d" type="number" step="0.01" data-tc="$" value="${(cfg.tc||{})['$']}"></label>
    </div>
    <div class="ms tc-date" id="fx-msg" role="status">${cfg.tcLast?'Última consulta: 1 $ = S/ '+tc3(cfg.tcLast.usd)+(cfg.tcLast.eur?' · 1 € = S/ '+tc3(cfg.tcLast.eur):'')+' ('+esc(cfg.tcLast.s)+(cfg.tcLast.f?', '+fmtISO(cfg.tcLast.f):'')+').':'Todavía no se consultó el tipo de cambio.'}</div>
    <label class="chk"><input type="checkbox" id="fx-auto" data-fx="auto"${cfg.tcAuto!==false?' checked':''}> Guardar cada día la tasa SUNAT en el mes actual (al abrir la app)</label>
    <div class="qa"><button class="b" id="fx-now" type="button">Consultar ahora</button></div>
    <div class="ms" style="margin-bottom:12px">Cada mes guarda su propia tasa y los meses anteriores no cambian. Los valores de respaldo de arriba se usan solo en meses sin tasa propia. SUNAT publica solo el dólar (usamos el precio de venta); el euro sale del mercado y es referencial. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a></div>
    </div></div></section>
  <section class="card ajc w6"><div class="cb"><div class="gs"><h3 role="heading" aria-level="2">Cuentas y tarjetas</h3>
    <div class="ms" style="margin-bottom:8px">Pon los nombres que usas tú. Cambiarlos no borra tus datos.</div>
    <div class="nmg">${liqNamesAll().map((n,j)=>`<label class="fld">Cuenta ${j+1}<input type="text" id="nm-l${j}" value="${esc(n)}" maxlength="28" autocomplete="off"></label>`).join('')}${CARDS.map((k,j)=>`<label class="fld">Tarjeta ${j+1}<input type="text" id="nm-b${j}" value="${esc(BANKN[k])}" maxlength="28" autocomplete="off"></label>`).join('')}</div>
    <div class="qa"><button class="b" id="nm-save" type="button">Guardar nombres</button></div>
    <div class="ms" style="margin:14px 0 6px">Puedes tener hasta ${LIQMAX} cuentas de dinero (Yape, Plin, efectivo, un banco…). La nueva aparece en todos tus meses con saldo cero.</div>
    <div class="qa"><input type="text" id="nm-newl" maxlength="28" placeholder="Nueva cuenta, por ejemplo Interbank" aria-label="Nombre de la nueva cuenta" autocomplete="off"${liqNamesAll().length>=LIQMAX?' disabled':''}><button class="b" id="nm-addl" type="button"${liqNamesAll().length>=LIQMAX?' disabled':''}>Agregar cuenta</button></div>
    ${cardsAjHtml()}
    </div></div></section>
  <section class="card ajc w5"><div class="cb"><div class="gs"><h3 role="heading" aria-level="2">Ahorros y metas</h3>
    <div class="ms">Ahorros</div>
    <div class="ms" style="margin-bottom:12px">Tu saldo se calcula solo: cada depósito suma y cada retiro resta, cuenta por cuenta. Si lo que ves no coincide con tu banco, usa «Ajustar saldo» en la tarjeta Ahorros y escribe el saldo real.</div>
    <div class="ms" style="margin-top:14px">Metas de ahorro</div>
    <div class="chips">${(cfg.metas||[]).map((gm,i)=>`<span class="chip">${esc(gm.n)}${+gm.o?' · '+num2(gm.o):''}<button type="button" data-metadel="${i}" aria-label="Quitar ${esc(gm.n)}">×</button></span>`).join('')||'<span class="ms">Sin metas aún. Crea una y asígnale ahorros al registrar.</span>'}</div>
    <div class="qa"><input type="text" id="mn" placeholder="Nombre, p. ej. Fondo de emergencia" aria-label="Nombre de la meta"><input type="number" id="mobj" placeholder="Objetivo S/" aria-label="Objetivo de la meta" style="width:130px"><button class="b" id="addmeta" type="button">Guardar meta</button></div>
    ${(()=>{const a=avgGasto();return a>0?`<div class="ms" style="margin-top:6px">Tus gastos promedian S/ ${num2(a)} al mes (últimos meses completos). Un fondo de emergencia suele cubrir de 3 a 6 meses.</div><div class="qa"><button class="b" type="button" data-metasug="1">1 mes · S/ ${num2(Math.round(a))}</button><button class="b" type="button" data-metasug="3">3 meses · S/ ${num2(Math.round(a*3))}</button><button class="b" type="button" data-metasug="6">6 meses · S/ ${num2(Math.round(a*6))}</button></div>`:'';})()}
    </div></div></section>
  <section class="card ajc w5"><div class="cb">    <div class="gs"><h3 role="heading" aria-level="2">Gastos recurrentes</h3>
      <div class="ms">Se cargan con «Cargar recurrentes» dentro de cada mes y no se duplican si ya existen.</div>
      <div class="chips">${(cfg.rec||[]).map((r,i)=>`<span class="chip">${esc(r.c)} · ${num2(r.m)}${GLAB[catG(r.k)]?' · '+GLAB[catG(r.k)]:''}${r.src&&r.src!=='none'?' · '+esc(liqNamesAll()[+r.src.slice(4)]||''):''} · día ${esc(r.f)}<button type="button" data-recdel="${i}" aria-label="Quitar ${esc(r.c)}">×</button></span>`).join('')||'<span class="ms">Todavía no hay recurrentes.</span>'}</div>
      <div class="qa"><select id="rc-s" aria-label="Tipo"><option value="fij">Gasto fijo</option><option value="hor">Cotidiano</option></select><input id="rc-c" type="text" placeholder="Concepto, por ejemplo Internet" aria-label="Concepto"><input id="rc-m" type="number" step="0.01" placeholder="Monto" aria-label="Monto" style="width:100px"><select id="rc-k" aria-label="Grupo"><option value="">Grupo</option>${GRUPOS3.map(g=>`<option value="${GNOM[g[0]]}">${g[1]}</option>`).join('')}</select><select id="rc-src" aria-label="De dónde sale"><option value="none">No descontar</option>${liqNamesAll().map((n,i)=>`<option value="liq:${i}">${esc(n)}</option>`).join('')}</select><input id="rc-d" type="number" min="1" max="31" value="1" aria-label="Día del mes" style="width:70px"><button class="b" id="rc-add" type="button">Agregar</button></div>
    </div></div></section>
  <section class="card ajc w6"><div class="cb">    ${(TRACK_DEFAULT||(()=>{try{return localStorage.getItem('cuadra-stats')!==null;}catch(e){return false;}})())?`<div class="gs"><h3 role="heading" aria-level="2">Privacidad</h3><label class="chk"><input type="checkbox" id="st-on"${statsOn()?' checked':''}> Ayudar a mejorar MiS²oles con estadísticas de uso anónimas</label><div class="ms">Contamos qué pantallas usas y dónde te trabas. Nunca enviamos montos, conceptos, cuentas ni tu correo. Puedes apagarlo cuando quieras.</div></div>`:''}
    ${SR_OK?'<div class="gs"><h3 role="heading" aria-level="2">Dictado por voz</h3><div class="ms">El micrófono del registro Automático solo se activa cuando tú lo tocas. El audio lo procesa el servicio de voz de tu navegador; MiS²oles solo recibe el texto.</div></div>':''}</div></section>
  <section class="card ajc w6"><div class="cb">    <div class="gs"><h3 role="heading" aria-level="2">Reportes</h3><div class="ms">Un estado de cuenta ordenado, en PDF para enviar o imprimir, o en Excel para revisar las cifras. Lo entiende cualquier persona, empresa o banco.</div><div class="qa"><button class="b p" type="button" data-act="rep">Descargar reporte</button></div></div></div></section>
  <section class="card ajc w7"><div class="cb">    <div class="gs"><h3 role="heading" aria-level="2">Tus datos</h3>
      <div class="ms">Historial automático: cada día se guarda sola una versión de tus datos y se conservan los últimos 30 días. Si algo sale mal, vuelve a una versión anterior con un toque.</div>
      <div class="hist" id="hist"><div class="ms">Cargando versiones…</div></div>
      <div class="bkc"><b>Copia en tu dispositivo</b>
        <div class="ms${bkAge().warn?' bkw':''}" id="bk-age">${bkAge().txt}</div>
        <div class="qa"><button class="b" id="bk-json" type="button">Descargar copia completa</button><button class="b" id="bk-load" type="button">Restaurar desde un archivo</button><input id="bk-file" type="file" accept=".json,application/json" hidden></div>
        <div class="ms" id="bk-msg" role="status"></div>
      </div>
      ${impAjHtml()}
    </div></div></section>
  <section class="card ajc w5"><div class="cb">    ${IS_SB?`<div class="gs"><h3 role="heading" aria-level="2">Tu cuenta</h3>
      <div class="ms">${sbUser?'Conectado como '+esc(sbUser.email||'tu cuenta')+'. ':''}Tus datos se guardan en tu base de datos privada, protegida con tu inicio de sesión. Nadie más puede verlos desde la app.</div>
      <div class="qa"><button class="b" id="sb-logout" type="button">Cerrar sesión</button></div>
      ${sbUser&&sb&&sb.auth.mfa?`<div class="mfast"><b>Verificación en dos pasos: ${mfaFactor?'activada':'desactivada'}</b><div class="ms">${mfaFactor?'Al entrar te pedimos también el código de tu app autenticadora.':'Además de tu contraseña, pide un código de tu celular. Así nadie entra aunque la descubra.'}</div><div class="qa">${mfaFactor?'<button class="b" id="mfa-off" type="button">Desactivar</button>':'<button class="b" id="mfa-on" type="button">Activar</button>'}</div></div>`:''}
      <div class="ms"><a href="legal.html#privacidad" target="_blank" rel="noopener">Política de privacidad</a> · <a href="legal.html#terminos" target="_blank" rel="noopener">Términos de uso</a></div>
      <details class="danger"><summary>Eliminar mi cuenta</summary><p class="ms">Se borran para siempre tus datos y tus versiones guardadas. Antes, descarga tu copia o tus reportes si los necesitas. No se puede deshacer.</p><label class="fld">Escribe ELIMINAR para confirmar<input id="del-txt" type="text" autocomplete="off" autocapitalize="characters"></label><button class="b dng" id="del-go" type="button" disabled>Eliminar para siempre</button><div class="ms err" id="del-msg" role="status"></div></details>
      <label class="chk"><input type="checkbox" id="gs-auto" data-gs="auto"${sync.auto?' checked':''}> Guardar automáticamente</label>
      <div class="qa"><button class="b" id="gs-load" type="button">Recargar mis datos</button><button class="b" id="gs-push" type="button">Guardar todo ahora</button></div>
      <div class="ms" id="gs-msg" role="status">${esc(sync.msg||'')}</div>
      <div class="ms">«Recargar» trae lo guardado en tu cuenta; «Guardar» sube lo que ves aquí. Si no hay señal, tus cambios esperan en este dispositivo y se suben solos después.</div>
    </div>`:`<div class="gs"><h3 role="heading" aria-level="2">Dónde se guardan tus datos</h3>
      <div class="ms">Esta vista es una demostración: lo que registres queda solo en este navegador. En la app publicada tus datos se guardan en tu cuenta privada, protegida con inicio de sesión, y puedes entrar desde cualquier dispositivo.</div>
    </div>`}</div></section>`;
  /* El índice sale de las mismas tarjetas (algunas son condicionales): una entrada por tarjeta, en su orden. */
  const titulos=tarjetas.split('<section class="card ajc').slice(1).map(t=>(t.match(/<h3[^>]*>([^<]+)<\/h3>/)||[])[1]||'');
  return `<div class="ajwrap"><div class="aj-top"><h1>Ajustes</h1><p class="ms">Tu estilo, tus cuentas y tus datos. Lo que cambies aquí se guarda solo.</p></div>
  <nav class="ajnav" aria-label="Secciones de Ajustes">${titulos.map((t,i)=>t?`<button type="button" data-ajir="${i}">${t}</button>`:'').join('')}</nav>
  <div class="board ajboard" id="board">${tarjetas}
  </div></div>`;
}
/* Índice lateral de Ajustes (escritorio). No usa el hash: el hash es la ruta de la app. */
let ajPin=null,ajRaf=0;
function ajMarca(){
  if(view!=='ajustes'){ajPin=null;return;}
  const cs=document.querySelectorAll('.ajc'),bs=document.querySelectorAll('[data-ajir]');if(!bs.length)return;
  let i=ajPin;
  if(i===null){const linea=document.getElementById('hdr').offsetHeight+60;i=0;cs.forEach((c,j)=>{if(c.getBoundingClientRect().top<=linea)i=j;});
    if(scrollY>0&&innerHeight+scrollY>=document.documentElement.scrollHeight-2)i=cs.length-1;}
  bs.forEach(b=>{if(+b.dataset.ajir===i)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ajir]');if(!b)return;
  const c=document.querySelectorAll('.ajc')[+b.dataset.ajir];if(!c)return;ajPin=+b.dataset.ajir;
  c.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  const h=c.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}
  ajMarca();});
/* La elegida se queda marcada (las últimas no llegan arriba) hasta que la persona vuelve a moverse. */
['wheel','touchstart','pointerdown','keydown'].forEach(t=>window.addEventListener(t,()=>{ajPin=null;},{passive:true,capture:true}));
window.addEventListener('scroll',()=>{if(view!=='ajustes')return;cancelAnimationFrame(ajRaf);ajRaf=requestAnimationFrame(ajMarca);},{passive:true});
function drawResumen(){
  const ms=S[year],D=ms.map(dv);if(!D.some(x=>x.on))return;
  const b=base(true),t=k=>D.reduce((a,x)=>a+x[k],0),curI=(year===String(now.getFullYear()))?now.getMonth():-1;
  const live=(ds,c)=>curI<0?ds:Object.assign(ds,{segment:{borderDash:x=>x.p1DataIndex===curI?[5,4]:undefined},pointBackgroundColor:ABR.map((_,j)=>j===curI?cv('--surface'):c),pointBorderColor:c});
  const col=(l,d,c,w)=>({label:l,data:d,backgroundColor:c,borderColor:c,borderRadius:4,maxBarThickness:w||10,tension:.25,pointRadius:3});
  mkChart('r1',{type:ctype('r1','bar'),data:{labels:ABR,datasets:[col('Ingreso',D.map(x=>x.ing),cv('--c-ing')),col('Gastado',D.map(x=>x.gas),cv('--c-gas')),col('Ahorrado',D.map(x=>x.aho),cv('--c-aho'))]},options:{...b,onClick:goMonth,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:tipMoney},scales:axes()}});
  const yrs=YEARS.filter(y=>S[y].some(m=>dv(m).on)),pal=[cv('--c-ing'),cv('--c-aho'),cv('--c-inv'),cv('--c-fij')];
  if(document.getElementById('r5'))mkChart('r5',{type:ctype('r5','line'),data:{labels:ABR,datasets:yrs.map((y,j)=>{const ds={label:y,data:S[y].map(m=>{const d=dv(m);return d.on?d.aho:null;}),borderColor:pal[j%4],backgroundColor:pal[j%4],borderRadius:4,maxBarThickness:10,tension:.25,pointRadius:3,borderWidth:y===year?3:1.8,spanGaps:false};return (y===String(now.getFullYear())&&curI>=0)?live(ds,pal[j%4]):ds;})},options:{...b,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,labels:{color:cv('--muted'),boxWidth:10,font:{size:11}}},tooltip:tipMoney},scales:axes()}});
  const l2=live({...col('Ahorro',D.map((x,j)=>(curI>=0&&j>curI)?null:(x.ing>0?+(x.aho/x.ing*100).toFixed(1):null)),cv('--c-aho'),22),pointRadius:4,spanGaps:false},cv('--c-aho'));
  mkChart('r2',{type:ctype('r2','line'),data:{labels:ABR,datasets:[l2,{type:'line',label:'Meta',data:ABR.map(()=>cfg.meta),borderColor:cv('--muted'),borderDash:[5,4],pointRadius:0,borderWidth:1.5}]},options:{...b,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+c.parsed.y+'%'}}},scales:axes(v=>v+'%')}});
  const t3=ctype('r3','bar'),hc=D.map(x=>x.hor>cfg.alerta?cv('--bad'):cv('--c-hor'));
  mkChart('r3',{type:'bar',data:{labels:ABR,datasets:[{type:t3,label:'Gastos cotidianos',data:D.map(x=>x.hor),backgroundColor:t3==='bar'?hc:cv('--c-hor'),borderColor:cv('--c-hor'),pointBackgroundColor:hc,pointRadius:4,tension:.25,borderRadius:4,maxBarThickness:22},{type:'line',label:'Alerta',data:ABR.map(()=>cfg.alerta),borderColor:cv('--muted'),borderDash:[5,4],pointRadius:0,borderWidth:1.5}]},options:{...b,onClick:goMonth,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:tipMoney},scales:axes()}});
  const t4=ctype('r4','doughnut');
  mkChart('r4',{type:t4,data:{labels:['Gastos fijos','Gastos cotidianos','Ahorros','Inversión'],datasets:[{data:[t('fij'),t('hor'),Math.max(0,t('aho')),t('inv')],backgroundColor:[cv('--c-fij'),cv('--c-hor'),cv('--c-aho'),cv('--c-inv')],borderColor:cv('--surface'),borderWidth:2}]},options:{...b,cutout:t4==='doughnut'?'64%':0,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.label+': '+fmt(c.parsed)}}}}});
  /* Cascada: a dónde fue el ingreso del año (barras flotantes) */
  if(document.getElementById('r6')){
    const steps=[['Ingreso',t('ing'),'--muted'],['Fijos',-t('fij'),'--c-fij'],['Cotidiano',-t('hor'),'--c-hor'],['Inversión',-t('inv'),'--c-inv'],['Ahorro',-t('aho'),'--c-aho']];
    let run=0;const bars=[],cols=[],mags=[];
    steps.forEach(s=>{const start=run;run+=s[1];bars.push([Math.min(start,run),Math.max(start,run)]);cols.push(cv(s[2]));mags.push(s[1]);});
    bars.push([Math.min(0,run),Math.max(0,run)]);cols.push(cv('--accent'));mags.push(run);
    mkChart('r6',{type:'bar',data:{labels:['Ingreso','Fijos','Cotidiano','Inversión','Ahorro','Queda'],datasets:[{data:bars,backgroundColor:cols,borderColor:cols,borderRadius:4,maxBarThickness:46}]},options:{...b,plugins:{legend:{display:false},tooltip:{callbacks:{title:c=>c[0].label,label:c=>{const m=mags[c.dataIndex];return ' '+(m<0?'−':'')+fmt(Math.abs(m));}}}},scales:axes()}});
  }
  /* Capital acumulado: ahorro + inversión acumulados mes a mes */
  if(document.getElementById('r7')){
    let acc=0,started=false;const cap=D.map((x,j)=>{if(x.on)started=true;if(!started||(curI>=0&&j>curI))return null;acc+=x.inv;return Math.round((x.sAho+acc)*100)/100;});
    mkChart('r7',{type:ctype('r7','line'),data:{labels:ABR,datasets:[live({label:'Capital acumulado',data:cap,borderColor:cv('--c-aho'),backgroundColor:cv('--c-aho'),borderWidth:2.5,tension:.25,pointRadius:3,maxBarThickness:22,borderRadius:4,spanGaps:true,fill:false},cv('--c-aho'))]},options:{...b,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:tipMoney},scales:axes()}});
  }
}

