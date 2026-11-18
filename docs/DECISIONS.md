# Registro de decisiones (ADR)

> **Nota (nov. 2026).** Las primeras decisiones son de cuando el proyecto era una plantilla personal sobre Google Sheets; siguen aquí como historia. La web pública de **MiS²oles** usa Supabase (ver [ARQUITECTURA](ARQUITECTURA.md)).

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

---

## ADR-011 · La moneda rota entre soles y las monedas que la persona activa (nov. 2026)

**Contexto.** El botón de moneda junto al monto recorría siempre tres opciones (S/, $, €). Se probó preguntar la moneda en el primer paso del asistente y luego limitar el botón a una sola «segunda moneda»; el dueño pidió mantener la opción de siempre junto al monto y que **rote por todas las monedas** del usuario.

**Decisión.** El botón de moneda (una píldora a la derecha del recuadro del monto, que resalta junto con su símbolo) rota entre soles y las monedas marcadas en Ajustes → «Monedas al registrar» (dólares y euros, ambas activas por defecto). Quien no usa una de ellas la desmarca y deja de aparecer; sin ninguna, el botón se oculta. El primer paso del asistente no pregunta la moneda. No cambia cómo se guardan ni se convierten los montos.

**Consecuencias.** Un campo nuevo en la configuración (`monedas`, lista), validado al cargar; la clave `monedaAlt` de una versión intermedia se descarta. El comportamiento por defecto es el de siempre.

---

## ADR-012 · El nombre pasa a MiS²oles (nov. 2026)

**Contexto.** El dueño quiso un nombre con juego tipográfico y un guiño a «soles al cuadrado», manteniendo el logo «S/».

**Decisión.** El nombre visible es **MiS²oles**. Los nombres grandes llevan el «2» elevado sobre la S, junto a las letras (sin separarlas); el texto corrido usa el carácter «²». Para lectores de pantalla, voz y buscadores se mantiene «MiSoles» (`aria-label`, `alternateName` en la landing).

**Alternativas consideradas.** Dejar «MisSoles» (gramaticalmente correcto: «mis soles») y cambiar solo el logo a «S²»; se descartó porque el dueño prefería conservar el logo.

**Consecuencias.** Unas 85 menciones cambiadas (app, landing, legal, reportes, documentos); hay que verificar misoles.pe e Indecopi antes de reservar el dominio o registrar la marca, y cambiar el nombre en los correos de Supabase.

---

## ADR-013 · Saldo insuficiente: avisar, ofrecer otra cuenta y pedir confirmación (nov. 2026)

**Contexto.** Un gasto que superaba el saldo de su cuenta se guardaba y la cuenta quedaba en negativo sin avisar. Existía un aviso, pero estaba en el grupo de cuentas del formulario clásico y se perdió al pasar al asistente por pasos y al modo Automático.

**Decisión.** Un solo aviso (`#sshort`) bajo el monto, visible en todos los modos, con el saldo, lo que falta y otras cuentas a las que sí les alcanza (un toque para cambiar). Por defecto no se impide: el botón pasa a «Guardar igual», porque los saldos los lleva la persona y pueden estar desactualizados. Quien prefiere cero negativos lo activa en Ajustes (`cfg.bloquearNeg`) y el guardado se bloquea. Un atajo de un toque no se guarda sin avisar.

**Alternativas consideradas.** Bloquear siempre (frustra a quien no ha actualizado sus saldos); una ventana de confirmación aparte (un paso más sin aportar información que el aviso en línea no dé).

**Consecuencias.** Cubre gastos, pagos de tarjeta, depósitos y movimientos de ahorro; no cubre la edición en línea de montos ni «Cargar recurrentes» (pendiente).

**Ampliación (17 nov. 2026):** si la cuenta tiene saldo parcial, el aviso ofrece dividir el pago: dos filas normales (lo que alcanza + el resto en otra cuenta). Se descartó un campo «pago dividido» en los datos por no tocar la estructura.

## ADR-014 · Tres grupos de categorías: Necesidades, Deseos y Ahorro e inversión (nov. 2026)

**Decisión:** la persona clasifica sus categorías de gasto en uno de tres grupos (Ajustes → Categorías de gastos) y el mes muestra «¿Dónde gastas más?»: el total y el porcentaje por grupo, y dentro de cada uno sus categorías de mayor a menor. La regla 50/30/20 usa la misma clasificación.

**Cómo:** `cfg.catGrupo` = {nombre en minúscula: need|want|ai|-} (`saneCfg` descarta lo inválido). Sin clasificar, el gasto sigue su sección (fijos → necesidades, cotidianos → deseos) y los nombres «Necesidad…»/«Deseo…» de siempre: así los números de quien no clasifica no cambian. El grupo «Ahorro e inversión» recibe automáticamente lo ahorrado e invertido del mes y también los gastos de categorías que la persona ponga ahí. Sin campos nuevos en los movimientos ni en Supabase (la clasificación va en la configuración, que ya se sincroniza).

**Descartado:** clasificar cada movimiento por separado (más trabajo para la persona) y pre-clasificar categorías por nombre (cambiaría números sin avisar).

**Corrección (17 nov. 2026):** la clasificación no debía quedarse solo en Ajustes: se pregunta al registrar el gasto, como los demás pasos (grupo → categoría dentro del grupo). Elegir una categoría sin clasificar la deja en ese grupo. Ajustes sigue sirviendo para revisar o mover categorías.

