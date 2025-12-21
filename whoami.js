// api/korual/whoami.js
// 역할: 브라우저 → (동일 오리진) Vercel → GAS WebApp whoami 프록시

export default async function handler(req, res) {
  // GET만 허용
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED",
    });
  }

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({
      ok: false,
      error: "NO_TOKEN",
    });
  }

  const GAS_WHOAMI_URL =
    "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec" +
    "?action=whoami&token=" +
    encodeURIComponent(token);

  try {
    const r = await fetch(GAS_WHOAMI_URL, {
      method: "GET",
      redirect: "follow",
    });

    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // GAS가 JSON 대신 HTML(권한/에러 페이지)을 반환한 경우
      return res.status(502).json({
        ok: false,
        error: "BAD_UPSTREAM_RESPONSE",
        upstreamStatus: r.status,
        sample: text.slice(0, 300),
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "PROXY_ERROR",
      message: String(e),
    });
  }
}
