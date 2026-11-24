#!/usr/bin/env bash
# Respaldo externo de MiS²oles: exporta las tablas con los datos de las personas (una fila JSON por línea) y las cifra
# con un certificado público. Solo quien tiene la clave privada puede abrir el respaldo; aquí nunca está.
#   DB_URL=postgresql://... CERT=certificado.pem bash exportar.sh salida.cms
set -euo pipefail
: "${DB_URL:?Falta DB_URL (conexión del usuario de solo lectura)}"
: "${CERT:?Falta CERT (certificado público)}"
out="${1:?Falta el nombre del archivo de salida}"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
for t in estado estado_historial; do
  psql "$DB_URL" -v ON_ERROR_STOP=1 -qAt -c "\copy (select row_to_json(t) from public.$t t) to stdout" > "$tmp/$t.jsonl"
done
n=$(wc -l < "$tmp/estado.jsonl")
[ "$n" -ge 1 ] || { echo "El respaldo salió vacío: no lo guardo." >&2; exit 1; }
echo "estado: $n filas · estado_historial: $(wc -l < "$tmp/estado_historial.jsonl") filas"
tar -C "$tmp" -cf "$tmp/r.tar" estado.jsonl estado_historial.jsonl
openssl cms -encrypt -binary -aes-256-cbc -in "$tmp/r.tar" -out "$out" -outform DER -recip "$CERT"
echo "Respaldo cifrado: $out ($(wc -c < "$out") bytes)"
