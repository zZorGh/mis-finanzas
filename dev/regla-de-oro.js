// Regla de oro: el repo es público. Este script la hace cumplir sola.
//   commit  (gancho pre-commit)  bloquea claves secretas, datos personales y archivos de datos.
//   push    (gancho pre-push)    lo mismo para lo que se sube, y exige pruebas pasadas si cambió la app.
//   sello                        anota que las pruebas pasaron con la versión actual (lo llama `npm run verificar`).
//   todo                         revisa todos los archivos del repo (auditoría manual).
//   claude  (gancho de Claude Code) impide saltarse los ganchos (--no-verify, core.hooksPath).
// Los datos personales a vigilar viven FUERA del repo: ~/.cuadra/vigilar.txt (uno por línea, # = comentario).
const {execFileSync}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');const crypto=require('crypto');

const SECRETOS=/service_role|sb_secret|SNAP\.v/i;
// Estos archivos explican la regla y por eso nombran los patrones; los datos personales se buscan igual en ellos.
const EXENTOS=new Set(['CLAUDE.md','dev/README.md','dev/regla-de-oro.js']);
const ARCHIVO_PROHIBIDO=/\.(xlsx|csv)$|respaldo[^/]*\.json$|(^|\/)d25\.json$|\.bak/i;
const APP=['index.html','legal.html','sw.js','manifest.webmanifest','inicio'];
const VIGILAR=process.env.CUADRA_VIGILAR||path.join(os.homedir(),'.cuadra','vigilar.txt');
const CERO=/^0+$/;

let ROOT='';
const git=(...a)=>execFileSync('git',a,{cwd:ROOT||undefined,encoding:'utf8',maxBuffer:1<<28});
const raiz=()=>{ROOT=git('rev-parse','--show-toplevel').trim();return ROOT;};
const sello=()=>path.join(ROOT,'dev','.sello-pruebas');

