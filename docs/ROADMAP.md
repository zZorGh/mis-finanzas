# Análisis del proyecto y roadmap

Auditoría honesta de **Plantilla Personal de Finanzas**: qué está sólido, qué le
falta y qué mejoras implementar, ordenadas por fases (ahora / siguiente / futuro)
y por esfuerzo. Pensado como plan de producto.

---

## 1. Dónde estamos (lo que ya es sólido)

- **Producto:** registro rápido, control 50/30/20, liquidez, tarjetas de crédito
  (línea, deuda, disponible, pago, arrastre de saldo), corrección con devolución de
  saldos, recurrentes, cuadre de cuentas, respaldo/restauración, adherencia.
- **Arquitectura:** un solo archivo, misma base de código en tres entornos (Claude,
  app de Google, web con login) gracias a una capa de datos abstracta.
- **Infra:** web real hospedada (GitHub Pages) + base de datos con login y seguridad
  por usuario (Supabase + RLS). Actualizaciones automáticas al publicar.
- **Documentación:** case study (ES/EN), registro de decisiones (ADR). Buen material
  de portafolio.

**Veredicto:** base firme y poco frágil. Evolucionarla es de bajo riesgo.

---

## 2. Qué le falta / dónde puede crecer

Agrupado por dimensión, con esfuerzo aproximado (S = horas, M = días, L = proyecto).

### Producto y funcionalidad
- **Metas de ahorro múltiples y con nombre** (hoy solo el fondo de emergencia). Encaja
  con tu sistema real: fondo de emergencia, build de hardware, liquidez mensual. **(M)**
- **Presupuesto por categoría**, además del 50/30/20 global. **(M)**
- **Insights automáticos** ("gastaste 30% más en delivery que el mes pasado",
  "tu mejor mes de ahorro"). **(M)**
- **Patrimonio neto en el tiempo** (liquidez + ahorros + inversiones − deuda de
  tarjetas), con tendencia. **(M)**
- **Proyecciones** ("si sigues así, llegas a tu meta en X meses"). **(M)**
- **Reportes/exportar** el mes o el año a PDF. **(M)**
- **Búsqueda y filtro de movimientos** por concepto, categoría o rango de fechas. **(S)**

### Registro y datos de entrada
- **Registro por Telegram/WhatsApp** (tu idea original): ahora es factible con una
  función de Supabase + un bot. Telegram es más simple y gratis que WhatsApp. **(L)**
- **Importar movimientos del banco** desde CSV/Excel. **(M)**
- **Tipos de cambio automáticos** desde una API (hoy son manuales). **(S)**

### Experiencia de usuario
- **App instalable de verdad (PWA)**: ahora que es un dominio real, un manifest +
  service worker la harían instalable y usable sin conexión. Alto valor, hoy no lo
  tiene. **(S-M)**
- **Alertas proactivas** (gasto fijo por vencer, pasaste el límite hormiga) por
  correo o notificación. **(M)**
- **Onboarding guiado** la primera vez. **(S)**

### Técnico y escalabilidad
- **Tests en CI** (GitHub Actions corriendo las pruebas en cada push). **(S)**
- **Modelo relacional** en Supabase (tablas de movimientos en vez de un bloque JSON):
  habilita consultas, reportes ricos y mejor concurrencia. Es un cambio grande con
  migración cuidada. **(L)**
- **Modularizar el frontend** (o migrar a un framework) si el archivo crece mucho.
  Hoy no hace falta. **(L)**
- **Versionar migraciones de datos** a medida que cambie el modelo. **(S, continuo)**

### Seguridad
- **Cerrar registros** para que solo exista tu cuenta (tus datos ya están protegidos
  por RLS; esto evita cuentas ajenas). **(S)**
- **Verificación en dos pasos (2FA)** con Supabase. **(M)**

### Portafolio
- **Diagrama de arquitectura** (los tres entornos + Supabase). **(S)**
- **Video/GIF corto** registrando un gasto. **(S)**

---

## 3. Roadmap por fases

### Fase 1 — Ahora (rápido, alto valor)
1. Cerrar registros (seguridad). *(S)*
2. App instalable (PWA) + uso sin conexión. *(S-M)*
3. Metas de ahorro múltiples con tus nombres. *(M)*
4. Insights automáticos simples en el resumen. *(M)*
5. Diagrama de arquitectura + video, para el portafolio. *(S)*

### Fase 2 — Siguiente (mediano)
1. Registro por Telegram. *(L)*
2. Tipos de cambio automáticos. *(S)*
3. Importar CSV del banco. *(M)*
4. Alertas por correo. *(M)*
5. Reportes PDF. *(M)*
6. Tests en CI. *(S)*

### Fase 3 — A futuro (escalado)
1. Modelo relacional + reportes ricos. *(L)*
2. Patrimonio neto y proyecciones. *(M)*
3. 2FA. *(M)*
4. Compartir con otra persona (pareja/familia): RLS ya lo soporta parcialmente. *(M-L)*
5. Modularizar o migrar a framework si el proyecto crece. *(L)*

---

## 4. Recomendación

Si tuviera que elegir, empezaría la **Fase 1** por: **cerrar registros** (5 min),
**PWA** (se siente como app de verdad), **metas múltiples** (le da propósito al
ahorro) e **insights** (convierte datos en decisiones). Es el salto que más se nota
con menos esfuerzo. El **registro por Telegram** (Fase 2) es el que más te acerca a
la visión original y conecta con CoreFlow.

*Documento vivo. Las decisiones ya tomadas están en `docs/DECISIONS.md`.*
