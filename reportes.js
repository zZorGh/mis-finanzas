/* MiS²oles · reportes descargables (Excel y PDF).
   Corre en un Web Worker para que la pantalla no se congele mientras se arma el archivo.
   Si el navegador no permite workers, index.html carga este mismo archivo y lo ejecuta en la página.
   Las librerías (ExcelJS, jsPDF) se verifican con SRI antes de ejecutarse. */
(function(root){
const window=root;
const RLIB={xlsx:['https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'],pdf:['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js']};
const SRI={
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js':'sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js':'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk',
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js':'sha384-fCAW/rDWORTbQXSiB7mOg0QtQ5c+r0f544y6XoKjuVva0nMBlCpNUjiFeG5iMdS3'};
const isWorker=typeof WorkerGlobalScope!=='undefined'&&root instanceof WorkerGlobalScope;
const jsP={};
const NOLIB='No pude cargar lo necesario para crear el reporte. Revisa tu conexión e intenta otra vez.';
async function fromFetch(u){const r=await fetch(u,{integrity:SRI[u],mode:'cors'});if(!r.ok)throw new Error('http '+r.status);(0,eval)(await r.text());}
function fromTag(u){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=u;s.async=false;if(SRI[u]){s.integrity=SRI[u];s.crossOrigin='anonymous';}s.onload=()=>res();s.onerror=()=>{s.remove();rej(new Error(NOLIB));};document.head.appendChild(s);});}
function loadJs(u){return jsP[u]||(jsP[u]=(isWorker?fromFetch(u):fromTag(u)).catch(()=>{delete jsP[u];throw new Error(NOLIB);}));}
async function needLib(k){for(const u of RLIB[k])await loadJs(u);}

/* utilidades que comparten estos reportes con la app (copias mínimas) */
const ISO={'S/':'PEN','$':'USD','€':'EUR'};
const r2=v=>Math.round((+v||0)*100)/100;
const NF2=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const n2=v=>{v=r2(v);return (v<0?'-':'')+NF2.format(Math.abs(v));};
let MES=[],JOB_WHO={nombre:'',correo:''},LG='es';
/* Idioma del reporte: el texto fijo de este archivo y lo que arma la app (tipos, grupos…) se traducen aquí; lo que escribe la persona no. */
const EN_D={"Resumen":"Summary","Mensual":"Monthly","Gastos por concepto":"Spending by item","Gastos por grupo":"Spending by group","Antojos":"Impulse buys","Ahorros":"Savings","Dif. de cambio":"Exchange diff.","Tarjetas":"Cards","Liquidez al cierre":"Cash at closing","Movimientos":"Transactions","Mes":"Month","Ingresos":"Income","Gastos fijos":"Fixed expenses","Gastos variables":"Variable expenses","Total gastos":"Total expenses","Ahorro neto":"Net savings","Inversión":"Investment","Resultado":"Result","Categoría":"Category","Monto (S/)":"Amount (S/)","% del gasto":"% of spending","Grupo":"Group","% del total":"% of total","Fecha":"Date","Concepto":"Item","¿Valió la pena?":"Worth it?","Cuenta":"Account","Saldo inicial":"Opening balance","Depósitos":"Deposits","Retiros":"Withdrawals","Ajustes":"Adjustments","Traspasos":"Transfers","Saldo final":"Closing balance","Tasa":"Rate","Ganancia estimada 12 meses":"Estimated 12-month earnings","Tarjeta":"Card","Moneda":"Currency","Consumos del período":"Purchases in period","Pagos del período":"Payments in period","Deuda al cierre":"Debt at closing","Deuda al cierre (S/)":"Debt at closing (S/)","Saldo":"Balance","Saldo (S/)":"Balance (S/)","Tipo":"Type","Sentido":"Direction","Cuenta o medio":"Account or method","Monto original":"Original amount","Tipo de cambio":"Exchange rate","Estado de cuenta personal":"Personal account statement","Titular":"Holder","Correo":"Email","Período":"Period","Moneda de reporte":"Report currency","Soles peruanos (PEN)":"Peruvian soles (PEN)","Fecha de emisión":"Issue date","(sin nombre)":"(no name)","Ingresos totales":"Total income","Total de gastos":"Total expenses","Ahorro neto del período":"Net savings for the period","Resultado del período (ingresos − gastos − ahorro − inversión)":"Result for the period (income − expenses − savings − investment)","Saldo total en cuentas de ahorro al cierre":"Total balance in savings accounts at closing","Deuda total en tarjetas de crédito al cierre":"Total credit card debt at closing","Liquidez disponible al cierre":"Cash available at closing","Tasa de ahorro e inversión (% del ingreso)":"Savings and investment rate (% of income)","Cómo leer este reporte:":"How to read this report:","• «Mensual» resume cada mes; «Movimientos» trae el detalle con fecha, grupo y cuenta.":"• “Monthly” summarizes each month; “Transactions” has the detail with date, category and account.","• Gastos = gastos fijos (incluye pagos de tarjeta) + gastos variables. Las compras con tarjeta se muestran aparte porque se pagan después.":"• Expenses = fixed expenses (including card payments) + variable expenses. Card purchases are shown separately because they are paid later.","• En «Movimientos», «Monto (S/)» es negativo si es un cargo y positivo si es un abono.":"• In “Transactions”, “Amount (S/)” is negative for a charge and positive for a credit.","• Ahorro neto = depósitos menos retiros de las cuentas de ahorro (los ajustes de saldo no cuentan como ahorro).":"• Net savings = deposits minus withdrawals from savings accounts (balance adjustments do not count as savings).","Documento elaborado por el titular a partir de sus propios registros en MiS²oles. No es un documento emitido por una entidad financiera.":"Document prepared by the holder from their own records in MiS²oles. It is not a document issued by a financial institution.","Montos en otra moneda convertidos a soles con el tipo de cambio de cada mes: ":"Amounts in other currencies converted to soles at each month’s exchange rate: ","Subtotal del grupo":"Group subtotal","Sin responder":"Unanswered","Emitido":"Issued","Moneda: soles (PEN)":"Currency: Peruvian soles (PEN)","Resumen del período":"Period summary","Resumen mensual":"Monthly summary","Cuentas de ahorro":"Savings accounts","Tarjetas de crédito":"Credit cards","Detalle de movimientos":"Transaction detail","Notas":"Notes","Gastos":"Expenses","Mon.":"Cur.","Monto orig.":"Orig. amount","Monto S/":"Amount S/","Deuda en S/":"Debt in S/","Saldo en S/":"Balance in S/","Consumos":"Purchases","Pagos":"Payments","Gastos = gastos fijos (incluye pagos de tarjeta) + gastos variables. Las compras con tarjeta figuran en el detalle como «Cargo a tarjeta» y se cuentan como gasto cuando se pagan.":"Expenses = fixed expenses (including card payments) + variable expenses. Card purchases appear in the detail as “Card charge” and count as an expense when they are paid.","En el detalle, «Monto S/» es negativo cuando es un cargo (gastos, compras con tarjeta, inversión, depósitos a ahorro) y positivo cuando es un abono (ingresos, retiros de ahorro).":"In the detail, “Amount S/” is negative for a charge (expenses, card purchases, investment, savings deposits) and positive for a credit (income, savings withdrawals).","Ingreso":"Income","Entrada":"Inflow","Gasto fijo":"Fixed expense","Salida":"Outflow","Pago de tarjetas":"Card payments","Sin categoría":"Uncategorized","Gasto variable":"Variable expense","Antojo":"Impulse buy","Depósito a ahorro":"Savings deposit","Retiro de ahorro":"Savings withdrawal","Ajuste de saldo de ahorro":"Savings balance adjustment","Traspaso entre cuentas de ahorro":"Transfer between savings accounts","Hacia ahorro":"To savings","Desde ahorro":"From savings","Ajuste":"Adjustment","Interno":"Internal","Cargo a tarjeta":"Card charge","Sin descripción":"No description","Sí":"Yes","No":"No","Necesidades":"Needs","Deseos":"Wants","Ahorro e inversión":"Savings & investment","Pago tarjeta":"Card payment","Ahorro":"Savings"};
const EN_M={Enero:'January',Febrero:'February',Marzo:'March',Abril:'April',Mayo:'May',Junio:'June',Julio:'July',Agosto:'August',Septiembre:'September',Octubre:'October',Noviembre:'November',Diciembre:'December'};
const EN_P=[['Pago de tarjeta ','Card payment '],['Compra con tarjeta ','Card purchase '],['Tarjeta ','Card '],['Meta: ','Goal: '],['Liquidez disponible al cierre de ','Cash available at closing, ']];
function T(s){if(LG!=='en'||typeof s!=='string'||!s)return s;if(EN_D[s]!==undefined)return EN_D[s];
  for(const [es,en] of EN_P)if(s.indexOf(es)===0)return en+T(s.slice(es.length));
  return s.replace(/\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\b/g,x=>EN_M[x]);}
function trR(R){if(LG!=='en')return R;const o=Object.assign({},R);o.label=T(R.label);o.mens=R.mens.map(x=>({...x,per:T(x.per)}));
  o.mov=R.mov.map(x=>({...x,per:T(x.per),tipo:T(x.tipo),sent:T(x.sent),cat:T(x.cat),cuenta:T(x.cuenta),concepto:/^Meta: /.test(x.concepto)?T(x.concepto):x.concepto}));
  o.cat=R.cat.map(x=>({...x,c:T(x.c)}));if(R.grupos)o.grupos=R.grupos.map(g=>({...g,n:T(g.n),l:g.l.map(e=>({...e,c:T(e.c)}))}));
  if(R.ant)o.ant=Object.assign({},R.ant,{list:R.ant.list.map(x=>({...x,per:T(x.per),concepto:T(x.concepto),vp:T(x.vp)}))});return o;}
const perOf=(y,i)=>MES[i]+' '+y;
const dmy=d=>d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear():'';
const repWho=()=>JOB_WHO;

const RNOTE=('Documento elaborado por el titular a partir de sus propios registros en MiS²oles. No es un documento emitido por una entidad financiera.');
function repResumen(R){return [
  [T('Ingresos totales'),R.T.ing],[T('Gastos fijos'),R.T.fij],[T('Gastos variables'),R.T.hor],[T('Total de gastos'),R.T.gas],
  [T('Ahorro neto del período'),R.T.aho],[T('Inversión'),R.T.inv],[T('Resultado del período (ingresos − gastos − ahorro − inversión)'),R.T.res],
  [T('Saldo total en cuentas de ahorro al cierre'),R.ahoTot],[T('Deuda total en tarjetas de crédito al cierre'),R.deudaTot],[T('Liquidez disponible al cierre'),R.liqTot]];}
function fxNote(R){if(!R.fx.length)return '';const by=new Map();R.fx.forEach(x=>{const k=x.cur+' '+(+x.tc).toFixed(3);by.set(k,(by.get(k)||[]).concat(T(x.per)));});
  return T('Montos en otra moneda convertidos a soles con el tipo de cambio de cada mes: ')+[...by.entries()].map(([k,ps])=>(ISO[k.split(' ')[0]]||k.split(' ')[0])+' '+k.split(' ')[1]+' ('+ps.join(', ')+')').join('; ')+'.';}

/* ----- Excel ----- */
async function buildXlsx(R,o){
  await needLib('xlsx');
  const wb=new ExcelJS.Workbook();wb.creator='MiS²oles';wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
  const G='FF0B7A62',W='FFFFFFFF',MON='#,##0.00;[Red]-#,##0.00',who=repWho(),hoy=new Date();
  const hdr=(ws,cols)=>{ws.columns=cols.map(c=>({header:c[0],key:c[1],width:c[2]}));const h=ws.getRow(1);h.font={bold:true,color:{argb:W}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:G}};h.alignment={vertical:'middle',wrapText:true};h.height=30;ws.views=[{state:'frozen',ySplit:1}];};
  const fmtCols=(ws,keys,f)=>keys.forEach(k=>{ws.getColumn(k).numFmt=f||MON;});
  const total=(ws,label,keys,n,vals)=>{const r=ws.addRow({});r.getCell(1).value=label;keys.forEach(k=>{const L=ws.getColumn(k).letter;r.getCell(k).value=n?{formula:'SUM('+L+'2:'+L+(n+1)+')',result:vals[k]}:0;});r.font={bold:true};r.eachCell(c=>{c.border={top:{style:'thin'}};});};
  const setup=(ws,land)=>{ws.pageSetup={paperSize:9,orientation:land?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.4,right:.4,top:.5,bottom:.5,header:.3,footer:.3}};ws.headerFooter={oddFooter:'&L'+who.nombre.replace(/&/g,'&&')+'&CPágina &P de &N&R'+R.label};};
  /* Resumen */
  const s=wb.addWorksheet(T('Resumen'));s.columns=[{width:58},{width:22}];
  s.addRow([T('Estado de cuenta personal')]).font={bold:true,size:16,color:{argb:G}};
  [[T('Titular'),who.nombre||T('(sin nombre)')],who.correo?[T('Correo'),who.correo]:null,[T('Período'),R.label],[T('Moneda de reporte'),T('Soles peruanos (PEN)')],[T('Fecha de emisión'),dmy(hoy)]].filter(Boolean).forEach(r=>{const x=s.addRow(r);x.getCell(1).font={bold:true};});
  s.addRow([]);const hr=s.addRow([T('Concepto'),T('Monto (S/)')]);hr.font={bold:true,color:{argb:W}};hr.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:G}};});
  repResumen(R).forEach(([l,v])=>{const x=s.addRow([l,v]);x.getCell(2).numFmt=MON;});
  if(R.tasa!=null){const x=s.addRow([T('Tasa de ahorro e inversión (% del ingreso)'),R.tasa]);x.getCell(2).numFmt='0.0%';}
  s.addRow([]);[ T('Cómo leer este reporte:'),T('• «Mensual» resume cada mes; «Movimientos» trae el detalle con fecha, grupo y cuenta.'),T('• Gastos = gastos fijos (incluye pagos de tarjeta) + gastos variables. Las compras con tarjeta se muestran aparte porque se pagan después.'),T('• En «Movimientos», «Monto (S/)» es negativo si es un cargo y positivo si es un abono.'),T('• Ahorro neto = depósitos menos retiros de las cuentas de ahorro (los ajustes de saldo no cuentan como ahorro).'),fxNote(R),T(RNOTE)].filter(Boolean).forEach(t=>{const x=s.addRow([t]);x.getCell(1).alignment={wrapText:true};s.mergeCells(x.number,1,x.number,2);x.height=t.length>95?30:16;});
  setup(s,false);
  /* Mensual */
  const me=wb.addWorksheet(T('Mensual'));hdr(me,[[T('Mes'),'per',18],[T('Ingresos'),'ing',14],[T('Gastos fijos'),'fij',14],[T('Gastos variables'),'hor',15],[T('Total gastos'),'gas',14],[T('Ahorro neto'),'aho',14],[T('Inversión'),'inv',13],[T('Resultado'),'res',14]]);
  R.mens.forEach(x=>me.addRow(x));fmtCols(me,['ing','fij','hor','gas','aho','inv','res']);total(me,'Total',['ing','fij','hor','gas','aho','inv','res'],R.mens.length,R.T);setup(me,true);
  /* Categorías */
  const ca=wb.addWorksheet(T('Gastos por concepto'));hdr(ca,[[T('Concepto'),'c',30],[T('Monto (S/)'),'v',16],[T('% del gasto'),'p',12]]);
  R.cat.forEach(x=>ca.addRow({c:x.c,v:x.v,p:R.T.gas?x.v/R.T.gas:0}));fmtCols(ca,['v']);fmtCols(ca,['p'],'0.0%');total(ca,'Total',['v'],R.cat.length,{v:R.cat.reduce((a,x)=>a+x.v,0)});setup(ca,false);
  /* Gastos por grupo */
  if(R.grupos&&R.grupos.length){const gr=wb.addWorksheet(T('Gastos por grupo'));hdr(gr,[[T('Grupo'),'g',24],[T('Concepto'),'c',28],[T('Monto (S/)'),'v',16],[T('% del total'),'p',12]]);
    R.grupos.forEach(g=>{const x=gr.addRow({g:g.n,c:T('Subtotal del grupo'),v:g.t,p:R.gT?g.t/R.gT:0});x.font={bold:true};g.l.forEach(e=>gr.addRow({g:'',c:e.c,v:e.v,p:R.gT?e.v/R.gT:0}));});
    const tr=gr.addRow({g:'Total',c:'',v:R.gT,p:R.gT?1:0});tr.font={bold:true};tr.eachCell(c=>{c.border={top:{style:'thin'}};});fmtCols(gr,['v']);fmtCols(gr,['p'],'0.0%');setup(gr,false);
    const nx=gr.addRow({});nx.getCell(1).value=LG==='en'?'Includes fixed and variable expenses, savings and investment. An older expense with no group counts as a need (fixed) or a want (variable); impulse buys count as wants.':'Incluye gastos fijos, variables, ahorro e inversión. Un gasto antiguo sin grupo cuenta como necesidad (fijos) o deseo (variables); los antojos cuentan como deseo.';nx.getCell(1).alignment={wrapText:true};gr.mergeCells(nx.number,1,nx.number,4);nx.height=30;}
  /* Antojos */
  if(R.ant&&R.ant.list.length){const an=wb.addWorksheet(T('Antojos'));hdr(an,[[T('Fecha'),'fecha',12],[T('Mes'),'per',16],[T('Concepto'),'concepto',34],[T('Monto (S/)'),'sol',14],[T('¿Valió la pena?'),'vp',16]]);
    R.ant.list.forEach(x=>an.addRow(x));fmtCols(an,['sol']);an.getColumn('fecha').numFmt='dd/mm/yyyy';total(an,'Total',['sol'],R.ant.list.length,{sol:R.ant.tot});
    const nx=an.addRow({});nx.getCell(1).value=LG==='en'?'Not worth it: S/ '+R.ant.no.toFixed(2)+' (what you would have saved). Worth it: '+R.ant.si+'. Unanswered: '+R.ant.pend+'.':'No valieron la pena: S/ '+R.ant.no.toFixed(2)+' (lo que habrías ahorrado). Valieron la pena: '+R.ant.si+'. Sin responder: '+R.ant.pend+'.';nx.getCell(1).alignment={wrapText:true};an.mergeCells(nx.number,1,nx.number,5);nx.height=30;setup(an,false);}
  /* Ahorros */
  const hayDc=R.ahorros.some(x=>Math.abs(x.dc)>=.005),ahK=['ini','dep','ret','aj','tr'].concat(hayDc?['dc']:[],['fin','gana']);const ah=wb.addWorksheet(T('Ahorros'));hdr(ah,[[T('Cuenta'),'c',30],[T('Saldo inicial'),'ini',14],[T('Depósitos'),'dep',13],[T('Retiros'),'ret',13],[T('Ajustes'),'aj',12],[T('Traspasos'),'tr',12],...(hayDc?[[T('Dif. de cambio'),'dc',15]]:[]),[T('Saldo final'),'fin',14],[T('Tasa'),'tasa',14],[T('Ganancia estimada 12 meses'),'gana',16]]);
  R.ahorros.forEach(x=>ah.addRow(x));fmtCols(ah,ahK);
  const sv={};ahK.forEach(k=>{sv[k]=R.ahorros.reduce((a,x)=>a+x[k],0);});total(ah,'Total',ahK,R.ahorros.length,sv);setup(ah,true);
  /* Tarjetas */
  const ta=wb.addWorksheet(T('Tarjetas'));hdr(ta,[[T('Tarjeta'),'n',16],[T('Moneda'),'cur',10],[T('Consumos del período'),'cons',18],[T('Pagos del período'),'pag',16],[T('Deuda al cierre'),'deuda',16],[T('Deuda al cierre (S/)'),'deudaS',18]]);
  R.tarjetas.forEach(x=>ta.addRow({...x,cur:ISO[x.cur]||x.cur}));fmtCols(ta,['cons','pag','deuda','deudaS']);setup(ta,false);
  /* Liquidez */
  const li=wb.addWorksheet(T('Liquidez al cierre'));hdr(li,[[T('Cuenta'),'c',26],[T('Moneda'),'cur',10],[T('Saldo'),'v',14],[T('Saldo (S/)'),'s',14]]);
  R.liq.forEach(x=>li.addRow({...x,cur:ISO[x.cur]||x.cur}));fmtCols(li,['v','s']);total(li,'Total',['s'],R.liq.length,{s:R.liqTot});setup(li,false);
  /* Movimientos */
  if(o.det){const mv=wb.addWorksheet(T('Movimientos'));hdr(mv,[[T('Fecha'),'fecha',12],[T('Mes'),'per',16],[T('Tipo'),'tipo',26],[T('Sentido'),'sent',13],[T('Concepto'),'concepto',34],[T('Grupo'),'cat',18],[T('Cuenta o medio'),'cuenta',20],[T('Moneda'),'cur',9],[T('Monto original'),'amt',14],[T('Tipo de cambio'),'tc',11],[T('Monto (S/)'),'sol',14]]);
    R.mov.forEach(x=>mv.addRow({...x,sol:x.firm,cur:ISO[x.cur]||x.cur,tc:x.cur==='S/'?1:x.tc}));fmtCols(mv,['amt','sol']);fmtCols(mv,['tc'],'0.000');mv.getColumn('fecha').numFmt='dd/mm/yyyy';
    mv.autoFilter={from:{row:1,column:1},to:{row:1,column:11}};setup(mv,true);}
  const buf=await wb.xlsx.writeBuffer();
  return new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

