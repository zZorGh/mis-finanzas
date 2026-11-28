/* ---------- Métricas anónimas y errores ----------
   Cuentan qué pantallas se usan y dónde se traba la gente. NUNCA llevan montos, conceptos, cuentas ni correo:
   solo un id aleatorio del dispositivo (cuadra-sid), el nombre del evento, un dato corto (modo, paso, tipo) y la versión.
   Apagado hasta que exista la tabla (TRACK_DEFAULT); cada persona puede apagarlo en Ajustes (cuadra-stats = 0/1). */
const TRACK_DEFAULT=true,APPV='2026.11.28.4';
/* En tu computadora (localhost, file) no se mide por defecto: así las pruebas y el desarrollo no ensucian las métricas reales. */
const trLocal=/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|)$/.test(location.hostname);
const statsOn=()=>{let v=null;try{v=localStorage.getItem('cuadra-stats');}catch(e){}return v==='1'?true:v==='0'?false:(TRACK_DEFAULT&&!trLocal);};
const sidGet=()=>{try{let s=localStorage.getItem('cuadra-sid');if(!s||s.length<8){const a=new Uint8Array(10);crypto.getRandomValues(a);s=Array.from(a).map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem('cuadra-sid',s);}return s;}catch(e){return '';}};
let trQ=[],trT=0,trErr=0;
function track(ev,dato){
  try{
    if(!statsOn())return;const sid=sidGet();if(!sid||trQ.length>=50)return;
    trQ.push({sid,ev,dato:dato==null?null:String(dato).slice(0,160),ver:APPV});
    clearTimeout(trT);trT=setTimeout(trFlush,5000);
  }catch(e){}
}
function trFlush(){
  if(!trQ.length)return;const body=JSON.stringify(trQ);trQ=[];
  try{fetch(SB_URL+'/rest/v1/eventos',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,Prefer:'return=minimal'},body}).catch(()=>{});}catch(e){}
}
function trDay(){
  try{if(!statsOn())return;const d=limaD(),k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    if(localStorage.getItem('cuadra-stats-day')!==k){localStorage.setItem('cuadra-stats-day',k);track('dia_activo');}}catch(e){}
}
const trRuido=/failed to fetch|networkerror|load failed|abort|timeout|network request/i;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')trFlush();else trDay();});
addEventListener('pagehide',trFlush);
addEventListener('error',e=>{const m=String(e.message||'');if(trRuido.test(m)||trErr>=5)return;trErr++;track('error',m.slice(0,100)+' @'+String(e.filename||'').split('/').pop()+':'+(e.lineno||0));});
addEventListener('unhandledrejection',e=>{const m=String((e.reason&&e.reason.message)||e.reason||'');if(trRuido.test(m)||trErr>=5)return;trErr++;track('error','promesa: '+m.slice(0,100));});
setTimeout(trDay,4000);
const IS_SB=!IS_GAS&&!(window.claude&&window.claude.use)&&!!SB_URL&&typeof supabase!=='undefined';
let sb=null,sbUser=null;
/* Aviso fijo fuera de la web oficial, para no confundir una copia de prueba con la real (no aparece en navegadores automatizados). */
if(!ES_PROD&&IS_SB&&!navigator.webdriver){const av=document.createElement('div');av.id='avpruebas';av.textContent='PRUEBAS · sin datos reales';av.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:80;background:#92400e;color:#fff;font:600 11px/1.6 system-ui,sans-serif;padding:0 10px;border-radius:0 0 8px 8px;pointer-events:none;white-space:nowrap';document.body.appendChild(av);}
let sync={id:SHEET_DEFAULT,auto:true,connected:false,ready:false,state:'idle',msg:'',at:0,stamp:'',busy:false,again:false,dirty:false,timer:0,tabs:false};
try{const j=JSON.parse(localStorage.getItem(SKEY));if(j){if(j.id)sync.id=j.id;sync.auto=j.auto!==false;sync.connected=!!j.connected;sync.dirty=!!j.dirty;sync.stamp=j.stamp||'';}}catch(e){}
const persistSync=()=>{try{localStorage.setItem(SKEY,JSON.stringify({id:sync.id,auto:sync.auto,connected:sync.connected,dirty:!!sync.dirty,stamp:sync.stamp||''}));}catch(e){}};
const txt=v=>{const t=String(v==null?'':v);return(/^[=+\-@]/.test(t)||/^\d{1,2}[-\/][a-záéíóú]{3,4}$/i.test(t))?"'"+t:t;};
const num=v=>{const t=String(v==null?'':v).trim();if(!t)return 0;const n=(/,\d{1,2}$/.test(t)&&t.indexOf('.')<0)?t.replace(',','.'):t.replace(/,/g,'');return parseFloat(n.replace(/[^0-9.\-]/g,''))||0;};
const sheetId=v=>{const m=String(v).match(/\/d\/([a-zA-Z0-9_-]+)/);return m?m[1]:String(v).trim();};
function errMsg(e){
  const m=String((e&&e.message)||'');
  if(/fetch|network|Failed to|NetworkError|timeout/i.test(m)||!navigator.onLine)return 'Sin conexión. Tus cambios quedan guardados en este dispositivo y se subirán a tu cuenta cuando vuelva la señal.';
  return 'No se pudo guardar en tu cuenta'+(m?': '+m.slice(0,160):'.')+' Tus cambios siguen en este dispositivo.';
}
async function gs(tool,input){
  const r=await mcp.callTool(SRV,tool,input,{cache:false});
  let p=r&&r.payload;if(typeof p==='string'){try{p=JSON.parse(p);}catch(e){}}
  return(p&&typeof p==='object')?p:{};
}
async function ensureTabs(){
  if(sync.tabs)return;
  const r=await gs('get_spreadsheet',{spreadsheetId:sync.id,fields:['sheets.properties.title']});
  const have=((r.sheets)||[]).map(x=>x.properties&&x.properties.title);
  const add=[];
  if(have.indexOf('Registro')<0)add.push({addSheet:{properties:{title:'Registro',gridProperties:{rowCount:3000,columnCount:15,frozenRowCount:1}}}});
  if(have.indexOf('Config')<0)add.push({addSheet:{properties:{title:'Config',gridProperties:{rowCount:20,columnCount:3}}}});
  if(add.length)await gs('update_spreadsheet',{spreadsheetId:sync.id,requests:add});
  sync.tabs=true;
}
/* Columna 16 de cada movimiento en la nube: lo que no tiene columna propia (id, antojo, «¿valió la pena?», importación y `_d`, lo que la fila movió de su cuenta) en JSON. Las versiones anteriores la ignoran. */
const XSKIP={c:1,m:1,k:1,f:1,cur:1,src:1,card:1};
const xOk=k=>k!=='__proto__'&&k!=='constructor'&&k!=='prototype'&&!XSKIP[k]&&k.length<=24;
const xVal=v=>typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v));
const xJson=r=>{const o={};Object.keys(r).forEach(k=>{if(xOk(k)&&xVal(r[k]))o[k]=r[k];});return Object.keys(o).length?JSON.stringify(o):'';};
function toRows(wantX){
  const out=[];if(wantX){try{if(idsAsegura())localSave();}catch(e){}}
  YEARS.forEach(y=>S[y].forEach((m,i)=>{
    const base=[+y,i+1,MES[i]],n0=out.length;
    SECKEYS.forEach(k=>{
      const arr=m[k]||[];
      if(k==='liq'&&arr.length===4&&!arr.some(r=>r.h)&&arr.every((r,j)=>r.c===DEFLIQ[j]&&!(+r.m)))return;
      arr.forEach(r=>{if(k!=='liq'&&!r.c&&!(+r.m))return;/* las cuentas van todas: su posición es su identidad */const rr=base.concat([APART[k],txt(r.c),+r.m||0,txt(r.k),txt(r.f),txt(r.cur||''),txt(r.t||''),'','','',txt(r.src||''),txt(r.card||'')]);if(wantX){const xs=xJson(r);if(xs)rr.push(xs);}out.push(rr);});
    });
    (m.eur||[]).forEach(r=>{if(!(r.a||r.b||r.d||r.s||r.p))return;out.push(base.concat(['Apuntes','',0,'','',+r.a||0,+r.b||0,+r.d||0,+r.s||0,+r.p||0,'','']));});
    const dflt=JSON.stringify([50,30,20]);
    if(out.length>n0||m.tot||m.nota||m.az||JSON.stringify(m.p)!==dflt||JSON.stringify(m.q||[50,30,20])!==dflt)
      out.push(base.concat(['_Mes',JSON.stringify(Object.assign({p:m.p,q:m.q||[50,30,20],nota:m.nota||'',tot:!!m.tot},m.az?{az:1}:{})),0,'','','','','','','','','']));
    if(m.lb)out.push(base.concat(['_Liq',JSON.stringify(m.lb),0,'','','','','','','','','']));
    if(m.mov&&m.mov.length)out.push(base.concat(['_Mov',JSON.stringify(m.mov),0,'','','','','','','','','']));
    /* Se sube aunque valga cero: «Saldo anterior 0» es un dato. _h: tarjetas cuyo saldo anterior es heredado */
    if(m.copen&&Object.keys(m.copen).length)out.push(base.concat(['_Card',JSON.stringify(Object.assign({},m.copen,m.ch?{_h:Object.keys(m.ch).filter(k=>m.ch[k])}:{})),0,'','','','','','','','','']));
    if(m.tc&&(+m.tc['$']||+m.tc['€']))out.push(base.concat(['_TC',JSON.stringify(m.tc),0,'','','','','','','','','']));
  }));
  return out;
}
function fromRows(rows){
  const years={},mk=()=>({ing:[],fij:[],hor:[],bbva:[],bcp:[],oh:[],c4:[],c5:[],c6:[],c7:[],c8:[],aho:[],inv:[],liq:[],eur:[],p:[50,30,20],q:[50,30,20],nota:'',tot:false});
  rows.forEach(r=>{
    const y=String(r[0]||'').trim(),mi=parseInt(r[1],10)-1;
    if(!/^\d{4}$/.test(y)||!(mi>=0&&mi<12))return;
    if(!years[y])years[y]=Array.from({length:12},mk);
    const m=years[y][mi],ap=String(r[3]||'').trim();
    if(ap==='_Mes'){try{const j=JSON.parse(r[4]);if(j.p)m.p=j.p;if(j.q)m.q=j.q;m.nota=j.nota||'';m.tot=!!j.tot;if(j.az)m.az=1;}catch(e){}return;}
    if(ap==='_Liq'){try{m.lb=JSON.parse(r[4]);}catch(e){}return;}
    if(ap==='_Card'){try{const j=JSON.parse(r[4]);if(Array.isArray(j._h)){m.ch={};j._h.forEach(k=>{m.ch[String(k)]=1;});}delete j._h;m.copen=j;}catch(e){}return;}
    if(ap==='_TC'){try{m.tc=JSON.parse(r[4]);}catch(e){}return;}
    if(ap==='_Mov'){try{m.mov=JSON.parse(r[4]);}catch(e){}return;}
    if(ap==='Apuntes'){m.eur.push({a:num(r[8]),b:num(r[9]),d:num(r[10]),s:num(r[11]),p:num(r[12])});return;}
    const k=APART_INV[ap];
    if(k){const o=row(r[4]||'',num(r[5]),r[7]||'',r[6]||'',r[13]||'',r[14]||''),c=String(r[8]||'').trim();if(CURS.indexOf(c)>0)o.cur=c;if(k==='aho'&&r[9])o.t=String(r[9]);
      if(typeof r[15]==='string'&&r[15]){try{const j=JSON.parse(r[15]);if(isObj(j))Object.keys(j).forEach(q=>{if(xOk(q)&&xVal(j[q]))o[q]=j[q];});}catch(e){}}
      m[k].push(o);}
  });
  Object.keys(years).forEach(y=>years[y].forEach(m=>{
    SECKEYS.forEach(k=>{if(!m[k].length)m[k]=(k==='liq')?LIQ():[row()];});
    if(!m.eur.length)m.eur=[{a:0,b:0,d:0,s:0,p:0}];
  }));
  return years;
}
function applyRemote(rows,conf){
  const yrs=fromRows(rows);
  Object.keys(yrs).forEach(y=>{if(YEARS.indexOf(y)<0)YEARS.push(y);});
  YEARS.sort();
  const ns={};YEARS.forEach(y=>{ns[y]=yrs[y]||Array.from({length:12},blank);});
  /* Solo para filas que llegan sin `_d` (guardadas por versiones anteriores): se recalcula. Un ingreso suma, por eso va en negativo. */
  Object.keys(ns).forEach(y=>ns[y].forEach(m=>['ing','fij','hor','aho'].forEach(sec=>(m[sec]||[]).forEach(r=>{if(r.src&&r.src.slice(0,4)==='liq:'&&r._d==null)r._d=(sec==='ing'?-1:1)*dedAmt(m,r,sec);}))));
  S=saneS(ns);
  (conf||[]).forEach(r=>{
    try{
      if(r[0]==='cfg'&&r[1]){cfg=saneCfg(JSON.parse(r[1]));['Deseo','Necesidad'].forEach(c=>{if(cfg.cats.indexOf(c)<0)cfg.cats.unshift(c);});}
      if(r[0]==='layout'&&r[1])LAY=saneLay(JSON.parse(r[1]));
      if(r[0]==='guardado')sync.stamp=r[1]||'';
    }catch(e){}
  });
  if(cfg.liqNames&&cfg.liqNames.length>=1)Object.keys(S).forEach(y=>S[y].forEach(m=>{const l=m.liq||[];if(l.length===4&&l.every((r,j)=>r.c===DEFLIQ[j]&&!(+r.m)))m.liq=LIQ(cfg.liqNames);}));
  applyBanks();
  if(!S[year])year=YEARS[YEARS.length-1];
  localSave();localLay();
}
const chipText=()=>({idle:'Conectar',loading:'Cargando…',saving:'Guardando…',saved:'Guardado '+new Date(sync.at).toLocaleTimeString((LANG==='en'?'en-US':'es-PE'),{hour:'2-digit',minute:'2-digit'}),dirty:'Sin guardar',error:'Reintentar',conflict:'Conflicto'})[sync.state]||'Hoja';
function updateChip(){
  const c=document.getElementById('syn');
  if(c){c.hidden=!backend;c.textContent=chipText();c.dataset.s=sync.state;c.title=sync.msg||'Tu cuenta';c.setAttribute('aria-label','Guardado en tu cuenta: '+chipText());}
  const m=document.getElementById('gs-msg');if(m)m.textContent=sync.msg||'';
}
function queueSync(){
  if(authLocked||tabClash)return;
  clearTimeout(sync.retryT);
  sync.rev=(sync.rev||0)+1;if(sync.connected||backend){sync.dirty=true;persistSync();}
  if(!backend||!sync.ready||!sync.auto){if(backend&&sync.ready){sync.dirty=true;sync.state='dirty';updateChip();}return;}
  clearTimeout(sync.timer);sync.state='saving';sync.dirty=true;updateChip();
  sync.timer=setTimeout(()=>pushNow(false),2500);
}
function gasRun(fn,arg){return new Promise((res,rej)=>{try{google.script.run.withSuccessHandler(res).withFailureHandler(e=>rej({code:'tool_error',message:(e&&e.message)||'Error de Apps Script'}))[fn](arg);}catch(e){rej({code:'tool_error',message:String(e)});}});}
const gasBackend={name:'gas',
  stamp:()=>gasRun('apiStamp'),
  read:async()=>{const d=await gasRun('apiGet');return {reg:(d&&d.reg)||[],conf:(d&&d.conf)||[]};},
  write:async(rows,conf3)=>{await gasRun('apiSave',{reg:rows,conf:conf3});}};
