/* ---------- Registro rápido ---------- */
const RULES=[['ing',/sueldo|ingreso|dep[oó]sito|pago recibido|(?:^|\s)(?:cobr[eé]|recib[ií])(?=\s|$)|\bcobro\b|\bme\s+(?:lleg[oó]|pagaron|abonaron|depositaron|transfirieron)\b/],['aho',/ahorro|ahorr[eé]/],['inv',/inversi[oó]n|(?:^|\s)invert[ií](?=\s|$)|xtb|crypto|cripto/],['fij',/alquiler|luz|agua|internet|pensi[oó]n|universidad|usil|celular|servicio|\b(?:netflix|spotify|disney|hbo|cable|seguro|cuota|mensualidad|colegio|hipoteca|wifi)\b|suscripci[oó]n/],['hor',/.*/]];
/* Quita del concepto lo que sobra al hablar («gasté en taxi» → taxi, «compré una polera por» → polera, «me llegó el sueldo de» → sueldo). */
function limpiarConcepto(d){
  d=String(d||'').trim();
  d=d.replace(/^(?:me\s+)?almorc[eé](?=\s|$)/,'almuerzo').replace(/^(?:me\s+)?cen[eé](?=\s|$)/,'cena').replace(/^(?:me\s+)?desayun[eé](?=\s|$)/,'desayuno');
  d=d.replace(/^(?:me\s+)?(?:gast[eé]|pagu[eé]|pago|pagar|compr[eé]|com[ií]|cobr[eé]|recib[ií]|invert[ií]|ahorr[eé]|deposit[eé]|llev[eé]|saqu[eé]|lleg[oó]|pagaron|abonaron|depositaron|transfirieron)(?:\s+|$)/,'');
  for(let i=0;i<4;i++)d=d.replace(/^(?:el|la|los|las|un|una|unos|unas|de|del|en|por|para|al|a)\s+/,'').replace(/\s+(?:de|del|en|por|para|con|a|al|y|e|un|una|el|la|los|las)$/,'');
  return d.trim();
}
const NAMES={ing:'Ingresos',aho:'Ahorros',inv:'Inversiones',fij:'Gastos fijos',hor:'Gastos cotidianos'};
const todayStr=()=>now.getDate()+'-'+ABR[now.getMonth()].toLowerCase();
/* Números en palabras («veinticinco», «treinta y cinco», «dos mil») → cifras. «un/una/uno» solo cuenta si va con una moneda («una luca»);
   «once» no se convierte porque también es la comida. */
