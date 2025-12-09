/*************************************************
 * KORUAL CONTROL CENTER – Ultra High-End app.js
 * - 로그인(index.html) + 대시보드(dashboard.html) 통합 프론트엔드
 * - Apps Script Backend (code.gs v5.0) 연동
 *
 * 1) 로그인 페이지
 *   - API ping 상태 표시
 *   - 테스트 계정 로그인 (KORUAL / GUEST)
 *   - 로컬 스토리지 세션 관리 (korual_user)
 *
 * 2) 대시보드 페이지
 *   - API ping 상태 표시
 *   - 대시보드 카드/오늘 요약/최근 주문 렌더링
 *   - 상품/주문/회원/재고/로그 리스트 + 검색 + 페이지네이션
 *************************************************/

(function () {
  "use strict";

  /*************************************************
   * 0) 공통 설정 / 유틸
   *************************************************/

  // 로그인 index.html에서 넣어둔 메타 or 대시보드용 기본값
  var META = (window.KORUAL_META_APP && window.KORUAL_META_APP.api)
    ? window.KORUAL_META_APP
    : {
        app: {
          id: "korual-control-center",
          name: "KORUAL CONTROL CENTER",
          version: "v1.0-local",
          env: "prod"
        },
        api: {
          // 로그인 index.html에 써둔 Apps Script URL과 동일하게 맞춰주세요.
          baseUrl:
            "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec",
          secret: "KORUAL-ONLY"
        }
      };

  var API_BASE = META.api.baseUrl;
  var API_SECRET = META.api.secret;

  // 페이지 타입 판별
  var isAuthPage = !!document.getElementById("btnLogin");
  var isDashboardPage = !!document.getElementById("section-dashboard");

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }
  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function formatNumber(n) {
    if (n == null || isNaN(n)) return "-";
    return Number(n).toLocaleString("ko-KR");
  }

  function formatCurrency(n) {
    if (n == null || isNaN(n)) return "-";
    return Number(n).toLocaleString("ko-KR") + "원";
  }

  function nowYmd() {
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }

  /*************************************************
   * 1) Toast 시스템
   *************************************************/
  var toastIdSeq = 1;
  function showToast(message, type, timeoutMs) {
    if (!timeoutMs) timeoutMs = 2600;
    var root = document.getElementById("toastRoot");
    if (!root) return;

    var id = "korual-toast-" + toastIdSeq++;
    var el = document.createElement("div");
    el.id = id;
    el.className = "toast " + (type === "error"
      ? "toast--error"
      : type === "success"
      ? "toast--success"
      : "toast--info");
    el.style.marginBottom = "8px";
    el.innerHTML = '<span style="font-size:14px;">' +
      (type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️") +
      "</span><div>" + message + "</div>";

    root.appendChild(el);

    setTimeout(function () {
      if (el && el.parentNode) {
        el.style.opacity = "0";
        el.style.transform = "translateY(4px)";
        setTimeout(function () {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }, 200);
      }
    }, timeoutMs);
  }

  /*************************************************
   * 2) Theme (다크/라이트)
   *************************************************/
  function applyStoredTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem("korual_theme");
    } catch (e) {}
    var html = document.documentElement;

    if (stored === "light") {
      html.classList.remove("dark");
    } else {
      // 기본은 dark
      html.classList.add("dark");
    }
  }

  function toggleTheme() {
    var html = document.documentElement;
    var isDark = html.classList.contains("dark");
    if (isDark) {
      html.classList.remove("dark");
      try {
        localStorage.setItem("korual_theme", "light");
      } catch (e) {}
    } else {
      html.classList.add("dark");
      try {
        localStorage.setItem("korual_theme", "dark");
      } catch (e) {}
    }
  }

  function initThemeToggles() {
    applyStoredTheme();

    var authToggle = document.getElementById("toggleTheme");
    if (authToggle) {
      authToggle.addEventListener("click", function () {
        toggleTheme();
      });
    }

    var dashToggle = document.getElementById("themeToggle");
    if (dashToggle) {
      dashToggle.addEventListener("click", function () {
        toggleTheme();
      });
    }
  }

  /*************************************************
   * 3) API 래퍼
   *************************************************/
  function buildQuery(params) {
    if (!params) return "";
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] != null && params[k] !== ""; })
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");
    return qs ? "?" + qs : "";
  }

  function apiGet(target, params) {
    params = params || {};
    params.target = target;
    var url = API_BASE + buildQuery(params);

    var started = performance.now();
    return fetch(url, { method: "GET" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        data._elapsedMs = performance.now() - started;
        return data;
      });
  }

  function apiPost(target, payload) {
    payload = payload || {};
    payload.target = target;
    payload.secret = API_SECRET;

    var started = performance.now();
    return fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        data._elapsedMs = performance.now() - started;
        return data;
      });
  }

  /*************************************************
   * 4) 글로벌 스피너
   *************************************************/
  var spinnerCount = 0;
  function showSpinner() {
    spinnerCount++;
    var el = document.getElementById("globalSpinner");
    if (el) el.classList.remove("hidden");
  }
  function hideSpinner() {
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount === 0) {
      var el = document.getElementById("globalSpinner");
      if (el) el.classList.add("hidden");
    }
  }

  /*************************************************
   * 5) API 상태 표시 (Auth + Dashboard 공통)
   *************************************************/
  function updateApiStatusPending() {
    var dot = document.getElementById("apiStatusDot");
    var text = document.getElementById("apiStatusText");
    if (dot) {
      dot.style.background = "#fbbf24";
      dot.style.boxShadow = "0 0 0 5px rgba(251,191,36,0.35)";
    }
    if (text) {
      text.textContent = "API 체크 중…";
    }
  }

  function updateApiStatusOk(ms) {
    var dot = document.getElementById("apiStatusDot");
    var text = document.getElementById("apiStatusText");
    if (dot) {
      dot.style.background = "#22c55e";
      dot.style.boxShadow = "0 0 0 5px rgba(34,197,94,0.35)";
    }
    if (text) {
      text.textContent = "정상 (" + Math.round(ms) + " ms)";
    }
    var pingEl = document.getElementById("apiPing");
    if (pingEl) pingEl.textContent = Math.round(ms) + " ms";
  }

  function updateApiStatusError(msg) {
    var dot = document.getElementById("apiStatusDot");
    var text = document.getElementById("apiStatusText");
    if (dot) {
      dot.style.background = "#f97373";
      dot.style.boxShadow = "0 0 0 5px rgba(248,113,113,0.35)";
    }
    if (text) {
      text.textContent = msg || "오류";
    }
  }

  function pingApi() {
    updateApiStatusPending();
    return apiGet("ping")
      .then(function (data) {
        if (!data || data.ok !== true) {
          updateApiStatusError("응답 오류");
          return;
        }
        updateApiStatusOk(data._elapsedMs || 0);
      })
      .catch(function () {
        updateApiStatusError("연결 실패");
      });
  }

  /*************************************************
   * 6) 로그인 페이지 초기화
   *************************************************/
  function initAuthPage() {
    // Footer 연도
    var yearEl = document.getElementById("year");
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    pingApi(); // 상단 API 상태

    // 언어 셀렉트 동기화 (간단 버전)
    var langTop = document.getElementById("langTop");
    var langAuth = document.getElementById("langAuth");
    function syncLang(sel, other) {
      if (!sel || !other) return;
      sel.addEventListener("change", function () {
        other.value = sel.value;
        try {
          localStorage.setItem("korual_lang", sel.value);
        } catch (e) {}
      });
    }
    syncLang(langTop, langAuth);
    syncLang(langAuth, langTop);

    // 저장된 언어/아이디 불러오기
    try {
      var savedLang = localStorage.getItem("korual_lang");
      if (savedLang && langTop && langAuth) {
        langTop.value = savedLang;
        langAuth.value = savedLang;
      }
    } catch (e) {}

    var loginUsername = document.getElementById("loginUsername");
    var loginPassword = document.getElementById("loginPassword");
    var rememberId = document.getElementById("rememberId");
    var loginMsg = document.getElementById("loginMsg");
    var btnLogin = document.getElementById("btnLogin");
    var capsIndicator = document.getElementById("capsIndicator");
    var togglePwd = document.getElementById("togglePwd");
    var btnFillDemo = document.getElementById("btnFillDemo");
    var btnFillDemoMobile = document.getElementById("btnFillDemoMobile");

    // 저장된 ID
    try {
      var savedId = localStorage.getItem("korual_saved_id");
      if (savedId && loginUsername && rememberId) {
        loginUsername.value = savedId;
        rememberId.checked = true;
      }
    } catch (e) {}

    // 데모 자동 채우기
    function fillDemo() {
      if (loginUsername) loginUsername.value = "KORUAL";
      if (loginPassword) loginPassword.value = "GUEST";
    }
    if (btnFillDemo) {
      btnFillDemo.addEventListener("click", function () {
        fillDemo();
        showToast("테스트 계정을 자동으로 입력했습니다.", "info");
      });
    }
    if (btnFillDemoMobile) {
      btnFillDemoMobile.addEventListener("click", function () {
        fillDemo();
        showToast("테스트 계정을 자동으로 입력했습니다.", "info");
      });
    }

    // Caps Lock 감지
    function handleCaps(e) {
      if (!capsIndicator) return;
      var capsOn = e.getModifierState && e.getModifierState("CapsLock");
      if (capsOn) {
        capsIndicator.classList.remove("hidden");
      } else {
        capsIndicator.classList.add("hidden");
      }
    }
    if (loginPassword) {
      loginPassword.addEventListener("keydown", handleCaps);
      loginPassword.addEventListener("keyup", handleCaps);
    }

    // 비밀번호 보기 토글
    if (togglePwd && loginPassword) {
      togglePwd.addEventListener("click", function () {
        var type = loginPassword.getAttribute("type");
        if (type === "password") {
          loginPassword.setAttribute("type", "text");
          togglePwd.textContent = "🙈 비밀번호 숨기기";
        } else {
          loginPassword.setAttribute("type", "password");
          togglePwd.textContent = "👁 비밀번호 보기";
        }
      });
    }

    // 로그인 함수
    var isLoggingIn = false;
    function doLogin() {
      if (!loginUsername || !loginPassword || !btnLogin) return;
      if (isLoggingIn) return;

      var id = (loginUsername.value || "").trim();
      var pw = (loginPassword.value || "").trim();

      if (!id || !pw) {
        loginMsg.textContent = "아이디와 비밀번호를 모두 입력해주세요.";
        loginPassword.classList.add("input-error");
        return;
      }

      // 테스트 버전: 고정 계정
      if (id !== "KORUAL" || pw !== "GUEST") {
        loginMsg.textContent =
          "현재 데모 환경에서는 ID: KORUAL / PW: GUEST 계정만 사용 가능합니다.";
        loginPassword.classList.add("input-error");
        showToast("테스트 계정 정보(KORUAL / GUEST)를 사용해주세요.", "error");
        return;
      }

      loginMsg.textContent = "";
      loginPassword.classList.remove("input-error");
      isLoggingIn = true;
      btnLogin.disabled = true;
      btnLogin.textContent = "로그인 중…";

      setTimeout(function () {
        // 세션 저장
        var user = {
          username: id,
          loggedInAt: new Date().toISOString(),
          app: META.app
        };
        try {
          localStorage.setItem("korual_user", JSON.stringify(user));
          if (rememberId && rememberId.checked) {
            localStorage.setItem("korual_saved_id", id);
          } else {
            localStorage.removeItem("korual_saved_id");
          }
        } catch (e) {}

        showToast("KORUAL CONTROL CENTER에 로그인되었습니다.", "success", 1800);

        // 대시보드로 이동
        window.location.href = "dashboard.html";
      }, 600);
    }

    if (btnLogin) {
      btnLogin.addEventListener("click", function () {
        doLogin();
      });
    }

    // 엔터키로 로그인
    [loginUsername, loginPassword].forEach(function (input) {
      if (!input) return;
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doLogin();
        }
      });
    });

    // 아이디 찾기 / 비번 재설정 모달 (Stub)
    var linkFindId = document.getElementById("linkFindId");
    var modalFindId = document.getElementById("modalFindId");
    var closeFind = document.getElementById("closeFind");
    var btnFindIdSubmit = document.getElementById("btnFindIdSubmit");
    var fiResult = document.getElementById("fiResult");

    function openModal(el) {
      if (el) el.classList.remove("hidden");
    }
    function closeModal(el) {
      if (el) el.classList.add("hidden");
    }

    if (linkFindId && modalFindId) {
      linkFindId.addEventListener("click", function () {
        openModal(modalFindId);
      });
    }
    if (closeFind && modalFindId) {
      closeFind.addEventListener("click", function () {
        closeModal(modalFindId);
      });
    }
    if (btnFindIdSubmit && fiResult) {
      btnFindIdSubmit.addEventListener("click", function () {
        fiResult.textContent =
          "현재 데모 환경에서는 고정 계정(KORUAL)만 사용합니다.";
      });
    }

    var linkResetPw = document.getElementById("linkResetPw");
    var modalResetPw = document.getElementById("modalResetPw");
    var closeReset = document.getElementById("closeReset");
    var btnResetPwSubmit = document.getElementById("btnResetPwSubmit");
    var rpMsg = document.getElementById("rpMsg");

    if (linkResetPw && modalResetPw) {
      linkResetPw.addEventListener("click", function () {
        openModal(modalResetPw);
      });
    }
    if (closeReset && modalResetPw) {
      closeReset.addEventListener("click", function () {
        closeModal(modalResetPw);
      });
    }
    if (btnResetPwSubmit && rpMsg) {
      btnResetPwSubmit.addEventListener("click", function () {
        rpMsg.textContent =
          "데모 환경에서는 비밀번호 재설정 없이 KORUAL / GUEST 계정을 그대로 사용합니다.";
      });
    }
  }

  /*************************************************
   * 7) 대시보드 – 데이터 상태
   *************************************************/
  var listState = {
    products: { page: 1, size: 50, q: "", total: 0, pageCount: 1 },
    orders: { page: 1, size: 50, q: "", total: 0, pageCount: 1 },
    members: { page: 1, size: 50, q: "", total: 0, pageCount: 1 },
    stock: { page: 1, size: 50, q: "", total: 0, pageCount: 1 },
    logs: { page: 1, size: 50, q: "", total: 0, pageCount: 1 }
  };

  function setLastSync() {
    var el = document.getElementById("last-sync");
    if (!el) return;
    var d = new Date();
    var timeStr =
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0") +
      ":" +
      d.getSeconds().toString().padStart(2, "0");
    el.textContent = "마지막 동기화: " + nowYmd() + " " + timeStr;
  }

  /*************************************************
   * 8) 대시보드 – 카드 / 오늘 요약
   *************************************************/
  function loadDashboardSummary() {
    var cardTotalProducts = document.getElementById("cardTotalProducts");
    var cardTotalOrders = document.getElementById("cardTotalOrders");
    var cardTotalRevenue = document.getElementById("cardTotalRevenue");
    var cardTotalMembers = document.getElementById("cardTotalMembers");
    var todayOrders = document.getElementById("todayOrders");
    var todayRevenue = document.getElementById("todayRevenue");
    var todayPending = document.getElementById("todayPending");
    var todayDateLabel = document.getElementById("todayDateLabel");
    var recentOrdersBody = document.getElementById("recentOrdersBody");

    if (todayDateLabel) {
      todayDateLabel.textContent = nowYmd();
    }

    showSpinner();
    return apiGet("dashboard")
      .then(function (data) {
        if (!data || data.ok !== true) {
          showToast("대시보드 데이터를 불러오지 못했습니다.", "error");
          return;
        }

        if (cardTotalProducts) cardTotalProducts.textContent = formatNumber(data.totalProducts);
        if (cardTotalOrders) cardTotalOrders.textContent = formatNumber(data.totalOrders);
        if (cardTotalRevenue) cardTotalRevenue.textContent = formatCurrency(data.totalRevenue);
        if (cardTotalMembers) cardTotalMembers.textContent = formatNumber(data.totalMembers);

        if (todayOrders) todayOrders.textContent = formatNumber(data.todayOrders);
        if (todayRevenue) todayRevenue.textContent = formatCurrency(data.todayRevenue);
        if (todayPending) todayPending.textContent = formatNumber(data.todayPending);

        if (recentOrdersBody) {
          var items = data.recentOrders || [];
          if (!items.length) {
            recentOrdersBody.innerHTML =
              '<tr><td colspan="7" class="empty-state">최근 주문이 없습니다.</td></tr>';
          } else {
            var rowsHtml = items
              .map(function (o) {
                return (
                  "<tr>" +
                  "<td>" + (o.order_date || "") + "</td>" +
                  "<td>" + (o.order_no || "") + "</td>" +
                  "<td>" + (o.item_name || "") + "</td>" +
                  "<td>" + formatNumber(o.qty) + "</td>" +
                  "<td>" + formatCurrency(o.amount) + "</td>" +
                  "<td>" + (o.channel || "") + "</td>" +
                  "<td>" + (o.status || "") + "</td>" +
                  "</tr>"
                );
              })
              .join("");
            recentOrdersBody.innerHTML = rowsHtml;
          }
        }
      })
      .catch(function () {
        showToast("대시보드 데이터를 불러오는 중 오류가 발생했습니다.", "error");
      })
      .finally(function () {
        hideSpinner();
      });
  }

  /*************************************************
   * 9) 공통 리스트 로더 (products/orders/members/stock/logs)
   *************************************************/

  function loadList(entity) {
    var state = listState[entity];
    if (!state) return;

    var tbodyId = entity + "Body";
    var pagerId = entity + "Pager";
    var sheetTarget =
      entity === "products"
        ? "products"
        : entity === "orders"
        ? "orders"
        : entity === "members"
        ? "members"
        : entity === "stock"
        ? "stock"
        : "logs";

    var tbody = document.getElementById(tbodyId);
    var pager = document.getElementById(pagerId);

    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="12" class="empty-state">데이터를 불러오는 중입니다…</td></tr>';
    }

    var page = state.page || 1;
    var size = state.size || 50;

    return apiGet(sheetTarget, {
      q: state.q || "",
      page: page,
      size: size
    })
      .then(function (data) {
        if (!data || data.ok !== true) {
          showToast("데이터를 불러오지 못했습니다. (" + entity + ")", "error");
          return;
        }
        var rows = data.rows || [];
        var meta = data.meta || {};
        state.total = meta.total || rows.length;
        state.pageCount = meta.pageCount || 1;
        state.page = meta.page || 1;
        state.size = meta.pageSize || size;

        if (!tbody) return;
        if (!rows.length) {
          tbody.innerHTML =
            '<tr><td colspan="12" class="empty-state">데이터가 없습니다.</td></tr>';
          updatePager(entity);
          return;
        }

        var html = "";
        if (entity === "products") {
          html = rows
            .map(function (r) {
              return (
                "<tr>" +
                "<td>" + (r["상품코드"] || "") + "</td>" +
                "<td>" + (r["상품명"] || "") + "</td>" +
                "<td>" + (r["옵션"] || "") + "</td>" +
                "<td>" + formatCurrency(r["판매가"]) + "</td>" +
                "<td>" + formatNumber(r["재고"]) + "</td>" +
                "<td>" + (r["채널"] || "") + "</td>" +
                "</tr>"
              );
            })
            .join("");
        } else if (entity === "orders") {
          html = rows
            .map(function (r) {
              return (
                "<tr>" +
                "<td>" + (r["회원번호"] || "") + "</td>" +
                "<td>" + (r["날짜"] || r["주문일자"] || "") + "</td>" +
                "<td>" + (r["주문번호"] || "") + "</td>" +
                "<td>" + (r["고객명"] || "") + "</td>" +
                "<td>" + (r["상품명"] || "") + "</td>" +
                "<td>" + formatNumber(r["수량"]) + "</td>" +
                "<td>" + formatCurrency(r["금액"]) + "</td>" +
                "<td>" + (r["상태"] || "") + "</td>" +
                "<td>" + (r["채널"] || "") + "</td>" +
                "</tr>"
              );
            })
            .join("");
        } else if (entity === "members") {
          html = rows
            .map(function (r) {
              return (
                "<tr>" +
                "<td>" + (r["회원번호"] || "") + "</td>" +
                "<td>" + (r["이름"] || "") + "</td>" +
                "<td>" + (r["전화번호"] || "") + "</td>" +
                "<td>" + (r["이메일"] || "") + "</td>" +
                "<td>" + (r["가입일"] || "") + "</td>" +
                "<td>" + (r["채널"] || "") + "</td>" +
                "<td>" + (r["등급"] || "") + "</td>" +
                "<td>" + formatCurrency(r["누적매출"]) + "</td>" +
                "<td>" + formatNumber(r["포인트"]) + "</td>" +
                "<td>" + (r["최근주문일"] || "") + "</td>" +
                "<td>" + (r["메모"] || "") + "</td>" +
                "<td>-</td>" + // 추후 편집/삭제 버튼 자리
                "</tr>"
              );
            })
            .join("");
        } else if (entity === "stock") {
          html = rows
            .map(function (r) {
              return (
                "<tr>" +
                "<td>" + (r["상품코드"] || "") + "</td>" +
                "<td>" + (r["상품명"] || "") + "</td>" +
                "<td>" + formatNumber(r["현재재고"] || r["현재 재고"]) + "</td>" +
                "<td>" + formatNumber(r["안전재고"] || r["안전 재고"]) + "</td>" +
                "<td>" + (r["상태"] || "") + "</td>" +
                "<td>" + (r["창고"] || "") + "</td>" +
                "<td>" + (r["채널"] || "") + "</td>" +
                "<td>-</td>" +
                "</tr>"
              );
            })
            .join("");
        } else if (entity === "logs") {
          html = rows
            .map(function (r) {
              return (
                "<tr>" +
                "<td>" + (r["시간"] || "") + "</td>" +
                "<td>" + (r["타입"] || "") + "</td>" +
                "<td>" + (r["메시지"] || "") + "</td>" +
                "<td>" + (r["상세"] || "") + "</td>" +
                "</tr>"
              );
            })
            .join("");
        }

        tbody.innerHTML = html;
        updatePager(entity);
      })
      .catch(function () {
        showToast("데이터를 불러오는 중 오류가 발생했습니다. (" + entity + ")", "error");
      });
  }

  function updatePager(entity) {
    var state = listState[entity];
    if (!state) return;
    var pager = document.getElementById(entity + "Pager");
    if (!pager) return;

    var label = pager.querySelector("[data-page-label]");
    var btnPrev = pager.querySelector('[data-page="prev"]');
    var btnNext = pager.querySelector('[data-page="next"]');

    if (label) {
      label.textContent =
        (state.page || 1) + " / " + (state.pageCount || 1) + " (총 " + state.total + "행)";
    }
    if (btnPrev) {
      btnPrev.disabled = state.page <= 1;
    }
    if (btnNext) {
      btnNext.disabled = state.page >= state.pageCount;
    }
  }

  function initPagerControls(entity) {
    var pager = document.getElementById(entity + "Pager");
    if (!pager) return;

    pager.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var dir = btn.getAttribute("data-page");
      if (!dir) return;

      var state = listState[entity];
      if (!state) return;

      if (dir === "prev" && state.page > 1) {
        state.page -= 1;
        loadList(entity);
      } else if (dir === "next" && state.page < state.pageCount) {
        state.page += 1;
        loadList(entity);
      }
    });
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay || 300);
    };
  }

  function initSearchInput(entity, inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener(
      "input",
      debounce(function () {
        var val = input.value || "";
        listState[entity].q = val.trim();
        listState[entity].page = 1;
        loadList(entity);
      }, 400)
    );
  }

  /*************************************************
   * 10) 대시보드 페이지 초기화
   *************************************************/
  function initDashboardPage() {
    // 로그인 세션 복구
    var user = null;
    try {
      var raw = localStorage.getItem("korual_user");
      if (raw) user = JSON.parse(raw);
    } catch (e) {}
    var welcomeUser = document.getElementById("welcomeUser");
    if (welcomeUser) {
      welcomeUser.textContent = (user && user.username) || "KORUAL";
    }

    pingApi();
    setLastSync();

    // 사이드바 내비게이션
    var navLinks = $all(".nav-link");
    navLinks.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-section");
        if (!target) return;

        navLinks.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");

        // 섹션 전환
        var id = "section-" + target;
        $all(".section").forEach(function (sec) {
          if (sec.id === id) {
            sec.classList.add("active");
          } else {
            sec.classList.remove("active");
          }
        });
      });
    });

    // 모바일 메뉴
    var menuToggle = document.getElementById("menuToggle");
    var sidebarBackdrop = document.getElementById("sidebarBackdrop");
    var body = document.body;
    if (menuToggle && sidebarBackdrop) {
      function closeSidebar() {
        body.classList.remove("sidebar-open");
      }
      function toggleSidebar() {
        body.classList.toggle("sidebar-open");
      }

      menuToggle.addEventListener("click", toggleSidebar);
      sidebarBackdrop.addEventListener("click", closeSidebar);
    }

    // 버튼들
    var btnRefreshAll = document.getElementById("btnRefreshAll");
    if (btnRefreshAll) {
      btnRefreshAll.addEventListener("click", function () {
        showSpinner();
        Promise.all([
          loadDashboardSummary(),
          loadList("products"),
          loadList("orders"),
          loadList("members"),
          loadList("stock"),
          loadList("logs")
        ])
          .then(function () {
            setLastSync();
            showToast("전체 데이터를 새로고침했습니다.", "success");
          })
          .finally(function () {
            hideSpinner();
          });
      });
    }

    var btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        try {
          localStorage.removeItem("korual_user");
        } catch (e) {}
        showToast("로그아웃 되었습니다.", "info", 1200);
        setTimeout(function () {
          window.location.href = "index.html";
        }, 900);
      });
    }

    // "→ 주문 관리 바로가기"
    var goOrders = document.getElementById("goOrders");
    if (goOrders) {
      goOrders.addEventListener("click", function () {
        // 사이드바의 "주문 관리" 버튼 클릭과 동일하게 동작
        var btn = document.querySelector('.nav-link[data-section="orders"]');
        if (btn) btn.click();
      });
    }

    // 페이저/검색 초기화
    initPagerControls("products");
    initPagerControls("orders");
    initPagerControls("members");
    initPagerControls("stock");
    initPagerControls("logs");

    initSearchInput("products", "searchProducts");
    initSearchInput("orders", "searchOrders");
    initSearchInput("members", "searchMembers");
    initSearchInput("stock", "searchStock");
    initSearchInput("logs", "searchLogs");

    // 초기 로딩
    showSpinner();
    Promise.all([
      loadDashboardSummary(),
      loadList("products"),
      loadList("orders"),
      loadList("members"),
      loadList("stock"),
      loadList("logs")
    ])
      .then(function () {
        setLastSync();
      })
      .finally(function () {
        hideSpinner();
      });

    // 모달 저장/삭제 버튼은 추후에 Apps Script POST(updateCell/deleteRow)로 확장 예정
    var rowEditSave = document.getElementById("rowEditSave");
    if (rowEditSave) {
      rowEditSave.addEventListener("click", function () {
        showToast("편집 저장 기능은 추후 Apps Script와 연동 예정입니다.", "info");
      });
    }
    var rowDeleteConfirm = document.getElementById("rowDeleteConfirm");
    if (rowDeleteConfirm) {
      rowDeleteConfirm.addEventListener("click", function () {
        showToast("삭제 기능은 추후 Apps Script와 연동 예정입니다.", "info");
      });
    }
  }

  /*************************************************
   * 11) Entry
   *************************************************/
  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggles();

    if (isAuthPage) {
      initAuthPage();
    }
    if (isDashboardPage) {
      initDashboardPage();
    }
  });
})();
