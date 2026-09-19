"use strict";

const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
const money = new Intl.NumberFormat("ko-KR");

const DESTINATIONS = {
  "사이판": {
    code:"SPN", emoji:"🌴", tagline:"바다와 휴양 중심",
    flight:430000, hotel:235000, food:85000, activity:90000, transport:35000,
    hotels:["월드 리조트급 패밀리","가라판 중심 호텔","해변 앞 프리미엄 리조트"],
    themes:[
      ["도착과 체크인","가라판 산책","선셋 비치"],
      ["마나가하 섬","스노클링","선셋 디너"],
      ["북부 드라이브","만세절벽","로컬 맛집"],
      ["그로토 또는 체험다이빙","카페","야시장"],
      ["리조트 휴식","스파","해변 산책"],
      ["쇼핑과 자유시간","브런치","공항 이동"]
    ]
  },
  "오사카": {
    code:"KIX", emoji:"🍣", tagline:"맛집·쇼핑·근교",
    flight:280000, hotel:155000, food:70000, activity:65000, transport:30000,
    hotels:["난바 접근성 호텔","우메다 시티호텔","도톤보리 부티크호텔"],
    themes:[
      ["간사이 도착","난바 체크인","도톤보리"],
      ["오사카성","우메다","야경"],
      ["USJ 또는 테마파크","시티워크","이자카야"],
      ["교토 반일","기온","가모강"],
      ["신사이바시 쇼핑","카페","스시"],
      ["브런치","기념품","공항 이동"]
    ]
  },
  "도쿄": {
    code:"TYO", emoji:"🗼", tagline:"도시·쇼핑·미식",
    flight:310000, hotel:190000, food:85000, activity:70000, transport:35000,
    hotels:["신주쿠 시티호텔","긴자 라이프스타일호텔","시부야 디자인호텔"],
    themes:[
      ["도쿄 도착","호텔 체크인","신주쿠 야경"],
      ["시부야","오모테산도","롯폰기"],
      ["긴자","도쿄역","스카이트리"],
      ["디즈니 또는 근교","저녁 미식","야경"],
      ["아사쿠사","우에노","쇼핑"],
      ["브런치","마지막 쇼핑","공항 이동"]
    ]
  },
  "후쿠오카": {
    code:"FUK", emoji:"🍜", tagline:"짧고 편한 미식여행",
    flight:230000, hotel:135000, food:65000, activity:45000, transport:22000,
    hotels:["하카타역 호텔","텐진 시티호텔","나카스 부티크호텔"],
    themes:[
      ["후쿠오카 도착","하카타 체크인","나카스"],
      ["다자이후","텐진 쇼핑","야타이"],
      ["오호리공원","모모치","라멘"],
      ["유후인 또는 근교","온천","저녁"],
      ["브런치","쇼핑","공항 이동"]
    ]
  },
  "다낭": {
    code:"DAD", emoji:"🏝️", tagline:"리조트·마사지·호이안",
    flight:300000, hotel:145000, food:50000, activity:65000, transport:28000,
    hotels:["미케비치 호텔","리버사이드 호텔","리조트형 숙소"],
    themes:[
      ["다낭 도착","미케비치","해산물"],
      ["바나힐","골든브릿지","야경"],
      ["호이안","카페","올드타운"],
      ["리조트 휴식","마사지","선셋"],
      ["로컬 투어","시장","루프탑"],
      ["브런치","기념품","공항 이동"]
    ]
  },
  "세부": {
    code:"CEB", emoji:"🐠", tagline:"호핑·리조트·액티비티",
    flight:340000, hotel:160000, food:55000, activity:95000, transport:32000,
    hotels:["막탄 리조트","세부시티 호텔","오션뷰 리조트"],
    themes:[
      ["세부 도착","리조트 체크인","야경"],
      ["호핑투어","스노클링","씨푸드"],
      ["리조트 휴식","스파","선셋"],
      ["오슬롭 또는 캐녀닝","현지식","휴식"],
      ["세부시티","쇼핑몰","루프탑"],
      ["브런치","기념품","공항 이동"]
    ]
  },
  "방콕": {
    code:"BKK", emoji:"🛺", tagline:"미식·쇼핑·나이트라이프",
    flight:370000, hotel:150000, food:60000, activity:60000, transport:30000,
    hotels:["아속 접근성 호텔","시암 프리미엄 호텔","리버사이드 호텔"],
    themes:[
      ["방콕 도착","호텔 체크인","루프탑"],
      ["왕궁","왓포","아이콘시암"],
      ["시암 쇼핑","마사지","야시장"],
      ["아유타야 또는 파타야","디너","휴식"],
      ["통로 카페","쇼핑","야경"],
      ["브런치","마지막 쇼핑","공항 이동"]
    ]
  },
  "푸꾸옥": {
    code:"PQC", emoji:"🌅", tagline:"리조트·선셋·휴양",
    flight:420000, hotel:180000, food:55000, activity:75000, transport:30000,
    hotels:["선셋타운 리조트","롱비치 호텔","남부 프리미엄 리조트"],
    themes:[
      ["푸꾸옥 도착","호텔 체크인","야시장"],
      ["혼똔섬","케이블카","선셋타운"],
      ["사파리","테마파크","루프탑"],
      ["호핑투어","스노클링","마사지"],
      ["리조트 휴식","카페","선셋"],
      ["브런치","기념품","공항 이동"]
    ]
  }
};

