/* ---------- Mejoras: recurrentes, mes anterior, cuadre, respaldo, meta ---------- */
const MESN=v=>MES[+v.slice(5,7)-1]+' '+v.slice(0,4);
function fondoPlan(meta,aho){
  const f=cfg.fondoMes;if(!f||!/^\d{4}-\d{2}$/.test(f))return 'Elige una fecha y te digo cuánto ahorrar por mes.';
  const left=(+f.slice(0,4)-now.getFullYear())*12+(+f.slice(5,7)-1-now.getMonth());
  const miss=Math.max(0,meta-aho);
  if(miss<=0)return '¡Ya llegaste a la meta del fondo!';
  if(left<=0)return 'La fecha elegida ya pasó. Elige una fecha futura. Te faltan '+fmt(miss)+'.';
  return 'Te faltan '+fmt(miss)+'. Para llegar en '+MESN(f)+' necesitas ahorrar '+fmt(miss/left)+' por mes ('+left+(left===1?' mes':' meses')+').';
}
const emptyArr=a=>!a.some(r=>(r.c||'').trim()||+r.m);
function doPrev(){
  const m=S[year][view],pm=view>0?S[year][view-1]:(S[String(+year-1)]||[])[11];
  if(!pm){toast('No hay un mes anterior para copiar.');return;}
  let n=0;
  if(emptyArr(m.fij)){const rows=pm.fij.filter(r=>(r.c||'').trim()&&+r.m);if(rows.length){m.fij=rows.map(r=>row(r.c,r.m,'',r.k));n+=rows.length;}}
  if(m.liq.every(r=>!(+r.m))){const rows=pm.liq.filter(r=>(r.c||'').trim());if(rows.some(r=>+r.m)){m.liq=rows.map(r=>row(r.c,r.m));n+=rows.length;}}
  const prevY=view>0?year:String(+year-1),prevI=view>0?view-1:11;let nc=0;
  CARDS.forEach(k=>{if(m.copen&&m.copen[k]!=null)return;if((m[k]||[]).some(r=>+r.m))return;const pe=cardEnding(prevY,prevI,k);if(pe){if(!m.copen)m.copen={};m.copen[k]=pe;nc++;}});
  if(!n&&!nc){const had=!emptyArr(m.fij)||m.liq.some(r=>+r.m);toast(had?'Este mes ya tiene gastos fijos o liquidez, no copié nada para no duplicar.':'El mes anterior no tiene gastos fijos ni liquidez para copiar.');return;}
  save();render();toast('Traído del mes anterior: '+n+' filas'+(nc?' y saldo de '+nc+(nc===1?' tarjeta':' tarjetas'):''));
}
