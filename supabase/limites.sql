-- Límites de seguridad para Cuadra (correr una vez en el SQL Editor de Supabase).
-- 1) estado / estado_historial: tamaño máximo y fechas válidas.
-- 2) lista_espera: freno al spam (ritmo y total) y correos normalizados.

-- ─── 1. Tamaño máximo de los datos de una cuenta (5 MB; hoy una cuenta usa ~10 KB) ───
alter table public.estado
  add constraint estado_tamano_max
  check (pg_column_size(registro) + pg_column_size(config) + pg_column_size(layout) <= 5242880);

alter table public.estado_historial
  add constraint historial_tamano_max
  check (pg_column_size(registro) + pg_column_size(config) + pg_column_size(layout) <= 5242880);

-- ─── 1b. El historial solo acepta el día de hoy (hora de Lima, ±1 día de margen) ───
-- Antes se podía guardar una versión con fecha futura, que nunca se borraba.
-- También fija la hora de creación y el n.º de filas en el servidor (no los decide el navegador).
create or replace function public.historial_validar()
returns trigger
language plpgsql
set search_path to ''
as $$
declare hoy date := (now() at time zone 'America/Lima')::date;
begin
  if new.dia < hoy - 1 or new.dia > hoy + 1 then
    raise exception 'Fecha de historial no válida.' using errcode = '22008';
  end if;
  new.created_at := now();
  new.filas := case when jsonb_typeof(new.registro) = 'array' then jsonb_array_length(new.registro) else 0 end;
  return new;
end $$;

drop trigger if exists historial_validar on public.estado_historial;
create trigger historial_validar
  before insert or update on public.estado_historial
  for each row execute function public.historial_validar();

-- ─── 2. Lista de espera: freno al spam ───
-- Como nadie puede leer la tabla con la clave pública, la función corre como dueña
-- (security definer) solo para contar filas; no devuelve nada al visitante.
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
  -- máximo 20 inscripciones cada 10 minutos (entre todos) y 2000 en total
  if (select count(*) from public.lista_espera where creado > now() - interval '10 minutes') >= 20 then
    raise exception 'Demasiadas inscripciones seguidas, intenta en unos minutos.' using errcode = '54000';
  end if;
  if (select count(*) from public.lista_espera) >= 2000 then
    raise exception 'La lista de espera está llena.' using errcode = '54000';
  end if;
  return new;
end $$;

revoke execute on function public.lista_espera_freno() from public, anon, authenticated;

drop trigger if exists lista_espera_freno on public.lista_espera;
create trigger lista_espera_freno
  before insert on public.lista_espera
  for each row execute function public.lista_espera_freno();

-- índice para que el conteo de los últimos 10 minutos sea instantáneo
create index if not exists lista_espera_creado on public.lista_espera (creado desc);
