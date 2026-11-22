-- Anti-abuso. Aplicado el 21 nov. 2026 con la aprobación del dueño (migración anti_abuso).
-- Cierra lo que mostró la simulación de ataque:
--   1. Métricas: rotando el id de dispositivo se podían insertar 5,000 filas por hora, sin límite total ni limpieza.
--   2. Lista de espera: un correo repetido devolvía un error distinto, y así se podía averiguar quién está apuntado.

create or replace function public.eventos_freno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.creado := now();
  if (select count(*) from public.eventos where sid = new.sid and creado > now() - interval '1 minute') >= 120 then
    raise exception 'Demasiados eventos seguidos.' using errcode = '54000';
  end if;
  if (select count(*) from public.eventos where creado > now() - interval '1 hour') >= 600 then
    raise exception 'Límite de eventos alcanzado, intenta más tarde.' using errcode = '54000';
  end if;
  -- Limpieza sin tareas programadas: de vez en cuando borra lo que tiene más de 90 días.
  if random() < 0.01 then
    delete from public.eventos where creado < now() - interval '90 days';
  end if;
  if (select count(*) from public.eventos) >= 100000 then
    raise exception 'Límite de eventos alcanzado.' using errcode = '54000';
  end if;
  return new;
end
$$;

create or replace function public.lista_espera_freno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.correo := lower(trim(new.correo));
  new.nombre := trim(new.nombre);
  new.creado := now();
  new.aprobado := false;
  -- Correo ya apuntado: responde igual que uno nuevo y no guarda nada.
  if exists (select 1 from public.lista_espera where correo = new.correo) then
    return null;
  end if;
  if (select count(*) from public.lista_espera where creado > now() - interval '10 minutes') >= 20 then
    raise exception 'Demasiadas inscripciones seguidas, intenta en unos minutos.' using errcode = '54000';
  end if;
  if (select count(*) from public.lista_espera) >= 2000 then
    raise exception 'La lista de espera está llena.' using errcode = '54000';
  end if;
  return new;
end
$$;
