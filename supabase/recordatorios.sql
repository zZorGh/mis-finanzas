-- Recordatorios por notificación push . Aplicado el 21 nov. 2026 (migración recordatorios).
-- Solo se guarda la dirección push del dispositivo, la frecuencia y la hora. La notificación viaja sin contenido:
-- el texto lo pone el propio dispositivo, así que el servicio push no ve montos ni datos de la persona.
-- Orden: 1) este SQL, 2) desplegar la función recordatorios (sin verificar JWT), 3) publicar la app.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.recordatorios (
  endpoint text primary key
    check (length(endpoint) <= 1024 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)/'),
  user_id uuid not null references auth.users (id) on delete cascade,
  frecuencia text not null default 'diario' check (frecuencia in ('diario', 'semanal')),
  hora smallint not null default 20 check (hora between 6 and 22),
  dia smallint not null default 0 check (dia between 0 and 6),
  ultimo_envio date,
  creado timestamptz not null default now()
);
create index if not exists recordatorios_user_idx on public.recordatorios (user_id);
create index if not exists recordatorios_hora_idx on public.recordatorios (hora);

alter table public.recordatorios enable row level security;
revoke all on public.recordatorios from public, anon, authenticated;
grant select on public.recordatorios to authenticated;

create policy recordatorios_propios on public.recordatorios
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy mfa_requerido on public.recordatorios
  as restrictive for all to authenticated
  using ((select private.mfa_ok())) with check ((select private.mfa_ok()));

-- Un dispositivo pertenece a la última cuenta que lo activó. Máximo 5 dispositivos por persona.
create or replace function public.recordatorio_guardar(p_endpoint text, p_frecuencia text, p_hora int, p_dia int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare u uuid := auth.uid();
begin
  if u is null or not private.mfa_ok() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.recordatorios (endpoint, user_id, frecuencia, hora, dia)
  values (p_endpoint, u, p_frecuencia, p_hora, p_dia)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, frecuencia = excluded.frecuencia, hora = excluded.hora, dia = excluded.dia;
  delete from public.recordatorios
  where user_id = u and endpoint in (
    select r.endpoint from public.recordatorios r where r.user_id = u order by r.creado desc offset 5
  );
end;
$$;

create or replace function public.recordatorio_quitar(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.recordatorios where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;
revoke all on function public.recordatorio_guardar(text, text, int, int) from public, anon;
revoke all on function public.recordatorio_quitar(text) from public, anon;
grant execute on function public.recordatorio_guardar(text, text, int, int) to authenticated;
grant execute on function public.recordatorio_quitar(text) to authenticated;

-- Toma los que tocan a esta hora de Lima y los marca, para no enviar dos veces.
-- El diario no se envía si la persona ya usó la app hoy.
create or replace function private.recordatorios_tomar()
returns table (endpoint text)
language sql
security definer
set search_path = ''
as $$
  with t as (select (now() at time zone 'America/Lima') as ts),
  c as (
    select r.endpoint
    from public.recordatorios r
    cross join t
    left join public.estado e on e.user_id = r.user_id
    where r.hora = extract(hour from t.ts)::int
      and (r.ultimo_envio is null or r.ultimo_envio < t.ts::date)
      and (
        (r.frecuencia = 'diario' and (e.updated_at is null or (e.updated_at at time zone 'America/Lima')::date < t.ts::date))
        or (r.frecuencia = 'semanal' and r.dia = extract(dow from t.ts)::int)
      )
    limit 1000
    for update of r skip locked
  )
  update public.recordatorios r
  set ultimo_envio = (select t.ts::date from t)
  from c
  where r.endpoint = c.endpoint
  returning r.endpoint;
$$;
revoke all on function private.recordatorios_tomar() from public, anon, authenticated;

-- Clave interna entre la tarea programada y la función. Se genera aquí y nunca se muestra.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'recordatorios_cron')
where not exists (select 1 from vault.secrets where name = 'recordatorios_cron');

select cron.schedule(
  'recordatorios-cada-hora',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lmjhlghwthydpeismulb.supabase.co/functions/v1/recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'recordatorios_cron')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