const mcpBackend={name:'mcp',
  stamp:async()=>{const c=await gs('get_values',{spreadsheetId:sync.id,range:'Config!B3'});return ((c.values||[])[0]||[])[0];},
  read:async()=>{sync.tabs=false;await ensureTabs();const reg=await gs('get_values',{spreadsheetId:sync.id,range:'Registro!A2:O3000'});const conf=await gs('get_values',{spreadsheetId:sync.id,range:'Config!A1:B3'});return {reg:reg.values||[],conf:conf.values||[]};},
  write:async(rows,conf3)=>{await ensureTabs();await gs('update_values',{spreadsheetId:sync.id,range:'Registro!A1:O'+(rows.length+1),values:[REGHEAD].concat(rows)});await gs('batch_clear_values',{spreadsheetId:sync.id,ranges:['Registro!A'+(rows.length+2)+':O3000']});await gs('update_values',{spreadsheetId:sync.id,range:'Config!A1:B3',values:conf3});}};

/* Tiempo límite: una petición colgada ya no deja la sincronización bloqueada. Se cancela de verdad (abortSignal)
   y, si el cliente no lo permite, igual se deja de esperar. */
const SB_TIMEOUT='La conexión tardó demasiado.';
function sbCall(mk,ms){
  const ctl=new AbortController();let to;
  const lim=new Promise((_,rej)=>{to=setTimeout(()=>{try{ctl.abort();}catch(e){}rej({code:'tool_error',message:SB_TIMEOUT,timeout:true});},ms);});
  const ab=q=>(q&&typeof q.abortSignal==='function')?q.abortSignal(ctl.signal):q;
  return Promise.race([Promise.resolve(mk(ab)),lim]).finally(()=>clearTimeout(to));
}
const sbFail=r=>({code:'tool_error',message:r.error.message,status:r.status});
const supabaseBackend={name:'sb',
  stamp:async()=>{const r=await sbCall(ab=>ab(sb.from('estado').select('stamp').eq('user_id',sbUser.id)).maybeSingle(),15000);return r.data&&r.data.stamp;},
  read:async()=>{const r=await sbCall(ab=>ab(sb.from('estado').select('registro,config').eq('user_id',sbUser.id)).maybeSingle(),20000);if(r.error)throw sbFail(r);return {reg:(r.data&&r.data.registro)||[],conf:(r.data&&r.data.config)||[]};},
  write:async(rows,conf3)=>{const stamp=((conf3.find(x=>x[0]==='guardado')||[])[1])||('v'+Date.now());const r=await sbCall(ab=>ab(sb.from('estado').upsert({user_id:sbUser.id,registro:rows,config:conf3,stamp,updated_at:new Date().toISOString()})),30000);if(r.error)throw sbFail(r);}};
