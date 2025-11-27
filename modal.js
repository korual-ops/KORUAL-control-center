/****************************************
 * KORUAL CONTROL CENTER – modal.js
 * - 행/셀 수정용 고급 팝업
 * - 다른 JS에서 korualEditModal.open(...) 으로 사용
****************************************/

(function () {
  let modal,
    backdrop,
    titleEl,
    columnInput,
    columnDatalist,
    valueInput,
    saveBtn,
    cancelBtn,
    closeBtn;

  // 현재 콜백과 컨텍스트 저장
  let currentOnSave = null;
  let currentContext = {
    key: null,
    rowIndex: null,
  };

  function domReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  domReady(() => {
    modal = document.getElementById("edit-modal");
    if (!modal) {
      console.warn("[KORUAL modal] #edit-modal 이 없습니다.");
      return;
    }

    backdrop = modal.querySelector(".modal-backdrop");
    titleEl = document.getElementById("edit-modal-title");
    columnInput = document.getElementById("edit-column");
    columnDatalist = document.getElementById("edit-column-list"); // 있으면 사용
    valueInput = document.getElementById("edit-value");
    saveBtn = document.getElementById("edit-save-btn");
    cancelBtn = document.getElementById("edit-cancel-btn");
    closeBtn = document.getElementById("edit-close-btn");

    // 닫기 처리
    function close() {
      if (!modal) return;
      modal.classList.remove("open");
      modal.classList.add("hidden");
      currentOnSave = null;
      currentContext = { key: null, rowIndex: null };
      if (columnInput) columnInput.value = "";
      if (valueInput) valueInput.value = "";
    }

    // 저장 버튼 클릭
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (!columnInput || !valueInput) return;

        const column = columnInput.value.trim();
        const value = valueInput.value;

        if (!column) {
          alert("컬럼명을 입력하세요.");
          columnInput.focus();
          return;
        }

        if (typeof currentOnSave === "function") {
          currentOnSave({
            key: currentContext.key,
            rowIndex: currentContext.rowIndex,
            column,
            value,
          });
        }

        close();
      });
    }

    // 취소 / X 버튼
    if (cancelBtn) cancelBtn.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);

    // 배경 클릭 시 닫기
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        // 안쪽 카드 클릭은 무시
        if (e.target === backdrop) {
          close();
        }
      });
    }

    // ESC 로 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && modal.classList.contains("open")) {
        close();
      }
    });

    // 전역으로 open / close 노출
    window.korualEditModal = {
      /**
       * 모달 열기
       * @param {Object} opts
       *   - key: ROUTES.key  (예: "hr", "sales")
       *   - rowIndex: 행 인덱스(0부터, 데이터 기준)
       *   - headers: 문자열 배열 (컬럼명 리스트, datalist 채우기용)
       *   - title: 모달 제목 (옵션)
       *   - defaultColumn: 기본 선택 컬럼명 (옵션)
       *   - defaultValue: 기본 값 (옵션)
       *   - onSave: (context) => {}  저장 콜백
       */
      open(opts) {
        if (!modal) return;

        const {
          key,
          rowIndex,
          headers = [],
          title = "셀 수정",
          defaultColumn = "",
          defaultValue = "",
          onSave,
        } = opts || {};

        currentContext.key = key || null;
        currentContext.rowIndex = typeof rowIndex === "number" ? rowIndex : null;
        currentOnSave = typeof onSave === "function" ? onSave : null;

        if (titleEl) {
          titleEl.textContent = title;
        }

        if (columnInput) {
          columnInput.value = defaultColumn || "";
        }
        if (valueInput) {
          valueInput.value = defaultValue || "";
        }

        // datalist 에 헤더 목록 채우기
        if (columnDatalist) {
          columnDatalist.innerHTML = "";
          headers.forEach((h) => {
            if (!h) return;
            const opt = document.createElement("option");
            opt.value = h;
            columnDatalist.appendChild(opt);
          });
        }

        modal.classList.remove("hidden");
        modal.classList.add("open");

        // 약간 딜레이 후 포커스 (애니메이션 고려)
        setTimeout(() => {
          if (columnInput) columnInput.focus();
        }, 50);
      },

      close() {
        if (!modal) return;
        modal.classList.remove("open");
        modal.classList.add("hidden");
      },
    };
  });
})();
