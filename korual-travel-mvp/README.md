# KORUAL Travel Mission v2

KORUAL Travel Mission은 "여행지를 검색하는 서비스"보다 **사용자가 조건을 선택하면 여행 목표(Mission)를 조립하는 인터페이스**를 목표로 한 모바일 우선 MVP입니다.

## 구현된 흐름

1. 동행 유형 + 정확한 인원
2. 여행 모드 선택
3. 목적지 + 숙박일수 + 선택 출발일
4. 전체 예산 + 우선순위
5. Smart Budget 자동 배분
6. 일자별 Mission Route
7. Deal Engine 데모 비교/선택
8. 로컬 저장 + 공유 링크 + PWA

## Destination Packs

- 사이판
- 오사카
- 도쿄
- 후쿠오카
- 다낭
- 세부
- 방콕
- 푸꾸옥

현재 가격은 **시드 데이터 기반 추정값**입니다. UI 안에서도 실제 운임이 아니라는 점을 표시합니다.

## 다음 연결 순서

### Phase A — Live Supply
- 항공 공급 API
- 호텔 공급 API
- 액티비티/투어 제휴 API
- 공항 이동 공급자
- 환율/세금/수수료 정규화

### Phase B — KORUAL Deal Engine
- 실시간 총비용 계산
- 무료취소/수하물/이동시간/평점 조건 정규화
- Deal Score
- 예산 초과 시 자동 재조합
- 대안 Offer 생성

### Phase C — Transaction
- 실제 예약 전 Quote Lock
- 사용자 최종 승인
- KORUAL Guard 권한 정책
- 결제/예약 Adapter
- 취소/변경/환불 상태 추적

### Phase D — Mission OS
동일 Wizard와 Mission Engine을 이사, 입주, 인테리어, 출장 등으로 확장합니다.

## 안전 원칙

실제 결제/예약이 연결되기 전에는 버튼과 문구가 실제 거래처럼 오인되지 않도록 데모 상태를 명확히 표시합니다.
