# Sistema de diseño: Mis finanzas (MASTER)

Fuente: UI/UX Pro Max v2.15 (`search.py --design-system`), con la selección revisada a mano
porque el resultado automático inicial no encajaba (patrón de landing, tipografía manuscrita).

## Contexto
- **Para quién:** profesional joven en Lima, finanzas personales en soles (S/).
- **Problema:** ver cada mes con los mismos apartados de su hoja, registrar movimientos en segundos y entender si va dentro de su presupuesto.
- **Tecnología:** HTML + CSS + JS simple, Chart.js 4.4.1, datos en Google Sheets (pendiente), publicado como una sola página.

## Diales
| Dial | Valor | Qué significa aquí |
|------|-------|--------------------|
| variance | 3 | Layout ordenado en cuadrícula de 12 columnas; sin asimetrías decorativas |
| motion | 4 | Transiciones de 160 ms; sin rebotes en datos; respeta `prefers-reduced-motion` |
| density | 6 | Tablas editables compactas; tarjetas con 16-18 px de relleno |

## Estilo
Minimalismo / Swiss: limpio, funcional, alto contraste, cuadrícula, sans-serif.

## Tipografía ("Financial Trust")
- Títulos y texto: **IBM Plex Sans** 400/500/600/700
- Cifras y etiquetas de datos: **IBM Plex Mono** 400/500 (`tabular-nums`)
- Escala: H1 36 px · H2 15 px · cuerpo 14 px · etiqueta 11-12 px en mayúsculas con 0.06em

## Color (rol "Personal Finance Tracker")
| Token | Claro | Oscuro |
|-------|-------|--------|
| --bg | #EDF1F5 | #0F172A |
| --surface (tarjeta) | #FBFCFD | #192134 |
| --surface-2 | #F1F5F9 | #222C42 |
| --ink | #0F172A | #F8FAFC |
| --muted | #475569 | #94A3B8 |
| --line | #D9E1EA | rgba(255,255,255,.10) |
| --accent | #047857 | #34D399 |
| --on-accent | #FFFFFF | #052E22 |
| --bad | #B91C1C | #FCA5A5 |

Semántica de datos (misma en gráficos, indicadores y barras):
ingreso/fijos `--c-ing` azul · gasto/hormiga `--c-gas` naranja · ahorro `--c-aho` verde · inversión `--c-inv` violeta · restante `--c-res` gris.
Cabecera (hero): degradado `--hero-a` → `--hero-b` (#0F172A → #065F46), texto #F8FAFC.
Secciones de la hoja: `--h-ing, --h-pre, --h-fij, --h-hor, --h-bbva, --h-bcp, --h-oh, --h-aho, --h-inv, --h-eur, --h-liq`.

## Escalas
- Espaciado: 4 · 8 · 12 · 16 · 24
- Radios: 8 (controles) · 12 (indicadores) · 16 (tarjetas)
- Elevación: `--sh-1` reposo · `--sh-2` hover · `--sh-3` hoja y botón +
- Movimiento: `--dur` 160 ms · `--ease` cubic-bezier(.2,.7,.2,1)

## Componentes
- **Tarjeta** (`.card.bcard`): cabecera con icono de color de la sección, cuerpo, total fijo abajo. Se mueve, redimensiona, oculta o elimina en modo Personalizar.
- **Hero**: mes, "Te queda este mes", barra de proporciones y panel de Liquidez.
- **Indicador** (`.kpi`): etiqueta en mayúsculas mono, cifra mono, franja de color a la izquierda.
- **Chip** (`.cp`): selección única en el formulario de registro, alto 40 px.
- **Hoja de registro** (`.sheet`): monto grande, tipo, concepto con sugerencias, categoría, fecha.
- **Aviso** (`.toast`) con "Deshacer".

## Reglas
- Todo color sale de un token; ninguno solo en un tema.
- Texto pequeño con contraste mínimo 4.5:1; foco visible en todo control.
- Objetivos táctiles de 32 px o más; el botón + de 60 px.
- Sin emojis como iconos; sin rebotes (`back.out`) en tablas ni cifras.
- Una pantalla nueva hereda este archivo; si existe `pages/<pantalla>.md`, sus reglas lo sustituyen.

## Lista de verificación antes de entregar
- [ ] 375, 768, 1024 y 1440 px sin scroll horizontal
- [ ] Claro y oscuro con el mismo contraste
- [ ] `prefers-reduced-motion` respetado
- [ ] Teclado: Tab, Enter y Escape en hoja de registro y panel ⚙
