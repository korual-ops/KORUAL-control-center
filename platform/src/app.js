import {
  Droplets,
  Paintbrush,
  Sparkles,
  Truck,
  Wifi,
  Wrench
} from 'lucide-react';

export const API_BASE =
  import.meta.env.VITE_KORUAL_API_BASE_URL ||
  'https://dtmmjkikyfgkeimhevso.supabase.co/functions/v1/korual-marketplace';

export const services = [
  ['입주청소', '새 집 입주 전 필수 서비스', '18–25만원'],
  ['이사', '지역·거리·짐 기준 비교', '35–80만원'],
  ['인터넷', '통신사별 월요금·혜택 비교', '월 2–4만원'],
  ['정수기', '렌탈료·약정·혜택 비교', '월 2–5만원'],
  ['인테리어', '공사 범위별 견적 비교', '상담 필요'],
  ['수리·시공', '설비·에어컨·커튼 등', '상담 필요'],
];

export const serviceIcons = {
  입주청소: Sparkles,
  이사: Truck,
  인터넷: Wifi,
  정수기: Droplets,
  인테리어: Paintbrush,
  '수리·시공': Wrench,
};

export const demoQuotes = [
  { name: 'A 업체', score: 94, price: '21만원', delta: '적정', extra: '낮음' },
  { name: 'B 업체', score: 88, price: '24만원', delta: '+9%', extra: '보통' },
  { name: 'C 업체', score: 72, price: '31만원', delta: '+41%', extra: '높음' },
];

export const quickPrompts = [
  '청라 신축 입주 준비',
  '이사 + 입주청소 비교',
  '인터넷·정수기 한번에',
  '30평 인테리어 견적',
];

export function money(value) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('ko-KR').format(value) + '원'
    : value;
}

export function getSessionId() {
  const key = 'korual-session-id';
  let value = localStorage.getItem(key);

  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }

  return value;
}

export function getAcquisitionMeta() {
  const params = new URLSearchParams(window.location.search);
  let referrerHost = null;

  try {
    referrerHost = document.referrer
      ? new URL(document.referrer).hostname
      : null;
  } catch {
    referrerHost = null;
  }

  return {
    session_id: getSessionId(),
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    referrer_host: referrerHost,
    landing_path: window.location.pathname,
  };
}

export function inferServices(text) {
  const query = String(text || '');
  const selected = [];

  if (/입주|청소|신축/.test(query)) selected.push('입주청소');
  if (/이사|이동|짐/.test(query)) selected.push('이사');
  if (/인터넷|와이파이|wifi/i.test(query)) selected.push('인터넷');
  if (/정수기|물/.test(query)) selected.push('정수기');
  if (/인테리어|리모델링|30평|평/.test(query)) selected.push('인테리어');
  if (/수리|시공|에어컨|커튼|설비/.test(query)) selected.push('수리·시공');

  return selected.length
    ? [...new Set(selected)]
    : ['입주청소', '인터넷', '이사'];
}

export async function fetchMarketplaceSummary(signal) {
  const response = await fetch(API_BASE + '/marketplace/summary', {
    headers: { accept: 'application/json' },
    signal,
    credentials: 'omit',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new Error('SUMMARY_FAILED');
  }

  return payload;
}

export async function createServiceRequest(input) {
  const response = await fetch(API_BASE + '/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({
      ...input,
      ...getAcquisitionMeta(),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'SERVICE_REQUEST_FAILED');
  }

  return payload;
}
