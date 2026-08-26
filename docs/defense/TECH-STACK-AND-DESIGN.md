# 智慧路灯「灯廊」· 技术栈与核心设计（答辩用）

> 仓库：https://github.com/xikunn/wuliu  
> 产品一句话：**感知光照 → MQTT 上云 → 平台规则判定 → 指令下发执行 → Web 实时可见**  
> 本文按物联网实训答辩结构组织：概念 → 架构 → 模块/接口 → 核心难点 → 演示脚本 → 答辩提纲与问答。

---

## Design/Defense Progress

- [x] 1. Concept one-pager（问题、用户、IoT 价值）
- [x] 2. Logical architecture（感知 / 传输 / 平台 / 应用 / 执行）
- [x] 3. Module breakdown + interfaces（MQTT / HTTP / WS）
- [x] 4. Core vs innovation modules
- [x] 5. Data model（最小实体）
- [x] 6. Demo script + failure fallbacks
- [x] 7. Defense outline + likely questions

---

## 1. 概念一页纸（Concept）

| 项 | 内容 |
|----|------|
| **问题** | 市政路灯需按环境光照自动开关，并支持远程监控、手动干预与离线告警；仅靠本地阈值难以统一管理。 |
| **用户** | 市政人员（查看、处理告警）、路灯管理员（阈值与设备管理）。 |
| **IoT 价值** | 端侧真实传感 + 云侧统一规则 + 双向控制闭环，形成可演示的「感知—决策—执行」链路。 |
| **边界** | MVP 不做腾讯云生产部署、不做 RAG 问答必选项；Agent/RAG 仅为预留模块，**不是系统脊柱**。 |
| **可演示物** | BearPi + E53_SC1 真机、EMQX、Spring Boot、Vue「灯廊」、遮光自动开灯、Web 手动开关。 |

---

## 2. 技术栈总览

### 2.1 分层对照

| 物联网层次 | 本项目落地 | 关键技术 |
|------------|------------|----------|
| **感知** | BH1750 光照；GPIO_7 灯控 | E53_SC1 扩展板 |
| **端侧计算** | BearPi-HM Nano | Hi3861、OpenHarmony LiteOS-M、Paho MQTT-C |
| **传输** | WiFi STA → MQTT | EMQX 5.x（Docker），topic `smart-light/{deviceSn}/…` |
| **平台** | 接入、持久化、规则、设备注册 | Spring Boot 3.5、JDK 21、Eclipse Paho、MyBatis-Plus、PostgreSQL + pgvector |
| **应用** | 管理控制台「灯廊」 | Vue 3、Vite 8、TypeScript、Pinia、Vue Router、STOMP.js |
| **执行** | 板端订阅 command，控灯并回传 status | QoS1 下行指令 |
| **可选扩展** | 知识库表 / LLM 配置 | `knowledge_chunks` + embedding（未作为答辩主路径） |

### 2.2 端侧技术栈（硬件）

| 组件 | 选型 | 说明 |
|------|------|------|
| 主控 | **BearPi-HM Nano（Hi3861）** | 2.4GHz WiFi、GPIO、I2C |
| 扩展板 | **E53_SC1** | BH1750（I2C `0x23`）+ GPIO_7 灯控 |
| OS / 构建 | OpenHarmony 设备侧 + GN/Ninja | 源码树：`D:\ohos\bearpi-hm_nano`（不入库） |
| 业务固件 | `firmware/streetlight/`（本仓跟踪） | 合并传感器采集 + MQTT 上报/订阅 |
| MQTT 客户端 | Eclipse Paho MQTTClient-C | 非阻塞 socket，避免 Yield 堵死周期上报 |
| 配置 | `streetlight_config.h`（本机生成） | WiFi、Broker IP、`DEVICE_SN` |

### 2.3 云端技术栈（后端）

| 组件 | 选型 | 说明 |
|------|------|------|
| 框架 | **Spring Boot 3.5** / Java 21 | REST + WebSocket |
| MQTT | **Eclipse Paho** | 订阅 light/status/alarm，发布 command |
| Broker | **EMQX 5.8**（Docker） | `1883` MQTT，`18083` 控制台 |
| ORM | **MyBatis-Plus 3.5** | 设备、光照、告警、阈值、控制日志 |
| DB | **PostgreSQL 17 + pgvector** | 业务表 + 可选向量表 |
| 实时推送 | **STOMP over WebSocket** | `/topic/light-readings` 等 |
| 鉴权 | JWT（Header 名 `token`） | 成功约定 `code=200` |
| 本地编排 | Docker Compose | PG `5433`、EMQX `1883` |

