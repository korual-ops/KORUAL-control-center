/******************************************************
 * KORUAL CONTROL CENTER – modal.js
 * 공통 행 수정/삭제 모달
 * - window.KORUAL_MODAL.openEdit(...)
 * - window.KORUAL_MODAL.openDelete(...)
 * - 실제 API 호출은 콜백 또는 CustomEvent로 분리
 ******************************************************/

(function () {
  const root = document.getElementById("modal-root");
  if (!root) {
    console.warn("[KORUAL_MODAL] #modal-root 가 없습니다.");
    return;
  }

  /* -------------------------------------------------
     1) 기본 DOM 생성
  -------------------------------------------------- */
  root.innerHTML = `
    <div class="modal-layer" data-modal-layer style="display:none;">
      <div class="modal-backdrop" data-modal-close></div>

      <!-- 수정 모달 -->
      <div class="modal-panel" data-modal-edit>
        <div class="modal-header">
          <h3 class="modal-title" data-edit-title>행 수정</h3>
          <button type="button" class="modal-close-btn" data-modal-close>✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-meta">
            <span data-edit-entity>[-]</span>
            <span class="row-label" data-edit-row>ROW: -</span>
          </div>
          <div class="modal-fields" data-edit-fields></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="primary-btn" data-edit-save>저장</button>
          <button type="button" class="ghost-btn" data-modal-close>취소</button>
        </div>
      </div>

      <!-- 삭제 모달 -->
      <div class="modal-panel" data-modal-delete style="display:none;">
        <div class="modal-header">
          <h3>행 삭제</h3>
          <button type="button" class="modal-close-btn" data-modal-close>✕</button>
        </div>
        <div class="modal-body">
          <p data-delete-message>선택한 행을 삭제하시겠습니까?</p>
          <div class="modal-meta">
            <span data-delete-entity>[-]</span>
            <span class="row-label" data-delete-row>ROW: -</span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="primary-btn" data-delete-confirm>삭제</button>
          <button type="button" class="ghost-btn" data-modal-close>취소</button>
        </div>
      </div>
    </div>
  `;

  const layer         = root.querySelector("[data-modal-layer]");
  const editPanel     = root.querySelector("[data-modal-edit]");
  const deletePanel   = root.querySelector("[data-modal-delete]");
  const editFieldsBox = root.querySelector("[data-edit-fields]");

  const editTitleEl   = root.querySelector("[data-edit-title]");
  const editEntityEl  = root.querySelector("[data-edit-entity]");
  const editRowEl     = root.querySelector("[data-edit-row]");

  const delMsgEl      = root.querySelector("[data-delete-message]");
  const delEntityEl   = root.querySelector("[data-delete-entity]");
  const delRowEl      = root.querySelector("[data-delete-row]");

  const btnEditSave   = root.querySelector("[data-edit-save]");
  const btnDeleteConf = root.querySelector("[data-delete-confirm]");

  /* -------------------------------------------------
     2) 내부 상태
  -------------------------------------------------- */
  const state = {
    mode: null,         // "edit" | "delete"
    entity: null,       // "members" | "orders" ...
    rowIndex: null,     // 시트 기준 row index
    originalData: null, // 수정 전 데이터
    onSave: null,       // 콜백
    onConfirm: null     // 콜백
  };

  const ENTITY_LABEL = {
    members: "회원",
    orders: "주문",
    products: "상품",
    stock: "재고",
    logs: "로그"
  };

  function openLayer() {
    if (!layer) return;
    layer.style.display = "flex";
    document.body.classList.add("modal-open");
  }

  function closeLayer() {
    if (!layer) return;
    layer.style.display = "none";
    document.body.classList.remove("modal-open");
    state.mode = null;
    state.entity = null;
    state.rowIndex = null;
    state.originalData = null;
    state.onSave = null;
    state.onConfirm = null;
  }

  /* -------------------------------------------------
     3) 수정 모달
  -------------------------------------------------- */
  function openEdit(payload) {
    if (!layer || !editPanel) return;

    state.mode       = "edit";
    state.entity     = payload.entity || null;
    state.rowIndex   = payload.rowIndex ?? null;
    state.originalData = payload.data || {};
    state.onSave     = typeof payload.onSave === "function" ? payload.onSave : null;

    const entityName = ENTITY_LABEL[state.entity] || state.entity || "-";

    editTitleEl.textContent  = payload.title || "행 수정";
    editEntityEl.textContent = `[${entityName}]`;
    editRowEl.textContent    = `ROW: ${state.rowIndex ?? "-"}`;

    // 필드 렌더링
    editFieldsBox.innerHTML = "";
    const data = state.originalData;

    Object.keys(data).forEach((key) => {
      const val = data[key] ?? "";

      const row = document.createElement("div");
      row.className = "modal-field-row";

      const label = document.createElement("label");
      label.className = "modal-label";
      label.textContent = key;

      const input = document.createElement("input");
      input.className = "input";
      input.dataset.fieldKey = key;
      input.value = String(val);

      row.appendChild(label);
      row.appendChild(input);
      editFieldsBox.appendChild(row);
    });

    // 패널 표시 전환
    editPanel.style.display   = "block";
    deletePanel.style.display = "none";
    openLayer();
  }

  function collectEditData() {
    const result = { ...(state.originalData || {}) };

    editFieldsBox.querySelectorAll("input[data-field-key]").forEach((input) => {
      const key = input.dataset.fieldKey;
      result[key] = input.value;
    });

    return result;
  }

  btnEditSave.addEventListener("click", () => {
    if (state.mode !== "edit") return;

    const newData = collectEditData();
    const detail = {
      entity: state.entity,
      rowIndex: state.rowIndex,
      before: state.originalData,
      after: newData
    };

    // 1순위: 콜백
    if (state.onSave) {
      state.onSave(detail);
    } else {
      // 2순위: 커스텀 이벤트 (app.js에서 리스닝해서 API 연동)
      window.dispatchEvent(
        new CustomEvent("korual:row-edit-save", { detail })
      );
    }

    closeLayer();
  });

  /* -------------------------------------------------
     4) 삭제 모달
  -------------------------------------------------- */
  function openDelete(payload) {
    if (!layer || !deletePanel) return;

    state.mode       = "delete";
    state.entity     = payload.entity || null;
    state.rowIndex   = payload.rowIndex ?? null;
    state.onConfirm  = typeof payload.onConfirm === "function" ? payload.onConfirm : null;

    const entityName = ENTITY_LABEL[state.entity] || state.entity || "-";

    delEntityEl.textContent = `[${entityName}]`;
    delRowEl.textContent    = `ROW: ${state.rowIndex ?? "-"}`;

    const msg =
      payload.title
        ? `다음 데이터를 삭제할까요?\n${payload.title}`
        : "선택한 행을 삭제하시겠습니까?";
    delMsgEl.textContent = msg;

    deletePanel.style.display = "block";
    editPanel.style.display   = "none";
    openLayer();
  }

  btnDeleteConf.addEventListener("click", () => {
    if (state.mode !== "delete") return;

    const detail = {
      entity: state.entity,
      rowIndex: state.rowIndex
    };

    if (state.onConfirm) {
      state.onConfirm(detail);
    } else {
      window.dispatchEvent(
        new CustomEvent("korual:row-delete-confirm", { detail })
      );
    }

    closeLayer();
  });

  /* -------------------------------------------------
     5) 공통 닫기 버튼 & ESC
  -------------------------------------------------- */
  root.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", closeLayer);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (layer && layer.style.display === "flex") {
        closeLayer();
      }
    }
  });

  /* -------------------------------------------------
     6) 전역 API 노출
  -------------------------------------------------- */
  window.KORUAL_MODAL = {
    openEdit,
    openDelete,
    close: closeLayer
  };

  console.log("[KORUAL_MODAL] modal.js 초기화 완료");
})();
// 예: 회원 테이블 렌더링 후
function attachMemberRowHandlers() {
  const rows = document.querySelectorAll("#membersBody tr");
  rows.forEach((tr, idx) => {
    tr.addEventListener("dblclick", () => {
      const data = membersCache[idx]; // 이미 가지고 있는 원본 데이터

      window.KORUAL_MODAL.openEdit({
        entity: "members",
        rowIndex: idx + 2, // 시트에서 헤더 제외하고 row 번호 맞춰서
        data,
        title: `${data["이름"]} (${data["회원번호"]})`,
        onSave(detail) {
          console.log("수정 결과:", detail);
          // 여기에 Apps Script API update 호출 넣으면 됨
          // apiPost("updateRow", detail) 같은 형태로
        }
      });
    });
  });
}
window.KORUAL_MODAL.openDelete({
  entity: "orders",
  rowIndex: rowNumber,
  title: `주문번호: ${order["주문번호"]}`,
  onConfirm(detail) {
    console.log("삭제 확정:", detail);
    // 여기서 deleteRow API 호출
  }
});
window.addEventListener("korual:row-edit-save", (e) => {
  console.log("edit event:", e.detail);
});

window.addEventListener("korual:row-delete-confirm", (e) => {
  console.log("delete event:", e.detail);
});
