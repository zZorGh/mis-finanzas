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
  liqCarry();
  let saldos=0;
  if(!m.lb&&liqIntacto(m)&&(pm.liq||[]).some(r=>+r.m)){liqHereda(pm,m);saldos=1;}
  const prevY=view>0?year:String(+year-1),prevI=view>0?view-1:11;let nc=0;
  CARDS.forEach(k=>{if(m.copen&&m.copen[k]!=null)return;if((m[k]||[]).some(r=>+r.m))return;const pe=cardEnding(prevY,prevI,k);if(pe){if(!m.copen)m.copen={};m.copen[k]=pe;nc++;}});
  save();render();
  if(!saldos&&!nc){toast('No había nada que traer: este mes ya tiene sus saldos.');return;}
  toast(saldos&&nc?'Traje del mes anterior los saldos de tus cuentas y lo que debes en tarjetas.':saldos?'Traje del mes anterior los saldos de tus cuentas.':'Traje del mes anterior lo que debes en tarjetas.');
}
