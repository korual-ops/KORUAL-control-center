export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body || {};

    if (!username || !password) {
      return Response.json({ ok: false, error: "MISSING_CREDENTIALS" }, { status: 400 });
    }

    const GAS_URL =
      "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec?action=login";

    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      redirect: "follow",
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        { ok: false, error: "BAD_UPSTREAM_RESPONSE", upstreamStatus: r.status, sample: text.slice(0, 300) },
        { status: 502 }
      );
    }

    return Response.json(data, { status: 200 });
  } catch (e) {
    return Response.json({ ok: false, error: "PROXY_ERROR", message: String(e) }, { status: 500 });
  }
}

export async function GET() {
  // 디버깅용: 라우트가 살아있는지 확인
  return Response.json({ ok: false, error: "METHOD_NOT_ALLOWED", hint: "POST /api/korual/login" }, { status: 405 });
}
