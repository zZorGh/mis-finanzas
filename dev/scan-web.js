const {chromium}=require('playwright');
const SCAN=()=>{
 const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
 const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
 const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
 const bgOf=el=>{const layers=[];let e=el,grad=false;while(e){const cs=getComputedStyle(e);const bg=parse(cs.backgroundColor);if(cs.backgroundImage&&cs.backgroundImage!=='none'&&/gradient/.test(cs.backgroundImage)&&!(bg&&bg.a>=.99))grad=true;if(bg&&bg.a>0)layers.push(bg);if(bg&&bg.a>=.99)break;e=e.parentElement;}
  let base={r:255,g:255,b:255,a:1};for(let i=layers.length-1;i>=0;i--)base=over(layers[i],base);return {base,grad};};
 const out=[];const seen=new Set();
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;let x=e;while(x){const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;x=x.parentElement;}return true;};
 const els=[...document.querySelectorAll('body *')];
 for(const el of els){
  const tag=el.tagName;if(['SCRIPT','STYLE','CANVAS','SVG','PATH','OPTION'].includes(tag))continue;
  let txt='';if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'){txt=(el.value||el.placeholder||'').toString();}else{txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();}
  if(!txt)continue;if(!vis(el))continue;
  const cs=getComputedStyle(el);const fg=parse(cs.color);if(!fg)continue;
  const {base,grad}=bgOf(el);const f=over({...fg,a:fg.a*(+cs.opacity||1)},base);
  const L1=lum(f),L2=lum(base),ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700;const need=(size>=24||(size>=18.66&&bold))?3:4.5;
  const key=el.tagName+'.'+el.className+'|'+txt.slice(0,20);if(seen.has(key))continue;seen.add(key);
  if(ratio<need&&!grad)out.push({t:txt.slice(0,30),ratio:+ratio.toFixed(2),need,tag:el.tagName+'.'+String(el.className).slice(0,30)});
  else if(grad&&ratio<3)out.push({t:txt.slice(0,30),ratio:+ratio.toFixed(2),need:'grad',tag:el.tagName+'.'+String(el.className).slice(0,30)});
 }
 return {out,over:document.documentElement.scrollWidth>innerWidth+1};
};
(async()=>{const b=await chromium.launch();
for(const [u,hash] of [['../inicio/index.html',''],['../legal.html','#privacidad'],['../legal.html','#terminos']])for(const cs of ['light','dark'])for(const w of [390,1280]){
 const p=await (await b.newContext({viewport:{width:w,height:900},colorScheme:cs})).newPage();
 await p.route('**/*',r=>{const x=r.request().url();return x.startsWith('file:')||x.startsWith('data:')?r.continue():r.abort();});
 await p.goto('file://'+__dirname+'/'+u+hash);await p.waitForTimeout(500);
 const r=await p.evaluate(SCAN);const o=r.out.filter(x=>x.need!=='grad');
 console.log(u+hash,cs,w,r.over?'DESBORDE':'ok',JSON.stringify(o.slice(0,4)));await p.close();}
await b.close();})();
