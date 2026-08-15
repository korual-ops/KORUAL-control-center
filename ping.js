export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const GAS_BASE_URL = process.env.KORUAL_GAS_URL;
  if (!GAS_BASE_URL) {
    return res.status(503).json({ ok: false, error: "KORUAL_UPSTREAM_NOT_CONFIGURED" });
  }
  const GAS_URL = new URL(GAS_BASE_URL);
  GAS_URL.searchParams.set("action", "ping");

  try {
    const r = await fetch(GAS_URL, { method: "GET", redirect: "follow" });
    const text = await r.text();

    let data;
    try { data = JSON.parse(text); }
    catch {
      return res.status(502).json({
        ok: false,
        error: "BAD_UPSTREAM_RESPONSE",
        upstreamStatus: r.status,
        sample: text.slice(0, 300),
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: "PROXY_ERROR", message: String(e) });
  }
}
