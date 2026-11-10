# MisSoles — guía para Claude Code

App web de finanzas personales en soles (Lima, Perú), en plan de monetizarse (freemium). Nombre oficial: **MisSoles** (desde nov. 2026; «Cuadra» estaba registrada en Indecopi). Antes: «Cuadra», «Plantilla de Finanzas», «Mis finanzas». La clave `cuadra-lang` y el estilo «Cuadre» conservan su nombre a propósito. Dueño: el autor del repo (habla español).

- App: https://zzorgh.github.io/mis-finanzas/ (`index.html`, raíz del repo)
- Landing: `/inicio/` · Legal: `legal.html` (`#privacidad`, `#terminos`)
- Repo: github.com/zZorGh/mis-finanzas, rama `main` = producción (GitHub Pages, sin build)
- Supabase: proyecto `lmjhlghwthydpeismulb`

## Cómo trabajar con el dueño
- Responde en español, breve y cercano; da tu opinión sincera, incluso si no le gusta.
- **Antes de subir algo, enséñale una demo** (captura o servidor local) y **espera su OK explícito**. No hagas push sin él.
- Cambios en la base de datos (Supabase), solo con su aprobación explícita.
- Los textos legales (`legal.html`) tienen marcadores `[tu nombre completo o razón social]`, `[correo de contacto]`, `[fecha de publicación]` a propósito: los completará cuando la app genere ingresos. No los rellenes.

## Regla de oro: el repo es público y no lleva datos personales
Nunca subas movimientos, saldos, correos, claves secretas ni el ID de su hoja de Google. La clave `sb_publishable_…` de Supabase sí es pública y va en el código; **jamás** una `service_role`/`sb_secret`. El `.gitignore` ya excluye `*.xlsx`, `*.csv`, `*respaldo*.json`, `d25.json`.

**Se cumple sola** (`dev/regla-de-oro.js`), con los ganchos de `.githooks/`:
- `pre-commit` bloquea claves secretas (`service_role`, `sb_secret`, `SNAP.v`), archivos de datos aunque se fuercen con `git add -f`, y los datos personales de la lista privada `~/.cuadra/vigilar.txt` (nombre, apellido, correos, cifras de su cuenta; uno por línea). **Esa lista nunca va al repo** y el aviso no muestra el dato, solo dónde está.
- `pre-push` repite el control sobre lo que se sube y, si cambia la app (`index.html`, `legal.html`, `sw.js`, `manifest.webmanifest`, `inicio/`), exige el sello de `npm run verificar` para esa versión exacta.
- `.claude/settings.json` impide a Claude saltarse los ganchos (`--no-verify`, `commit -n`, cambiar `core.hooksPath`).
- En un clon nuevo, actívalos una vez: `git config core.hooksPath .githooks`. Auditoría completa del repo: `cd dev && npm run regla`.
- Si un gancho bloquea, se corrige el contenido; **nunca** se salta.

## Arquitectura
Todo en un archivo: `index.html` (~300 KB), JavaScript sin framework dentro de una IIFE, Chart.js 4.4.1 por CDN. Sin build ni dependencias: se edita el archivo directamente.
- **Datos**: `S[año][mes]` (mes 0–11) con secciones `liq` (liquidez), `ing`, `fij`, `hor` (hormiga), `bbva`/`bcp`/`oh` (tarjetas), `aho` (ahorro), `inv`, `eur`. Cada fila: `{c, m, f, k, src, card, cur, t}`.
- Los saldos de ahorro son **acumulados entre meses y años** por nombre de cuenta (`ahoAccts`); el «ahorro del mes» y el progreso de metas cuentan solo los movimientos del mes. Por eso diciembre ya muestra saldos.
- `localStorage['mis-finanzas-prototipo-v1']` guarda todo; `cfg` es la configuración (incluye `ahoOcultas`, `ahoV` = versión de migración). Con sesión, se sincroniza con Supabase (`estado`, `estado_historial`).
- **Dueño de los datos locales**: `localStorage[KEY+'-owner']` guarda el id del usuario. Si entra otra cuenta en ese navegador, `sbReady` borra los datos locales (`wipeLocal()`) sin subirlos y recarga; sin marca, los adopta la primera cuenta. Cerrar sesión también llama a `wipeLocal()` (avisa si quedan cambios sin subir). Solo se conservan `-skin` y `-tema`. Toda clave nueva de datos debe empezar con `KEY` para que se borre. Prueba: `dev/t85.js`.
- **Rutas por hash**: `#resumen`, `#enero`…`#diciembre`, `#capturar`. Sin hash y con datos, abre en el mes actual (hora de Lima); sin datos, en el Resumen.
- `sw.js`: service worker «red primero» para las páginas.

### Supabase
Tablas `estado` y `estado_historial` (RLS por usuario), RPC `delete_my_account()` (SECURITY DEFINER a propósito; el aviso del linter es esperado), y `lista_espera` (insert anónimo, nadie puede leerla con la clave pública; los correos se ven en el Table Editor). SQL en `supabase/`. Pendiente suyo: activar «Leaked password protection» en Authentication.

### Idioma (ES/EN)
El idioma vive en `localStorage['cuadra-lang']` (por defecto `es`). La app traduce el DOM en el cliente: busca `I18N_EN` (mapa exacto), `I18N_PAT` (plantillas con `{}`, `{d}` dígitos, `{m}` dinero) y `trS()`. **Todo texto nuevo visible hay que agregarlo al diccionario**, o en inglés se verá en español. Los datos que escribe el usuario no se traducen. Los reportes PDF/Excel siguen en español (pendiente).

