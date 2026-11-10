// Genera wrap-repo.html: el index.html del repo dentro de un esqueleto mínimo, para que las pruebas lo abran por http.
const fs=require('fs'),path=require('path');
const pre='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui}</style></head><body>';
const idx=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
fs.writeFileSync(path.join(__dirname,'wrap-repo.html'),pre+idx+'</body></html>');
fs.copyFileSync(path.join(__dirname,'..','reportes.js'),path.join(__dirname,'reportes.js'));
console.log('wrap-repo.html generado ('+idx.length+' bytes de index.html)');
