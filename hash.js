/*************************************************
 * hash.gs — KORUAL CONTROL CENTER (PW_HASH Admin Utility)
 * Google Apps Script
 *
 * 목적
 * - STAFF 시트에 PW_HASH(SHA-256) 기반 계정 관리 지원
 * - 평문 PASSWORD는 사용하지 않음
 *
 * 전제(권장 STAFF 헤더)
 * - USERNAME
 * - PW_HASH
 * - DISPLAY_NAME (optional)
 * - ROLE (optional)
 * - ACTIVE (optional: Y/N)
 *
 * 포함 기능
 * - hashPassword(pw): SHA-256 hex
 * - setPwHashByUsername(username, plainPassword): 특정 유저 PW_HASH 갱신
 * - createOrUpsertStaffAccount(account): 계정 생성/업데이트 (PW_HASH 자동)
 * - setupStaffHeaders(): STAFF 헤더 자동 세팅(없을 때)
 *
 * 사용 방법(빠른)
 * 1) 스크립트 편집기에서 hash.gs 추가
 * 2) MASTER_SPREADSHEET_ID, SHEET_STAFF 확인
 * 3) 실행 예시:
 *    - setPwHashByUsername("KORUAL", "GUEST")
 *    - createOrUpsertStaffAccount({ username:"KORUAL", password:"GUEST", role:"ADMIN", active:"Y" })
 **************************************************/

/* =========================
   설정
========================= */

const MASTER_SPREADSHEET_ID = "1nHTFcK56EDSjHfCyuuuEPJvuggfl4jxU2-vIymqdp5c";
const SHEET_STAFF = "STAFF";

/** STAFF 기본 헤더(원하는 순서로 조정 가능) */
const STAFF_HEADERS = [
  "USERNAME",
  "PW_HASH",
  "DISPLAY_NAME",
  "ROLE",
  "ACTIVE",
  "FAILED_COUNT",
  "LOCK_UNTIL",
  "LAST_LOGIN_AT",
  "LAST_LOGIN_IP",
  "CREATED_AT",
  "UPDATED_AT"
];

/* =========================
   공통 유틸
========================= */

function _getMasterSS() {
  return SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
}

function _safeTrim(v) {
  return v == null ? "" : String(v).trim();
}

function _nowIsoSeoul() {
  // ISO-like string in Asia/Seoul; Apps Script Date toISOString() is UTC
  const d = new Date();
  return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd'T'HH:mm:ss");
}

function _ensureStaffSheet_() {
  const ss = _getMasterSS();
  let sh = ss.getSheetByName(SHEET_STAFF);
  if (!sh) sh = ss.insertSheet(SHEET_STAFF);
  return sh;
}

function _getHeaders_(sh) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => _safeTrim(h));
  // 빈 헤더만 있을 수 있으니 정리
  const hasAny = headers.some(h => h);
  return hasAny ? headers : [];
}

function _headerIndexMap_(headers) {
  const map = {};
  headers.forEach((h, idx) => { if (h) map[h] = idx + 1; }); // 1-based col index
  return map;
}

/* =========================
   SHA-256 (hex)
========================= */

/**
 * 평문 비밀번호 → SHA-256 hex 문자열
 * @param {string} plain
 * @returns {string} 64-hex
 */
function hashPassword(plain) {
  const pw = _safeTrim(plain);
  if (!pw) throw new Error("hashPassword: empty password");

  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    pw,
    Utilities.Charset.UTF_8
  );

  // bytes is signed in GAS; normalize to 0..255
  const hex = bytes
    .map(b => {
      const v = (b < 0) ? b + 256 : b;
      return ("0" + v.toString(16)).slice(-2);
    })
    .join("");

  return hex;
}

/* =========================
   STAFF 헤더 자동 세팅
========================= */

/**
 * STAFF 시트에 헤더가 없으면 STAFF_HEADERS로 1행을 세팅
 * 이미 헤더가 있으면 누락된 헤더만 뒤에 추가
 */
function setupStaffHeaders() {
  const sh = _ensureStaffSheet_();
  const headers = _getHeaders_(sh);

  if (!headers.length) {
    sh.getRange(1, 1, 1, STAFF_HEADERS.length).setValues([STAFF_HEADERS]);
    sh.setFrozenRows(1);
    return { ok: true, message: "STAFF headers initialized", headers: STAFF_HEADERS };
  }

  const existing = new Set(headers);
  const missing = STAFF_HEADERS.filter(h => !existing.has(h));

  if (missing.length) {
    const startCol = headers.length + 1;
    sh.getRange(1, startCol, 1, missing.length).setValues([missing]);
  }

  sh.setFrozenRows(1);
  return { ok: true, message: "STAFF headers checked", missing };
}

/* =========================
   계정 생성/업데이트
========================= */

/**
 * USERNAME으로 STAFF 행 찾기 (없으면 -1)
 */
