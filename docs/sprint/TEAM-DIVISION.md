# 双组分工与冲刺契约

> **真源路径：** `docs/sprint/TEAM-DIVISION.md`（本文件）  
> 入口说明：[README.md](README.md)  
> 功能依据：[../defense/ROADMAP-AND-AGENT.md](../defense/ROADMAP-AND-AGENT.md)

---

## Align Progress

- [x] 1. Source-of-truth map
- [x] 2. Role RACI（工程组 / Agent 组）
- [x] 3. Requirements freeze slice（Sprint A/B）
- [x] 4. Interface contracts（变更面清单）
- [x] 5. Workflow + handoff gates
- [ ] 6. Drift check（联调周做一次）

---

## 1. 真源地图

| 文档 | 路径 | 状态 | 主责组 |
|------|------|------|--------|
| 产品姿势 / 硬约束 | `CONTEXT.md` | frozen | 全员只读 |
| 迭代功能切分 | `docs/defense/ROADMAP-AND-AGENT.md` | frozen | 产品/组长 |
| **分工与冲刺** | `docs/sprint/*` | draft | 组长 |
| HTTP 契约 | `smart-street-light-master/API文档.md` | frozen；变更走 CR | 工程组 |
| MQTT | `docs/contracts/mqtt.md` | frozen；M1 可能加法字段 | 工程组 |
| 工程详细做法 | `docs/sprint/ENGINEERING-GUIDE.md` | draft | 工程组 |
| Agent 详细做法 | `docs/sprint/AGENT-GUIDE.md` | draft | Agent 组 |

---

## 2. 双组边界

| 组 | 使命 | 不做 |
|----|------|------|
| **工程组** | 指令闭环、告警、Dashboard、策略与批量控制 | LLM 控灯、聊天里写规则 |
| **Agent 组** | 只读数据 + 知识库 → 摘要/归因/建议；助手页 | 直发 MQTT；静默改阈值 |

---

## 3. RACI

| 表面 | Responsible | Accountable | Consulted |
|------|-------------|-------------|-----------|
| 固件 / 真机 | 工程·端侧 | 组长 | 工程·后端 |
| MQTT / 规则 / M1–M2 | 工程·后端 | 组长 | 前端、端侧 |
| 灯廊业务页 / M3 | 工程·前端 | 组长 | 后端 |
| S1 / S2 / C* | 工程 BE+FE | 组长 | Agent（文案） |
| S3 运维助手 | **Agent 组** | 组长 | 工程·后端 |
| 知识库内容 | Agent 组 | 组长 | 工程（文档路径） |
| 答辩 Demo | 组长 | 组长 | 两组 |

---

## 4. 冲刺切片（Freeze）

### Sprint A — 运维底座 · 工程组主责

| ID | 状态 | Owner |
|----|------|-------|
| M1 指令闭环确认 | in-sprint | 工程·后端 + FE 展示 |
| M2 告警类型加深 | in-sprint | 工程·后端 + FE |
| M3 值班总览待办 | in-sprint | 工程·前端 |
| S3 助手页壳 | next（Agent 可并行） | Agent |
| S1/S2/C* | next | 工程 |

**DoD：** 指令有中间态/结果；超时告警可筛；Dashboard 三块待办可演示；`API文档.md` 已更新。

### Sprint B — 策略 + Agent 可演示

| ID | 状态 | Owner |
|----|------|-------|
| S3 三技能 + 降级 | in-sprint | Agent |
| S1 或 S2 | in-sprint | 工程 |
| C1 或 C2 | stretch | 工程 |
| 知识库导入 | in-sprint | Agent |

**DoD：** 三按钮可点、无 Key 可降级；建议操作须人确认后调工程 API；工程侧 S1/S2 有可截图交付。

---

## 5. 接口变更面

### 工程组（须先文档）

| 变更 | Agent 依赖 |
|------|------------|
| 控制日志 pending/success/timeout | M1 后告警归因更准确 |
| 告警类型 COMMAND_TIMEOUT 等 | 解释告警按类型话术 |
| Dashboard 聚合（可选新 API） | 态势摘要可复用 |
| 设备阈值 / batch switch | 阈值建议确认写入 |

**MQTT：** 优先不改 topic；M1 用 command + status 时间窗或 commandId（加法字段）。

### Agent 组

| 路径 | 说明 |
|------|------|
| `POST /knowledge-chunks/chat` | 已有 |
| `POST /knowledge-chunks/rag` | 已有 |
| `POST /knowledge-chunks/import` | 已有 |
| 禁止 | Agent 直接 publish command |

---

## 6. 工作流

```text
认领任务（本目录 + 组内指南）
  → 改接口则 CR + API文档 → 对方 ACK
    → 实现 → 自测 → Handoff 到发件箱
      → 跨组联调 → 更新 defense 演示脚本
```

Handoff 四要素：契约链接、怎么跑、已知限制、对方 3 条验收勾。

---

## 7. 任务清单（认领用）

| # | 组 | 任务 | 详细做法 |
|---|-----|------|----------|
| E1–E7 | 工程 | 见下表 | [ENGINEERING-GUIDE.md](ENGINEERING-GUIDE.md) |
| A1–A7 | Agent | 见下表 | [AGENT-GUIDE.md](AGENT-GUIDE.md) |

**工程：** E1 状态机 · E2 超时告警 · E3 告警筛选 · E4 Dashboard · E5 阈值/batch · E6 创新 · E7 回归  
**Agent：** A1 页壳 · A2 API 封装 · A3 态势 · A4 告警 · A5 阈值建议 · A6 知识库 · A7 降级

---

## 8. 风险

| 风险 | 应对 |
|------|------|
| M1 延期 | Agent 先用通用告警话术 |
| LLM 不可用 | 模板降级为 S3 必验收项 |
| 抢前端文件 | 业务页 vs OpsAssistant 分目录 |
| 口头约定 | 只认文档 |

---

## 9. 答辩同步

| 节点 | 动作 |
|------|------|
| Sprint A 末 | 演示脚本加「指令超时 / 待办」 |
| Sprint B 末 | SLIDES 页 8 换真实截图 |

---

*确认成员后改 README 与本文状态为 `frozen`。*
