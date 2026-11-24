# Respaldo externo de MiS²oles

Copia diaria y cifrada de `estado` y `estado_historial` (lo que las personas guardan), fuera de Supabase. El plan Free no trae copias descargables.

- **Qué respalda:** las dos tablas, una fila JSON por línea. No respalda `auth` (correos y claves): si se perdiera el proyecto entero, las personas tendrían que volver a crear su cuenta y habría que reasignar sus filas.
- **Dónde:** archivos adjuntos de un repositorio **privado** de GitHub (`mis-finanzas-respaldos`), 30 días, uno por día. Cada uno va cifrado con un certificado público; **solo la clave privada los abre**, y esa la tiene el dueño (gestor de contraseñas + una copia aparte). Si falla un día, GitHub avisa por correo.
- **Cómo lee Supabase:** con el usuario `respaldo`, que solo puede leer esas dos tablas (`supabase/respaldo.sql`).
- **Activarlo (una vez):** aplicar `supabase/respaldo.sql`, definir la clave de `respaldo` en el SQL Editor y correr `respaldo/activar.ps1`.

## Restaurar
1. Bajar el respaldo: `gh run download --repo <usuario>/mis-finanzas-respaldos -n respaldo` (elige la corrida del día que quieras con `gh run list`).
2. `DB_URL=<conexión de la base> KEY=clave-privada.pem bash respaldo/restaurar.sh respaldo-AAAA-MM-DD.cms`
3. Queda en el esquema `restaurado` (no toca lo público). Revísalo y copia lo que falte, por ejemplo una persona:
   `insert into public.estado select * from restaurado.estado where user_id='…' on conflict (user_id) do update set registro=excluded.registro, config=excluded.config, layout=excluded.layout, stamp=excluded.stamp, updated_at=excluded.updated_at;`
4. Proyecto nuevo: antes crea las tablas con `respaldo/esquema.sql` (y las políticas de `supabase/`).

## Simulacro
`respaldo/simulacro.sh` lo corre GitHub en cada subida, con datos inventados: respalda, cifra, abre, restaura y compara fila por fila. También comprueba que con otra clave no se abre. Si el simulacro falla, el respaldo real tampoco serviría.

## Si cambia lo que se guarda
Un cambio de tablas, de retención o de destino exige actualizar antes la política de privacidad (`legal.html`).