/* Dictado: Web Speech API del navegador. El audio lo procesa el servicio de voz del navegador (en Chrome, Google), no MiS²oles; aquí solo llega el texto. */
const SR_API=window.SpeechRecognition||window.webkitSpeechRecognition,SR_OK=!!SR_API;
let vozRec=null,vozErr='';
function vozUi(on){const b=document.getElementById('smic');if(b){b.setAttribute('aria-pressed',on?'true':'false');b.classList.toggle('on',on);b.setAttribute('aria-label',on?'Detener dictado':'Dictar');}const s=document.getElementById('smicst');if(s&&on)s.textContent='Escuchando… di: concepto, precio, moneda y cuenta';}
function vozMsg(m){const s=document.getElementById('smicst');if(s)s.textContent=m;}
function vozStop(){if(vozRec){try{vozRec.stop();}catch(e){}}}
function vozStart(){
  const inp=document.getElementById('smsg');if(!SR_OK||!inp)return;
  if(vozRec){vozStop();return;}
  let ok=false;try{ok=localStorage.getItem('cuadra-voz')==='1';}catch(e){}
  if(!ok){const bx=document.getElementById('smicok');if(bx){bx.hidden=false;const b0=bx.querySelector('[data-vozok="1"]');if(b0)b0.focus();}return;}
  const r=new SR_API();r.lang=LANG==='en'?'en-US':'es-PE';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;vozErr='';
  r.onstart=()=>vozUi(true);
  r.onresult=e=>{let tx='';for(let i=0;i<e.results.length;i++)tx+=e.results[i][0].transcript+' ';inp.value=tx.trim();inp.dispatchEvent(new Event('input',{bubbles:true}));};
  r.onerror=e=>{const m={'not-allowed':'No tengo permiso para usar el micrófono. Actívalo en los permisos de este sitio.','service-not-allowed':'Tu navegador no permite el dictado aquí.','no-speech':'No te escuché. Toca el micrófono y vuelve a intentar.','audio-capture':'No encuentro un micrófono.','network':'Sin conexión: el dictado necesita internet.','language-not-supported':'Tu navegador no entiende dictado en este idioma.'}[e.error];if(m){vozErr=m;vozMsg(m);}};
  r.onend=()=>{vozRec=null;vozUi(false);const s=document.getElementById('smicst');if(s&&!vozErr)s.textContent='';};
  vozRec=r;try{r.start();track('reg_modo','voz');}catch(e){vozRec=null;vozUi(false);vozMsg('No se pudo iniciar el dictado.');}
}
const NUMP={cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,'dieciséis':16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiun:21,veintidos:22,'veintidós':22,veintitres:23,'veintitrés':23,veinticuatro:24,veinticinco:25,veintiseis:26,'veintiséis':26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900};
function palabrasANum(text){
  const ws=String(text).split(/\s+/).filter(Boolean),out=[];
  const sp=w=>{const m=w.match(/^([^\p{L}\d]*)([\p{L}\d]+)([^\p{L}\d]*)$/u);return m?{a:m[1],w:m[2],z:m[3]}:{a:'',w:w,z:''};};
  const isN=w=>Object.prototype.hasOwnProperty.call(NUMP,w);
  for(let i=0;i<ws.length;){
    const s=sp(ws[i]);
    if(!isN(s.w)&&s.w!=='mil'){out.push(ws[i]);i++;continue;}
    let j=i,total=0,cur=0,tens=false,n=0,last=s;
    while(j<ws.length){
      const x=sp(ws[j]);if(j>i&&x.a)break;
      if(isN(x.w)){cur+=NUMP[x.w];tens=NUMP[x.w]>=30&&NUMP[x.w]<=90;n++;last=x;j++;if(x.z)break;continue;}
      if(x.w==='mil'){total+=(cur||1)*1000;cur=0;tens=false;n++;last=x;j++;if(x.z)break;continue;}
      if(x.w==='y'&&tens&&j+1<ws.length){const y=sp(ws[j+1]);if(isN(y.w)&&NUMP[y.w]>=1&&NUMP[y.w]<=9&&!y.a){j++;tens=false;continue;}}
      break;
    }
    const nx=j<ws.length?sp(ws[j]).w:'';
    if(n===1&&(s.w==='un'||s.w==='uno'||s.w==='una')&&!/^(sol|soles|luca|lucas|d[oó]lar|d[oó]lares|euro|euros)$/.test(nx)){out.push(ws[i]);i=j>i?j:i+1;continue;}
    out.push(s.a+String(total+cur)+last.z);i=j>i?j:i+1;
  }
  return out.join(' ');
}
const NUMRE=/(?:s\/\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/;
/* Una frase puede traer varios gastos («almuerzo 25 y taxi 12»): se corta en cada coma, «y» o «+» que haya entre dos montos. */
function cortarFrase(t){
  const re=new RegExp(NUMRE.source,'g'),ms=[];let m;while((m=re.exec(t)))ms.push({i:m.index,e:m.index+m[0].length});
  if(ms.length<2)return[t];
  const cuts=[];
  for(let k=0;k<ms.length-1;k++){
    const gap=t.slice(ms[k].e,ms[k+1].i),a=gap.search(/[,;+]|\s+(?:y|e|m[aá]s)\s/);
    const strong=gap.search(/[,;+]/),i=strong>=0?strong:a;
    if(i<0)return[t];
    cuts.push(ms[k].e+i);
  }
  const out=[];let p=0;cuts.forEach(c=>{out.push(t.slice(p,c));p=c;});out.push(t.slice(p));
  return out.map(s=>s.replace(/^[\s,;+]+/,'').replace(/^(?:y|e|m[aá]s)\s+/,'').trim());
}
const normTxt=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const escRe=s=>s.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&');
const PREP_CTA='(?:\\b(?:con|desde|de|en|por|a)\\s+)?(?:(?:la|mi|tu)\\s+)?(?:cuenta\\s+)?(?:de\\s+)?';
/* Una frase por gasto: «concepto, precio, moneda y cuenta». La cuenta puede ser cualquiera de las del mes (por su nombre, con o sin «con / desde / de mi cuenta»)
   o las palabras de siempre (yape, plin, efectivo). Devuelve el nombre o la palabra en \`pay\`; quien llama lo convierte en la cuenta. */
function parseUna(seg,accts){
  let cur='';
  if(/\b(d[oó]lar(?:es)?|usd)\b|\$/.test(seg))cur='$';else if(/\b(euros?|eur)\b|€/.test(seg))cur='€';else if(/(\d)\s*(?:soles?|lucas?)\b|\b(?:soles?|lucas?)\s+(?=\d)|\bs\//.test(seg))cur='S/';
  seg=seg.replace(/\b(d[oó]lar(?:es)?|usd|euros?|eur)\b|[$€]/g,' ').replace(/(\d)\s*(?:soles?|lucas?)\b/g,'$1').replace(/\b(?:soles?|lucas?)\s+(?=\d)/g,'');
  const mt=seg.match(NUMRE);if(!mt)return null;
  const amt=parseMonto(mt[1]);if(!(amt>0))return null;
  let w='',rest=seg;
  const ns=normTxt(seg);let best=null;
  (accts||[]).forEach(a=>{const nn=normTxt(a).trim();if(nn.length<3)return;
    const m=new RegExp(PREP_CTA+'(?<![\\p{L}\\d])'+escRe(nn)+'(?![\\p{L}\\d])','iu').exec(ns);
    if(m&&(!best||nn.length>best.nlen))best={name:a.trim(),idx:m.index,len:m[0].length,nlen:nn.length};});
  if(best){w=best.name;rest=seg.slice(0,best.idx)+' '+seg.slice(best.idx+best.len);}
  else{const g=new RegExp(PREP_CTA+'\\b(yape|plin|efectivo)\\b','i').exec(seg);if(g){w=g[1].toLowerCase();rest=seg.slice(0,g.index)+' '+seg.slice(g.index+g[0].length);}}
  let card='';
  {const nt=normTxt(seg);if(!card)card=cardEnTexto(nt);
    if(!card&&/\btarjeta\b/.test(seg)){const m=/tarjeta\s+(?:de\s+cr[eé]dito\s+)?([a-z0-9!]+)/i.exec(normTxt(seg)),nm=m&&m[1].replace(/[^a-z0-9]/g,'');if(nm)Object.keys(BANKN).forEach(k=>{if(!card&&normTxt(BANKN[k]).replace(/[^a-z0-9]/g,'')===nm)card=k;});}
    /* si la persona tiene una cuenta con el mismo nombre que la tarjeta, gana la cuenta */
    if(card&&best&&normTxt(best.name).replace(/[^a-z0-9]/g,'')===normTxt(BANKN[card]).replace(/[^a-z0-9]/g,''))card='';}
  const pagoT=card&&/(?:^|\s)(?:pagu[eé]|pago|pagar|cancel[eé]|abon[eé])(?=\s|$)/.test(seg);
  const ant=/\b(antojos?|antojito|caprichos?)\b/.test(seg);
  if(card){rest=rest.replace(new RegExp('(?:\\b(?:la|mi|de|con|en|a)\\s+)*(?:\\btarjeta\\s+(?:de\\s+cr[eé]dito\\s+)?)?'+escRe(BANKN[card].replace(/!/g,''))+'!?','i'),' ').replace(/\btarjeta\b/g,' ');}
  const desc=limpiarConcepto(rest.replace(mt[0],'').replace(/\b(tarjeta|antojos?|antojito|caprichos?)\b/g,'').replace(/\s+/g,' ').replace(/^(?:y|e|de|en|por|con|desde|a)\s+|\s+(?:y|e|de|en|por|con|desde|a)$/g,'').trim());
  return{amt,sec:card?(pagoT?'pago':'compra'):ant?'hor':RULES.find(r=>r[1].test(seg))[0],name:desc?desc.charAt(0).toUpperCase()+desc.slice(1):'',pay:w,ant,cur,card};
}
/* Devuelve el primer gasto de la frase (como siempre) y, si la frase trae varios, la lista en \`multi\`; también «ayer/anteayer» (ago) y la moneda dicha (cur: S/, $ o €). */
function parseMsg(text,accts){
  let t=String(text||'').toLowerCase(),ago=0,cur='';
  const dm=t.match(/\b(anteayer|antes de ayer|antier|ayer|hoy)\b/);
  if(dm){ago=dm[1]==='hoy'?0:dm[1]==='ayer'?1:2;t=t.replace(dm[0],' ');}
  t=t.replace(/(\d+(?:[.,]\d+)?)\s*mil\b/g,(m,a)=>String(Math.round(parseFloat(a.replace(',','.'))*1000)));
  t=palabrasANum(t);
  const segs=cortarFrase(t),items=segs.map(s=>parseUna(s,accts)).filter(Boolean);
  if(!items.length)return null;
  for(let k=items.length-1;k>=0;k--)if(!items[k].pay)items[k].pay=(items[k+1]&&items[k+1].pay)||'';
  const gastos=items.length>1&&items.every(x=>x.sec==='hor'||x.sec==='fij');
  const p=items[0];cur=p.cur||'';
  return{amt:p.amt,sec:p.sec,name:p.name,pay:p.pay,ant:p.ant,card:p.card||'',ago,cur,multi:gastos?items:null};
}
function addRow(yr,mi,sec,r){
  const arr=S[yr][mi][sec],k=arr.findIndex(x=>!x.c&&!x.m);
  if(k>=0){arr[k]=r;return{yr,mi,sec,r,rep:true};}
  arr.push(r);return{yr,mi,sec,r,rep:false};
}
function undoRow(u){
  if(u&&u.fn){u.fn();save();render();return;}
  const m=S[u.yr][u.mi],arr=m[u.sec],k=arr.indexOf(u.r);if(k<0)return;
  if(u.r.src)revDed(m,u.r);
  if(u.rep)arr[k]=row();else arr.splice(k,1);
  if(!arr.length)arr.push(row());
  save();render();
}
function quickAdd(text){
  const p=parseMsg(text);if(!p)return{err:'Falta el monto. Prueba con: almuerzo 25 yape'};
  if(p.sec==='aho'){
    if(typeof view!=='number')return{err:'Abre un mes para registrar tu ahorro.'};
    const low=text.toLowerCase(),accs=ahoAccts(year,view);
    let a=accs.find(x=>low.indexOf(x.c.toLowerCase())>=0);
    if(!a){let ls='';try{ls=localStorage.getItem(KEY+'-ahoacct')||'';}catch(e){}a=accs.find(x=>x.c===ls)||accs[0];}
    const nm=a?a.c:'Ahorros';try{localStorage.setItem(KEY+'-ahoacct',nm);}catch(e){}
    const r0=ahoDo({yr:year,mo:view,ax:'dep',from:'aho:'+nm,amt:p.amt,desc:'',fch:todayStr(),goal:'',src:'',cur:''});
    return{ok:r0.msg,u:r0.u};
  }
  const nm=p.name||'Sin descripción',u=addRow(year,view,p.sec,row(nm,p.amt,todayStr()));
  return{ok:nm+' · '+fmt(p.amt)+' en '+NAMES[p.sec],u};
}

