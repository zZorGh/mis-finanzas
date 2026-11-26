/* ---------- Tus datos: historial automático (30 días) y copia descargable ---------- */
const HKEY=KEY+'-hist',HDIAS=30;
const p2=n=>String(n).padStart(2,'0');
const hoyLima=()=>{const d=limaD();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());};
const snapNow=()=>({registro:toRows(true),config:[['cfg',JSON.stringify(cfg)],['layout',JSON.stringify(LAY)]]});
const useSbHist=()=>IS_SB&&sb&&sbUser;
function localHist(){try{const a=JSON.parse(localStorage.getItem(HKEY));return Array.isArray(a)?a:[];}catch(e){return [];}}
function localHistSet(a){a.sort((x,y)=>y.dia.localeCompare(x.dia)||x.tipo.localeCompare(y.tipo));
  for(let n=a.length;n>0;n--){try{localStorage.setItem(HKEY,JSON.stringify(a.slice(0,n)));return;}catch(e){}}}
function localKeep(tipo,s){const d=hoyLima(),lim=new Date(Date.parse(d)-HDIAS*864e5).toISOString().slice(0,10);
  const a=localHist().filter(h=>!(h.dia===d&&h.tipo===tipo)&&h.dia>=lim);a.push({dia:d,tipo,at:new Date().toISOString(),registro:s.registro,config:s.config});localHistSet(a);}
/* En la vista sin cuenta (demo) la copia diaria se guarda en este navegador; con cuenta la hace la base de datos sola. */
let lhT=0;function localDaily(){if(IS_SB)return;clearTimeout(lhT);lhT=setTimeout(()=>{try{localKeep('diaria',snapNow());HC=null;}catch(e){}},1500);}
let HC=null;
const histApi={
  async list(){
    if(useSbHist()){const r=await sb.from('estado_historial').select('id,dia,tipo,filas,created_at').eq('user_id',sbUser.id).order('dia',{ascending:false}).limit(60);if(r.error)throw {message:r.error.message};return r.data||[];}
    return localHist().map(h=>({id:h.dia+'|'+h.tipo,dia:h.dia,tipo:h.tipo,filas:(h.registro||[]).length,created_at:h.at}));},
  async get(id){
    if(useSbHist()){const r=await sb.from('estado_historial').select('registro,config').eq('id',id).maybeSingle();if(r.error||!r.data)throw {message:(r.error&&r.error.message)||'No encontré esa versión.'};return r.data;}
    const h=localHist().find(x=>x.dia+'|'+x.tipo===id);if(!h)throw {message:'No encontré esa versión.'};return h;},
  async keep(tipo,s){
    if(useSbHist()){const r=await sb.from('estado_historial').upsert({user_id:sbUser.id,dia:hoyLima(),tipo,registro:s.registro,config:s.config,filas:s.registro.length,created_at:new Date().toISOString()},{onConflict:'user_id,dia,tipo'});if(r.error)throw {message:r.error.message};return;}
    localKeep(tipo,s);}
};
const DIAS=['dom','lun','mar','mié','jue','vie','sáb'],MESC=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function diaLabel(d){const hoy=hoyLima(),ay=new Date(Date.parse(hoy)-864e5).toISOString().slice(0,10),[y,m,dd]=d.split('-').map(Number),dt=new Date(y,m-1,dd);
  return d===hoy?'Hoy':d===ay?'Ayer':DIAS[dt.getDay()]+' '+dd+' '+MESC[m-1]+(String(y)!==hoy.slice(0,4)?' '+y:'');}
