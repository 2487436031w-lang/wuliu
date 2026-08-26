# 工程组 · 详细做法

> 分工总表：[TEAM-DIVISION.md](TEAM-DIVISION.md)  
> 契约真源：`smart-street-light-master/API文档.md`  
> 本地启动：`quickstart.md` → `scripts/team-bootstrap.ps1`

---

## 0. 开干前

1. `git pull origin main`  
2. 读 `CONTEXT.md`、MQTT 节、`docs/contracts/mqtt.md`  
3. 认领 E1–E7 后在组内登记（`docs/sprint/README.md` 成员表）  
4. **任何 REST/MQTT 字段变更**：先改 API 文档 → 发件箱 Handoff → 再写码  

**主要代码区：**

| 区域 | 路径 |
|------|------|
| 后端 | `smart-street-light-master/src/main/java/com/cqu/` |
| 前端 | `web/src/views/`、`web/src/api/`、`web/src/stores/` |
| 板端 | `firmware/streetlight/` |
| SQL | `smart-street-light-master/sql/` |

---

## Sprint A

### E1 · 指令状态机与 status 匹配（M1）

**目标：** 下发 command 后可追踪 PENDING → SUCCESS；与 status 回传关联。

**建议做法：**

1. **设计（先写 API 文档段落）**  
   - `control_logs` 增加字段（或等价）：`execution_status` = `PENDING` | `SUCCESS` | `TIMEOUT`；可选 `expected_status`、`issued_at`。  
   - 匹配规则：同一 `deviceSn`，下发 command 后 N 秒内收到**期望** status → SUCCESS。  

2. **后端**  
   - 在 `DevicesServiceImpl`（手动 switch）与 `LightReadingsServiceImpl`（AUTO_ON/OFF）写 control_log 时设 `PENDING`。  
   - MQTT 收到 `status` 时在接入层（如 `MqttConfig` / status 处理）查找最近一条 PENDING → 更新 SUCCESS。  
   - 优先**不改** command payload；用 `(deviceSn, command, timeWindow)` 匹配。若必须加 `commandId`，MQTT 只做加法字段。  

3. **前端**  
   - 设备详情或控制日志列表展示 execution_status（图标即可）。  

4. **验收**  
   - 手动开灯 → 日志 PENDING → 板灯亮 → status 回传 → SUCCESS。  
   - 断板或拒收 command → 见 E2 超时。  

---

### E2 · 超时扫描 → COMMAND_TIMEOUT 告警（M1/M2）

**目标：** PENDING 超过 T 秒（如 30s）→ 标记 TIMEOUT + 产生告警。

**建议做法：**

1. `@Scheduled` 扫描 `control_logs` where `execution_status=PENDING` and `issued_at < now()-T`。  
2. 更新为 TIMEOUT；调用 `AlarmLogsService` 创建类型 `COMMAND_TIMEOUT`（名称可议，文档冻结后不改）。  
3. 可选：WebSocket 推 `/topic/alarms`。  
4. **验收：** 关板子 MQTT 订阅或模拟不回 status → 30s 内出现告警；处理后可 RESOLVED。  

---

### E3 · 告警类型与列表筛选（M2）

**目标：** 至少支持 `OFFLINE`、上报停滞（若已有）、`COMMAND_TIMEOUT`；列表按类型筛。

**建议做法：**

1. 统一 `alarm_type` 枚举（文档 + 后端常量 + 前端下拉）。  
2. `AlarmLogsController` 列表已有 `alarmType` 参数则 FE 接上；无则补查询参数。  
3. 告警详情展示关联 deviceSn、最近 control_log id（可选）。  
4. **验收：** 筛 OFFLINE 仅离线；筛 COMMAND_TIMEOUT 仅指令失败。  

---

### E4 · Dashboard 值班待办（M3）

**目标：** 三块：活跃告警数、离线设备列表、今日 AUTO 开关次数。

**建议做法：**

1. **方案 A（推荐 MVP）：** 前端拼现有 API  
   - 活跃告警：`GET /alarm-logs?status=ACTIVE` count  
   - 离线：`GET /devices?onlineStatus=OFFLINE`  
   - AUTO 次数：`GET /control-logs?source=AUTO&date=today`（若无 date 参数则 BE 薄补或 FE 按 created_at 滤）  

2. **方案 B：** 新增 `GET /devices/overview/ops` 一次返回（Agent 组态势摘要也可复用 — 若做请写 API 文档并通知 Agent 组）。  

3. **验收：** 与 EMQX/真机状态一致；答辩可指「待办三块」。  

---

### E7 · 回归与文档（贯穿 A）

- 更新 `docs/hardware/HARDWARE-E2E.md` 或联调清单：增加 M1 验收步骤。  
- `mqtt-simulate.ps1`（若有）模拟 status 延迟/不回传。  
- Sprint A 末 Handoff 到 `docs/collab/发件箱/`。  

---

## Sprint B

### E5 · 设备级阈值 或 批量开关（S1 / S2 二选一）

**S1 设备级阈值：**

- 表：`device_threshold_override` 或 devices 表加 nullable 字段；判定逻辑：**有覆盖用覆盖，无则全局** `threshold_config`。  
- 改 `LightReadingsServiceImpl.checkAndAutoControl` 读有效阈值。  
- FE：设备编辑页可设覆盖；阈值页仍管全局。  

**S2 批量开关：**

- `POST /devices/batch-switch` body: `{ deviceIds[], status }` 或 FE 循环 `POST /devices/{id}/switch`（MVP 可接受，需控制日志 batch 标记）。  
- 权限：ADMIN；记录 control_logs source=MANUAL。  

**验收：** 改一台设备阈值不影响其他；或勾选 3 台批量 OFF 且日志可查。  

---

### E6 · 创新（C1 或 C2 选一）

**C1 期望 vs 实际一致性：**

- 云端「期望 status」= 最后一次成功 command 的目标态；与 devices.status / 最近 status 回传对比。  
- FE 设备卡片：一致绿 / 不一致红 + 文案。  

**C2 阈值回放沙箱：**

- 读某 device 近 24h `light_readings`；输入 hypothetical on/off；后端或 FE 算「会触发几次 AUTO_ON/OFF」。  
- 无新硬件，答辩友好。  

---

## 工程组自测清单（Sprint A 末）

- [ ] Docker + 后端 + 前端 + EMQX 起得来  
- [ ] 真机或 simulate：lux 上报 → 自动/手动 command → status → SUCCESS  
- [ ] 不回 status → COMMAND_TIMEOUT 告警  
- [ ] Dashboard 三块数字正确  
- [ ] API文档.md 与实现一致  
- [ ] Handoff 已发 Agent 组（告警类型枚举、可选聚合 API）  

---

## 与 Agent 组接口

| 工程交付 | Agent 用法 |
|----------|------------|
| 告警类型文档 | A4 解释告警话术 |
| control_logs 状态 | A4 归因「指令未执行」 |
| 设备/告警/光照 API | A3 态势拼上下文 |
| 阈值 PUT API | A5 确认后写入 |

**不要**为 Agent 单独开「写库 bypass」接口。

---

*工程组认领任务后在本文件对应节末签名的 PR 描述里 @ 组长即可。*
