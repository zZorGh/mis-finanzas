-- Tablas mínimas para restaurar en un proyecto nuevo o en el simulacro (sin llaves a auth, a propósito).
-- En el proyecto real las tablas ya existen: ver supabase/historial.sql y el resto de supabase/.
create table if not exists public.estado(
  user_id uuid primary key,
  registro jsonb not null default '[]'::jsonb,
  config jsonb not null default '[]'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  stamp text,
  updated_at timestamptz not null default now()
);
create table if not exists public.estado_historial(
  id bigint generated always as identity primary key,
  user_id uuid not null,
  dia date not null,
  tipo text not null default 'diaria',
  registro jsonb not null default '[]'::jsonb,
  config jsonb not null default '[]'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  filas integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id,dia,tipo)
);
