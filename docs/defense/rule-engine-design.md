# 通用点亮规则引擎 · 技术设计

> 目标：把「路灯控制」从一段**写死的光照阈值 if 判定**，升级为一个**可配置、可组合、可运营**的通用规则平台。同一套系统，通过配置不同规则，就能服务**市政节能、乡路按需照明、农业补光**等多场景。
>
> 承接：[`ROADMAP-AND-AGENT.md`](ROADMAP-AND-AGENT.md)（迭代/创新）· [`BANZHENG-SCRIPT.md`](BANZHENG-SCRIPT.md)（答辩脚本）
> 版本：`draft (v0.1)` · 2026-08-26

---

## 1. 问题：现状为什么"不够用"

现有自动控制的判定逻辑（`LightReadingsServiceImpl.checkAndAutoControl`）：

```
当 光照 < 开灯阈值 且 灯是关的 → 自动开灯(AUTO_ON)
当 光照 > 关灯阈值 且 灯是开的 → 自动关灯(AUTO_OFF)
```

**局限**：这段逻辑是硬编码在 Java 里的，只有"光照"这一个触发源、只有"全开关"这一种动作、只有"写死"这一种配置方式。

| 想加的需求 | 现状能否支持 |
|-----------|-------------|
| 农业看"时段 + 谷电"补光 | ❌ 没有"时段"触发源 |
| 乡路"人来全亮、无人间隔亮" | ❌ 没有"人车事件"触发源、没有"间隔亮"策略 |
| 部署到不同场景都换规则 | ❌ 改规则要改代码、重编译 |
| 同一平台服务市政/农业/乡路 | ❌ 只有一套固定阈值的逻辑 |

**结论**：需要把"一个写死的 if"升级为"一套可配置的规则"。

---

## 2. 一句话定义

> **通用点亮规则引擎**：把"当 [触发源] 满足 [条件] 时，按 [策略] 执行 [动作]" 这种决策逻辑，从程序代码中抽取出来，变成**可配置、可组合、可运营**的规则项。改规则**不需改代码**、**不需重启**。

它是决策逻辑的"积木化"，是**从"单品 IoT"升级到"可多用的物联网平台"**的关键抽象。

---

## 3. 规则模型（核心数据结构）

一条规则由以下维度和字段表达：

```
┌─────────────────────────────────────────────────────────────┐
│ 规则 Rule                                                    │
├─────────────────────────────────────────────────────────────┤
│ id          规则ID                                           │
│ name        名称（如"乡路按需照明"）                           │
│ enabled     启用/停用                                         │
│ priority    优先级（数值越大越优先，冲突时裁决）                │
│ cooldownSec 冷却/防抖秒数（防止频繁触发）                       │
│                                                             │
│ 触发源 event：                                                │
│   type      LIGHT / TIME / OCCUPANCY / POWER_PRICE           │
│   operator  LT / GT / EQ / IN_RANGE / WITHIN / ANY           │
│   value     阈值或目标值（光照 lux / 电量 / 事件类型）           │
│                                                             │
│ 生效范围 scope：                                              │
│   scopeType GLOBAL / GROUP / DEVICE   （复用现有三级）         │
│   scopeKey  分组名 / 设备SN或用ID                              │
│                                                             │
│ 策略 strategy：                                               │
│   action    ON / OFF / DIMMING(调光至%) / INTERVAL(间隔亮)     │
│   intervalStep  间隔步长（策略=INTERVAL 时："隔 n 盏亮一盏"）    │
│   brightness    目标亮度%（策略=DIMMING 时）                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 触发源类型说明

| 触发源 type | 含义 | 条件来源 |
|------------|------|----------|
| `LIGHT` | 光照强度 | MQTT `/light` 上报（现有） |
| `TIME` | 时段 | 服务端时钟 / `C3 模拟时钟` |
| `OCCUPANCY` | 人/车事件 | MQTT 新增 `/occupancy` 上报（或模拟脚本） |
| `POWER_PRICE` | 电价峰谷 | 配置化的电价时段表 |

---

## 4. 与现有代码/数据的对齐（不推倒重来）

**必须复用，绝不另起炉灶**：

| 现有资产 | 复用处 |
|----------|--------|
| `devices.controlMode`(AUTO/MANUAL)、`status`、`groupName` | 判定前提、生效范围 |
| `threshold_config` + `threshold_override`（DEVICE>GROUP>GLOBAL） | 引擎的**特例规则**之一，保留兼容 |
| `MqttConfig.publishCommand()` | 统一下发通道（复用） |
| `controlLogsService.recordPendingCommand()` | 指令 PENDING/SUCCESS/超时 审计（复用） |
| WebSocket 推送（状态/光照/在线） | 实时联动（复用） |
| `mqtt-simulate-fleet.ps1` | 演示时可模拟多源事件 |

**兼容策略**：引擎上线初期，把现有"光照阈值自动开关"实现成一条**默认内置规则**（等价映射），保证老行为不回归，新用户可继续加规则。

---

## 5. 引擎判定流程

```
硬件/模拟器上报一件事件（光照/声occupied/时段tick/…）
                    ↓
       recordEvent(event)     ← 统一入口（替代裸的 threshold 判定）
                    ↓
    ① 解析事件 → 得到 {deviceId, eventType, value, time}
    ② 过滤：仅考虑 enabled=true 且 scope 命中该设备的规则
    ③ 匹配：对每条规则按 event 判断条件(operator/value)是否命中
    ④ 裁决：多规则命中时按 priority 取最高（同优先级按创建时间）
    ⑤ 防抖：检查 cooldownSec，避免目标灯短时间内反复触发
    ⑥ 生成动作：ACTION_ON/OFF/DIMMING/INTERVAL → command
    ⑦ 下发 & 落库：publishCommand + recordPendingCommand + 记 control_logs
    ⑧ 状态变更 → WebSocket 推送（复用现有）
