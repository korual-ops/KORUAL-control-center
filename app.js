// doPost 안에서 target 분기 중에 아래 추가

if (target === "addRow") {
  var key = body.key;
  var values = body.values || {};

  var rt = findRoute(key);
  if (!rt) return json({ ok: false, error: "ROUTES에 해당 key 없음: " + key });

  var ss = (rt.spreadsheetId === "SELF")
    ? SpreadsheetApp.getActive()
    : SpreadsheetApp.openById(rt.spreadsheetId);
  var sh = ss.getSheetByName(rt.sheetName);
  if (!sh) return json({ ok: false, error: "시트를 찾을 수 없음" });

  var headerRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var newRow = headerRow.map(function(h) {
    return values.hasOwnProperty(h) ? values[h] : "";
  });

  sh.appendRow(newRow);
  return json({ ok: true, message: "행 추가 완료" });
}

if (target === "deleteRow") {
  var key = body.key;
  var rowIndex = Number(body.rowIndex); // 0부터

  var rt = findRoute(key);
  if (!rt) return json({ ok: false, error: "ROUTES에 해당 key 없음: " + key });

  var ss = (rt.spreadsheetId === "SELF")
    ? SpreadsheetApp.getActive()
    : SpreadsheetApp.openById(rt.spreadsheetId);
  var sh = ss.getSheetByName(rt.sheetName);
  if (!sh) return json({ ok: false, error: "시트를 찾을 수 없음" });

  var rowNumber = 2 + rowIndex; // 1행 헤더
  if (rowNumber > sh.getLastRow()) {
    return json({ ok: false, error: "rowIndex 범위 초과" });
  }

  sh.deleteRow(rowNumber);
  return json({ ok: true, message: "행 삭제 완료" });
}

if (target === "bulkReplace") {
  var key = body.key;
  var headers = body.headers || [];
  var rows = body.rows || [];

  var rt = findRoute(key);
  if (!rt) return json({ ok: false, error: "ROUTES에 해당 key 없음: " + key });

  var ss = (rt.spreadsheetId === "SELF")
    ? SpreadsheetApp.getActive()
    : SpreadsheetApp.openById(rt.spreadsheetId);
  var sh = ss.getSheetByName(rt.sheetName);
  if (!sh) return json({ ok: false, error: "시트를 찾을 수 없음" });

  if (!headers.length) return json({ ok: false, error: "헤더 없음" });

  // 시트 전체 초기화 후 새 데이터로 채우기
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    var values = rows.map(function(r) {
      return headers.map(function(h) {
        return r[h] || "";
      });
    });
    sh.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  return json({ ok: true, message: "CSV 업로드/덮어쓰기 완료" });
}
