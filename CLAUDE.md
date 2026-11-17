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
- Los textos legales (`legal.html`) ya llevan el nombre del responsable, su correo de contacto y la fecha (10 nov. 2026), por decisión expresa del dueño al abrir la beta. Si cambia el titular (p. ej. una empresa) o la fecha, se actualizan los tres sitios de cada idioma. Esos datos se quitaron a propósito de `~/.cuadra/vigilar.txt` para que el gancho no los bloquee; no los vuelvas a añadir ahí.

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
- **Datos**: `S[año][mes]` (mes 0–11) con secciones `liq` (liquidez), `ing`, `fij`, `hor` (gastos cotidianos; antes «hormiga»), `bbva`/`bcp`/`oh` (tarjetas), `aho` (ahorro), `inv`, `eur`. Cada fila: `{c, m, f, k, src, card, cur, t}`.
- Los saldos de ahorro son **acumulados entre meses y años** por nombre de cuenta (`ahoAccts`); el «ahorro del mes» y el progreso de metas cuentan solo los movimientos del mes. Por eso diciembre ya muestra saldos.
- `localStorage['mis-finanzas-prototipo-v1']` guarda todo; `cfg` es la configuración (incluye `ahoOcultas`, `ahoV` = versión de migración). Con sesión, se sincroniza con Supabase (`estado`, `estado_historial`).
- **Dueño de los datos locales**: `localStorage[KEY+'-owner']` guarda el id del usuario. Si entra otra cuenta en ese navegador, `sbReady` borra los datos locales (`wipeLocal()`) sin subirlos y recarga; sin marca, los adopta la primera cuenta. Cerrar sesión también llama a `wipeLocal()` (avisa si quedan cambios sin subir). Solo se conservan `-skin` y `-tema`. Toda clave nueva de datos debe empezar con `KEY` para que se borre. Prueba: `dev/t85.js`.
- **Fecha**: `now` es la fecha de Lima (`limaD()`) y se refresca sola al cambiar el día (`dayTick`); `YEARS` va de 2025 al año siguiente al actual. No uses `new Date()` para decidir «hoy» o el «mes actual».
- **Rutas por hash**: `#resumen`, `#enero`…`#diciembre`, `#capturar`. Sin hash y con datos, abre en el mes actual (hora de Lima); sin datos, en el Resumen.
- `sw.js`: service worker «red primero» para las páginas.
- **Gráficos perezosos**: `mkChart` crea cada gráfico recién cuando está a <300 px de la pantalla (IntersectionObserver). Para capturas de página completa (p. ej. `inicio/img/*.jpg`), baja con scroll antes de capturar o los gráficos de abajo saldrán vacíos.
- **Rutas extra**: `#ajustes` es pantalla propia (antes vivía al fondo del Resumen). En celular (<900 px) hay barra inferior `#bnav` y atajos «Ir a…» (`data-jump`).
- **Registro («+»)**: `openSheet(true)` abre primero la ventana «¿Cómo quieres registrar?» (`data-mode=ask`): **Manual** (asistente por pasos: una ventana por decisión — movimiento → tipo → tarjeta/cuenta de ahorro → de dónde sale → monto y concepto; los pasos los calcula `wizFlow()` y se muestran con `wizGo()`; los botones `+ Agregar…` saltan los pasos de tipo con `ent.lock`; «Cambiar a manual» desde Automático, editar y el resto de flujos usan el formulario completo sin pasos) o **Automático** (una frase en `#smsg` con tarjeta de confirmación `#sapv`; si falta la cuenta, pasa a manual y la pide). También la piden todos los botones `+ Agregar…` (el tipo queda fijo con `ent.lock`); editar, pagar tarjeta y las acciones de ahorro llaman a `openSheet()` sin ventana. Los atajos (`#ssug`, solo en Manual) salen **únicamente** de los gastos recurrentes (`cfg.rec`) que la persona configuró en Ajustes o creó marcando «Repetir cada mes» en «Más detalles»; nunca se inventan desde el historial. Un toque los registra. Un **ingreso** también pregunta «¿En qué cuenta se deposita?» (opcional: «No sumar a ninguna cuenta») y la suma al saldo: `applyDed` guarda en `_d` el monto con signo negativo para `ing`, así `revDed` lo revierte igual al editar, borrar o deshacer. Prueba: `dev/t91.js`. **Moneda**: el botón `#scur` (una píldora dentro del recuadro del monto, a la derecha y centrada en vertical; solo se ve cuando hay monto; el monto lleva el símbolo grande `#samtcur` a su izquierda) alterna entre S/ y la **segunda moneda** de `cfg.monedaAlt` (`$` o `€`, por defecto `$`; se elige en Ajustes → «Segunda moneda al registrar» y `saneCfg` la corrige si llega otra cosa). Antes recorría S/ → $ → €; ahora solo las dos que la persona configuró. Pone `ent.cur`; el resto (fila con `cur`, conversión con el tipo de cambio) es la lógica de siempre. El primer paso del asistente NO pregunta la moneda (se probó y se descartó: la opción de siempre junto al monto se mantiene). Prueba: `dev/t93.js`. La clase se elige sola por el historial del concepto (`autoCls`). Pruebas: `dev/t89.js` (atajos) y `dev/t90.js` (ventana y nombre). El nombre visible de la sección `hor` es **«Cotidiano»** (nov. 2026); el código sigue llamándola `hor`.
- **Métricas** (`track(ev,dato)`, bloque tras `SB_URL` en `index.html`): eventos anónimos del registro (`reg_abrir`, `reg_modo`, `reg_paso`, `reg_guardar`, `reg_abandono`, `atajo`, `auto_fallback`), `dia_activo` y `error`. **Nunca** llevan montos, conceptos, cuentas, correo ni el id del usuario: solo un id aleatorio del dispositivo (`cuadra-sid`), el evento, un dato corto y la versión (`APPV`; súbela al publicar). Se envían en lotes a la tabla `eventos` (`supabase/eventos.sql`: insert anónimo con freno, sin lectura pública; las consultas están en el propio SQL). `TRACK_DEFAULT=true` (encendido el 16 nov. 2026, con la política de privacidad actualizada); cada persona decide en Ajustes → Privacidad (`cuadra-stats` = 0/1; esa clave y `cuadra-sid` no empiezan con `KEY` a propósito, para que sobrevivan a cerrar sesión). Los errores de red se ignoran. Prueba: `dev/t92.js`.
- **Estrategia de caché** (se mide con un perfil de CPU antes de cachear: `dev/` no lo trae, se usa CDP `Profiler`; lo caro era rehacer cosas, no los cálculos de dinero):
  - *Cálculo*: un solo `Intl.NumberFormat` (`NF2`, usado por `fmt`/`num2`) y un solo `Intl.DateTimeFormat` de Lima (`LIMA_DF`, usado por `limaD`/`hoyLima`). No vuelvas a `toLocaleString` en bucles.
  - *Colores del tema*: `cv()` y `hmInk()` guardan lo leído de `getComputedStyle`, con clave `themeKey()` (estilo + tema + preferencia del sistema). Si añades otra forma de cambiar colores en pantalla, incluye ese dato en `themeKey()`.
  - *Gráficos*: `mkChart` encola y `chFlush` mide todo primero y crea después; los que están a >300 px de la pantalla esperan con `IntersectionObserver`.
  - *Service worker* (`sw.js`): páginas «red primero»; estáticos «caché primero»; ExcelJS/jsPDF se guardan al primer uso (`RUNTIME`). **Al cambiar un asset estático sube `CACHE` (v4, v5…)**, y `REP_JS` (`reportes.js?v=N`) en `index.html`, o los usuarios verán la versión vieja.
  - *Supabase*: `loadFromSheet` consulta primero solo el `stamp` y baja los datos solo si cambió.