const PARTY = [
  {id:"family", emoji:"👨‍👩‍👧", title:"가족", sub:"아이와 함께"},
  {id:"couple", emoji:"💞", title:"커플", sub:"둘만의 여행"},
  {id:"friends", emoji:"👯", title:"친구", sub:"여럿이 함께"},
  {id:"solo", emoji:"🎒", title:"혼자", sub:"내 속도대로"}
];

const STYLES = [
  {id:"relax", emoji:"🌴", title:"휴양", sub:"여유로운 일정 · 좋은 숙소"},
  {id:"food", emoji:"🍽️", title:"미식", sub:"맛집과 카페 중심"},
  {id:"city", emoji:"🌃", title:"도시", sub:"쇼핑 · 야경 · 핫플"},
  {id:"active", emoji:"🤿", title:"액티비티", sub:"투어 · 체험 · 이동"}
];

const defaultState = {
  step:0,
  party:"couple",
  adults:2,
  children:0,
  seniors:0,
  style:"relax",
  destination:"오사카",
  nights:3,
  startDate:"",
  budget:1500000,
  budgetTouched:false,
  priorities:["hotel"],
  selectedDeals:[],
  result:false
};

let state = loadState();

function cloneDefault(){
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState(){
  try{
    const hash = location.hash.startsWith("#mission=") ? decodeURIComponent(location.hash.slice(9)) : "";
    if(hash){
      const shared = JSON.parse(hash);
      return Object.assign(cloneDefault(), shared, {result:true, step:3});
    }
  }catch(_){}
  try{
    const saved = JSON.parse(localStorage.getItem("korual-travel-mission-v2") || "null");
    if(saved) return Object.assign(cloneDefault(), saved);
  }catch(_){}
  return cloneDefault();
}

function saveState(){
  localStorage.setItem("korual-travel-mission-v2", JSON.stringify(state));
}

function totalPeople(){
  return Math.max(1, state.adults + state.children + state.seniors);
}

function weightedPeople(){
  return Math.max(1, state.adults + state.seniors + state.children * 0.72);
}

function rooms(){
  return Math.max(1, Math.ceil((state.adults + state.seniors + Math.max(0,state.children-1)*0.5) / 2));
}

function estimate(){
  const d = DESTINATIONS[state.destination] || DESTINATIONS["오사카"];
  const days = state.nights + 1;
  const wp = weightedPeople();
  const flight = d.flight * wp;
  const hotel = d.hotel * rooms() * state.nights;
  const food = d.food * wp * days;
  const activity = d.activity * wp * Math.max(1,state.nights - 1);
  const transport = d.transport * wp * days;

  let multipliers = {flight:1,hotel:1,food:1,activity:1,transport:1};
  if(state.style === "relax") multipliers.hotel = 1.16;
  if(state.style === "food") multipliers.food = 1.22;
  if(state.style === "city"){ multipliers.transport = 1.12; multipliers.food = 1.08; }
  if(state.style === "active") multipliers.activity = 1.28;
  if(state.priorities.includes("hotel")) multipliers.hotel *= 1.12;
  if(state.priorities.includes("food")) multipliers.food *= 1.12;
  if(state.priorities.includes("activity")) multipliers.activity *= 1.12;
  if(state.priorities.includes("saving")){
    Object.keys(multipliers).forEach(function(k){ multipliers[k] *= .91; });
  }

  const parts = {
    flight:Math.round(flight*multipliers.flight/1000)*1000,
    hotel:Math.round(hotel*multipliers.hotel/1000)*1000,
    food:Math.round(food*multipliers.food/1000)*1000,
    activity:Math.round(activity*multipliers.activity/1000)*1000,
    transport:Math.round(transport*multipliers.transport/1000)*1000
  };
  parts.total = parts.flight + parts.hotel + parts.food + parts.activity + parts.transport;
  return parts;
}

function fmt(v){
  return "₩" + money.format(Math.round(v));
}

function fmtMan(v){
  return Math.round(v/10000) + "만 원";
}

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ toastEl.classList.remove("show"); }, 1800);
}

