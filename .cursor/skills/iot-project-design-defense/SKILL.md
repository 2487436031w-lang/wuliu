---
name: iot-project-design-defense
description: >-
  Design IoT course system architecture and defense narratives (layers,
  modules, demo script, Q&A). Use when doing 项目设计, 概念设计, architecture
  diagrams, 答辩提纲, or explaining how Agent fits as one module in MQTT/IoT
  systems.
---

# IoT Project Design & Defense

## Posture

- Lead with **感知—传输—平台—应用—执行** (or equivalent).
- Agent = application-layer module; never the system spine.
- Every design claim must map to a **demoable** artifact.

## Protocol

```
Design/Defense Progress:
- [ ] 1. Concept one-pager (problem, users, IoT value)
- [ ] 2. Logical architecture (device / edge / cloud / app)
- [ ] 3. Module breakdown + interfaces (MQTT topics, APIs)
- [ ] 4. Core vs innovation modules
- [ ] 5. Data model (minimal entities)
- [ ] 6. Demo script (timed) + failure fallbacks
- [ ] 7. Defense outline + likely questions
```

### Architecture checklist

- Device: sensors, MCU, what is real vs simulated
- Connect: MQTT topics (up: telemetry/events; down: commands)
- Platform: ingest, persist, rules engine, device registry
- App: roles, pages, alerts
- Optional: Agent (RAG + context from DB), Map, Vision

### Innovation placement

Innovation should strengthen IoT story: multi-condition rules, binding lifecycle, anomaly detection with lab-safe substitutes, thin Agent that **reads trip context**. Avoid innovation that only works if LLM is up.

### Defense narrative order

1. Real need & scene  
2. Overall architecture  
3. Closed-loop walkthrough (with board)  
4. One hard engineering point (e.g. 偏航判定 / 轨迹存储 / 指令下发)  
5. Optional module (Agent) in ≤1 minute  
6. Limits & next steps  

### Output

Concept design doc sections + 答辩 5–7 页提纲. Language: match user.