const horaDe=t=>{try{return new Date(t).toLocaleTimeString((LANG==='en'?'en-US':'es-PE'),{hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'});}catch(e){return '';}};
var histOpen=false,histAsk=null,histV=null;
function histHtml(list){
  if(!list.length)return '<div class="ms">Todavía no hay versiones guardadas. La primera se crea con tu próximo cambio.</div>';
  const hoy=hoyLima(),rows=list.slice(0,histOpen?list.length:6).map(v=>{
    const cur=v.dia===hoy&&v.tipo==='diaria',name=v.tipo==='antes_de_restaurar'?'Antes de restaurar · '+diaLabel(v.dia)+' '+horaDe(v.created_at):diaLabel(v.dia)+(cur?' (versión actual)':'');
    const ask=histAsk===String(v.id);
    return `<div class="hv${ask?' ask':''}"><div><b>${esc(name)}</b><div class="ms">${v.filas} movimientos${v.tipo==='diaria'&&!cur?' · cómo quedaron tus datos al final del día':''}</div></div>${cur?'':ask?`<div class="hv-a"><button class="b" type="button" data-hist="no">Cancelar</button><button class="b p" type="button" data-hist="si" data-hid="${esc(String(v.id))}">Sí, volver</button></div>`:`<button class="b" type="button" data-hist="ask" data-hid="${esc(String(v.id))}">Volver a esta versión</button>`}</div>${ask?'<div class="ms hv-n">Lo que tienes ahora se guarda como «Antes de restaurar», por si cambias de opinión.</div>':''}`;}).join('');
  return rows+(list.length>6?`<button class="b ghost" type="button" data-hist="mas">${histOpen?'Ver menos':'Ver las '+list.length+' versiones'}</button>`:'');
}
async function loadHist(force){
  const el=document.getElementById('hist');if(!el)return;
  try{if(!HC||force||Date.now()-HC.t>60000)HC={t:Date.now(),l:await histApi.list()};const e2=document.getElementById('hist');if(e2)e2.innerHTML=histHtml(HC.l);}
  catch(e){const e2=document.getElementById('hist');if(e2)e2.innerHTML='<div class="ms">'+(IS_SB?'No pude cargar tu historial ahora. Revisa tu conexión.':'El historial no está disponible en esta vista.')+'</div>';}
}
async function histRestore(id,btn){
  const v0=HC&&HC.l.find(x=>String(x.id)===String(id)),label=v0?diaLabel(v0.dia).toLowerCase():'esa fecha';
  if(btn){btn.disabled=true;btn.textContent='Restaurando…';}
  try{
    const before={S:JSON.parse(JSON.stringify(S)),cfg:JSON.parse(JSON.stringify(cfg)),LAY:JSON.parse(JSON.stringify(LAY)),years:YEARS.slice()};
    await histApi.keep('antes_de_restaurar',snapNow());
    const v=await histApi.get(id);
    applyRemote(v.registro||[],(v.config||[]).filter(r=>r&&r[0]!=='guardado'));
    histAsk=null;HC=null;
    if(IS_SB&&backend){await pushNow(true);}else{save();}
    render();
    toast('Listo: tus datos volvieron a '+(label==='hoy'||label==='ayer'?label:'la versión del '+label),{fn:()=>{S=before.S;cfg=before.cfg;LAY=before.LAY;YEARS.length=0;before.years.forEach(y=>YEARS.push(y));if(!S[year])year=YEARS[YEARS.length-1];HC=null;}});
  }catch(e){toast('No se pudo restaurar: '+((e&&e.message)||'error'));if(btn){btn.disabled=false;btn.textContent='Sí, volver';}}
}
function bkAge(){const t=+cfg.bkAt||0;if(!t)return {txt:'Cuando quieras, descarga una copia y guárdala en tu Drive o tu correo. Con una al mes es suficiente.',warn:false};
  const d=Math.floor((Date.now()-t)/864e5);return {txt:'Tu última copia fue '+(d<1?'hoy':d===1?'ayer':'hace '+d+' días')+'.'+(d>=45?' Cuando puedas, descarga una nueva.':''),warn:d>=45};}

function initDl(){if(window.claude&&window.claude.use)window.claude.use('downloads').then(d=>{dl=d||null;}).catch(()=>{});}

function viewCapturar(){
  const mi=(year===String(now.getFullYear()))?now.getMonth():0;
  const m=S[year][mi],D=dv(m),rec=[];
  ['ing','fij','hor','aho','inv'].forEach(s=>m[s].forEach((r,i)=>{if(+r.m)rec.push({s,c:r.c,mt:+r.m||0,d:parseInt(r.f)||0,idx:i});}));
  rec.sort((a,b)=>b.d-a.d);const last=rec.slice(0,5),gastos=['fij','hor'],r7=recentCount(7);
  return `<section class="cap-wrap">
    <div class="cap-top"><div><div class="hero-k">${MES[mi]} ${year}</div><div class="cap-l">Tienes disponible</div></div><a class="cap-link" href="#resumen">Ver panel completo →</a></div>
    <div class="cap-big ${sum(m.liq)<0?'neg':''}">${fmtC('liq',sum(m.liq))}</div>
    <button type="button" class="cap-btn" data-act="new">+ Registrar movimiento</button>
    <div class="cap-liq"><span>Te queda según tu presupuesto</span><b>${fmt(D.res)}</b></div>
    <div class="cap-streak">Has registrado <b>${r7}</b> ${r7===1?'movimiento':'movimientos'} en los últimos 7 días</div>
    <div class="cap-recent"><div class="cap-rt">Últimos movimientos</div>${last.length?last.map(r=>`<div class="cap-r"><span>${esc(r.c||'(sin concepto)')}</span><b class="${gastos.indexOf(r.s)>=0?'g':''}">${gastos.indexOf(r.s)>=0?'-':''}${num2(r.mt)}</b><button type="button" class="capx" data-capedit="${r.s}:${r.idx}" aria-label="Editar ${esc(r.c||'')}"><svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button><button type="button" class="capx" data-capdel="${r.s}:${r.idx}" aria-label="Borrar ${esc(r.c||'')}">×</button></div>`).join(''):'<div class="ms">Aún no registras nada este mes.</div>'}</div>
    <div class="ms cap-tip">Guarda esta pantalla en tu celular: menú del navegador → «Agregar a pantalla de inicio».</div>
  </section>`;
}