function topbar(){
  return '<header class="topbar">' +
    '<div class="brand"><div class="brand-mark">K</div><div class="brand-text"><strong>KORUAL</strong><small>TRAVEL MISSION</small></div></div>' +
    '<button class="ghost" id="resetBtn" type="button">처음부터</button>' +
  '</header>';
}

function progress(){
  let html = '<div class="progress" aria-label="진행 단계">';
  for(let i=0;i<4;i++) html += '<span class="' + (i <= state.step ? "on" : "") + '"></span>';
  return html + '</div>';
}

function partyStep(){
  return '<div class="shell">' + topbar() + progress() +
    '<p class="kicker">01 / 04 · PARTY</p>' +
    '<h1 class="question">누구와<br>떠나시나요?</h1>' +
    '<p class="sub">인원에 따라 객실 수, 이동수단, 일정 속도와 예산을 자동으로 맞춥니다.</p>' +
    '<div class="fast-mission"><label>FAST MISSION · 한 문장으로 시작</label><div class="fast-row"><input id="fastMissionInput" placeholder="예: 10월 오사카 커플 3박4일 120만원"><button id="fastMissionBtn" type="button">분석</button></div><small>목적지·동행·기간·예산을 먼저 읽고, 부족한 조건만 이어서 묻습니다.</small></div>' +
    '<div class="option-grid">' +
      PARTY.map(function(x){
        return '<button class="option ' + (state.party===x.id?"selected":"") + '" data-party="' + x.id + '" type="button">' +
          '<span class="check">✓</span><span class="emoji">' + x.emoji + '</span><strong>' + x.title + '</strong><small>' + x.sub + '</small></button>';
      }).join("") +
    '</div>' +
    '<div class="counter-box"><div class="counter-label">정확한 인원</div>' +
      counterRow("성인","adults",state.adults,1) +
      counterRow("아동","children",state.children,0) +
      counterRow("만 65세 이상","seniors",state.seniors,0) +
    '</div>' +
    stickyNext("다음 · " + totalPeople() + "명") +
  '</div>';
}

