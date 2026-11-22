// Mismo entorno para todas las pruebas, en cualquier máquina: fecha, idioma y zona horaria de Lima.
// Sin esto, las pruebas que usan «el mes actual» se ponen en rojo solas al cambiar de mes.
// Se carga con `node -r ./entorno-pruebas.js tNN.js`; paralelo.js ya lo hace. Una prueba puede fijar su propia fecha después.
const {chromium}=require('playwright');

const HOY=new Date('2026-11-22T12:00:00-05:00');
const BASE={locale:'es-PE',timezoneId:'America/Lima'};
const conBase=opciones=>Object.assign({},BASE,opciones);

const lanzar=chromium.launch.bind(chromium);
chromium.launch=async(...args)=>{
  const navegador=await lanzar(...args);
  const nuevoContexto=navegador.newContext.bind(navegador);
  const nuevaPagina=navegador.newPage.bind(navegador);
  navegador.newContext=async opciones=>{
    const contexto=await nuevoContexto(conBase(opciones));
    await contexto.clock.setFixedTime(HOY);
    return contexto;
  };
  navegador.newPage=async opciones=>{
    const pagina=await nuevaPagina(conBase(opciones));
    await pagina.context().clock.setFixedTime(HOY);
    return pagina;
  };
  return navegador;
};
