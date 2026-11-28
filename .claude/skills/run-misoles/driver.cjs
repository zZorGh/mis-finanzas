// Controlador de MiS²oles: levanta el servidor local si falta, abre la app con datos de ejemplo y obedece órdenes
// (una por línea) desde la entrada estándar. Sin internet y sin datos reales. Uso y órdenes: SKILL.md.
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), readline = require('readline');
const { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..', '..'), DEV = path.join(ROOT, 'dev');
const { chromium } = require(path.join(DEV, 'node_modules', 'playwright'));
const BASE = 'http://127.0.0.1:8765/wrap-repo.html', K = 'mis-finanzas-prototipo-v1';
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'misoles-shots');
const cfg = { w: 1366, h: 768, theme: 'light', skin: 'cuadre', lang: 'es', date: '2026-11-22T12:00:00-05:00', data: 'demo' };

const vivo = () => new Promise(r => { const q = http.get(BASE, x => { x.resume(); r(true); }); q.on('error', () => r(false)); q.setTimeout(1000, () => { q.destroy(); r(false); }); });

(async () => {
  try { execFileSync('node', ['armar.js', '--comprobar'], { cwd: DEV, stdio: 'pipe' }); }
  catch (e) { console.log('AVISO index.html no coincide con src/ (corre: node dev/armar.js)'); }
  execFileSync('node', ['build-wrap.js'], { cwd: DEV, stdio: 'pipe' });
  let srv = null;
  if (!(await vivo())) {
    srv = spawn('node', ['srv.js'], { cwd: DEV, stdio: 'ignore' });
    for (let i = 0; i < 50 && !(await vivo()); i++) await new Promise(r => setTimeout(r, 100));
    if (!(await vivo())) throw new Error('el servidor de dev/srv.js no respondió en el puerto 8765');
  }
  const browser = await chromium.launch(), errors = [];
  let ctx = null, page = null;
  const chart = fs.readFileSync(path.join(DEV, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'), 'utf8');
  const demo = JSON.parse(fs.readFileSync(path.join(DEV, 'demo.json'), 'utf8'));

  async function open(hash) {
    if (ctx) await ctx.close();
    const movil = cfg.w < 500;
    ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, colorScheme: cfg.theme, isMobile: movil, hasTouch: movil, locale: 'es-PE', timezoneId: 'America/Lima' });
    await ctx.clock.setFixedTime(new Date(cfg.date));
    await ctx.route('**/*', r => {
      const u = r.request().url();
      if (u.startsWith('http://127.0.0.1:8765') || u.startsWith('https://fonts.g')) return r.continue();
      if (u.includes('hart')) return r.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: chart });
      return r.abort();
    });
    const datos = cfg.data === 'demo' ? JSON.stringify({ v: 1, S: demo.S, cfg: Object.assign({}, demo.cfg, { onb: 1 }) }) : '';
    await ctx.addInitScript(([d, k, s, l]) => {
      if (sessionStorage.getItem('__drv')) return; sessionStorage.setItem('__drv', '1');
      if (d) localStorage.setItem(k, d);
      localStorage.setItem(k + '-skin', s); localStorage.setItem(k + '-instalar', '1'); localStorage.setItem('cuadra-lang', l);
    }, [datos, K, cfg.skin, cfg.lang]);
    page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(BASE + (hash || ''));
    await page.waitForSelector('#app');
    await page.waitForTimeout(700);
  }

  const orden = {
    set: async a => { const [k, ...v] = a.split(' '); if (!(k in cfg)) throw new Error('ajuste desconocido: ' + k); cfg[k] = (k === 'w' || k === 'h') ? +v[0] : v.join(' '); },
    open: a => open(a),
    go: async a => { await page.evaluate(h => { location.hash = h; }, a); await page.waitForTimeout(500); },
    click: async a => { await page.locator(a).first().click({ timeout: 5000 }); await page.waitForTimeout(300); },
    hover: async a => { await page.locator(a).first().hover({ timeout: 5000 }); await page.waitForTimeout(200); },
    fill: async a => { const [sel, text] = a.split(' :: '); await page.locator(sel).first().fill(text || '', { timeout: 5000 }); await page.waitForTimeout(300); },
    press: async a => { await page.keyboard.press(a); await page.waitForTimeout(300); },
    wait: async a => page.waitForTimeout(+a),
    text: async a => console.log((await page.locator(a).first().innerText({ timeout: 5000 })).replace(/\n+/g, ' | ')),
    count: async a => console.log(await page.locator(a).count()),
    eval: async a => console.log(JSON.stringify(await page.evaluate(a))),
    data: async () => console.log(await page.evaluate(k => { const d = JSON.parse(localStorage.getItem(k) || 'null'); if (!d) return 'sin datos'; const m = d.S['2026'][10]; return JSON.stringify({ hor: m.hor.slice(-2), fij: m.fij.slice(-1), liq: m.liq.map(r => [r.c, r.m]) }); }, K)),
    ss: async a => { fs.mkdirSync(SHOTS, { recursive: true }); const [n, full] = a.split(' '); const f = path.join(SHOTS, (n || 'pantalla') + '.png'); await page.screenshot({ path: f, fullPage: full === 'full' }); console.log(f); },
    errors: async () => console.log(errors.length ? errors.join('\n') : 'sin errores de JavaScript'),
  };

  let fallo = false;
  for await (const linea of readline.createInterface({ input: process.stdin })) {
    const l = linea.trim();
    if (!l || l.startsWith('#!') || l.startsWith('//')) continue;
    const i = l.indexOf(' '), c = i < 0 ? l : l.slice(0, i), a = i < 0 ? '' : l.slice(i + 1);
    if (c === 'quit') break;
    try {
      if (!orden[c]) throw new Error('orden desconocida');
      if (!page && !['set', 'open'].includes(c)) await open('');
      console.log('> ' + l);
      await orden[c](a);
    } catch (e) { fallo = true; console.log('FALLA ' + l + ' :: ' + e.message.split('\n')[0]); }
  }
  if (errors.length) { fallo = true; console.log('ERRORES DE LA APP:\n' + errors.join('\n')); }
  await browser.close();
  if (srv) srv.kill();
  process.exit(fallo ? 1 : 0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
