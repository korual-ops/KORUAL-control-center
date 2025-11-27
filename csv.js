/****************************************
 * KORUAL CONTROL CENTER – csv.js v1.0
 * - 현재 테이블 CSV 내보내기
 * - CSV 업로드 → bulkReplace 로 시트 통째로 교체
 *
 * 필요 전역:
 *  - window.currentKey          (지금 보고 있는 ROUTES.key)
 *  - window.currentHeaders      (헤더 배열)
 *  - window.currentTableRows    (원본 rows 배열)  ← 한 줄만 table.js 에서 세팅해주면 됨
 *  - apiPost(payload)           (app.js)
 *  - API_SECRET                 (app.js)
 *  - loadSectionInternal(key, params) (app.js)
 ****************************************/

(function () {
  /** CSV 값 이스케이프 */
  function toCSVValue(v) {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /** 간단 CSV 파서 (헤더 1줄 + 데이터 여러 줄) → { headers, rows } */
  function parseCSV(text) {
    // 윈도우 개행 정리
    const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const lines = rawLines.filter(line => line.trim() !== "");
    if (!lines.length) return { headers: [], rows: [] };

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (!cols.length) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] !== undefined ? cols[idx] : "";
      });
      rows.push(obj);
    }

    return { headers, rows };
  }

  /** CSV 한 줄 파싱 (쉼표+따옴표 처리) → 배열 */
  function parseCSVLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          const next = line[i + 1];
          if (next === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
    }
    result.push(cur);
    return result;
  }

  /** 현재 테이블 → CSV 다운로드 */
  async function exportCurrentTableToCSV() {
    const headers = (window.currentHeaders || []).slice();
    const rows = window.currentTableRows || [];

    if (!headers.length || !rows.length) {
      alert("내보낼 테이블 데이터가 없습니다.");
      return;
    }

    const lines = [];
    lines.push(headers.map(toCSVValue).join(","));

    rows.forEach(r => {
      const rowArr = headers.map(h => {
        const v = r[h];
        // Date는 yyyy-MM-dd로
        if (v instanceof Date) {
          const y = v.getFullYear();
          const m = String(v.getMonth() + 1).padStart(2, "0");
          const d = String(v.getDate()).padStart(2, "0");
          return toCSVValue(`${y}-${m}-${d}`);
        }
        return toCSVValue(v);
      });
      lines.push(rowArr.join(","));
    });

    const csvText = lines.join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });

    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;

    const key = window.currentKey || "korual";
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    a.download = `${key}_export_${stamp}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** CSV 업로드 → bulkReplace */
  async function importCSVForCurrentTable() {
    const key = window.currentKey;
    if (!key) {
      alert("현재 테이블의 key 정보를 찾을 수 없습니다.");
      return;
    }

    let input = document.getElementById("csv-file-input");
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = "csv-file-input";
      input.accept = ".csv,text/csv";
      input.style.display = "none";
      document.body.appendChild(input);
    }

    input.value = "";

    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const ok = confirm(
        "선택한 CSV 내용으로 현재 시트를 통째로 덮어쓰시겠습니까?\n(기존 데이터는 삭제됩니다)"
      );
      if (!ok) return;

      try {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (!parsed.headers.length) {
          alert("CSV에 헤더가 없습니다.");
          return;
        }

        const payload = {
          target: "bulkReplace",
          secret: API_SECRET,
          key,
          headers: parsed.headers,
          rows: parsed.rows,
        };

        const res = await apiPost(payload);
        if (!res.ok) {
          throw new Error(res.error || "CSV 업로드 실패");
        }

        alert("CSV 업로드 및 시트 덮어쓰기 완료!");
        if (typeof loadSectionInternal === "function") {
          await loadSectionInternal(key, window.currentParams || {});
        }
      } catch (err) {
        console.error(err);
        alert("오류 발생: " + err.message);
      }
    };

    input.click();
  }

  // 전역 함수 export
  window.exportCurrentTableToCSV = exportCurrentTableToCSV;
  window.importCSVForCurrentTable = importCSVForCurrentTable;
})();
