# Registro de decisiones (ADR)

> **Nota (nov. 2026).** Las primeras decisiones son de cuando el proyecto era una plantilla personal sobre Google Sheets; siguen aquí como historia. La web pública de **MisSoles** usa Supabase (ver [ARQUITECTURA](ARQUITECTURA.md)).

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

---

## ADR-006 · Registro en dos modos: Manual por pasos o Automático (nov. 2026)

**Contexto.** En la beta, el formulario de registro abrumaba: muchos botones y grupos de opciones a la vez. A la vez, la gente que registra con prisa necesita una vía rápida (y a futuro, por voz).

**Decisión.** Al tocar «+» (y en cada «+ Agregar…») aparece primero una ventana con dos opciones: **Automático** (una frase como «almuerzo 25 yape», con una tarjeta de confirmación antes de guardar) y **Manual** (un asistente por pasos: una ventana por decisión — movimiento → tipo → tarjeta/cuenta → de dónde sale → monto y concepto). Los botones «+ Agregar …» ya conocen el tipo y se lo saltan. Editar y las acciones de ahorro/tarjeta mantienen el formulario completo.

**Alternativas consideradas.** Un solo formulario con más secciones plegadas (menos pasos, pero seguía abrumando); registrar solo por texto (más rápido, pero menos guiado para quien empieza).

**Consecuencias.** Más toques en Manual (4 o 5), a cambio de claridad; lo rápido queda en Automático y en los atajos. Si Automático no sabe la cuenta, no guarda a ciegas: pasa al formulario completo y la pide.

---

## ADR-007 · «Hormiga» pasa a llamarse «Cotidiano» (nov. 2026)

**Decisión.** La sección `hor` se muestra como **Cotidiano** (gastos del día a día) junto a **Fijo**; en el formulario, «Fijo» va primero. El código y los datos siguen usando `hor`, así que no hay migración. En la landing se conserva «gasto hormiga» solo en la calculadora, porque es el término que la gente conoce y busca.

**Consecuencias.** Textos, gráficos, alertas e inglés cambian; las capturas de la landing se regeneran. La clase (fijo/cotidiano) se elige sola según el historial del concepto, y se puede cambiar a mano.

---

## ADR-008 · Los atajos de un toque salen solo de lo que la persona configura (nov. 2026)

**Contexto.** Una primera versión sugería atajos desde el historial (los conceptos más usados); llenaba la pantalla de botones que nadie había pedido.

**Decisión.** Un atajo aparece únicamente si es un gasto **recurrente** que la persona configuró en Ajustes o creó marcando «Repetir cada mes» en «Más detalles». Un toque lo registra (con «Deshacer»). Sin recurrentes no hay atajos.

**Consecuencias.** El formulario sale limpio por defecto. No se añadió ningún campo nuevo a los datos: se reutiliza la lista de recurrentes (`cfg.rec`).

---

## ADR-009 · Los ingresos se suman a la cuenta donde se reciben (nov. 2026)

**Contexto.** Los gastos descontaban de la cuenta de origen, pero un ingreso solo se anotaba: los saldos de Yape, Plin o efectivo no cambiaban, y la app no preguntaba dónde se depositaba. Un tester lo notó.

**Decisión.** Al registrar un ingreso se pregunta en qué cuenta se deposita (con la opción «No sumar a ninguna cuenta», que conserva el comportamiento anterior). El monto se suma al saldo y se guarda en la fila con signo negativo en `_d`, de modo que editar, borrar o deshacer lo revierten con la misma lógica que los gastos. Automático entiende «sueldo 500 yape».

**Consecuencias.** Los saldos reflejan los ingresos. Los ingresos ya registrados no cambian (no tenían cuenta).

---

## ADR-010 · Métricas anónimas y reporte de errores, apagados hasta aprobar la tabla (nov. 2026)

**Contexto.** En la beta se decide a ciegas: no se sabe qué modo de registro usan, en qué paso se traba la gente ni qué errores ocurren en los teléfonos de los testers.

**Decisión.** La app puede enviar eventos anónimos (modo, paso, tipo de movimiento, errores de JavaScript) a una tabla `eventos` de Supabase, con un id aleatorio del dispositivo. No viajan montos, conceptos, cuentas, correos ni el id del usuario. La tabla solo permite insertar con la clave pública (con un freno contra el spam) y solo el dueño la lee. El código se publicó **apagado** y se encendió (`TRACK_DEFAULT=true`, 16 nov. 2026) solo después de que el dueño aprobó aplicar el SQL y de actualizar la política de privacidad. Para usuarios desconocidos se reevaluará pasarlo a «solo si aceptan». Cada persona puede apagarlo en Ajustes.

**Alternativas consideradas.** Un servicio externo de analítica (PostHog, Sentry): más completo, pero manda datos a un tercero y añade una dependencia; se reevalúa cuando haya usuarios de pago.

**Consecuencias.** Se podrá medir días activos, modos usados y abandono por paso; a cambio, una tabla más que mantener (retención sugerida de 90 días).
