# Agent Handoff · 智能光棚转型

> 写给下一个 Agent：读完本文 + `docs/greenhouse/` 即可开工，不必回放长对话。  
> 更新：2026-08-28 · 仓库根目录：`wuliu-main`（勿只打开上层 `Prototype`）

---

## 1. 一句话现状

产品已从**智慧路灯「灯廊」**转向**智能光棚**（铁皮石斛为主、金线莲为辅）。  
**文档与契约已落地**；**光棚业务代码尚未开工**。路灯代码仍可跑，作复用参考。

---

## 2. 必读文档（按序）

| 顺序 | 路径 | 用途 |
|------|------|------|
| 1 | [docs/greenhouse/README.md](./docs/greenhouse/README.md) | 索引 |
| 2 | [docs/greenhouse/PRD-MVP.md](./docs/greenhouse/PRD-MVP.md) | 角色 / MoSCoW / 流程 / 验收 |
| 3 | [docs/greenhouse/HARDWARE-BOM.md](./docs/greenhouse/HARDWARE-BOM.md) | 商购型号与信号 |
| 4 | [docs/greenhouse/contracts/mqtt.md](./docs/greenhouse/contracts/mqtt.md) | Topic / JSON |
| 5 | [docs/greenhouse/contracts/light-recipe.md](./docs/greenhouse/contracts/light-recipe.md) | 配方与规则 |
| 6 | [docs/greenhouse/contracts/adapters.md](./docs/greenhouse/contracts/adapters.md) | sim ↔ 真机 |

相关 Skill（在 `Prototype/.cursor/skills/` 或本仓约定路径）：`iot-mvp-prd`、`iot-project-design-defense`、`team-contract-align`、`frontend-design`。

---

## 3. 已冻结决策（勿擅自改）

| 项 | 决策 |
|----|------|
| 主作物 | 铁皮石斛；目标 PPFD 60–70；硬限 50–90 |
| 辅作物 | 台湾金线莲 ~25–35（配方切换演示） |
| 产品核 | 光配方 + 补光/遮阳闭环 + 农艺审批工单 +（Should）空间光分布 |
| 硬件 | 演示全 `sim.*`；接口按 BOM 真型号写死；禁止编造型号 |
| Agent/RAG | 可选、只读；**不是** MVP 成功条件 |
| 与路灯 | 复用鉴权 / MQTT / 告警 / 工单模式；**领域模型独立** |

### BOM 速查

- PAR：Apogee SQ-500（主）/ LI-COR LI-190R / 建大仁科 RS-GZ-N01 / BH1750  
- 灯：智圣普 ZPDM651（0–10V/PWM）  
- 遮阳：创明众联 B 类 RS485 开度  

---

## 4. 路灯遗产（可复用，勿当光棚产品）

| 项 | 值 |
|----|-----|
| 登录 | `admin` / `admin123` |
| Web | `:5173` · API `:8080` · PG `:5433` · EMQX `:1883` |
| 真机 | `SN-RM-001` 仅 MQTT 心跳；模拟灯靠 Docker fleet-sim |
| 模拟保活 | `streetlight.demo.mock-keepalive` 默认 `false`（勿与 fleet 双开） |
| Remotes | `origin`=xikunn/wuliu · `fork`/`denglang`=Someone-hates-Monday |

路灯近期未推代码可能含：Dashboard/地图指挥、Devices、mock API、`DevicesServiceImpl`、local yml 注释清理——以当前 `git log` / diff 为准。

---

## 5. 下一步建议（优先级）

1. **库表 + Spring 包**：zones / recipes / devices(adapter) / work_orders / control_logs（光棚命名空间）  
2. **仿真 MQTT**：按 `contracts/mqtt.md` 发 telemetry/status，接规则引擎最小闭环  
3. **前端最小页**：分区光况 + 工单列表（可不先做完整 3D）  
4. **演示脚本 + 答辩 Q&A**（PRD §10 缺口）  
5. 有余力：金线莲切换、DLI、2D/3D 光分布  

未冻结：DDL 细节、前端路由线框、角色码与路灯用户体系如何共用。

---

## 6. Git / 协作注意

- 提交仅在用户要求时做；本 handoff 提交后请 `git status` 确认干净或仅余已知 WIP  
- 推送目标：通常 `origin`；团队同步过 `denglang`  
- **禁止** force-push main；**不要**把密钥、`.env`、整份 `.cursor` 技能树提交进仓（`.gitignore` 已忽略 `.cursor/`）  
- 契约变更：先改 `docs/greenhouse/contracts/*`，再改代码  

---

## 7. 上下文压缩（对话结论）

- 老师确认可**放弃现路灯硬件**，演示强调**真实场景对接**能力。  
- 户外市政路灯平台同质化；差异化落在**作物光配方 + 补光/减光 + 权限工单**，不是再做一个市政大屏。  
- lux→PPFD 必须带 `conversionProfile` / 系数（见 BOM），规则主输入是 **ppfd**。  
- 大开度变更：`requireAgronomistApprovalAbove*` → 工单，不是静默 AUTO。  

---

## 8. 交接检查清单

- [ ] 已读 PRD MoSCoW Must  
- [ ] 已读 MQTT + light-recipe 契约  
- [ ] 本地能跑通现有路灯栈（可选，作参考）  
- [ ] 明确本次只做光棚哪一层（表 / MQTT sim / 前端 / 脚本）  
- [ ] 改契约前与用户确认  

**新 Agent 开场建议回复用户：**确认本 handoff 已读，并询问优先做「库表+后端」「仿真 MQTT」还是「前端/演示脚本」。
