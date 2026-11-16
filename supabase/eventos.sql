-- Métricas de uso anónimas y errores de la app (PROPUESTA: no aplicada todavía; requiere aprobación del dueño).
--
-- Qué guarda: un id aleatorio del dispositivo (sid), el nombre del evento, un dato corto (modo, paso, tipo de movimiento)
-- y la versión de la app. Qué NO guarda, nunca: montos, conceptos, nombres de cuentas, correos ni el id del usuario.
-- Quién escribe: la app, con la clave pública (insert anónimo, como la lista de espera). Quién lee: solo tú, desde el
-- panel de Supabase (SQL Editor / Table Editor); con la clave pública nadie puede leer esta tabla.
-- Cada persona puede apagarlo en Ajustes (cuadra-stats). Retención sugerida: 90 días (ver el final).

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  sid text not null check (length(sid) between 8 and 40),
  ev text not null check (ev in ('dia_activo','reg_abrir','reg_modo','reg_paso','reg_guardar','reg_abandono','atajo','auto_fallback','error')),
  dato text check (dato is null or length(dato) <= 160),
  ver text check (ver is null or length(ver) <= 20)
);

alter table public.eventos enable row level security;
-- solo insertar; sin política de lectura, actualización ni borrado
create policy "la app puede registrar eventos" on public.eventos for insert to anon, authenticated with check (true);

-- Freno al spam: máximo 120 eventos por minuto por dispositivo y 5000 por hora entre todos.
create or replace function public.eventos_freno()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  new.creado := now();
  if (select count(*) from public.eventos where sid = new.sid and creado > now() - interval '1 minute') >= 120 then
    raise exception 'Demasiados eventos seguidos.' using errcode = '54000';
  end if;
  if (select count(*) from public.eventos where creado > now() - interval '1 hour') >= 5000 then
    raise exception 'Límite de eventos alcanzado, intenta más tarde.' using errcode = '54000';
  end if;
  return new;
end $$;

revoke execute on function public.eventos_freno() from public, anon, authenticated;

drop trigger if exists eventos_freno on public.eventos;
create trigger eventos_freno
  before insert on public.eventos
  for each row execute function public.eventos_freno();

create index if not exists eventos_creado on public.eventos (creado desc);
create index if not exists eventos_sid_creado on public.eventos (sid, creado desc);

-- ─── Consultas útiles (las corres tú en el SQL Editor) ───
-- Días activos por dispositivo en las últimas 2 semanas:
--   select sid, count(distinct creado::date) as dias from public.eventos
--   where ev = 'dia_activo' and creado > now() - interval '14 days' group by sid order by dias desc;
-- Qué modo usan para registrar:
--   select dato, count(*) from public.eventos where ev = 'reg_modo' group by dato order by 2 desc;
-- Dónde abandonan (qué paso era el último):
--   select dato, count(*) from public.eventos where ev = 'reg_abandono' group by dato order by 2 desc;
-- Cómo guardan (modo:tipo):
--   select dato, count(*) from public.eventos where ev = 'reg_guardar' group by dato order by 2 desc;
-- Errores más frecuentes:
--   select dato, count(*) from public.eventos where ev = 'error' group by dato order by 2 desc limit 20;

-- Retención: borrar lo de más de 90 días (córrelo de vez en cuando, o prográmalo con pg_cron):
--   delete from public.eventos where creado < now() - interval '90 days';
