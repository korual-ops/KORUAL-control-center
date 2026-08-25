const KORUAL_ENDPOINT_PROPERTY = 'KORUAL_ENDPOINT';
const KORUAL_SECRET_PROPERTY = 'KORUAL_SECRET';

function syncKorualSignal() {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = properties.getProperty(KORUAL_ENDPOINT_PROPERTY);
  const secret = properties.getProperty(KORUAL_SECRET_PROPERTY);

  if (!endpoint) {
    throw new Error('Missing KORUAL_ENDPOINT script property.');
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const payload = {
    source: 'google-apps-script',
    event: 'scheduled-sync',
    spreadsheetId: spreadsheet ? spreadsheet.getId() : null,
    generatedAt: new Date().toISOString()
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      'x-korual-secret': secret || ''
    },
    muteHttpExceptions: true
  });

  return {
    status: response.getResponseCode(),
    body: response.getContentText()
  };
}

function doPost(event) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, received: Boolean(event && event.postData) }))
    .setMimeType(ContentService.MimeType.JSON);
}
