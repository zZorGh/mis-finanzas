# Plantilla Personal de Finanzas

Proyecto personal (uso propio, no comercial) para llevar mis finanzas mensuales en una página web simple (de ahí el nombre), con Google Sheets como base de datos. 

## Qué hace
- Un apartado por mes y un Resumen por año, con gráficos (ingreso, gastado y ahorrado; ahorro sobre el ingreso; gastos hormiga; año contra año).
- Apartados: Ingresos, Presupuesto (control 50/30/20), Apuntes, Gastos fijos, Gastos hormiga, BBVA, BCP, oh!, Ahorros, Inversiones y Liquidez (Yape, Plin, efectivo).
- Al registrar un gasto pregunta de dónde sale (Yape, Plin, efectivo, banco) y lo descuenta.
- Gastos recurrentes, traer el mes anterior, cuadrar cuentas, meta del fondo de emergencia con fecha y aviso del límite de gastos hormiga.
- Tarjetas que se mueven, cambian de tamaño, se configuran o se ocultan (modo Personalizar). Moneda configurable por apartado.
- Respaldo: descarga en JSON o CSV y restauración desde el JSON.


## Case study

Las decisiones de producto y sus trade-offs están en [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md).

## Cómo está hecho
- Un solo archivo `index.html`: HTML, CSS y JavaScript sin framework. Gráficos con Chart.js 4.4.1 (cdnjs) y fuentes IBM Plex (Google Fonts).
- Los datos se guardan en el navegador (localStorage) y, si se conecta, en dos pestañas de una hoja de Google: `Registro` (un movimiento por fila) y `Config` (ajustes, diseño y marca de guardado).
- Pensada para publicarse como *artifact* de claude.ai: ahí usa el conector de Google Sheets del usuario (`mcp`) y las descargas (`downloads`). Fuera de claude.ai funciona igual, pero solo con datos locales y sin conexión a la hoja ni descargas.
- Diseño: ver [`docs/MASTER.md`](docs/MASTER.md).

## Privacidad
Este repositorio no incluye datos personales: ni movimientos, ni saldos, ni el ID de la hoja. Los datos viven en mi navegador y en mi hoja de Google. El ID de la hoja se escribe en Ajustes, dentro del Resumen.

## Pendiente
- Ingreso de gastos desde el celular por WhatsApp (requiere un servicio externo que reciba los mensajes).
- Cargar enero a junio de 2025.
