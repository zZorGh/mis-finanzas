// Arma la versión para Cloudflare Pages en dist/: solo los archivos públicos, con misoles.pe y cabeceras de seguridad.
// No cambia los archivos del repo, así GitHub Pages sigue igual. Cloudflare: comando «node dev/cf-build.js», salida «dist».
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=path.resolve(process.env.CF_OUT||path.join(ROOT,'dist'));
const ORIGEN='https://zzorgh.github.io/mis-finanzas/',DESTINO='https://misoles.pe/';
const PUBLICOS=['index.html','legal.html','sw.js','manifest.webmanifest','reportes.js','icon-192.png','icon-512.png','robots.txt','sitemap.xml','inicio'];
const TEXTO=/\.(html|js|webmanifest|txt|xml)$/;
const HEADERS=`/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Content-Security-Policy: frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=86400
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
`;
const copia=(a,b)=>{
  if(fs.statSync(a).isDirectory()){fs.mkdirSync(b,{recursive:true});fs.readdirSync(a).forEach(n=>copia(path.join(a,n),path.join(b,n)));return;}
  if(!TEXTO.test(a)){fs.copyFileSync(a,b);return;}
  fs.writeFileSync(b,fs.readFileSync(a,'utf8').split(ORIGEN+'legal.html').join(DESTINO+'legal').split(ORIGEN).join(DESTINO).split('zzorgh.github.io/mis-finanzas/').join('misoles.pe/'));
};
if(path.dirname(OUT)!==ROOT&&!process.env.CF_OUT)throw new Error('Salida inesperada: '+OUT);
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
PUBLICOS.forEach(n=>copia(path.join(ROOT,n),path.join(OUT,n)));
fs.writeFileSync(path.join(OUT,'_headers'),HEADERS);
console.log('Listo: '+OUT);
