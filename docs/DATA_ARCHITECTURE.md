# KORUAL 데이터 구조

## 원칙

- `Cafe24`는 상품·주문 원본(source of truth), `Supabase`는 운영 자동화와 관리자 화면의 처리 상태를 담당합니다.
- 화면은 DB 컬럼을 직접 사용하지 않고 `src/data/database.js`의 변환기를 거칩니다.
- 실데이터 삭제는 관리자 확인 없이 자동 수행하지 않습니다.
- 전화번호, 이메일, 토큰은 로그·CSV·분석 이벤트에 기록하지 않습니다.

## 핵심 테이블

| 테이블 | 역할 | 자연키 | 보존 기준 |
|---|---|---|---|
| `products` | 상품·재고 운영 사본 | `sku` | 판매 종료 후에도 주문 참조 유지 |
| `orders` | 결제·출고 상태 | `order_no` | 환불·분쟁 대응 정책에 따라 보존 |
| `categories` | 진열 구조 | `code` | 미사용 상태로 전환 후 정리 |
| `content_items` | 배너·SEO 콘텐츠 | `code` | 게시 이력 보존 |
| `notification_jobs` | 카카오 알림 발송 큐 | `order_id + event_type` | 재시도·감사 이력 보존 |

## 데이터 흐름

1. Cafe24 OAuth/API가 상품과 주문을 수집합니다.
2. Supabase가 정규화된 운영 사본과 자동화 상태를 저장합니다.
3. 관리자 UI는 인증된 세션과 RLS를 통해 CRUD를 수행합니다.
4. 배송지연 작업은 중복 방지 키로 큐에 쌓이고 Edge Function이 발송합니다.

## 정리 체크리스트

- 중복 SKU/주문번호/코드는 유니크 인덱스로 차단합니다.
- 가격·재고·수량은 음수 또는 0 오류를 검증합니다.
- 배송지연 및 저재고 조회 인덱스를 유지합니다.
- 과거 데이터 점검 후 `NOT VALID` 제약을 별도 배포에서 `VALIDATE CONSTRAINT` 합니다.
- DB 비밀값은 Supabase Secrets/Vercel Environment Variables에만 저장합니다.
