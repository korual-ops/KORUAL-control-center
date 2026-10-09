# KORUAL competitive and compliance research — 2026-10-09

## Evidence used
- Miso official moving page: https://www.miso.kr/moving — short request form, up to four comparable estimates, ratings and reviews.
- Miso official office cleaning page: https://www.miso.kr/officeclean — time-based price table and repeat-cleaning pricing.
- Miso official deep cleaning page: https://www.miso.kr/deepclean — service scope, price bands and quote comparison.
- Soomgo provider policy: https://help.soomgo.com/hc/ko/articles/38095340997273--24-09-26-%EC%88%A8%EA%B3%A0-%EA%B3%A0%EC%88%98-%EA%B4%80%EB%A0%A8-%EC%84%9C%EB%B9%84%EC%8A%A4-%EC%A0%95%EC%B1%85-%EB%B3%80%EA%B2%BD-%EC%95%88%EB%82%B4-10-2-%EB%B0%98%EC%98%81 — 2024 policy commentary identified excessive provider competition as a provider pain point; not a claim that the same pricing policy applies today.
- Korean e-commerce consumer protection act Article 20, effective 2026-07-21: https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029561431
- Korean personal data protection act Article 17, effective 2026-09-11: https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900617336

## What competitors teach us

**Do not compete on number of categories alone.** Consumer value is a 30-second request, timely genuine quotes, visible price scope and high-confidence booking. Supplier value is qualified demand rather than endless low-quality bid requests.

KORUAL differentiation:
1. Quote trust: total price including mandatory fees, scope exclusions, time validity, explicit source provenance, partner confirmation.
2. Multi-service coordination: group moving + cleaning + internet without conflicting schedules; one project view and transparent split settlement.
3. Partner fairness: eligibility, service radius and capacity-aware routing; prevent unlimited broadcast and cap simultaneous competition as an experiment.
4. Repeat use: care plans and post-service support with real service outcomes, not fabricated ratings.
5. Explainable AI: recommend what is *verifiably* best for the requested scope rather than lowest unverifiable sticker price.

## Korean compliance release checks

Before acting as a transaction intermediary, obtain review of the exact contract model: referral-only, commission-based marketplace, merchant-of-record and managed service may have different duties.

For a transaction intermediary, Article 20 requires clear intermediary status disclosure and, when the intermediary seller is a business, specified seller identity details before the order. The law also requires prompt measures for consumer complaints and disputes. Build seller identity and dispute reporting into the order screens, not only footer terms.

When providing a user's request details to a partner, obtain or document a lawful basis for the transfer and show required notice for consent-based disclosure: recipient, purpose, data fields, retention and refusal implications, subject to the statutory exceptions. Avoid broadcasting phone numbers and full addresses to multiple providers until required.

**Engineering acceptance criteria**:
- Service category not launched until provider contracts and availability actually exist.
- No unverified sample prices shown as live.
- Seller/legal entity identity visible before purchase.
- Detailed extra fees, cancellation/refund policy, responsibility split and complaint path disclosed before confirmation.
- Minimal PII shared on a need-to-know basis, with partner-scoped access, retention controls and audit logs.
- Event-driven settlement reconciles provider completion, refunds and payout.

## Market validation experiment

Start in one selected service area rather than nationally. For two weeks, compare three routing strategies on eligible requests: (A) all verified eligible partners (cap 4), (B) capacity-weighted shortlist (cap 3), (C) best 2 then expand if no response. Measure verified quote latency, successful confirmation, service completion, partner acquisition cost, cancellation and support hours.

Do not assume a winning strategy in advance. Prefer the one with higher contribution margin per completed request and acceptable consumer/provider fairness.
