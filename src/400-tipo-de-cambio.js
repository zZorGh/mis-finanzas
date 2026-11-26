/* ---------- Tipo de cambio: SUNAT guardado por mes ---------- */
const FX_SRC=[
  {n:'ExchangeRate-API',url:'https://open.er-api.com/v6/latest/USD',pen:j=>j&&j.result==='success'&&j.rates?+j.rates.PEN:0,eur:j=>j&&j.rates&&+j.rates.EUR?+j.rates.PEN/+j.rates.EUR:0},
  {n:'currency-api',url:'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',pen:j=>j&&j.usd?+j.usd.pen:0,eur:j=>j&&j.usd&&+j.usd.eur?+j.usd.pen/+j.usd.eur:0}
];
const fxToday=()=>{const d=limaD();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fxRound=v=>Math.round(v*1000)/1000;
const tc3=v=>{const n=+v;return n?String(Math.round(n*1000)/1000):'';};
const fmtISO=f=>/^\d{4}-\d{2}-\d{2}$/.test(String(f||''))?f.slice(8)+'/'+f.slice(5,7)+'/'+f.slice(0,4):'';
/* Mercado (referencial): dólar y euro. Se usa para el euro y como plan B del dólar. */
async function fxFetch(){
  let last=null;
  for(const s of FX_SRC){
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),8000);
    try{
      const r=await fetch(s.url,{signal:ctl.signal,cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const j=await r.json(),pen=s.pen(j),eur=s.eur(j);
      if(pen>1&&pen<20&&eur>1&&eur<30)return{usd:pen,eur:eur,src:s.n};
      throw new Error('datos fuera de rango');
    }catch(e){last=e;}finally{clearTimeout(to);}
  }
  throw last||new Error('sin conexión');
}
/* SUNAT (oficial, dólar): llega por una función de tu Supabase que lee el archivo público de SUNAT. */
async function fxSunat(){
  if(!SB_URL)return null;
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),8000);
  try{
    const r=await fetch(SB_URL+'/functions/v1/tipo-cambio',{headers:{apikey:SB_KEY},signal:ctl.signal,cache:'no-store'});
    if(!r.ok)return null;
    const j=await r.json();
    if(j&&+j.venta>1&&+j.venta<20&&/^\d{4}-\d{2}-\d{2}$/.test(String(j.fecha)))return{usd:+j.venta,compra:+j.compra||0,fecha:j.fecha};
    return null;
  }catch(e){return null;}finally{clearTimeout(to);}
}
function tcmInfo(m){
  const t=m.tc;
  if(!t||!(+t['$']||+t['€']))return 'Sin tasa propia: este mes usa la de respaldo (1 $ = S/ '+(tc3((cfg.tc||{})['$'])||'—')+' · 1 € = S/ '+(tc3((cfg.tc||{})['€'])||'—')+').';
  const s=t.s==='SUNAT'?'SUNAT (venta)':t.s==='Mercado'?'Mercado, no SUNAT':t.s==='Manual'?'Manual':'';
  return 'Tasa propia de este mes'+(s?' · '+s:'')+(t.f?' · '+fmtISO(t.f):'')+'.';
}
function tcmCard(m,i){
  const t=m.tc||{},cur=(year===String(now.getFullYear())&&i===now.getMonth()),fb=cfg.tc||{};
  return `<section class="card bcard tcm" data-cid="tcm"><details class="cb tcmd"><summary><h2 class="ttl">Tipo de cambio del mes</h2><span class="ms tcm-v">1 $ = S/ ${tc3(t['$']||fb['$'])}</span></summary>
    <div class="tcm-row"><label for="tcm-d">1 $ en S/<input id="tcm-d" type="number" step="0.001" inputmode="decimal" data-tcm="$" value="${tc3(t['$'])}" placeholder="${tc3(fb['$'])}"></label><label for="tcm-e">1 € en S/<input id="tcm-e" type="number" step="0.001" inputmode="decimal" data-tcm="€" value="${tc3(t['€'])}" placeholder="${tc3(fb['€'])}"></label>${cur?'<button class="b" id="tcm-sunat" type="button">Actualizar con SUNAT</button>':''}</div>
    <div class="ms" id="tcm-st" role="status">${esc(tcmInfo(m))}</div>
    <div class="ms">${cur?'Cada día se guarda aquí la tasa SUNAT; al cambiar de mes queda congelada.':'SUNAT solo publica la tasa del día: para este mes escribe la tasa a mano.'} El euro es referencial (SUNAT no lo publica).</div></details></section>`;
}
let fxBusy=false;
async function fxUpdate(manual){
  const say=t=>['fx-msg','tcm-st'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=t;});
  const btns=()=>['fx-now','tcm-sunat'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=fxBusy;});
  if(window.claude&&window.claude.use){if(manual)say('La actualización con SUNAT funciona en la versión web, no en esta vista previa.');return;}
  if(fxBusy)return;fxBusy=true;btns();
  if(manual)say('Consultando SUNAT…');
  try{
    const sun=await fxSunat(),mkt=await fxFetch().catch(()=>null);
    if(!sun&&!mkt)throw new Error('sin datos');
    const usd=sun?sun.usd:mkt.usd,fecha=sun?sun.fecha:fxToday();
    const eur=mkt?usd*(mkt.eur/mkt.usd):0;
    const d=limaD(),y=String(d.getFullYear()),m=S[y]&&S[y][d.getMonth()];
    if(m){
      const lockManual=!manual&&m.tc&&m.tc.s==='Manual',downgrade=!manual&&!sun&&m.tc&&m.tc.s==='SUNAT';
      if(!lockManual&&!downgrade){
        const prev=m.tc||{},n={'$':fxRound(usd),f:fecha,s:sun?'SUNAT':'Mercado'};
        if(sun&&sun.compra)n.c=sun.compra;
        const e2=eur?fxRound(eur):(+prev['€']||0);if(e2)n['€']=e2;
        m.tc=n;
      }
    }
    if(sun)cfg.tcAt=fxToday();
    cfg.tcLast={f:fecha,s:sun?'SUNAT':'Mercado',usd:fxRound(usd),eur:eur?fxRound(eur):0};
    save();render();
    if(manual||sun)toast((sun?'SUNAT':'Mercado (SUNAT no respondió)')+': 1 $ = S/ '+tc3(usd)+(eur?' · 1 € = S/ '+tc3(eur):''));
  }catch(e){
    if(manual)say('No pude consultar el tipo de cambio ahora. Se mantiene el que tenías.');
  }finally{fxBusy=false;btns();}
}
function fxAuto(){
  if(window.claude&&window.claude.use)return;
  if(cfg.tcAuto===false||cfg.tcAt===fxToday())return;
  fxUpdate(false);
}

