// app.js – Dashboard (PW_HASH 로그인 후)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function requireLogin() {
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) location.replace("index.html");
    } catch (_) {
      location.replace("index.html");
    }
  }

  requireLogin();

  async function apiGet(target, params = {}) {
    const url = new URL(API_BASE);
    url.searchParams.set("target", target);
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);
    Object.entries(params).forEach(([k,v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), { method:"GET", headers:{ "Accept":"application/json" } });
    const json = await res.json().catch(()=>({}));
    if (!res.ok || json.ok === false) throw new Error(json.message || ("HTTP " + res.status));
    return json;
  }

  async function apiPost(body) {
    const res = await fetch(API_BASE, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Accept":"application/json" },
      body: JSON.stringify({ secret: API_SECRET || undefined, ...body })
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok || json.ok === false) throw new Error(json.message || ("HTTP " + res.status));
    return json;
  }

  function won(v){ return (Number(v)||0).toLocaleString("ko-KR")+"원"; }

  async function initPing() {
    try {
      const res = await apiGet("ping");
      $("#apiStatusText").textContent = "LIVE " + (res.version || "");
    } catch (e) {
      $("#apiStatusText").textContent = "연결 실패";
    }
  }

  async function loadDashboard() {
    const res = await apiGet("dashboard");
    const d = res.data || {};
    $("#cardTotalRevenue").textContent = won(d.totals?.revenue ?? 0);
    $("#cardTotalOrders").textContent = String(d.totals?.orders ?? "-");
    $("#cardTotalMembers").textContent = String(d.totals?.members ?? "-");
    $("#cardTotalProducts").textContent = String(d.totals?.products ?? "-");
  }

  // CRUD MODAL
  const MODAL = {
    openEdit({ sheet, rowIndex, data }) {
      const backdrop = $("#modalBackdrop");
      const modal = $("#modalEdit");
      const fields = $("#rowEditFields");
      const btnSave = $("#rowEditSave");
      if (!backdrop || !modal || !fields || !btnSave) return;

      fields.innerHTML = "";

      // data의 키들로 입력 생성(_row 제외)
      Object.keys(data).filter(k => k !== "_row").forEach((k) => {
        const wrap = document.createElement("div");
        wrap.innerHTML = `
          <label class="text-xs text-slate-400">${k}</label>
          <input data-field-key="${k}" class="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm" />
        `;
        const input = $("input", wrap);
        input.value = data[k] ?? "";
        fields.appendChild(wrap);
      });

      btnSave.dataset.sheet = sheet;
      btnSave.dataset.rowIndex = String(rowIndex);

      backdrop.classList.remove("hidden");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    },

    openDelete({ sheet, rowIndex, title }) {
      const backdrop = $("#modalBackdrop");
      const modal = $("#modalDelete");
      const txt = $("#rowDeleteText");
      const btn = $("#rowDeleteConfirm");
      if (!backdrop || !modal || !btn) return;

      if (txt) txt.textContent = title ? `"${title}" 항목을 삭제합니다.` : "정말 삭제하시겠습니까?";
      btn.dataset.sheet = sheet;
      btn.dataset.rowIndex = String(rowIndex);

      backdrop.classList.remove("hidden");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    },

    closeAll() {
      const backdrop = $("#modalBackdrop");
      const m1 = $("#modalEdit");
      const m2 = $("#modalDelete");
      [m1, m2].forEach(m => {
        if (!m) return;
        m.classList.add("hidden");
        m.classList.remove("flex");
      });
      if (backdrop) backdrop.classList.add("hidden");
    }
  };

  // DnD(간단): tbody 내 행 드래그 → 순서 변경(서버 저장은 SORT 컬럼 있을 때만)
  function enableDnD(tbody, onDrop) {
    let dragEl = null;

    tbody.addEventListener("dragstart", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;
      dragEl = tr;
      e.dataTransfer.effectAllowed = "move";
    });

    tbody.addEventListener("dragover", (e) => {
      e.preventDefault();
      const over = e.target.closest("tr");
      if (!over || over === dragEl) return;

      const rect = over.getBoundingClientRect();
      const next = (e.clientY - rect.top) > rect.height / 2;
      tbody.insertBefore(dragEl, next ? over.nextSibling : over);
    });

    tbody.addEventListener("drop", async (e) => {
      e.preventDefault();
      if (!onDrop) return;
      await onDrop();
    });
  }

  async function loadMembersTable() {
    const tbody = $("#membersBody");
    const pager = $("#membersPager");
    const search = $("#searchMembers");

    const state = { page:1, pageSize:50, q:"" };

    async function fetchAndRender() {
      const res = await apiGet("members", { page: state.page, pageSize: state.pageSize, q: state.q });
      const d = res.data || {};
      const rows = d.rows || [];
      const total = d.total ?? rows.length;

      tbody.innerHTML = "";

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">데이터가 없습니다.</td></tr>`;
        return;
      }

      rows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-slate-800 hover:bg-slate-800/40";
        tr.draggable = true;
        tr.dataset.rowIndex = String(r._row || 0);

        tr.innerHTML = `
          <td class="p-2">${r.memberNo ?? ""}</td>
          <td class="p-2">${r.name ?? ""}</td>
          <td class="p-2">${r.phone ?? ""}</td>
          <td class="p-2">${r.grade ?? ""}</td>
          <td class="p-2 text-right">${r.totalSales != null ? (Number(r.totalSales)||0).toLocaleString("ko-KR") : ""}</td>
          <td class="p-2 text-center">
            <button class="btn-edit px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs mr-1">수정</button>
            <button class="btn-del px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-xs">삭제</button>
          </td>
        `;

        $(".btn-edit", tr).addEventListener("click", () => {
          MODAL.openEdit({ sheet:"MEMBERS", rowIndex: r._row, data: r });
        });
        $(".btn-del", tr).addEventListener("click", () => {
          MODAL.openDelete({ sheet:"MEMBERS", rowIndex: r._row, title: r.name || r.memberNo || "" });
        });

        tbody.appendChild(tr);
      });

      const label = pager?.querySelector("[data-page-label]");
      if (label) {
        const start = (state.page - 1) * state.pageSize + 1;
        const end = Math.min(total, state.page * state.pageSize);
        label.textContent = total ? `${start}–${end} / ${total}` : `${state.page}`;
      }
    }

    if (pager) {
      pager.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-page]");
        if (!btn) return;
        if (btn.dataset.page === "prev") state.page = Math.max(1, state.page - 1);
        if (btn.dataset.page === "next") state.page = state.page + 1;
        fetchAndRender();
      });
    }

    if (search) {
      let t = null;
      search.addEventListener("input", () => {
        state.q = search.value.trim();
        state.page = 1;
        clearTimeout(t);
        t = setTimeout(fetchAndRender, 250);
      });
    }

    // DnD 활성화(서버 저장은 SORT 컬럼 있을 때 확장)
    enableDnD(tbody, async () => {
      // 현재는 UI 정렬만. 원하면 MEMBERS에 SORT 컬럼 추가 후 여기서 updateRow로 저장 가능.
      // 예: 각 tr 순서를 읽어서 SORT 값을 1..N으로 updateRow 반복 호출
    });

    await fetchAndRender();
  }

  function initModalActions() {
    $("#modalBackdrop")?.addEventListener("click", () => MODAL.closeAll());
    $("#modalClose")?.addEventListener("click", () => MODAL.closeAll());
    $("#modalDeleteClose")?.addEventListener("click", () => MODAL.closeAll());

    $("#rowEditSave")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const sheet = btn.dataset.sheet;
      const rowIndex = Number(btn.dataset.rowIndex || "0");
      const fields = $("#rowEditFields");
      if (!sheet || !rowIndex || !fields) return;

      const inputs = $$("input[data-field-key]", fields);
      const rowObject = {};
      inputs.forEach(inp => rowObject[inp.dataset.fieldKey] = inp.value ?? "");

      try {
        await apiPost({ target:"updateRow", key: sheet, row: rowIndex, rowObject });
        MODAL.closeAll();
        await loadMembersTable();
      } catch (err) {
        console.error(err);
        alert("저장 실패: " + (err.message || err));
      }
    });

    $("#rowDeleteConfirm")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const sheet = btn.dataset.sheet;
      const rowIndex = Number(btn.dataset.rowIndex || "0");
      if (!sheet || !rowIndex) return;

      try {
        await apiPost({ target:"deleteRow", key: sheet, row: rowIndex });
        MODAL.closeAll();
        await loadMembersTable();
      } catch (err) {
        console.error(err);
        alert("삭제 실패: " + (err.message || err));
      }
    });
  }

  function initLogout() {
    $("#btnLogout")?.addEventListener("click", () => {
      localStorage.removeItem("korual_user");
      location.replace("index.html");
    });
  }

  async function init() {
    initLogout();
    initModalActions();
    await initPing();
    await loadDashboard();
    await loadMembersTable();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
