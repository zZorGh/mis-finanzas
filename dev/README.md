# dev/ — pruebas y herramientas

No forma parte de la app (GitHub Pages solo publica lo que enlaza `index.html`). No contiene datos personales: `demo.json` es una cuenta de ejemplo.

## Primera vez
```
cd dev
npm install
npx playwright install chromium
```

## Uso
- `npm run serve` — servidor local en http://127.0.0.1:8765 (déjalo corriendo en otra terminal; sirve esta carpeta).
- `npm run wrap` — genera `wrap-repo.html` (el `../index.html` dentro de un esqueleto mínimo). **Hay que volver a correrlo después de cada cambio en `index.html`**; `npm test` y `npm run scan` ya lo hacen.
- `npm test` — regresión completa, **en paralelo** (~3 min en 12 núcleos; ver `paralelo.js` más abajo): t61 (74 comprobaciones: flujos, móvil, desbordes), t73 (acceso, recuperar contraseña, borrar cuenta, onboarding), t74 (sugerencias de metas), t82 (idioma ES/EN), t83 (quitar cuentas de ahorro), t84 (abrir en el mes actual), t85 (equipo compartido: los datos del navegador no pasan a otra cuenta y se borran al cerrar sesión), t86 (integridad de librerías: una alterada no se ejecuta; PDF y Excel siguen funcionando — **necesita internet**, baja ExcelJS y jsPDF reales).
- Las librerías del CDN llevan `integrity` (en los `<script>` y en `SRI` dentro de `index.html`). Si cambias de versión, recalcula la huella: `curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A`. Al simular un script en una prueba, responde con `access-control-allow-origin: *` o el navegador lo rechaza.
- Además corren `t87` (datos dañados, montos, almacenamiento lleno y sincronización con un Supabase simulado), `t88` (accesibilidad e inglés), `t89` (atajos de un toque, solo desde recurrentes), `t90` (ventana Manual/Automático, asistente por pasos y el nombre «Cotidiano»), `t91` (los ingresos se suman a la cuenta elegida y se revierten) `t93` (el botón de moneda rota entre soles y las monedas activas en Ajustes), `t94` (saldo insuficiente: aviso, alternativas, «Guardar igual» y bloqueo opcional) y `t92` (métricas anónimas: apagadas por defecto, sin datos personales). Los registros abren primero la ventana de elección: en las pruebas, el ayudante `man(p, 'auto' | 'wizard')` elige el modo (sin parámetro entra al formulario completo por «Cambiar a manual»).
- `t95.js`: «Por pagar este mes» (tarjeta de recurrentes pendientes, `Pagado` con un toque, deshacer, sin saldo, meses pasados/futuros, inglés).
- `t96.js`: los tres grupos de categorías (tarjeta «¿Dónde gastas más?», clasificar en Ajustes, 50/30/20, datos dañados, inglés).
- `t97.js`: modo preferido del «+» (preguntar, siempre manual, siempre automático).
- `t98.js`: pasos de grupo y categoría al registrar un gasto.
- `t99.js`: Automático más listo (números en palabras, lucas, mil, dólares, ayer/anteayer, varios gastos, saldo, inglés).
- `t100.js`: botón de micrófono (reconocedor simulado: aviso, dictado en vivo, errores, apagado, sin soporte, inglés).
- `t101.js`: historial por cuenta (saldo ahora/partida, movimientos con efecto y saldo, editar desde ahí, otra cuenta, inglés).
- `t102.js`: alta inicial guiada (5 pasos, validaciones, atrás, terminar/omitir, qué se guarda, Por pagar, inglés).
- `t103.js`: Antojo (tipo al registrar, tarjeta del mes, ¿Valió la pena?, editar, Automático, 50/30/20, inglés).
- `npm run capturas` — regenera las capturas de celular de la landing (`inicio/img/*.jpg`) y `og.jpg` con los datos de ejemplo (`landing-shots.js`, plantilla `og.html`). Si cambian, sube también `CACHE` en `sw.js`.
- `npm run verificar` — `node paralelo.js`: pruebas + escáneres a la vez (~4 min; antes ~13 en serie) y, si todo pasa, guarda el sello `dev/.sello-pruebas` (no se sube). El gancho `pre-push` no deja subir cambios de la app sin un sello de esa versión exacta. Todas las pruebas salen con código 1 si alguna comprobación falla; el escáner, solo si hay errores de JS.
- `npm run regla` — revisa todo el repo contra la regla de oro (claves secretas, archivos de datos y tu lista privada `~/.cuadra/vigilar.txt`). Ver `regla-de-oro.js`.
- `npm run scan` — escáner automático: contraste de texto, desbordes y errores de JS en 3 estilos × claro/oscuro × móvil/escritorio, en la app, acceso/onboarding, landing y legal. Los avisos con `need:"grad"` y los de campos desactivados son falsos positivos conocidos (fondos con degradado).
- `sk.js` / `ed.js` — capturas rápidas por estilo y del modo «Editar cuentas».

## Reglas del arnés
- Las pruebas bloquean toda red salvo 127.0.0.1:8765 y reemplazan Chart.js por la copia local de `node_modules`. Supabase está simulado (nada toca la base real).
- Una prueba nueva debe imitar a t84 (plantilla corta): siembra `localStorage['mis-finanzas-prototipo-v1']` con `demo.json` y abre `wrap-repo.html#mes`.
- Para probar fechas (mes actual, Lima) se reemplaza `Date` con un `addInitScript` (ver t84).

## Pruebas en paralelo (`paralelo.js`)
- `npm run verificar` / `npm test` / `npm run scan` usan `paralelo.js`: cada `t*.js` y cada escáner abre su propio navegador, así que corren a la vez (por defecto la mitad de tus núcleos, entre 2 y 8; cámbialo con `PRUEBAS_HILOS=4`). **Una prueba nueva `tNNN.js` se incluye sola**, sin tocar `package.json`.
- Levanta el servidor de pruebas si no está corriendo, genera `wrap-repo.html` una vez y muestra una línea por trabajo con su tiempo. Las más lentas arrancan primero (los tiempos se guardan en `.tiempos-pruebas.json`, que no se sube).
- Lo que falla se vuelve a correr **a solas, una vez**: si pasa, se avisa como «intermitente» (suele ser carga de la máquina) y no tumba la verificación; si falla otra vez, es un fallo real y se muestran sus últimas líneas.
- `node paralelo.js t90 t94` corre solo esas pruebas (sin sello). `--pruebas` y `--escaneos` corren solo una parte.
- **El sello solo se guarda si la app no cambió mientras corrían las pruebas** (la huella de `index.html`, `legal.html`, etc. se compara al empezar y al terminar). Aun así, no edites la app mientras corre.
- Para volver a correr todo en serie (más lento, por si se sospecha de la carga): `npm run verificar:serie`, `npm run test:serie`, `npm run scan:serie`. Esa lista de `package.json` sí hay que mantenerla a mano.