```

---

## 6. 数据表设计（增量新增）

在现有 7 张业务表基础上，**新增 2 张表**（沿用现有命名风格）：

```sql
-- 6.1 点亮规则表
CREATE TABLE IF NOT EXISTS lighting_rules (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(64)  NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    priority      INT          NOT NULL DEFAULT 0,
    cooldown_sec  INT          NOT NULL DEFAULT 10,

    trigger_type  VARCHAR(20)  NOT NULL,   -- LIGHT / TIME / OCCUPANCY / POWER_PRICE
    operator      VARCHAR(20)  NOT NULL,   -- LT / GT / EQ / IN_RANGE / WITHIN / ANY
    trigger_value VARCHAR(64),             -- 阈值或目标（JSON 字符串按需扩展）

    scope_type    VARCHAR(20)  NOT NULL,   -- GLOBAL / GROUP / DEVICE
    scope_key     VARCHAR(64),

    action        VARCHAR(20)  NOT NULL,   -- ON / OFF / DIMMING / INTERVAL
    interval_step INT,                     -- 策略=INTERVAL 时生效
    brightness    INT,                     -- 策略=DIMMING 时生效(0-100)

    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- 6.2 规则命中/执行日志（可观测，配合 C2 回放）
CREATE TABLE IF NOT EXISTS rule_audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    rule_id     BIGINT,        -- 关联 lighting_rules.id
    device_id   BIGINT,
    event_type  VARCHAR(20),
    event_value VARCHAR(64),
    action      VARCHAR(20),
    command     VARCHAR(20),
    matched     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_scope ON lighting_rules(enabled, scope_type, scope_key);
CREATE INDEX idx_audit_rule ON rule_audit_logs(rule_id, created_at);
```

> 说明：`trigger_value` 用 VARCHAR 存 JSON（如 `{"on":30,"off":80}` 或 `{"start":"22:00","end":"05:00"}`），便于不同触发源扩展，避免字段爆炸。

---

## 7. 后端 Spring 分层改造

在现有 `com.cqu` 包下新增模块（不破坏现有 service）：

```
service/
  IRuleEngineService.java          -- 引擎入口 + 规则 CRUD
  impl/RuleEngineServiceImpl.java  -- 判定/裁决/防抖/下发编排
  impl/RuleEvaluator.java          -- 触发源条件求值（可用 simple if 分派，无需重型规则库）
entity/LightingRule.java
entity/RuleAuditLog.java
mapper/LightingRuleMapper.java
mapper/RuleAuditLogMapper.java
controller/RuleController.java     -- REST：/rules CRUD + /rules/match 调试
```

**改造要点（最少侵入）**：

1. 新增 `RuleEngineServiceImpl`，暴露 `handleEvent(DeviceEvent)`。
2. 现有 `reportReading()` 保留原逻辑（作为内置默认阈值规则），但**新增强制走引擎**的调用入口。建议：`reportReading` 里在原有阈值判定之外，额外调用 `ruleEngine.handleEvent({LIGHT})`；`OCCUPANCY/TIME` 由引擎独立处理。
3. `MqttConfig.handleMessage` 增加对 `smart-light/{sn}/occupancy` 的解析，路由到引擎。
4. `command` 枚举扩展示意：`AUTO_ON / AUTO_OFF / MANUAL_ON / MANUAL_OFF / DIMMING:<n>`；`INTERVAL` 可拆成对每组设备各自下发 `AUTO_ON/OFF`。

---

## 8. 前端功能：规则管理页 + 可视化

新增 Vue 页（如 `web/src/views/RuleEngineView.vue`），挂导航。

**页面能力**：

- 规则列表：名称 / 触发源 / 生效范围 / 动作 / 优先级 / 启停 / 最近命中
- 新增/编辑规则（表单分四段：触发源 → 生效范围 → 策略/动作 → 防抖/优先级）
- 启用/停用开关；删除
- **命中实时日志**：订阅 WebSocket 看某条规则是否实时触发（连 `rule_audit_logs`）
- **回放/试算**：输入一个历史 lux / 事件序列，预览"这条规则会触发几次"（对应 `C2` 回放沙箱，零新硬件）

**domain.ts / api/types.ts / mock.ts / normalize.ts** 都要加对应类型与接口，保持现有"Mock 模式可独立演示"的约定。

---

## 9. 三个场景如何用这套引擎配置

| 场景 | 触发源 | 条件 | 策略/动作 | 目标范围 |
|------|--------|------|-----------|----------|
| **市政节能**（现有等价） | LIGHT | 光照<30 lux → 开 | ON | 全部/编组 |
| | TIME | 23:00-05:00 | INTERVAL(隔1亮) / OFF | 编组 |
| **乡路按需照明** | OCCUPANCY | ANY(检测到行人/车) | ON(全亮) | 该组 |
| | TIME | 无人时段 | INTERVAL(隔3亮) | 该组 |
| **农业补光** | LIGHT + POWER_PRICE | 光照<800 lux 且 22:00-04:00(谷电) | DIMMING(90%) | 该组 |

> 这是**一次抽象、多个场景**：同样一张 `lighting_rules` 表、同一个引擎、同一套界面，只是配置不同规则。

---

## 10. 关键技术点（答辩卖点）

1. **规则优先级/冲突仲裁**：如"市政节能要关"与"乡路检测到人要开"同时命中 → 按 priority 裁决（人响应 > 节能），体现严谨的决策逻辑。
2. **防抖/冷却（滞回泛化）**：把现有 `lightThresholdOn < lightThresholdOff` 的滞回思想推广为通用 `cooldownSec`，避免频繁误触发（灯不会狂闪）。
3. **可观测/审计**：`rule_audit_logs` 记录每次匹配，配合 `control_logs` 实现指令闭环，可回放 → 接上 `C2 回放沙箱`。
4. **可扩展触发源**：现在 4 种，未来加 `WEATHER / ENERGY` 只需新增 evaluator，不动主链。
5. **纯增量、不推倒**：老阈值逻辑保留为默认规则，新场景自由叠加。

---

## 11. MVP 范围与排期建议

### Sprint 内可交付的 MVP（小而完整）

| 项 | 内容 | 工作量 |
|----|------|--------|
| P0 | `lighting_rules` + `rule_audit_logs` 建表 | 0.5 天 |
| P0 | 引擎 `handleEvent` + 判定/裁决/防抖 + 默认阈值规则映射 | 1.5 天 |
| P0 | `/rules` CRUD 接口 + `/rules/match` 调试 | 1 天 |
| P0 | 规则管理页（列表+表单+启停） | 1.5 天 |
| P1 | `OCCUPANCY` 触发源 + MQTT `/occupancy` + 模拟脚本扩展 | 1 天 |
| P1 | `TIME`/`POWER_PRICE` 触发源 | 1 天 |
| P1 | `INTERVAL`/`DIMMING` 策略与 command 扩展 | 1 天 |
| P1 | 命中日志实时推送 + 回放/试算页 | 1.5 天 |

**演示顺序建议**：规则页看到一个场景 → 用 `mqtt-simulate-fleet` 喂一条触发事件 → 实时看到命中日志 + 灯动作 + 控制日志 → 换一条规则复现另一个场景。

---

## 12. 风险与边界（答辩必答）

| 风险 | 应对 |
|------|------|
| 规则引擎做太重 | 用"配置 + 简单 evaluator"，**不上 Drools 等重型库** |
| 老自动控制回归 | 默认规则等价映射 + 回归测试 |
| 真机人车检测难联调 | 演示用模拟事件 + `C3 模拟时钟`，真机只复用现有光照 |
| 多规则语义混乱 | 严格控制 priority + cooldown，页面给"冲突预览" |
| 不被接受为"创新" | 强调"从单品到平台"的抽象能力，而非功能堆砌 |

---

*本文档为 `draft`，认领开发前请与工程组确认规则模型与字段。*
