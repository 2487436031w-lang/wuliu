---
name: team-contract-align
description: >-
  Align multi-person and multi-agent work via frozen requirements, interface
  contracts (REST/MQTT), ownership, and handoff workflow. Use when syncing
  需求文档 and 接口文档, dividing 端侧/云侧/前端/AI roles, resolving doc drift,
  or starting sprint with shared contracts for IoT course projects.
---

# Team Contract Align

Normalize **people + Cursor agents** around one set of contracts so implementation does not diverge.

## Posture

- **Contracts beat chat memory.** If it is not in `docs/` (or agreed path), it is not agreed.
- **One owner per surface.** Dual owners = conflict; mark RACI instead.
- Agents must **read contracts before coding** and **propose PR-style doc diffs** when changing interfaces — never silent rename of topics/fields.
- IoT default: freeze **MQTT topics + payload** and **REST resources** before parallel FE/BE/device work.

## When to use

- Kickoff / weekly sync / “接口对不上”
- Spawning multiple agents on device / backend / frontend / AI
- After MVP cut or AI module deep-dive changes the boundary

## Protocol

```
Align Progress:
- [ ] 1. Source-of-truth map
- [ ] 2. Role RACI (human + agent)
- [ ] 3. Requirements freeze slice
- [ ] 4. Interface contracts (MQTT + HTTP)
- [ ] 5. Workflow + handoff gates
- [ ] 6. Drift check / change request
```

### 1. Source-of-truth map

Maintain a short index (create/update `docs/contracts/README.md`):

| Doc | Path | Status | Owner |
|-----|------|--------|-------|
| 概念/分期 | docs/… | frozen/draft | … |
| 需求 PRD | docs/… | … | … |
| MQTT 契约 | docs/contracts/mqtt.md | … | … |
| HTTP 契约 | docs/contracts/http.md | … | … |
| 工作流 | docs/contracts/workflow.md | … | … |

Statuses: `draft` → `review` → `frozen` → `superseded`.

### 2. RACI (example roles)

| Surface | Responsible | Accountable | Consulted |
|---------|-------------|-------------|-----------|
| 端侧固件 | 嵌入式同学 / device-agent | 组长 | 后端 |
| 接入与规则 | 后端 | 组长 | 端侧、前端 |
| Web 五角色 | 前端 | 组长 | 后端 |
| AI 认知层 | AI/后端 | 组长 | 前端、产品 |
| 需求与验收 | 产品/文档 | 组长 | 全员 |

Agents inherit the **same RACI** as the human role they assist; they do not invent new APIs.

### 3. Requirements freeze slice

For the current sprint only:

1. List Must IDs from PRD / 功能分期  
2. Mark each: `in-sprint` | `blocked` | `next`  
3. AI items separate: must not block IoT Must unless explicitly scheduled  

Output a 10-line “Sprint contract” in the workflow doc.

### 4. Interface contracts (required artifacts)

Use templates in [references/templates.md](references/templates.md).

**MQTT (device ↔ cloud):** topic, direction, QoS, JSON schema, ack rules.  
**HTTP (app ↔ cloud):** method, path, auth, request/response schema, error codes.  
**Events (for AI):** `AlertCreated` → who consumes → written entities.

Breaking change = version bump (`v1` → `v2`) or additive fields only while `frozen`.

### 5. Workflow + handoff gates

Default pipeline:

```
需求 frozen 片段
  → 接口 draft → review → frozen
    → 并行实现（端 / 云 / 前端 / AI）
      → 联调清单勾选
        → 演示脚本更新
```

**Handoff packet** (agent or human finishing a slice must leave):

- Changed contract sections (link + diff summary)  
- How to run / flash / curl  
- Open risks  
- Next owner  

### 6. Drift check

If code ≠ contract:

1. Stop feature creep  
2. Decide: **fix code** (default) or **Change Request** to unfreeze doc  
3. Log CR in `docs/contracts/changelog.md` (date, who, why, fields)

## Multi-agent rules

When launching parallel agents:

1. Paste **frozen contract paths** into each agent prompt  
2. Assign **non-overlapping paths** (e.g. `firmware/` vs `server/` vs `web/`)  
3. Forbid agents from editing another lane’s contract without CR  
4. Integration agent only after lane handoffs exist  

Compose with: `iot-mvp-prd` (reqs), `iot-project-design-defense` (architecture), this skill (alignment).

## Outputs (this skill should produce)

1. Updated `docs/contracts/README.md` index  
2. MQTT and/or HTTP contract stubs or diffs  
3. Sprint RACI + handoff gates  
4. Explicit list of open conflicts (if any)

## Language

Match the user (default 中文 for 实训).
