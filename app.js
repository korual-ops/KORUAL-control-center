/* =========================
   KORUAL Control Center
   File: app.js (Vanilla JS)
   ========================= */

/** ====== 환경설정 ====== **/
const KORUAL = {
  // 배포된 GAS Web App URL로 교체 (끝에 /exec 또는 /dev 포함)
  API_BASE: "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec",

  // LocalStorage Keys
  LS: {
    TOKEN: "korual_api_token",
    THEME: "korual_theme" // "dark" | "light"
  },

  // 기본 요청 설정
  DEFAULT_TIMEOUT_MS: 15000
};

/** ====== 유틸 ====== **/
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function safeJsonParse(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getToken() { return localStorage.getItem(KORUAL.LS.TOKEN) || ""; }
function setToken(token) { localStorage.setItem(KORUAL.LS.TOKEN, token || ""); }

/** ====== 테마 ====== **/
function getTheme() { return localStorage.getItem(KORUAL.LS.THEME) || "dark"; }
function setTheme(theme) {
  const t = (theme === "light") ? "light" : "dark";
  localStorage.setItem(KORUAL.LS.THEME, t);
  applyTheme();
}
function toggleTheme() { setTheme(getTheme() === "dark" ? "light" : "dark"); }

function applyTheme() {
  const theme = getTheme();
  document.documentElement.setAttribute("data-theme", theme);
  const btn = $("#btnTheme");
  if (btn) btn.textContent = theme === "dark" ? "Light" : "Dark";
}

/** ====== 네트워크 ====== **/
async function fetchWithTimeout(url, options = {}, timeoutMs = KORUAL.DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function buildUrl(path, params = {}) {
  const base = KORUAL.API_BASE.replace(/\/+$/, "");
  const p = (path || "/").startsWith("/") ? path : `/${path}`;
  const u = new URL(base + p);

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    u.searchParams.set(k, String(v));
  });

  return u.toString();
}

async function apiGet(path, params = {}) {
  const token = getToken();
  const url = buildUrl(path, params);

  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  });

  const text = await res.text();
  const json = safeJsonParse(text, { ok: false, raw: text });

  if (!res.ok || json.ok === false) {
    throw new Error(json.message || json.error || `GET_FAILED: ${res.status}`);
  }
  return json;
}

async function apiPost(path, body = {}, params = {}) {
  const token = getToken();
  const url = buildUrl(path, params);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });

  const text = await res.text();
  const json = safeJsonParse(text, { ok: false, raw: text });

  if (!res.ok || json.ok === false) {
    throw new Error(json.message || json.error || `POST_FAILED: ${res.status}`);
  }
  return json;
}

/** ====== UI: 상태 표시 ====== **/
function setStatus(msg, type = "info") {
  const el = $("#status");
  if (!el) return;

  el.textContent = msg || "";
  el.setAttribute("data-type", type); // CSS에서 [data-type]로 스타일 가능
}

function setJsonPreview(obj) {
  const el = $("#jsonPreview");
  if (!el) return;
  el.textContent = JSON.stringify(obj, null, 2);
}

/** ====== 렌더링 헬퍼 ====== **/
function renderTable(containerSel, items, columns) {
  const root = $(containerSel);
  if (!root) return;

  if (!Array.isArray(items) || items.length === 0) {
    root.innerHTML = `<div class="empty">No data</div>`;
    return;
  }

  const cols = columns && columns.length ? columns : Object.keys(items[0] || {});
  const thead = `<thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${
    items.map(row => `<tr>${cols.map(c => `<td>${escapeHtml(row?.[c])}</td>`).join("")}</tr>`).join("")
  }</tbody>`;

  root.innerHTML = `<table class="tbl">${thead}${tbody}</table>`;
}

function escapeHtml(v) {
  const s = (v === undefined || v === null) ? "" : String(v);
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** ====== 데이터 로드 (예시 라우트) ======
 * ROUTES 시트에 아래가 있어야 함:
 * GET /products -> PRODUCTS (mode=list)
 * GET /orders   -> ORDERS   (mode=list)
 * GET /members  -> MEMBERS  (mode=list)
 */
async function loadDashboard() {
  setStatus("Loading...", "info");

  try {
    // 병렬 로드
    const [products, orders, members] = await Promise.all([
      apiGet("/products", { limit: 50 }),
      apiGet("/orders", { limit: 50 }),
      apiGet("/members", { limit: 50 })
    ]);

    // KPI(간단 예시)
    $("#kpiProducts") && ($("#kpiProducts").textContent = products.count ?? (products.items?.length || 0));
    $("#kpiOrders") && ($("#kpiOrders").textContent = orders.count ?? (orders.items?.length || 0));
    $("#kpiMembers") && ($("#kpiMembers").textContent = members.count ?? (members.items?.length || 0));

    // 테이블 렌더링
    renderTable("#tblProducts", products.items || [], ["id","name","price","stock"]);
    renderTable("#tblOrders", orders.items || [], ["id","status","amount","createdAt"]);
    renderTable("#tblMembers", members.items || [], ["id","tier","name","joinedAt"]);

    setJsonPreview({ products, orders, members });
    setStatus("Loaded.", "ok");
  } catch (err) {
    setStatus(String(err.message || err), "error");
  }
}

/** ====== 폼 액션 (예: 상품 Upsert) ======
 * ROUTES 시트에 POST /products (mode=upsert, key=id) 가 있어야 함
 */
async function upsertProductFromForm() {
  const id = $("#p_id")?.value?.trim();
  const name = $("#p_name")?.value?.trim();
  const price = $("#p_price")?.value?.trim();
  const stock = $("#p_stock")?.value?.trim();

  if (!id) {
    setStatus("Product id is required.", "error");
    return;
  }

  try {
    setStatus("Saving product...", "info");
    const res = await apiPost("/products", {
      data: {
        id,
        ...(name ? { name } : {}),
        ...(price ? { price: Number(price) } : {}),
        ...(stock ? { stock: Number(stock) } : {})
      }
    });
    setJsonPreview(res);
    setStatus("Saved.", "ok");
    await loadDashboard();
  } catch (err) {
    setStatus(String(err.message || err), "error");
  }
}

/** ====== 토큰/테스트 ====== **/
async function pingApi() {
  // ROUTES에 GET /ping -> (예: LOGS 또는 SETTINGS) mode=list 등으로 연결해도 되고,
  // Code.gs에 별도 ping 핸들러를 추가해도 됨.
  try {
    setStatus("Pinging...", "info");
    const res = await apiGet("/products", { limit: 1 }); // 임시 ping
    setJsonPreview(res);
    setStatus("API OK.", "ok");
  } catch (err) {
    setStatus(String(err.message || err), "error");
  }
}

/** ====== 이벤트 바인딩 ====== **/
function bindEvents() {
  $("#btnTheme")?.addEventListener("click", toggleTheme);

  $("#btnSaveToken")?.addEventListener("click", () => {
    const t = $("#tokenInput")?.value?.trim() || "";
    setToken(t);
    setStatus(t ? "Token saved." : "Token cleared.", "ok");
  });

  $("#btnPing")?.addEventListener("click", pingApi);
  $("#btnReload")?.addEventListener("click", loadDashboard);

  $("#btnUpsertProduct")?.addEventListener("click", (e) => {
    e.preventDefault();
    upsertProductFromForm();
  });
}

/** ====== 초기화 ====== **/
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();

  // token input 초기값
  const token = getToken();
  if ($("#tokenInput")) $("#tokenInput").value = token;

  bindEvents();
  loadDashboard();
});
