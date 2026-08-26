# CONTEXT.md — 智慧路灯（当前交付）

共享语言与项目心智模型。新 Agent **先读本文** + `docs/agents/HANDOFF-LATEST.md`，再动手。

> **注意：** 本仓目录名仍为 `wuliu`，但**当前产品交付是智慧路灯**，不是智慧物流。勿按物流运单/五角色/GPS 轨迹实现。

## 一句话

BearPi / 传感器上报光照与状态 → MQTT/HTTP → Spring Boot 规则（阈值开关、心跳离线）→ WebSocket 推前端；Web「灯廊」管理设备、告警与阈值。

## 产品姿势

- **主交付 = 路灯物联网闭环**：光照上报 → 阈值自动开关 → 手动控制 → 告警 → 控制台  
- **AI/RAG**（`/knowledge-chunks`）为可选项，不挡 MVP  
- **契约真源：** `smart-street-light-master/API文档.md`

## 术语表

| 术语 | 含义 |
|------|------|
| deviceSn | 设备序列号；MQTT 主题键 `smart-light/{deviceSn}/…` |
| status | 灯开关：`ON` / `OFF` |
| onlineStatus | `ONLINE` / `OFFLINE`（心跳/光照隐式刷新） |
| 阈值 | `lightThresholdOn` / `lightThresholdOff` / `heartbeatTimeout`（Web「阈值」页可改） |
| 确定层 | 阈值与心跳规则产生的自动开关、离线告警 |
| token | JWT；HTTP Header 名 `token`；成功 `code=200` |

## 角色

| 标识 | 说明 |
|------|------|
| `MUNICIPAL_STAFF` | 市政人员（默认注册角色） |
| `ADMIN` | 路灯管理员 |

## 仓库与路径

| 路径 | 内容 |
|------|------|
| `smart-street-light-master/` | 路灯后端 + API 文档 |
| `web/` | 路灯前端「灯廊」（Vue3；默认 Mock） |
| `firmware/` | 板端说明 / junction（勿整树提交） |
| `docs/collab/` | 跨部门协作（路灯） |
| `docs/contracts/` | 契约索引（指向 API 文档） |
| `docs/agents/` | Handoff（入口 `HANDOFF-LATEST.md`） |
| `smart-street-light-master/LOCAL-RUN.md` | **本地** Docker + jar 启动 |
| `docs/collab/TEAM-ONBOARDING.md` | **组员上手**：少重复配置 |
| `scripts/team-bootstrap.ps1` | 一键复制模板 + 起 Docker/后端 |
| `README.md` | 仓库入口 |
| `quickstart.md` | **规矩 + 重要指令（组员首读）** |

## Git / 协作

- 仓库：https://github.com/xikunn/wuliu （合作者可直接 push / 合 PR）  
- 组员首读：`quickstart.md` → `README.md` → `docs/collab/TEAM-ONBOARDING.md`  
- clone：`git clone https://github.com/xikunn/wuliu.git`  
- 同步：`git checkout main` → `git pull origin main`  
- GitHub 若 HTTPS 不通可用 SSH：`git@github.com:xikunn/wuliu.git`

## 硬约束

- 勿提交 `D:\ohos\bearpi-hm_nano` 整树、`application-secret.yml`、私钥  
- 勿再引入智慧物流设计/接口文档干扰本交付  
- LLM 不得无人确认自动狂发 MQTT  