### 2.4 应用侧技术栈（前端）

| 组件 | 选型 | 说明 |
|------|------|------|
| 框架 | **Vue 3 + TypeScript** | Composition API |
| 构建 | **Vite 8** | 开发代理 REST + `/ws` |
| 状态 | **Pinia** | auth / realtime |
| 实时 | **@stomp/stompjs** | 订阅后端推送；辅以短周期轮询兜底 |
| UI | 自研「灯廊」布局 + Element Plus 图标等 | 总览 / 设备 / 光照 / 告警 / 阈值 / 日志 |
| 模式 | `VITE_API_MODE=http \| mock` | 答辩主路径用 HTTP 真后端 |

### 2.5 工程与协作

| 项 | 内容 |
|----|------|
| 仓库 | https://github.com/xikunn/wuliu |
| 契约真源 | `smart-street-light-master/API文档.md` |
| 上手 | `quickstart.md`、`scripts/team-bootstrap.ps1` |
| 硬件联调 | `docs/hardware/HARDWARE-E2E.md` |

---

## 3. 逻辑架构（感知—传输—平台—应用—执行）

```text
┌───────────── 感知 / 执行（板端）─────────────┐
│  BH1750 ──► Hi3861 固件 ──► GPIO_7 灯       │
│       ▲ 订阅 command / 发布 light·status      │
└───────┼──────────────────────────────────────┘
        │ WiFi + MQTT (tcp://PC:1883)
┌───────▼──────── 传输 ────────────────────────┐
│              EMQX Broker                     │
└───────┬──────────────────────────────────────┘
        │ Paho 订阅 / 发布
┌───────▼──────── 平台（Spring Boot）──────────┐
│ 接入路由 → 持久化(PG) → 阈值规则 → 指令下发   │
│ 心跳超时离线告警 │ STOMP 推前端               │
└───────┬──────────────────────────────────────┘
        │ HTTP(JWT) + WebSocket/STOMP
┌───────▼──────── 应用（Vue 灯廊）─────────────┐
│ 总览实时 lux │ 设备开关 │ 阈值 │ 告警处理     │
└──────────────────────────────────────────────┘
```

**设计原则：**

1. **板子不直连 Web**：只跟 Broker 说话，降低耦合。  
2. **规则在云端**：开/关灯阈值统一配置，便于演示「改阈值立刻影响策略」。  
3. **闭环可观测**：每一跳都有可指物——串口 log、EMQX 消息、DB 行、Web LIVE。

---

## 4. 模块划分与接口契约

### 4.1 模块表

| 模块 | 职责 | 仓库位置 |
|------|------|----------|
| 传感与灯控驱动 | 读 lux、置 GPIO | `firmware/streetlight/src/E53_SC1.c` |
| 板端联网与 MQTT | WiFi、上报、收令 | `firmware/streetlight/streetlight_mqtt.c` |
| MQTT 网关 | 订阅/发布、JSON 路由 | `…/config/MqttConfig.java` |
| 设备域 | CRUD、开关、在线 | `DevicesServiceImpl` |
| 光照域 | 入库、趋势、**自动开关判定** | `LightReadingsServiceImpl` |
| 告警域 | 创建/处理/统计 | `AlarmLogsServiceImpl` |
| 阈值域 | 开灯/关灯/心跳超时 | `ThresholdConfig*` |
| 实时推送 | STOMP topics | `SimpMessagingTemplate` |
| Web 控制台 | 页面与交互 | `web/src/views/*` |

### 4.2 MQTT（硬件 ↔ 平台）

| Topic | 方向 | QoS | 载荷要点 |
|-------|------|-----|----------|
| `smart-light/{sn}/light` | 上 | 0 | `deviceSn`, `lightIntensity` |
| `smart-light/{sn}/status` | 上 | 0 | `deviceSn`, `status` = ON/OFF |
| `smart-light/{sn}/alarm` | 上 | 1 | 告警类型与消息 |
| `smart-light/{sn}/command` | 下 | 1 | `MANUAL_ON/OFF`、`AUTO_ON/OFF` |

### 4.3 HTTP / WebSocket（应用 ↔ 平台）

- REST：`/users`、`/devices`、`/light-readings`、`/alarm-logs`、`/threshold-config`、`/control-logs`
- Header：`token: <JWT>`；业务成功 `code=200`
- STOMP：`/topic/light-readings`、`/topic/device-status`、`/topic/device-online`、`/topic/alarms`

### 4.4 核心业务闭环（答辩必讲）

