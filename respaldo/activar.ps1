# Activa el respaldo externo. Lo corres TÚ, una sola vez. Claude no ve ninguna clave.
# Antes: aplicar supabase/respaldo.sql y definir la clave del usuario «respaldo» en el SQL Editor de Supabase.
# Qué hace: crea tu par de llaves (la privada queda en la carpeta que elijas, fuera del repo), crea el repo privado,
# sube el certificado público y los scripts, y te pide la conexión (se escribe oculta y va directo a GitHub como secreto).
param([string]$CarpetaClave = "$HOME\Documents\clave-respaldo-misoles", [string]$Repo = 'mis-finanzas-respaldos')
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$usuario = (gh api user --jq .login).Trim()
New-Item -ItemType Directory -Force $CarpetaClave | Out-Null
$pem = Join-Path $CarpetaClave 'clave-privada.pem'; $cert = Join-Path $CarpetaClave 'certificado.pem'
if (Test-Path $pem) { throw "Ya existe $pem. No la sobrescribo: si quieres otra, usa otra carpeta." }
openssl req -x509 -newkey rsa:4096 -nodes -days 3650 -subj '/CN=respaldo-misoles' -keyout $pem -out $cert 2>$null
$tmp = Join-Path ([IO.Path]::GetTempPath()) "respaldo-$(Get-Random)"; New-Item -ItemType Directory $tmp | Out-Null
New-Item -ItemType Directory "$tmp\respaldo", "$tmp\.github\workflows" | Out-Null
Copy-Item "$aqui\exportar.sh", "$aqui\restaurar.sh", "$aqui\esquema.sql", "$aqui\LEEME.md" "$tmp\respaldo"
Copy-Item "$aqui\respaldo.yml" "$tmp\.github\workflows\respaldo.yml"; Copy-Item $cert "$tmp\certificado.pem"
Set-Location $tmp; git init -q -b main; git add -A; git commit -q -m 'Respaldo externo de MiS2oles'
gh repo create "$usuario/$Repo" --private --source . --push
Write-Host "`nPega la conexión del usuario «respaldo» (Supabase > Connect > Session pooler, con su clave). No se verá al escribirla:"
gh secret set SUPABASE_DB_URL --repo "$usuario/$Repo"
gh workflow run respaldo.yml --repo "$usuario/$Repo"
Write-Host "`nListo. GUARDA YA la clave privada en tu gestor de contraseñas y en otra copia (USB): $pem"
Write-Host "Sin ella los respaldos no se pueden abrir. Revisa la primera corrida en https://github.com/$usuario/$Repo/actions"
