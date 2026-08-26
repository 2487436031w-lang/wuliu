# 跨部门协作区（智慧路灯）

> 聊天不算数；写进本目录或改 `API文档.md` 才算对齐。  
> **勿再写入智慧物流需求。**

## 目录

| 路径 | 说明 |
|------|------|
| [决策/](决策/) | 产品/边界决策 |
| [发件箱/](发件箱/) | 主动提供给其他部门 |
| [收件箱/](收件箱/) | 待对方确认的请求 |
| [模板-变更请求.md](模板-变更请求.md) | CR 模板 |

## 当前关键决策

- 前端对齐路灯后端：见 [决策/2026-08-22-前端对齐路灯后端.md](决策/2026-08-22-前端对齐路灯后端.md)  
- **下一迭代双组分工（工程 / Agent）：** [../sprint/README.md](../sprint/README.md)  
- **联调清单（Must 闭环）：** [发件箱/2026-08-22-联调清单-全员.md](发件箱/2026-08-22-联调清单-全员.md)  
- 前后端对齐审计：`docs/contracts/fe-be-alignment-audit.md`  
- 契约真源：`smart-street-light-master/API文档.md`  
- 路灯**有**注册接口；与旧「物流 MVP 不做注册」无关  

## 说明文档索引

| 文档 | 路径 |
|------|------|
| **Quick Start（规矩+指令）** | [../../quickstart.md](../../quickstart.md) |
| **组员上手（少重复配置）** | [TEAM-ONBOARDING.md](TEAM-ONBOARDING.md) |
| **双组分工与冲刺** | [../sprint/README.md](../sprint/README.md) |
| 迭代/Agent 路线图 | [../defense/ROADMAP-AND-AGENT.md](../defense/ROADMAP-AND-AGENT.md) |
| 端到端变更说明 | [发件箱/2026-08-23-端到端联调-变更说明.md](发件箱/2026-08-23-端到端联调-变更说明.md) |
| 联调清单 | [发件箱/2026-08-22-联调清单-全员.md](发件箱/2026-08-22-联调清单-全员.md) |
| 对齐审计 | [../contracts/fe-be-alignment-audit.md](../contracts/fe-be-alignment-audit.md) |
| 契约目录 | [../contracts/README.md](../contracts/README.md) |
| 项目上下文 | [../../CONTEXT.md](../../CONTEXT.md) |

## RACI（双组）

| 部门 / 组 | 负责人 | 主责 |
|-----------|--------|------|
| **工程组** | （填姓名） | M1–M3、S1/S2、创新 C*、MQTT/规则/业务页 |
| **Agent 组** | （填姓名） | S3 运维助手、RAG/降级、知识库；只读+建议 |
| 前端 Web（工程侧） | | 设备/告警/阈值/Dashboard |
| 后端（工程侧） | | 规则、告警、指令闭环、API 文档 |
| 端侧固件（工程侧） | | 真机稳定与联调 |
| 组长 / 答辩 | | 冻结范围、跨组 ACK、演示脚本 |