function counterRow(label,key,value,min){
  return '<div class="counter-row"><strong>' + label + '</strong>' +
    '<button class="round-btn" data-count="' + key + '" data-dir="-1" data-min="' + min + '" type="button" ' + (value<=min?"disabled":"") + '>−</button>' +
    '<span class="counter-value">' + value + '</span>' +
    '<button class="round-btn" data-count="' + key + '" data-dir="1" data-min="' + min + '" type="button">+</button></div>';
}

function styleStep(){
  return '<div class="shell">' + topbar() + progress() +
    '<p class="kicker">02 / 04 · TRAVEL MODE</p>' +
    '<h1 class="question">이번 여행에서<br>가장 중요한 건?</h1>' +
    '<p class="sub">KORUAL이 하루 구성과 예산 배분을 이 선택에 맞춰 바꿉니다.</p>' +
    '<div class="choice-stack">' +
      STYLES.map(function(x){
        return '<button class="trip-card ' + (state.style===x.id?"selected":"") + '" data-style="' + x.id + '" type="button">' +
          '<span class="emoji">' + x.emoji + '</span><strong>' + x.title + '</strong><small>' + x.sub + '</small></button>';
      }).join("") +
    '</div>' + stickyNext("다음 · 여행 조건") + '</div>';
}

function destinationStep(){
  return '<div class="shell">' + topbar() + progress() +
    '<p class="kicker">03 / 04 · DESTINATION</p>' +
    '<h1 class="question">어디로, 얼마나<br>머무르시나요?</h1>' +
    '<p class="sub">초기 MVP는 인천 출발 인기 근거리 여행지를 깊게 설계합니다.</p>' +
    '<div class="destination-grid">' +
      Object.keys(DESTINATIONS).map(function(name){
        const x = DESTINATIONS[name];
        return '<button class="destination ' + (state.destination===name?"selected":"") + '" data-destination="' + name + '" type="button">' +
          '<strong>' + x.emoji + ' ' + name + '</strong><small>' + x.tagline + '</small></button>';
      }).join("") +
    '</div>' +
    '<div class="field-grid">' +
      '<div class="field"><label for="nights">숙박</label><select id="nights">' +
        [2,3,4,5,6,7].map(function(n){ return '<option value="' + n + '" ' + (state.nights===n?"selected":"") + '>' + n + '박 ' + (n+1) + '일</option>'; }).join("") +
      '</select></div>' +
      '<div class="field"><label for="startDate">출발일 · 선택</label><input id="startDate" type="date" value="' + state.startDate + '"></div>' +
    '</div>' + stickyNext("다음 · 예산 맞추기") + '</div>';
}

function budgetStep(){
  const e = estimate();
  return '<div class="shell">' + topbar() + progress() +
    '<p class="kicker">04 / 04 · SMART BUDGET</p>' +
    '<h1 class="question">전체 예산은<br>어느 정도인가요?</h1>' +
    '<p class="sub">항공·숙소·식사·이동·액티비티를 따로 입력하지 않아도 KORUAL이 자동 배분합니다.</p>' +
    '<div class="budget-card">' +
      '<div class="budget-head"><strong>총 여행 예산</strong><b id="budgetValue">' + fmt(state.budget) + '</b></div>' +
      '<input class="range" id="budgetRange" type="range" min="500000" max="6000000" step="50000" value="' + state.budget + '">' +
      '<div class="range-labels"><span>50만</span><span>600만</span></div>' +
    '</div>' +
    '<div class="budget-card"><div class="budget-head"><strong>무엇에 더 쓸까요?</strong><span>복수 선택</span></div>' +
      '<div class="priority-grid">' +
        priority("hotel","🏨 숙소") + priority("food","🍽️ 미식") + priority("activity","🎢 체험") + priority("saving","💰 절약") +
      '</div>' +
      '<div class="smart-box"><strong>✨ KORUAL Smart Budget</strong><p>현재 조건 기준 시드 추정비는 약 <b>' + fmtMan(e.total) + '</b>입니다. 실시간 항공·호텔 API 연결 전까지는 가격 범위 검증용으로 사용합니다.</p></div>' +
    '</div>' +
    '<div class="sticky-action"><button class="secondary" id="backBtn" type="button">이전</button><button class="primary" id="generateBtn" type="button">AI 여행 Mission 생성</button></div>' +
  '</div>';
}

