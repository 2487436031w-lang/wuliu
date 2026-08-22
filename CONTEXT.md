# CONTEXT.md — 智慧物流（wuliu）

共享语言与项目心智模型。新 Agent **先读本文** + `docs/agents/HANDOFF-LATEST.md`，再动手。

## 一句话

小熊派 BearPi-HM Nano + E53-ST1（GPS/蜂鸣/LED）做在途终端；云端完成运单绑定、轨迹、三类异常、调度指令；AI 是**应用层认知模块**（研判/副驾/叙事），不是系统中心。

## 产品姿势

- **主交付 = 物联网闭环**：感知 → MQTT → 规则/业务 → 控制回传 → 多角色 Web  
- **Agent/RAG = 模块**：可降级；确定层（阈值告警）必须独立可演示  
- 老师清单 11 条用户故事要覆盖；个性化在实现方式（双模定位、杜邦开箱、1+N 多车）

## 术语表

| 术语 | 含义 |
|------|------|
| 运单 / Shipment | 货物运输业务对象；追踪按运单而非裸设备 |
| 车辆 / Vehicle | 绑定 deviceSn 的运输单元 |
| deviceSn | 硬件/MQTT 主题键，对应云端设备 |
| 双模定位 | `source=gps\|sim`，载荷字段一致；教室用 sim，室外补真 GPS |
| 三类异常 | 偏航、异常停留、异常开箱（开箱用杜邦按键） |
| 确定层 | 规则引擎产生的原始告警 |
| 认知层 / LIM | 告警研判、调度建议草稿、运单叙事、对话入口 |
| CommandDraft | AI 建议指令；必须人确认后才走原 MQTT command |
| 路灯参考仓 | `smart-street-light-master`：Spring Boot + MQTT + WS 实现样板，非本产品 |

## 角色

货主、仓库管理员、调度员、司机、系统管理员（Web 可角色切换）。

## 分期

- **MVP**：绑定 → 上报 → 轨迹/ETA → 告警 → 指令蜂鸣 ack → 送达（AI 可不挡路）  
- **进阶**：告警研判 + 调度副驾 + 运单速览  
- **最终**：11 条齐、认知层齐、真 GPS 补录 + 文档答辩  

详见：`docs/design/智慧物流-功能分期与工作流.md`

## 仓库与路径

| 路径 | 内容 |
|------|------|
| `web/` | Vue3 前端 MVP（Mock 可脱机演示） |
| `smart-street-light-master/` | 路灯后端参考（可学 MQTT/WS/阈值模式） |
| `firmware/README.md` | 板端说明；源码联接 `D:\ohos\bearpi-hm_nano` |
| `接口文档.md` / `技术栈与开发流程.md` / `项目任务.md` | 上游已有文档 |
| `docs/design/` | 概念设计 / AI 深化 / 分期（本仓副本） |
| `docs/collab/` | **跨部门协作**：决策、发件箱、收件箱（注册/接口扩展等） |
| `docs/contracts/` | MQTT/HTTP 契约草稿 |
| `docs/agents/` | Agent 交接与索引 |
| `.cursor/skills/` | mattpocock 精选 + iot-* + team-contract-align |

## Git / 协作

- 上游：`xikunn/wuliu`；个人 fork：`Someone-hates-Monday/wuliu`  
- 无直接写上游权限时用 **PR**：https://github.com/xikunn/wuliu/pull/1  
- 提交署名：`Someone-hates-Monday <2872397866@qq.com>`（勿用 Cursor 作 committer）  
- HTTPS 到 GitHub 常不通；**SSH 可用**  

## 硬约束

- 勿把 `D:\ohos\bearpi-hm_nano` 整树提交进 Git  
- 勿提交 `application-secret.yml` / 私钥  
- 室内演示默认 sim GPS；开箱用杜邦线  
- LLM 不得无人确认自动狂发 MQTT  
