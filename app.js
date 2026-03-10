// app.js
(() => {
  "use strict";

  const APP_NAME = "KORUAL Space";

  const state = {
    spaces: [],
    filteredSpaces: [],
    favorites: loadJSON("korual_favorites", []),
    bookings: loadJSON("korual_bookings", []),
    filters: {
      keyword: "",
      city: "all",
      category: "all",
      sort: "recommended",
    },
    selectedSpace: null,
    adminVpnAuthenticated: localStorage.getItem("korual_admin_vpn") === "true",
    adminRole: localStorage.getItem("korual_admin_role") || "guest",
  };

  const demoSpaces = [
    {
      id: "space-001",
      name: "KORUAL Seongsu Loft",
      city: "서울",
      district: "성수",
      category: "촬영",
      pricePerHour: 120000,
      capacity: 8,
      rating: 4.9,
      reviewCount: 128,
      host: {
        name: "Seongsu Host",
        trustScore: 96,
        grade: "Premium Host",
      },
      tags: ["자연광", "웨딩촬영", "룩북", "화이트톤"],
      equipment: ["조명", "삼각대", "전신거울"],
      style: "Luxury Minimal",
      description:
        "자연광이 강하게 들어오는 성수 촬영 스튜디오. 웨딩 스냅, 쇼핑몰 룩북, 인터뷰 촬영에 적합합니다.",
      thumbnail:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      bookedSlots: ["2026-03-12 14:00", "2026-03-13 11:00"],
    },
    {
      id: "space-002",
      name: "KORUAL Incheon Panorama Suite",
      city: "인천",
      district: "송도",
      category: "웨딩",
      pricePerHour: 180000,
      capacity: 12,
      rating: 4.8,
      reviewCount: 89,
      host: {
        name: "Panorama Host",
        trustScore: 93,
        grade: "Gold Host",
      },
      tags: ["파노라마뷰", "웨딩촬영", "럭셔리", "야경"],
      equipment: ["조명", "드레스랙", "스팀다리미"],
      style: "Hotel Modern Luxury",
      description:
        "통창 파노라마 뷰와 호텔식 무드가 특징인 프리미엄 공간. 셀프웨딩, 프로포즈 촬영, 브랜드 화보에 적합합니다.",
      thumbnail:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      bookedSlots: ["2026-03-11 18:00", "2026-03-15 13:00"],
    },
    {
      id: "space-003",
      name: "KORUAL Busan Ocean Room",
      city: "부산",
      district: "해운대",
      category: "파티",
      pricePerHour: 150000,
      capacity: 15,
      rating: 4.7,
      reviewCount: 64,
      host: {
        name: "Ocean Host",
        trustScore: 90,
        grade: "Gold Host",
      },
      tags: ["오션뷰", "브라이덜샤워", "파티룸", "루프탑"],
      equipment: ["블루투스 스피커", "무드조명", "프로젝터"],
      style: "Ocean Luxury",
      description:
        "해운대 오션뷰 기반 파티룸. 브라이덜샤워, 생일파티, 감성 영상 촬영에 적합합니다.",
      thumbnail:
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      bookedSlots: [],
    },
    {
      id: "space-004",
      name: "KORUAL Studio White Marble",
      city: "서울",
      district: "강남",
      category: "촬영",
      pricePerHour: 135000,
      capacity: 6,
      rating: 5.0,
      reviewCount: 42,
      host: {
        name: "Marble Host",
        trustScore: 98,
        grade: "Premium Host",
      },
      tags: ["화이트마블", "제품촬영", "광고촬영", "하이엔드"],
      equipment: ["테이블", "조명", "반사판", "배경지"],
      style: "Marble Premium",
      description:
        "화이트 마블 중심의 하이엔드 제품 촬영 스튜디오. 화장품, PB 브랜드, 프리미엄 굿즈 촬영에 최적화되어 있습니다.",
      thumbnail:
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      bookedSlots: ["2026-03-14 10:00"],
    },
  ];

  const el = {
    appTitle: document.querySelector("[data-app-title]"),
    spaceGrid: document.querySelector("[data-space-grid]"),
    resultCount: document.querySelector("[data-result-count]"),
    keywordInput: document.querySelector("[data-filter='keyword']"),
    citySelect: document.querySelector("[data-filter='city']"),
    categorySelect: document.querySelector("[data-filter='category']"),
    sortSelect: document.querySelector("[data-filter='sort']"),
    resetButton: document.querySelector("[data-action='reset-filters']"),
    modal: document.querySelector("[data-space-modal]"),
    modalBody: document.querySelector("[data-space-modal-body]"),
    modalClose: document.querySelector("[data-action='close-modal']"),
    bookingForm: document.querySelector("[data-booking-form]"),
    toast: document.querySelector("[data-toast]"),
    adminEntry: document.querySelector("[data-admin-entry]"),
    adminStatus: document.querySelector("[data-admin-status]"),
    favoritesCount: document.querySelector("[data-favorites-count]"),
    bookingsCount: document.querySelector("[data-bookings-count]"),
  };

  init();

  function init() {
    state.spaces = demoSpaces.map(enrichSpace);
    syncCounters();
    setupStaticUI();
    bindEvents();
    applyFilters();
    renderAdminState();
  }

  function setupStaticUI() {
    if (el.appTitle) {
      el.appTitle.textContent = APP_NAME;
    }
  }

  function bindEvents() {
    el.keywordInput?.addEventListener("input", (e) => {
      state.filters.keyword = e.target.value.trim();
      applyFilters();
    });

    el.citySelect?.addEventListener("change", (e) => {
      state.filters.city = e.target.value;
      applyFilters();
    });

    el.categorySelect?.addEventListener("change", (e) => {
      state.filters.category = e.target.value;
      applyFilters();
    });

    el.sortSelect?.addEventListener("change", (e) => {
      state.filters.sort = e.target.value;
      applyFilters();
    });

    el.resetButton?.addEventListener("click", resetFilters);

    el.spaceGrid?.addEventListener("click", onGridClick);

    el.modalClose?.addEventListener("click", closeModal);
    el.modal?.addEventListener("click", (e) => {
      if (e.target === el.modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    el.bookingForm?.addEventListener("submit", onBookingSubmit);

    el.adminEntry?.addEventListener("click", onAdminEntryClick);
  }

  function enrichSpace(space) {
    return {
      ...space,
      recommendationScore: calcRecommendationScore(space),
      verifiedReviewRate: calcVerifiedReviewRate(space),
    };
  }

  function calcRecommendationScore(space) {
    let score = 0;
    score += space.rating * 20;
    score += Math.min(space.reviewCount, 100) * 0.3;
    score += space.host.trustScore * 0.4;
    if (space.category === "웨딩") score += 8;
    if (space.tags.includes("자연광")) score += 5;
    return Math.round(score);
  }

  function calcVerifiedReviewRate(space) {
    const rate = 92 + Math.min(7, Math.floor(space.reviewCount / 20));
    return Math.min(rate, 99);
  }

  function applyFilters() {
    let list = [...state.spaces];

    if (state.filters.keyword) {
      const keyword = state.filters.keyword.toLowerCase();
      list = list.filter((space) => {
        return [
          space.name,
          space.city,
          space.district,
          space.category,
          space.style,
          space.description,
          ...(space.tags || []),
          ...(space.equipment || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      });
    }

    if (state.filters.city !== "all") {
      list = list.filter((space) => space.city === state.filters.city);
    }

    if (state.filters.category !== "all") {
      list = list.filter((space) => space.category === state.filters.category);
    }

    list.sort(sorter(state.filters.sort));

    state.filteredSpaces = list;
    renderSpaces();
    updateResultCount();
  }

  function sorter(type) {
    switch (type) {
      case "price-low":
        return (a, b) => a.pricePerHour - b.pricePerHour;
      case "price-high":
        return (a, b) => b.pricePerHour - a.pricePerHour;
      case "rating":
        return (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount;
      case "reviews":
        return (a, b) => b.reviewCount - a.reviewCount;
      case "recommended":
      default:
        return (a, b) => b.recommendationScore - a.recommendationScore;
    }
  }

  function renderSpaces() {
    if (!el.spaceGrid) return;

    if (!state.filteredSpaces.length) {
      el.spaceGrid.innerHTML = `
        <div class="empty-state">
          <h3>조건에 맞는 공간이 없습니다</h3>
          <p>검색어 또는 필터를 변경해 주세요.</p>
        </div>
      `;
      return;
    }

    el.spaceGrid.innerHTML = state.filteredSpaces
      .map((space) => {
        const isFavorite = state.favorites.includes(space.id);
        return `
          <article class="space-card" data-space-id="${space.id}">
            <div class="space-card__thumb-wrap">
              <img class="space-card__thumb" src="${escapeHtml(space.thumbnail)}" alt="${escapeHtml(space.name)}">
              <button class="favorite-btn ${isFavorite ? "is-active" : ""}" data-action="toggle-favorite" data-space-id="${space.id}" aria-label="찜하기">
                ${isFavorite ? "♥" : "♡"}
              </button>
              <span class="space-badge">${escapeHtml(space.category)}</span>
            </div>

            <div class="space-card__body">
              <div class="space-card__top">
                <h3 class="space-card__title">${escapeHtml(space.name)}</h3>
                <span class="space-card__rating">⭐ ${space.rating.toFixed(1)}</span>
              </div>

              <p class="space-card__meta">${escapeHtml(space.city)} · ${escapeHtml(space.district)} · 최대 ${space.capacity}명</p>
              <p class="space-card__style">${escapeHtml(space.style)}</p>

              <div class="space-card__tags">
                ${space.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
              </div>

              <div class="space-card__host">
                <span>${escapeHtml(space.host.grade)}</span>
                <span>신뢰도 ${space.host.trustScore}</span>
                <span>실결제 리뷰 ${space.verifiedReviewRate}%</span>
              </div>

              <div class="space-card__bottom">
                <strong class="space-card__price">${formatKRW(space.pricePerHour)}/시간</strong>
                <button class="primary-btn" data-action="open-detail" data-space-id="${space.id}">
                  상세보기
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function updateResultCount() {
    if (!el.resultCount) return;
    el.resultCount.textContent = `검색 결과 ${state.filteredSpaces.length}개`;
  }

  function onGridClick(e) {
    const actionButton = e.target.closest("[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const spaceId = actionButton.dataset.spaceId;
    if (!spaceId) return;

    if (action === "toggle-favorite") {
      toggleFavorite(spaceId);
      return;
    }

    if (action === "open-detail") {
      const target = state.spaces.find((space) => space.id === spaceId);
      if (target) openModal(target);
    }
  }

  function toggleFavorite(spaceId) {
    const index = state.favorites.indexOf(spaceId);
    if (index >= 0) {
      state.favorites.splice(index, 1);
      showToast("찜 목록에서 제거했습니다.");
    } else {
      state.favorites.push(spaceId);
      showToast("찜 목록에 추가했습니다.");
    }
    saveJSON("korual_favorites", state.favorites);
    syncCounters();
    renderSpaces();
  }

  function openModal(space) {
    state.selectedSpace = space;
    if (!el.modal || !el.modalBody) return;

    el.modalBody.innerHTML = `
      <div class="space-modal">
        <div class="space-modal__media">
          <img src="${escapeHtml(space.thumbnail)}" alt="${escapeHtml(space.name)}">
        </div>

        <div class="space-modal__content">
          <div class="space-modal__header">
            <div>
              <span class="space-badge">${escapeHtml(space.category)}</span>
              <h2>${escapeHtml(space.name)}</h2>
              <p>${escapeHtml(space.city)} · ${escapeHtml(space.district)} · 최대 ${space.capacity}명</p>
            </div>
            <div class="space-modal__score">
              <strong>⭐ ${space.rating.toFixed(1)}</strong>
              <span>리뷰 ${space.reviewCount}개</span>
            </div>
          </div>

          <p class="space-modal__desc">${escapeHtml(space.description)}</p>

          <div class="info-section">
            <h4>공간 스타일</h4>
            <p>${escapeHtml(space.style)}</p>
          </div>

          <div class="info-section">
            <h4>장비</h4>
            <div class="chip-row">
              ${space.equipment.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
            </div>
          </div>

          <div class="info-section">
            <h4>특징</h4>
            <div class="chip-row">
              ${space.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>

          <div class="info-section">
            <h4>호스트 정보</h4>
            <p>${escapeHtml(space.host.name)} · ${escapeHtml(space.host.grade)} · 신뢰도 ${space.host.trustScore}</p>
            <p>실결제 리뷰 비율 ${space.verifiedReviewRate}%</p>
          </div>

          <div class="info-section">
            <h4>예약 불가 슬롯</h4>
            <p>${space.bookedSlots.length ? space.bookedSlots.join(", ") : "현재 없음"}</p>
          </div>

          <div class="space-modal__cta">
            <strong>${formatKRW(space.pricePerHour)}/시간</strong>
            <button class="primary-btn" data-action="focus-booking-form">이 공간 예약하기</button>
          </div>
        </div>
      </div>
    `;

    el.modal.classList.add("is-open");
    document.body.classList.add("modal-open");

    const focusBtn = el.modalBody.querySelector("[data-action='focus-booking-form']");
    focusBtn?.addEventListener("click", () => {
      closeModal();
      fillBookingForm(space);
      scrollToBookingForm();
    });
  }

  function closeModal() {
    if (!el.modal) return;
    el.modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }

  function fillBookingForm(space) {
    if (!el.bookingForm) return;
    const spaceIdField = el.bookingForm.querySelector("[name='spaceId']");
    const spaceNameField = el.bookingForm.querySelector("[name='spaceName']");
    if (spaceIdField) spaceIdField.value = space.id;
    if (spaceNameField) spaceNameField.value = space.name;
  }

  function scrollToBookingForm() {
    el.bookingForm?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function onBookingSubmit(e) {
    e.preventDefault();
    if (!el.bookingForm) return;

    const formData = new FormData(el.bookingForm);
    const payload = {
      id: `booking-${Date.now()}`,
      spaceId: String(formData.get("spaceId") || "").trim(),
      spaceName: String(formData.get("spaceName") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      date: String(formData.get("date") || "").trim(),
      time: String(formData.get("time") || "").trim(),
      hours: Number(formData.get("hours") || 1),
      purpose: String(formData.get("purpose") || "").trim(),
      createdAt: new Date().toISOString(),
      status: "pending",
      paymentVerified: false,
      reviewEligible: false,
    };

    if (!payload.spaceId || !payload.spaceName) {
      showToast("공간을 먼저 선택해 주세요.");
      return;
    }

    if (!payload.name || !payload.phone || !payload.date || !payload.time) {
      showToast("예약 정보를 모두 입력해 주세요.");
      return;
    }

    const targetSpace = state.spaces.find((space) => space.id === payload.spaceId);
    if (!targetSpace) {
      showToast("선택한 공간 정보를 찾을 수 없습니다.");
      return;
    }

    const requestedSlot = `${payload.date} ${payload.time}`;
    const isBlocked = targetSpace.bookedSlots.includes(requestedSlot);

    if (isBlocked) {
      showToast("해당 시간은 이미 예약된 슬롯입니다.");
      return;
    }

    state.bookings.push(payload);
    saveJSON("korual_bookings", state.bookings);
    syncCounters();

    showToast("예약 신청이 완료되었습니다.");
    el.bookingForm.reset();
  }

  function onAdminEntryClick() {
    const hasVpn = state.adminVpnAuthenticated;
    const isAdmin = state.adminRole === "admin" || state.adminRole === "super_admin";

    if (!hasVpn) {
      showToast("운영자 모드는 전용 VPN 인증 후 접근 가능합니다.");
      return;
    }

    if (!isAdmin) {
      showToast("운영자 권한이 없습니다.");
      return;
    }

    window.location.href = "/admin.html";
  }

  function renderAdminState() {
    if (!el.adminEntry || !el.adminStatus) return;

    const hasVpn = state.adminVpnAuthenticated;
    const isAdmin = state.adminRole === "admin" || state.adminRole === "super_admin";

    if (hasVpn && isAdmin) {
      el.adminEntry.disabled = false;
      el.adminStatus.textContent = "운영자 VPN 인증 완료";
      el.adminStatus.classList.add("is-ok");
    } else if (hasVpn && !isAdmin) {
      el.adminEntry.disabled = true;
      el.adminStatus.textContent = "VPN 연결됨 / 관리자 권한 없음";
      el.adminStatus.classList.remove("is-ok");
    } else {
      el.adminEntry.disabled = true;
      el.adminStatus.textContent = "운영자 모드는 전용 VPN 연결 후 활성화";
      el.adminStatus.classList.remove("is-ok");
    }
  }

  function resetFilters() {
    state.filters = {
      keyword: "",
      city: "all",
      category: "all",
      sort: "recommended",
    };

    if (el.keywordInput) el.keywordInput.value = "";
    if (el.citySelect) el.citySelect.value = "all";
    if (el.categorySelect) el.categorySelect.value = "all";
    if (el.sortSelect) el.sortSelect.value = "recommended";

    applyFilters();
    showToast("필터를 초기화했습니다.");
  }

  function syncCounters() {
    if (el.favoritesCount) {
      el.favoritesCount.textContent = String(state.favorites.length);
    }
    if (el.bookingsCount) {
      el.bookingsCount.textContent = String(state.bookings.length);
    }
  }

  function showToast(message) {
    if (!el.toast) {
      console.log(`[${APP_NAME}] ${message}`);
      return;
    }

    el.toast.textContent = message;
    el.toast.classList.add("is-show");

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.toast.classList.remove("is-show");
    }, 2400);
  }

  function formatKRW(value) {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error(`Failed to load ${key}`, error);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key}`, error);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // 개발용 테스트 헬퍼
  // 브라우저 콘솔에서 아래처럼 실행 가능
  // setKorualAdminVpn(true, "admin")
  window.setKorualAdminVpn = function (enabled, role = "admin") {
    localStorage.setItem("korual_admin_vpn", String(Boolean(enabled)));
    localStorage.setItem("korual_admin_role", enabled ? role : "guest");
    window.location.reload();
  };
})();