function terminos(){
  try{return fs.readFileSync(VIGILAR,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(s=>s.toLowerCase());}
  catch(e){return null;}
}

// Revisa las líneas añadidas de un diff. Nunca imprime el dato personal, solo dónde está.
function revisarDiff(diff,lista){
  const out=[];let file='',n=0;
  for(const l of diff.split('\n')){
    if(l.startsWith('+++ ')){file=l.replace(/^\+\+\+ (b\/)?/,'');continue;}
    const h=/^@@ -\S+ \+(\d+)/.exec(l);if(h){n=+h[1];continue;}
    if(l.startsWith('+')){
      const t=l.slice(1);
      if(!EXENTOS.has(file)&&SECRETOS.test(t))out.push(`${file}:${n}  clave secreta o dato de la hoja (${t.match(SECRETOS)[0]})`);
      const low=t.toLowerCase();(lista||[]).forEach((w,i)=>{if(low.includes(w))out.push(`${file}:${n}  dato personal n.º ${i+1} de tu lista`);});
      n++;
    }
  }
  return out;
}
const revisarNombres=names=>names.filter(f=>ARCHIVO_PROHIBIDO.test(f)).map(f=>`${f}  archivo de datos (no debe subirse nunca)`);

// Huella de la app: ruta + hash de cada archivo. Igual para una versión guardada (commit) o para la carpeta actual.
const huella=lineas=>crypto.createHash('sha1').update(lineas.sort().join('\n')).digest('hex');
function huellaCommit(sha){
  return huella(git('ls-tree','-r',sha,'--',...APP).split('\n').filter(Boolean).map(l=>{const [meta,p]=l.split('\t');return p+' '+meta.split(' ')[2];}));
}
function huellaCarpeta(){
  const files=git('ls-files','-co','--exclude-standard','--',...APP).split('\n').filter(Boolean);
  const hs=execFileSync('git',['hash-object','--stdin-paths'],{cwd:ROOT,input:files.join('\n'),encoding:'utf8'}).split('\n').filter(Boolean);
  return huella(files.map((f,i)=>f+' '+hs[i]));
}

function avisoLista(lista){
  if(lista===null)console.error(`⚠ Regla de oro: no encuentro ${VIGILAR}; solo reviso claves secretas, no tus datos personales.`);
  else if(!lista.length)console.error(`⚠ Regla de oro: ${VIGILAR} está vacío; solo reviso claves secretas.`);
}
function bloquear(titulo,hallazgos){
  console.error(`\n✖ Regla de oro: ${titulo}`);hallazgos.forEach(h=>console.error('   '+h));
  console.error('\n  El repo es público. Quita esos datos (o el archivo del commit) y vuelve a intentarlo.\n');
  process.exit(1);
}

function modoCommit(){
  raiz();const lista=terminos();avisoLista(lista);
  const diff=git('diff','--cached','-U0','--no-color','--no-ext-diff');
  const names=git('diff','--cached','--name-only','--diff-filter=ACR').split('\n').filter(Boolean);
  const h=[...revisarNombres(names),...revisarDiff(diff,lista)];
  if(h.length)bloquear('este commit lleva datos que no pueden ser públicos.',h);
}

function modoPush(){
  raiz();const lista=terminos();avisoLista(lista);
  const refs=fs.readFileSync(0,'utf8').split('\n').map(l=>l.trim().split(/\s+/)).filter(a=>a.length===4);
  for(const [lref,lsha,,rsha] of refs){
    if(CERO.test(lsha))continue; // borrar una rama remota
    let base=CERO.test(rsha)?'':rsha;
    if(base){try{git('cat-file','-e',base+'^{commit}');}catch(e){base='';}}
    if(!base){try{base=git('merge-base',lsha,'origin/main').trim();}catch(e){base='4b825dc642cb6eb9a060e54bf8d69288fbee4904';}} // árbol vacío
    const diff=git('diff','-U0','--no-color','--no-ext-diff',base,lsha);
    const names=git('diff','--name-only','--diff-filter=ACR',base,lsha).split('\n').filter(Boolean);
    const h=[...revisarNombres(names),...revisarDiff(diff,lista)];
    if(h.length)bloquear(`${lref} lleva datos que no pueden ser públicos.`,h);
    const app=git('diff','--name-only',base,lsha,'--',...APP).split('\n').filter(Boolean);
    if(!app.length)continue; // solo documentación o pruebas: no hace falta volver a probar
    let s='';try{s=fs.readFileSync(sello(),'utf8').trim();}catch(e){}
    if(s!==huellaCommit(lsha)){
      console.error(`\n✖ Regla de oro: ${lref} cambia la app (${app.slice(0,4).join(', ')}${app.length>4?'…':''})`);
      console.error('   y no hay constancia de que las pruebas pasaran con esta versión exacta.');
      console.error('   Corre:  cd dev && npm run verificar   (npm test + npm run scan; ~12 min)\n');
      process.exit(1);
    }
  }
}

function modoSello(){
  raiz();fs.writeFileSync(sello(),huellaCarpeta()+'\n');
  console.log('✔ Pruebas y escáner pasaron. Sello guardado: ya puedes subir esta versión.');
}

function modoTodo(){
  raiz();const lista=terminos();avisoLista(lista);const h=[];
  for(const f of git('ls-files').split('\n').filter(Boolean)){
    if(ARCHIVO_PROHIBIDO.test(f))h.push(`${f}  archivo de datos`);
    let t;try{t=fs.readFileSync(path.join(ROOT,f));}catch(e){continue;}
    if(t.includes(0))continue;
    t.toString('utf8').split('\n').forEach((l,i)=>{
      if(!EXENTOS.has(f)&&SECRETOS.test(l))h.push(`${f}:${i+1}  clave secreta o dato de la hoja`);
      const low=l.toLowerCase();(lista||[]).forEach((w,k)=>{if(low.includes(w))h.push(`${f}:${i+1}  dato personal n.º ${k+1} de tu lista`);});
    });
  }
  if(h.length)bloquear('hay datos que no pueden ser públicos en el repo.',h);
  console.log('✔ Regla de oro: el repo está limpio.');
}

// Claude Code: bloquea saltarse los ganchos y avisa si no están activados.
function modoClaude(){
  let cmd='';try{cmd=(JSON.parse(fs.readFileSync(0,'utf8')).tool_input||{}).command||'';}catch(e){return;}
  if(!/\bgit\b/.test(cmd))return;
  const no=m=>{console.error('Regla de oro: '+m);process.exit(2);};
  if(/--no-verify\b/.test(cmd))no('no se permite --no-verify; los ganchos protegen el repo público. Corrige lo que bloquean.');
  if(/core\.hooksPath/i.test(cmd))no('no cambies core.hooksPath; pídeselo al dueño si hace falta.');
  if(/\bgit\b[^|;&]*\bcommit\b[^|;&]*\s-[a-zA-Z]*n[a-zA-Z]*\b/.test(cmd))no('no se permite commit -n (salta los ganchos).');
  if(/\bgit\b[^|;&]*\b(commit|push)\b/.test(cmd)){
    let hp='';try{hp=execFileSync('git',['config','core.hooksPath'],{encoding:'utf8'}).trim();}catch(e){}
    if(hp!=='.githooks')no('los ganchos no están activados en este clon. Primero: git config core.hooksPath .githooks');
  }
}

const modo=process.argv[2];
({commit:modoCommit,push:modoPush,sello:modoSello,todo:modoTodo,claude:modoClaude}[modo]||(()=>{console.error('Uso: node dev/regla-de-oro.js commit|push|sello|todo|claude');process.exit(1);}))();
