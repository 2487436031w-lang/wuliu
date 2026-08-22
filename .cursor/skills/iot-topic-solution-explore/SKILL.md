---
name: iot-topic-solution-explore
description: >-
  Evaluate and choose IoT course/training project topics (given prompts vs
  self-defined), explore solution options, and score differentiation, feasibility,
  and demo risk. Agent/RAG is an optional module, not the product center. Use when
  selecting BearPi/E53 topics, comparing 智慧农业/烟感/路灯/物流/人体感应,
  inventing custom IoT themes, or deciding MVP scope for 实训/答辩.
---

# IoT Topic & Solution Explore

Structured discovery for **物联网实训选题 + 方案探索**. Prefer evidence and constraints over trend-chasing.

## Product posture (hard)

- **Primary deliverable = IoT system**: device → connect → platform → rule/control → alert/history → demo.
- **Agent/RAG = one module** in the chain (consultation / triage assist), never the project identity.
- Do not center architecture, MVP, or defense narrative on Agent. Do not over-invest Agent depth at the cost of sensing, MQTT reliability, control feedback, or stable demo.
- If time is tight: ship full IoT closed loop first; Agent can be thin RAG or scripted Q&A over live telemetry.

## When to use

- Comparing teacher-given topics vs self-defined themes
- Checking BearPi / E53 / cabling feasibility
- Placing Agent/RAG as a bounded module (not the hero feature)
- Cutting MVP for demo + defense narrative

## Protocol (follow in order)

Copy and update this checklist:

```
Topic Explore Progress:
- [ ] 1. Constraints lock
- [ ] 2. Problem framing (not solution-first)
- [ ] 3. Score given topics
- [ ] 4. Generate / filter self-defined options
- [ ] 5. Opportunity → solutions (≥3 per shortlist)
- [ ] 6. Assumption & demo-risk map
- [ ] 7. Verdict + MVP cut
```

### 1. Constraints lock

Collect only what changes the decision. If unknown, mark `unknown` and proceed with explicit assumptions.

| Field | Examples |
|-------|----------|
| Board / kits | BearPi + which E53 boards |
| Extras | Dupont, camera, relay, GPS, cloud MQTT |
| Stack | Java/Spring, Node, Huawei IoT, SmartJavaAI, etc. |
| Timebox | weeks until demo |
| Team | size, strengths (HW / BE / FE / Agent) |
| Must-haves | IoT closed loop, MQTT, alerts/control; Agent optional |
| Soft goals | low homogenization, high score, talkable **IoT** core |

Do **not** invent hardware the team does not have.

### 2. Problem framing (before features)

For each candidate theme, force:

1. **Who** suffers the problem (specific role, not "用户")
2. **Job-to-be-done** in one sentence
3. **Why now** (sensing + connectivity + remote control/alert actually changes the job)
4. **Non-goal** (what you will not build; default: Agent is not the product)
5. **HMW** — How Might We … ?

Reject themes that only restate sensors ("监测温湿度") without control/alert value.  
Reject themes whose only differentiator is "加个 Agent".

### 3. Score given topics

Score each given topic 1–5 on:

| Dimension | Meaning |
|-----------|---------|
| Feasibility | Fits available board + timebox |
| Closed loop | Sense → connect → decide/rule → act → feedback |
| Homogenization risk | 5 = most classmates will look the same |
| IoT depth | Multi-signal, thresholds, online, control feedback, logs — not UI-only |
| Demo stability | Can reproduce in 3 minutes under stress |
| Module fit | Agent/vision/map can sit as a **side module** without blocking core |

**Composite (default weights — IoT-first):**  
`0.25*Feasibility + 0.25*ClosedLoop + 0.15*(6-HomoRisk) + 0.15*IoTDepth + 0.15*Demo + 0.05*ModuleFit`

If user insists Agent-centric, raise ModuleFit and add Agent substance; default is IoT-first.

Output a ranked table + one-line kill reason for bottom options.

### 4. Self-defined options

Generate 4–6 custom themes that **reuse the same hardware** when possible.

Filter with tarpit checks — drop if any fail hard:

- Trend-only ("加个 AI") with no specific job
- Needs GPS/map/fleet and kit is uncertain
- Cannot demo safely/stably in classroom
- Identical to official E53 sample story with only UI rename
- Differentiation depends entirely on Agent/LLM

Prefer: campus / dorm / lab / club scenes with real stakeholders.

### 5. Opportunity → solutions

For top 2–3 themes, build a mini **opportunity–solution tree**:

```
Outcome (答辩可证明的结果)
└─ Opportunity (用户痛点切片)
   ├─ Solution A
   ├─ Solution B
   └─ Solution C  (≥3; avoid anchoring on first idea)
```

Each solution must state: hardware touchpoints, cloud/MQTT, rule/control path, optional Agent module, MVP cut.

### 6. Assumption & demo-risk map

List top assumptions; mark risk = impact × uncertainty.

| Assumption | Impact | Uncertainty | Test this week |
|------------|--------|-------------|----------------|
| … | H/M/L | H/M/L | … |

**Demo killers** (flag explicitly): GPS outdoors, real smoke, continuous camera AI, multi-vehicle map, paid SMS.

### 7. Verdict + MVP cut

End with:

1. **Recommended theme** (1 primary + 1 backup)
2. **Why this wins** on IoT closed loop + differentiation lever (scene/rules/reliability — not Agent)
3. **MVP** (must ship for score) vs **Stretch** (wow only; Agent usually here or thin module)
4. **Optional Agent module** (bounded): when used, what it answers; must not be required for demo success
5. **3-minute demo script** outline — lead with device/cloud/control, Agent ≤30s if present
6. **Open questions** (max 3) that would change the pick

## Agent module rule (bounded)

Agent is **optional seasoning**:

- Nice: answers using **live** telemetry / recent alerts
- Enough for course docs that list 智能体: thin RAG or guided Q&A
- Do **not** require tool-calling control for MVP unless scoring rubric demands it
- Never let Agent work block MQTT uplink, threshold alerts, or actuator feedback

## Output language

Match the user's language. Default concise Chinese for 实训 contexts unless they write in English.

## References

- BearPi E53 topic map and scoring notes: [references/bearpi-e53-notes.md](references/bearpi-e53-notes.md)
