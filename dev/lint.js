// Lint de errores reales (no de estilo) en la app, incluido el JavaScript dentro de los HTML.
const {ESLint}=require('eslint');const globals=require('globals');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const PAGINAS=['index.html','inicio/index.html','legal.html'],JS=['sw.js','reportes.js'];
const REGLAS={'no-undef':'error','no-dupe-keys':'error','no-dupe-else-if':'error','no-duplicate-case':'error','no-unreachable':'error','no-func-assign':'error','no-const-assign':'error','no-self-assign':'error','no-unsafe-finally':'error','no-unsafe-negation':'error','use-isnan':'error','valid-typeof':'error','no-sparse-arrays':'error','no-constant-binary-expression':'error','getter-return':'error','no-setter-return':'error','no-async-promise-executor':'error','no-eval':['error',{allowIndirect:true}],'no-implied-eval':'error','no-new-func':'error','no-script-url':'error'};
const eslint=new ESLint({cwd:ROOT,overrideConfigFile:true,overrideConfig:[{languageOptions:{ecmaVersion:2022,sourceType:'script',globals:{...globals.browser,...globals.worker,...globals.serviceworker,Chart:'readonly',supabase:'readonly',ExcelJS:'readonly',jspdf:'readonly',google:'readonly'}},rules:REGLAS}]});
// Cada bloque conserva su número de línea original.
const bloques=t=>{const out=[];const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(t))){if(/\bsrc=/.test(m[1])||/type=["']?application\/(ld\+)?json/.test(m[1])||!m[2].trim())continue;const ini=m.index+m[0].indexOf('>')+1;out.push('\n'.repeat(t.slice(0,ini).split('\n').length-1)+m[2]);}return out;};
(async()=>{let err=0;const ver=(f,rs)=>rs.forEach(r=>r.messages.forEach(x=>{err++;console.log(f+':'+x.line+':'+x.column+' '+(x.ruleId||'sintaxis')+' '+x.message);}));
  for(const f of PAGINAS){for(const b of bloques(fs.readFileSync(path.join(ROOT,f),'utf8')))ver(f,await eslint.lintText(b));}
  for(const f of JS)ver(f,await eslint.lintText(fs.readFileSync(path.join(ROOT,f),'utf8')));
  console.log(err?'✘ '+err+' problemas':'✔ Lint sin problemas');process.exit(err?1:0);})().catch(e=>{console.error(e);process.exit(2);});
