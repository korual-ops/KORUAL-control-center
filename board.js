// board.js
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (s) => document.querySelector(s);

  async function apiGet(target, params = {}) {
    const url = new URL(API_BASE, location.origin);
    url.searchParams.set("target", target);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.message || "API GET failed");
    return data;
  }

  async function apiPost(payload) {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret: API_SECRET }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.message || "API POST failed");
    return data;
  }

  function pickStatusKey(row) {
    const candidates = ["상태", "status", "STATUS"];
    for (const k of candidates) if (Object.prototype.hasOwnProperty.call(row, k)) return k;
    return null;
  }

  function normalizeStatus(v) {
    const s = String(v ?? "").trim();
    return s ? s : "BACKLOG";
  }

  function defaultColumns() {
    return [
      { key: "BACKLOG", title: "Backlog" },
      { key: "준비중", title: "준비중" },
      { key: "배송중", title: "배송중" },
      { key: "완료", title: "완료" },
      { key: "취소", title: "취소" },
    ];
  }

  function escapeHtml(s) {
    return window.KORUAL_MODAL?.escapeHtml
      ? window.KORUAL_MODAL.escapeHtml(s)
      : String(s ?? "");
  }

  function renderBoard({ sheetKey, rows, columns }) {
    const root = $("#boardRoot");
    if (!root) return;

    const colMap = new Map();
    columns.forEach((c) => colMap.set(c.key, []));
    colMap.set("__OTHER__", []);

    rows.forEach((r) => {
      const statusKey = pickStatusKey(r);
      const status = normalizeStatus(statusKey ? r[statusKey] : "");
      if (colMap.has(status)) colMap.get(status).push(r);
      else colMap.get("__OTHER__").push(r);
    });

    const colHtml = columns
      .map((c) => {
        const items = (colMap.get(c.key) || []).map((r) => cardHtml(sheetKey, r)).join("");
        return columnHtml(c.key, c.title, items);
      })
      .join("");

    const other = (colMap.get("__OTHER__") || []);
    const otherHtml = other.length
      ? columnHtml("__OTHER__", "Other", other.map((r) => cardHtml(sheetKey, r)).join(""))
      : "";

    root.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] uppercase tracking-[0.3em] text-slate-500">KORUAL BOARD</div>
          <h2 class="text-sm font-semibold text-slate-100 mt-1">Orders Kanban</h2>
        </div>
        <button id="btnBoardRefresh" class="px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-200 hover:border-sky-400">Refresh</button>
      </div>

      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        ${colHtml}
        ${otherHtml}
      </div>

      <p id="boardMsg" class="mt-3 text-xs text-rose-300 min-h-[1rem]"></p>
    `;

    $("#btnBoardRefresh")?.addEventListener("click", () => window.KORUAL_BOARD?.reload?.());

    wireDnD(sheetKey);
    wireCardActions(sheetKey, rows);
  }

  function columnHtml(statusKey, title, itemsHtml) {
    return `
      <div class="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3 min-h-[260px]">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold text-slate-200">${escapeHtml(title)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(statusKey)}</div>
        </div>

        <div class="mt-3 space-y-2 korualDropZone" data-status="${escapeHtml(statusKey)}">
          ${itemsHtml || `<div class="text-[11px] text-slate-600 py-4">No items</div>`}
        </div>
      </div>
    `;
  }

  function cardHtml(sheetKey, r) {
    const rowIndex = Number(r._row || 0);
    const orderNo = r["주문번호"] || r["ORDER_NO"] || r["order_no"] || "";
    const name = r["상품명"] || r["ITEM_NAME"] || r["item_name"] || "";
    const amount = r["금액"] || r["amount"] || r["AMOUNT"] || r["주문금액"] || r["ORDER_AMOUNT"] || "";

    return `
      <div
        class="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 cursor-grab active:cursor-grabbing korualCard"
        draggable="true"
        data-sheet="${escapeHtml(sheetKey)}"
        data-row="${escapeHtml(rowIndex)}"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[11px] text-slate-400 truncate">#${escapeHtml(orderNo)} · row ${escapeHtml(rowIndex)}</div>
            <div class="text-xs text-slate-100 truncate">${escapeHtml(name)}</div>
          </div>
          <button class="korualCardEdit text-[11px] text-sky-300 underline decoration-dotted" type="button">Edit</button>
        </div>
        <div class="mt-1 text-[11px] text-slate-400">Amount: ${escapeHtml(amount)}</div>
      </div>
    `;
  }

  function setMsg(text) {
    const el = $("#boardMsg");
    if (el) el.textContent = text || "";
  }

  function wireCardActions(sheetKey, rows) {
    document.querySelectorAll(".korualCardEdit").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const card = e.target.closest(".korualCard");
        const rowIndex = Number(card?.getAttribute("data-row") || 0);
        const rowObj = rows.find((x) => Number(x._row) === rowIndex) || {};

        window.KORUAL_MODAL?.open({
          title: `${sheetKey} · row ${rowIndex}`,
          sub: "Board edit",
          sheetKey,
          rowIndex,
          rowObject: rowObj,
          onSave: async ({ sheetKey, rowIndex, rowObject }) => {
            await apiPost({ target: "updateRow", key: sheetKey, row: rowIndex, rowObject });
            await window.KORUAL_BOARD.reload();
          },
          onDelete: async ({ sheetKey, rowIndex }) => {
            await apiPost({ target: "deleteRow", key: sheetKey, row: rowIndex });
            await window.KORUAL_BOARD.reload();
          },
        });
      });
    });
  }

  function wireDnD(sheetKey) {
    let dragging = null;

    document.querySelectorAll(".korualCard").forEach((card) => {
      card.addEventListener("dragstart", () => {
        dragging = card;
        card.classList.add("opacity-80");
      });
      card.addEventListener("dragend", () => {
        dragging = null;
        card.classList.remove("opacity-80");
      });
    });

    document.querySelectorAll(".korualDropZone").forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("outline", "outline-1", "outline-sky-400/60");
      });

      zone.addEventListener("dragleave", () => {
        zone.classList.remove("outline", "outline-1", "outline-sky-400/60");
      });

      zone.addEventListener("drop", async (e) => {
        e.preventDefault();
        zone.classList.remove("outline", "outline-1", "outline-sky-400/60");

        if (!dragging) return;

        const rowIndex = Number(dragging.getAttribute("data-row") || 0);
        const newStatus = zone.getAttribute("data-status") || "BACKLOG";
        if (!rowIndex) return;

        try {
          setMsg("");

          // 현재 rows는 reload에서 다시 가져오므로, 여기서는 "status" 컬럼명 후보들에 모두 써보는 방식으로 처리
          // 실제로는 sheet 헤더에 존재하는 키만 업데이트되므로 안전
          const rowObject = { "상태": newStatus, "status": newStatus, "STATUS": newStatus };

          await apiPost({ target: "updateRow", key: sheetKey, row: rowIndex, rowObject });
          await window.KORUAL_BOARD.reload();
        } catch (err) {
          console.error(err);
          setMsg(err?.message || "상태 업데이트 실패");
        }
      });
    });
  }

  async function loadOrdersForBoard() {
    // page/size를 넉넉히: 보드에서는 한 번에 많이 보는 편이 낫다
    const data = await apiGet("orders", { page: 1, size: 300, q: "" });
    return (data.data && data.data.rows) ? data.data.rows : [];
  }

  async function reload() {
    try {
      setMsg("");
      const rows = await loadOrdersForBoard();
      const cols = defaultColumns();

      renderBoard({ sheetKey: "ORDERS", rows, columns: cols });
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "보드 로딩 실패");
    }
  }

  window.KORUAL_BOARD = { reload };
})();
