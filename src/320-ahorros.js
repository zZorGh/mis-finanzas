/* ---------- Ahorros: movimientos por cuenta (depósito +, retiro −) ---------- */
const ahoKind=r=>{const x=(r&&r.t)||'';return x==='aj'?'aj':x.indexOf('tr')===0?'tr':((+(r&&r.m)||0)<0?'ret':'dep');};
const ahoName=r=>((r&&r.c)||'').trim()||'Sin nombre';
function ahoPos(m){for(const y of Object.keys(S)){const i=S[y].indexOf(m);if(i>=0)return [y,i];}return null;}
/* Cuentas con su saldo (en soles) al cierre del mes (y,i): suma de todos sus movimientos hasta ahí */
function ahoAccts(y,i){
  const acc=new Map();
  for(const yy of Object.keys(S).sort()){
    if(yy>y)break;
    for(let ii=0;ii<12;ii++){
      if(yy===y&&ii>i)break;
      const m=S[yy][ii];
      (m.aho||[]).forEach(r=>{if(!(r.c||'').trim()&&!+r.m)return;const n=ahoName(r),k=n.toLowerCase(),a=acc.get(k)||{c:n,v:0};a.v+=(+r.m||0)*rateC(rowCur('aho',r),m);acc.set(k,a);});
    }
  }
  return [...acc.values()].map(a=>({c:a.c,v:Math.round(a.v*100)/100}));
}
const ahoHid=a=>Math.abs(a.v)<.005&&(cfg.ahoOcultas||[]).includes(a.c.toLowerCase());
const ahoOf=(y,i,name)=>ahoAccts(y,i).find(a=>a.c.toLowerCase()===String(name).toLowerCase());
const ahoBal=(y,i)=>(S[y]&&S[y][i])?Math.round(ahoAccts(y,i).reduce((a,x)=>a+x.v,0)*100)/100:null;
/* Lo que depositaste menos lo que retiraste en el mes (ajustes y traspasos no cuentan) */
const ahoFlow=m=>Math.round(((m&&m.aho)||[]).reduce((a,r)=>{const k=ahoKind(r);return(k==='dep'||k==='ret')?a+(+r.m||0)*rateC(rowCur('aho',r),m):a;},0)*100)/100;
const lastIdx=y=>y===String(now.getFullYear())?now.getMonth():11;
const ahoNow=y=>ahoBal(y,lastIdx(y))||0;
/* Tasa anual de cada cuenta (TREA o TEA) y ganancia estimada: interés compuesto, año de 360 días como los bancos de Perú */
const tasaOf=n=>((cfg.ahoTasa||{})[String(n).trim().toLowerCase()])||null;
const ahoGana=(bal,tz,dias)=>(tz&&+tz.v>0&&bal>0)?bal*(Math.pow(1+tz.v/100,dias/360)-1):0;
/* Convierte los ahorros guardados con el modelo anterior (saldo o aporte por año) a movimientos.
   Conserva el saldo de cada mes y el ahorro de cada mes. Corre una sola vez (cfg.ahoV). */