```text
板端周期 publish light
  → EMQX
  → 后端入库 + 刷新在线
  → checkAndAutoControl：
       lux < lightThresholdOn 且灯 OFF → AUTO_ON
       lux > lightThresholdOff 且灯 ON → AUTO_OFF
  → MQTT publish command
  → 板端 applyCommand → GPIO
  → publish status
  → 后端更新 + WS 推前端
```

手动开关同理：Web → `POST /devices/{id}/switch` → MQTT command → 板端执行 → status 回传。

---

## 5. 核心模块 vs 创新点

### 5.1 必须讲清的核心（IoT 脊柱）

1. **端云协议统一**：`deviceSn` 贯穿 topic、设备表、Web。  
2. **云侧阈值规则**：策略集中，演示可调。  
3. **双向控制**：上报触发自动；Web 触发手动；状态回传形成闭环。  
4. **在线与告警**：光照隐式心跳 + 超时离线告警 + 告警处理。

### 5.2 工程创新 / 加分点（服务 IoT 故事）

| 点 | 说明 | 答辩怎么说 |
|----|------|------------|
| **MQTT 主循环非阻塞** | Hi3861 上 `SO_RCVTIMEO` 不可靠，Yield 会堵死，导致只上报一次 | 「我们定位并修复了嵌入式常见坑：非阻塞 socket + 短 Yield，保证约 1s 周期上报」 |
| **命令缓冲** | 不在 MQTT 回调里直接控 GPIO，主循环处理 | 「避免回调上下文里做重活，提高稳定性」 |
| **前后端雪花 ID** | 告警 ID 用 string，避免 `Number` 丢精度 | 「全栈一致性问题：JS 安全整数边界」 |
| **本地 Docker 一键联调** | compose + bootstrap | 「可复现演示环境，降低答辩现场配置风险」 |

### 5.3 明确降级 / 不夸大

- RAG / LLM：表与配置预留，**答辩不依赖大模型在线**。  
- 生产公有云、TLS、大规模设备：列为展望。

### 5.4 迭代 / 创新 / Agent（规划摘要）

完整 MoSCoW 与排期见 **[ROADMAP-AND-AGENT.md](ROADMAP-AND-AGENT.md)**；PPT 页见 **[SLIDES-OUTLINE.md](SLIDES-OUTLINE.md)**。

| 类型 | 答辩可说的下一刀 |
|------|------------------|
| 运维迭代 | 指令闭环确认、告警加深、值班待办 |
| 创新（选一） | 期望 vs 实际一致性面板，或阈值回放沙箱 |
| Agent | 运维副驾驶：态势摘要 / 告警归因 / 阈值建议（人确认后执行） |

**边界：** Agent 只读数据 + 出建议；MQTT 下行仍走规则或人工确认（`CONTEXT.md` 硬约束）。

---

## 6. 最小数据模型

| 实体 | 关键字段 | 作用 |
|------|----------|------|
| `users` | username, role | 登录与权限 |
| `devices` | device_sn, status, online_status, last_heartbeat_time | 设备注册与状态 |
| `light_readings` | device_id, light_intensity, created_at | 时序光照 |
| `threshold_config` | light_threshold_on/off, heartbeat_timeout | 全局策略（单行） |
| `alarm_logs` | alarm_type, status, message | 告警生命周期 |
| `control_logs` | command, source(AUTO/MANUAL), result | 审计轨迹 |
| `knowledge_chunks` | content, embedding | 可选 RAG |

答辩强调：**device_sn 是物理设备在数字世界的主键纽带**。

---

## 7. 演示脚本（约 6–8 分钟）

| 时间 | 动作 | 证明什么 |
|------|------|----------|
| 0:00–0:40 | 一句话场景 + 架构五层图 | 问题与 IoT 价值 |
| 0:40–1:30 | 打开灯廊，侧栏 `HTTP · LIVE` | 应用连通平台 |
| 1:30–2:30 | 串口：`MQTT connected` + `published light` | 感知→传输 |
| 2:30–3:30 | 总览 lux 随遮光变化 | 端→云→屏 |
| 3:30–4:30 | 设备页手动开/关灯，板灯亮灭 | 下行控制 |
| 4:30–5:30 | 改阈值 / 遮光触发自动开灯 | **规则引擎闭环** |
| 5:30–6:00 | 告警处理（若有）或控制日志 | 运维闭环 |
| 6:00–6:30 | 一个工程难点（MQTT 非阻塞） | 真做过、非拼 demo |
| 6:30–7:00 | 局限与下一步 | 诚实边界 |

### 失败兜底