function priority(id,label){
  return '<button class="priority ' + (state.priorities.includes(id)?"selected":"") + '" data-priority="' + id + '" type="button">' + label + '</button>';
}

function stickyNext(label){
  return '<div class="sticky-action"><button class="primary" id="nextBtn" type="button">' + label + '</button></div>';
}

function resultView(){
  const d = DESTINATIONS[state.destination];
  const e = estimate();
  const diff = state.budget - e.total;
  const style = STYLES.find(function(x){return x.id===state.style;}) || STYLES[0];
  const party = PARTY.find(function(x){return x.id===state.party;}) || PARTY[1];
  const low = Math.round(e.total*.88/10000)*10000;
  const high = Math.round(e.total*1.14/10000)*10000;
  const shareText = state.destination + " " + state.nights + "박 " + totalPeople() + "명";

  return '<div class="result-shell">' +
    '<header class="result-top"><button class="icon-btn" id="editBtn" type="button" aria-label="답변 수정">‹</button><div class="brand-text"><strong>KORUAL MISSION</strong><small>DEMO ESTIMATE · NOT LIVE FARE</small></div><button class="ghost" id="shareTopBtn" type="button">공유</button></header>' +
    '<section class="result-hero"><p class="eyebrow">' + d.code + ' · AI TRAVEL MISSION</p><h1>' + state.destination + '<br>' + state.nights + '박 ' + (state.nights+1) + '일</h1>' +
      '<p>' + party.emoji + ' ' + totalPeople() + '명 · ' + style.emoji + ' ' + style.title + ' 중심</p>' +
      '<div class="hero-chips"><span class="hero-chip">예산 ' + fmt(state.budget) + '</span><span class="hero-chip">객실 ' + rooms() + '개 기준</span><span class="hero-chip">인천 출발</span></div>' +
    '</section>' +
    '<div class="result-wrap">' +
      '<div class="result-links"><button class="text-link" id="dateEditBtn" type="button">날짜·조건 바꾸기 →</button><button class="text-link" id="regenerateBtn" type="button">일정 다시 조립 ↻</button></div>' +
      '<section class="section"><div class="section-head"><div><small>SMART BUDGET</small><h2>예산 포트폴리오</h2></div><small>시드 추정</small></div>' +
        '<div class="budget-summary"><div class="big-budget"><small>예상 총액 범위</small><strong>' + fmtMan(low) + ' ~ ' + fmtMan(high) + '</strong><p>항공·숙소·식사·교통·액티비티를 합산한 MVP 계산값입니다.</p></div>' +
          '<div class="buffer ' + (diff>=0?"positive":"negative") + '"><small>' + (diff>=0?"예비비":"예산 초과") + '</small><strong>' + (diff>=0?"+":"−") + fmtMan(Math.abs(diff)) + '</strong></div></div>' +
        breakdown(e) +
      '</section>' +
      '<section class="section"><div class="section-head"><div><small>MISSION ROUTE</small><h2>하루 단위 일정</h2></div><small>' + shareText + '</small></div>' +
        buildDays(d,e) +
      '</section>' +
      '<section class="section"><div class="section-head"><div><small>DEAL ENGINE</small><h2>먼저 비교할 거래</h2></div><small>선택은 저장만 됩니다</small></div>' +
        dealCards(d,e) +
        '<div class="note">현재 버전은 실제 예약·결제를 실행하지 않습니다. 다음 단계에서 항공/호텔/액티비티 공급 API를 연결하고, 결제 전에는 KORUAL Guard가 최종 금액과 취소조건을 다시 확인하도록 설계합니다.</div>' +
      '</section>' +
    '</div>' +
    '<div class="mission-bar"><div class="mission-total"><small>현재 Mission 예상 총액</small><strong>' + fmt(e.total) + '</strong></div><button class="share-btn" id="shareBtn" type="button">저장·공유</button></div>' +
  '</div>';
}

