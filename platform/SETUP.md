# KORUAL 플랫폼 세팅 가이드

이 문서는 KORUAL을 공용 와이파이/공유용 링크 환경에서도 안전하게 운영하기 위한 기본 세팅입니다.

## 1. 로컬 실행

```bash
cd platform
npm install
npm run dev
```

## 2. Vercel 배포 세팅

Vercel에서 GitHub 저장소 `korual-ops/KORUAL-control-center`를 연결합니다.

필수 설정:

- Framework Preset: `Vite`
- Root Directory: `platform`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 3. 환경변수

Vercel Project Settings → Environment Variables에 아래 값을 넣습니다.

```env
VITE_KORUAL_APP_NAME=KORUAL Platform
VITE_KORUAL_PUBLIC_MODE=true
VITE_KORUAL_REQUIRE_HTTPS=true
VITE_KORUAL_SESSION_TIMEOUT_MINUTES=30
VITE_KORUAL_API_BASE_URL=https://api.korual.com
VITE_KORUAL_SUPPORT_EMAIL=support@korual.com
```

주의:

- `OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET` 같은 비밀키는 프론트엔드 Vite 환경변수에 넣지 않습니다.
- 비밀키는 백엔드 서버 또는 Vercel Serverless Function 환경변수에만 보관합니다.

## 4. 공용 와이파이 공유 기준

스타벅스 와이파이처럼 공용 네트워크에서 공유용으로 사용할 때 필수 기준:

- HTTPS 주소만 공유
- 관리자 페이지는 로그인 필수
- 자동 로그아웃 30분
- API 키/DB URL/토큰 프론트 노출 금지
- QR 공유는 공개 페이지에만 허용
- 결제/환불/주문승인은 관리자 확인 후 실행
- 브라우저 저장소에 민감정보 저장 금지

## 5. 운영 체크리스트

배포 전 확인:

- [ ] Vercel 배포 성공
- [ ] HTTPS 적용 확인
- [ ] 보안 헤더 적용 확인
- [ ] 관리자 페이지 접근 제한
- [ ] 환경변수 입력
- [ ] GitHub Actions 빌드 성공
- [ ] 모바일 화면 확인
- [ ] 공용 와이파이에서 접속 테스트

## 6. 다음 세팅

실제 운영 단계에서 추가해야 할 것:

1. Supabase/PostgreSQL 연결
2. Auth 로그인/권한 분리
3. OpenAI API 백엔드 프록시
4. 주문/상품/CS 테이블
5. 관리자 승인 플로우
6. Slack/Email 알림
7. Sentry 또는 Uptime 모니터링