## ADR-015 · Automático entiende palabras, «ayer» y varios gastos (nov. 2026)

**Decisión:** la frase del modo Automático acepta números en palabras, «lucas/soles», «dos mil», dólares y euros, «ayer/anteayer» y varios gastos separados por coma, «+» o «y». Con varios, la tarjeta de confirmación los lista con su total y avisa si una cuenta no alcanza para todos; un solo Deshacer los revierte.

**Detalle que importa:** en Perú «luca» es un sol ("diez lucas" = S/ 10), no mil como en Argentina o Chile. Se confirmó con fuentes (SpanishDict, Enigma Perú). Por eso «lucas» se ignora como multiplicador.

**Límites a propósito:** varios gastos solo si todos son fijos/cotidianos (un ingreso o un ahorro en la misma frase no se mezcla); si no hay un separador claro entre dos montos, se toma solo el primero, como antes; no se pregunta grupo ni categoría en Automático.

## ADR-016 · Dictado por voz con el reconocimiento del navegador (nov. 2026)

**Decisión:** botón de micrófono en el registro Automático usando la Web Speech API del navegador. No se pasa el audio por servidores propios ni de terceros contratados por nosotros: lo procesa el servicio de voz del navegador (en Chrome lo envía a Google; en Safari lo maneja Apple). MiS²oles solo recibe el texto.

**Por qué:** cero costo y cero infraestructura (coherente con la beta sin gastar), y el texto dictado pasa por el mismo analizador que el escrito (números en palabras, «lucas», «ayer», varios gastos).

**Privacidad:** aviso la primera vez, el micrófono solo se activa al tocar, la frase se revisa antes de guardar, y la política (ES y EN) lo declara con una fila nueva en la tabla de encargados. Fecha de la política: 17 nov. 2026.

**Límites:** Firefox no la trae (el botón se oculta); depende de internet en Chrome; la precisión la decide el servicio del navegador. Se descartó Whisper/otro servicio propio por costo y por tener que alojar audio.

## ADR-017 · Pestañas en la pantalla del mes en celular (nov. 2026)

**Problema:** en el celular, el mes era una sola columna de ~7,500 px (unas 9 pantallas) con todas las tarjetas al mismo nivel; el panel de cuentas y el presupuesto empujaban lo demás fuera de la vista y los atajos «Ir a…» solo saltaban por la página.

**Decisión:** seis pestañas (Resumen, Movimientos, Tarjetas, Ahorro, Análisis, Todo), con el hero compacto fuera de Resumen. Se eligió esto antes que acordeones (la gente tendría que abrir cada tarjeta) y antes que partir en pantallas distintas (cambiaría las rutas por hash y las pruebas).

**Cuidados:** es presentación pura (mismos datos y mismas tarjetas, ocultas con CSS), «Todo» conserva la vista anterior para quien la prefiera, escritorio no cambia, y la barra es navegación con `aria-current`, botones de 44 px y desplazamiento horizontal.

## ADR-018 · Landing con bento, pantalla partida, masonry, entrada a pantalla completa y columnas editoriales (nov. 2026)

**Pedido del dueño:** llevar estos cinco patrones de layout a la landing y a la app.

**Reparto en la landing:** entrada a pantalla completa (lo más característico: papel cuadriculado y la boleta), bento para las funciones (eran cuatro filas largas de teléfono + texto, la mitad de la página), pantalla partida donde hay dos mitades que se responden (calculadora → boleta; invitación → formulario), columnas editoriales asimétricas donde hay texto que debe respirar (datos, precios, preguntas) y masonry solo para la galería de capturas.

**Por qué no masonry en la app:** el orden de lectura de columnas CSS salta y rompe el arrastre y el cambio de tamaño de «Personalizar»; en la app se prefiere bento (cuadrícula de 12 con celdas de tamaño variable y `grid-auto-flow:dense`), que conserva ambos.

**Cuidados:** esquinas de 3 px y sombras duras (como Cuadre) en vez de tarjetas redondas iguales; nada de una sola palabra resaltada en el titular; sin etiquetas en mayúsculas encima de cada sección; la numeración solo en los tutoriales (que sí son una secuencia). La página mide ~8,900 px en escritorio y ~12,000 en celular (antes ~8,800 y ~12,400).

**Fase 2 (18 nov. 2026):** el acceso pasa a pantalla partida en escritorio y el Resumen a bento con la cuadrícula de 12 columnas que ya tiene «Personalizar» (anchos 7/5, 8/4, 4/4/4, 7/5), sin masonry y sin tocar el modelo de datos. Quedan para después el hero del mes a pantalla completa y el bento del mes.

**Fase 3 (18 nov. 2026):** la pantalla del mes en escritorio recibe el encabezado a pantalla completa (papel cuadriculado oscuro de borde a borde, el saldo disponible en tamaño editorial) y su bento sobre la misma cuadrícula de 12 columnas. Con eso los cinco patrones están en la landing y en la app (el masonry solo en la galería de la landing, por lo explicado arriba).

**Fase 4 (18 nov. 2026):** Ajustes pasa de una tarjeta de ~2,600 px a tarjetas por tema en bento (con título propio y sin tocar el sistema de «Personalizar»), y el alta inicial usa el mismo panel partido que el acceso, con el recorrido de pasos a la vista. Se descartó reutilizar `.bcard` en Ajustes porque comparte el grupo de diseño `resumen` con el Resumen y mezclaría el orden que la persona guardó.
