/**
 * Plantilla Personal de Finanzas — servidor Apps Script
 * Sirve la página (index.html) y lee/escribe tu propia Google Sheet.
 * No depende de Claude ni de ningún servidor externo.
 *
 * Pestañas que usa en tu hoja: "Registro" (un movimiento por fila) y "Config".
 * Se crean solas si no existen.
 */
var HEAD = ['año','mes','mes_nombre','apartado','concepto','monto','categoría',
            'fecha','a','b','d','s','p','fuente','tarjeta'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Plantilla Personal de Finanzas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function apiGet() {
  var reg = sheet_('Registro'), conf = sheet_('Config');
  var rv = reg.getDataRange().getValues();
  var regRows = rv.length > 1 ? rv.slice(1) : [];
  var cv = conf.getDataRange().getValues();
  var toStr = function (r) { return r.map(function (c) { return c === '' ? '' : String(c); }); };
  return { reg: regRows.map(toStr), conf: cv.map(toStr) };
}

function apiStamp() {
  var v = sheet_('Config').getRange('B3').getValue();
  return v ? String(v) : '';
}

function apiSave(p) {
  var reg = sheet_('Registro'), conf = sheet_('Config');
  var rows = (p && p.reg) || [], confRows = (p && p.conf) || [];
  reg.clearContents();
  var out = [HEAD].concat(rows.map(function (r) {
    var a = r.slice();
    while (a.length < 15) a.push('');
    return a.slice(0, 15).map(function (c) {
      return (typeof c === 'string' && c.charAt(0) === "'") ? c.substring(1) : c;
    });
  }));
  var rng = reg.getRange(1, 1, out.length, 15);
  rng.setNumberFormat('@');   // todo como texto: evita que "=..." o "1-nov" se interpreten
  rng.setValues(out);
  conf.clearContents();
  if (confRows.length) {
    conf.getRange(1, 1, confRows.length, 2)
        .setValues(confRows.map(function (r) { return [r[0], r[1]]; }));
  }
  return true;
}
