const UPSTREAM_TIMEOUT_MS = 15_000;

function getUpstreamConfig() {
  const url = process.env.KORUAL_GAS_URL;
  const secret = process.env.KORUAL_GAS_SECRET;

  if (!url || !secret) {
    throw new Error("KORUAL_UPSTREAM_NOT_CONFIGURED");
  }

  return { url, secret };
}

async function readUpstreamResponse(response) {
  const text = await response.text();
  try {
    return Response.json(JSON.parse(text), { status: response.status });
  } catch {
    return Response.json(
      { ok: false, error: "BAD_UPSTREAM_RESPONSE", upstreamStatus: response.status },
      { status: 502 }
    );
  }
}

async function proxyToGas({ method, body, query }) {
  const { url, secret } = getUpstreamConfig();
  const upstreamUrl = new URL(url);

  for (const [key, value] of query) {
    upstreamUrl.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(upstreamUrl, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify({ ...body, secret }) : undefined,
      redirect: "follow",
      signal: controller.signal,
    });
    return await readUpstreamResponse(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    return await proxyToGas({ method: "POST", body, query: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROXY_ERROR";
    const status = message === "KORUAL_UPSTREAM_NOT_CONFIGURED" ? 503 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function GET(req) {
  try {
    const query = new URL(req.url).searchParams.entries();
    return await proxyToGas({ method: "GET", body: {}, query });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROXY_ERROR";
    const status = message === "KORUAL_UPSTREAM_NOT_CONFIGURED" ? 503 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
