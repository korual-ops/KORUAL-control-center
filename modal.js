/******************************************************
 * KORUAL CONTROL CENTER – Modal Controller (High-End)
 * - 행 수정 / 삭제 모달 전용 스크립트
 * - window.KORUAL_MODAL.{openEdit, openDelete, closeAll} 제공
 *
 * ※ index.html 에서 modal.js 를 app.js 보다 "먼저" 로드하면
 *    app.js 에서 바로 KORUAL_MODAL 을 사용할 수 있습니다.
 ******************************************************/

(function () {
  const $ = (id) => document.getElementById(id);

  const layer       = $("korualModalLayer");
  const backdrop    = $("korualModalBackdrop");
  const editModal   = $("rowEditModal");
  const deleteModal = $("rowDeleteModal");

  const editEntityLabel   = $("rowEditEntityLabel");
  const editRowLabel      = $("rowEditRowLabel");
  const editFieldsWrap    = $("rowEditFields");
  const deleteEntityLabel = $("rowDeleteEntityLabel");
  const deleteRowLabel    = $("rowDeleteRowLabel");
  const deleteMessage     = $("rowDeleteMessage");

  const entityLabelMap = {
    members:  "회원",
    orders:   "주문",
    products: "상품",
    stock:    "재고",
    logs:     "로그",
  };

  let lastActiveElement = null;

  function getEntityName(key) {
    return entityLabelMap[key] || key || "-";
  }

  function openLayer() {
    if (!layer) return;
    lastActiveElement = document.activeElement;
    layer.style.display = "flex";
    document.body.classList.add("modal-open");
  }

  function closeLayer() {
    if (!layer) return;
    layer.style.display = "none";
    if (editModal) editModal.style.display = "none";
    if (deleteModal) deleteModal.style.display = "none";
    document.body.classList.remove("modal-open");

    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      try {
        lastActiveElement.focus();
      } catch (e) {
        // ignore
      }
    }
    lastActiveElement = null;
  }

  function focusFirstInteractive(root) {
    if (!root) return;
    const first = root.querySelector(
      'input, select, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (first && typeof first.focus === "function") {
      first.focus();
    }
  }

  function openEdit(payload) {
    if (!layer || !editModal || !editFieldsWrap) return;

    const entity = payload.entity || "";
    const rowIdx = payload.rowIndex != null ? payload.rowIndex : "-";
    const data   = payload.data || {};

    openLayer();

    editModal.style.display = "block";
    if (deleteModal) deleteModal.style.display = "none";

    if (editEntityLabel) {
      editEntityLabel.textContent = `[${getEntityName(entity)}]`;
    }
    if (editRowLabel) {
      editRowLabel.textContent = `ROW: ${rowIdx}`;
    }

    editFieldsWrap.innerHTML = "";

    Object.keys(data).forEach((key) => {
      const fieldVal = data[key] == null ? "" : data[key];

      const row = document.createElement("div");
      row.className = "modal-field-row";

      const label = document.createElement("label");
      label.className = "modal-label";
      label.textContent = key;

      const input = document.createElement("input");
      input.className = "input modal-input";
      input.dataset.fieldKey = key;
      input.value = fieldVal;

      row.appendChild(label);
      row.appendChild(input);
      editFieldsWrap.appendChild(row);
    });

    const saveBtn = $("rowEditSave");
    if (saveBtn) {
      saveBtn.dataset.entity   = entity;
      saveBtn.dataset.sheet    = payload.sheet || "";
      saveBtn.dataset.rowIndex = String(rowIdx || "");
    }

    focusFirstInteractive(editModal);
  }

  function openDelete(payload) {
    if (!layer || !deleteModal || !deleteMessage) return;

    const entity = payload.entity || "";
    const rowIdx = payload.rowIndex != null ? payload.rowIndex : "-";
    const title  = payload.title || "";

    openLayer();

    deleteModal.style.display = "block";
    if (editModal) editModal.style.display = "none";

    if (deleteEntityLabel) {
      deleteEntityLabel.textContent = `[${getEntityName(entity)}]`;
    }
    if (deleteRowLabel) {
      deleteRowLabel.textContent = `ROW: ${rowIdx}`;
    }

    const msg = title
      ? `다음 데이터를 삭제할까요?\n${title}`
      : "선택한 행을 삭제하시겠습니까?";
    deleteMessage.textContent = msg;

    const btn = $("rowDeleteConfirm");
    if (btn) {
      btn.dataset.entity   = entity;
      btn.dataset.sheet    = payload.sheet || "";
      btn.dataset.rowIndex = String(rowIdx || "");
    }

    focusFirstInteractive(deleteModal);
  }

  // 공통 닫기 버튼
  function bindCloseButtons() {
    if (!layer) return;
    const closeBtns = layer.querySelectorAll("[data-close-modal]");
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", closeLayer);
    });
  }

  // 외부(배경) 클릭 시 닫기
  function bindBackdrop() {
    if (!backdrop) return;
    backdrop.addEventListener("click", closeLayer);
  }

  // ESC 키로 닫기
  function bindEscKey() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!layer) return;
        if (layer.style.display === "flex") {
          closeLayer();
        }
      }
    });
  }

  // 모달 내부 클릭 시 버블 방지 (옵션)
  function preventInnerClose() {
    [editModal, deleteModal].forEach((panel) => {
      if (!panel) return;
      panel.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindCloseButtons();
    bindBackdrop();
    bindEscKey();
    preventInnerClose();
  });

  // 전역 노출
  window.KORUAL_MODAL = {
    openEdit,
    openDelete,
    closeAll: closeLayer,
  };
})();
