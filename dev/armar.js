// Arma index.html a partir de las piezas de src/ (se concatenan por orden de nombre, sin transformar nada).
//   node armar.js             escribe ../index.html
//   node armar.js --comprobar no escribe: falla si index.html no es exactamente lo que dan las piezas
// src/ es la fuente: edita ahí y vuelve a armar. index.html sigue en el repo porque GitHub Pages lo publica tal cual.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'),SRC=path.join(ROOT,'src'),OUT=path.join(ROOT,'index.html');
// --indice comprueba lo que está preparado para el commit (no el disco), para que no se suba una mitad sin la otra.
const indice=process.argv.includes('--indice');
const git=a=>execFileSync('git',a,{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
const listar=()=>indice?git(['ls-files','src']).split(/\r?\n/).filter(Boolean).map(f=>f.slice(4)):fs.readdirSync(SRC);
const leer=rel=>indice?git(['show',':'+rel]):fs.readFileSync(path.join(ROOT,rel),'utf8');
const piezas=listar().filter(f=>/^\d{3}-[\w-]+\.(html|css|js)$/.test(f)).sort();
const extra=listar().filter(f=>f!=='LEEME.md'&&!piezas.includes(f));
if(extra.length){console.error('✘ En src/ hay archivos que no se armarían: '+extra.join(', ')+' (usa NNN-nombre.html|css|js)');process.exit(1);}
if(!piezas.length){console.error('✘ src/ está vacía.');process.exit(1);}
const armado=piezas.map(f=>leer('src/'+f)).join('');
if(armado.includes('\r')){console.error('✘ Alguna pieza tiene finales de línea CRLF; el proyecto usa LF.');process.exit(1);}
if(process.argv.includes('--comprobar')||indice){
  const actual=leer('index.html');
  if(actual===armado){console.log('✔ index.html coincide con src/ ('+piezas.length+' piezas)');process.exit(0);}
  const a=actual.split('\n'),b=armado.split('\n');let i=0;while(i<a.length&&a[i]===b[i])i++;
  console.error('✘ index.html NO coincide con src/ (primera diferencia en la línea '+(i+1)+'). Edita en src/ y corre: node dev/armar.js');process.exit(1);
}
fs.writeFileSync(OUT,armado);console.log('✔ index.html armado desde '+piezas.length+' piezas ('+armado.length+' caracteres)');
