# Agent 组 · 详细做法

> 分工总表：[TEAM-DIVISION.md](TEAM-DIVISION.md)  
> 硬约束：`CONTEXT.md` — **LLM 不得无人确认自动下发 MQTT**  
> 后端已有：`POST /knowledge-chunks/chat`、`/rag`、`/import`（见 API 文档 §8 与 `fe-be-alignment-audit.md`）

---

## 0. 开干前

1. `git pull origin main`  
2. 读 [ROADMAP-AND-AGENT.md §4](../defense/ROADMAP-AND-AGENT.md) Agent 定位  
3. 本地配置 `application-secret.yml` 中 `llm.api-key`（**不入库**）；无 Key 也要完成模板降级  
4. 认领 A1–A7；前端新页与工程组业务页**分目录**  

**主要代码区：**

| 区域 | 路径 |
|------|------|
| 助手页 | `web/src/views/OpsAssistant/`（新建，勿改工程业务页） |
| API 封装 | `web/src/api/knowledge.ts`（新建） |
| 后端 RAG | `smart-street-light-master/.../RagServiceImpl.java`（一般只读，改前先 CR） |

---

## 架构原则（答辩必答）

```text
确定层：规则引擎（工程组）— 阈值、离线、command
辅助层：Agent — 读 API + 知识库 → 文本建议
执行层：人点确认 → 调 POST /devices/{id}/switch、PUT /threshold-config
```

**禁止：** 在 chat/rag 接口里直接 `MqttClient.publish(command)`。

---

## Sprint A（可与工程并行 · 不挡 M1–M3）

### A1 · 助手页壳 + 路由 + 鉴权

1. 新增路由 `/ops-assistant`（名称可议），侧栏入口「运维助手」。  
2. 需登录；复用 `auth` store 与 `token` header。  
3. 布局：左侧三技能按钮 + 右侧对话/结果区 + 底部「模板模式」提示（无 Key 时显示）。  
4. **验收：** 未登录跳转登录；ADMIN/STAFF 均可进（与产品一致即可）。  

---

### A2 · 封装 knowledge-chunks API

```typescript
// 示例形状 — 以 API 文档为准
postChat(message: string)
postRag(message: string)
postImport(documents: ...)
```

- `vite.config.ts` 已有 `/knowledge-chunks` proxy，确认 dev 通。  
- 统一错误：`code !== 200` 时展示后端 message。  

---

## Sprint B（主交付 S3）

### A3 · 技能：态势摘要

**输入：** 无（或「生成本班摘要」）  

**上下文拼装（优先不调新 API）：**

1. `GET /devices/overview` 或分页统计 → 在线/离线数  
2. `GET /alarm-logs?status=ACTIVE&pageSize=5`  
3. 可选：最近 lux `GET /light-readings/latest?deviceId=`  

**Prompt 结构：** 把上述 JSON 摘要 + 用户问题送 `/knowledge-chunks/rag` 或 `/chat`。  

**模板降级（无 LLM / 无 Key）：**

```text
当前在线 {online} 台，离线 {offline} 台。
活跃告警 {activeCount} 条：{type1}×n …
最近光照：{sn} {lux} lux。
建议优先处理：{topAlarmSummary}
```

**验收：** 有 Key 时语句通顺；无 Key 时字段齐全、可答辩。  

---

### A4 · 技能：解释本条告警

**输入：** 当前页选中的 `alarmId`（string，勿 `Number()`）  

**上下文：**

- `GET /alarm-logs/{id}`  
- 同 device：`lastHeartbeatTime`、最近 control_logs、最近 lux  

**按 `alarmType` 分支话术（可与 LLM 结合）：**

| 类型 | 模板要点 |
|------|----------|
| OFFLINE | 心跳超时；查 WiFi/MQTT/板端串口 |
| COMMAND_TIMEOUT | 指令未回执；查 EMQX、板端订阅、GPIO |
| 其他 | 通用：看设备详情 + 控制日志 |

**验收：** 选一条 ACTIVE 告警 → 返回原因 + 3 条检查项。  

---

### A5 · 技能：阈值建议（人确认写入）

**输入：** 可选 deviceId；默认全局  

**逻辑：**

1. 拉取近 24h `light_readings`（或后端统计分位数 — 可 FE 算 P25/P75）。  
2. LLM 或模板输出建议 `on` / `off` + 理由（滞回区间说明）。  
3. UI 展示「采纳建议」按钮 → **弹窗确认** → 调用工程组已有 `PUT /threshold-config`（或设备覆盖 API，若 E5 做了 S1）。  

**禁止：** 自动 PUT；禁止 Agent 后端新增「静默改阈值」接口。  

**验收：** 点采纳前库不变；确认后阈值页可见新值；控制日志无 Agent 来源的 AUTO 异常。  

---

### A6 · 知识库导入

**首批文档（路径相对仓库）：**

| 文档 | 用途 |
|------|------|
| `smart-street-light-master/API文档.md` | 接口问答 |
| `docs/hardware/HARDWARE-E2E.md` | 板端排障 |
| `docs/defense/TECH-STACK-AND-DESIGN.md` §9 Q&A | 答辩 FAQ |
| `docs/sprint/TEAM-DIVISION.md` | 分工与边界 |
| `quickstart.md` | 启动命令 |

**做法：**

1. 写 `scripts/import-knowledge.ps1` 或 curl 调 `POST /knowledge-chunks/import`。  
2. 需 pgvector + embedding key；失败时在 Handoff 写「仅模板模式可演示」。  

---

### A7 · 无 Key 降级与答辩话术

1. FE：`VITE_LLM_ENABLED=false` 或检测 chat 503 → 走模板分支（A3/A4/A5 各一份）。  
2. 在 `docs/defense/` 补 5 行：「Agent 模块存在；演示不依赖外网 LLM」。  
3. 答辩口播：「辅助层；确定层仍是规则引擎；执行须人工确认。」  

---

## Agent 组自测清单（Sprint B 末）

- [ ] 三技能按钮均可点  
- [ ] 有 Key：RAG 能引用 FAQ 片段（可选）  
- [ ] 无 Key：模板输出结构完整  
- [ ] 阈值/开关建议仅在人确认后调工程 API  
- [ ] 代码 Review：无 MQTT publish、无静默 PUT  
- [ ] Handoff：助手路由、环境变量、import 脚本用法  

---

## 与工程组协作点

| 等待工程 | Agent 可先做什么 |
|----------|------------------|
| M1 COMMAND_TIMEOUT | A4 先用 OFFLINE 通用话术 |
| 聚合 API | A3 用多接口拼 |
| 告警类型枚举 | A4 硬编码列表与工程文档对齐 |

工程 Sprint A 末发件箱后，Agent 组 0.5 天对齐告警类型与 control_log 字段。

---

## 可选加分（时间有余）

- 助手页「复制交接班摘要」按钮  
- 告警详情页嵌入「解释此告警」跳转带 alarmId  
- 不把 scope 扩成「聊天控灯」  

---

*Agent 组 PR 标题建议：`feat(agent): ops assistant A3 situation summary` 等，便于 Review 边界。*
