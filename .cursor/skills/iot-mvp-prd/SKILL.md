---
name: iot-mvp-prd
description: >-
  Scope IoT course MVPs and write requirements docs (user stories, flows,
  MoSCoW, acceptance). Use when drafting 需求文档, cutting MVP from teacher
  feature lists, prioritizing 智慧物流/农业/烟感 features, or defining must vs
  stretch for 实训.
---

# IoT MVP & Requirements (PRD)

For **物联网实训**: IoT closed loop is the product; Agent/RAG is a bounded module.

## Protocol

```
MVP/PRD Progress:
- [ ] 1. Lock constraints & success bar
- [ ] 2. Extract jobs from teacher list + scene
- [ ] 3. MoSCoW cut (Must / Should / Could / Won't)
- [ ] 4. Core capability map (device → cloud → app)
- [ ] 5. User stories + acceptance criteria
- [ ] 6. Key flows (happy + exception)
- [ ] 7. Module slots (Agent, map, vision) — optional
- [ ] 8. Out of scope & risks
```

### 1. Success bar (IoT-first)

MVP succeeds if demo proves within ~3 minutes:

1. Device online + telemetry uplink (MQTT)
2. Business object binding (e.g. 货物↔车辆)
3. At least one rule-based alert or control downlink
4. History or status the user can explain

Agent is **not** required for MVP success unless rubric forces it.

### 2–3. MoSCoW rules

- **Must**: Needed for closed loop + teacher “基本功能” grading baseline
- **Should**: Strong defense, still shippable in timebox
- **Could**: Wow / differentiation
- **Won't**: Explicit non-goals this phase

Kill features that need unconfirmed hardware (GPS outdoors, 开箱传感器) or unstable deps — move to Could with a **lab substitute** (simulated GPS, button=开箱).

### 4. Core capability map

Document each Must as: `采集 | 上报 | 存储 | 规则 | 下发 | 呈现`.

### 5. Stories format

`作为…我希望…以便…` + **验收标准** (Given/When/Then or checklist).

### 6. Flows

At least: main business happy path + one exception (告警) path.

### 7. Agent module (if included)

Specify only: trigger role, data it may read, answers it may give, **no dependency** on demo success. Prefer: summarize trip/alerts, explain ETA/偏航原因, draft 调度建议 — not replacing MQTT control.

### Output template

Produce markdown with: 背景与目标 → 角色 → MoSCoW → 核心功能详述 → 流程 → 非功能 → 风险与替代方案 → 下阶段 PRD 缺口.

Language: match user (default 中文).
