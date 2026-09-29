import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const ENGINE_VERSION = "8.1";
const TRANSACTION_VERSION = "3.3";
const QUOTE_TTL_MS = 30 * 60 * 1000;

const allowedOrigins = new Set([
  "https://korual-oneflow-production.up.railway.app",
  "https://korual-r7-fixed-production.up.railway.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

const fallbackCatalog: Record<string, number> = {
  "이사": 142000,
  "입주청소": 98000,
  "청소": 82000,
  "인터넷 설치": 33000,
  "에어컨": 110000,
  "인테리어": 450000,
  "수리·시공": 120000,
  "여행": 235000,
  "웰니스": 80000,
  "커머스 운영": 79000,
  "생활 서비스": 120000
};

const lifestyleServices = new Set([
  "이사", "입주청소", "청소", "인터넷 설치",
  "에어컨", "인테리어", "수리·시공", "생활 서비스"
]);

type PriorityMode = "balanced" | "price" | "trust" | "speed";

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "content-type, x-korual-session",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600"
  };
}

function json(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round1000(value: number) {
  return Math.max(0, Math.round(value / 1000) * 1000);
}

function normalizeBundle(input: unknown, fallback: string) {
  const source = Array.isArray(input) ? input : [fallback];
  const out: string[] = [];
  for (const item of source) {
    const value = cleanText(item, 60);
    if (value && !out.includes(value)) out.push(value);
    if (out.length >= 8) break;
  }
  return out.length ? out : [fallback];
}

function detectServices(request: any) {
  const source = [
    cleanText(request?.service, 100),
    cleanText(request?.raw, 240),
    ...normalizeBundle(request?.bundle, cleanText(request?.service || request?.raw, 100))
  ].join(" ");

  const out: string[] = [];
  const add = (service: string) => {
    if (!out.includes(service)) out.push(service);
  };

  if (/입주\s*청소/.test(source)) add("입주청소");
  if (/이사/.test(source)) add("이사");
  if (/인터넷|와이파이|wifi/i.test(source)) add("인터넷 설치");
  if (/에어컨/.test(source)) add("에어컨");
  if (/인테리어|리모델링/.test(source)) add("인테리어");
  if (/수리|시공|설비|커튼/.test(source)) add("수리·시공");
  if (/여행|항공|숙박|호텔/.test(source)) add("여행");
  if (/웰니스|운동|마사지|케어/.test(source)) add("웰니스");
  if (/커머스|상품|주문|배송/.test(source)) add("커머스 운영");
  if (/청소/.test(source) && !out.includes("입주청소")) add("청소");
  if (!out.length && /생활\s*서비스/.test(source)) add("생활 서비스");
  if (!out.length) add("생활 서비스");
  return out.slice(0, 6);
}

function detectRegion(request: any) {
  const explicit = cleanText(request?.region, 80);
  if (explicit) return explicit;

  const raw = cleanText(request?.raw, 240);
  const regions = [
    "서울", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
  ];
  return regions.find((x) => raw.includes(x)) || "";
}

function normalizePriority(request: any): PriorityMode {
  const mode = cleanText(request?.priority_mode || request?.priorityMode, 20).toLowerCase();
  if (mode === "balanced" || mode === "price" || mode === "trust" || mode === "speed") {
    return mode as PriorityMode;
  }

  const explicit = cleanText(request?.priority, 50).toLowerCase();
  const raw = cleanText(request?.raw, 240).toLowerCase();
  const text = explicit + " " + raw;

  if (explicit === "balanced" || /가격\s*\+\s*신뢰|균형|balanced/.test(text)) return "balanced";
  if (explicit === "price" || /가격\s*우선|저렴|싼|가성비|예산\s*우선/.test(text)) return "price";
  if (explicit === "trust" || /신뢰\s*우선|검증\s*우선|후기\s*우선|안전\s*우선/.test(text)) return "trust";
  if (explicit === "speed" || /속도\s*우선|빠른|급해|긴급|오늘|내일/.test(text)) return "speed";
  return "balanced";
}

function priorityWeights(mode: PriorityMode) {
  return {
    balanced: { price: 0.22, trust: 0.23, rating: 0.12, response: 0.09, experience: 0.08, verification: 0.04, coverage: 0.04, budget: 0.10, evidence: 0.08 },
    price:    { price: 0.38, trust: 0.16, rating: 0.08, response: 0.07, experience: 0.06, verification: 0.04, coverage: 0.04, budget: 0.12, evidence: 0.05 },
    trust:    { price: 0.10, trust: 0.34, rating: 0.17, response: 0.07, experience: 0.10, verification: 0.05, coverage: 0.04, budget: 0.06, evidence: 0.07 },
    speed:    { price: 0.12, trust: 0.18, rating: 0.10, response: 0.27, experience: 0.08, verification: 0.04, coverage: 0.04, budget: 0.08, evidence: 0.09 }
  }[mode];
}

function decisionScoreForMode(candidate: any, mode: PriorityMode) {
  const b = candidate?.score_breakdown;
  if (!b) return Number(candidate?.decision_score ?? candidate?.ranking_score ?? 0);
  const weights = priorityWeights(mode);
  const weighted =
    Number(b.price || 0) * weights.price +
    Number(b.trust || 0) * weights.trust +
    Number(b.rating || 0) * weights.rating +
    Number(b.response || 0) * weights.response +
    Number(b.experience || 0) * weights.experience +
    Number(b.verification || 0) * weights.verification +
    Number(b.coverage || 0) * weights.coverage +
    Number(b.budget || 0) * weights.budget +
    Number(b.evidence || 0) * weights.evidence;

  const confidenceMultiplier =
    0.94 + 0.06 * (clamp(Number(candidate?.confidence_score) || 0) / 100);
  const raw = clamp(weighted * confidenceMultiplier);
  const penalty = clamp(Number(candidate?.uncertainty_penalty) || 0, 0, 8);
  return Number(clamp(raw - penalty).toFixed(2));
}

function rankingSensitivity(candidates: any[]) {
  const modes: PriorityMode[] = ["balanced", "price", "trust", "speed"];
  const winners: Record<string, string | null> = {};
  const margins: Record<string, number | null> = {};

  for (const mode of modes) {
    const ranked = candidates
      .map((c) => ({
        provider_key: c.provider_key,
        score: decisionScoreForMode(c, mode)
      }))
      .sort((a, b) => b.score - a.score);

    winners[mode] = ranked[0]?.provider_key ?? null;
    margins[mode] = ranked.length > 1
      ? Number(Math.max(0, ranked[0].score - ranked[1].score).toFixed(2))
      : null;
  }

  const currentTop = candidates[0]?.provider_key ?? null;
  const sameAsCurrent = modes.filter((mode) => winners[mode] === currentTop).length;
  const stability = modes.length ? sameAsCurrent / modes.length : 0;
  const uniqueWinners = new Set(Object.values(winners).filter(Boolean)).size;

  return {
    stability: Number(stability.toFixed(2)),
    level: stability === 1 ? "robust" : stability >= 0.75 ? "stable" : stability >= 0.5 ? "sensitive" : "highly_sensitive",
    unique_winners: uniqueWinners,
    winners,
    margins
  };
}

function providerCoverage(provider: any, services: string[]) {
  const categories = new Set(
    (Array.isArray(provider?.service_categories) ? provider.service_categories : [])
      .map((x: unknown) => cleanText(x, 60))
  );

  const items = services.map((service) => {
    if (categories.has(service)) return { service, supported: true, specificity: 100, source: "exact" };
    if (lifestyleServices.has(service) && categories.has("생활 서비스")) {
      return { service, supported: true, specificity: 72, source: "생활 서비스" };
    }
    return { service, supported: false, specificity: 0, source: "unsupported" };
  });

  const supportedCount = items.filter((x) => x.supported).length;
  const score = items.length
    ? Math.round(items.reduce((sum, x) => sum + x.specificity, 0) / items.length)
    : 0;

  return {
    all_supported: supportedCount === items.length && items.length > 0,
    supported_count: supportedCount,
    requested_count: items.length,
    score,
    items
  };
}

function providerSupports(provider: any, services: string[]) {
  return providerCoverage(provider, services).all_supported;
}

function budgetFitScore(amount: number, budgetCap: number | null) {
  if (budgetCap == null || budgetCap <= 0) return 100;
  if (amount <= budgetCap) return 100;
  const overRatio = (amount - budgetCap) / Math.max(1, budgetCap);
  return Math.round(clamp(100 - overRatio * 220));
}

function providerCoversRegion(provider: any, region: string) {
  const regions = (Array.isArray(provider?.regions) ? provider.regions : [])
    .map((x: unknown) => cleanText(x, 80));
  if (!region) return true;
  if (regions.includes("전국")) return true;
  return regions.some((x: string) => region.includes(x) || x.includes(region));
}

function responseScore(minutes: unknown) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return 55;
  if (value <= 10) return 100;
  if (value <= 20) return 90;
  if (value <= 45) return 78;
  if (value <= 90) return 65;
  if (value <= 180) return 50;
  return 38;
}

