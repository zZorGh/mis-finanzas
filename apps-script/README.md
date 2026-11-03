# App web con tu Google (Apps Script)

Esta carpeta te permite abrir la plantilla desde cualquier navegador, **sin iniciar
sesión en Claude**. La página la sirve tu propia cuenta de Google y guarda los datos
en tu Google Sheet (pestañas `Registro` y `Config`).

## Qué necesitas
- Tu Google Sheet (la "Plantilla Financiera").
- 10 minutos, una sola vez.

## Pasos

1. Abre tu Google Sheet → menú **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega el contenido de **`Code.gs`** de esta carpeta.
3. Arriba, junto a "Archivos", toca **+ → HTML**. Nómbralo exactamente **`index`**
   (queda como `index.html`). Borra lo que trae y pega el contenido de
   **`apps-script/index.html`** de esta carpeta.
4. Guarda (icono de disquete).
5. Arriba a la derecha: **Implementar → Nueva implementación**.
   - Tipo (engranaje): **Aplicación web**.
   - "Ejecutar como": **Yo**.
   - "Quién tiene acceso": **Solo yo**.
   - **Implementar**. Autoriza los permisos cuando te los pida (es tu propia cuenta).
6. Copia la **URL de la aplicación web** (termina en `/exec`). Ábrela en tu navegador.
7. En el celular, abre esa URL en Chrome → menú ⋮ → **Agregar a pantalla de inicio**.

Listo. Ese ícono abre la plantilla directo, con tu cuenta de Google, sin Claude.

## Notas
- La primera vez te pedirá permiso para que el script use tu hoja. Es normal: es tu
  cuenta actuando sobre tu propia hoja.
- La misma hoja la pueden usar las dos versiones (esta y la de Claude). Si editas en
  dos lados a la vez, la app avisa de "conflicto" antes de sobrescribir.
- Cuando haya mejoras, solo vuelves a pegar el `index.html` actualizado y vuelves a
  **Implementar → Gestionar implementaciones → Editar → Nueva versión**.
