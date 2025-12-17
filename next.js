// app/api/korual/route.ts
import { NextResponse } from "next/server";

const GAS_URL =
  process.env.KORUAL_GAS_URL ||
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

function passthroughHeaders(res: Response) {
  // 필요 최소만 반환 (쿠키/압축 등은 생략)
  const h = new Headers();
  h.set("Content-Type", res.headers.get("content-type") || "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store");
  return h;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.search; // ?target=...
  const upstream = await fetch(`${GAS_URL}${qs}`, { method: "GET" });
  const body = await upstream.text();
  return new NextResponse(body, { status: upstream.status, headers: passthroughHeaders(upstream) });
}

export async function POST(req: Request) {
  const raw = await req.text(); // 그대로 전달
  const upstream = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
  const body = await upstream.text();
  return new NextResponse(body, { status: upstream.status, headers: passthroughHeaders(upstream) });
}