function initSupabase(){
  try{sb=supabase.createClient(SB_URL,SB_KEY);}catch(e){return;}
  recovering=/[#&]type=recovery/.test(location.hash);
  sb.auth.getSession().then(({data})=>{if(data&&data.session){if(recovering)showRecover();else sbReady(data.session);}else showAuth();});
  sb.auth.onAuthStateChange((_e,session)=>{if(_e==='PASSWORD_RECOVERY'){recovering=true;showRecover();return;}if(session){if(!sbUser&&!recovering)sbReady(session);}else{authLocked=true;clearTimeout(sync.timer);clearTimeout(sync.retryT);sbUser=null;backend=null;myOwner=null;if(!recovering)showAuth();}});
}

let recovering=false;
const EYE='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYEOFF='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.8 10.8 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/></svg>';
function pwEye(id){const i=document.getElementById(id);if(!i||i.parentNode.classList.contains('pw'))return;
  const w=document.createElement('span');w.className='pw';i.parentNode.insertBefore(w,i);w.appendChild(i);
  const b=document.createElement('button');b.type='button';b.className='pwb';b.setAttribute('aria-label','Mostrar contraseña');b.setAttribute('aria-pressed','false');b.innerHTML=EYE;w.appendChild(b);
  b.addEventListener('click',()=>{const show=i.type==='password';i.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');b.innerHTML=show?EYEOFF:EYE;i.focus();});}

const sbErr=m=>{m=String(m||'');
  if(/invalid login credentials/i.test(m))return 'Correo o contraseña incorrectos.';
  if(/email not confirmed/i.test(m))return 'Falta confirmar tu correo. Revisa tu bandeja y vuelve a entrar.';
  if(/already registered|already been registered/i.test(m))return 'Ese correo ya tiene cuenta. Entra o recupera tu contraseña.';
  if(/weak|pwned|easy to guess|compromised|known to be/i.test(m))return 'Esa contraseña es muy común o apareció en filtraciones. Elige otra más larga.';
  if(/rate limit|too many|security purposes/i.test(m))return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
  if(/password should be at least/i.test(m))return 'La contraseña debe tener al menos 8 caracteres.';
  // beta por invitación: el servidor rechaza correos sin aprobar (supabase/invitaciones.sql)
  if(/database error saving new user|beta cerrada|registros están cerrados/i.test(m))return 'MiS²oles está en beta cerrada y este correo aún no tiene invitación. Anótate en la lista de espera (zzorgh.github.io/mis-finanzas/inicio) y te avisamos.';
  try{console.warn('[sbErr]',m);}catch(x){}
  return 'No pudimos completar la acción. Inténtalo de nuevo en un momento.';};
async function sbForgot(email,msgEl,btn){
  if(!sb)return;msgEl.className='ms err';
  if(!email){msgEl.textContent='Escribe tu correo arriba y vuelve a tocar aquí.';return;}
  if(btn)btn.disabled=true;
  try{const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(r.error&&/rate limit|too many|security purposes/i.test(r.error.message||'')){msgEl.textContent=sbErr(r.error.message);return;}
    msgEl.className='ms';msgEl.textContent='Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también tu spam.';
  }catch(e){msgEl.textContent='No se pudo conectar. Revisa tu internet.';}
  finally{if(btn)btn.disabled=false;}
}
function showRecover(){
  hideAuth();
  const bg=document.createElement('div');bg.id='authbg';bg.className='authbg';bg.setAttribute('role','region');bg.setAttribute('aria-label','MiSoles');
  bg.innerHTML=`<form class="authbox" id="rcbox" novalidate><div class="authlogo" aria-hidden="true">S/</div><h2>Crea tu contraseña nueva</h2><p class="ms">Elige una contraseña de 8 caracteres o más que no uses en otro sitio.</p>
    <label class="fld">Contraseña nueva<input type="password" id="rc-p1" autocomplete="new-password" minlength="8" required></label>
    <label class="fld">Repítela<input type="password" id="rc-p2" autocomplete="new-password" minlength="8" required></label>
    <div class="ms err" id="rc-msg" role="status"></div>
    <button class="b p" type="submit" id="rc-go">Guardar contraseña</button></form>`;
  document.body.appendChild(bg);pwEye('rc-p1');pwEye('rc-p2');
  const g=id=>document.getElementById(id);
  g('rcbox').addEventListener('submit',async e=>{e.preventDefault();
    const p1=g('rc-p1').value,p2=g('rc-p2').value,msg=g('rc-msg');msg.className='ms err';
    if(p1.length<8){msg.textContent='Usa 8 caracteres o más.';return;}
    if(p1!==p2){msg.textContent='Las dos contraseñas no coinciden.';return;}
    g('rc-go').disabled=true;
    try{if(await pwFiltrada(p1)){msg.textContent=T(PW_FILTRADA);g('rc-go').disabled=false;return;}
      const r=await sb.auth.updateUser({password:p1});
      if(r.error){msg.textContent=sbErr(r.error.message);g('rc-go').disabled=false;return;}
      recovering=false;try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}
      const s=await sb.auth.getSession();if(s&&s.data&&s.data.session)sbReady(s.data.session);else{hideAuth();showAuth();}
    }catch(er){msg.textContent='No se pudo conectar. Revisa tu internet.';g('rc-go').disabled=false;}
  });
  g('rc-p1').focus();
}
async function sbDelete(btn){
  const msg=document.getElementById('del-msg');if(!sb||!sbUser||!msg)return;
  msg.className='ms err';btn.disabled=true;msg.textContent='Eliminando…';
  try{
    const r=await sb.rpc('delete_my_account');
    if(r.error){msg.textContent='No se pudo eliminar tu cuenta. Inténtalo de nuevo en un momento.';btn.disabled=false;return;}
    try{await sb.auth.signOut();}catch(e){}
    try{Object.keys(localStorage).filter(k=>k.indexOf('mis-finanzas')===0).forEach(k=>localStorage.removeItem(k));}catch(e){}
    location.reload();
  }catch(e){msg.textContent='No se pudo conectar. Revisa tu internet.';btn.disabled=false;}
}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='del-txt'){const b=document.getElementById('del-go');if(b)b.disabled=!/^(ELIMINAR|DELETE)$/.test(e.target.value.trim().toUpperCase());}});
/* Los datos guardados en el navegador llevan la marca de su dueño. Si entra otra cuenta en este equipo,
   se descartan sin subirlos; así nunca pasan a la cuenta equivocada. Sin marca (datos de antes de iniciar
   sesión), los adopta la primera cuenta que entra. Tema y estilo se conservan porque no son datos personales. */
