# src/: las piezas de la app

`index.html` (raíz) es lo que publica GitHub Pages, pero **se genera** a partir de estas piezas. Edita aquí y arma:

    node dev/armar.js

- Las piezas se unen por orden de nombre, sin transformar nada (el resultado es byte por byte el de siempre).
- Los cortes siguen las secciones del archivo; las piezas de JavaScript comparten una misma función envolvente, así que no son válidas por separado.
- Nueva pieza: `NNN-nombre.js|css|html` (el número fija el orden).
- Si alguien edita `index.html` a mano, el gancho de commit y GitHub lo rechazan. Para traer ese cambio, pásalo a la pieza correspondiente y vuelve a armar.