function breakdown(e){
  const rows = [
    ["✈️ 항공","flight",e.flight],
    ["🏨 숙소","hotel",e.hotel],
    ["🍽️ 식사","food",e.food],
    ["🎢 체험","activity",e.activity],
    ["🚇 이동","transport",e.transport]
  ];
  return '<div class="breakdown">' + rows.map(function(r){
    const pct = Math.max(4,Math.round((r[2]/e.total)*100));
    return '<div class="break-row"><span>' + r[0] + '</span><div class="bar"><i style="width:' + pct + '%"></i></div><b>' + fmtMan(r[2]) + '</b></div>';
  }).join("") + '</div>';
}

function buildDays(d,e){
  const totalDays = state.nights + 1;
  let html = "";
  for(let i=0;i<totalDays;i++){
    const theme = d.themes[Math.min(i,d.themes.length-1)] || d.themes[d.themes.length-1];
    const isLast = i === totalDays-1;
    const label = i===0 ? "도착일" : (isLast ? "귀국일" : "여행");
    const dayCost = Math.round((e.food + e.activity + e.transport) / Math.max(1,totalDays) / 1000)*1000;
    html += '<article class="day-card"><div class="day-top"><strong>DAY ' + (i+1) + '</strong><span>' + label + ' · ' + (state.style==="relax"?"여유":"균형") + '</span></div>' +
      eventRow(i===0?"도착":isLast?"10:30":"09:30", theme[0], i===0?"공항 → 숙소 이동":isLast?"체크아웃 후 이동":"오전 핵심 일정", i===0?e.transport/totalDays:dayCost*.32) +
      eventRow("13:30", theme[1], "동선 30분 안쪽으로 묶은 추천", dayCost*.34) +
      eventRow("17:30", theme[2], isLast?"공항 이동 전 여유시간":"저녁과 야경까지 자연스럽게 연결", isLast?0:dayCost*.34) +
      '</article>';
  }
  return html;
}

function eventRow(time,title,sub,cost){
  const free = cost < 5000;
  return '<div class="event"><time>' + time + '</time><div><strong>' + title + '</strong><small>' + sub + '</small></div><div class="event-price ' + (free?"free":"") + '">' + (free?"무료":fmtMan(cost)) + '</div></div>';
}

function dealCards(d,e){
  const deals = [
    {id:"flight",title:"왕복 항공",desc:"시간대·수하물·변경조건을 함께 비교",price:e.flight,score:93},
    {id:"hotel",title:d.hotels[0],desc:"위치·무료취소·객실수 기준으로 비교",price:e.hotel,score:91},
    {id:"transfer",title:"공항 ↔ 숙소 이동",desc:"인원과 수하물에 맞는 교통수단 비교",price:e.transport*.35,score:88},
    {id:"activity",title:"핵심 액티비티 패스",desc:"일정 충돌 없이 하루 한 가지 중심으로 조합",price:e.activity*.55,score:86}
  ];
  return deals.map(function(x){
    const active = state.selectedDeals.includes(x.id);
    return '<article class="deal-card"><div class="deal-top"><strong>' + x.title + '</strong><span class="score">Deal ' + x.score + '</span></div>' +
      '<p>' + x.desc + '</p><div class="deal-meta"><b>' + fmtMan(x.price) + '</b><div class="deal-actions"><button class="mini compareDeal" data-deal="' + x.id + '" type="button">비교</button><button class="mini selectDeal ' + (active?"active":"") + '" data-deal="' + x.id + '" type="button">' + (active?"선택됨":"선택") + '</button></div></div></article>';
  }).join("");
}