function ratingScore(rating: unknown, reviews: unknown) {
  const r = clamp(Number(rating) || 0, 0, 5);
  const n = Math.max(0, Number(reviews) || 0);
  const priorRating = 4.5;
  const priorWeight = 40;
  const adjusted = (n * r + priorWeight * priorRating) / (n + priorWeight);
  return clamp(adjusted / 5 * 100);
}

function experienceScore(jobs: unknown) {
  const n = Math.max(0, Number(jobs) || 0);
  return clamp(45 + 55 * (1 - Math.exp(-n / 250)));
}

function providerDataConfidence(provider: any) {
  const reviews = Math.max(0, Number(provider?.review_count) || 0);
  const jobs = Math.max(0, Number(provider?.completed_jobs) || 0);
  const hasResponse = Number.isFinite(Number(provider?.avg_response_minutes));
  const hasRating = Number(provider?.rating) > 0;

  let score = 0;
  if (provider?.verified) score += 25;
  score += Math.min(25, reviews / 200 * 25);
  score += Math.min(20, jobs / 300 * 20);
  if (hasResponse) score += 15;
  if (hasRating) score += 15;
  return Math.round(clamp(score));
}

function isParetoEfficient(candidate: any, candidates: any[]) {
  const responseValue = (x: any) =>
    x.response_minutes == null ? Number.POSITIVE_INFINITY : Number(x.response_minutes);

  return !candidates.some((other) => {
    if (other === candidate) return false;

    const noWorse =
      Number(other.amount) <= Number(candidate.amount) &&
      Number(other.trust) >= Number(candidate.trust) &&
      Number(other.rating) >= Number(candidate.rating) &&
      responseValue(other) <= responseValue(candidate);

    const strictlyBetter =
      Number(other.amount) < Number(candidate.amount) ||
      Number(other.trust) > Number(candidate.trust) ||
      Number(other.rating) > Number(candidate.rating) ||
      responseValue(other) < responseValue(candidate);

    return noWorse && strictlyBetter;
  });
}

function decisionConfidence(candidates: any[]) {
  if (candidates.length < 2) {
    return { score_gap: null, level: "single_candidate", note: "비교 가능한 후보가 1개입니다." };
  }
  const first = Number(candidates[0].decision_score ?? candidates[0].ranking_score);
  const second = Number(candidates[1].decision_score ?? candidates[1].ranking_score);
  const gap = Math.max(0, first - second);
  if (gap < 1.5) return { score_gap: Number(gap.toFixed(2)), level: "close", note: "상위 후보 간 점수 차이가 매우 작습니다." };
  if (gap < 4) return { score_gap: Number(gap.toFixed(2)), level: "moderate", note: "상위 후보 간 차이가 크지 않습니다." };
  return { score_gap: Number(gap.toFixed(2)), level: "separated", note: "현재 기준에서는 상위 후보 간 차이가 비교적 분명합니다." };
}

function buildReasons(candidate: any, candidates: any[]) {
  const reasons: string[] = [];
  const minPrice = Math.min(...candidates.map((x) => Number(x.amount)));
  const maxTrust = Math.max(...candidates.map((x) => Number(x.trust)));
  const fastest = Math.min(...candidates.map((x) =>
    x.response_minutes == null ? Number.POSITIVE_INFINITY : Number(x.response_minutes)
  ));

  if (candidate.budget_fit) reasons.push("입력 예산 범위 충족");
  if (candidate.amount <= minPrice * 1.03) reasons.push("가격 기준 강점");
  if (candidate.trust === maxTrust) reasons.push("Trust 기준 강점");
  if (candidate.response_minutes != null && candidate.response_minutes === fastest) reasons.push("응답 기준 강점");
  if (candidate.coverage_score >= 95) reasons.push("서비스 전문 범위 일치");
  if (candidate.evidence_score >= 75) reasons.push("가격 근거 데이터 양호");
  if (candidate.evidence_score < 70) reasons.push("가격 근거가 아직 제한적");
  if (candidate.confidence_score < 70) reasons.push("데이터 신뢰도 추가 확인");
  if (Number(candidate.uncertainty_penalty) >= 4) reasons.push("불확실성 보수 적용");
  if (!reasons.length) reasons.push("다중 기준 균형 후보");
  return reasons.slice(0, 3);
}

function candidateRoles(candidate: any, candidates: any[]) {
  const roles: string[] = [];
  const minPrice = Math.min(...candidates.map((x) => Number(x.amount)));
  const maxTrust = Math.max(...candidates.map((x) => Number(x.trust)));
  const fastest = Math.min(...candidates.map((x) =>
    x.response_minutes == null ? Number.POSITIVE_INFINITY : Number(x.response_minutes)
  ));
  const maxExperience = Math.max(...candidates.map((x) => Number(x.completed_jobs)));

  if (candidate.amount === minPrice) roles.push("가격 기준 후보");
  if (candidate.trust === maxTrust) roles.push("신뢰 기준 후보");
  if (candidate.response_minutes === fastest) roles.push("응답 기준 후보");
  if (candidate.completed_jobs === maxExperience) roles.push("경험 기준 후보");
  if (!roles.length) roles.push("균형 비교 후보");
  return roles.slice(0, 3);
}

function selectDiverseShortlist(sorted: any[], limit = 3) {
  const selected: any[] = [];
  const pareto = sorted.filter((x) => x.pareto_efficient);
  const pool = pareto.length >= Math.min(2, limit) ? pareto : sorted;

  const add = (candidate: any) => {
    if (candidate && !selected.some((x) => x.provider_key === candidate.provider_key)) selected.push(candidate);
  };

  add(pool[0]);
  add([...pool].sort((a, b) =>
    Number(b.budget_fit) - Number(a.budget_fit) ||
    a.amount - b.amount
  )[0]);
  add([...pool].sort((a, b) =>
    b.trust - a.trust ||
    b.evidence_score - a.evidence_score ||
    (a.response_minutes ?? 999999) - (b.response_minutes ?? 999999)
  )[0]);
  add([...pool].sort((a, b) =>
    (a.response_minutes ?? 999999) - (b.response_minutes ?? 999999)
  )[0]);

  for (const c of sorted) {
    if (selected.length >= limit) break;
    add(c);
  }
  return selected.slice(0, limit);
}

