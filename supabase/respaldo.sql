-- Usuario de SOLO LECTURA para el respaldo externo (respaldo/). Solo puede leer estado y estado_historial.
-- No puede escribir, ni ver auth, ni las demás tablas. Se aplica una vez, con la aprobación del dueño.
-- La clave la define el dueño a mano en el SQL Editor (nunca va en el repo ni se le pasa a Claude):
--   alter role respaldo password '<una-clave-larga-y-aleatoria>';
do $$ begin
  if not exists (select 1 from pg_roles where rolname='respaldo') then
    create role respaldo login nobypassrls noinherit connection limit 2;
  end if;
end $$;
revoke all on schema public from respaldo;
grant usage on schema public to respaldo;
grant select on public.estado, public.estado_historial to respaldo;
-- Las tablas tienen RLS: sin estas políticas el usuario vería 0 filas.
drop policy if exists respaldo_select on public.estado;
create policy respaldo_select on public.estado for select to respaldo using (true);
drop policy if exists respaldo_select on public.estado_historial;
create policy respaldo_select on public.estado_historial for select to respaldo using (true);
-- Revisión (solo lectura): has_table_privilege('respaldo','public.estado','insert') debe dar false.