/* ----- PDF ----- */
const pdfTxt=s=>String(s==null?'':s).replace(/[−‒]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g,'').trim();
async function buildPdf(R,o){
  await needLib('pdf');
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4',compress:true}),W=210,H=297,M=14,who=repWho();
  const G=[11,122,98],INK=[20,32,27],MUT=[92,107,101],LINE=[214,222,218],BAD=[180,35,24];
  doc.setProperties({title:T('Estado de cuenta personal')+' – '+R.label,author:who.nombre||T('Titular'),creator:'MiS²oles'});
  doc.setFillColor(...G);doc.rect(0,0,W,30,'F');doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(T('Estado de cuenta personal'),M,13);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(pdfTxt(T('Período')+': '+R.label),M,21);
  doc.text(T('Emitido')+': '+dmy(new Date()),W-M,13,{align:'right'});doc.text(T('Moneda: soles (PEN)'),W-M,21,{align:'right'});
  let y=39;doc.setTextColor(...INK);doc.setFontSize(10);
  doc.setFont('helvetica','bold');doc.text(T('Titular')+':',M,y);doc.setFont('helvetica','normal');doc.text(pdfTxt(who.nombre||T('(sin nombre)')),M+(LG==='en'?14:16),y);
  if(who.correo){doc.setFont('helvetica','bold');doc.text(T('Correo')+':',110,y);doc.setFont('helvetica','normal');doc.text(pdfTxt(who.correo),126,y);}
  /* Tarjetas de resumen */
  y+=6;const K=[[T('Ingresos'),R.T.ing],[T('Gastos'),R.T.gas],[T('Ahorro neto'),R.T.aho],[T('Inversión'),R.T.inv],[T('Resultado'),R.T.res]],bw=(W-2*M-4*3)/5;
  K.forEach(([l,v],j)=>{const x=M+j*(bw+3);doc.setDrawColor(...LINE);doc.setFillColor(246,249,248);doc.roundedRect(x,y,bw,17,2,2,'FD');
    doc.setFontSize(7.5);doc.setTextColor(...MUT);doc.text(l.toUpperCase(),x+3,y+5.5);doc.setFontSize(10.5);doc.setFont('helvetica','bold');doc.setTextColor(...(v<0?BAD:INK));doc.text('S/ '+n2(v),x+3,y+12.5);doc.setFont('helvetica','normal');});
  y+=24;
  let sn=0;const AT=(title,head,body,foot,cs,extra)=>{
    if(y>H-40){doc.addPage();y=18;}title=(++sn)+'. '+title;
    doc.setFont('helvetica','bold');doc.setFontSize(11.5);doc.setTextColor(...G);doc.text(pdfTxt(title),M,y);y+=2.5;
    doc.autoTable(Object.assign({startY:y,head:[head.map(pdfTxt)],body:body.map(r=>r.map(c=>typeof c==='string'?pdfTxt(c):c)),foot:foot?[foot.map(c=>typeof c==='string'?pdfTxt(c):c)]:undefined,
      theme:'striped',margin:{left:M,right:M,top:16,bottom:18},styles:{font:'helvetica',fontSize:8.5,cellPadding:1.8,textColor:INK,lineColor:LINE,overflow:'linebreak'},
      headStyles:{fillColor:G,textColor:255,fontStyle:'bold'},footStyles:{fillColor:[230,238,235],textColor:INK,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,250,249]},
      columnStyles:cs||{},showFoot:'lastPage',
      didParseCell:h=>{const cso=(cs||{})[h.column.index];if(cso&&cso.halign&&(h.section==='head'||h.section==='foot'))h.cell.styles.halign=cso.halign;if((h.section==='body'||h.section==='foot')&&typeof h.cell.raw==='string'&&/^-\d/.test(h.cell.raw.replace(/^S\/ /,'')))h.cell.styles.textColor=BAD;}},extra||{}));
    y=doc.lastAutoTable.finalY+9;};
  const R5={1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'},7:{halign:'right'},8:{halign:'right'}};
  AT(T('Resumen del período'),[T('Concepto'),T('Monto (S/)')],repResumen(R).map(([l,v])=>[l.replace('−','-'),n2(v)]).concat(R.tasa!=null?[[T('Tasa de ahorro e inversión (% del ingreso)'),(R.tasa*100).toFixed(1)+'%']]:[]),null,{1:{halign:'right',cellWidth:40}});
  AT(T('Resumen mensual'),[T('Mes'),T('Ingresos'),T('Gastos fijos'),T('Gastos variables'),T('Total gastos'),T('Ahorro neto'),T('Inversión'),T('Resultado')],R.mens.map(x=>[x.per,n2(x.ing),n2(x.fij),n2(x.hor),n2(x.gas),n2(x.aho),n2(x.inv),n2(x.res)]),
    ['Total',n2(R.T.ing),n2(R.T.fij),n2(R.T.hor),n2(R.T.gas),n2(R.T.aho),n2(R.T.inv),n2(R.T.res)],R5,{styles:{fontSize:8,cellPadding:1.6,font:'helvetica',textColor:INK,lineColor:LINE}});
  if(R.cat.length)AT(T('Gastos por concepto'),[T('Concepto'),T('Monto (S/)'),T('% del gasto')],R.cat.map(x=>[x.c,n2(x.v),R.T.gas?(x.v/R.T.gas*100).toFixed(1)+'%':'']),['Total',n2(R.cat.reduce((a,x)=>a+x.v,0)),R.T.gas?'100.0%':''],{1:{halign:'right'},2:{halign:'right'}});
  if(R.grupos&&R.grupos.length){const rows=[];R.grupos.forEach(g=>{rows.push([g.n,T('Subtotal del grupo'),n2(g.t),R.gT?(g.t/R.gT*100).toFixed(1)+'%':'']);g.l.forEach(e=>rows.push(['',e.c,n2(e.v),R.gT?(e.v/R.gT*100).toFixed(1)+'%':'']));});
    AT(T('Gastos por grupo'),[T('Grupo'),T('Concepto'),T('Monto (S/)'),T('% del total')],rows,['Total','',n2(R.gT),R.gT?'100.0%':''],{2:{halign:'right'},3:{halign:'right'}},{didParseCell:h=>{if(h.section==='body'&&h.row.raw[1]===T('Subtotal del grupo'))h.cell.styles.fontStyle='bold';if((h.section==='head'||h.section==='foot'||h.section==='body')&&(h.column.index===2||h.column.index===3))h.cell.styles.halign='right';}});}
  if(R.ant&&R.ant.list.length)AT(T('Antojos'),[T('Fecha'),T('Concepto'),T('Monto (S/)'),T('¿Valió la pena?')],R.ant.list.map(x=>[x.fecha?dmy(x.fecha):x.per,x.concepto,n2(x.sol),x.vp||T('Sin responder')]),['Total','',n2(R.ant.tot),''],{2:{halign:'right'}});
  const pdc=R.ahorros.some(x=>Math.abs(x.dc)>=.005);
  if(R.ahorros.length)AT(T('Cuentas de ahorro'),[T('Cuenta'),T('Saldo inicial'),T('Depósitos'),T('Retiros'),T('Ajustes'),T('Traspasos'),...(pdc?[T('Dif. de cambio')]:[]),T('Saldo final'),T('Tasa')],R.ahorros.map(x=>[x.c,n2(x.ini),n2(x.dep),n2(x.ret),n2(x.aj),n2(x.tr),...(pdc?[n2(x.dc)]:[]),n2(x.fin),x.tasa]),
    ['Total',n2(R.ahorros.reduce((a,x)=>a+x.ini,0)),n2(R.ahorros.reduce((a,x)=>a+x.dep,0)),n2(R.ahorros.reduce((a,x)=>a+x.ret,0)),n2(R.ahorros.reduce((a,x)=>a+x.aj,0)),n2(R.ahorros.reduce((a,x)=>a+x.tr,0)),...(pdc?[n2(R.ahorros.reduce((a,x)=>a+x.dc,0))]:[]),n2(R.ahoTot),''],R5,{styles:{fontSize:8,cellPadding:1.6,font:'helvetica',textColor:INK,lineColor:LINE}});
  if(R.tarjetas.length)AT(T('Tarjetas de crédito'),[T('Tarjeta'),T('Moneda'),T('Consumos'),T('Pagos'),T('Deuda al cierre'),T('Deuda en S/')],R.tarjetas.map(x=>[x.n,ISO[x.cur]||x.cur,n2(x.cons),n2(x.pag),n2(x.deuda),n2(x.deudaS)]),['Total','','','','',n2(R.deudaTot)],{2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}});
  if(R.liq.length)AT(T('Liquidez disponible al cierre de '+perOf(R.last.y,R.last.i)),[T('Cuenta'),T('Moneda'),T('Saldo'),T('Saldo en S/')],R.liq.map(x=>[x.c,ISO[x.cur]||x.cur,n2(x.v),n2(x.s)]),['Total','','',n2(R.liqTot)],{2:{halign:'right'},3:{halign:'right'}});
  if(o.det&&R.mov.length)AT(T('Detalle de movimientos'),[T('Fecha'),T('Tipo'),T('Concepto'),T('Grupo'),T('Cuenta o medio'),T('Mon.'),T('Monto orig.'),T('Monto S/')],
    R.mov.map(x=>[x.fecha?dmy(x.fecha):x.per,x.tipo,x.concepto,x.cat,x.cuenta,ISO[x.cur]||x.cur,n2(x.amt),n2(x.firm)]),null,
    {0:{cellWidth:19},1:{cellWidth:30},5:{cellWidth:10},6:{halign:'right',cellWidth:19},7:{halign:'right',cellWidth:19}},{styles:{fontSize:7.3,cellPadding:1.4,font:'helvetica',textColor:INK,lineColor:LINE,overflow:'linebreak'}});
  /* Notas */
  const notes=[T('Gastos = gastos fijos (incluye pagos de tarjeta) + gastos variables. Las compras con tarjeta figuran en el detalle como «Cargo a tarjeta» y se cuentan como gasto cuando se pagan.'),
    T('En el detalle, «Monto S/» es negativo cuando es un cargo (gastos, compras con tarjeta, inversión, depósitos a ahorro) y positivo cuando es un abono (ingresos, retiros de ahorro).'),fxNote(R),R.ant&&R.ant.list.length?(LG==='en'?'Impulse buys: not worth it S/ '+n2(R.ant.no)+' (what you would have saved); worth it '+R.ant.si+'; unanswered '+R.ant.pend+'.':'Antojos: no valieron la pena S/ '+n2(R.ant.no)+' (lo que habrias ahorrado); valieron la pena '+R.ant.si+'; sin responder '+R.ant.pend+'.'):'',R.grupos&&R.grupos.length?(LG==='en'?'Spending by group: includes fixed and variable expenses, savings and investment. Impulse buys count as wants.':'Gastos por grupo: incluye gastos fijos y variables, ahorro e inversion. Los antojos cuentan como deseo.'):''].filter(Boolean);
  if(y>H-45){doc.addPage();y=18;}
  doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...INK);doc.text(T('Notas'),M,y);y+=4.5;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...MUT);
  notes.forEach(t=>{const ls=doc.splitTextToSize(pdfTxt('• '+t),W-2*M);if(y+ls.length*3.6>H-20){doc.addPage();y=18;}doc.text(ls,M,y);y+=ls.length*3.6+1.2;});
  const n=doc.getNumberOfPages();
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setDrawColor(...LINE);doc.line(M,H-14,W-M,H-14);doc.setFontSize(7);doc.setTextColor(...MUT);
    doc.text(doc.splitTextToSize(pdfTxt(T(RNOTE)),150),M,H-10);doc.text(LG==='en'?'Page '+p+' of '+n:'Página '+p+' de '+n,W-M,H-10,{align:'right'});
    if(p>1){doc.setFontSize(8);doc.text(pdfTxt(T('Estado de cuenta personal')+' · '+(who.nombre?who.nombre+' · ':'')+R.label),M,9);}}
  return doc.output('blob');
}

async function build(job){MES=job.ctx.MES;JOB_WHO=job.ctx.who;LG=job.ctx.lang==='en'?'en':'es';const R=trR(job.R);return job.fmt==='pdf'?buildPdf(R,job.o):buildXlsx(R,job.o);}
root.MSRep={build};
if(isWorker){root.onmessage=async e=>{try{root.postMessage({blob:await build(e.data)});}catch(err){root.postMessage({err:(err&&err.message)||'No pude crear el reporte.'});}};}
})(self);