function migrateAho(){
  if(cfg.ahoV===3)return;
  const mode=y=>((cfg.ahoModo||{})[y])||'saldo',ys=Object.keys(S).sort(),def=curOf('aho');
  let prev=new Map(),known=false;
  ys.forEach((y,yi)=>{
    if(!Array.isArray(S[y]))return;
    const py=ys[yi-1],ini=(cfg.ahoIni||{})[y],hasIni=ini!==undefined&&ini!==''&&!isNaN(+ini),extra=[];
    if(hasIni){
      prev.forEach(a=>{if(Math.abs(a.v)>=.005){const r=row(a.c,-Math.round(a.v*100)/100,'',a.k);r.t='aj';extra.push(r);}});
      const r0=row('Saldo inicial',+ini,'','');r0.t='aj';extra.push(r0);
      prev=new Map([['saldo inicial',{c:'Saldo inicial',v:+ini,k:'',f:''}]]);known=true;
    }else if(yi===0){known=mode(y)==='aporte';}
    else if(!(mode(y)==='aporte'||mode(py)==='saldo'))known=false;
    S[y].forEach((m,i)=>{
      const rows=(m.aho||[]).filter(r=>(r.c||'').trim()||+r.m),has=rows.some(r=>+r.m)||!!m.az;
      const sol=r=>(+r.m||0)*rateC(rowCur('aho',r),m);
      let out=i===0?extra.slice():[];
      if(mode(y)==='aporte'){
        rows.forEach(r=>{const n=ahoName(r),k=n.toLowerCase(),a=prev.get(k)||{c:n,v:0,k:'',f:''};a.v+=sol(r);if(r.k)a.k=r.k;prev.set(k,a);});
        out=out.concat(rows);known=true;
      }else if(has){
        const now=new Map();
        rows.forEach(r=>{const n=ahoName(r),k=n.toLowerCase(),a=now.get(k)||{c:n,v:0,k:'',f:''};a.v+=sol(r);if(r.k)a.k=r.k;if(r.f)a.f=r.f;now.set(k,a);});
        new Set([...prev.keys(),...now.keys()]).forEach(k=>{
          const p=prev.get(k),n=now.get(k),d=Math.round(((n?n.v:0)-(p?p.v:0))*100)/100;
          if(Math.abs(d)<.005)return;
          const r=row((n||p).c,d,(n&&n.f)||'',(n&&n.k)||(p&&p.k)||'');
          if(!known)r.t='aj';
          if(def!=='S/')r.cur='S/';
          out.push(r);
        });
        prev=now;known=true;
      }
      m.aho=out.length?out:[row()];delete m.az;
    });
  });
  cfg.ahoV=3;
}
const fmtC=(id,v)=>curOf(id)+' '+num2(v);
/* Grupo de una categoría: lo que la persona eligió en Ajustes ('-' = sin clasificar a propósito); si no eligió, los nombres «Necesidad…» y «Deseo…» de siempre. */
function catG(k){const s=String(k||'').trim().toLowerCase();if(!s)return'';const cg=cfg.catGrupo||{},v=Object.prototype.hasOwnProperty.call(cg,s)?cg[s]:'';if(v==='-')return'';if(v)return v;return s.indexOf('necesid')===0?'need':s.indexOf('deseo')===0?'want':'';}
const GRUPOS3=[['need','Necesidades'],['want','Deseos'],['ai','Ahorro e inversión'],['','Sin clasificar']];
function needWant(m){
  let n=0,w=0,a=0;
  [['fij','need'],['hor','want']].forEach(x=>{(m[x[0]]||[]).forEach(r=>{
    const v=(+r.m||0)*rateC(rowCur(x[0],r),m),g=(x[0]==='hor'&&r.t==='ant')?'want':(catG(r.k)||x[1]);
    if(g==='ai')a+=v;else if(g==='need')n+=v;else w+=v;});});
  return{need:n,want:w,aiG:a};
}
/* Memo de una pasada de dibujo: dentro de render()/refreshMonth() los datos no cambian, así que cada mes
   (dv), los movimientos recientes y el promedio de gasto se calculan una sola vez. Fuera del dibujo no hay memo. */
let passOn=false,passDv=new Map(),passRC=new Map(),passAvg;
function passBegin(){passOn=true;passDv=new Map();passRC=new Map();passAvg=undefined;}
function passEnd(){passOn=false;}
function dv(m){if(!passOn)return dv0(m);let v=passDv.get(m);if(!v){v=dv0(m);passDv.set(m,v);}return v;}
function dv0(m){const f=(k)=>solesOf(m,k);
  const ing=f('ing'),fij=f('fij'),hor=f('hor'),aho=ahoFlow(m),inv=f('inv'),gas=fij+hor,p=ahoPos(m),sAho=p?(ahoBal(p[0],p[1])||0):0,hasA=(m.aho||[]).some(r=>+r.m);
  return{...needWant(m),ing,fij,hor,gas,aho,sAho,inv,res:ing-gas-aho-inv,bb:cardDebt(m,'bbva'),bc:cardDebt(m,'bcp'),oh:cardDebt(m,'oh'),on:(ing>0||gas>0||hasA||inv>0)};}

