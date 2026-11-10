-- Políticas de `estado` más rápidas y más estrictas.
-- 1) `(select auth.uid())` se evalúa una sola vez por consulta; con `auth.uid()` suelto Postgres lo
--    recalculaba en cada fila (aviso `auth_rls_initplan` del linter de Supabase).
-- 2) Se aplican solo al rol `authenticated`: quien no ha iniciado sesión (anon) ya no pasa ni por la política.
-- No cambia el resultado para ningún usuario con sesión: cada quien sigue viendo solo su fila.
-- `estado_historial` ya estaba así; esto deja las dos tablas iguales.

begin;

drop policy if exists own_select on public.estado;
drop policy if exists own_insert on public.estado;
drop policy if exists own_update on public.estado;
drop policy if exists own_delete on public.estado;

create policy own_select on public.estado for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.estado for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.estado for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.estado for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