- **Segundo plano**: no hay servidor propio, así que la «cola» vive en el navegador. Los reportes PDF/Excel se arman en un Web Worker (`reportes.js`; si no hay worker, el mismo archivo corre en la página; las librerías se verifican con SRI). La sincronización usa espera de 2,5 s + bandera `dirty` en localStorage (`queueSync`/`pushNow`). Los correos de confirmación y de recuperar contraseña los envía Supabase Auth, no la app. `dev/build-wrap.js` copia `reportes.js` a `dev/` para las pruebas y el gancho de subida lo vigila.
- **Datos de entrada (seguridad)**: lo que llega de localStorage, de un respaldo `.json` o de la nube pasa por `saneS`/`saneCfg` (tipos, 12 meses por año, monedas válidas, números finitos). **Una sección o campo nuevo en un mes o en `cfg` hay que añadirlo a `saneMonth`/`saneCfg`, o se descartará al cargar.** `esc()` escapa también `'` y `` ` ``. Ojo: `saneS` corre al arrancar, antes de que se declaren constantes más abajo; no uses ahí constantes de otras zonas (un `ReferenceError` se traga en silencio y deja los datos en blanco; ya pasó). `render()` tiene una pantalla de rescate (`crashScreen`) por si algo se cuela.
- **Montos**: toda lectura de un monto escrito por una persona usa `parseMonto` (acepta `1,200`, `1.200`, `1,234.50`, `1.234,50`, `S/ 12`; devuelve `NaN` si no se entiende). No uses `parseFloat` sobre texto libre.
- **Sincronización** (`sbCall`, `scheduleRetry`, `flushSync`, `authLocked`): tiempo límite de 15/20/30 s con cancelación; reintentos de 3 s a 60 s (no se reintenta lo que no se arregla solo); se sube al volver internet y al ocultar la pestaña; si editas mientras carga, no se pisa tu edición (queda en conflicto para que elijas); otra pestaña que cierre sesión bloquea el guardado y recarga; los cambios de otra pestaña se adoptan (evento `storage`). Pendiente conocido: si entra otra cuenta con cambios sin subir, se borran sin aviso (a propósito, por privacidad); dos pestañas editando a la vez el mismo campo todavía pueden pisarse.
- **Almacenamiento lleno**: `localSave` libera la copia diaria local y reintenta; si aun así no cabe, muestra el cartel permanente `#savewarn` con botón para descargar una copia.
- **Accesibilidad** (`dev/t88.js`, en `npm test`): `render()` devuelve el foco al elemento que lo tenía (`focusKey`/`restoreFocus`, por id o por atributo `data-*`; solo botones, enlaces, selects y resúmenes); Escape cierra cualquier diálogo (`#sheet`); el aviso «Deshacer» dura 10 s, se detiene al señalarlo y se deshace con Ctrl+Z; los gráficos llevan su descripción en `aria-label` (`chDesc`); hay estilos `forced-colors`, `max-height:520px` (zoom 400 %) y botones de 44 px con `pointer:coarse` (ojo: hay bloques `pointer:coarse` repetidos más abajo en el CSS y el último gana). Para inglés, todo texto nuevo va a `I18N_EN` o `I18N_PAT`; el barrido de t88 comprueba los textos que antes se escapaban.
- **Pruebas** `dev/t87.js` (datos dañados, montos, almacenamiento lleno, sincronización con Supabase simulado, avisos sobre «Guardar»): corre en `npm test`. Contra la versión anterior al lote 1 falla en 32 comprobaciones; si deja de fallar con un error reintroducido, la prueba está mal.
- **SEO**: la landing lleva `robots`, Open Graph/Twitter y JSON-LD (Organization, WebSite, WebApplication); la app lleva `noindex` (es una pantalla de acceso) pero sí Open Graph, para la vista previa de las invitaciones por WhatsApp. `robots.txt` y `sitemap.xml` solo cuentan en la raíz de un dominio: funcionarán con `missoles.pe`.