const themeKey=()=>{const d=document.documentElement.dataset;return (d.skin||'')+'|'+(d.theme||'')+'|'+(matchMedia('(prefers-color-scheme: dark)').matches?1:0);};
const themeDark=()=>{const d=document.documentElement.dataset.theme;return d==='dark'||(!d&&matchMedia('(prefers-color-scheme: dark)').matches);};
let cvKey='',cvMap=new Map();
const cv=n=>{const k=themeKey();if(k!==cvKey){cvKey=k;cvMap=new Map();}let v=cvMap.get(n);if(v===undefined){v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();cvMap.set(n,v);}return v;};
const CH=[];
/* Gráficos perezosos: cada gráfico se crea recién cuando está cerca de la pantalla. */
let chIO=null;const chPend=new Map();
const killCharts=()=>{chQ.length=0;CH.splice(0).forEach(c=>c.destroy());if(chIO)chPend.forEach((f,el)=>chIO.unobserve(el));chPend.clear();};
/* Descripción de un gráfico para lectores de pantalla: antes el canvas solo repetía su título. */
function chDesc(conf){
  const d=(conf&&conf.data)||{},L=d.labels||[],ds=d.datasets||[],v=x=>(typeof x==='number'&&Number.isFinite(x))?num2(x):'';
  let s='';
  if(ds.length===1)s=L.map((l,i)=>[l,v((ds[0].data||[])[i])]).filter(x=>x[1]!=='').map(x=>x[0]+' '+x[1]).join('; ');
  else s=ds.map(x=>(x.label||'')+': '+L.map((l,i)=>[l,v((x.data||[])[i])]).filter(y=>y[1]!=='').map(y=>y[0]+' '+y[1]).join(', ')).join('. ');
  return s.length>600?s.slice(0,600)+'…':s;
}
function mkChart(id,conf){const el=document.getElementById(id);if(!el||!window.Chart)return;if(LANG==='en'){try{const dd=conf.data;if(dd.labels)dd.labels=dd.labels.map(T);dd.datasets.forEach(s=>{if(typeof s.label==='string')s.label=T(s.label);});}catch(x){}}try{el.setAttribute('aria-label',T(el.getAttribute('aria-label')||'')+'. '+chDesc(conf));}catch(x){}
  chQ.push({el,make:()=>CH.push(new Chart(el,conf))});if(!chQ.t)chQ.t=Promise.resolve().then(chFlush);}
const chQ=[];
function chFlush(){
  const q=chQ.splice(0);chQ.t=null;
  const vis=q.map(x=>{if(!x.el.isConnected)return null;if(!('IntersectionObserver' in window))return true;const r=x.el.getBoundingClientRect();return r.top<innerHeight+300&&r.bottom>-300;});
  q.forEach((x,i)=>{if(vis[i]===null)return;if(vis[i]){x.make();return;}
    if(!chIO)chIO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const f=chPend.get(e.target);if(!f)return;chPend.delete(e.target);chIO.unobserve(e.target);f();}),{rootMargin:'300px 0px'});
    chPend.set(x.el,x.make);chIO.observe(x.el);});
}
const base=anim=>({responsive:true,maintainAspectRatio:false,animation:(anim&&!reduce)?{duration:450}:false});
const axes=yf=>({x:{ticks:{color:cv('--muted'),font:{size:11},autoSkip:false},grid:{display:false},border:{color:cv('--line')}},y:{beginAtZero:true,ticks:{color:cv('--muted'),font:{size:11},callback:yf||(v=>v>=1000?(v/1000)+'k':v)},grid:{color:cv('--line')},border:{display:false}}});
const tipMoney={callbacks:{label:c=>' '+c.dataset.label+': '+fmt(c.parsed.y)}};
const goMonth=(e,els)=>{if(els&&els.length)location.hash='#'+SLUG[els[0].index];};

function header(){
  return `<div class="wrap hrow"><div class="brand"><span class="logo" aria-hidden="true">S/</span><span class="bt" role="img" aria-label="MiSoles">Mi<span class="sw">S<sup class="sq">2</sup></span>oles</span></div>
  <div class="ctl"><a class="caplink" href="#capturar"${atajosOn()?' aria-keyshortcuts="n" title="Registrar (N)"':''}>Registrar</a><label class="sr" for="yr">Año</label><select id="yr">${YEARS.map(y=>`<option${y===year?' selected':''}>${y}</option>`).join('')}</select><button id="syn" class="syn" type="button" hidden></button><button id="aj" type="button" aria-pressed="${view==='ajustes'}">Ajustes</button>${view==='ajustes'?'':`<button id="ed" type="button" aria-pressed="${edit}">Personalizar</button>`}<button id="th" type="button" aria-pressed="${themeDark()}">Tema</button><button id="lg" type="button" data-lang-toggle data-short="1" data-notr aria-label="${LANG==='en'?'ES · Cambiar a español':'EN · Switch to English'}">${langTxt(1)}</button></div></div>
  <nav class="wrap tabs" aria-label="Meses"><a class="tab" href="#resumen"${view==='resumen'?' aria-current="page"':''}>Resumen ${year}</a>${MES.map((m,i)=>`<a class="tab${dv(S[year][i]).on?'':' off'}" href="#${SLUG[i]}"${view===i?' aria-current="page"':''}>${ABR[i]}${(String(year)===String(limaD().getFullYear())&&i===limaD().getMonth())?'<i class="cdot" aria-hidden="true"></i><span class="sr"> (mes actual)</span>':''}</a>`).join('')}</nav>`;
}