function parseFastMission(text){
  const raw = String(text || "").trim();
  if(!raw) return false;

  Object.keys(DESTINATIONS).forEach(function(name){
    if(raw.includes(name)) state.destination = name;
  });

  if(/혼자|솔로/.test(raw)){ state.party="solo"; state.adults=1; state.children=0; state.seniors=0; }
  else if(/커플|연인|여자친구|남자친구/.test(raw)){ state.party="couple"; state.adults=Math.max(2,state.adults); }
  else if(/가족|아이|부모님/.test(raw)){ state.party="family"; }
  else if(/친구/.test(raw)){ state.party="friends"; }

  const people = raw.match(/(\d+)\s*명/);
  if(people && state.party!=="solo"){
    state.adults = Math.max(1,Math.min(12,Number(people[1])));
    state.children = 0;
    state.seniors = 0;
  }

  const nights = raw.match(/(\d+)\s*박/);
  if(nights) state.nights = Math.max(2,Math.min(7,Number(nights[1])));

  const budget = raw.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if(budget){
    state.budget = Math.max(500000,Math.min(6000000,Math.round(Number(budget[1])*10000)));
    state.budgetTouched = true;
  }

  if(/휴양|리조트|쉬|여유/.test(raw)) state.style="relax";
  if(/맛집|미식|먹방|카페/.test(raw)) state.style="food";
  if(/쇼핑|야경|도시|핫플/.test(raw)) state.style="city";
  if(/다이빙|호핑|액티비티|투어|체험/.test(raw)) state.style="active";

  state.step = state.budgetTouched ? 3 : 2;
  saveState();
  return true;
}

function render(){
  if(state.result){
    app.innerHTML = resultView();
    bindResult();
    saveState();
    return;
  }
  if(state.step===0) app.innerHTML = partyStep();
  if(state.step===1) app.innerHTML = styleStep();
  if(state.step===2) app.innerHTML = destinationStep();
  if(state.step===3) app.innerHTML = budgetStep();
  bindWizard();
  saveState();
}

function bindWizard(){
  const reset = document.getElementById("resetBtn");
  if(reset) reset.onclick = resetAll;

  const fastInput = document.getElementById("fastMissionInput");
  const fastBtn = document.getElementById("fastMissionBtn");
  if(fastBtn && fastInput){
    const runFast = function(){
      if(!parseFastMission(fastInput.value)){ toast("여행 조건을 한 문장으로 입력해 주세요."); return; }
      toast("조건을 읽었습니다. 부족한 항목만 확인할게요.");
      render();
      scrollTo({top:0,behavior:"smooth"});
    };
    fastBtn.onclick = runFast;
    fastInput.onkeydown = function(e){ if(e.key==="Enter") runFast(); };
  }

  document.querySelectorAll("[data-party]").forEach(function(btn){
    btn.onclick = function(){
      state.party = btn.dataset.party;
      if(state.party==="solo"){ state.adults=1; state.children=0; state.seniors=0; }
      if(state.party==="couple"){ state.adults=Math.max(2,state.adults); }
      render();
    };
  });

  document.querySelectorAll("[data-count]").forEach(function(btn){
    btn.onclick = function(){
      const key = btn.dataset.count;
      const dir = Number(btn.dataset.dir);
      const min = Number(btn.dataset.min);
      state[key] = Math.max(min,Math.min(12,state[key]+dir));
      if(totalPeople()<1) state.adults=1;
      render();
    };
  });

  document.querySelectorAll("[data-style]").forEach(function(btn){
    btn.onclick = function(){ state.style=btn.dataset.style; render(); };
  });

  document.querySelectorAll("[data-destination]").forEach(function(btn){
    btn.onclick = function(){ state.destination=btn.dataset.destination; render(); };
  });

  const nights = document.getElementById("nights");
  if(nights) nights.onchange = function(){ state.nights=Number(nights.value); state.budgetTouched=false; saveState(); };

  const startDate = document.getElementById("startDate");
  if(startDate) startDate.onchange = function(){ state.startDate=startDate.value; saveState(); };

  document.querySelectorAll("[data-priority]").forEach(function(btn){
    btn.onclick = function(){
      const id = btn.dataset.priority;
      const set = new Set(state.priorities);
      if(set.has(id)) set.delete(id); else set.add(id);
      state.priorities = Array.from(set);
      render();
    };
  });

  const range = document.getElementById("budgetRange");
  if(range){
    range.oninput = function(){
      state.budget = Number(range.value);
      state.budgetTouched = true;
      document.getElementById("budgetValue").textContent = fmt(state.budget);
      saveState();
    };
  }

  const next = document.getElementById("nextBtn");
  if(next) next.onclick = function(){
    if(state.step===2 && !state.budgetTouched){
      const suggested = Math.max(500000,Math.min(6000000,Math.ceil(estimate().total*1.08/50000)*50000));
      state.budget = suggested;
    }
    state.step = Math.min(3,state.step+1);
    render();
    scrollTo({top:0,behavior:"smooth"});
  };

  const back = document.getElementById("backBtn");
  if(back) back.onclick = function(){ state.step=2; render(); scrollTo({top:0,behavior:"smooth"}); };

  const gen = document.getElementById("generateBtn");
  if(gen) gen.onclick = function(){
    state.result = true;
    state.selectedDeals = [];
    render();
    scrollTo({top:0,behavior:"smooth"});
  };
}

