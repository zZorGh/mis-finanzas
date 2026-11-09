-- Beta por invitación: solo pueden crear cuenta los correos de la lista de espera
-- que el dueño marcó como «aprobado» en el Table Editor de Supabase.
-- Reemplaza el bloqueo total anterior (block_new_signups / no_new_signups).

-- 1. Casilla «aprobado» en la lista de espera (por defecto, no)
alter table public.lista_espera add column if not exists aprobado boolean not null default false;

-- 2. Nadie se puede auto-aprobar al anotarse desde la landing
create or replace function public.lista_espera_freno()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  new.correo := lower(trim(new.correo));
  new.nombre := trim(new.nombre);
  new.creado := now();
  new.aprobado := false;
  if (select count(*) from public.lista_espera where creado > now() - interval '10 minutes') >= 20 then
    raise exception 'Demasiadas inscripciones seguidas, intenta en unos minutos.' using errcode = '54000';
  end if;
  if (select count(*) from public.lista_espera) >= 2000 then
    raise exception 'La lista de espera está llena.' using errcode = '54000';
  end if;
  return new;
end $$;

-- 3. Registro nuevo: solo si el correo está aprobado
create or replace function public.solo_invitados()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not exists (
    select 1 from public.lista_espera
    where correo = lower(trim(new.email)) and aprobado
  ) then
    raise exception 'Cuadra está en beta cerrada: este correo no tiene invitación.';
  end if;
  return new;
end $$;

revoke execute on function public.solo_invitados() from public, anon, authenticated;

drop trigger if exists no_new_signups on auth.users;
drop trigger if exists solo_invitados on auth.users;
create trigger solo_invitados
  before insert on auth.users
  for each row execute function public.solo_invitados();

drop function if exists public.block_new_signups();