const OKEY=KEY+'-owner',KEEPK=[KEY+'-skin',KEY+'-tema'];
/* Varias pestañas: si otra pestaña cambia los datos, esta los adopta (antes se pisaban y se perdía lo de una);
   si otra pestaña cierra sesión o entra otra cuenta, esta se recarga y deja de guardar. */
let myOwner=null,extRaw=null;
window.addEventListener('storage',e=>{
  if(e.storageArea!==localStorage)return;
  if(e.key===OKEY&&myOwner&&e.newValue!==myOwner){authLocked=true;location.reload();return;}
  if(e.key===KEY&&e.newValue&&!authLocked){extRaw=e.newValue;applyExternal();}
});
function adoptRaw(raw){
  const j=JSON.parse(raw);if(!(j&&j.v===1&&j.S&&j.cfg))return false;
  S=saneS(j.S);cfg=saneCfg(j.cfg);myRev=revOf(raw);lastUndo=null;
  YEARS.forEach(y=>{if(!S[y])S[y]=Array.from({length:12},blank);});
  applyBanks();
  if(!S[year])year=YEARS[YEARS.length-1];
  try{const s=JSON.parse(localStorage.getItem(SKEY)||'null');if(s){sync.stamp=s.stamp||sync.stamp;sync.dirty=!!s.dirty;}}catch(x){}
  return true;
}
function applyExternal(){
  if(!extRaw||tabClash)return;
  const a=document.activeElement,typing=document.hasFocus()&&a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if(typing||ssT||document.getElementById('sheet')||sync.busy)return;
  const raw=extRaw;extRaw=null;
  try{if(adoptRaw(raw))render();}catch(x){}
}
/* Al guardar desde el registro: si otra pestaña cambió algo, se parte de lo más nuevo. Al editar una fila, solo si esa fila sigue igual. */
function adoptForSheet(){
  if(!extRaw||tabClash||ssT||sync.busy)return;
  try{
    const j=JSON.parse(extRaw);
    if(ent&&ent.edit){const q=ent.edit,a=((S[q.yr]||[])[q.mo]||{})[q.s],b=((j.S[q.yr]||[])[q.mo]||{})[q.s];
      if(!a||!b||JSON.stringify(a[q.i])!==JSON.stringify(b[q.i]))return;}
    if(adoptRaw(extRaw))extRaw=null;
  }catch(x){}
}
function tabConflict(){
  tabClash=true;clearTimeout(sync.timer);if(sync.state==='saving')sync.state='dirty';updateChip();
  if(document.getElementById('tabwarn')||!document.body)return;
  const b=document.createElement('div');b.id='tabwarn';b.className='savewarn';b.setAttribute('role','alert');
  b.innerHTML='<span><b>'+T('Tus datos cambiaron en otra pestaña.')+'</b> '+T('Para no perder nada, todavía no guardé lo de aquí. ¿Con cuál te quedas?')+'</span><span class="tabbtns"><button class="b" type="button" data-tabc="suya">'+T('Usar lo de la otra pestaña')+'</button><button class="b" type="button" data-tabc="mia">'+T('Conservar lo de aquí')+'</button></span>';
  document.body.appendChild(b);
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-tabc]');if(!b)return;
  const w=document.getElementById('tabwarn');if(w)w.remove();tabClash=false;extRaw=null;
  let raw=null;try{raw=localStorage.getItem(KEY);}catch(x){}
  if(b.dataset.tabc==='mia'){myRev=revOf(raw);localSave();queueSync();toast('Se conservaron los datos de esta pestaña.');return;}
  try{if(raw&&adoptRaw(raw)){if(document.getElementById('sheet'))closeSheet();render();queueSync();toast('Se cargaron los datos de la otra pestaña.');}}catch(x){}
});
setInterval(applyExternal,600);
function wipeLocal(){try{if('caches' in window)caches.delete('misoles-share').catch(()=>{});}catch(e){}try{Object.keys(localStorage).filter(k=>k.indexOf(KEY)===0&&KEEPK.indexOf(k)<0).forEach(k=>localStorage.removeItem(k));}catch(e){}}
function foreignDirty(){try{const s=JSON.parse(localStorage.getItem(SKEY)||'null');return !!(s&&s.dirty);}catch(e){return false;}}
function showForeign(session){
  authLocked=true;if(document.getElementById('foreignbg'))return;
  const bg=document.createElement('div');bg.id='foreignbg';bg.className='authbg';bg.style.zIndex='70';bg.setAttribute('role','region');bg.setAttribute('aria-label','MiSoles');
  bg.innerHTML='<div class="authbox"><div class="authlogo" aria-hidden="true">S/</div><h2>'+T('Hay cambios sin subir de otra cuenta')+'</h2><p class="ms">'+T('Alguien usó este navegador con otra cuenta y sus últimos cambios no llegaron a guardarse en la nube. Por privacidad no se muestran ni pasan a tu cuenta.')+'</p><button class="b p" type="button" id="fg-back">'+T('Volver para que esa persona entre')+'</button><button class="b" type="button" id="fg-del" style="width:100%;margin-top:8px">'+T('Borrar esos cambios y continuar')+'</button></div>';
  document.body.appendChild(bg);
  bg.querySelector('#fg-back').onclick=async()=>{try{await sb.auth.signOut({scope:'local'});}catch(e){}location.reload();};
  bg.querySelector('#fg-del').onclick=()=>{if(!confirm(T('Se borrarán para siempre los cambios sin subir de la otra cuenta. ¿Continuar?')))return;wipeLocal();try{localStorage.setItem(OKEY,session.user.id);}catch(e){}location.reload();};
  bg.querySelector('#fg-back').focus();
}
/* Verificación en dos pasos. Quien la activó debe llegar a aal2: la base lo exige (supabase/mfa.sql) y esta pantalla lo pide.
   Se decide con la sesión ya guardada, sin esperar a la red. No hay códigos de recuperación: la clave se muestra al activar. */
