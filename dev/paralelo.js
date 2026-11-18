// Corre las pruebas (t*.js) y los escáneres en paralelo. Cada prueba abre su propio navegador y no comparte estado con las demás,
// así que pueden correr a la vez; el resultado es el mismo que en serie (npm run test:serie), pero en una fracción del tiempo.
//
//   node paralelo.js              pruebas + escáneres + sello (lo que usa `npm run verificar`)
//   node paralelo.js --pruebas    solo las pruebas t*.js
//   node paralelo.js --escaneos   solo los escáneres (scan*.js)
//   node paralelo.js t90 t94      solo esas pruebas (sin sello)
//   PRUEBAS_HILOS=4 node paralelo.js     cuántas a la vez (por defecto, la mitad de tus núcleos, entre 2 y 8)
//
// Una prueba que falla se vuelve a correr sola, una vez, al final: si pasa, se avisa como «intermitente» (puede ser carga de la
// máquina) y no tumba la verificación; si falla otra vez, es un fallo de verdad. El sello se guarda solo si la app no cambió
// mientras corrían las pruebas.
const {spawn,execFileSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os'),http=require('http');
const DIR=__dirname,TIEMPOS=path.join(DIR,'.tiempos-pruebas.json');
const arg=process.argv.slice(2),soloPruebas=arg.includes('--pruebas'),soloEscaneos=arg.includes('--escaneos'),elegidas=arg.filter(a=>!a.startsWith('--')).map(a=>a.replace(/\.js$/,''));
const HILOS=Math.max(1,+process.env.PRUEBAS_HILOS||Math.max(2,Math.min(8,Math.floor(os.cpus().length/2))));
const sec=ms=>(ms/1000).toFixed(ms<10000?1:0)+' s';
const num=f=>+/^t(\d+)\.js$/.exec(f)[1];

let previos={};try{previos=JSON.parse(fs.readFileSync(TIEMPOS,'utf8'));}catch(e){}
const todas=fs.readdirSync(DIR).filter(f=>/^t\d+\.js$/.test(f)).sort((a,b)=>num(a)-num(b));
let trabajos=[];
if(!soloEscaneos)trabajos=trabajos.concat(todas.filter(f=>!elegidas.length||elegidas.includes(f.replace(/\.js$/,''))).map(f=>({f,args:f==='t61.js'?['wrap-repo.html']:[]})));
if(!soloPruebas&&!elegidas.length)trabajos=trabajos.concat(['scan.js','scan-auth.js','scan-web.js'].map(f=>({f,args:[]})));
if(!trabajos.length){console.error('No hay nada que correr (revisa los nombres).');process.exit(1);}
// Las más lentas primero: así ninguna se queda sola al final.
trabajos.sort((a,b)=>(previos[b.f]||0)-(previos[a.f]||0));

const pedirWrap=()=>new Promise(r=>{const q=http.get('http://127.0.0.1:8765/wrap-repo.html',x=>{x.resume();r(x.statusCode===200);});q.on('error',()=>r(false));q.setTimeout(2500,()=>{q.destroy();r(false);});});
const correr=t=>new Promise(res=>{
  const ini=Date.now();let out='';
  const p=spawn(process.execPath,[t.f,...t.args],{cwd:DIR,stdio:['ignore','pipe','pipe']});
  const tope=setTimeout(()=>{out+='\n[paralelo] se pasó de 12 minutos: se detuvo.\n';p.kill();},12*60*1000);
  p.stdout.on('data',d=>{out+=d;});p.stderr.on('data',d=>{out+=d;});
  p.on('close',code=>{clearTimeout(tope);res({t,ok:code===0,code,out,ms:Date.now()-ini});});
  p.on('error',e=>{clearTimeout(tope);res({t,ok:false,code:-1,out:String(e),ms:Date.now()-ini});});
});

(async()=>{
  const t0=Date.now();let huella0='';
  if(!soloPruebas&&!soloEscaneos&&!elegidas.length){try{huella0=execFileSync(process.execPath,['regla-de-oro.js','huella'],{cwd:DIR,encoding:'utf8'}).trim();}catch(e){console.error('No pude calcular la huella de la app:',String(e.stderr||e.message).trim());process.exit(1);}}
  execFileSync(process.execPath,['build-wrap.js'],{cwd:DIR,stdio:'inherit'});
  let srv=null;
  if(!(await pedirWrap())){
    srv=spawn(process.execPath,['srv.js'],{cwd:DIR,stdio:'ignore'});
    for(let i=0;i<30&&!(await pedirWrap());i++)await new Promise(r=>setTimeout(r,200));
    if(!(await pedirWrap())){console.error('No pude levantar el servidor de pruebas en 127.0.0.1:8765 (¿otro programa lo ocupa?).');if(srv)srv.kill();process.exit(1);}
    console.log('· Servidor de pruebas levantado.');
  }
  console.log(`Corriendo ${trabajos.length} trabajos, ${HILOS} a la vez…\n`);
  const cola=trabajos.slice(),listos=[];let n=0;
  const linea=r=>{n++;console.log(`[${String(n).padStart(String(trabajos.length).length)}/${trabajos.length}] ${r.ok?'✔':'✘'} ${r.t.f.padEnd(14)} ${sec(r.ms)}`);};
  await Promise.all(Array.from({length:Math.min(HILOS,cola.length)},async()=>{while(cola.length){const r=await correr(cola.shift());listos.push(r);linea(r);}}));
  // Reintento a solas de lo que falló (descarta fallos por carga de la máquina).
  const intermitentes=[];
  for(const r of listos.filter(x=>!x.ok)){
    console.log(`\n↻ Reintentando ${r.t.f} a solas…`);
    const r2=await correr(r.t);r.reintento=r2;
    if(r2.ok){intermitentes.push(r.t.f);console.log(`  ✔ pasó al reintentar (${sec(r2.ms)})`);}else console.log(`  ✘ falló otra vez (${sec(r2.ms)})`);
  }
  if(srv)srv.kill();
  const fallos=listos.filter(r=>!r.ok&&!(r.reintento&&r.reintento.ok));
  const tiempos={};listos.forEach(r=>{tiempos[r.t.f]=Math.round(r.reintento&&r.reintento.ok?r.reintento.ms:r.ms);});
  try{fs.writeFileSync(TIEMPOS,JSON.stringify(Object.assign(previos,tiempos),null,1));}catch(e){}
  fallos.forEach(r=>{const o=(r.reintento||r).out.split('\n').filter(l=>l.trim()).slice(-40).join('\n');console.log(`\n──── ${r.t.f} (salió con código ${(r.reintento||r).code}) ────\n${o}`);});
  const suma=listos.reduce((a,r)=>a+r.ms,0),total=Date.now()-t0;
  console.log(`\n${fallos.length?'✘':'✔'} ${listos.length-fallos.length} de ${listos.length} bien · ${sec(total)} en total (en serie serían ≈ ${sec(suma)})`);
  if(intermitentes.length)console.log(`⚠ Intermitentes (pasaron al reintentar): ${intermitentes.join(', ')}. Si se repite, conviene revisarlas.`);
  if(fallos.length){console.log('Fallaron: '+fallos.map(r=>r.t.f).join(', '));process.exit(1);}
  if(huella0){
    try{console.log(execFileSync(process.execPath,['regla-de-oro.js','sello',huella0],{cwd:DIR,encoding:'utf8'}).trim());}
    catch(e){console.error(String(e.stderr||e.stdout||e.message).trim());process.exit(1);}
  }
})().catch(e=>{console.error(e);process.exit(1);});