| 风险 | 预案 |
|------|------|
| 板子连不上 WiFi | 用 `mqtt-simulate.ps1` 演示云↔Web；说明板端已验收过 |
| 热点防火墙 | 提前跑 `allow-mqtt-hotspot.ps1`；或改实验室 WiFi |
| 自动开灯不触发 | 室内 lux 仍高：调高开灯阈值或完全盖住 BH1750 |
| WS 显示 OFF | HTTP 仍可用；刷新/轮询；不影响 MQTT 闭环叙述 |

---

## 8. 答辩提纲（5–7 页建议）

逐页口播与时间分配见 **[SLIDES-OUTLINE.md](SLIDES-OUTLINE.md)**。

1. **题目与场景**：智慧路灯远程监测与联动控制  
2. **总体架构**：感知—传输—平台—应用—执行（配架构图）  
3. **技术栈选型**：BearPi/E53、EMQX、Spring Boot、Vue、PG  
4. **核心设计**：MQTT 契约 + 云侧阈值闭环 + Web 实时  
5. **真机演示要点** / 工程难点（周期上报修复）  
6. **数据与安全**：JWT、角色、控制日志  
7. **总结与展望**：运维迭代 + 可选 Agent 模块 + 诚实边界（详见路线图）  

---

## 9. 可能被问到的问题（Q&A）

**Q1：为什么规则放在云端而不是板端本地阈值？**  
A：统一策略、可远程改阈值、多设备一致；板端负责可靠采集与执行，职责清晰。板端本地阈值适合无网演示，本项目强调物联网平台价值。

**Q2：为什么用 MQTT 而不是板子直接 HTTP？**  
A：弱网友好、发布订阅解耦、Broker 可观测；HTTP 仅作降级通道且需 JWT，嵌入式更适合 MQTT。

**Q3：自动开灯判据是什么？**  
A：`lux < lightThresholdOn` 且当前 OFF → `AUTO_ON`；`lux > lightThresholdOff` 且 ON → `AUTO_OFF`。滞回区间避免临界抖动。

**Q4：如何证明设备在线？**  
A：光照上报隐式刷新 `last_heartbeat_time`；超时未上报则标记 OFFLINE 并可产生告警。

**Q5：你们最大的工程坑是什么？**  
A：Hi3861 上 MQTTYield/`recv` 阻塞导致只上报一次；改为非阻塞套接字后恢复周期上报，自动开灯才可用。

**Q6：Agent/RAG 在哪？**  
A：知识库表与配置已预留，属于应用层可选模块；答辩主线是完整 IoT 闭环，不把 LLM 当脊柱。

**Q7：如何保证指令到达？**  
A：command 使用 QoS1；板端执行后 status 回传；Web 以回传与设备状态为准，并有控制日志。下一迭代将补「PENDING→SUCCESS/超时告警」闭环确认。

**Q8：后续创新点和 Agent 做什么？**  
A：创新优先「一致性面板 / 阈值回放」等平台可观测能力；Agent 做态势摘要与告警归因，**不**替代规则控灯。详见 [ROADMAP-AND-AGENT.md](ROADMAP-AND-AGENT.md)。

**Q9：只有一块开发板如何谈多设备？**  
A：协议与表结构以 `deviceSn` 为键，天然多设备；可用 MQTT 模拟脚本刷多个 SN 证明平台侧，真机负责闭环可信度。

---

## 10. 相关文档索引

| 文档 | 用途 |
|------|------|
| [SLIDES-OUTLINE.md](SLIDES-OUTLINE.md) | **PPT 逐页提纲** |
| [ROADMAP-AND-AGENT.md](ROADMAP-AND-AGENT.md) | **迭代 / 创新 / Agent 规划** |
| [ARCHITECTURE-MAP.md](ARCHITECTURE-MAP.md) | **60 秒架构速览** |
| [quickstart.md](../../quickstart.md) | 组员启动与规矩 |
| [HARDWARE-E2E.md](../hardware/HARDWARE-E2E.md) | 板端联调 |
| [BEARPI-PLAN.md](../hardware/BEARPI-PLAN.md) | 硬件规划 |
| [API文档.md](../../smart-street-light-master/API文档.md) | 契约真源 |
| [LOCAL-RUN.md](../../smart-street-light-master/LOCAL-RUN.md) | Docker / jar |
| [2026-08-23 变更说明](../collab/发件箱/2026-08-23-端到端联调-变更说明.md) | 联调配置与改动 |

---

*生成依据：项目仓库现状 + 物联网实训「项目设计/答辩」skill（感知—传输—平台—应用—执行叙事）。*
