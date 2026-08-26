# 答辩 PPT 提纲（灯廊 · 建议 7–9 页）

> 每页一行主标题 + 口播要点。细节见 [TECH-STACK-AND-DESIGN.md](TECH-STACK-AND-DESIGN.md)、路线图见 [ROADMAP-AND-AGENT.md](ROADMAP-AND-AGENT.md)。

---

## 页 1 · 题目与场景

- **标题**：基于 BearPi 的智慧路灯监测与联动控制系统（灯廊）
- **一句话**：感知光照 → MQTT 上云 → 平台规则判定 → 指令下发 → Web 实时可见
- **用户**：市政值班 / 路灯管理员
- **口播**：不是「再做一个传感器展示」，而是可远程管、可告警、可闭环控制的物联网系统

## 页 2 · 总体架构（五层）

- 感知/执行：BH1750 + GPIO 灯控（E53_SC1）
- 端侧：BearPi-HM Nano（Hi3861）
- 传输：EMQX MQTT（`smart-light/{sn}/…`）
- 平台：Spring Boot + PostgreSQL（规则、告警、日志）
- 应用：Vue「灯廊」+ STOMP 实时
- **强调**：板子不直连 Web；规则在云端

## 页 3 · 技术栈选型

| 层 | 选型 |
|----|------|
| 硬件 | BearPi + E53_SC1 |
| 消息 | EMQX 5.x / Paho |
| 后端 | Spring Boot 3.5 / JDK 21 / MyBatis-Plus |
| 前端 | Vue 3 / Vite / Pinia / STOMP |
| 数据 | PostgreSQL（+ pgvector 预留） |

- **口播**：选型服务「可联调、可演示、可扩展」，不是堆名词

## 页 4 · 核心设计：协议与闭环

- MQTT：`light` / `status` / `alarm` ↑，`command` ↓（QoS1）
- 自动：`lux < on` → AUTO_ON；`lux > off` → AUTO_OFF（滞回）
- 手动：Web → REST switch → 同一 command 通道
- **图**：上报 → 入库 → 判定 → 下发 → 回传 → 推前端

## 页 5 · 真机演示要点（可做成「演示清单」页）

1. 灯廊 LIVE  
2. 串口 MQTT connected + published light  
3. 遮光看 lux  
4. 手动开关板灯  
5. 改阈值 / 自动开灯  
6. 告警或控制日志一眼

## 页 6 · 工程难点（加分）

- **问题**：Hi3861 上 MQTTYield 阻塞 → 只上报一次 → 自动开灯失效  
- **解决**：握手后非阻塞 socket + 主循环短 Yield + 命令缓冲  
- **口播**：说明我们做过真实嵌入式排障，不是拼装 Demo

## 页 7 · 数据、安全与角色

- `device_sn` 贯穿物理与数字身份  
- JWT（Header `token`）、角色 MUNICIPAL_STAFF / ADMIN  
- 控制日志：AUTO / MANUAL 可审计

## 页 8 · 迭代与创新 / Agent（可选 1 页）

- **迭代**：指令确认超时、告警加深、值班待办  
- **创新（选一）**：期望 vs 实际一致性，或阈值回放沙箱  
- **Agent**：运维副驾驶——态势摘要 / 告警归因 / 阈值建议（**人确认后才执行**）  
- **口播**：AI 是模块，不是系统脊柱；主线仍是物联网闭环

## 页 9 · 总结与展望

- 已完成：端—管—云—用闭环 + 可复现本地环境  
- 下一步：运维可靠性（M1–M3）、薄 Agent、策略分组  
- 不做：OTA、无人自动狂控灯、把答辩押在大模型在线

---

## 时间分配建议（总 8–10 分钟含演示）

| 环节 | 时间 |
|------|------|
| 页 1–4 讲述 | 3 min |
| 真机/录屏演示 | 3–4 min |
| 页 6 难点 + 页 8 展望 | 1.5 min |
| 收尾 | 0.5 min |

---

## 评委可能追问（速查）

见主文档 §9；额外准备：

- Agent 会不会误控灯？→ 不会直连 MQTT；仅建议 + 确认  
- 只有一块板怎么谈规模？→ 平台按 `deviceSn` 多设备设计；可用模拟多 SN 补强  
- 室内光太亮自动不开？→ 调高 on 阈值或完全遮挡 BH1750  