### Estilos (Original / Cuadre / Escalón)
Selector en Ajustes → «Estilo de la app»; se guarda en `localStorage['mis-finanzas-prototipo-v1-skin']` (por defecto `cuadre`). Se implementan con `<style id="sk-cuadre">` y `<style id="sk-escalon">` que un script temprano activa o desactiva; «Original» = ambos desactivados. Tema claro/oscuro es aparte (botón «Tema»).
- **Esos dos `<style>` deben ir DESPUÉS del CSS principal.** Antes estaban delante y las reglas de igual especificidad perdían (causó el bug de «Editar cuentas» invisible).
- En Cuadre, el panel «Dónde está tu dinero» es una tira de papel **blanca**: sus textos/campos van con colores forzados (`!important`) porque el hero original usa letra blanca. Cualquier control nuevo dentro de ese panel debe probarse en los 3 estilos.
- Identidad: Cuadre = papel cuadriculado, tira de sumadora, Instrument Sans + Geist Mono. Escalón = índigo y ámbar, Familjen Grotesk + Figtree, con barras en escalones (inspiradas en la chakana) para el fondo de emergencia.

## Probar
Ver `dev/README.md`. Resumen: `cd dev && npm install && npx playwright install chromium`, luego `npm test` (regresión, ~10 min) y `npm run scan` (contraste/desbordes/errores en todos los estilos). **Corre ambos antes de proponer un push.** Lección aprendida: una captura bonita no basta; los errores reales salieron al abrir estados secundarios (modo «Editar», diálogos) en cada estilo, claro y oscuro.

## Publicar
1. `git pull`; edita; `cd dev && npm run verificar` (= `npm test` + `npm run scan` + sello; ~12 min, con `npm run serve` corriendo). Las pruebas y el escáner salen con error si algo falla (en el escáner, solo los errores de JS: los avisos de contraste tienen falsos positivos conocidos).
2. Muestra captura/demo al dueño y espera su OK.
3. Los ganchos revisan los datos personales solos (arriba).
4. Commit en español, claro; `git push origin main`. Pages tarda 1–2 min; recargar con Ctrl+Shift+R.
5. Si cambias `inicio/` o `legal.html`, revisa también en móvil. Las capturas de celular de la landing (`inicio/img/*.jpg`) son de la app con datos de ejemplo; hay que regenerarlas si el diseño cambia mucho.
6. La landing es un documento completo: `<!doctype html>`, `<html lang="es-PE">` y `<meta name="viewport">` (sin ellos, en celulares se ve como escritorio en miniatura; `npm run scan` lo detecta emulando un teléfono real). La vista previa al compartir usa `inicio/img/og.jpg` (1200×630, datos de ejemplo); si cambian el titular o el diseño, regenérala. `sitemap.xml` va en la raíz.

## Producto y negocio
- Idea de precio (a validar con la beta): núcleo gratis; reportes, historial y extras de pago; punto de partida S/ 9.90 al mes o S/ 79 al año.
- Siguiente paso de más valor: que 5–10 personas la usen unas semanas y medir si la usarían de verdad, antes de construir cobros.
- Su meta financiera n.º 1 es el fondo de emergencia (la app lo muestra en escalones).

## Pendiente (de más a menos valor)
0. **Del dueño, después del rediseño (nov. 2026):** reservar `missoles.pe`; registrar «MisSoles» en Indecopi (mejor marca mixta); mandar invitaciones con `…/mis-finanzas/#crear` y marcar `aprobado` en `lista_espera`.
1. Beta con 5–10 personas; mensaje de invitación con el link de `/inicio/`.
2. Activar la protección de contraseñas filtradas en Supabase.
3. Importar movimientos del banco (CSV/Excel) — pospuesto, sería la función de pago más valiosa.
4. Modelo de cobro (Yape/tarjeta/Stripe, a decidir) y límites freemium.
5. Reportes PDF/Excel en inglés.
6. Sello «Cuadra» en la app cuando las cuentas coinciden con el banco (hoy solo existe en la propuesta visual).
7. La pantalla de acceso/onboarding aún no usa la piel Cuadre (hereda colores y tipografía, pero no los bordes rectos ni la sombra dura).
8. ~~Contraste mínimo~~ hecho: BCP, «−33%» y los días del calendario pasan 4.5:1 en los 3 estilos. El escáner ya lee `color-mix`; si salta un aviso nuevo de contraste, es real.
9. `README.md` y `docs/*` aún hablan de «Plantilla Personal de Finanzas» y de Google Sheets; actualizarlos a Cuadra.
10. Textos legales y revisión con abogado, cuando haya ingresos.

## Decisiones ya tomadas (no reabrir sin motivo)
- «Gasto por día» cuenta solo gastos fijos y hormiga (dinero líquido); los consumos de tarjeta no entran, a propósito. Si no hay gastos, el mensaje lo explica.
- Las cuentas de ahorro en cero se pueden quitar (`cfg.ahoOcultas`); con saldo distinto de cero no se pueden quitar; el historial se conserva.
- El botón de idioma EN/ES en pantallas de 360 px baja a una segunda fila: aceptado.
- El objetivo del fondo de emergencia lo define el usuario, no la app.
