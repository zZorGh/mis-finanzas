#!/usr/bin/env bash
# Abre un respaldo y lo carga en el esquema «restaurado» de la base indicada. NO toca las tablas públicas:
# primero se revisa lo restaurado y después se copia lo que haga falta (ver LEEME.md).
#   DB_URL=postgresql://... KEY=clave-privada.pem bash restaurar.sh respaldo.cms
# La base de destino debe tener public.estado y public.estado_historial (el proyecto de siempre, o uno nuevo con respaldo/esquema.sql).
set -euo pipefail
: "${DB_URL:?Falta DB_URL (la base donde restaurar)}"
: "${KEY:?Falta KEY (clave privada)}"
src="${1:?Falta el archivo de respaldo}"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
openssl cms -decrypt -binary -in "$src" -inform DER -inkey "$KEY" -out "$tmp/r.tar"
tar -C "$tmp" -xf "$tmp/r.tar"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
drop schema if exists restaurado cascade;
create schema restaurado;
create table restaurado.raw_estado(j jsonb);
create table restaurado.raw_historial(j jsonb);
\copy restaurado.raw_estado from '$tmp/estado.jsonl'
\copy restaurado.raw_historial from '$tmp/estado_historial.jsonl'
create table restaurado.estado as select (jsonb_populate_record(null::public.estado, j)).* from restaurado.raw_estado;
create table restaurado.estado_historial as select (jsonb_populate_record(null::public.estado_historial, j)).* from restaurado.raw_historial;
drop table restaurado.raw_estado, restaurado.raw_historial;
SQL
psql "$DB_URL" -qAt -c "select 'restaurado.estado: '||count(*)||' filas' from restaurado.estado union all select 'restaurado.estado_historial: '||count(*)||' filas' from restaurado.estado_historial"
