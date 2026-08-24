---
name: streetlight-defense-brief
description: >-
  Explain 智慧路灯「灯廊」tech stack and core design for course defense.
  Use when answering 技术栈, 架构, 答辩提纲, 闭环设计, or project walkthrough.
---

# Streetlight Defense Brief

## When invoked

Produce or refine答辩材料 using the frozen narrative in:

`docs/defense/TECH-STACK-AND-DESIGN.md`

## Hard rules

1. Lead with **感知—传输—平台—应用—执行**.
2. Do **not** center the story on Agent/RAG; it is optional.
3. Every claim must map to a demoable path (serial / EMQX / DB / Web).
4. Prefer concrete repo paths and topics from `API文档.md`.

## Output order

1. One-liner + users  
2. Stack table by layer  
3. Architecture + MQTT/HTTP/WS contracts  
4. Auto/manual control closed loop  
5. One engineering hard point (MQTT non-blocking report)  
6. Demo script + Q&A  

## Canonical links

- Defense doc: `docs/defense/TECH-STACK-AND-DESIGN.md`
- Slides: `docs/defense/SLIDES-OUTLINE.md`
- Roadmap / Agent: `docs/defense/ROADMAP-AND-AGENT.md`
- Architecture map: `docs/defense/ARCHITECTURE-MAP.md`
- Quickstart: `quickstart.md`
- Hardware: `docs/hardware/HARDWARE-E2E.md`
- API: `smart-street-light-master/API文档.md`