let mfaFactor=null;
const jwtAal=s=>{try{return JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal||'aal1';}catch(e){return 'aal1';}};
const mfaVerif=s=>((s&&s.user&&s.user.factors)||[]).filter(f=>f.status==='verified'&&f.factor_type==='totp');
const mfaFalta=s=>mfaVerif(s).length>0&&jwtAal(s)!=='aal2';
const mfaErr=e=>{const m=String((e&&e.message)||''),st=e&&e.status;if(st===429||/rate|too many/i.test(m))return T('Demasiados intentos. Espera un momento y prueba otra vez.');if(/invalid|expired|code/i.test(m))return T('Ese código no es correcto o ya venció. Prueba con el siguiente.');return T('No se pudo conectar. Revisa tu internet.');};
const mfaBox=(id,inner)=>{const old=document.getElementById(id);if(old)old.remove();const bg=document.createElement('div');bg.id=id;bg.className='authbg';bg.style.zIndex='72';bg.setAttribute('role','region');bg.setAttribute('aria-label','MiSoles');bg.innerHTML='<form class="authbox" novalidate><div class="authlogo" aria-hidden="true">S/</div>'+inner+'</form>';document.body.appendChild(bg);return bg;};
const mfaCampo=()=>'<label class="fld">'+T('Código de 6 dígitos')+'<input class="mfacode" id="mfa-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" required></label><div class="ms err" id="mfa-msg" role="alert"></div>';
const mfaCode=bg=>{const i=bg.querySelector('#mfa-code');i.addEventListener('input',()=>{i.value=i.value.replace(/\D/g,'').slice(0,6);});return i;};
function showMfaLogin(session){
  authLocked=true;if(document.getElementById('mfabg'))return;
  const f=mfaVerif(session)[0];
  const bg=mfaBox('mfabg','<h2>'+T('Escribe tu código')+'</h2><p class="ms">'+T('Ábrelo en tu app autenticadora. Cambia cada 30 segundos.')+'</p>'+mfaCampo()+'<button class="b p" type="submit" id="mfa-go">'+T('Entrar')+'</button><button class="b" type="button" id="mfa-out">'+T('Salir')+'</button><p class="ms">'+T('¿Perdiste tu celular? Escríbenos al correo de la')+' <a href="legal.html#privacidad" target="_blank" rel="noopener">'+T('política de privacidad')+'</a>.</p>');
  const i=mfaCode(bg),msg=bg.querySelector('#mfa-msg'),go=bg.querySelector('#mfa-go');
  bg.querySelector('#mfa-out').onclick=async()=>{try{await sb.auth.signOut({scope:'local'});}catch(e){}location.reload();};
  bg.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();msg.textContent='';
    if(i.value.length!==6){msg.textContent=T('Escribe los 6 dígitos.');return;}
    go.disabled=true;
    try{const r=await sb.auth.mfa.challengeAndVerify({factorId:f.id,code:i.value});if(r.error)throw r.error;
      const s=await sb.auth.getSession();bg.remove();if(!sbUser&&s&&s.data&&s.data.session)sbReady(s.data.session);
    }catch(er){msg.textContent=mfaErr(er);i.value='';i.focus();go.disabled=false;}
  });
  i.focus();
}
async function showMfaEnroll(){
  let fid=null;
  try{
    const l=await sb.auth.mfa.listFactors();if(l.error)throw l.error;
    for(const x of (l.data.all||[]))if(x.status!=='verified'){const u=await sb.auth.mfa.unenroll({factorId:x.id});if(u.error)throw u.error;}
    const r=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'MiSoles '+Date.now(),issuer:'MiSoles'});if(r.error)throw r.error;
    fid=r.data.id;
    const bg=mfaBox('mfaset','<h2>'+T('Activa la verificación en dos pasos')+'</h2><p class="ms">'+T('1. Escanea este código con Google Authenticator, Microsoft Authenticator o similar.')+'</p><img class="mfaqr" id="mfa-qr" alt="'+T('Código QR para tu app autenticadora')+'"><p class="ms">'+T('2. Guarda esta clave en un lugar seguro. Si pierdes tu celular, te permite recuperar los códigos.')+'</p><div class="mfakey" id="mfa-key"></div><button class="b" type="button" id="mfa-copy">'+T('Copiar clave')+'</button><label class="chk"><input type="checkbox" id="mfa-saved"> '+T('Ya guardé mi clave')+'</label><p class="ms">'+T('3. Escribe el código que muestra tu app.')+'</p>'+mfaCampo()+'<button class="b p" type="submit" id="mfa-go" disabled>'+T('Activar')+'</button><button class="b" type="button" id="mfa-cancel">'+T('Cancelar')+'</button>');
    const qr=String(r.data.totp.qr_code||'');if(qr.indexOf('data:image/svg+xml')===0)bg.querySelector('#mfa-qr').src=qr;
    const sec=String(r.data.totp.secret||'');bg.querySelector('#mfa-key').textContent=sec;
    const i=mfaCode(bg),msg=bg.querySelector('#mfa-msg'),go=bg.querySelector('#mfa-go'),chk=bg.querySelector('#mfa-saved');
    const upd=()=>{go.disabled=!(chk.checked&&i.value.length===6);};i.addEventListener('input',upd);chk.addEventListener('change',upd);
    bg.querySelector('#mfa-copy').onclick=async e=>{try{await navigator.clipboard.writeText(sec);e.target.textContent=T('Copiada');}catch(x){}};
    bg.querySelector('#mfa-cancel').onclick=async()=>{try{await sb.auth.mfa.unenroll({factorId:fid});}catch(x){}bg.remove();};
    bg.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();if(go.disabled)return;msg.textContent='';go.disabled=true;
      try{const v=await sb.auth.mfa.challengeAndVerify({factorId:fid,code:i.value});if(v.error)throw v.error;mfaFactor=fid;bg.remove();render();toast('Verificación en dos pasos activada.');}
      catch(er){msg.textContent=mfaErr(er);i.value='';i.focus();}
    });
    bg.querySelector('#mfa-qr').scrollIntoView({block:'nearest'});
  }catch(e){if(fid){try{await sb.auth.mfa.unenroll({factorId:fid});}catch(x){}}toast(T('No se pudo iniciar la activación. Intenta otra vez.'));}
}
function showMfaOff(){
  const fid=mfaFactor;if(!fid)return;
  const bg=mfaBox('mfaset','<h2>'+T('Desactivar la verificación en dos pasos')+'</h2><p class="ms">'+T('Tu cuenta quedará protegida solo con tu contraseña. Para confirmar, escribe tu código.')+'</p>'+mfaCampo()+'<button class="b danger" type="submit" id="mfa-go">'+T('Desactivar')+'</button><button class="b" type="button" id="mfa-cancel">'+T('Cancelar')+'</button>');
  const i=mfaCode(bg),msg=bg.querySelector('#mfa-msg'),go=bg.querySelector('#mfa-go');
  bg.querySelector('#mfa-cancel').onclick=()=>bg.remove();
  bg.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();msg.textContent='';
    if(i.value.length!==6){msg.textContent=T('Escribe los 6 dígitos.');return;}
    go.disabled=true;
    try{const v=await sb.auth.mfa.challengeAndVerify({factorId:fid,code:i.value});if(v.error)throw v.error;
      const u=await sb.auth.mfa.unenroll({factorId:fid});if(u.error)throw u.error;
      try{await sb.auth.refreshSession();}catch(x){}
      mfaFactor=null;bg.remove();render();toast('Verificación en dos pasos desactivada.');
    }catch(er){msg.textContent=mfaErr(er);i.value='';i.focus();go.disabled=false;}
  });
  i.focus();
}
/* Recordatorios push. La notificación llega sin contenido y el texto lo pone sw.js: el servicio push no ve datos de la persona.
   En la nube solo está la dirección push del dispositivo, la frecuencia y la hora (supabase/recordatorios.sql). */
