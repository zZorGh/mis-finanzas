# Registro de decisiones (ADR)

Decisiones de arquitectura y producto de este proyecto, con su contexto, las
alternativas que descarté y las consecuencias. Formato ADR (Architecture Decision
Record), pensado para dejar claro el *por qué* detrás de cada elección.

---

## ADR-001 · La hoja de cálculo es la base de datos

**Contexto.** Necesitaba persistir los datos y poder usarlos desde el navegador y
el celular, sin pagar infraestructura ni ceder el control de la información.

**Decisión.** Usar la propia Google Sheet del usuario como base de datos (pestañas
`Registro` y `Config`), en lugar de montar un backend con su propia base de datos.

**Alternativas consideradas.**
- Backend propio (Supabase/Postgres): más potente, pero costo, mantenimiento y una
  dependencia externa para un uso de una sola persona.
- Solo almacenamiento local del navegador: simple, pero sin respaldo ni acceso
  entre dispositivos.

**Consecuencias.** Cero costo, el usuario es dueño de sus datos y puede abrirlos sin
la app. A cambio: no es multiusuario y tiene techo de escala (irrelevante para
finanzas personales). La hoja queda como fuente de verdad y respaldo a la vez.

---

## ADR-002 · Las tarjetas de crédito se modelan como crédito, no como gasto

**Contexto.** Registrar una compra con tarjeta como "gasto del mes" distorsiona el
mes: el dinero no sale hasta que se paga la tarjeta.

**Decisión.** Una compra con tarjeta sube la deuda y baja el crédito disponible,
pero **no cuenta como gasto**. El gasto se registra **cuando se paga la tarjeta**.

**Alternativas consideradas.**
- Tratar la tarjeta como una cuenta más y descontar al comprar: simple, pero miente
  sobre el gasto real del mes.

**Consecuencias.** Los números del mes reflejan el dinero que de verdad salió. A
cambio, se pierde la categoría de cada compra individual con tarjeta. Decidí que la
fidelidad del mes vale más que esa granularidad.

---

## ADR-003 · Una sola página, sin framework

**Contexto.** El proyecto lo desarrollo iterando rápido, y quería que fuera fácil de
servir en cualquier lado y de mantener a futuro.

**Decisión.** Un único archivo HTML con CSS y JavaScript "a mano" (vanilla), con
Chart.js como única dependencia para los gráficos.

**Alternativas consideradas.**
- React u otro framework: mejor para apps grandes, pero agrega build, dependencias y
  peso para algo que no lo necesita.

**Consecuencias.** Portable, sin paso de compilación, fácil de incrustar como
artifact o servir desde Apps Script. A cambio: menos ecosistema de componentes.

---

## ADR-004 · Un solo código, dos formas de abrirlo

**Contexto.** Quería iterar rápido asistido por IA, pero entregar un producto que
viviera sin esa dependencia y sin pedir login de terceros.

**Decisión.** La misma página detecta su entorno y usa la capa de datos adecuada:
el conector dentro de la herramienta de IA, o `google.script.run` cuando corre como
app web de Google (Apps Script). Una sola base de código, dos backends.

**Consecuencias.** Velocidad de iteración + independencia del producto final. A
cambio, una capa de abstracción extra en la sincronización (`backend.read/write`).

---

## ADR-005 · Descontar del origen, con corrección reversible

**Contexto.** Una herramienta de dinero solo sirve si los saldos cuadran. Un error
al registrar no debe dejar la cuenta mal para siempre.

**Decisión.** Cada gasto guarda de qué cuenta salió y cuánto se descontó. Borrar o
editar un movimiento **devuelve el monto exacto** a esa cuenta, aunque sea días
después.

**Consecuencias.** Integridad de datos y confianza: el usuario puede corregirse sin
miedo. A cambio, más lógica de reconciliación y un campo extra por movimiento.
