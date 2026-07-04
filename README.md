# KORUAL Control Center

KORUAL Control Center는 커머스, 여행, AI Agent, 비즈니스 운영, 금융, 개발자 API를 하나로 연결하는 KORUAL Super Platform의 관리자/운영 허브입니다.

## v0.1 구성

- Express 기반 Auth API
- JWT 쿠키 인증
- Admin 사용자 관리 API
- 정적 대시보드 UI: `public/index.html`
- 플랫폼 요약 API: `/platform/summary`
- 헬스체크 API: `/health`

## 실행

```bash
npm install
npm start
```

브라우저에서 접속:

```text
http://localhost:8080
```

## 핵심 플랫폼 모듈

1. Commerce Engine
   - 상품 소싱
   - 마진 계산
   - 자동 등록
   - 주문 처리

2. Travel Engine
   - 항공/호텔/투어
   - AI 여행 일정
   - 실시간 항공편
   - 여행자 데이터

3. AI Agent
   - 상품 발굴
   - 광고 생성
   - CS 자동화
   - 회계/매출 분석

4. Business OS
   - ERP
   - CRM
   - 재고
   - 정산

5. Developer API
   - 외부 판매자 연동
   - 파트너 연동
   - API 사용량 기반 과금 구조

## 장기 방향

KORUAL은 단순 쇼핑몰이 아니라 다음 구조의 플랫폼 기업을 목표로 합니다.

```text
현금흐름 → 레버리지 → 시스템화 → 자동화 → 자산화 → 네트워크 효과 → 장기 복리
```

## 다음 개발 단계

- 로그인 UI 연결
- `/commerce` API 추가
- `/travel` API 추가
- `/ai-agent` API 추가
- 관리자 대시보드 실데이터 연동
- Vercel 또는 Cloud Run 배포 자동화