const REC_KEY=KEY+'-recordatorio',REC_URL=SB_URL+'/functions/v1/recordatorios',REC_DIAS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
function recPref(){let o=null;try{o=JSON.parse(localStorage.getItem(REC_KEY)||'null');}catch(e){}o=o&&typeof o==='object'?o:{};const h=+o.h,d=+o.d;
  return{on:o.on===true,f:o.f==='semanal'?'semanal':'diario',h:Number.isInteger(h)&&h>=6&&h<=22?h:20,d:Number.isInteger(d)&&d>=0&&d<=6?d:0,ep:typeof o.ep==='string'?o.ep:''};}
const recSet=p=>{try{localStorage.setItem(REC_KEY,JSON.stringify(p));}catch(e){}};
const recListo=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const recIos=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const recInstalada=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}};
function recHtml(){
  if(!sbUser||!sb)return'';const p=recPref();
  const head=b=>'<div class="mfast" id="recbox"><b>'+(p.on?'Recordatorios: activados':'Recordatorios: desactivados')+'</b>'+b+'</div>';
  if(!recListo())return head('<div class="ms">'+(recIos()&&!recInstalada()?'En iPhone, primero instala la app: Compartir → «Agregar a inicio». Luego ábrela desde ese ícono.':'Este navegador no permite notificaciones.')+'</div>');
  if(Notification.permission==='denied')return head('<div class="ms">Bloqueaste las notificaciones. Para usarlas, permítelas en la configuración del sitio en tu navegador.</div>');
  const op=(v,l,s)=>'<option value="'+v+'"'+(v===s?' selected':'')+'>'+l+'</option>';
  const horas=[];for(let h=6;h<=22;h++)horas.push(op(h,h+':00',p.h));
  return head('<div class="ms">Te avisamos en este dispositivo para que anotes tus gastos. La notificación no lleva montos ni datos tuyos.</div><div class="recsel"><label>Frecuencia<select id="rec-f">'+op('diario','Cada día',p.f)+op('semanal','Cada semana',p.f)+'</select></label>'
    +(p.f==='semanal'?'<label>Día<select id="rec-d">'+REC_DIAS.map((n,i)=>op(i,n,p.d)).join('')+'</select></label>':'')+'<label>Hora<select id="rec-h">'+horas.join('')+'</select></label></div>'
    +(p.f==='diario'?'<div class="ms">Si ya usaste la app ese día, no te avisamos.</div>':'')+'<div class="qa">'+(p.on?'<button class="b" id="rec-off" type="button">Desactivar</button>':'<button class="b" id="rec-on" type="button">Activar</button>')+'</div>');
}
const recB64=s=>{const b=atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0));};
const recReg=()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,no)=>setTimeout(()=>no(new Error('sw')),6000))]);
const recPrefSw=async p=>{try{const c=await caches.open('misoles-pref');await c.put('./__pref',new Response(JSON.stringify({l:LANG,f:p.f})));}catch(e){}};
async function recSub(reg){
  const r=await fetch(REC_URL,{credentials:'omit'});if(!r.ok)throw new Error('clave');const k=recB64((await r.json()).k);
  let s=await reg.pushManager.getSubscription();
  if(s){const o=s.options&&s.options.applicationServerKey,a=o?new Uint8Array(o):null;if(!a||a.length!==k.length||a.some((x,i)=>x!==k[i])){await s.unsubscribe();s=null;}}
  return s||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:k});
}
const recRpc=async(fn,args)=>{const r=await sb.rpc(fn,args);if(r.error)throw r.error;};
const recGuardar=(ep,p)=>recRpc('recordatorio_guardar',{p_endpoint:ep,p_frecuencia:p.f,p_hora:p.h,p_dia:p.d});
async function recActivar(){
  const btn=document.getElementById('rec-on');if(btn)btn.disabled=true;let s=null,nueva=false;const p=recPref();
  try{
    if(await Notification.requestPermission()!=='granted'){render();toast(T('Sin tu permiso no podemos avisarte.'));return;}
    const reg=await recReg();nueva=!(await reg.pushManager.getSubscription());s=await recSub(reg);await recGuardar(s.endpoint,p);
    p.on=true;p.ep=s.endpoint;recSet(p);await recPrefSw(p);render();toast('Recordatorios activados.');track('atajo','recordatorio');
  }catch(e){if(s&&nueva){try{await s.unsubscribe();}catch(x){}}render();toast(T('No se pudo activar. Revisa tu internet e intenta otra vez.'));}
}
async function recDesactivar(){
  const btn=document.getElementById('rec-off');if(btn)btn.disabled=true;const p=recPref();
  try{let s=null;try{s=await (await recReg()).pushManager.getSubscription();}catch(e){}const ep=(s&&s.endpoint)||p.ep;if(ep)await recRpc('recordatorio_quitar',{p_endpoint:ep});if(s)await s.unsubscribe();p.on=false;p.ep='';recSet(p);render();toast('Recordatorios desactivados.');}
  catch(e){render();toast(T('No se pudo desactivar. Revisa tu internet e intenta otra vez.'));}
}
/* Al cerrar sesión el dispositivo deja de recibir avisos de esa cuenta. */
async function recBaja(){
  const p=recPref();if(!p.on||!recListo())return;
  await Promise.race([(async()=>{try{const s=await (await recReg()).pushManager.getSubscription();const ep=(s&&s.endpoint)||p.ep;if(ep)await recRpc('recordatorio_quitar',{p_endpoint:ep});if(s)await s.unsubscribe();}catch(e){}})(),new Promise(ok=>setTimeout(ok,3000))]);
}
/* Al abrir: la dirección push puede cambiar, el permiso se puede retirar y otra cuenta pudo dejar este navegador suscrito. */
async function recSync(){
  try{
    if(!sbUser||!recListo())return;const p=recPref(),reg=await recReg();let s=await reg.pushManager.getSubscription();
    if(!p.on){if(s)await s.unsubscribe();return;}
    if(Notification.permission!=='granted'){if(p.ep)await recRpc('recordatorio_quitar',{p_endpoint:p.ep});if(s)await s.unsubscribe();p.on=false;p.ep='';recSet(p);if(document.getElementById('recbox'))render();return;}
    if(!s)s=await recSub(reg);
    if(s.endpoint!==p.ep){const old=p.ep;await recGuardar(s.endpoint,p);if(old)await recRpc('recordatorio_quitar',{p_endpoint:old});p.ep=s.endpoint;recSet(p);}
    await recPrefSw(p);
  }catch(e){}
}
document.addEventListener('change',async e=>{const id=e.target&&e.target.id;if(id!=='rec-f'&&id!=='rec-h'&&id!=='rec-d')return;const p=recPref(),a=Object.assign({},p);
  if(id==='rec-f')p.f=e.target.value==='semanal'?'semanal':'diario';else if(id==='rec-h')p.h=+e.target.value;else p.d=+e.target.value;recSet(p);
  if(p.on&&p.ep){try{await recGuardar(p.ep,p);await recPrefSw(p);toast('Recordatorio actualizado.');}catch(x){recSet(a);toast(T('No se pudo guardar el cambio. Intenta otra vez.'));}}
  render();});
/* Contraseñas filtradas (gratis, sin plan Pro): solo salen los 5 primeros caracteres del hash SHA-1, nunca la contraseña.
   Si el servicio no responde, no se bloquea a la persona. */
