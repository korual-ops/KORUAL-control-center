// board.js
// KORUAL CONTROL CENTER – Board / Table Utilities

(function () {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);

  /* ===========================
     STATUS BADGE
  =========================== */
  function renderStatusBadge(status) {
    const s = String(status || "").toLowerCase();

    let cls = "bg-slate-700 text-slate-200";
    if (s.includes("완료") || s.includes("complete")) cls = "bg-emerald-600 text-white";
    else if (s.includes("준비") || s.includes("pending")) cls = "bg-amber-500 text-black";
    else if (s.includes("취소") || s.includes("cancel")) cls = "bg-rose-600 text-white";

    return `<span class="px-2 py-0.5 rounded-full text-xs ${cls}">${status}</span>`;
  }

  /* ===========================
     CURRENCY
  =========================== */
  function currency(v) {
    if (v == null || isNaN(v)) return "-";
    return Number(v).toLocaleString("ko-KR") + "원";
  }

  /* ===========================
     GENERIC TABLE RENDER
  =========================== */
  function renderTable(tbody, rows, columns, options = {}) {
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!rows || !rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length}"
              class="text-center py-6 text-slate-500">
            데이터가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-800 hover:bg-slate-900/60";

      columns.forEach(col => {
        const td = document.createElement("td");
        td.className = "px-2 py-1.5";

        let val = row[col.key];

        if (col.format === "currency") val = currency(val);
        if (col.format === "status") {
          td.innerHTML = renderStatusBadge(val);
        } else {
          td.textContent = val ?? "";
        }

        if (col.align === "right") td.classList.add("text-right");
        tr.appendChild(td);
      });

      if (options.manage) {
        const td = document.createElement("td");
        td.className = "px-2 py-1.5 text-center";

        const edit = document.createElement("button");
        edit.textContent = "수정";
        edit.className = "text-xs px-2 py-1 rounded bg-slate-700 mr-1";
        edit.onclick = () => {
          window.KORUAL_MODAL?.openEdit({
            entity: options.entity,
            sheet: options.sheet,
            rowIndex: row._row || idx + 2,
            data: row,
          });
        };

        const del = document.createElement("button");
        del.textContent = "삭제";
        del.className = "text-xs px-2 py-1 rounded bg-rose-600";
        del.onclick = () => {
          window.KORUAL_MODAL?.openDelete({
            entity: options.entity,
            sheet: options.sheet,
            rowIndex: row._row || idx + 2,
            title: row[options.titleKey || columns[0].key],
          });
        };

        td.append(edit, del);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
  }

  // 공개 API
  window.KORUAL_BOARD = {
    renderTable,
    currency,
    renderStatusBadge,
  };
})();
