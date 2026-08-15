const KORUAL = (() => {
  const properties = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: properties.getProperty('KORUAL_SPREADSHEET_ID'),
    secret: properties.getProperty('KORUAL_GAS_SECRET'),
  };
})();

function json_(data, status) {
  return ContentService.createTextOutput(JSON.stringify({ status: status || 200, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function book_() {
  if (!KORUAL.spreadsheetId) throw new Error('spreadsheet_not_configured');
  return SpreadsheetApp.openById(KORUAL.spreadsheetId);
}

function doGet() {
  return json_({ ok: true, service: 'KORUAL Automation API', timestamp: new Date().toISOString() });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!KORUAL.secret || body.secret !== KORUAL.secret) return json_({ ok: false, error: 'unauthorized' }, 401);
    const actions = {
      ping: () => ({ ok: true, message: 'KORUAL API online' }),
      summary: summary_, syncProducts: () => syncSheet_('Products'), syncOrders: () => syncSheet_('Orders'),
      syncShipping: shipping_, dailyReport: dailyReport_, listRecords: () => listRecords_(body.payload),
      createRecord: () => createRecord_(body.payload), updateRecord: () => updateRecord_(body.payload),
      deleteRecord: () => deleteRecord_(body.payload),
    };
    if (!actions[body.action]) return json_({ ok: false, error: 'unsupported_action' }, 400);
    return json_(actions[body.action]());
  } catch (error) { return json_({ ok: false, error: String(error.message || error) }, 500); }
}

function summary_() {
  const count = name => { const sheet = book_().getSheetByName(name); return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0; };
  return { ok: true, products: count('Products'), orders: count('Orders'), suppliers: count('Suppliers'), checkedAt: new Date().toISOString() };
}

function syncSheet_(name) { return { ok: true, action: 'sync' + name, rows: summary_()[name.toLowerCase()] || 0, checkedAt: new Date().toISOString() }; }
function shipping_() { return { ok: true, action: 'syncShipping', checkedAt: new Date().toISOString() }; }
function dailyReport_() { return { ...summary_(), action: 'dailyReport' }; }