### Supabase
Tablas `estado` y `estado_historial` (RLS por usuario), RPC `delete_my_account()` (SECURITY DEFINER a propósito; el aviso del linter es esperado), `eventos` (métricas anónimas: insert anónimo con freno, sin lectura pública; ver «Métricas»), y `lista_espera` (insert anónimo, nadie puede leerla con la clave pública; los correos se ven en el Table Editor). SQL en `supabase/` (`rls-rapido.sql` ya aplicado en nov. 2026: políticas de `estado` con `(select auth.uid())` y solo para `authenticated`; los índices ya cubren todas las consultas de la app, porque todo se busca por `user_id` y fecha). Pendiente suyo: activar «Leaked password protection» en Authentication.

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
5. Si cambias `inicio/` o `legal.html`, revisa también en móvil. Las capturas de celular de la landing (`inicio/img/*.jpg`) y `og.jpg` salen de `cd dev && npm run capturas` (siempre con `demo.json`, nunca con datos reales); regenéralas si el diseño cambia y sube `CACHE` en `sw.js`, porque se sirven «caché primero».
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
9. ~~README y docs~~ hecho (nov. 2026): el README describe MisSoles; los documentos de la primera etapa llevan una nota de «histórico».
10. Textos legales y revisión con abogado, cuando haya ingresos.
11. **Plan de mejoras (propuesto y aceptado el 16 nov. 2026; estilo: una decisión por pantalla, camino rápido para quien tiene prisa, saldos reales en soles).** En este orden, midiendo con los testers antes de cada paso y dejando una semana de uso real tras cualquier cambio que toque dinero:
    1. **Medir y ver errores** (en curso): métricas anónimas y reporte de errores (`track()`, `supabase/eventos.sql`; ver «Métricas» en Arquitectura). Estado (16 nov. 2026): **ENCENDIDO** por defecto (`TRACK_DEFAULT=true`, con interruptor en Ajustes → Privacidad). La tabla `eventos` está aplicada en Supabase (migración `eventos_metricas`, verificada: insert anónimo sí, evento inválido no, lectura pública vacía) y la política de privacidad (`legal.html`, español e inglés) ya lo explica. Para mirar resultados, usa las consultas al final de `supabase/eventos.sql` en el SQL Editor; revisa también los errores. Si alguna vez se amplía lo que se mide, hay que actualizar la política antes.
    2. **«Por pagar este mes»** para los gastos fijos (aparecen solos cada mes, se marcan con un toque; reutiliza `cfg.rec`).
    3. **Recordar el modo preferido** (Preguntar siempre / Siempre Automático / Siempre Manual) para quien registra muchas veces al día.
    4. **Historial por cuenta** («movimientos de esta cuenta»): ahora que los ingresos suman a las cuentas, el usuario debe ver por qué un saldo cambió.
    5. **Automático más listo** (números en palabras, «ayer», «lucas», varios gastos en una frase) y después el **botón de micrófono** (Web Speech API; el audio lo procesa el navegador y hay que decirlo en la política de privacidad).
    6. **Alta inicial guiada** con el mismo estilo de pasos (cuentas, saldos, tarjetas) y un mes de ejemplo.
    7. **Antojo** separado de Cotidiano + «¿Valió la pena?» (toca la estructura de datos: añadir el campo a `saneRow`).
    8. **Pruebas en paralelo** (la verificación tarda ~15 min; bajarla a ~5).
    9. **Partir `index.html` en módulos** con un paso de compilación pequeño, empezando por el registro; hace falta antes de mezclar con CoreFlow.
    Además: resumen semanal dentro de la app; cargar supabase-js sin bloquear la primera pantalla; activar la protección de contraseñas filtradas. **Tres números para decidir si cobrar:** % de testers que registran ≥3 días por semana, tiempo del primer registro y cuántos pagarían.
12. **Visión a futuro (decidida nov. 2026): una sola app** que mezcle MisSoles con CoreFlow (`C:\proyectos\P.CoreFlow\coreflow`: Agenda, Tareas, asistente con IA, resúmenes). Va **después de la beta**, no antes. Idea de base: MisSoles sigue siendo el motor de dinero (saldos reales por cuenta); se le añaden Agenda con gasto previsto vs. saldos, Tareas, asistente con Claude (function calling; la IA nunca calcula dinero) y resumen diario. Se reutilizan las ideas de CoreFlow, no su código Django. Antes de construir, decidir con el dueño la arquitectura (ver la conversación del 11 nov. 2026).

## Decisiones ya tomadas (no reabrir sin motivo)
- «Gasto por día» cuenta solo gastos fijos y cotidianos (dinero líquido); los consumos de tarjeta no entran, a propósito. Si no hay gastos, el mensaje lo explica.
- Las cuentas de ahorro en cero se pueden quitar (`cfg.ahoOcultas`); con saldo distinto de cero no se pueden quitar; el historial se conserva.
- El botón de idioma EN/ES en pantallas de 360 px baja a una segunda fila: aceptado.
- El objetivo del fondo de emergencia lo define el usuario, no la app.
