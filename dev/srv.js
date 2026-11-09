const http=require('http'),fs=require('fs'),path=require('path');
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.css':'text/css'};
http.createServer((q,r)=>{
 if(q.method==='POST'&&q.url==='/__log'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{fs.appendFileSync('untr.log',b+'\n');r.writeHead(204);r.end();});return;}
 let f=path.join(__dirname,decodeURIComponent(q.url.split('?')[0].split('#')[0]));
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});
}).listen(8765,'127.0.0.1');
