# Handoff — 2026-08-22 会话压缩（bootstrap）

**下一会话建议焦点：** 正式需求验收（Must）+ MQTT/HTTP 契约冻结 + 后端骨架（可参考路灯仓）  
**压缩原因：** 上下文过长；需新 Agent / 清 context 后续作  

---

## 1. 已对齐的决策（勿推翻，除非用户改口）

1. 选题：**智慧物流**（老师清单为准），硬件 BearPi-HM Nano + E53-ST1；文件名允许杜邦线补开箱。  
2. **物联网为主，AI 为模块**；深化方向是事件驱动研判/调度副驾/运单叙事，不是侧边栏百科。  
3. 路灯仓 `smart-street-light-master` 仅作**架构参考**（上报统一进 Service、MQTT 路由、隐式心跳、WS 推送）。  
4. 板端源码物理路径 `D:\ohos\bearpi-hm_nano`，项目内 junction：`firmware/bearpi-hm_nano`；DevEco 导入该目录，**不要**导入 Spring 仓。  
5. Skills：mattpocock 精选 + 自建 iot/team-contract 在 `wuliu-main/.cursor/skills/`；**不会自动全跑**，需 `/` 显式调用。  
6. Git：本地已 commit；推送走 fork + PR（上游写权限不足）。

---

## 2. 已完成的工作

| 项 | 状态 | 指针 |
|----|------|------|
| 概念设计（对齐老师清单） | 有 | `docs/design/智慧物流-概念设计.md`（及基础版） |
| AI 认知层深化设计 | 有 | `docs/design/智慧物流-AI智能模块深化设计.md` |
| MVP/进阶/最终 + 工作流 | 有 | `docs/design/智慧物流-功能分期与工作流.md` |
| 契约草稿 MQTT/HTTP | 有 | `docs/contracts/` |
| 路灯后端业务梳理 | 已分析 | `smart-street-light-master/` |
| DevEco / 板端克隆 | 已就绪 | `D:\ohos\bearpi-hm_nano` |
| Git 初始提交 + 与上游文档合并 | 本地 + fork | PR: https://github.com/xikunn/wuliu/pull/1 |
| Cursor skills 安装 | 已拷贝 | `.cursor/skills/`（含改写后的 handoff） |
| CONTEXT + 本 handoff | 本步 | `CONTEXT.md`、本文 |

---

## 3. 未完成 / 阻塞

| 项 | 说明 |
|----|------|
| 上游 PR 合并 | 待 **xikunn** 批准 https://github.com/xikunn/wuliu/pull/1 |
| `.cursor/` 未进 Git | 工作区显示 `?? .cursor/`；CONTEXT/docs/agents 亦可能未提交 |
| 正式 PRD 验收标准 | 老师 11 条 Given/When/Then 未写 |
| MQTT/HTTP v1 frozen | 仍为 draft |
| 物流后端/前端代码 | 尚未从零实现（仅有路灯参考） |
| 板端物流固件 | 仅有官方源码，未改 MQTT 对接物流 topic |
| `/setup-matt-pocock-skills` | 尚未跑（issue tracker / CONTEXT 布局配置） |

---

## 4. 关键技术备忘

- GitHub：**HTTPS:443 不通，SSH:22 通**；已配 `Someone-hates-Monday` SSH key。  
- `origin` = xikunn/wuliu（只读推送会 denied）；`fork` = Someone-hates-Monday/wuliu。  
- 路灯 MQTT 模式可借鉴：`smart-light/{sn}/light|status|alarm` + `command`；物流草案见 `docs/contracts/mqtt.md`。  
- 提交作者必须：`Someone-hates-Monday <2872397866@qq.com>`。

---

## 5. 建议下一步（按序）

1. 用户确认是否把 `CONTEXT.md`、`docs/agents/`、`.cursor/skills` 再推一版 PR。  
2. `/setup-matt-pocock-skills`（本地 `.scratch` 或 GitHub Issues）。  
3. `/team-contract-align`：冻结 Sprint Must + MQTT/HTTP v1。  
4. `/to-spec` → `/to-tickets` → 后端骨架（参考路灯分层）。  
5. DevEco：官方 sample Build/Upload 通后再改物流 telemetry。

---

## 6. Suggested skills（下一会话）

1. `/team-contract-align` — 契约与 RACI  
2. `/to-spec` 或 `/iot-mvp-prd` — 验收级需求  
3. `/grill-me` — 若需求仍有分歧再烤  
4. `/implement` + `/tdd` — 开始写代码时  
5. `/code-review` — 每片功能合入前  
6. `/handoff` — 再次上下文将满时  

---

## 7. 开场粘贴给新 Agent

```text
请先阅读：
- CONTEXT.md
- docs/agents/HANDOFF-LATEST.md
然后从「建议下一步」第 2–4 步继续。
不要重做已完成的概念设计与路灯分析。
Git 推送用 fork/PR 流程；署名 Someone-hates-Monday。
```