function benchmarkFor(service: string, region: string, rows: any[]) {
  const exact = rows.find((x) => x.service_category === service && region && x.region === region);
  const national = rows.find((x) => x.service_category === service && x.region === "전국");
  const row = exact || national;
  if (row) {
    return {
      service,
      region: row.region,
      median_amount: Number(row.median_amount) || fallbackCatalog[service] || fallbackCatalog["생활 서비스"],
      min_amount: Number(row.min_amount) || 0,
      max_amount: Number(row.max_amount) || 0,
      sample_count: Number(row.sample_count) || 0,
      confidence_score: clamp(Number(row.confidence_score) || 0),
      source: cleanText(row.source, 80)
    };
  }

  const median = fallbackCatalog[service] || fallbackCatalog["생활 서비스"];
  return {
    service,
    region: "전국",
    median_amount: median,
    min_amount: round1000(median * 0.85),
    max_amount: round1000(median * 1.20),
    sample_count: 0,
    confidence_score: 20,
    source: "code_fallback"
  };
}

function pricingProfile(providerId: string, service: string, profiles: any[]) {
  const exact = profiles.find((x) => x.provider_id === providerId && x.service_category === service);
  const wildcard = profiles.find((x) => x.provider_id === providerId && x.service_category === "*");
  const row = exact || wildcard;
  return {
    multiplier: row ? Number(row.multiplier) || 1 : 1,
    confidence_score: row ? clamp(Number(row.confidence_score) || 0) : 20,
    source: row ? cleanText(row.source, 80) : "default_1x"
  };
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlToString(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

let quoteKeyPromise: Promise<CryptoKey> | null = null;
function getQuoteKey() {
  if (!quoteKeyPromise) {
    quoteKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SERVICE_ROLE_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return quoteKeyPromise;
}

async function signQuote(payload: any) {
  const body = stringToBase64Url(JSON.stringify(payload));
  const key = await getQuoteKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return body + "." + bytesToBase64Url(new Uint8Array(sig));
}

async function verifyQuoteToken(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const key = await getQuoteKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;

    const payload = JSON.parse(base64UrlToString(body));
    if (!payload || payload.v !== 1) return null;
    if (!payload.provider_key || !Number.isFinite(Number(payload.amount))) return null;
    if (!Array.isArray(payload.services) || !payload.services.length) return null;
    if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sameServices(a: string[], b: string[]) {
  const x = [...a].map(String).sort();
  const y = [...b].map(String).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function quoteRegionMatches(quotedRegion: unknown, bookingRegion: string) {
  const quoted = cleanText(quotedRegion, 80);
  const booking = cleanText(bookingRegion, 80);
  if (!quoted) return true;
  return booking.includes(quoted) || quoted.includes(booking);
}

async function hashValue(value: string) {
  const salt = SERVICE_ROLE_KEY.slice(0, 24);
  const bytes = new TextEncoder().encode(value + "|" + salt);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkRate(ipHash: string, action: string) {
  const max = action === "book" ? 8 : action === "quotes" ? 120 : 180;
  const { data, error } = await db.rpc("consume_api_rate_limit", {
    p_ip_hash: ipHash,
    p_action: action,
    p_max: max,
    p_window_minutes: 60
  });
  if (error) throw error;
  return data === true;
}

function seoulDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function validateDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const selected = new Date(value + "T00:00:00Z");
  if (Number.isNaN(selected.getTime())) return false;
  const todayString = seoulDateString();
  const floor = new Date(todayString + "T00:00:00Z");
  const max = new Date(floor.getTime() + 366 * 24 * 60 * 60 * 1000);
  return selected >= floor && selected <= max;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ ok: false, error: "ORIGIN_NOT_ALLOWED" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (req.method !== "POST") {
    return json(origin, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 16000) {
    return json(origin, { ok: false, error: "PAYLOAD_TOO_LARGE" }, 413);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(origin, { ok: false, error: "INVALID_JSON" }, 400);
  }

  const action = cleanText(body?.action, 24);
  const sessionId = cleanText(
    req.headers.get("x-korual-session") || body?.session_id,
    80
  );

  if (!/^[A-Za-z0-9_-]{12,80}$/.test(sessionId)) {
    return json(origin, { ok: false, error: "INVALID_SESSION" }, 400);
  }

  const forwarded =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const clientIp = forwarded.split(",")[0].trim().slice(0, 80);
  const ipHash = await hashValue(clientIp);

  try {
    if (!(await checkRate(ipHash, action || "unknown"))) {
      return json(origin, { ok: false, error: "RATE_LIMITED" }, 429);
    }

    if (action === "health") {
      return json(origin, {
        ok: true,
        service: "korual-public-api",
        version: 12,
        engine_version: ENGINE_VERSION,
        transaction_version: TRANSACTION_VERSION,
        pricing: "database_profiles",
        quote_tokens: true,
        server_booking_state: true,
        availability_engine: true,
        slot_holds: true,
        customer_cancel: true,
        atomic_reschedule: true,
        provider_confirmation_sla: true,
        business_hours_sla: true,
        background_sla_sweeper: true,
        recovery_engine: true,
        atomic_recovery_swap: true,
        provider_metrics_min_samples: 20
      });
    }

    if (action === "quotes") {
      const request = body?.request ?? {};
      const service = cleanText(request.service || request.raw, 100);
      if (!service) return json(origin, { ok: false, error: "SERVICE_REQUIRED" }, 400);

      const services = detectServices(request);
      const region = detectRegion(request);
      const priorityMode = normalizePriority(request);
      const weights = priorityWeights(priorityMode);

      const rawBudgetCap = Number(request?.budget_cap ?? request?.budgetCap);
      const budgetCap = Number.isFinite(rawBudgetCap) && rawBudgetCap > 0
        ? Math.min(Math.round(rawBudgetCap), 100000000)
        : null;
      const excludedProviderKeys = new Set(
        (Array.isArray(request?.exclude_provider_keys) ? request.exclude_provider_keys : [])
          .map((x: unknown) => cleanText(x, 120))
          .filter(Boolean)
          .slice(0, 8)
      );

      const [providerResult, benchmarkResult] = await Promise.all([
        db.from("providers")
          .select("id,provider_key,name,rating,review_count,verified,korual_score,avg_response_minutes,completed_jobs,service_categories,regions,is_demo")
          .eq("active", true)
          .eq("verified", true),
        db.from("price_benchmarks")
          .select("service_category,region,min_amount,median_amount,max_amount,sample_count,confidence_score,source")
          .in("service_category", services)
          .in("region", region ? [region, "전국"] : ["전국"])
      ]);

      if (providerResult.error) throw providerResult.error;
      if (benchmarkResult.error) throw benchmarkResult.error;

      const eligibleProviders = (providerResult.data ?? []).filter((p: any) =>
        !excludedProviderKeys.has(cleanText(p.provider_key, 120)) &&
        providerSupports(p, services) &&
        providerCoversRegion(p, region)
      );

      if (!eligibleProviders.length) {
        return json(origin, {
          ok: true,
          request: { service, services, region, priority_mode: priorityMode, budget_cap: budgetCap, excluded_provider_keys: [...excludedProviderKeys] },
          engine_version: ENGINE_VERSION,
          quotes: [],
          notice: "NO_ELIGIBLE_PROVIDER"
        });
      }

      const providerIds = eligibleProviders.map((p: any) => p.id);
      const { data: profiles, error: profileError } = await db
        .from("provider_pricing_profiles")
        .select("provider_id,service_category,multiplier,confidence_score,source")
        .in("provider_id", providerIds);

      if (profileError) throw profileError;

      const benchmarks = services.map((s) =>
        benchmarkFor(s, region, benchmarkResult.data ?? [])
      );

      const candidates = eligibleProviders.map((p: any) => {
        const lineItems = benchmarks.map((benchmark) => {
          const profile = pricingProfile(p.id, benchmark.service, profiles ?? []);
          return {
            service: benchmark.service,
            benchmark_region: benchmark.region,
            benchmark_median: benchmark.median_amount,
            multiplier: Number(profile.multiplier.toFixed(3)),
            amount: round1000(benchmark.median_amount * profile.multiplier),
            benchmark_confidence: benchmark.confidence_score,
            pricing_confidence: profile.confidence_score,
            benchmark_source: benchmark.source,
            pricing_source: profile.source
          };
        });

        const amount = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const benchmarkConfidence = lineItems.length
          ? lineItems.reduce((sum, item) => sum + item.benchmark_confidence, 0) / lineItems.length
          : 20;
        const pricingConfidence = lineItems.length
          ? lineItems.reduce((sum, item) => sum + item.pricing_confidence, 0) / lineItems.length
          : 20;
        const providerConfidence = providerDataConfidence(p);
        const coverage = providerCoverage(p, services);
        const evidenceScore = Math.round(clamp(
          benchmarkConfidence * 0.65 +
          pricingConfidence * 0.35
        ));
        const confidenceScore = Math.round(clamp(
          providerConfidence * 0.55 +
          evidenceScore * 0.45
        ));

        return {
          key: p.provider_key || p.id,
          provider_key: p.provider_key || p.id,
          provider_name: p.name,
          provider_id: p.id,
          amount,
          trust: clamp(Number(p.korual_score ?? 0)),
          rating: clamp(Number(p.rating ?? 0), 0, 5),
          review_count: Math.max(0, Number(p.review_count ?? 0)),
          response_minutes: p.avg_response_minutes == null ? null : Math.max(0, Number(p.avg_response_minutes)),
          completed_jobs: Math.max(0, Number(p.completed_jobs ?? 0)),
          verified: Boolean(p.verified),
          confidence_score: confidenceScore,
          evidence_score: evidenceScore,
          coverage_score: coverage.score,
          coverage_detail: coverage.items,
          line_items: lineItems,
          budget_fit: budgetCap == null ? true : amount <= budgetCap,
          budget_score: budgetFitScore(amount, budgetCap),
          demo: Boolean(p.is_demo)
        };
      });

      const prices = candidates.map((c: any) => c.amount);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      for (const c of candidates) {
        const rawPriceScore = maxPrice === minPrice
          ? 85
          : 100 - ((c.amount - minPrice) / (maxPrice - minPrice)) * 35;
        // Weak pricing evidence must not create a falsely precise price advantage.
        // Shrink toward a neutral comparison score when benchmark/profile evidence is sparse.
        const evidenceFactor = clamp(Number(c.evidence_score) || 0) / 100;
        const calibratedPriceScore = 75 + (rawPriceScore - 75) * evidenceFactor;

        const breakdown = {
          price: Math.round(clamp(calibratedPriceScore)),
          trust: Math.round(clamp(c.trust)),
          rating: Math.round(ratingScore(c.rating, c.review_count)),
          response: Math.round(responseScore(c.response_minutes)),
          experience: Math.round(experienceScore(c.completed_jobs)),
          verification: c.verified ? 100 : 40,
          coverage: Math.round(clamp(c.coverage_score)),
          budget: Math.round(clamp(c.budget_score)),
          evidence: Math.round(clamp(c.evidence_score))
        };

        const weighted =
          breakdown.price * weights.price +
          breakdown.trust * weights.trust +
          breakdown.rating * weights.rating +
          breakdown.response * weights.response +
          breakdown.experience * weights.experience +
          breakdown.verification * weights.verification +
          breakdown.coverage * weights.coverage +
          breakdown.budget * weights.budget +
          breakdown.evidence * weights.evidence;

        const confidenceMultiplier = 0.94 + 0.06 * (c.confidence_score / 100);
        c.ranking_score = Number(clamp(weighted * confidenceMultiplier).toFixed(2));

        // Conservative decision score: do not let sparse evidence look as certain as dense evidence.
        // This is an uncertainty penalty, not a statistical confidence interval.
        const uncertaintyPenalty =
          ((100 - clamp(c.confidence_score)) * 0.05) +
          ((100 - clamp(c.evidence_score)) * 0.03);
        c.uncertainty_penalty = Number(clamp(uncertaintyPenalty, 0, 8).toFixed(2));
        c.decision_score = Number(clamp(c.ranking_score - c.uncertainty_penalty).toFixed(2));
        c.score_breakdown = breakdown;
      }

      candidates.sort((a: any, b: any) =>
        b.decision_score - a.decision_score ||
        b.ranking_score - a.ranking_score ||
        b.confidence_score - a.confidence_score ||
        a.amount - b.amount
      );

      candidates.forEach((c: any, index: number) => {
        c.rank = index + 1;
        c.pareto_efficient = isParetoEfficient(c, candidates);
        c.roles = candidateRoles(c, candidates);
        c.label = c.roles[0];
        c.reasons = buildReasons(c, candidates);
      });

      const decision = decisionConfidence(candidates);
      const sensitivity = rankingSensitivity(candidates);
      const budgetFitCount = candidates.filter((c: any) => c.budget_fit).length;
      const topCandidate = candidates[0];
      const usesFallbackPricing = Boolean(topCandidate?.line_items?.some((x: any) =>
        x.benchmark_source === "code_fallback" || x.pricing_source === "default_1x"
      ));
      const decisionStatus =
        budgetCap != null && budgetFitCount === 0 ? "review_budget" :
        Number(topCandidate?.confidence_score ?? 0) < 60 || usesFallbackPricing ? "low_evidence" :
        decision.level === "close" ? "compare_tradeoffs" :
        "ready";

      const decisionContext = {
        ...decision,
        status: decisionStatus,
        sensitivity,
        budget: {
          cap: budgetCap,
          fit_count: budgetFitCount,
          status: budgetCap == null ? "not_set" : budgetFitCount > 0 ? "matched" : "no_match"
        },
        evidence: {
          top_confidence: Number(topCandidate?.confidence_score ?? 0),
          top_evidence: Number(topCandidate?.evidence_score ?? 0),
          fallback_pricing_used: usesFallbackPricing
        },
        hard_constraints: {
          verified: true,
          full_service_coverage: true,
          region_match: Boolean(region)
        },
        pool_size: candidates.length
      };

      const shortlist = selectDiverseShortlist(candidates, 3);
      for (let i = 0; i < shortlist.length; i++) {
        const c = shortlist[i];
        c.presentation_order = i + 1;
        c.quote_token = await signQuote({
          v: 1,
          provider_key: c.provider_key,
          amount: c.amount,
          services,
          region: region || null,
          priority_mode: priorityMode,
          engine_version: ENGINE_VERSION,
          exp: Date.now() + QUOTE_TTL_MS
        });
      }

      let recommendationRunId: string | null = null;
      try {
        const { data: run } = await db
          .from("recommendation_runs")
          .insert({
            session_hash: await hashValue(sessionId),
            engine_version: ENGINE_VERSION,
            priority_mode: priorityMode,
            services,
            candidate_count: candidates.length,
            top_score: Number(candidates[0]?.decision_score ?? candidates[0]?.ranking_score ?? 0),
            score_gap: decision.score_gap,
            decision_confidence: decision.level,
            candidates: candidates.map((c: any) => ({
              provider_key: c.provider_key,
              amount: c.amount,
              ranking_score: c.ranking_score,
              decision_score: c.decision_score,
              uncertainty_penalty: c.uncertainty_penalty,
              confidence_score: c.confidence_score,
              evidence_score: c.evidence_score,
              pareto_efficient: c.pareto_efficient,
              roles: c.roles,
              score_breakdown: c.score_breakdown
            })),
            metadata: {
              source: "korual-public-api",
              pricing_basis: "database_benchmark_profiles",
              region: region || null,
              budget_cap: budgetCap,
              budget_fit_count: budgetFitCount,
              decision_status: decisionStatus,
              top_confidence: Number(topCandidate?.confidence_score ?? 0),
              top_evidence: Number(topCandidate?.evidence_score ?? 0),
              top_ranking_score: Number(topCandidate?.ranking_score ?? 0),
              top_decision_score: Number(topCandidate?.decision_score ?? 0),
              top_uncertainty_penalty: Number(topCandidate?.uncertainty_penalty ?? 0),
              recommendation_stability: sensitivity.stability,
              sensitivity_level: sensitivity.level,
              winner_by_mode: sensitivity.winners,
              fallback_pricing_used: usesFallbackPricing,
              shortlist_provider_keys: shortlist.map((x: any) => x.provider_key)
            }
          })
          .select("id")
          .single();
        recommendationRunId = run?.id ?? null;
      } catch (auditError) {
        console.warn("recommendation_audit_failed", auditError);
      }

      return json(origin, {
        ok: true,
        request: {
          service,
          services,
          region,
          priority_mode: priorityMode,
          priority: cleanText(request.priority, 40),
          budget_cap: budgetCap,
          bundle: normalizeBundle(request.bundle, service),
          excluded_provider_keys: [...excludedProviderKeys]
        },
        engine_version: ENGINE_VERSION,
        recommendation_run_id: recommendationRunId,
        decision_context: decisionContext,
        pricing_basis: "database_benchmark_profiles",
        quote_expires_in_seconds: Math.round(QUOTE_TTL_MS / 1000),
        quotes: shortlist
      });
    }

    if (action === "track") {
      const eventType = cleanText(body?.event_type, 32);
      const allowed = new Set(["impression", "select", "booking_intent", "booking_failure"]);
      if (!allowed.has(eventType)) {
        return json(origin, { ok: false, error: "TRACK_EVENT_INVALID" }, 400);
      }

      const runId = cleanText(body?.recommendation_run_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(runId)) {
        return json(origin, { ok: false, error: "TRACK_RUN_INVALID" }, 400);
      }

      const sessionHash = await hashValue(sessionId);
      const { data: run, error: runError } = await db
        .from("recommendation_runs")
        .select("id,session_hash,engine_version")
        .eq("id", runId)
        .eq("session_hash", sessionHash)
        .single();

      if (runError || !run) {
        return json(origin, { ok: false, error: "TRACK_RUN_NOT_FOUND" }, 404);
      }

      const providerKey = cleanText(body?.provider_key, 120) || null;
      const rawPosition = Number(body?.position);
      const position = Number.isInteger(rawPosition) && rawPosition >= 1 && rawPosition <= 20
        ? rawPosition
        : null;
      const page = cleanText(body?.page, 40);
      const decisionStatus = cleanText(body?.decision_status, 40);

      const { error: trackError } = await db
        .from("recommendation_events")
        .insert({
          run_id: run.id,
          session_hash: sessionHash,
          event_type: eventType,
          provider_key: providerKey,
          position,
          policy_version: run.engine_version || ENGINE_VERSION,
          metadata: {
            page: page || null,
            decision_status: decisionStatus || null
          }
        });

      if (trackError) throw trackError;
      return json(origin, { ok: true, tracked: true });
    }

    if (action === "availability") {
      const desiredDate = cleanText(body?.desired_date, 10);
      if (!validateDate(desiredDate)) {
        return json(origin, { ok: false, error: "DATE_INVALID" }, 400);
      }

      const token = cleanText(body?.quote_token, 6000);
      if (!token) return json(origin, { ok: false, error: "QUOTE_TOKEN_REQUIRED" }, 409);

      const payload = await verifyQuoteToken(token);
      if (!payload) return json(origin, { ok: false, error: "QUOTE_TOKEN_INVALID" }, 409);

      const providerKey = cleanText(payload.provider_key, 120);
      const { data: provider, error: providerError } = await db
        .from("providers")
        .select("id,provider_key,name,active,verified,is_demo")
        .eq("provider_key", providerKey)
        .eq("active", true)
        .eq("verified", true)
        .single();

      if (providerError || !provider) {
        return json(origin, { ok: false, error: "PROVIDER_UNAVAILABLE" }, 409);
      }

      const { data: slots, error: slotError } = await db.rpc("get_provider_available_slots", {
        p_provider_id: provider.id,
        p_date: desiredDate
      });
      if (slotError) throw slotError;

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        provider: {
          provider_key: provider.provider_key,
          name: provider.name,
          demo: Boolean(provider.is_demo)
        },
        desired_date: desiredDate,
        timezone: "Asia/Seoul",
        hold_minutes: 10,
        slots: (slots ?? []).map((s: any) => ({
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          capacity: Number(s.capacity),
          remaining: Number(s.remaining)
        }))
      });
    }

    if (action === "hold_slot") {
      const token = cleanText(body?.quote_token, 6000);
      const startsAt = cleanText(body?.starts_at, 64);
      if (!token) return json(origin, { ok: false, error: "QUOTE_TOKEN_REQUIRED" }, 409);
      if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
        return json(origin, { ok: false, error: "SLOT_INVALID" }, 400);
      }

      const payload = await verifyQuoteToken(token);
      if (!payload) return json(origin, { ok: false, error: "QUOTE_TOKEN_INVALID" }, 409);

      const providerKey = cleanText(payload.provider_key, 120);
      const { data: provider, error: providerError } = await db
        .from("providers")
        .select("id,provider_key,name,active,verified")
        .eq("provider_key", providerKey)
        .eq("active", true)
        .eq("verified", true)
        .single();

      if (providerError || !provider) {
        return json(origin, { ok: false, error: "PROVIDER_UNAVAILABLE" }, 409);
      }

      const { data: hold, error: holdError } = await db.rpc("hold_provider_slot", {
        p_provider_id: provider.id,
        p_session_id: sessionId,
        p_starts_at: startsAt
      });

      if (holdError) {
        const msg = String(holdError.message || "").toLowerCase();
        if (msg.includes("slot unavailable")) {
          return json(origin, { ok: false, error: "SLOT_UNAVAILABLE" }, 409);
        }
        throw holdError;
      }

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        hold,
        timezone: "Asia/Seoul"
      });
    }

    if (action === "release_slot") {
      const holdId = cleanText(body?.hold_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(holdId)) {
        return json(origin, { ok: false, error: "SLOT_HOLD_INVALID" }, 400);
      }

      const { data: hold, error: holdError } = await db
        .from("provider_slot_holds")
        .select("id,status,session_id")
        .eq("id", holdId)
        .eq("session_id", sessionId)
        .single();

      if (holdError || !hold) {
        return json(origin, { ok: false, error: "SLOT_HOLD_NOT_FOUND" }, 404);
      }

      if (hold.status === "held") {
        const { error: releaseError } = await db
          .from("provider_slot_holds")
          .update({ status: "released", updated_at: new Date().toISOString() })
          .eq("id", hold.id)
          .eq("status", "held");
        if (releaseError) throw releaseError;
      }

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        released: hold.status === "held"
      });
    }

    if (action === "book") {
      const request = body?.request ?? {};
      const customer = body?.customer ?? {};
      const service = cleanText(request.service || request.raw, 100);
      const requestServices = detectServices(request);
      const priorityMode = normalizePriority(request);

      if (!service) {
        return json(origin, { ok: false, error: "INVALID_BOOKING_REQUEST" }, 400);
      }

      const name = cleanText(customer.name, 40);
      const phone = cleanText(customer.phone, 24).replace(/[^0-9]/g, "");
      const region = cleanText(customer.region, 80);
      const desiredDate = cleanText(customer.desired_date, 10);
      const slotHoldId = cleanText(body?.slot_hold_id, 80);
      const idempotencyKey = cleanText(body?.idempotency_key, 80);

      if (name.length < 2) return json(origin, { ok: false, error: "NAME_REQUIRED" }, 400);
      if (phone.length < 10 || phone.length > 11) return json(origin, { ok: false, error: "PHONE_INVALID" }, 400);
      if (region.length < 2) return json(origin, { ok: false, error: "REGION_REQUIRED" }, 400);
      if (!validateDate(desiredDate)) return json(origin, { ok: false, error: "DATE_INVALID" }, 400);
      if (!/^[0-9a-f-]{36}$/i.test(slotHoldId)) {
        return json(origin, { ok: false, error: "SLOT_HOLD_REQUIRED" }, 409);
      }
      if (!/^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey)) {
        return json(origin, { ok: false, error: "IDEMPOTENCY_INVALID" }, 400);
      }

      let providerKey = "";
      let amount = 0;
      let tokenServices: string[] = [];

      const token = cleanText(body?.quote_token, 6000);
      if (token) {
        const payload = await verifyQuoteToken(token);
        if (!payload) return json(origin, { ok: false, error: "QUOTE_TOKEN_INVALID" }, 409);

        providerKey = cleanText(payload.provider_key, 120);
        amount = Math.round(Number(payload.amount));
        tokenServices = payload.services.map((x: unknown) => cleanText(x, 60));

        if (!sameServices(tokenServices, requestServices)) {
          return json(origin, { ok: false, error: "QUOTE_SERVICE_MISMATCH" }, 409);
        }
        if (!quoteRegionMatches(payload.region, region)) {
          return json(origin, { ok: false, error: "QUOTE_REGION_MISMATCH" }, 409);
        }
      } else {
        // Backward compatibility for stale clients. Remove after all clients use quote_token.
        const legacy = cleanText(body?.quote_key, 20);
        const legacyMap: Record<string, { provider_key: string; multiplier: number }> = {
          best: { provider_key: "demo_best", multiplier: 1.00 },
          value: { provider_key: "demo_value", multiplier: 0.90 },
          premium: { provider_key: "demo_premium", multiplier: 1.19 }
        };
        const fallback = legacyMap[legacy];
        if (!fallback) return json(origin, { ok: false, error: "QUOTE_TOKEN_REQUIRED" }, 409);

        providerKey = fallback.provider_key;
        tokenServices = requestServices;
        amount = tokenServices.reduce((sum, s) =>
          sum + round1000((fallbackCatalog[s] || fallbackCatalog["생활 서비스"]) * fallback.multiplier), 0
        );
      }

      const { data: provider, error: providerError } = await db
        .from("providers")
        .select("id,provider_key,name,verified,active,is_demo,service_categories,regions")
        .eq("provider_key", providerKey)
        .eq("active", true)
        .eq("verified", true)
        .single();

      if (providerError || !provider) {
        return json(origin, { ok: false, error: "PROVIDER_UNAVAILABLE" }, 409);
      }
      if (!providerSupports(provider, tokenServices)) {
        return json(origin, { ok: false, error: "SERVICE_NOT_SUPPORTED" }, 409);
      }
      if (!providerCoversRegion(provider, region)) {
        return json(origin, { ok: false, error: "REGION_NOT_SUPPORTED" }, 409);
      }

      const { data, error } = await db.rpc("create_beta_booking_v2", {
        p_session_id: sessionId,
        p_idempotency_key: idempotencyKey,
        p_services: tokenServices,
        p_region: region,
        p_desired_date: desiredDate,
        p_customer_name: name,
        p_phone: phone,
        p_provider_key: providerKey,
        p_amount: amount,
        p_slot_hold_id: slotHoldId,
        p_message:
          "KORUAL quote token; engine=" + ENGINE_VERSION +
          "; transaction=" + TRANSACTION_VERSION +
          "; priority=" + priorityMode
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("slot hold expired")) {
          return json(origin, { ok: false, error: "SLOT_HOLD_EXPIRED" }, 409);
        }
        if (msg.includes("slot hold inactive")) {
          return json(origin, { ok: false, error: "SLOT_HOLD_INACTIVE" }, 409);
        }
        if (msg.includes("slot hold not found") || msg.includes("slot hold required")) {
          return json(origin, { ok: false, error: "SLOT_HOLD_REQUIRED" }, 409);
        }
        if (msg.includes("slot hold provider mismatch") || msg.includes("slot hold session mismatch") || msg.includes("slot hold date mismatch")) {
          return json(origin, { ok: false, error: "SLOT_HOLD_MISMATCH" }, 409);
        }
        throw error;
      }

      const bookingRunId = cleanText(body?.recommendation_run_id, 80);
      if (/^[0-9a-f-]{36}$/i.test(bookingRunId)) {
        try {
          const sessionHash = await hashValue(sessionId);
          const { data: ownedRun } = await db
            .from("recommendation_runs")
            .select("id,session_hash,engine_version")
            .eq("id", bookingRunId)
            .eq("session_hash", sessionHash)
            .single();

          if (ownedRun) {
            if (data?.booking_id) {
              await db.from("bookings")
                .update({ recommendation_run_id: ownedRun.id })
                .eq("id", data.booking_id);
            }
            if (data?.quote_id) {
              await db.from("provider_quotes")
                .update({ recommendation_run_id: ownedRun.id })
                .eq("id", data.quote_id);
            }
            await db.from("recommendation_events").insert({
              run_id: ownedRun.id,
              session_hash: sessionHash,
              event_type: "booking_success",
              provider_key: providerKey,
              position: null,
              policy_version: ownedRun.engine_version || ENGINE_VERSION,
              metadata: {
                booking_id: data?.booking_id || null,
                quote_id: data?.quote_id || null,
                transaction_version: TRANSACTION_VERSION
              }
            });
          }
        } catch (trackingError) {
          console.warn("booking_success_tracking_failed", trackingError);
        }
      }

      return json(origin, {
        ok: true,
        engine_version: ENGINE_VERSION,
        booking: { ...data, provider_key: providerKey }
      });
    }

    if (action === "replace_booking") {
      const oldBookingId = cleanText(body?.old_booking_id, 80);
      const slotHoldId = cleanText(body?.slot_hold_id, 80);
      const operationKey = cleanText(body?.operation_key, 80);
      const token = cleanText(body?.quote_token, 6000);
      const requestedRunId = cleanText(body?.recommendation_run_id, 80);

      if (!/^[0-9a-f-]{36}$/i.test(oldBookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }
      if (!/^[0-9a-f-]{36}$/i.test(slotHoldId)) {
        return json(origin, { ok: false, error: "SLOT_HOLD_REQUIRED" }, 409);
      }
      if (!/^[A-Za-z0-9_-]{8,80}$/.test(operationKey)) {
        return json(origin, { ok: false, error: "IDEMPOTENCY_INVALID" }, 400);
      }
      if (!token) {
        return json(origin, { ok: false, error: "QUOTE_TOKEN_REQUIRED" }, 409);
      }

      const payload = await verifyQuoteToken(token);
      if (!payload) {
        return json(origin, { ok: false, error: "QUOTE_TOKEN_INVALID" }, 409);
      }

      const { data: oldBooking, error: oldBookingError } = await db
        .from("bookings")
        .select("id,request_id,provider_id,status,confirmation_status,recovery_status")
        .eq("id", oldBookingId)
        .single();

      if (oldBookingError || !oldBooking) {
        return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
      }

      const { data: requestRow, error: requestError } = await db
        .from("service_requests")
        .select("id,session_id,services,region,status")
        .eq("id", oldBooking.request_id)
        .eq("session_id", sessionId)
        .single();

      if (requestError || !requestRow) {
        return json(origin, { ok: false, error: "BOOKING_NOT_OWNED" }, 403);
      }
      if (oldBooking.recovery_status !== "action_required" ||
          !["expired","declined"].includes(oldBooking.confirmation_status)) {
        return json(origin, { ok: false, error: "RECOVERY_NOT_REQUIRED" }, 409);
      }

      const tokenServices = (Array.isArray(payload.services) ? payload.services : [])
        .map((x: unknown) => cleanText(x, 60))
        .filter(Boolean);
      const requestServices = (Array.isArray(requestRow.services) ? requestRow.services : [])
        .map((x: unknown) => cleanText(x, 60))
        .filter(Boolean);
      const providerKey = cleanText(payload.provider_key, 120);
      const amount = Math.round(Number(payload.amount));

      if (!sameServices(tokenServices, requestServices)) {
        return json(origin, { ok: false, error: "QUOTE_SERVICE_MISMATCH" }, 409);
      }
      if (!quoteRegionMatches(payload.region, cleanText(requestRow.region, 80))) {
        return json(origin, { ok: false, error: "QUOTE_REGION_MISMATCH" }, 409);
      }

      let ownedRunId: string | null = null;
      if (/^[0-9a-f-]{36}$/i.test(requestedRunId)) {
        const sessionHash = await hashValue(sessionId);
        const { data: ownedRun } = await db
          .from("recommendation_runs")
          .select("id")
          .eq("id", requestedRunId)
          .eq("session_hash", sessionHash)
          .single();
        ownedRunId = ownedRun?.id ?? null;
      }

      const { data, error } = await db.rpc("replace_beta_booking_v1", {
        p_session_id: sessionId,
        p_operation_key: operationKey,
        p_old_booking_id: oldBookingId,
        p_services: tokenServices,
        p_region: cleanText(requestRow.region, 80),
        p_new_provider_key: providerKey,
        p_amount: amount,
        p_slot_hold_id: slotHoldId,
        p_recommendation_run_id: ownedRunId,
        p_message:
          "KORUAL recovery swap; engine=" + ENGINE_VERSION +
          "; transaction=" + TRANSACTION_VERSION
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("recovery not required")) return json(origin, { ok: false, error: "RECOVERY_NOT_REQUIRED" }, 409);
        if (msg.includes("same provider")) return json(origin, { ok: false, error: "RECOVERY_SAME_PROVIDER" }, 409);
        if (msg.includes("slot hold expired")) return json(origin, { ok: false, error: "SLOT_HOLD_EXPIRED" }, 409);
        if (msg.includes("slot hold inactive")) return json(origin, { ok: false, error: "SLOT_HOLD_INACTIVE" }, 409);
        if (msg.includes("slot hold not found")) return json(origin, { ok: false, error: "SLOT_HOLD_REQUIRED" }, 409);
        if (msg.includes("slot hold provider mismatch") || msg.includes("slot hold session mismatch")) {
          return json(origin, { ok: false, error: "SLOT_HOLD_MISMATCH" }, 409);
        }
        if (msg.includes("old booking not found")) return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
        if (msg.includes("old booking not recoverable")) return json(origin, { ok: false, error: "BOOKING_NOT_RECOVERABLE" }, 409);
        throw error;
      }

      if (ownedRunId) {
        try {
          const sessionHash = await hashValue(sessionId);
          const { data: run } = await db
            .from("recommendation_runs")
            .select("id,engine_version")
            .eq("id", ownedRunId)
            .single();
          if (run) {
            await db.from("recommendation_events").insert({
              run_id: run.id,
              session_hash: sessionHash,
              event_type: "booking_success",
              provider_key: providerKey,
              position: null,
              policy_version: run.engine_version || ENGINE_VERSION,
              metadata: {
                booking_id: data?.booking_id || null,
                quote_id: data?.quote_id || null,
                recovery_swap: true,
                old_booking_id: oldBookingId,
                transaction_version: TRANSACTION_VERSION
              }
            });
          }
        } catch (trackingError) {
          console.warn("recovery_booking_tracking_failed", trackingError);
        }
      }

      return json(origin, {
        ok: true,
        engine_version: ENGINE_VERSION,
        transaction_version: TRANSACTION_VERSION,
        recovery_swap: true,
        booking: { ...data, provider_key: providerKey }
      });
    }

    if (action === "booking_availability") {
      const bookingId = cleanText(body?.booking_id, 80);
      const desiredDate = cleanText(body?.desired_date, 10);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }
      if (!validateDate(desiredDate)) {
        return json(origin, { ok: false, error: "DATE_INVALID" }, 400);
      }

      const { data: booking, error: bookingError } = await db
        .from("bookings")
        .select("id,request_id,provider_id,status,scheduled_at")
        .eq("id", bookingId)
        .single();
      if (bookingError || !booking) {
        return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
      }
      if (!["pending","confirmed"].includes(booking.status)) {
        return json(origin, { ok: false, error: "BOOKING_NOT_RESCHEDULABLE" }, 409);
      }

      const { data: requestRow, error: requestError } = await db
        .from("service_requests")
        .select("id,session_id")
        .eq("id", booking.request_id)
        .eq("session_id", sessionId)
        .single();
      if (requestError || !requestRow) {
        return json(origin, { ok: false, error: "BOOKING_NOT_OWNED" }, 403);
      }

      const { data: slots, error: slotError } = await db.rpc("get_provider_available_slots", {
        p_provider_id: booking.provider_id,
        p_date: desiredDate
      });
      if (slotError) throw slotError;

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        desired_date: desiredDate,
        timezone: "Asia/Seoul",
        current_scheduled_at: booking.scheduled_at,
        hold_minutes: 10,
        slots: (slots ?? []).map((s: any) => ({
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          capacity: Number(s.capacity),
          remaining: Number(s.remaining)
        }))
      });
    }

    if (action === "hold_booking_slot") {
      const bookingId = cleanText(body?.booking_id, 80);
      const startsAt = cleanText(body?.starts_at, 64);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }
      if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
        return json(origin, { ok: false, error: "SLOT_INVALID" }, 400);
      }

      const { data: booking, error: bookingError } = await db
        .from("bookings")
        .select("id,request_id,provider_id,status")
        .eq("id", bookingId)
        .single();
      if (bookingError || !booking) {
        return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
      }
      if (!["pending","confirmed"].includes(booking.status)) {
        return json(origin, { ok: false, error: "BOOKING_NOT_RESCHEDULABLE" }, 409);
      }

      const { data: requestRow, error: requestError } = await db
        .from("service_requests")
        .select("id,session_id")
        .eq("id", booking.request_id)
        .eq("session_id", sessionId)
        .single();
      if (requestError || !requestRow) {
        return json(origin, { ok: false, error: "BOOKING_NOT_OWNED" }, 403);
      }

      const { data: hold, error: holdError } = await db.rpc("hold_provider_slot", {
        p_provider_id: booking.provider_id,
        p_session_id: sessionId,
        p_starts_at: startsAt
      });

      if (holdError) {
        const msg = String(holdError.message || "").toLowerCase();
        if (msg.includes("slot unavailable")) {
          return json(origin, { ok: false, error: "SLOT_UNAVAILABLE" }, 409);
        }
        throw holdError;
      }

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        hold,
        timezone: "Asia/Seoul"
      });
    }

    if (action === "cancel_booking") {
      const bookingId = cleanText(body?.booking_id, 80);
      const reason = cleanText(body?.reason, 200);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }

      const { data, error } = await db.rpc("cancel_beta_booking_v1", {
        p_session_id: sessionId,
        p_booking_id: bookingId,
        p_reason: reason || null
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("booking not found")) return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
        if (msg.includes("cannot be cancelled")) return json(origin, { ok: false, error: "BOOKING_NOT_CANCELLABLE" }, 409);
        throw error;
      }

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        booking: data
      });
    }

    if (action === "reschedule_booking") {
      const bookingId = cleanText(body?.booking_id, 80);
      const slotHoldId = cleanText(body?.slot_hold_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }
      if (!/^[0-9a-f-]{36}$/i.test(slotHoldId)) {
        return json(origin, { ok: false, error: "SLOT_HOLD_REQUIRED" }, 409);
      }

      const { data, error } = await db.rpc("reschedule_beta_booking_v1", {
        p_session_id: sessionId,
        p_booking_id: bookingId,
        p_slot_hold_id: slotHoldId
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("booking not found")) return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
        if (msg.includes("cannot be rescheduled")) return json(origin, { ok: false, error: "BOOKING_NOT_RESCHEDULABLE" }, 409);
        if (msg.includes("slot hold expired")) return json(origin, { ok: false, error: "SLOT_HOLD_EXPIRED" }, 409);
        if (msg.includes("slot hold inactive")) return json(origin, { ok: false, error: "SLOT_HOLD_INACTIVE" }, 409);
        if (msg.includes("slot hold provider mismatch") || msg.includes("slot hold session mismatch")) {
          return json(origin, { ok: false, error: "SLOT_HOLD_MISMATCH" }, 409);
        }
        if (msg.includes("slot hold not found")) return json(origin, { ok: false, error: "SLOT_HOLD_REQUIRED" }, 409);
        throw error;
      }

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        booking: data
      });
    }

    if (action === "booking_status") {
      const bookingId = cleanText(body?.booking_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }

      const { data: bookingInitial, error: bookingError } = await db
        .from("bookings")
        .select("id,request_id,quote_id,provider_id,status,scheduled_at,recommendation_run_id,confirmation_status,confirmation_deadline,confirmation_sla_minutes,provider_confirmed_at,provider_declined_at,recovery_status,created_at,updated_at")
        .eq("id", bookingId)
        .single();

      if (bookingError || !bookingInitial) {
        return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
      }

      const { data: requestRow, error: requestError } = await db
        .from("service_requests")
        .select("id,request_code,services,region,desired_date,status,session_id,matching_mode,created_at,updated_at")
        .eq("id", bookingInitial.request_id)
        .eq("session_id", sessionId)
        .single();

      if (requestError || !requestRow) {
        return json(origin, { ok: false, error: "BOOKING_NOT_OWNED" }, 403);
      }

      const { error: refreshError } = await db.rpc("refresh_booking_confirmation_v1", {
        p_booking_id: bookingId
      });
      if (refreshError) throw refreshError;

      const { data: bookingFresh, error: bookingFreshError } = await db
        .from("bookings")
        .select("id,request_id,quote_id,provider_id,status,scheduled_at,recommendation_run_id,confirmation_status,confirmation_deadline,confirmation_sla_minutes,provider_confirmed_at,provider_declined_at,recovery_status,created_at,updated_at")
        .eq("id", bookingId)
        .single();
      if (bookingFreshError || !bookingFresh) throw bookingFreshError || new Error("BOOKING_REFRESH_FAILED");
      const booking = bookingFresh;

      const [providerResult, quoteResult, eventsResult] = await Promise.all([
        db.from("providers")
          .select("id,provider_key,name")
          .eq("id", booking.provider_id)
          .single(),
        booking.quote_id
          ? db.from("provider_quotes")
              .select("id,amount,status,quote_expires_at,accepted_at,recommendation_run_id")
              .eq("id", booking.quote_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
        db.from("service_request_events")
          .select("event_type,from_status,to_status,actor_type,created_at")
          .eq("request_id", booking.request_id)
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

      if (providerResult.error) throw providerResult.error;
      if (quoteResult.error) throw quoteResult.error;
      if (eventsResult.error) throw eventsResult.error;

      return json(origin, {
        ok: true,
        transaction_version: TRANSACTION_VERSION,
        booking: {
          id: booking.id,
          status: booking.status,
          scheduled_at: booking.scheduled_at,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          recommendation_run_id: booking.recommendation_run_id,
          confirmation: {
            status: booking.confirmation_status,
            deadline: booking.confirmation_deadline,
            sla_minutes: booking.confirmation_sla_minutes,
            confirmed_at: booking.provider_confirmed_at,
            declined_at: booking.provider_declined_at,
            recovery_status: booking.recovery_status,
            action_required: booking.recovery_status === "action_required",
            suggested_action:
              booking.recovery_status === "action_required"
                ? "compare_alternatives"
                : null
          },
          request: {
            id: requestRow.id,
            code: requestRow.request_code,
            services: requestRow.services,
            region: requestRow.region,
            desired_date: requestRow.desired_date,
            status: requestRow.status,
            matching_mode: requestRow.matching_mode
          },
          provider: providerResult.data,
          quote: quoteResult.data,
          events: eventsResult.data ?? []
        }
      });
    }

    if (action === "complete_demo") {
      const bookingId = cleanText(body?.booking_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
        return json(origin, { ok: false, error: "BOOKING_ID_INVALID" }, 400);
      }

      const { data: booking, error: bookingError } = await db
        .from("bookings")
        .select("id,request_id,provider_id,status,recommendation_run_id")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        return json(origin, { ok: false, error: "BOOKING_NOT_FOUND" }, 404);
      }

      const { data: requestRow, error: requestError } = await db
        .from("service_requests")
        .select("id,session_id,status")
        .eq("id", booking.request_id)
        .eq("session_id", sessionId)
        .single();

      if (requestError || !requestRow) {
        return json(origin, { ok: false, error: "BOOKING_NOT_OWNED" }, 403);
      }

      if (booking.status === "completed" && requestRow.status === "COMPLETED") {
        return json(origin, {
          ok: true,
          engine_version: ENGINE_VERSION,
          transaction_version: TRANSACTION_VERSION,
          booking: { id: booking.id, status: "completed", idempotent: true }
        });
      }

      const { data: provider, error: providerError } = await db
        .from("providers")
        .select("id,is_demo")
        .eq("id", booking.provider_id)
        .eq("is_demo", true)
        .single();

      if (providerError || !provider) {
        return json(origin, { ok: false, error: "NOT_DEMO_BOOKING" }, 403);
      }

      const { error: updateBookingError } = await db
        .from("bookings")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateBookingError) throw updateBookingError;

      const { error: updateRequestError } = await db
        .from("service_requests")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("id", requestRow.id);

      if (updateRequestError) throw updateRequestError;

      await db.from("service_request_events").insert({
        request_id: requestRow.id,
        event_type: "service.completed",
        from_status: requestRow.status,
        to_status: "COMPLETED",
        actor_type: "customer",
        metadata: {
          source: "platform_beta",
          engine_version: ENGINE_VERSION,
          transaction_version: TRANSACTION_VERSION
        }
      });

      if (booking.recommendation_run_id) {
        try {
          const sessionHash = await hashValue(sessionId);
          const { data: run } = await db
            .from("recommendation_runs")
            .select("id,engine_version,session_hash")
            .eq("id", booking.recommendation_run_id)
            .eq("session_hash", sessionHash)
            .single();

          if (run) {
            const { data: providerRow } = await db
              .from("providers")
              .select("provider_key")
              .eq("id", booking.provider_id)
              .single();

            await db.from("recommendation_events").insert({
              run_id: run.id,
              session_hash: sessionHash,
              event_type: "complete",
              provider_key: providerRow?.provider_key || null,
              position: null,
              policy_version: run.engine_version || ENGINE_VERSION,
              metadata: { booking_id: booking.id }
            });
          }
        } catch (trackingError) {
          console.warn("complete_tracking_failed", trackingError);
        }
      }

      return json(origin, {
        ok: true,
        engine_version: ENGINE_VERSION,
        transaction_version: TRANSACTION_VERSION,
        booking: { id: booking.id, status: "completed", idempotent: false }
      });
    }

    return json(origin, { ok: false, error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    return json(origin, {
      ok: false,
      error: "SERVER_ERROR",
      detail: message.slice(0, 160)
    }, 500);
  }
});
