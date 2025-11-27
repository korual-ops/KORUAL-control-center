/****************************************
 * KORUAL CONTROL CENTER – filters.js v1.0
 * - 날짜 필터 (from, to)
 * - 채널 필터 (select)
 * - 검색 필터 (q)
 * - 페이지 크기 필터 (pageSize)
 *
 * 필요 전역:
 *  - window.currentKey
 *  - window.currentParams
 *  - loadSectionInternal(key, params)
 ****************************************/

(function () {
  /** 필터 초기 상태 */
  window.filterState = {
    from: "",
    to: "",
    channel: "",
    q: "",
    pageSize: 200,
  };

  /** 필터 UI를 테이블 위에 자동 생성 */
  function renderFilterBar() {
    const container = document.getElementById("filter-bar");
    if (!container) return;

    container.innerHTML = `
      <div class="filter-row">
        <div class="filter-item">
          <label>From</label>
          <input type="date" id="filter-from" value="${filterState.from}">
        </div>

        <div class="filter-item">
          <label>To</label>
          <input type="date" id="filter-to" value="${filterState.to}">
        </div>

        <div class="filter-item">
          <label>채널</label>
          <select id="filter-channel">
            <option value="">전체</option>
            <option value="네이버">네이버</option>
            <option value="스마트스토어">스마트스토어</option>
            <option value="쿠팡">쿠팡</option>
            <option value="쇼피">쇼피</option>
            <option value="자사몰">자사몰</option>
          </select>
        </div>

        <div class="filter-item">
          <label>검색</label>
          <input type="text" id="filter-q" placeholder="검색어…" value="${filterState.q}">
        </div>

        <div class="filter-item">
          <label>Page Size</label>
          <select id="filter-pagesize">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200" selected>200</option>
            <option value="500">500</option>
          </select>
        </div>

        <button class="korual-btn" id="filter-apply-btn">적용</button>
        <button class="korual-btn ghost" id="filter-reset-btn">초기화</button>
      </div>
    `;

    // 채널 초기값 적용
    document.getElementById("filter-channel").value = filterState.channel;
    document.getElementById("filter-pagesize").value = filterState.pageSize;

    // 클릭 등록
    document.getElementById("filter-apply-btn").onclick = applyFilters;
    document.getElementById("filter-reset-btn").onclick = resetFilters;
  }

  /** 필터 적용 */
  async function applyFilters() {
    // UI에서 읽기
    filterState.from = document.getElementById("filter-from").value;
    filterState.to = document.getElementById("filter-to").value;
    filterState.channel = document.getElementById("filter-channel").value;
    filterState.q = document.getElementById("filter-q").value.trim();
    filterState.pageSize = Number(document.getElementById("filter-pagesize").value);

    // 전역 params 저장 → 페이지 이동에도 유지됨
    window.currentParams = {
      from: filterState.from,
      to: filterState.to,
      channel: filterState.channel,
      q: filterState.q,
      pageSize: filterState.pageSize,
    };

    if (window.currentKey) {
      await loadSectionInternal(window.currentKey, window.currentParams);
    }
  }

  /** 필터 초기화 */
  async function resetFilters() {
    filterState = {
      from: "",
      to: "",
      channel: "",
      q: "",
      pageSize: 200,
    };

    window.currentParams = {};

    if (window.currentKey) {
      await loadSectionInternal(window.currentKey, {});
    }
  }

  /** 테이블 렌더 직전에 자동으로 호출되도록 hook 제공 */
  window.renderFilterBar = renderFilterBar;
})();