function _findStaffRowByUsername_(sh, username) {
  const u = _safeTrim(username);
  if (!u) return -1;

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;

  const headers = _getHeaders_(sh);
  const idxMap = _headerIndexMap_(headers);
  const colU = idxMap["USERNAME"];
  if (!colU) throw new Error("STAFF sheet missing USERNAME header. Run setupStaffHeaders().");

  const values = sh.getRange(2, colU, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (_safeTrim(values[i][0]) === u) return i + 2; // sheet row number
  }
  return -1;
}

/**
 * 특정 USERNAME의 PW_HASH를 갱신
 * - 존재하지 않으면 에러
 */
function setPwHashByUsername(username, plainPassword) {
  const sh = _ensureStaffSheet_();
  setupStaffHeaders();

  const u = _safeTrim(username);
  if (!u) throw new Error("setPwHashByUsername: username required");

  const row = _findStaffRowByUsername_(sh, u);
  if (row < 2) throw new Error("User not found in STAFF: " + u);

  const headers = _getHeaders_(sh);
  const idxMap = _headerIndexMap_(headers);

  const colHash = idxMap["PW_HASH"];
  if (!colHash) throw new Error("STAFF sheet missing PW_HASH header.");

  const colUpdated = idxMap["UPDATED_AT"];
  const hash = hashPassword(plainPassword);

  sh.getRange(row, colHash).setValue(hash);
  if (colUpdated) sh.getRange(row, colUpdated).setValue(_nowIsoSeoul());

  return { ok: true, username: u, pw_hash: hash, row };
}

/**
 * 계정 생성 또는 업데이트 (Upsert)
 * - account.password (plain) 또는 account.pwHash 중 하나 필요
 * - 평문은 저장하지 않고 PW_HASH만 저장
 *
 * @param {Object} account
 * @param {string} account.username (required)
 * @param {string} [account.password] (plain)
 * @param {string} [account.pwHash] (already hashed)
 * @param {string} [account.displayName]
 * @param {string} [account.role]
 * @param {string} [account.active] default "Y"
 */
function createOrUpsertStaffAccount(account) {
  const sh = _ensureStaffSheet_();
  setupStaffHeaders();

  const acc = account || {};
  const username = _safeTrim(acc.username || acc.USERNAME);
  if (!username) throw new Error("createOrUpsertStaffAccount: username required");

  const pwHash =
    _safeTrim(acc.pwHash || acc.PW_HASH) ||
    (acc.password ? hashPassword(acc.password) : "");

  if (!pwHash) throw new Error("createOrUpsertStaffAccount: password or pwHash required");

  const displayName = _safeTrim(acc.displayName || acc.DISPLAY_NAME) || username;
  const role = _safeTrim(acc.role || acc.ROLE) || "USER";
  const active = _safeTrim(acc.active || acc.ACTIVE) || "Y";

  const headers = _getHeaders_(sh);
  const idxMap = _headerIndexMap_(headers);

  const now = _nowIsoSeoul();

  // row 찾기
  const row = _findStaffRowByUsername_(sh, username);

  // 기록할 객체(헤더 기반)
  const rowObj = {
    USERNAME: username,
    PW_HASH: pwHash,
    DISPLAY_NAME: displayName,
    ROLE: role,
    ACTIVE: active,
    UPDATED_AT: now
  };

  // 신규 생성 시 초기값
  if (row < 2) {
    rowObj.CREATED_AT = now;
    rowObj.FAILED_COUNT = 0;
    rowObj.LOCK_UNTIL = "";
    rowObj.LAST_LOGIN_AT = "";
    rowObj.LAST_LOGIN_IP = "";
  }

  // 값 배열 생성(현재 헤더 순서대로)
  const values = headers.map(h => {
    if (!h) return "";
    if (Object.prototype.hasOwnProperty.call(rowObj, h)) return rowObj[h];
    // 업데이트 시 기존값 유지
    return "";
  });

  if (row < 2) {
    // append
    sh.appendRow(values);
    const newRow = sh.getLastRow();
    // appendRow는 빈 칸을 ""로 넣지만, 업데이트 시 빈칸 유지 OK
    return { ok: true, action: "created", row: newRow, username, pw_hash: pwHash };
  } else {
    // update: 빈칸은 기존값 유지하도록 "부분 업데이트"
    headers.forEach((h, i) => {
      if (!h) return;
      if (!Object.prototype.hasOwnProperty.call(rowObj, h)) return;
      sh.getRange(row, i + 1).setValue(rowObj[h]);
    });
    return { ok: true, action: "updated", row, username, pw_hash: pwHash };
  }
}

/* =========================
   빠른 테스트/데모
========================= */

/**
 * 테스트 계정(KORUAL / GUEST) 생성
 * - 평문은 저장되지 않고 PW_HASH만 저장됨
 */
function seedDemoStaffAccount() {
  return createOrUpsertStaffAccount({
    username: "KORUAL",
    password: "GUEST",
    role: "ADMIN",
    active: "Y",
    displayName: "KORUAL Admin"
  });
}
