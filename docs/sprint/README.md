# 下一迭代 · 冲刺与双组分工（入口）

> **组员从这里开始。**  
> 状态：`draft`（填完成员表、组内确认后改为 `frozen`）  
> 功能范围真源：[../defense/ROADMAP-AND-AGENT.md](../defense/ROADMAP-AND-AGENT.md)  
> 硬约束：见仓库根目录 [`CONTEXT.md`](../../CONTEXT.md)（Agent **不得**无人确认下发 MQTT）

---

## 本目录是什么

`docs/sprint/` 存放**下一迭代**的：

- 双组边界与 RACI  
- Sprint A / B 切片与 DoD  
- **工程组**、**Agent 组**各自的详细做法（步骤、改哪些文件、验收怎么测）  
- 接口变更与交接规矩  

**聊天不算数**；认领任务、改接口、做完交付，都以本目录 + `API文档.md` 为准。

---

## 阅读顺序（5 分钟上手）

| 顺序 | 文件 | 谁必读 |
|------|------|--------|
| 1 | [TEAM-DIVISION.md](TEAM-DIVISION.md) | **全员** — 边界、RACI、Sprint 表、风险 |
| 2 | [ENGINEERING-GUIDE.md](ENGINEERING-GUIDE.md) | **工程组** — E1–E7 逐步做法 |
| 3 | [AGENT-GUIDE.md](AGENT-GUIDE.md) | **Agent 组** — A1–A7 逐步做法 |
| 4 | [../defense/ROADMAP-AND-AGENT.md](../defense/ROADMAP-AND-AGENT.md) | 产品意图与 MoSCoW |
| 5 | [../collab/TEAM-ONBOARDING.md](../collab/TEAM-ONBOARDING.md) | 本地 Docker / 密钥 / 板端 |

---

## 双组一句话

| 组 | 做什么 | 不做什么 |
|----|--------|----------|
| **工程组** | M1–M3 运维底座；S1/S2 策略；创新 C*；MQTT/规则/灯廊业务页 | 把控灯逻辑写进 LLM |
| **Agent 组** | S3 运维助手三技能 + RAG + 无 Key 降级 | 不直发 MQTT；不改库除非人确认后调工程 API |

```text
工程组（确定层 + 执行层）→ 只读 API / 聚合
         ↓
Agent 组（辅助层）→ 摘要 / 归因 / 建议草稿 → 人确认 → 调工程已有 API
```

---

## 冲刺一览

| 冲刺 | 周期（建议） | 主责 | 必交付 |
|------|--------------|------|--------|
| **Sprint A** | 1–1.5 周 | 工程组 | M1 指令闭环、M2 告警加深、M3 值班待办 |
| **Sprint B** | 1 周 | 工程 + Agent | S3 助手可演示；工程 S1 或 S2 + 可选 C1/C2 |

详细 DoD 见 [TEAM-DIVISION.md §4](TEAM-DIVISION.md#4-冲刺切片freeze)。

---

## 成员登记（开干前填）

| 组 | 成员 | 侧重 | 认领任务 |
|----|------|------|----------|
| 工程组 | | 后端 / 前端 / 板端 | E1–E7 见工程指南 |
| Agent 组 | | AI / 前端助手 / 知识库 | A1–A7 见 Agent 指南 |
| 组长 | | 冻结范围、跨组 ACK | Sprint 表 + 答辩脚本 |

---

## 协作规矩（摘要）

1. **改接口**：先改 `smart-street-light-master/API文档.md` 或提 [变更请求](../collab/模板-变更请求.md) → 对方组 ACK → 再写码。  
2. **做完一个 ID**：在 `docs/collab/发件箱/` 留 Handoff（契约链接、怎么跑、3 条验收勾）。  
3. **前端文件归属**：业务页 → 工程组；`web/src/views/OpsAssistant*`（或等价）→ Agent 组；动公共 store 要 CR。  
4. **联调**：同一套 Docker（见 `quickstart.md`）；板端可选 `docs/hardware/HARDWARE-E2E.md`。

---

## 相关链接

| 文档 | 用途 |
|------|------|
| [TEAM-DIVISION.md](TEAM-DIVISION.md) | 分工、RACI、接口变更面、任务清单 |
| [ENGINEERING-GUIDE.md](ENGINEERING-GUIDE.md) | 工程组详细做法 |
| [AGENT-GUIDE.md](AGENT-GUIDE.md) | Agent 组详细做法 |
| [../defense/](../defense/) | 答辩材料 |
| [../contracts/README.md](../contracts/README.md) | MQTT/HTTP 契约索引 |
| [../../quickstart.md](../../quickstart.md) | 启动命令与规矩 |

---

*创建：2026-08-24 · 依据 team-contract-align + ROADMAP-AND-AGENT*
