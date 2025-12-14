// board.js — KORUAL Kanban (DnD)
// Requires: dashboard.html에 #kanbanRoot, #kanbanRefresh 버튼(선택), #kanbanSearch input(선택)
// Data source: apiGet("ORDERS") 또는 apiGet("orders") 형태를 자동 탐지
// Update: apiPost({target:"updateRow", key:"ORDERS", row, rowObject:{status:"..."}}) 방식

(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ----- 상태 정의 (필요 시 여기만 수정) -----
  const STATUS = [
    { key: "결제완료", label: "결제완료", hint: "입금/결제 확인" },
    { key: "출고대기", label: "출고대기", hint: "픽/패킹 대기" },
    { key: "출고완료", label: "출고완료", hint: "송장/출고 완료" },
    { key: "배송중", label: "배송중", hint: "운송 중" },
    { key: "완료", label: "완료", hint: "배송 완료" },
    { key: "취소/반품", label: "취소/반품", hint: "CS 처리" },
  ];

  // SLA: 결제완료/출고대기 상태가 24시간 넘으면 경고
  const SLA_HOURS = 24;

  const state = {
    orders: [],
    filtered: [],
    q: "",
    lastLoadedAt: null,
    loading: false,
    mapping: null, // 헤더 매핑
  };

  // ----- API 폴백 -----
  async function apiGetSmart(sheetOrTarget, params = {}) {
    // app.js에서 제공하면 그걸 사용
    if (window.KORUAL_API?.get) return window.KORUAL_API.get(sheetOrTarget, params);

    if (!API_BASE) throw new Error("API_BASE not set");
    const url = new URL(API_BASE);
    url.searchParams.set("target", sheetOrTarget);
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error("API JSON parse failed"); }
    if (!res.ok || json.ok === false) throw new Error(json.message || "API error");
    return json;
  }

  async function apiPostSmart(body) {
    if (window.KORUAL_API?.post) return window.KORUAL_API.post(body);

    if (!API_BASE) throw new Error("API_BASE not set");
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ secret: API_SECRET || undefined, ...body }),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error("API JSON parse failed"); }
    if (!res.ok || json.ok === false) throw new Error(json.message || "API error");
    return json;
  }

  function toast(msg, type = "info") {
    if (window.KORUAL_API?.showToast) return window.KORUAL_API.showToast(msg, type);
    console.log(`[${type}]`, msg);
  }
  function spinner(on) {
    if (on) window.KORUAL_API?.showSpinner?.();
    else window.KORUAL_API?.hideSpinner?.();
  }

  // ----- 유틸 -----
  function normStr(v) {
    return (v == null ? "" : String(v)).trim();
  }

  function toDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const s = String(v);
    // yyyy-mm-dd or yyyy-mm-dd hh:mm
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      const hh = Number(m[4] || 0), mm = Number(m[5] || 0);
      return new Date(y, mo, d, hh, mm, 0);
    }
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t) : null;
  }

  function hoursDiff(a, b) {
    return Math.abs((a.getTime() - b.getTime()) / 36e5);
  }

  function detectOrderMapping(row) {
    const keys = Object.keys(row || {});
    const pick = (cands) => cands.find((k) => keys.includes(k)) || null;

    return {
      rowIndexKey: pick(["_row", "rowIndex"]),
      orderNo: pick(["orderNo", "order_no", "ORDER_NO", "주문번호", "주문No"]),
      date: pick(["date", "orderDate", "order_date", "ORDER_DATE", "주문일자", "날짜"]),
      product: pick(["productName", "product_name", "item_name", "ITEM_NAME", "상품명"]),
      qty: pick(["qty", "QTY", "수량"]),
      amount: pick(["amount", "AMOUNT", "금액", "주문금액"]),
      channel: pick(["channel", "CHANNEL", "판매채널", "채널"]),
      status: pick(["status", "STATUS", "상태"]),
      customer: pick(["customerName", "customer_name", "구매자", "고객명"]),
      tracking: pick(["trackingNo", "tracking_no", "운송장", "송장번호"]),
    };
  }

  function getVal(row, key) {
    if (!row || !key) return "";
    return row[key];
  }

  function setVal(row, key, value) {
    if (!row || !key) return;
    row[key] = value;
  }

  // ----- DOM -----
  function ensureKanbanRoot() {
    const root = $("#kanbanRoot");
    if (root) return root;

    // 없으면 자동 생성(대시보드 어디든 넣을 수 있음)
    const host = document.body;
    const div = document.createElement("div");
    div.id = "kanbanRoot";
    div.className = "kanban-root";
    host.appendChild(div);
    return div;
  }

  function renderShell(root) {
    root.innerHTML = `
      <div class="w-full">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div class="flex items-center gap-2">
            <div class="text-sm font-semibold text-slate-100">Orders Kanban</div>
            <div class="text-[11px] text-slate-400" id="kanbanMeta"></div>
          </div>
          <div class="flex items-center gap-2">
            <input id="kanbanSearch" class="px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-950/70 text-slate-100 text-xs w-56"
                   placeholder="검색 (주문번호/상품명/고객/채널)" />
            <button id="kanbanRefresh" class="px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-slate-100 text-xs hover:bg-slate-900">
              새로고침
            </button>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" id="kanbanCols"></div>
      </div>
    `;
  }

  function renderColumns() {
    const cols = $("#kanbanCols");
    if (!cols) return;

    cols.innerHTML = STATUS.map((s) => `
      <section class="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden"
               data-status="${escapeHtml(s.key)}">
        <header class="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs font-semibold text-slate-100">${escapeHtml(s.label)}</div>
            <div class="text-[10px] text-slate-500 truncate">${escapeHtml(s.hint || "")}</div>
          </div>
          <div class="text-[10px] text-slate-400" data-count>0</div>
        </header>

        <div class="p-2 space-y-2 min-h-[140px]" data-dropzone></div>
      </section>
    `).join("");

    // dropzone 이벤트 바인딩
    $$(".kanban-root [data-dropzone]").forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("ring-1", "ring-sky-400/60");
      });
      zone.addEventListener("dragleave", () => {
        zone.classList.remove("ring-1", "ring-sky-400/60");
      });
      zone.addEventListener("drop", async (e) => {
        e.preventDefault();
        zone.classList.remove("ring-1", "ring-sky-400/60");
        const payload = safeJsonParse(e.dataTransfer.getData("application/json"));
        if (!payload?.id) return;

        const col = zone.closest("section[data-status]");
        const nextStatus = col?.dataset?.status;
        if (!nextStatus) return;

        await moveCard(payload.id, nextStatus);
      });
    });
  }

  function renderCards() {
    const map = groupByStatus(state.filtered, state.mapping);
    STATUS.forEach((s) => {
      const col = $(`.kanban-root section[data-status="${cssEscape(s.key)}"]`);
      if (!col) return;
      const zone = $(`[data-dropzone]`, col);
      const countEl = $(`[data-count]`, col);

      const rows = map[s.key] || [];
      if (countEl) countEl.textContent = String(rows.length);

      if (!zone) return;
      zone.innerHTML = rows.map((row) => cardHtml(row)).join("");

      // 카드 이벤트 (drag/click)
      $$(".kanban-card", zone).forEach((card) => {
        card.addEventListener("dragstart", (e) => {
          const id = card.dataset.id;
          e.dataTransfer.setData("application/json", JSON.stringify({ id }));
          e.dataTransfer.effectAllowed = "move";
          card.classList.add("opacity-70");
        });
        card.addEventListener("dragend", () => card.classList.remove("opacity-70"));

        card.addEventListener("click", () => {
          const id = card.dataset.id;
          const row = state.orders.find((r) => String(getVal(r, state.mapping.rowIndexKey)) === String(id))
                   || state.orders.find((r) => String(r._row) === String(id));
          if (!row) return;

          // 모달 편집 열기(있으면)
          if (window.KORUAL_MODAL?.openEdit) {
            window.KORUAL_MODAL.openEdit({
              entity: "orders",
              sheet: "ORDERS",
              rowIndex: Number(id),
              data: row,
            });
          } else {
            toast("modal.js를 먼저 로드하면 카드 클릭 시 편집 모달이 열립니다.", "info");
          }
        });
      });
    });

    const meta = $("#kanbanMeta");
    if (meta) {
      const t = state.lastLoadedAt ? formatTime(state.lastLoadedAt) : "-";
      meta.textContent = `Loaded ${t} · ${state.filtered.length} items`;
    }
  }

  function cardHtml(row) {
    const m = state.mapping;
    const rowIndex = getVal(row, m.rowIndexKey) || row._row || "";
    const orderNo = normStr(getVal(row, m.orderNo));
    const product = normStr(getVal(row, m.product));
    const customer = normStr(getVal(row, m.customer));
    const channel = normStr(getVal(row, m.channel));
    const status = normStr(getVal(row, m.status));
    const amount = normStr(getVal(row, m.amount));
    const qty = normStr(getVal(row, m.qty));
    const dateVal = getVal(row, m.date);
    const dt = toDate(dateVal);
    const now = new Date();

    const slaBad = (status === "결제완료" || status === "출고대기") && dt && hoursDiff(now, dt) >= SLA_HOURS;

    return `
      <article class="kanban-card cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 hover:bg-slate-900/70 transition"
               draggable="true"
               data-id="${escapeHtml(String(rowIndex))}">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[11px] text-slate-400 truncate">${escapeHtml(orderNo || "—")}</div>
            <div class="text-xs font-semibold text-slate-100 truncate">${escapeHtml(product || "—")}</div>
          </div>
          <div class="flex items-center gap-1">
            ${slaBad ? `<span class="text-[10px] px-2 py-0.5 rounded-full border border-rose-500/60 bg-rose-950/40 text-rose-200">SLA</span>` : ""}
            ${channel ? `<span class="text-[10px] px-2 py-0.5 rounded-full border border-slate-700/70 bg-slate-900/40 text-slate-200">${escapeHtml(channel)}</span>` : ""}
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <div class="truncate">${escapeHtml(customer || "")}</div>
          <div class="shrink-0">${escapeHtml(qty ? `x${qty}` : "")}</div>
        </div>

        <div class="mt-1 flex items-center justify-between text-[11px]">
          <div class="text-slate-500">${escapeHtml(dt ? formatYMD(dt) : normStr(dateVal))}</div>
          <div class="text-slate-200">${escapeHtml(amount ? formatCurrency(amount) : "")}</div>
        </div>
      </article>
    `;
  }

  function groupByStatus(rows, mapping) {
    const out = {};
    STATUS.forEach((s) => (out[s.key] = []));
    (rows || []).forEach((r) => {
      const st = normStr(getVal(r, mapping.status)) || "출고대기";
      if (!out[st]) out[st] = [];
      out[st].push(r);
    });
    return out;
  }

  function formatCurrency(v) {
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString("ko-KR") + "원";
  }

  function formatYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function formatTime(d) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  async function loadOrders() {
    if (state.loading) return;
    state.loading = true;
    spinner(true);
    try {
      // target 후보: "ORDERS" (대문자), "orders" (소문자)
      let res;
      try {
        res = await apiGetSmart("ORDERS", { page: 1, pageSize: 500, q: "" });
      } catch {
        res = await apiGetSmart("orders", { page: 1, pageSize: 500, q: "" });
      }

      // app.js 스타일: {data:{rows:[]}} 또는 {rows:[]}
      const rows = res?.data?.rows || res?.rows || [];
      state.orders = rows;

      // 매핑 최초 탐지
      state.mapping = detectOrderMapping(rows[0] || {});
      // 필수: status 키 없으면 강제로 만들기(프론트에서만)
      if (!state.mapping.status) state.mapping.status = "status";

      // 상태 값 정규화 (빈 값이면 출고대기)
      state.orders.forEach((r) => {
        const st = normStr(getVal(r, state.mapping.status));
        if (!st) setVal(r, state.mapping.status, "출고대기");
      });

      state.lastLoadedAt = new Date();
      applyFilter();
      renderCards();
      toast("칸반 데이터를 불러왔습니다.", "success");
    } catch (e) {
      console.error(e);
      toast("칸반 로딩 실패: " + (e.message || e), "error");
    } finally {
      state.loading = false;
      spinner(false);
    }
  }

  function applyFilter() {
    const q = normStr(state.q).toLowerCase();
    if (!q) {
      state.filtered = state.orders.slice();
      return;
    }
    state.filtered = state.orders.filter((r) => {
      const joined = Object.values(r).join(" ").toLowerCase();
      return joined.includes(q);
    });
  }

  async function moveCard(rowId, nextStatus) {
    const id = Number(rowId);
    if (!id || !nextStatus) return;

    const m = state.mapping;
    const row = state.orders.find((r) => Number(getVal(r, m.rowIndexKey) || r._row) === id);
    if (!row) return;

    const prev = normStr(getVal(row, m.status));
    if (prev === nextStatus) return;

    // UI 먼저 반영(낙관적 업데이트)
    setVal(row, m.status, nextStatus);
    applyFilter();
    renderCards();

    try {
      spinner(true);
      await apiPostSmart({
        target: "updateRow",
        key: "ORDERS",
        row: id,
        rowObject: {
          // 시트 헤더가 "status"가 아닐 수 있으므로, 가능하면 "상태"도 함께 넣어줌
          [m.status]: nextStatus,
          상태: nextStatus,
          status: nextStatus,
        },
      });
      toast(`상태 변경: ${prev} → ${nextStatus}`, "success");
    } catch (e) {
      console.error(e);
      // 실패 시 롤백
      setVal(row, m.status, prev);
      applyFilter();
      renderCards();
      toast("상태 변경 실패: " + (e.message || e), "error");
    } finally {
      spinner(false);
    }
  }

  // ----- 보조 -----
  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function cssEscape(s) {
    // 간단 escape (따옴표/역슬래시)
    return String(s).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  function bindUI() {
    const refresh = $("#kanbanRefresh");
    if (refresh) refresh.addEventListener("click", loadOrders);

    const search = $("#kanbanSearch");
    if (search) {
      search.addEventListener("input", () => {
        state.q = search.value || "";
        applyFilter();
        renderCards();
      });
    }
  }

  function init() {
    const root = ensureKanbanRoot();
    renderShell(root);
    renderColumns();
    bindUI();
    loadOrders();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
