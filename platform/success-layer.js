(() => {
  'use strict';

  const STORAGE_KEY = 'korual-success-funnel-v1';
  const PRIORITY_KEY = 'korual-success-priority-v1';
  const MAX_EVENTS = 80;

  const missionPresets = [
    { icon:'⌂', title:'이사 올인원', sub:'이사 · 입주청소 · 인터넷 설치', text:'다음 달 이사, 입주청소, 인터넷 설치를 일정과 예산에 맞춰 한 번에 비교해줘' },
    { icon:'✦', title:'집 관리', sub:'청소 · 에어컨 · 집수리', text:'집 청소와 에어컨 세척, 필요한 집수리를 가격과 신뢰 기준으로 비교해줘' },
    { icon:'✈', title:'여행 준비', sub:'항공 · 숙박 · 공항 이동', text:'여행 항공과 숙박, 공항 이동을 예산과 일정에 맞춰 비교해줘' },
    { icon:'AI', title:'AI에게 맡기기', sub:'조건 정리부터 견적 비교까지', text:'내 상황에 맞는 서비스를 찾아서 가격, 신뢰, 속도 기준으로 비교해줘' }
  ];

  const stepMap = { home:0, match:1, quotes:2, bookings:3, profile:3, services:0 };

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || { firstSeen:Date.now(), sessions:0, stage:0, events:[] };
    } catch {
      return { firstSeen:Date.now(), sessions:0, stage:0, events:[] };
    }
  }

  const state = readState();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function track(type, detail) {
    const safeDetail = {};
    const source = detail || {};
    ['screen','priority','mission','quote','source'].forEach(function(key){
      if (source[key] != null) safeDetail[key] = String(source[key]).slice(0,80);
    });
    state.events.push({ type:type, detail:safeDetail, at:Date.now() });
    if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
    save();
  }

  function setStage(stage, source) {
    const next = Math.max(0, Math.min(3, Number(stage) || 0));
    if (next > state.stage) state.stage = next;
    track('stage', { source:source, screen:String(next) });
    updateProgress();
  }

  function currentPriority() {
    return localStorage.getItem(PRIORITY_KEY) || 'balanced';
  }

  function setPriority(priority) {
    localStorage.setItem(PRIORITY_KEY, priority);
    document.querySelectorAll('.success-priority').forEach(function(btn){
      btn.classList.toggle('is-active', btn.dataset.successPriority === priority);
    });
    const matchButton = document.querySelector('[data-priority="' + priority + '"]');
    if (matchButton && !matchButton.classList.contains('is-active')) matchButton.click();
    track('priority_change', { priority:priority });
  }

  function openScreen(name) {
    const opener = document.querySelector('[data-open-screen="' + name + '"]') || document.querySelector('[data-tab="' + name + '"]');
    if (opener) opener.click();
  }

  function fillMission(mission) {
    const input = document.getElementById('homeRequestInput');
    if (input) {
      input.value = mission.text;
      input.dispatchEvent(new Event('input', { bubbles:true }));
      input.focus();
      input.scrollIntoView({ behavior:'smooth', block:'center' });
    }
    track('mission_select', { mission:mission.title, source:'success_layer' });
  }

  function missionButtonsMarkup() {
    return missionPresets.map(function(mission, index){
      return '<button type="button" class="success-mission" data-success-mission="' + index + '">' +
        '<span class="success-mission__icon">' + mission.icon + '</span>' +
        '<span><strong>' + mission.title + '</strong><small>' + mission.sub + '</small></span><b>→</b></button>';
    }).join('');
  }

  function createLayer() {
    if (document.getElementById('korualSuccessLayer')) return;
    const homeHero = document.querySelector('.screen-home .new-home-hero');
    if (!homeHero) return;

    const layer = document.createElement('section');
    layer.id = 'korualSuccessLayer';
    layer.className = 'success-layer';
    layer.setAttribute('aria-label', 'KORUAL 빠른 비교');
    layer.innerHTML =
      '<div class="success-layer__head">' +
        '<div><p class="success-layer__eyebrow">KORUAL SUCCESS FLOW</p>' +
        '<h2>검색보다 빠르게,<br>조건부터 비교하세요.</h2>' +
        '<p>한 번 입력하면 AI가 요청을 구조화하고, 비교 가능한 선택지로 정리합니다.</p></div>' +
        '<span class="success-layer__safe"><i></i>직접 승인</span>' +
      '</div>' +
      '<div class="success-layer__steps" aria-label="이용 단계">' +
        '<div class="success-step" data-success-step="0"><b>1</b><strong>조건 입력</strong><small>지역 · 일정 · 예산</small></div>' +
        '<div class="success-step" data-success-step="1"><b>2</b><strong>AI 정리</strong><small>의도 · 범위 구조화</small></div>' +
        '<div class="success-step" data-success-step="2"><b>3</b><strong>비교</strong><small>가격 · 신뢰 · 속도</small></div>' +
        '<div class="success-step" data-success-step="3"><b>4</b><strong>예약</strong><small>최종 선택 직접 승인</small></div>' +
      '</div>' +
      '<div class="success-layer__missions" aria-label="빠른 시작">' + missionButtonsMarkup() + '</div>' +
      '<div class="success-layer__priority" role="group" aria-label="추천 우선순위">' +
        '<span>추천 기준</span>' +
        '<button class="success-priority" type="button" data-success-priority="balanced">균형</button>' +
        '<button class="success-priority" type="button" data-success-priority="price">가격</button>' +
        '<button class="success-priority" type="button" data-success-priority="trust">신뢰</button>' +
        '<button class="success-priority" type="button" data-success-priority="speed">속도</button>' +
      '</div>' +
      '<div class="success-layer__proof">' +
        '<div class="success-proof"><span>01</span><strong>비교 가능한 구조</strong><small>같은 기준으로 후보를 나란히 확인</small></div>' +
        '<div class="success-proof"><span>02</span><strong>신뢰 정보 표시</strong><small>검증·평점·응답 정보를 함께 확인</small></div>' +
        '<div class="success-proof"><span>03</span><strong>재이용 엔진</strong><small>완료 후 연관 서비스와 다음 필요 연결</small></div>' +
      '</div>' +
      '<p class="success-layer__note"><strong>베타 안내:</strong> 표시되는 예시 견적·파트너 정보는 실제 계약 전 반드시 최종 확인이 필요합니다.</p>';

    homeHero.insertAdjacentElement('afterend', layer);

    layer.querySelectorAll('[data-success-mission]').forEach(function(btn){
      btn.addEventListener('click', function(){
        fillMission(missionPresets[Number(btn.dataset.successMission)]);
      });
    });

    layer.querySelectorAll('[data-success-priority]').forEach(function(btn){
      btn.addEventListener('click', function(){ setPriority(btn.dataset.successPriority); });
    });

    setPriority(currentPriority());
  }

  function createFunnelChip() {
    if (document.getElementById('successFunnelChip')) return;
    const chip = document.createElement('div');
    chip.id = 'successFunnelChip';
    chip.className = 'success-funnel-chip';
    chip.innerHTML = '<b>1/4</b><span>조건 입력부터 시작</span><button type="button" aria-label="빠른 흐름 열기">↗</button>';
    document.body.appendChild(chip);
    chip.querySelector('button').addEventListener('click', function(){
      openScreen(state.stage === 0 ? 'home' : state.stage === 1 ? 'match' : state.stage === 2 ? 'quotes' : 'bookings');
    });
  }

  function updateProgress(screen) {
    const active = screen || (document.querySelector('.screen.is-active') && document.querySelector('.screen.is-active').dataset.screen) || 'home';
    const derived = stepMap[active] != null ? stepMap[active] : state.stage;
    const stage = Math.max(state.stage || 0, derived);

    document.querySelectorAll('[data-success-step]').forEach(function(el){
      const n = Number(el.dataset.successStep);
      el.classList.toggle('is-done', n < stage);
      el.classList.toggle('is-current', n === stage);
    });

    const chip = document.getElementById('successFunnelChip');
    if (chip) {
      const labels = ['조건 입력','AI 조건 정리','견적 비교','예약 관리'];
      chip.querySelector('b').textContent = String(stage + 1) + '/4';
      chip.querySelector('span').textContent = labels[stage] || labels[0];
    }
  }

  function bindFunnel() {
    document.addEventListener('click', function(event){
      const tab = event.target.closest('[data-tab],[data-open-screen]');
      if (tab) {
        const screen = tab.dataset.tab || tab.dataset.openScreen;
        if (screen) {
          track('screen_open', { screen:screen, source:'ui' });
          const stage = stepMap[screen];
          if (stage != null && stage > state.stage) setStage(stage, 'screen');
          setTimeout(function(){ updateProgress(screen); }, 0);
        }
      }

      const quote = event.target.closest('[data-quote]');
      if (quote) {
        setStage(2, 'quote_select');
        track('quote_select', { quote:quote.dataset.quote, source:'quote_card' });
      }

      if (event.target.closest('#bookSelected')) {
        setStage(3, 'booking_start');
        track('booking_start', { source:'selected_quote' });
      }
    }, { passive:true });

    const homeForm = document.getElementById('homeRequestForm');
    if (homeForm) homeForm.addEventListener('submit', function(){
      setStage(1, 'home_request');
      track('request_submit', { source:'home' });
    });

    const matchForm = document.getElementById('matchForm');
    if (matchForm) matchForm.addEventListener('submit', function(){
      setStage(2, 'match_submit');
      track('match_submit', { source:'match' });
    });

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) bookingForm.addEventListener('submit', function(){
      setStage(3, 'booking_submit');
      track('booking_submit', { source:'booking_form' });
    });
  }

  function init() {
    state.sessions = (state.sessions || 0) + 1;
    state.lastSeen = Date.now();
    save();
    createLayer();
    createFunnelChip();
    bindFunnel();
    updateProgress();
    track('session_start', { screen:(document.querySelector('.screen.is-active') && document.querySelector('.screen.is-active').dataset.screen) || 'home' });

    window.KORUALSuccessLayer = {
      version:'1.0.0',
      getMetrics:function(){ return Object.assign({}, state, { events:state.events.slice() }); },
      reset:function(){ localStorage.removeItem(STORAGE_KEY); location.reload(); },
      setPriority:setPriority
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();