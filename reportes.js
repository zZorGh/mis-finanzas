/* MisSoles · reportes descargables (Excel y PDF).
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
let MES=[],JOB_WHO={nombre:'',correo:''};
const perOf=(y,i)=>MES[i]+' '+y;
const dmy=d=>d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear():'';
const repWho=()=>JOB_WHO;

const RNOTE='Documento elaborado por el titular a partir de sus propios registros en MisSoles. No es un documento emitido por una entidad financiera.';
function repResumen(R){return [
  ['Ingresos totales',R.T.ing],['Gastos fijos',R.T.fij],['Gastos variables',R.T.hor],['Total de gastos',R.T.gas],
  ['Ahorro neto del período',R.T.aho],['Inversión',R.T.inv],['Resultado del período (ingresos − gastos − ahorro − inversión)',R.T.res],
  ['Saldo total en cuentas de ahorro al cierre',R.ahoTot],['Deuda total en tarjetas de crédito al cierre',R.deudaTot],['Liquidez disponible al cierre',R.liqTot]];}
function fxNote(R){if(!R.fx.length)return '';const by=new Map();R.fx.forEach(x=>{const k=x.cur+' '+(+x.tc).toFixed(3);by.set(k,(by.get(k)||[]).concat(x.per));});
  return 'Montos en otra moneda convertidos a soles con el tipo de cambio de cada mes: '+[...by.entries()].map(([k,ps])=>(ISO[k.split(' ')[0]]||k.split(' ')[0])+' '+k.split(' ')[1]+' ('+ps.join(', ')+')').join('; ')+'.';}

/* ----- Excel ----- */
async function buildXlsx(R,o){
  await needLib('xlsx');
  const wb=new ExcelJS.Workbook();wb.creator='MisSoles';wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
  const G='FF0B7A62',W='FFFFFFFF',MON='#,##0.00;[Red]-#,##0.00',who=repWho(),hoy=new Date();
  const hdr=(ws,cols)=>{ws.columns=cols.map(c=>({header:c[0],key:c[1],width:c[2]}));const h=ws.getRow(1);h.font={bold:true,color:{argb:W}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:G}};h.alignment={vertical:'middle',wrapText:true};h.height=30;ws.views=[{state:'frozen',ySplit:1}];};
  const fmtCols=(ws,keys,f)=>keys.forEach(k=>{ws.getColumn(k).numFmt=f||MON;});
  const total=(ws,label,keys,n,vals)=>{const r=ws.addRow({});r.getCell(1).value=label;keys.forEach(k=>{const L=ws.getColumn(k).letter;r.getCell(k).value=n?{formula:'SUM('+L+'2:'+L+(n+1)+')',result:vals[k]}:0;});r.font={bold:true};r.eachCell(c=>{c.border={top:{style:'thin'}};});};
  const setup=(ws,land)=>{ws.pageSetup={paperSize:9,orientation:land?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.4,right:.4,top:.5,bottom:.5,header:.3,footer:.3}};ws.headerFooter={oddFooter:'&L'+who.nombre.replace(/&/g,'&&')+'&CPágina &P de &N&R'+R.label};};
  /* Resumen */
  const s=wb.addWorksheet('Resumen');s.columns=[{width:58},{width:22}];
  s.addRow(['Estado de cuenta personal']).font={bold:true,size:16,color:{argb:G}};
  [['Titular',who.nombre||'(sin nombre)'],who.correo?['Correo',who.correo]:null,['Período',R.label],['Moneda de reporte','Soles peruanos (PEN)'],['Fecha de emisión',dmy(hoy)]].filter(Boolean).forEach(r=>{const x=s.addRow(r);x.getCell(1).font={bold:true};});
  s.addRow([]);const hr=s.addRow(['Concepto','Monto (S/)']);hr.font={bold:true,color:{argb:W}};hr.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:G}};});
  repResumen(R).forEach(([l,v])=>{const x=s.addRow([l,v]);x.getCell(2).numFmt=MON;});
  if(R.tasa!=null){const x=s.addRow(['Tasa de ahorro e inversión (% del ingreso)',R.tasa]);x.getCell(2).numFmt='0.0%';}
  s.addRow([]);[ 'Cómo leer este reporte:','• «Mensual» resume cada mes; «Movimientos» trae el detalle con fecha, categoría y cuenta.','• Gastos = gastos fijos (incluye pagos de tarjeta) + gastos variables. Las compras con tarjeta se muestran aparte porque se pagan después.','• En «Movimientos», «Monto (S/)» es negativo si es un cargo y positivo si es un abono.','• Ahorro neto = depósitos menos retiros de las cuentas de ahorro (los ajustes de saldo no cuentan como ahorro).',fxNote(R),RNOTE].filter(Boolean).forEach(t=>{const x=s.addRow([t]);x.getCell(1).alignment={wrapText:true};s.mergeCells(x.number,1,x.number,2);x.height=t.length>95?30:16;});
  setup(s,false);
  /* Mensual */
  const me=wb.addWorksheet('Mensual');hdr(me,[['Mes','per',18],['Ingresos','ing',14],['Gastos fijos','fij',14],['Gastos variables','hor',15],['Total gastos','gas',14],['Ahorro neto','aho',14],['Inversión','inv',13],['Resultado','res',14]]);
  R.mens.forEach(x=>me.addRow(x));fmtCols(me,['ing','fij','hor','gas','aho','inv','res']);total(me,'Total',['ing','fij','hor','gas','aho','inv','res'],R.mens.length,R.T);setup(me,true);
  /* Categorías */
  const ca=wb.addWorksheet('Gastos por categoría');hdr(ca,[['Categoría','c',30],['Monto (S/)','v',16],['% del gasto','p',12]]);
  R.cat.forEach(x=>ca.addRow({c:x.c,v:x.v,p:R.T.gas?x.v/R.T.gas:0}));fmtCols(ca,['v']);fmtCols(ca,['p'],'0.0%');total(ca,'Total',['v'],R.cat.length,{v:R.cat.reduce((a,x)=>a+x.v,0)});setup(ca,false);
  /* Ahorros */
  const ah=wb.addWorksheet('Ahorros');hdr(ah,[['Cuenta','c',30],['Saldo inicial','ini',14],['Depósitos','dep',13],['Retiros','ret',13],['Ajustes','aj',12],['Traspasos','tr',12],['Saldo final','fin',14],['Tasa','tasa',14],['Ganancia estimada 12 meses','gana',16]]);
  R.ahorros.forEach(x=>ah.addRow(x));fmtCols(ah,['ini','dep','ret','aj','tr','fin','gana']);
  const sv={};['ini','dep','ret','aj','tr','fin','gana'].forEach(k=>{sv[k]=R.ahorros.reduce((a,x)=>a+x[k],0);});total(ah,'Total',['ini','dep','ret','aj','tr','fin','gana'],R.ahorros.length,sv);setup(ah,true);
  /* Tarjetas */
  const ta=wb.addWorksheet('Tarjetas');hdr(ta,[['Tarjeta','n',16],['Moneda','cur',10],['Consumos del período','cons',18],['Pagos del período','pag',16],['Deuda al cierre','deuda',16],['Deuda al cierre (S/)','deudaS',18]]);
  R.tarjetas.forEach(x=>ta.addRow({...x,cur:ISO[x.cur]||x.cur}));fmtCols(ta,['cons','pag','deuda','deudaS']);setup(ta,false);
  /* Liquidez */
  const li=wb.addWorksheet('Liquidez al cierre');hdr(li,[['Cuenta','c',26],['Moneda','cur',10],['Saldo','v',14],['Saldo (S/)','s',14]]);
  R.liq.forEach(x=>li.addRow({...x,cur:ISO[x.cur]||x.cur}));fmtCols(li,['v','s']);total(li,'Total',['s'],R.liq.length,{s:R.liqTot});setup(li,false);
  /* Movimientos */
  if(o.det){const mv=wb.addWorksheet('Movimientos');hdr(mv,[['Fecha','fecha',12],['Mes','per',16],['Tipo','tipo',26],['Sentido','sent',13],['Concepto','concepto',34],['Categoría','cat',18],['Cuenta o medio','cuenta',20],['Moneda','cur',9],['Monto original','amt',14],['Tipo de cambio','tc',11],['Monto (S/)','sol',14]]);
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
  doc.setProperties({title:'Estado de cuenta personal – '+R.label,author:who.nombre||'Titular',creator:'MisSoles'});
  doc.setFillColor(...G);doc.rect(0,0,W,30,'F');doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('Estado de cuenta personal',M,13);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(pdfTxt('Período: '+R.label),M,21);
  doc.text('Emitido: '+dmy(new Date()),W-M,13,{align:'right'});doc.text('Moneda: soles (PEN)',W-M,21,{align:'right'});
  let y=39;doc.setTextColor(...INK);doc.setFontSize(10);
  doc.setFont('helvetica','bold');doc.text('Titular:',M,y);doc.setFont('helvetica','normal');doc.text(pdfTxt(who.nombre||'(sin nombre)'),M+16,y);
  if(who.correo){doc.setFont('helvetica','bold');doc.text('Correo:',110,y);doc.setFont('helvetica','normal');doc.text(pdfTxt(who.correo),126,y);}
  /* Tarjetas de resumen */
  y+=6;const K=[['Ingresos',R.T.ing],['Gastos',R.T.gas],['Ahorro neto',R.T.aho],['Inversión',R.T.inv],['Resultado',R.T.res]],bw=(W-2*M-4*3)/5;
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
  AT('Resumen del período',['Concepto','Monto (S/)'],repResumen(R).map(([l,v])=>[l.replace('−','-'),n2(v)]).concat(R.tasa!=null?[['Tasa de ahorro e inversión (% del ingreso)',(R.tasa*100).toFixed(1)+'%']]:[]),null,{1:{halign:'right',cellWidth:40}});
  AT('Resumen mensual',['Mes','Ingresos','Gastos fijos','Gastos variables','Total gastos','Ahorro neto','Inversión','Resultado'],R.mens.map(x=>[x.per,n2(x.ing),n2(x.fij),n2(x.hor),n2(x.gas),n2(x.aho),n2(x.inv),n2(x.res)]),
    ['Total',n2(R.T.ing),n2(R.T.fij),n2(R.T.hor),n2(R.T.gas),n2(R.T.aho),n2(R.T.inv),n2(R.T.res)],R5,{styles:{fontSize:8,cellPadding:1.6,font:'helvetica',textColor:INK,lineColor:LINE}});
  if(R.cat.length)AT('Gastos por categoría',['Categoría','Monto (S/)','% del gasto'],R.cat.map(x=>[x.c,n2(x.v),R.T.gas?(x.v/R.T.gas*100).toFixed(1)+'%':'']),['Total',n2(R.cat.reduce((a,x)=>a+x.v,0)),R.T.gas?'100.0%':''],{1:{halign:'right'},2:{halign:'right'}});
  if(R.ahorros.length)AT('Cuentas de ahorro',['Cuenta','Saldo inicial','Depósitos','Retiros','Ajustes','Traspasos','Saldo final','Tasa'],R.ahorros.map(x=>[x.c,n2(x.ini),n2(x.dep),n2(x.ret),n2(x.aj),n2(x.tr),n2(x.fin),x.tasa]),
    ['Total',n2(R.ahorros.reduce((a,x)=>a+x.ini,0)),n2(R.ahorros.reduce((a,x)=>a+x.dep,0)),n2(R.ahorros.reduce((a,x)=>a+x.ret,0)),n2(R.ahorros.reduce((a,x)=>a+x.aj,0)),n2(R.ahorros.reduce((a,x)=>a+x.tr,0)),n2(R.ahoTot),''],R5,{styles:{fontSize:8,cellPadding:1.6,font:'helvetica',textColor:INK,lineColor:LINE}});
  if(R.tarjetas.length)AT('Tarjetas de crédito',['Tarjeta','Moneda','Consumos','Pagos','Deuda al cierre','Deuda en S/'],R.tarjetas.map(x=>[x.n,ISO[x.cur]||x.cur,n2(x.cons),n2(x.pag),n2(x.deuda),n2(x.deudaS)]),['Total','','','','',n2(R.deudaTot)],{2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}});
  if(R.liq.length)AT('Liquidez disponible al cierre de '+perOf(R.last.y,R.last.i),['Cuenta','Moneda','Saldo','Saldo en S/'],R.liq.map(x=>[x.c,ISO[x.cur]||x.cur,n2(x.v),n2(x.s)]),['Total','','',n2(R.liqTot)],{2:{halign:'right'},3:{halign:'right'}});
  if(o.det&&R.mov.length)AT('Detalle de movimientos',['Fecha','Tipo','Concepto','Categoría','Cuenta o medio','Mon.','Monto orig.','Monto S/'],
    R.mov.map(x=>[x.fecha?dmy(x.fecha):x.per,x.tipo,x.concepto,x.cat,x.cuenta,ISO[x.cur]||x.cur,n2(x.amt),n2(x.firm)]),null,
    {0:{cellWidth:19},1:{cellWidth:30},5:{cellWidth:10},6:{halign:'right',cellWidth:19},7:{halign:'right',cellWidth:19}},{styles:{fontSize:7.3,cellPadding:1.4,font:'helvetica',textColor:INK,lineColor:LINE,overflow:'linebreak'}});
  /* Notas */
  const notes=['Gastos = gastos fijos (incluye pagos de tarjeta) + gastos variables. Las compras con tarjeta figuran en el detalle como «Cargo a tarjeta» y se cuentan como gasto cuando se pagan.',
    'En el detalle, «Monto S/» es negativo cuando es un cargo (gastos, compras con tarjeta, inversión, depósitos a ahorro) y positivo cuando es un abono (ingresos, retiros de ahorro).',fxNote(R)].filter(Boolean);
  if(y>H-45){doc.addPage();y=18;}
  doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...INK);doc.text('Notas',M,y);y+=4.5;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...MUT);
  notes.forEach(t=>{const ls=doc.splitTextToSize(pdfTxt('• '+t),W-2*M);if(y+ls.length*3.6>H-20){doc.addPage();y=18;}doc.text(ls,M,y);y+=ls.length*3.6+1.2;});
  const n=doc.getNumberOfPages();
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setDrawColor(...LINE);doc.line(M,H-14,W-M,H-14);doc.setFontSize(7);doc.setTextColor(...MUT);
    doc.text(doc.splitTextToSize(pdfTxt(RNOTE),150),M,H-10);doc.text('Página '+p+' de '+n,W-M,H-10,{align:'right'});
    if(p>1){doc.setFontSize(8);doc.text(pdfTxt('Estado de cuenta personal · '+(who.nombre?who.nombre+' · ':'')+R.label),M,9);}}
  return doc.output('blob');
}

async function build(job){MES=job.ctx.MES;JOB_WHO=job.ctx.who;return job.fmt==='pdf'?buildPdf(job.R,job.o):buildXlsx(job.R,job.o);}
root.MSRep={build};
if(isWorker){root.onmessage=async e=>{try{root.postMessage({blob:await build(e.data)});}catch(err){root.postMessage({err:(err&&err.message)||'No pude crear el reporte.'});}};}
})(self);
