-- Verificación en dos pasos. Aplicado el 21 nov. 2026 (migración mfa_requerido).
-- Sin esto, la pantalla del código se podría saltar llamando directo a la API con solo la contraseña.
-- Quien no activó la verificación no nota ningún cambio.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- authenticated no puede leer auth.mfa_factors, por eso la consulta va en una función privada.
create or replace function private.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      );
$$;
revoke all on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

create policy mfa_requerido on public.estado
  as restrictive for all to authenticated
  using ((select private.mfa_ok())) with check ((select private.mfa_ok()));

create policy mfa_requerido on public.estado_historial
  as restrictive for all to authenticated
  using ((select private.mfa_ok())) with check ((select private.mfa_ok()));

-- Borrar la cuenta también exige el segundo paso.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not private.mfa_ok() then
    raise exception 'mfa required' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