function bindResult(){
  const edit = document.getElementById("editBtn");
  const dateEdit = document.getElementById("dateEditBtn");
  [edit,dateEdit].filter(Boolean).forEach(function(btn){
    btn.onclick = function(){ state.result=false; state.step=2; render(); scrollTo({top:0,behavior:"smooth"}); };
  });

  const regen = document.getElementById("regenerateBtn");
  if(regen) regen.onclick = function(){
    state.style = ["relax","food","city","active"][(["relax","food","city","active"].indexOf(state.style)+1)%4];
    toast("여행 모드를 바꿔 다시 조립했습니다.");
    render();
  };

  document.querySelectorAll(".compareDeal").forEach(function(btn){
    btn.onclick = function(){ toast("실시간 공급 API 연결 전 데모 비교 항목입니다."); };
  });

  document.querySelectorAll(".selectDeal").forEach(function(btn){
    btn.onclick = function(){
      const id = btn.dataset.deal;
      const set = new Set(state.selectedDeals);
      if(set.has(id)) set.delete(id); else set.add(id);
      state.selectedDeals = Array.from(set);
      render();
    };
  });

  ["shareTopBtn","shareBtn"].forEach(function(id){
    const btn = document.getElementById(id);
    if(btn) btn.onclick = shareMission;
  });
}

async function shareMission(){
  const shared = {
    party:state.party,adults:state.adults,children:state.children,seniors:state.seniors,
    style:state.style,destination:state.destination,nights:state.nights,startDate:state.startDate,
    budget:state.budget,priorities:state.priorities
  };
  const url = location.origin + location.pathname + "#mission=" + encodeURIComponent(JSON.stringify(shared));
  const text = "KORUAL · " + state.destination + " " + state.nights + "박 " + totalPeople() + "명 여행 Mission";
  try{
    if(navigator.share){
      await navigator.share({title:"KORUAL Travel Mission",text:text,url:url});
    }else{
      await navigator.clipboard.writeText(url);
      toast("공유 링크를 복사했습니다.");
    }
  }catch(_){}
}

function resetAll(){
  state = cloneDefault();
  history.replaceState(null,"",location.pathname);
  localStorage.removeItem("korual-travel-mission-v2");
  render();
  scrollTo({top:0,behavior:"smooth"});
}

let deferredPrompt = null;
const installBox = document.getElementById("installBox");
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt",function(e){
  e.preventDefault();
  deferredPrompt=e;
  installBox.hidden=false;
});
installBtn.addEventListener("click",async function(){
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  installBox.hidden=true;
});

if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("./sw.js").catch(function(){});
  });
}

render();
