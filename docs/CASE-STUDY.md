# Case study — Plantilla Personal de Finanzas

> Una herramienta de finanzas personales construida sobre una Google Sheet, que
> funciona en el navegador y en el celular, con control 50/30/20, liquidez y
> tarjetas de crédito modeladas como crédito real.
>
> **Rol:** producto + diseño + desarrollo (proyecto individual). · **Stack:** HTML/CSS/JS
> sin framework, Chart.js, Google Sheets como base de datos, Google Apps Script.

---

## 1. El problema

Llevaba mis finanzas en una plantilla de Google Sheets: completa, pero incómoda.
Para registrar un gasto tenía que abrir la hoja, buscar el mes, encontrar la fila
y escribir. En el celular era aún peor. Resultado: **los gastos pequeños —los que
más se escapan— no se registraban**, y sin datos completos ninguna gráfica ni meta
sirve.

El objetivo no era "una app bonita", sino **bajar la fricción de registrar hasta
que anotar un gasto sea cuestión de segundos**, porque la métrica que de verdad
importa es la adherencia, no las funciones.

## 2. Usuario y contexto

Un solo usuario (yo), profesional joven en Lima, que opera en soles pero también
maneja euros y dólares. Usa Yape, Plin, efectivo y tres tarjetas de crédito.
Quiere entender su patrón de gasto y construir un fondo de emergencia, sin pagar
una app ni ceder el control de sus datos.

## 3. Decisiones de producto (y sus trade-offs)

**La hoja de cálculo *es* la base de datos.**
En vez de montar un backend nuevo, los datos viven en la misma Google Sheet del
usuario (pestañas `Registro` y `Config`). *Por qué:* cero costo, el usuario es
dueño de sus datos y puede abrirlos sin la app. *Trade-off:* no es multiusuario y
tiene techo de escala; para finanzas personales, irrelevante.

**Las tarjetas de crédito se modelan como crédito, no como gasto.**
La decisión de producto más importante. Una compra con tarjeta **no es un gasto
del mes**: sube la deuda y baja el crédito disponible. El gasto ocurre **cuando se
paga la tarjeta**. *Por qué:* así es como la gente realmente piensa su dinero;
contar la compra como gasto distorsiona el mes. *Trade-off:* se pierde la categoría
de cada compra individual, a cambio de que los números del mes sean fieles.

**Cada gasto sabe de dónde salió, y corregir devuelve el saldo.**
Al registrar un gasto se elige la cuenta de origen (Yape, efectivo, etc.) y se
descuenta de ahí. Borrar o editar un movimiento **devuelve el monto exacto** a esa
cuenta, incluso días después. *Por qué:* la confianza en una herramienta de dinero
se gana con integridad de datos; un saldo que no cuadra la vuelve inútil.

**Un solo código, dos formas de abrirlo.**
La misma página corre como artifact (para iterar rápido con IA) y como app web de
Google vía Apps Script (para usarla a diario sin depender de nadie). *Por qué:*
velocidad de iteración sin sacrificar independencia del producto final. *Trade-off:*
una capa de abstracción extra en la sincronización.

**Registro ultrarrápido.**
Botón flotante, pantalla de captura pensada para el pulgar y entrada en lenguaje
natural ("almuerzo 25 yape"). *Por qué:* cada segundo y cada toque de más es un
gasto que no se registra.

## 4. Cómo mediría el éxito

- **Adherencia:** movimientos registrados por semana (la métrica norte).
- **Cobertura:** % de meses con datos completos.
- **Exactitud:** qué tan seguido el saldo de la app cuadra con el saldo real al
  usar "Cuadrar cuentas".
- **Progreso:** avance del fondo de emergencia hacia la meta con fecha.

## 5. Qué aprendí

- El modelo de datos es la decisión de producto, no un detalle técnico: definir
  qué cuenta como gasto cambió toda la experiencia.
- Es más valioso reducir un paso del registro que agregar una función nueva.
- Entregar algo que viva sin la herramienta con la que se construyó (sin login,
  en la cuenta del propio usuario) es parte del producto, no un extra.

## 6. Próximos pasos

- Registro por WhatsApp (requiere un servicio que reciba los mensajes).
- Importar movimientos desde el banco.
- Arrastre de la deuda de tarjetas de un mes al siguiente.

---

*Proyecto personal, independiente. No contiene datos financieros reales: la versión
publicada abre vacía y los datos viven en la hoja de Google del usuario.*
