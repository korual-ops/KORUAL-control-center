# KORUAL Apps Script

Google Sheets CRUD API와 KORUAL 플랫폼 동기화 함수의 복구 가능한 원본입니다. 비밀값은 소스에 저장하지 않습니다.

## Script Properties

기존 Sheets CRUD 연동:

```text
KORUAL_SPREADSHEET_ID=<spreadsheet id>
KORUAL_GAS_SECRET=<shared secret>
```

KORUAL 플랫폼 동기화:

```text
KORUAL_ENDPOINT=https://<your-vercel-domain>/api/google-script/sync
KORUAL_SECRET=<same value as GOOGLE_SCRIPT_SHARED_SECRET>
```

## Deployment

- `Code.gs`와 `appsscript.json`을 Apps Script 프로젝트에 반영합니다.
- 웹 앱 URL과 동일한 비밀키를 Vercel 환경변수 `KORUAL_GAS_URL`, `KORUAL_GAS_SECRET`에 설정합니다.
- `syncKorualSignal`은 시간 기반 트리거나 Spreadsheet 이벤트 트리거로 실행합니다.