async function pwFiltrada(p){
  try{
    if(!(window.crypto&&crypto.subtle))return false;
    const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(p)))).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
    const c=new AbortController(),to=setTimeout(()=>c.abort(),4000);
    let r;try{r=await fetch('https://api.pwnedpasswords.com/range/'+h.slice(0,5),{headers:{'Add-Padding':'true'},signal:c.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});}finally{clearTimeout(to);}
    if(!r.ok)return false;
    const suf=h.slice(5);return (await r.text()).split('\n').some(l=>{const a=l.trim().split(':');return a[0]===suf&&+a[1]>0;});
  }catch(e){return false;}
}
/* getUser con el token explícito no toma el candado de auth, así que es seguro dentro de onAuthStateChange. Sin red, sigue: la base protege igual. */ async function mfaRemoto(s){try{if(jwtAal(s)==='aal2'||!sb.auth.getUser)return null;const r=await Promise.race([sb.auth.getUser(s.access_token),new Promise(ok=>setTimeout(()=>ok(null),3000))]);const u=r&&r.data&&r.data.user;return u&&mfaVerif({user:u}).length?u:null;}catch(e){return null;}} const PW_FILTRADA='Esa contraseña apareció en filtraciones de datos. Elige otra que no uses en ningún sitio.';
function sbReady(session){
  if(mfaFalta(session)){showMfaLogin(session);return;}
  {const mb=document.getElementById('mfabg');if(mb)mb.remove();}
  mfaFactor=(mfaVerif(session)[0]||{}).id||null;
  let prev=null;try{prev=localStorage.getItem(OKEY);}catch(e){}
  if(prev&&prev!==session.user.id&&foreignDirty()){showForeign(session);return;}
  if(prev&&prev!==session.user.id){wipeLocal();try{localStorage.setItem(OKEY,session.user.id);}catch(e){}location.reload();return;}
  if(!prev){try{localStorage.setItem(OKEY,session.user.id);}catch(e){}}
  authLocked=false;myOwner=session.user.id;
  sbUser=session.user;backend=supabaseBackend;sync.connected=true;hideAuth();updateChip();mfaRemoto(session).then(u=>{if(u){sbUser=null;backend=null;sync.connected=false;updateChip();showMfaLogin(Object.assign({},session,{user:u}));return;}if(document.getElementById('sb-logout'))render();Promise.resolve(loadFromSheet(true)).then(()=>{recSync();try{if(!cfg.onb&&toRows().length===0)showOnboard();else shareAbrir().then(a=>{if(!a)setTimeout(ofrecerInstalar,1500);});}catch(e){}});});}
async function sbAuth(mode,email,pass,msgEl,btn){
  if(!sb)return;msgEl.className='ms err';msgEl.textContent='';if(btn)btn.disabled=true;
  try{
    if(mode==='signup'&&await pwFiltrada(pass)){msgEl.textContent=T(PW_FILTRADA);return;}
    const r=mode==='signup'?await sb.auth.signUp({email,password:pass,options:{emailRedirectTo:location.origin+location.pathname}}):await sb.auth.signInWithPassword({email,password:pass});
    if(r.error){msgEl.textContent=sbErr(r.error.message);return;}
    if(mode==='signup'&&r.data&&!r.data.session){showAuth('signin',email,'Cuenta creada. Te enviamos un correo para confirmarla: ábrelo y luego entra aquí.');return;}
  }catch(e){msgEl.textContent='No se pudo conectar. Revisa tu internet.';}
  finally{if(btn)btn.disabled=false;}
}
/* Acceso: dos vistas en la misma caja. «Crear cuenta» abre su propio formulario (con repetir contraseña).
   El enlace #crear abre directo el registro (útil para el mensaje de invitación). */
function showAuth(mode,email,note){
  let bg=document.getElementById('authbg');
  if(bg&&!mode)return;
  if(!mode)mode=location.hash==='#crear'?'signup':'signin';
  if(!bg){bg=document.createElement('div');bg.id='authbg';bg.className='authbg';bg.setAttribute('role','region');bg.setAttribute('aria-label','MiSoles');document.body.appendChild(bg);}
  const up=mode==='signup';
  const legal='<p class="ms legalnote">Al crear tu cuenta aceptas los <a href="legal.html#terminos" target="_blank" rel="noopener">Términos</a> y la <a href="legal.html#privacidad" target="_blank" rel="noopener">Política de privacidad</a>.</p>';
  bg.classList.add('split');
  bg.innerHTML='<aside class="authside" aria-hidden="true"><b class="wm"><i>S/</i><span>Mi<span class="sw">S<sup class="sq">2</sup></span>oles</span></b><h2><span class="l1">Tus cuentas,</span> <span class="l2">cuadradas</span> <span class="l3">al céntimo.</span></h2><div class="boleta"><b>Mi<span class="sw">S<sup class="sq">2</sup></span>oles</b><span class="sub">Noviembre, datos de ejemplo</span><hr><div><span>Sueldo</span><span>+5,300.00</span></div><div><span>Almuerzo</span><span>−25.00</span></div><div><span>Menú del día</span><span>−18.00</span></div><hr><div class="btot"><span>Tienes</span><span>S/ 778.00</span></div></div></aside>'+(up
   ?`<form class="authbox" id="authbox" novalidate><div class="authlogo" aria-hidden="true">S/</div><h2>Crea tu cuenta</h2><p class="ms">MiS²oles está en beta: usa el correo con el que te anotaste en la lista de espera.</p>
    <label class="fld">Correo<input type="email" id="au-email" autocomplete="username" required></label>
    <label class="fld">Contraseña<input type="password" id="au-pass" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required></label>
    <label class="fld">Repite la contraseña<input type="password" id="au-pass2" autocomplete="new-password" required></label>
    <div class="ms err" id="au-msg" role="status"></div>
    <button class="b p" type="submit" id="au-go">Crear cuenta</button>
    <button class="lnk" type="button" id="au-sw">¿Ya tienes cuenta? Entra</button>${legal}<button class="lnk" type="button" data-lang-toggle data-notr>${langTxt(0)}</button></form>`
   :`<form class="authbox" id="authbox" novalidate><div class="authlogo" aria-hidden="true">S/</div><h2 aria-label="MiSoles">Mi<span class="sw">S<sup class="sq">2</sup></span>oles</h2><p class="ms">Entra con tu cuenta para ver tus finanzas en cualquier dispositivo.</p>
    <label class="fld">Correo<input type="email" id="au-email" autocomplete="username" required></label>
    <label class="fld">Contraseña<input type="password" id="au-pass" autocomplete="current-password" required></label>
    <div class="ms err" id="au-msg" role="status"></div>
    <button class="b p" type="submit" id="au-in">Entrar</button>
    <button class="b" type="button" id="au-up">Crear cuenta</button><button class="lnk" type="button" id="au-fp">¿Olvidaste tu contraseña?</button>${legal}<button class="lnk" type="button" data-lang-toggle data-notr>${langTxt(0)}</button></form>`);
  const g=id=>document.getElementById(id);
  pwEye('au-pass');if(up)pwEye('au-pass2');
  if(email)g('au-email').value=email;
  if(note){g('au-msg').className='ms';g('au-msg').textContent=note;}
  (g('au-sw')||g('au-up')).addEventListener('click',()=>showAuth(up?'signin':'signup',g('au-email').value.trim()));
  g('authbox').addEventListener('submit',e=>{e.preventDefault();
    const em=g('au-email').value.trim(),pw=g('au-pass').value,msg=g('au-msg');
    if(!up){sbAuth('signin',em,pw,msg,g('au-in'));return;}
    msg.className='ms err';
    if(!em||pw.length<8){msg.textContent='Escribe tu correo y una contraseña de 8 caracteres o más.';return;}
    if(pw!==g('au-pass2').value){msg.textContent='Las contraseñas no coinciden.';return;}
    sbAuth('signup',em,pw,msg,g('au-go'));});
  if(!up)g('au-fp').addEventListener('click',()=>sbForgot(g('au-email').value.trim(),g('au-msg'),g('au-fp')));
  (email?g('au-pass'):g('au-email')).focus();
}
/* Instalar en el celular: después de entrar, si es un teléfono y la app no está instalada, se ofrece una vez.
   Android/Chrome: botón que abre el diálogo del navegador. iPhone: instrucciones de «Agregar a inicio». */
