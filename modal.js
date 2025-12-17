// modal.js
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureModalRoot() {
    let root = $("#korualModalRoot");
    if (root) return root;

    root = document.createElement("div");
    root.id = "korualModalRoot";
    root.className =
      "fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4";

    root.innerHTML = `
      <div class="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_70px_rgba(15,23,42,0.98)] p-5 relative">
        <button id="korualModalClose" class="absolute right-3 top-3 text-slate-400 hover:text-slate-100" type="button">✕</button>

        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[11px] uppercase tracking-[0.3em] text-slate-500">KORUAL CRUD</div>
            <h3 id="korualModalTitle" class="text-sm font-semibold text-slate-100 mt-1">Edit</h3>
          </div>
          <div class="text-xs text-slate-400">
            <span id="korualModalSub"></span>
          </div>
        </div>

        <div id="korualModalBody" class="mt-4 space-y-3 max-h-[60vh] overflow-auto pr-1"></div>

        <div class="mt-5 flex items-center justify-end gap-2">
          <button id="korualModalDelete" class="px-3 py-2 rounded-xl border border-rose-500/50 text-rose-300 hover:bg-rose-500/10" type="button">삭제</button>
          <button id="korualModalSave" class="px-3 py-2 rounded-xl bg-sky-500/90 text-slate-950 font-semibold hover:bg-sky-400" type="button">저장</button>
        </div>

        <p id="korualModalMsg" class="mt-2 text-xs text-rose-300 min-h-[1rem]"></p>
      </div>
    `;

    document.body.appendChild(root);

    $("#korualModalClose").addEventListener("click", close);
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });

    return root;
  }

  let state = null;

  function open(opts) {
    const root = ensureModalRoot();

    const title = opts?.title || "Edit row";
    const sub = opts?.sub || "";
    const sheetKey = opts?.sheetKey || "";
    const rowIndex = Number(opts?.rowIndex || 0);
    const rowObject = opts?.rowObject || {};
    const onSave = typeof opts?.onSave === "function" ? opts.onSave : null;
    const onDelete = typeof opts?.onDelete === "function" ? opts.onDelete : null;

    $("#korualModalTitle").textContent = title;
    $("#korualModalSub").textContent = sub;
    $("#korualModalMsg").textContent = "";

    const body = $("#korualModalBody");
    body.innerHTML = "";

    const keys = Object.keys(rowObject).filter((k) => k !== "_row");
    const fields = {};

    keys.forEach((k) => {
      const wrap = document.createElement("div");
      wrap.className = "grid grid-cols-1 sm:grid-cols-[190px,1fr] gap-2 items-center";

      wrap.innerHTML = `
        <div class="text-xs text-slate-300 break-all">${escapeHtml(k)}</div>
        <input
          class="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/70 text-slate-100 text-sm outline-none focus:border-sky-400"
          value="${escapeHtml(String(rowObject[k] ?? ""))}"
        />
      `;

      const input = wrap.querySelector("input");
      fields[k] = input;
      body.appendChild(wrap);
    });

    state = { sheetKey, rowIndex, fields, onSave, onDelete };

    $("#korualModalSave").onclick = async () => {
      $("#korualModalMsg").textContent = "";
      if (!state?.onSave) return;

      try {
        const rowObjectOut = {};
        Object.keys(state.fields).forEach((k) => {
          rowObjectOut[k] = state.fields[k].value;
        });
        await state.onSave({ sheetKey: state.sheetKey, rowIndex: state.rowIndex, rowObject: rowObjectOut });
        close();
      } catch (e) {
        $("#korualModalMsg").textContent = e?.message || "저장 실패";
      }
    };

    $("#korualModalDelete").onclick = async () => {
      $("#korualModalMsg").textContent = "";
      if (!state?.onDelete) return;

      try {
        await state.onDelete({ sheetKey: state.sheetKey, rowIndex: state.rowIndex });
        close();
      } catch (e) {
        $("#korualModalMsg").textContent = e?.message || "삭제 실패";
      }
    };

    root.classList.remove("hidden");
    root.classList.add("flex");
  }

  function close() {
    const root = $("#korualModalRoot");
    if (!root) return;
    root.classList.add("hidden");
    root.classList.remove("flex");
    state = null;
  }

  // 전역 공개
  window.KORUAL_MODAL = {
    open,
    close,
    escapeHtml,
  };
})();
