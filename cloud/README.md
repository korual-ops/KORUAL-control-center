# KORUAL Cloud Gateway

KORUAL Control Center와 외부 KORUAL 서비스가 Supabase 기반 Cloud Core에 접근하기 위한 내부 API 게이트웨이입니다.

## 역할

- `GET /health`: 프로세스 헬스체크
- `GET /v1/status`: Cloud Core 서비스 상태와 큐 현황 조회
- `POST /v1/events`: 공용 이벤트 버스에 이벤트 적재

`/v1/*` 요청은 `x-korual-cloud-key` 헤더가 필요합니다. `SUPABASE_SERVICE_ROLE_KEY`와 `KORUAL_CLOUD_API_KEY`는 서버 환경변수에만 저장하고 브라우저 또는 저장소에 노출하지 마세요.

## 실행

```bash
cd cloud
npm install
npm start
```

환경변수는 `.env.example`을 기준으로 설정합니다.

## 현재 Cloud Core

운영 Supabase 프로젝트의 `cloud_events`, `cloud_service_health`, `automation_runs`, `integration_connections`를 사용합니다. 기존 Control Center의 Google Cloud SQL 인증 계층은 변경하지 않으므로 단계적으로 이전할 수 있습니다.

## 권장 배포

이 디렉터리를 별도 서비스로 배포하고, Control Center는 내부 서버 요청으로 `/v1/status`를 호출합니다. 운영 전에는 반드시 호스팅 환경의 Secret Manager/Environment Variables에 키를 설정하고 접근 로그에서 해당 헤더를 마스킹하세요.
