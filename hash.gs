/*************************************************
 * hash.gs – KORUAL 공용 해시/유틸
 **************************************************/

function sha256Hex_(input) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function nowIsoSeoul_() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function safeTrim_(v) {
  return v == null ? "" : String(v).trim();
}

function toInt_(v, def) {
  const n = parseInt(v, 10);
  return isNaN(n) ? def : n;
}

function makeRequestId_() {
  const rand = Math.floor(Math.random() * 1e8).toString(16);
  return "KORUAL-" + new Date().getTime().toString(16) + "-" + rand;
}
