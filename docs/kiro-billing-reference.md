# Kiro Enterprise 빌링 레퍼런스

> 공식 문서에서 발췌한 Kiro Enterprise 빌링/구독 규칙 정리.
> 조사일: 2026-04-12 | 조사자: Glen

---

## 1. 구독 티어 및 가격

| Tier | 월 가격 | 크레딧 | 초과 요금 |
|------|---------|--------|----------|
| Free | $0 | 50 | - |
| Pro | $20 | 1,000 | $0.04/credit |
| Pro+ | $40 | 2,000 | $0.04/credit |
| Power | $200 | 10,000 | $0.04/credit |

- 가격은 세금 별도
- GovCloud는 약 20% 높음, Free tier 없음

> **출처**: [Kiro Pricing](https://kiro.dev/pricing/)

---

## 2. Proration (일할 계산) 규칙

### 2.1 구독 시작 (월 중간) — 일할 계산

> **원문**: *"If you **subscribe** a user mid-month, you will be charged a **pro-rated fee** for that month. The user immediately gets access to the subscribed tier's full credit limits."*

- 해당 월은 일할 계산으로 과금
- 크레딧은 즉시 전량 부여 (일할 아님)

**예시**: 4/15에 Pro 구독 시작 → 4월 청구 = $20 × 16/30 = $10.67, 크레딧 1,000개 즉시 사용 가능

> **출처**: [Enterprise billing — Proration considerations](https://kiro.dev/docs/enterprise/billing/#proration-considerations)

### 2.2 구독 해지 (월 중간) — 전액 청구

> **원문**: *"If you **unsubscribe** a user mid-month, you will **pay for the last month in full**. The cancellation takes effect at the **beginning of the following month**."*

- 해당 월은 전액 청구 (환불 없음)
- 월말까지 사용 가능
- 익월 1일부터 차단

**예시**: 4/12에 해지 → 4월 $20 전액 청구, 4/30까지 사용 가능, 5/1부터 Free 전환

> **출처**: [Enterprise billing — Proration considerations](https://kiro.dev/docs/enterprise/billing/#proration-considerations)

### 2.3 업그레이드 (월 중간)

> **원문**: *"If you **upgrade** a subscription mid-month, you will be refunded for the lower-tier subscription, and you will be charged in full for the higher-tier subscription. At the end of the billing cycle, Kiro recalculates the entire month's usage under the new tier's credit limits."*

- 하위 티어 환불 + 상위 티어 전액 즉시 청구
- 해당 월 전체 사용량을 상위 티어 크레딧 기준으로 재계산

**예시**: Pro → Pro+ 업그레이드 후 1,010 크레딧 사용 → Pro+ 2,000 한도 내이므로 초과 요금 없음

> **출처**: [Enterprise billing — Proration considerations](https://kiro.dev/docs/enterprise/billing/#proration-considerations)

### 2.4 다운그레이드 (월 중간)

> **원문**: *"If you **downgrade** a subscription mid-month, you will pay in full for the higher-tier subscription, and you will be charged for the lower-tier subscription starting the following month."*

- 해당 월은 상위 티어 전액 유지
- 익월 1일부터 하위 티어 적용

> **출처**: [Enterprise billing — Proration considerations](https://kiro.dev/docs/enterprise/billing/#proration-considerations)

---

## 3. 구독 상태

| 상태 | 설명 | 과금 |
|------|------|------|
| **Active** | 구독 활성화, 사용 중 | 과금 |
| **Pending** | 구독 할당되었으나 미활성화 (로그인 안 함) | **미과금** |
| **Canceled** | 관리자가 해지 | 미과금 |

> **원문**: *"**Pending** – The user is subscribed but has not activated their subscription. You are **not being charged** for this subscription and there will be no data under Last active column."*

> **출처**: [Managing Kiro subscriptions — Subscription statuses](https://kiro.dev/docs/enterprise/subscription-management/#subscription-statuses)

---

## 4. 중복 구독

> **원문**: *"If a user is subscribed twice **under the same Kiro profile** (for example, in two different groups), then you will **not** be charged twice. Instead, you will pay the subscription price of the **highest tier** assigned to the user."*

- 같은 프로필 내: 최고 티어 1건만 과금
- 다른 프로필 (다른 리전): 이중 과금

**예시**: 학생이 kiro-a-univ-ai(Pro)와 kiro-a-univ-cs1(Pro) 양쪽 그룹에 속해도 Pro $20 한 번만 과금

> **출처**: [Enterprise billing — Double billing](https://kiro.dev/docs/enterprise/billing/#ive-subscribed-a-user-twice-will-i-be-double-billed)

---

## 5. 개인 구독 해지

> **원문**: *"You're billed for your subscription plan on the **first day of the month**, so if you cancel your subscription mid-month you'll **remain on your current plan until the end of the month**. You will be put on **Kiro Free** starting from the next billing cycle, and you won't be charged for a monthly subscription from that point onwards. However, you will be responsible for any overages incurred during your final paid billing cycle."*

- 결제일: 매월 1일
- 월 중간 해지 시 해당 월말까지 현재 플랜 유지
- 익월부터 Free 전환
- 마지막 월의 초과 요금은 청구됨

> **출처**: [Cancelling your subscription](https://kiro.dev/docs/billing/cancelling/)

---

## 6. 자동 해지 조건

> **원문**: *"If a user is **removed from a subscribed group**, their subscription through that group is **automatically canceled**."*

자동 해지되는 경우:
- Identity Center에서 사용자 제거
- 구독된 그룹에서 사용자 제거
- Identity Center 인스턴스 삭제
- Kiro 프로필 삭제
- 사용자 비활성화 (deactivated)
- AWS 계정 삭제

> **출처**: [Managing Kiro subscriptions — Automatic subscription removal](https://kiro.dev/docs/enterprise/subscription-management/#automatic-subscription-removal)

---

## 7. 해지 절차 (Enterprise)

1. AWS Management Console 로그인
2. Kiro 콘솔 이동 (리전 확인)
3. Users & Groups 페이지 → Users 또는 Groups 탭
4. 해지할 사용자/그룹 선택
5. **Deactivate plan** 클릭
6. 확인 다이얼로그에서 **Unsubscribe** 클릭

> **출처**: [Managing Kiro subscriptions — Unsubscribe Kiro users](https://kiro.dev/docs/enterprise/subscription-management/#unsubscribe-kiro-users)

---

## 8. 크레딧 시스템

> **원문**: *"A credit is a unit of work in response to user prompts. Simple prompts can consume less than 1 credit. More complex prompts, such as executing a spec task, typically cost more than 1 credit."*

- 크레딧은 소수점 둘째 자리까지 계량 (최소 0.01 credit)
- 모델별 크레딧 소비율이 다름 (Auto < Sonnet 4 ≈ 1.3배)
- 미사용 크레딧은 이월 안 됨 (매월 리셋)
- 초과(Overage)는 기본 비활성, 활성화 시 $0.04/credit
- Free로 다운그레이드하면 Overage 자동 비활성화

> **출처**: [Kiro Pricing — FAQ](https://kiro.dev/pricing/)

---

## 9. 초과(Overage)

> **원문**: *"Once enabled, overages become available to all users and groups in the profile."*

- 기본 비활성
- Kiro 콘솔 → Settings → Kiro settings → Overages ON
- 활성화하면 프로필 전체 사용자에게 적용
- 유료 플랜 유지하는 한 계속 ON 상태
- $0.04/credit, 월말 정산

> **출처**: [Managing Kiro subscriptions — Enable overages](https://kiro.dev/docs/enterprise/subscription-management/#enable-overages-for-kiro-users)

---

## 10. 비용 확인 방법

- AWS Console → Billing and Cost Management → Charges by service → **Kiro**
- Cost Explorer에서 서비스 필터: `Kiro`
- Usage Type: `USE1-KiroEnterprise-Pro`, `USE1-KiroEnterprise-Credits`
- 개별 사용자 비용: Data Exports에서 **Include resource IDs** 옵션으로 CUR export 생성 필요

> **출처**: [Enterprise billing — Viewing your bill](https://kiro.dev/docs/enterprise/billing/#viewing-your-bill)

---

## 참고 링크 모음

| 문서 | URL |
|------|-----|
| Kiro 가격표 | https://kiro.dev/pricing/ |
| Enterprise 빌링 | https://kiro.dev/docs/enterprise/billing/ |
| 구독 관리 | https://kiro.dev/docs/enterprise/subscription-management/ |
| 구독 해지 (개인) | https://kiro.dev/docs/billing/cancelling/ |
| 팀 구독 시작 | https://kiro.dev/docs/enterprise/subscribe/ |
| Governance | https://kiro.dev/docs/enterprise/governance/ |
| Settings | https://kiro.dev/docs/enterprise/settings/ |
| IAM | https://kiro.dev/docs/enterprise/iam/ |
