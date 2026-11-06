-- Historial diario automático (30 días) para «Mis finanzas»
create table if not exists public.estado_historial(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  tipo text not null default 'diaria' check (tipo in ('diaria','antes_de_restaurar')),
  registro jsonb not null default '[]'::jsonb,
  config jsonb not null default '[]'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  filas integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id,dia,tipo)
);
create index if not exists estado_historial_user_dia on public.estado_historial(user_id,dia desc);
alter table public.estado_historial enable row level security;
create policy hist_select on public.estado_historial for select to authenticated using ((select auth.uid())=user_id);
create policy hist_insert on public.estado_historial for insert to authenticated with check ((select auth.uid())=user_id);
create policy hist_update on public.estado_historial for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.snap_estado() returns trigger
language plpgsql security definer set search_path='' as $$
declare d date := (now() at time zone 'America/Lima')::date;
begin
  insert into public.estado_historial(user_id,dia,tipo,registro,config,layout,filas,created_at)
  values (new.user_id,d,'diaria',coalesce(new.registro,'[]'::jsonb),coalesce(new.config,'[]'::jsonb),coalesce(new.layout,'{}'::jsonb),jsonb_array_length(coalesce(new.registro,'[]'::jsonb)),now())
  on conflict (user_id,dia,tipo) do update set registro=excluded.registro,config=excluded.config,layout=excluded.layout,filas=excluded.filas,created_at=now();
  delete from public.estado_historial where user_id=new.user_id and dia < d - 30;
  return new;
end $$;
revoke all on function public.snap_estado() from public, anon, authenticated;
drop trigger if exists estado_snap on public.estado;
create trigger estado_snap after insert or update on public.estado for each row execute function public.snap_estado();
insert into public.estado_historial(user_id,dia,tipo,registro,config,layout,filas)
select user_id,(now() at time zone 'America/Lima')::date,'diaria',coalesce(registro,'[]'::jsonb),coalesce(config,'[]'::jsonb),coalesce(layout,'{}'::jsonb),jsonb_array_length(coalesce(registro,'[]'::jsonb)) from public.estado
on conflict (user_id,dia,tipo) do nothing;
