// modal.js
// KORUAL CONTROL CENTER – Modal Manager (CRUD)

(function () {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const modalRoot = document.getElementById("modalRoot");
  if (!modalRoot) return;

  const state = {
    current: null,
  };

  function openBase(html) {
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-close></div>
        <div class="relative w-full max-w-xl glass rounded-2xl shadow-2xl">
          ${html}
        </div>
      </div>
    `;
    modalRoot.querySelector("[data-close]")?.addEventListener("click", closeAll);
  }

  function closeAll() {
    modalRoot.innerHTML = "";
    state.current = null;
  }

  /* ===========================
     EDIT MODAL
  =========================== */
  function openEdit({ entity, sheet, rowIndex, data }) {
    state.current = { entity, sheet, rowIndex };

    const fields = Object.keys(data)
      .filter(k => !k.startsWith("_"))
      .map(k => `
        <div>
          <label class="text-xs text-slate-400">${k}</label>
          <input
            class="input mt-1"
            data-field-key="${k}"
            value="${data[k] ?? ""}"
          />
        </div>
      `)
      .join("");

    openBase(`
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">데이터 수정</h3>

        <div id="rowEditFields" class="space-y-3 max-h-[60vh] overflow-y-auto">
          ${fields}
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button class="px-4 py-2 rounded-lg border border-slate-600"
                  data-close>취소</button>
          <button id="rowEditSave"
                  class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500">
            저장
          </button>
        </div>
      </div>
    `);

    const saveBtn = $("#rowEditSave", modalRoot);
    saveBtn.dataset.entity = entity;
    saveBtn.dataset.sheet = sheet;
    saveBtn.dataset.rowIndex = rowIndex;
  }

  /* ===========================
     DELETE MODAL
  =========================== */
  function openDelete({ entity, sheet, rowIndex, title }) {
    state.current = { entity, sheet, rowIndex };

    openBase(`
      <div class="p-6 text-center">
        <h3 class="text-lg font-semibold mb-2 text-rose-400">삭제 확인</h3>
        <p class="text-sm text-slate-300 mb-6">
          정말 <b>${title || "이 항목"}</b> 을 삭제하시겠습니까?
        </p>

        <div class="flex justify-center gap-3">
          <button class="px-4 py-2 rounded-lg border border-slate-600"
                  data-close>취소</button>
          <button id="rowDeleteConfirm"
                  class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500">
            삭제
          </button>
        </div>
      </div>
    `);

    const delBtn = $("#rowDeleteConfirm", modalRoot);
    delBtn.dataset.entity = entity;
    delBtn.dataset.sheet = sheet;
    delBtn.dataset.rowIndex = rowIndex;
  }

  // 공개 API
  window.KORUAL_MODAL = {
    openEdit,
    openDelete,
    closeAll,
  };
})();