let instalarEv=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();instalarEv=e;});
window.addEventListener('appinstalled',()=>{instalarEv=null;const b=document.getElementById('instbar');if(b)b.remove();});
function ofrecerInstalar(){
  const IK=KEY+'-instalar';
  try{if(localStorage.getItem(IK))return;}catch(e){return;}
  const instalada=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
  const movil=window.matchMedia&&matchMedia('(pointer:coarse)').matches&&innerWidth<900;
  if(instalada||!movil||document.getElementById('instbar')||document.getElementById('onbg')||document.getElementById('authbg')||document.getElementById('sheet'))return;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const bar=document.createElement('div');bar.id='instbar';bar.className='instbar';bar.setAttribute('role','dialog');bar.setAttribute('aria-label','Instalar MiS²oles');
  const como=instalarEv?'Ábrela como una app, sin buscar el link.'
    :ios?'Toca el botón Compartir y luego «Agregar a inicio».'
    :'Abre el menú del navegador (⋮) y toca «Instalar app» o «Agregar a la pantalla de inicio».';
  bar.innerHTML=`<div class="authlogo" aria-hidden="true">S/</div><div class="it"><b>Instala MiS²oles en tu celular</b><span>${como}</span></div><div class="ib">${instalarEv?'<button class="b p" type="button" id="inst-si">Instalar</button>':''}<button class="b" type="button" id="inst-no">${instalarEv?'Ahora no':'Entendido'}</button></div>`;
  document.body.appendChild(bar);
  const cerrar=()=>{try{localStorage.setItem(IK,'1');}catch(e){}bar.remove();};
  document.getElementById('inst-no').addEventListener('click',cerrar);
  const si=document.getElementById('inst-si');
  if(si)si.addEventListener('click',async()=>{const ev=instalarEv;instalarEv=null;cerrar();if(ev){ev.prompt();try{await ev.userChoice;}catch(e){}}});
}
function hideAuth(){const e=document.getElementById('authbg');if(e)e.remove();}
Object.assign(I18N_EN,{'Tienes cambios que todavía no se subieron a tu cuenta. Si cierras sesión ahora, se perderán. ¿Cerrar sesión igual?':"You have changes that haven't been uploaded to your account yet. If you sign out now, they will be lost. Sign out anyway?"});
async function sbLogout(){
  if(!sb)return;
  if(sync.dirty&&backend){try{await pushNow(false);}catch(e){}}
  if((sync.dirty||sync.state==='conflict')&&!confirm(T('Tienes cambios que todavía no se subieron a tu cuenta. Si cierras sesión ahora, se perderán. ¿Cerrar sesión igual?')))return;
  await recBaja();
  try{await sb.auth.signOut();}catch(e){}
  wipeLocal();location.reload();
}

/* Reintentos con espera creciente (3, 6, 12… hasta 60 s). No se reintenta lo que no se arregla solo
   (fila demasiado grande, permisos). Además se sube al volver internet y al salir de la pestaña. */
function scheduleRetry(e,fn){
  clearTimeout(sync.retryT);
  const m=String((e&&e.message)||'');
  if(/2900|check constraint|violates|row-level security|llena|demasiado grandes/i.test(m))return;
  sync.fails=(sync.fails||0)+1;
  let d=Math.min(60000,3000*Math.pow(2,sync.fails-1));
  if(e&&e.status===429)d=Math.max(d,30000);
  sync.retryT=setTimeout(()=>{if(backend&&!sync.busy&&sync.state!=='conflict'&&(sync.dirty||!sync.ready))fn();},d);
  sync.msg=(sync.msg?sync.msg+' ':'')+'Se reintentará solo.';
}
function flushSync(){
  if(!backend||sync.busy||sync.state==='conflict'||authLocked||tabClash)return;
  if(sync.ready&&sync.dirty){clearTimeout(sync.timer);clearTimeout(sync.retryT);pushNow(false);}
  else if(!sync.ready&&sync.state==='error'){clearTimeout(sync.retryT);loadFromSheet(true);}
}
window.addEventListener('online',flushSync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSync();});
window.addEventListener('pagehide',flushSync);
async function pushNow(force){
  if(!backend||tabClash)return;if(backend.name==='mcp'&&!sync.id)return;
  if(sync.busy){sync.again=true;return;}
  sync.busy=true;sync.state='saving';updateChip();
  try{
    if(!force){const remote=await backend.stamp();if(remote&&remote!==sync.stamp){sync.state='conflict';sync.msg='Tus datos cambiaron desde otro dispositivo. Usa «Recargar mis datos» para traer esos cambios o «Guardar todo ahora» para conservar los de aquí.';return;}}
    const rev=sync.rev||0;const rows=toRows(backend.name==='sb');
    if(backend.name==='sb'){if(rows.length>8000&&JSON.stringify(rows).length>4000000)throw{code:'tool_error',message:'Tus datos ya son demasiado grandes para guardarse en tu cuenta. Descarga una copia en Ajustes y archiva los años anteriores.'};}
    else if(rows.length>2900)throw{code:'tool_error',message:'La pestaña Registro está llena (más de 2900 filas).'};
    const stamp='v'+Date.now();
    await backend.write(rows,[['cfg',JSON.stringify(cfg)],['layout',JSON.stringify(LAY)],['guardado',stamp]]);
    sync.stamp=stamp;sync.ready=true;sync.connected=true;sync.fails=0;clearTimeout(sync.retryT);const pend=(sync.rev||0)!==rev;sync.dirty=pend;persistSync();
    if(typeof HC!=='undefined')HC=null;
    if(pend){sync.again=true;}else{sync.state='saved';sync.at=Date.now();sync.msg='Guardado en tu cuenta ('+rows.length+' movimientos).';}
  }catch(e){sync.state='error';sync.msg=errMsg(e);scheduleRetry(e,()=>pushNow(false));}
  finally{sync.busy=false;updateChip();if(sync.again){sync.again=false;queueSync();}}
}
async function loadFromSheet(auto){
  if(auto&&sync.dirty&&backend){sync.ready=true;sync.msg='Subiendo cambios que quedaron pendientes…';await pushNow(false);if(sync.state==='conflict'){sync.msg='Tienes cambios en este dispositivo que no se subieron y tu cuenta también cambió desde otro. Tus datos de aquí se conservan: usa «Guardar todo ahora» para guardar estos o «Recargar mis datos» para traer los otros.';updateChip();}render();fxAuto();return;}
  if(!backend){sync.msg='Esta vista guarda tus datos solo en este navegador.';updateChip();return;}
  if(backend.name==='mcp'&&!sync.id){sync.state='error';sync.msg='Escribe el ID de tu hoja.';updateChip();return;}
  clearTimeout(sync.timer);sync.state='loading';updateChip();
  const rev0=sync.rev||0;
  try{
    const d=await backend.read();const rows=(Array.isArray(d.reg)?d.reg:[]).filter(Array.isArray);
    if((sync.rev||0)!==rev0){sync.ready=true;sync.dirty=true;persistSync();sync.msg='Seguiste editando mientras se cargaban tus datos: se conservaron tus cambios de aquí.';await pushNow(false);if(sync.state==='conflict'){sync.msg='Seguiste editando mientras se cargaban tus datos y tu cuenta también tenía cambios. Tus datos de aquí se conservan: usa «Guardar todo ahora» para guardar estos o «Recargar mis datos» para traer los otros.';}updateChip();return;}
    if(!rows.length){sync.ready=true;sync.msg='Tu cuenta estaba vacía: guardando tus datos…';await pushNow(true);render();toast('Tus datos se guardaron en tu cuenta');return;}
    applyRemote(rows,d.conf||[]);
    sync.ready=true;sync.connected=true;sync.dirty=false;persistSync();
    sync.state='saved';sync.at=Date.now();sync.msg='Datos cargados desde tu cuenta ('+rows.length+' movimientos).';
    render();toast('Datos cargados desde tu cuenta');fxAuto();
  }catch(e){sync.state='error';sync.msg=errMsg(e);updateChip();scheduleRetry(e,()=>loadFromSheet(true));}
}
function initSync(){if(IS_SB)initSupabase();}

