/* app.js
   KORUAL Legend High-End Login (index.html 전용)
   - Cloud Run API (쿠키 세션): POST {API_BASE}/auth/login
   - 성공 시: AFTER_LOGIN_REDIRECT로 이동
   - 에러 매핑: LOCKED / INACTIVE_USER / INVALID_CREDENTIALS / IP_NOT_ALLOWED 등

   필수: index.html에 아래 DOM id들이 있어야 함
   - loginForm, username, password, submitBtn, alert
   - envLabel, envLabel2, apiShort, mode, clock (있으면 자동 반영)
*/

(() => {
  'use strict';

  const CONFIG = {
    API_BASE: 'https://your-cloud-run-url', // TODO: Cloud Run Service URL로 교체
    AFTER_LOGIN_REDIRECT: '/',              // TODO: 로그인 후 이동 경로
    DEFAULT_USERNAME: 'KORUAL',
    MODE_LABEL: 'HttpOnly Cookie Session',
    CLOCK: true
  };

  const $ = (id) => document.getElementById(id);

  // Required elements
  const form = $('loginForm');
  const userEl = $('username');
  const passEl = $('password');
  const btn = $('submitBtn');
  const alertBox = $('alert');

  if (!form || !userEl || !passEl || !btn || !alertBox) {
    console.warn('[KORUAL] Missing required DOM elements for login.');
    return;
  }

  // Optional elements
  const envLabel = $('envLabel');
  const envLabel2 = $('envLabel2');
  const apiShort = $('apiShort');
  const mode = $('mode');
  const clock = $('clock');

  function setEnvLabels() {
    const envText = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'DEV' : 'PROD';
    if (envLabel) envLabel.textContent = envText;
    if (envLabel2) envLabel2.textContent = envText;
  }

  function setApiLabel() {
    if (!apiShort) return;
    const s = String(CONFIG.API_BASE || '');
    apiShort.textContent = s
      ? s.replace(/^https?:\/\//, '').slice(0, 40) + (s.length > 44 ? '…' : '')
      : 'unset';
  }

  function setModeLabel() {
    if (!mode) return;
    mode.textContent = CONFIG.MODE_LABEL;
  }

  function startClock() {
    if (!CONFIG.CLOCK || !clock) return;

    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      clock.textContent = `${hh}:${mm}:${ss}`;
    };

    tick();
    setInterval(tick, 1000);
  }

  function showAlert(message, ok = false) {
    alertBox.classList.toggle('ok', !!ok);
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
    alertBox.textContent = '';
    alertBox.classList.remove('ok');
  }

  function setBusy(busy) {
    btn.disabled = !!busy;
    btn.textContent = busy ? 'Authenticating...' : 'Authenticate';
  }

  function normalizeError(j) {
    const err = String(j?.error || 'LOGIN_FAILED');

    if (err === 'LOCKED') {
      return `계정이 잠겼습니다. 해제 시간: ${j.locked_until || 'unknown'}`;
    }
    if (err === 'INACTIVE_USER') {
      return '비활성화된 계정입니다. 관리자에게 문의하세요.';
    }
    if (err === 'INVALID_CREDENTIALS') {
      const fc = (typeof j.fail_count === 'number') ? ` (fail_count: ${j.fail_count})` : '';
      return `인증 실패: 자격 증명이 올바르지 않습니다.${fc}`;
    }
    if (err === 'IP_NOT_ALLOWED') {
      return `허용되지 않은 IP 입니다. (${j.ip || ''})`;
    }
    if (err === 'UNAUTHENTICATED') {
      return '세션이 만료되었습니다. 다시 로그인하세요.';
    }

    return `인증 실패: ${err}`;
  }

  async function login(username, password) {
    const url = `${CONFIG.API_BASE}/auth/login`;

    const r = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const j = await r.json().catch(() => ({}));
    return { status: r.status, json: j };
  }

  // Init
  userEl.value = CONFIG.DEFAULT_USERNAME;
  setEnvLabels();
  setApiLabel();
  setModeLabel();
  startClock();

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = String(userEl.value || '').trim();
    const password = String(passEl.value || '');

    if (!CONFIG.API_BASE || CONFIG.API_BASE.includes('your-cloud-run-url')) {
      showAlert('API_BASE가 설정되지 않았습니다. Cloud Run URL로 교체하세요.');
      return;
    }

    if (!username || !password) {
      showAlert('USERNAME 및 PASSWORD를 입력하세요.');
      return;
    }

    setBusy(true);

    try {
      const { json } = await login(username, password);

      if (!json.ok) {
        showAlert(normalizeError(json));
        return;
      }

      showAlert('인증 성공. 이동합니다...', true);
      setTimeout(() => {
        window.location.href = CONFIG.AFTER_LOGIN_REDIRECT;
      }, 420);

    } catch (err) {
      showAlert('네트워크 오류. API 접근을 확인하세요.');
    } finally {
      setBusy(false);
    }
  });

  // Debug helpers (optional)
  window.KORUAL_LOGIN = {
    config: CONFIG,
    health: async () => {
      const r = await fetch(`${CONFIG.API_BASE}/health`, { credentials: 'include' });
      return await r.json().catch(() => ({}));
    }
  };
})();
