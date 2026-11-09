-- Lista de espera de la landing (/inicio/). Cualquiera puede apuntarse (insert anónimo); nadie puede leerla con la clave pública.
-- Los correos se leen solo desde el panel de Supabase (Table Editor) o con una clave de servicio.
create table if not exists public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(nombre) >= 1 and length(nombre) <= 80),
  correo text not null unique check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(correo) <= 254),
  hoy text check (hoy is null or length(hoy) <= 60),
  creado timestamptz not null default now()
);
alter table public.lista_espera enable row level security;
create policy "cualquiera puede apuntarse" on public.lista_espera for insert to anon with check (true);
