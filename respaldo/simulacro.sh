#!/usr/bin/env bash
# Simulacro de restauración con datos INVENTADOS: crea una base de origen, la respalda y la cifra, la abre con la clave privada,
# la restaura en otra base y comprueba que cada fila quedó idéntica. Lo corre GitHub en cada subida; así sabemos que el camino
# completo funciona antes de necesitarlo.   PGBASE=postgresql://usuario:clave@host:puerto bash simulacro.sh
set -euo pipefail
: "${PGBASE:?Falta PGBASE (servidor Postgres de pruebas, sin base)}"
aqui=$(cd "$(dirname "$0")" && pwd); tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
psql "$PGBASE/postgres" -qAt -c "drop database if exists sim_origen" -c "drop database if exists sim_destino" -c "create database sim_origen" -c "create database sim_destino"
for b in sim_origen sim_destino; do psql "$PGBASE/$b" -v ON_ERROR_STOP=1 -q -f "$aqui/esquema.sql"; done
psql "$PGBASE/sim_origen" -v ON_ERROR_STOP=1 -q <<'SQL'
insert into public.estado(user_id,registro,config,layout,stamp) values
 ('11111111-1111-1111-1111-111111111111','{"v":1,"nota":"comilla \" y barra \\ y ñ y tilde á y salto \n fin","n":[1,2.5,{"x":null}]}','{"cfg":"ok"}','{"w":4}','a1'),
 ('22222222-2222-2222-2222-222222222222','[]','[]','{}',null);
insert into public.estado_historial(user_id,dia,tipo,registro,config,layout,filas)
 select '11111111-1111-1111-1111-111111111111', date '2026-11-01'+g, 'diaria', jsonb_build_object('d',g,'t','texto \ con barra "y comillas"'), '[]','{}', g from generate_series(0,29) g;
SQL
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=simulacro" -keyout "$tmp/k.pem" -out "$tmp/c.pem" 2>/dev/null
DB_URL="$PGBASE/sim_origen" CERT="$tmp/c.pem" bash "$aqui/exportar.sh" "$tmp/r.cms" >/dev/null
! grep -aq "11111111-1111" "$tmp/r.cms" || { echo "FALLA: el respaldo cifrado deja ver datos"; exit 1; }
DB_URL="$PGBASE/sim_destino" KEY="$tmp/k.pem" bash "$aqui/restaurar.sh" "$tmp/r.cms" >/dev/null
huella(){ psql "$1" -qAt -c "select count(*)||' '||coalesce(md5(string_agg(row_to_json(t)::text,'|' order by $3)),'') from $2 t"; }
fallo=0
for par in "estado|user_id" "estado_historial|id"; do
  t=${par%%|*}; o=${par##*|}
  a=$(huella "$PGBASE/sim_origen" "public.$t" "$o"); b=$(huella "$PGBASE/sim_destino" "restaurado.$t" "$o")
  if [ "$a" = "$b" ]; then echo "OK   $t: $a"; else echo "FALLA $t: origen=$a restaurado=$b"; fallo=1; fi
done
# Con otra clave no se puede abrir
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=otra" -keyout "$tmp/otra.pem" -out "$tmp/otrac.pem" 2>/dev/null
if DB_URL="$PGBASE/sim_destino" KEY="$tmp/otra.pem" bash "$aqui/restaurar.sh" "$tmp/r.cms" >/dev/null 2>&1; then echo "FALLA: abrió el respaldo con otra clave"; fallo=1; else echo "OK   con otra clave no abre"; fi
psql "$PGBASE/postgres" -qAt -c "drop database sim_origen" -c "drop database sim_destino" >/dev/null
exit $fallo
