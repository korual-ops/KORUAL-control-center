/* app.js
   KORUAL Control Center (Login-only)
   - Standalone front-end script for the high-end index.html
   - Works with:
     1) Google Apps Script WebApp (code.gs)  -> action=login / action=whoami / action=logout
     2) Cloud Run API (Express)              -> /auth/login /auth/whoami /auth/logout

   IMPORTANT (GAS limitation):
   - Apps Script ContentService cannot set HttpOnly cookies reliably.
   - For GAS mode we store SID in sessionStorage (per-tab). For Cloud Run mode we use HttpOnly cookie session (credentials: include).
*/

(() => {
  'use strict';

  const CONFIG = {
    MODE: 'GAS', // 'GAS' or 'CLOUD'
    GAS_WEBAPP_URL: 'https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec',
    CLOUD_API_BASE: 'https://your-cloud-run-url',
    AFTER_LOGIN_REDIRECT: '/',       // where to go after login success (optional)
    SESSION_KEY: 'KORUAL_SID',       // used only in GAS mode
    DEFAULT_USERNAME: 'KORUAL'
  };

  const $ = (id) => document.getElementById(id);

  // Optional: expected elements in index.html
  const el = {
    form: $('loginForm'),
    user: $('username'),
    pass: $('password'),
    alert: $('alert'),
    btn: $('submitBtn'),
    apiShort: $('apiShort'),
    mode: $('mode'),
    envLabel: $('envLabel'),
    clock: $('clock')
  };

  // Guard
  if (!el.form || !el.user || !el.pass || !el.alert || !el.btn) {
    console.warn('[KORUAL] Missing required DOM elements.');
    return;
  }

  // UI init
  el.user.value = CONFIG.DEFAULT_USERNAME;

  const apiLabel = (CONFIG.MODE === 'CLOUD')
    ? CONFIG.CLOUD_API_BASE
    : CONFIG.GAS_WEBAPP_URL;

  if (el.apiShort) el.apiShort.textContent = apiLabel.replace(/^https?:\/\//, '').slice(0, 34) + (apiLabel.length > 38 ? '…' : '');
  if (el.mode) el.mode.textContent = (CONFIG.MODE === 'CLOUD') ? 'HttpOnly Cookie Session' : 'SID (sessionStorage)';
  if (el.envLabel) el.envLabel.textContent = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'DEV' : 'PROD';

  // Clock
  if (el.clock) {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      el.clock.textContent = `${hh}:${mm}:${ss}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  function showAlert(message, ok = false) {
    el.alert.classList.toggle('ok', !!ok);
    el.alert.textContent = message;
    el.alert.style.display = 'block';
  }

  function hideAlert() {
    el.alert.style.display = 'none';
    el.alert.textContent = '';
    el.alert.classList.remove('ok');
  }

  function setBusy(isBusy) {
    el.btn.disabled = !!isBusy;
    el.btn.textContent = isBusy ? 'Authenticating...' : 'Authenticate';
  }

  function setSid(sid) {
    if (!sid) return;
    sessionStorage.setItem(CONFIG.SESSION_KEY, sid);
  }

  function getSid() {
    return sessionStorage.getItem(CONFIG.SESSION_KEY) || '';
  }

  function clearSid() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  }

  async function gasCall(action, body = {}, sid = '') {
    const url = new URL(CONFIG.GAS_WEBAPP_URL);
    url.searchParams.set('action', action);

    const headers = { 'Content-Type': 'application/json' };
    if (sid) headers.Authorization = `Bearer ${sid}`;

    const r = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const text = await r.text();
    let j;
    try { j = JSON.parse(text); } catch { j = { ok: false, error: 'INVALID_JSON', raw: text }; }
    return j;
  }

  async function cloudCall(path, body = null) {
    const r = await fetch(`${CONFIG.CLOUD_API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await r.text();
    let j;
    try { j = JSON.parse(text); } catch { j = { ok: false, error: 'INVALID_JSON', raw: text }; }
    return j;
  }

  function normalizeLoginError(j) {
    const err = String(j?.error || 'LOGIN_FAILED');

    if (err === 'LOCKED') {
      const t = j.locked_until ? ` 해제시간: ${j.locked_until}` : '';
      return `계정이 잠겼습니다.${t}`;
    }
    if (err === 'INACTIVE_USER' || err === 'INACTIVE') return '비활성화된 계정입니다. 관리자에게 문의하세요.';
    if (err === 'INVALID_CREDENTIALS') {
      const fc = (typeof j.fail_count === 'number') ? ` (fail_count: ${j.fail_count})` : '';
      return `인증 실패: 자격 증명이 올바르지 않습니다.${fc}`;
    }
    if (err === 'IP_NOT_ALLOWED') return `허용되지 않은 IP 입니다. (${j.ip || ''})`;
    return `인증 실패: ${err}`;
  }

  // Submit
  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = String(el.user.value || '').trim();
    const password = String(el.pass.value || '');

    if (!username || !password) {
      showAlert('USERNAME 및 PASSWORD를 입력하세요.');
      return;
    }

    setBusy(true);

    try {
      if (CONFIG.MODE === 'CLOUD') {
        const j = await cloudCall('/auth/login', { username, password });

        if (!j.ok) {
          showAlert(normalizeLoginError(j));
          return;
        }

        showAlert('인증 성공. 이동합니다...', true);
        setTimeout(() => (window.location.href = CONFIG.AFTER_LOGIN_REDIRECT), 350);
        return;
      }

      // GAS mode
      const j = await gasCall('login', { username, password });

      if (!j.ok) {
        showAlert(normalizeLoginError(j));
        return;
      }

      if (j.sid) setSid(j.sid);

      showAlert('인증 성공. 이동합니다...', true);
      setTimeout(() => (window.location.href = CONFIG.AFTER_LOGIN_REDIRECT), 350);

    } catch (err) {
      showAlert('네트워크 오류. API 접근을 확인하세요.');
    } finally {
      setBusy(false);
    }
  });

  // Optional: expose helpers to window (debug)
  window.KORUAL = {
    config: CONFIG,
    getSid,
    clearSid,
    whoami: async () => {
      try {
        if (CONFIG.MODE === 'CLOUD') return await cloudCall('/auth/whoami');
        return await gasCall('whoami', {}, getSid());
      } catch (e) {
        return { ok: false, error: 'NETWORK_ERROR' };
      }
    },
    logout: async () => {
      try {
        if (CONFIG.MODE === 'CLOUD') return await cloudCall('/auth/logout', {});
        clearSid();
        return await gasCall('logout', {}, '');
      } catch (e) {
        return { ok: false, error: 'NETWORK_ERROR' };
      }
    }
  };
})();

