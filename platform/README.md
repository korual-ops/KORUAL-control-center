# KORUAL Platform MVP

KORUAL Platform은 AI Commerce, AI Travel, 리셀러 SaaS, 운영 자동화, 결제/포인트 레이어를 하나로 묶는 플랫폼형 MVP입니다.

## 핵심 구조

- `KORUAL AI`: 상품명, 상세페이지, 여행일정, CS, 리포트 자동 생성
- `KORUAL Commerce`: PB, 드롭쉬핑, 상품 수집, 마진 계산, 자동주문
- `KORUAL Travel`: 도시 기반 여행 일정, 항공/호텔/동선/맛집 추천
- `KORUAL Cloud`: 리셀러, 주문, 정산, 고객, API 관리
- `KORUAL Pay`: 포인트, 멤버십, 정기결제, 리워드 구조

## 실행 방법

```bash
cd platform
npm install
npm run dev
```

## 실제 자동화 연결

Vercel 프로젝트의 Root Directory를 `platform`으로 두고 다음 서버 전용 환경변수를 설정합니다.

```env
KORUAL_GAS_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
KORUAL_GAS_SECRET=새로_발급한_비밀키
KORUAL_SPREADSHEET_ID=1-XYUbU6Os5q7P_9qFnTFmkva3o0KhrgPHd-AyA6-bts
```

브라우저는 `/api/korual`만 호출하며 Apps Script URL과 비밀키를 직접 받지 않습니다. 허용된 자동화는 상품 동기화, 주문 동기화, 배송 점검, 일일 리포트입니다.

## 수익 엔진

1. PB 상품 마진
2. 드롭쉬핑 판매 마진
3. 리셀러 SaaS 월 구독료
4. 항공/호텔/투어 제휴 수수료
5. AI 사용량 기반 과금
6. 프리미엄 멤버십/포인트

## 초부자 알고리즘 적용

현금흐름 → 레버리지 → 시스템화 → 자동화 → 자산화 → 네트워크 효과 → 장기복리 → 리스크 차단

## 다음 개발 단계

- Supabase/PostgreSQL 데이터베이스 연결
- OpenAI API 기반 실제 AI 명령 콘솔 연결
- 상품 수집 API 연동
- 여행 메타서치 제휴 링크 구조화
- 관리자 로그인/권한 분리
- 결제/구독/포인트 모델 구축
