// modal.js — KORUAL CRUD Modal (Edit/Delete)
// app.js의 KORUAL_API 사용 가능. 없으면 META.api로 직접 호출(폴백).
// 사용법:
// 1) dashboard.html에 모달 컨테이너 div를 자동 생성(없으면 생성)
// 2) window.KORUAL_MODAL.openEdit({ entity, sheet, rowIndex, data })
// 3) window.KORUAL_MODAL.openDelete({ entity, sheet, rowIndex, title })

(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(msg, type = "info") {
    if (window.KORUAL_API?.showToast) return window.KORUAL_API.showToast(msg, type);
    console.log(`[${type}]`, msg);
  }
  function spinner(on) {
    if (on) window.KORUAL_API?.showSpinner?.();
    else window.KORUAL_API?.hideSpinner?.();
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

  // ----- DOM 생성 -----
  function ensureModalRoot() {
    let root = document.getElementById("korualModalRoot");
    if (root) return root;

    root = document.createElement("div");
    root.id = "korualModalRoot";
    root.innerHTML = `
      <div id="korualModalBackdrop" class="hidden fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm"></div>

      <!-- Edit Modal -->
      <div id="korualEditModal" class="hidden fixed inset-0 z-[80] flex items-center justify-center px-4">
        <div class="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_70px_rgba(15,23,42,0.98)] overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-slate-100">행 수정</div>
              <div class="text-[11px] text-slate-400" id="korualEditSub">—</div>
            </div>
            <button id="korualEditClose" class="text-slate-500 hover:text-slate-200 text-sm" type="button">✕</button>
          </div>

          <div class="p-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="korualEditFields"></div>

            <div class="mt-4 flex items-center justify-between gap-2">
              <div class="text-[11px] text-slate-500" id="korualEditHint">필드를 수정 후 저장하세요.</div>
              <div class="flex gap-2">
                <button id="korualEditCancel" class="px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-slate-100 text-xs hover:bg-slate-900" type="button">
                  취소
                </button>
                <button id="korualEditSave" class="px-3 py-2 rounded-xl border border-sky-500/60 bg-sky-600/20 text-sky-100 text-xs hover:bg-sky-600/30" type="button">
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Modal -->
      <div id="korualDeleteModal" class="hidden fixed inset-0 z-[80] flex items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl border border-rose-700/40 bg-slate-950/95 shadow-[0_24px_70px_rgba(15,23,42,0.98)] overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-slate-100">행 삭제</div>
              <div class="text-[11px] text-slate-400" id="korualDeleteSub">—</div>
            </div>
            <button id="korualDeleteClose" class="text-slate-500 hover:text-slate-200 text-sm" type="button">✕</button>
          </div>

          <div class="p-5 space-y-3">
            <p class="text-xs text-slate-300">
              정말 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.
            </p>
            <div class="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
              <div class="text-[11px] text-slate-400">대상</div>
              <div class="text-sm text-slate-100 font-semibold" id="korualDeleteTitle">—</div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button id="korualDeleteCancel" class="px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-slate-100 text-xs hover:bg-slate-900" type="button">
                취소
              </button>
              <button id="korualDeleteConfirm" class="px-3 py-2 rounded-xl border border-rose-500/60 bg-rose-600/20 text-rose-100 text-xs hover:bg-rose-600/30" type="button">
                삭제
              </button>
            </div>

            <p class="text-[10px] text-slate-500">
              삭제 이벤트는 LOGS에 기록하는 것을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  const modalState = {
    edit: null,   // { entity, sheet, rowIndex, data }
    del: null,    // { entity, sheet, rowIndex, title }
    excludeKeys: new Set(["_row", "rowIndex", "meta", "requestId"]),
  };

  function openBackdrop() {
    $("#korualModalBackdrop")?.classList.remove("hidden");
  }
  function closeBackdrop() {
    $("#korualModalBackdrop")?.classList.add("hidden");
  }

  function closeAll() {
    $("#korualEditModal")?.classList.add("hidden");
    $("#korualDeleteModal")?.classList.add("hidden");
    closeBackdrop();
    modalState.edit = null;
    modalState.del = null;
  }

  function openEdit(payload) {
    ensureModalRoot();

    modalState.edit = {
      entity: payload.entity || "",
      sheet: payload.sheet || "",
      rowIndex: Number(payload.rowIndex || 0),
      data: payload.data || {},
    };

    const sub = $("#korualEditSub");
    if (sub) sub.textContent = `${modalState.edit.sheet} · row ${modalState.edit.rowIndex}`;

    const fields = $("#korualEditFields");
    if (fields) {
      fields.innerHTML = "";
      const data = modalState.edit.data;

      const keys = Object.keys(data || {}).filter((k) => !modalState.excludeKeys.has(k));
      // 키가 너무 많으면 1열로 전환
      if (keys.length > 18) fields.className = "grid grid-cols-1 gap-3";
      else fields.className = "grid grid-cols-1 md:grid-cols-2 gap-3";

      keys.forEach((k) => {
        const v = data[k];
        const block = document.createElement("div");
        block.innerHTML = `
          <label class="block text-[11px] text-slate-400 mb-1">${escapeHtml(k)}</label>
          <input
            class="w-full px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-950/70 text-slate-100 text-xs outline-none focus:ring-2 focus:ring-sky-500/40"
            data-field-key="${escapeHtml(k)}"
            value="${escapeAttr(v)}"
          />
        `;
        fields.appendChild(block);
      });

      if (!keys.length) {
        fields.innerHTML = `
          <div class="text-xs text-slate-400">
            편집할 필드가 없습니다. (데이터 키가 없거나 제외 처리됨)
          </div>
        `;
      }
    }

    openBackdrop();
    $("#korualEditModal")?.classList.remove("hidden");
  }

  function openDelete(payload) {
    ensureModalRoot();

    modalState.del = {
      entity: payload.entity || "",
      sheet: payload.sheet || "",
      rowIndex: Number(payload.rowIndex || 0),
      title: payload.title || "",
    };

    const sub = $("#korualDeleteSub");
    if (sub) sub.textContent = `${modalState.del.sheet} · row ${modalState.del.rowIndex}`;

    const titleEl = $("#korualDeleteTitle");
    if (titleEl) titleEl.textContent = modalState.del.title || "(제목 없음)";

    openBackdrop();
    $("#korualDeleteModal")?.classList.remove("hidden");
  }

  async function saveEdit() {
    const ctx = modalState.edit;
    if (!ctx?.sheet || !ctx?.rowIndex) return;

    const fieldsWrap = $("#korualEditFields");
    const inputs = $$("input[data-field-key]", fieldsWrap);

    const rowObject = {};
    inputs.forEach((input) => {
      const key = input.dataset.fieldKey;
      rowObject[key] = input.value ?? "";
    });

    spinner(true);
    try {
      await apiPostSmart({
        target: "updateRow",
        key: ctx.sheet,
        row: ctx.rowIndex,
        rowObject,
      });

      toast("수정이 저장되었습니다.", "success");
      closeAll();

      // 데이터 새로고침 훅(있으면)
      window.KORUAL_TABLES?.reloadAll?.();
      window.KORUAL_DASH?.reload?.();
      window.KORUAL_KANBAN?.reload?.();
    } catch (e) {
      console.error(e);
      toast("저장 실패: " + (e.message || e), "error");
    } finally {
      spinner(false);
    }
  }

  async function confirmDelete() {
    const ctx = modalState.del;
    if (!ctx?.sheet || !ctx?.rowIndex) return;

    spinner(true);
    try {
      await apiPostSmart({
        target: "deleteRow",
        key: ctx.sheet,
        row: ctx.rowIndex,
      });

      toast("행이 삭제되었습니다.", "success");
      closeAll();

      window.KORUAL_TABLES?.reloadAll?.();
      window.KORUAL_DASH?.reload?.();
      window.KORUAL_KANBAN?.reload?.();
    } catch (e) {
      console.error(e);
      toast("삭제 실패: " + (e.message || e), "error");
    } finally {
      spinner(false);
    }
  }

  function bindEvents() {
    // 바깥 클릭 닫기
    $("#korualModalBackdrop")?.addEventListener("click", closeAll);

    $("#korualEditClose")?.addEventListener("click", closeAll);
    $("#korualEditCancel")?.addEventListener("click", closeAll);
    $("#korualEditSave")?.addEventListener("click", saveEdit);

    $("#korualDeleteClose")?.addEventListener("click", closeAll);
    $("#korualDeleteCancel")?.addEventListener("click", closeAll);
    $("#korualDeleteConfirm")?.addEventListener("click", confirmDelete);

    // ESC 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const editOpen = !$("#korualEditModal")?.classList.contains("hidden");
        const delOpen = !$("#korualDeleteModal")?.classList.contains("hidden");
        if (editOpen || delOpen) closeAll();
      }
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function init() {
    ensureModalRoot();
    bindEvents();

    // 공개 API
    window.KORUAL_MODAL = {
      openEdit,
      openDelete,
      closeAll,
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
