-- Permisos mínimos (defensa en profundidad). APLICADO el 18 nov. 2026 (migración `permisos_minimos`), con aprobación del dueño.
-- Verificado: insert anónimo en eventos = 201; leer eventos, estado o lista_espera como anónimo = 401.
--
-- Por qué: Supabase da por defecto a los roles anon y authenticated TODOS los permisos de tabla (incluidos TRUNCATE,
-- TRIGGER y REFERENCES). RLS ya bloquea lo que importa y la API no expone TRUNCATE, así que hoy no hay hueco; esto solo
-- lo cierra por si algún día se descuida una política.
--
-- Qué usa la app de verdad (revisado en index.html e inicio/index.html):
--   estado            → authenticated: select, insert, update, delete (hay política own_delete)
--   estado_historial  → authenticated: select, insert, update (no hay política de delete; la poda de 30 días la hace el
--                       trigger snap_estado, que es SECURITY DEFINER y no depende de estos permisos)
--   eventos           → solo insert (fetch con Prefer: return=minimal); eventos_freno es SECURITY DEFINER
--   lista_espera      → solo insert anónimo (Prefer: return=minimal); lista_espera_freno es SECURITY DEFINER
-- Los roles de administración (los correos de la lista se leen desde el Table Editor) no se tocan.

begin;

-- estado
revoke all on public.estado from anon, authenticated;
grant select, insert, update, delete on public.estado to authenticated;

-- estado_historial
revoke all on public.estado_historial from anon, authenticated;
grant select, insert, update on public.estado_historial to authenticated;

-- eventos: cualquiera puede escribir, nadie puede leer ni cambiar desde la API
revoke all on public.eventos from anon, authenticated;
grant insert on public.eventos to anon, authenticated;

-- lista_espera: solo se apunta quien no tiene cuenta
revoke all on public.lista_espera from anon, authenticated;
grant insert on public.lista_espera to anon;

commit;

-- Comprobación (debe mostrar exactamente lo de arriba):
-- select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type)
--   from information_schema.role_table_grants
--  where table_schema='public' and grantee in ('anon','authenticated')
--  group by 1,2 order by 1,2;

-- Para deshacer (vuelve a los permisos por defecto de Supabase):
-- grant all on public.estado, public.estado_historial, public.eventos, public.lista_espera to anon, authenticated;
