# 배송지연 카카오 알림톡 웹훅

관리자 JWT로만 호출되는 Supabase Edge Function입니다. 출고 예정일이 지난 미출고 주문을 중복 없는 대기열에 넣고, 승인된 카카오 비즈메시지 공급사 웹훅으로 발송합니다.

필수 Edge Function secrets:

- `KAKAO_DELAY_WEBHOOK_URL`
- `KAKAO_DELAY_WEBHOOK_TOKEN`
- `KAKAO_DELAY_TEMPLATE_CODE`
- `KAKAO_SENDER_KEY`

웹훅은 `Authorization: Bearer <token>` 및 `Idempotency-Key`를 받고, `shipping_delay` 이벤트 JSON을 카카오 알림톡 공급사 형식으로 변환해야 합니다. 비밀값이 없으면 함수는 503을 반환하며 대기열 상태를 변경하지 않습니다.

카카오디벨로퍼스의 일반 메시지 API는 임의 고객 대상 배송 알림용이 아닙니다. 카카오톡 채널의 승인된 발신프로필·알림톡 템플릿·비즈메시지 공급사 계약을 먼저 준비하세요.
