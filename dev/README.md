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
- `npm test` — regresión completa (~10 min): t61 (74 comprobaciones: flujos, móvil, desbordes), t73 (acceso, recuperar contraseña, borrar cuenta, onboarding), t74 (sugerencias de metas), t82 (idioma ES/EN), t83 (quitar cuentas de ahorro), t84 (abrir en el mes actual), t85 (equipo compartido: los datos del navegador no pasan a otra cuenta y se borran al cerrar sesión).
- `npm run scan` — escáner automático: contraste de texto, desbordes y errores de JS en 3 estilos × claro/oscuro × móvil/escritorio, en la app, acceso/onboarding, landing y legal. Los avisos con `need:"grad"` y los de campos desactivados son falsos positivos conocidos (fondos con degradado).
- `sk.js` / `ed.js` — capturas rápidas por estilo y del modo «Editar cuentas».

## Reglas del arnés
- Las pruebas bloquean toda red salvo 127.0.0.1:8765 y reemplazan Chart.js por la copia local de `node_modules`. Supabase está simulado (nada toca la base real).
- Una prueba nueva debe imitar a t84 (plantilla corta): siembra `localStorage['mis-finanzas-prototipo-v1']` con `demo.json` y abre `wrap-repo.html#mes`.
- Para probar fechas (mes actual, Lima) se reemplaza `Date` con un `addInitScript` (ver t84).
