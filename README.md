# MisSoles

App web de finanzas personales **en soles**, pensada para cómo se paga en el Perú: Yape, Plin, efectivo y tarjetas de crédito. Está en **beta cerrada por invitación**.

- **Conócela:** https://zzorgh.github.io/mis-finanzas/inicio/
- **App:** https://zzorgh.github.io/mis-finanzas/ (necesitas una invitación; anótate en la lista de espera desde la landing)

## Qué hace
- **Registro en segundos:** un botón «+», o escribe «almuerzo 25 yape» y la app llena el resto. Entiende montos como `1,200` o `S/ 12.50`.
- **Tu dinero real:** cada gasto se descuenta de la cuenta de donde salió (Yape, Plin, efectivo), y «Cuadrar cuentas» lo iguala con el saldo de tu banco.
- **Tarjetas de crédito como deuda**, no como gasto doble: línea, deuda, disponible y día de pago.
- **Ahorros** por cuenta, con TREA o TEA y lo que ganarías al mes y al año; metas y fondo de emergencia.
- **Presupuesto 50/30/20**, gastos hormiga con alerta, gastos recurrentes y resumen del año con gráficos.
- **Reportes** en PDF y Excel con formato de estado de cuenta.
- **Tus datos son tuyos:** cuenta privada, historial de 30 días para volver atrás, copia completa descargable, funciona sin señal y se sincroniza al volver.
- Español e inglés, tema claro y oscuro, tres estilos, y se instala en el celular como una app.

## Cómo está hecha
- **Sin framework y sin paso de compilación:** la app es un solo `index.html` (HTML, CSS y JavaScript), más `reportes.js` (arma los PDF y Excel en un Web Worker) y `sw.js` (funciona sin conexión). Se publica con GitHub Pages desde `main`.
- **Datos:** Supabase (Postgres, Auth y seguridad por fila: cada cuenta solo ve lo suyo). En el navegador se guarda una copia local para trabajar sin señal.
- **Librerías por CDN, verificadas con SRI:** Chart.js, supabase-js y, solo al generar reportes, ExcelJS y jsPDF.
- **Landing** en `inicio/` y textos legales en `legal.html`.

```
index.html      la app
reportes.js     reportes PDF/Excel (Web Worker)
sw.js           service worker
inicio/         landing y sus capturas
legal.html      términos y privacidad
supabase/       SQL de tablas, políticas y límites
dev/            pruebas, escáner y herramientas (no se publica como parte de la app)
docs/           decisiones y documentos históricos del proyecto
```

## Probar
```bash
cd dev
npm install
npx playwright install chromium
npm run serve      # en otra terminal
npm run verificar  # regresión + escáner (~15 min)
```
Más detalle en [`dev/README.md`](dev/README.md). Las pruebas usan una cuenta de ejemplo (`dev/demo.json`) y un Supabase simulado: nada toca la base real.

## Privacidad del repositorio
Este repositorio es público y **no contiene datos personales**: ni movimientos, ni saldos, ni correos. Los ganchos de `.githooks/` lo comprueban en cada commit y en cada subida (`dev/regla-de-oro.js`). La clave `sb_publishable_…` que aparece en el código es pública por diseño; la seguridad está en las políticas de la base de datos.

## Documentación
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): cómo elige la app su capa de datos.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): registro de decisiones.
- [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md) · [English](docs/CASE-STUDY.en.md), [`docs/ROADMAP.md`](docs/ROADMAP.md) y [`docs/MASTER.md`](docs/MASTER.md): documentos de la primera etapa del proyecto, cuando era una plantilla personal sobre Google Sheets. Se conservan como historia.
- `CLAUDE.md`: guía de trabajo y estado actual del proyecto.
