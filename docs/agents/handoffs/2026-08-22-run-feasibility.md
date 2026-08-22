# Handoff — 2026-08-22 现有程序可运行性验证

**下一会话建议焦点：** 补齐本机运行依赖（JDK21 + Maven + Docker PG/EMQX）后把路灯参考仓跑通；或跳过跑通直接 `/team-contract-align` 冻结物流契约后开骨架。  
**本步目标：** 验证仓库内**已有**程序是否完整、能否直接运行（不重做概念设计 / 路灯业务分析）。

---

## 1. 总结论（一句话）

| 对象 | 完整性 | 本机可否直接运行 |
|------|--------|------------------|
| 智慧物流产品（后端/前端/固件对接） | **无实现** | 否 |
| `smart-street-light-master`（路灯参考后端） | **后端较完整**（无前端） | **否**（缺密钥、依赖服务、JDK/Maven） |
| `firmware/bearpi-hm_nano`（官方 sample） | **官方样例齐全** | **需 DevEco**；未改物流 topic；未见本机已编出可刷镜像证明 |

**不能**把本仓当成「物流系统开箱即跑」。路灯仓可作架构样板，修环境后可本地起后端；物流闭环尚未编码。

---

## 2. 本机实测证据（2026-08-22）

| 检查项 | 结果 |
|--------|------|
| `application-secret.yml` | **缺失**（仅有 `application-secret-example.yml`） |
| Maven / `mvnw` | **PATH 无 mvn**；无 wrapper |
| JDK | 仅有 **17**；`pom.xml` 要求 **Java 21**（winget 有 `Microsoft.OpenJDK.21`） |
| Docker Desktop | **客户端在、daemon 未起** → 无法起 PG/EMQX |
| `application.yml` 数据源 / MQTT | 指向 **`10.59.47.188:5432/1883`** |
| 探测 `10.59.47.188:5432/1883` | **不可达** |
| 探测 `127.0.0.1:5432/1883/8080` | **均未监听** |
| 前端 | 仓内 **无** `package.json` / Web 工程 |
| DevEco Device Tool | 已装：`C:\Program Files\Huawei\DevEco-Device-Tool` |
| E53-ST1 / MQTT sample | 有 `D13_iot_cloud_oc_gps`（含 `E53_ST1.c`）、`D5_iot_mqtt`；**无** 物流 `wuliu/` topic 固件 |
| `out/` | 有文件（约 269），**不能**等同于当前机已成功 Build/Upload |

---

## 3. 路灯参考仓：完整度（代码面，非业务再分析）

- Spring Boot 3.5.9 + REST（users/devices/light-readings/alarms/threshold/control-logs/knowledge）+ WS + MQTT（`MqttConfig`）+ SQL schema：结构完整，可作物流分层参考。  
- README「快速开始」写 `mvn spring-boot:run`，**未说明**：须复制 secret、改 localhost、起 PG(pgvector)+EMQX、JDK21。  
- `docker.sh` 假定 Linux 路径与已装 Maven；Windows 需改写。  
- **缺口：** 无 Web 前端；依赖机房 IP 写死；LLM key 示例未配则 RAG 相关不可用（主链路可不挡）。

---

## 4. 固件面

- Junction `firmware/bearpi-hm_nano` → `D:\ohos\bearpi-hm_nano` 有效。  
- 物流相关起点：官方 **D13 GPS（E53_ST1）** + **D5 MQTT**，尚未对接 `docs/contracts/mqtt.md`。  
- 可运行路径：DevEco 导入 `D:\ohos\bearpi-hm_nano` → 选样例 Build/Upload（需板子、编译器路径、COM）；**本会话未在 DevEco 内实编实烧**。

---

## 5. 与上一 handoff 的关系

上一篇 [2026-08-22-bootstrap.md](2026-08-22-bootstrap.md) 中「物流后端/前端尚未实现」「板端未改物流 topic」**已由本机验证确认**。  
建议下一步 **第 1 条**（是否推 CONTEXT/docs）仍待用户确认；本步未推送、未改契约 frozen。

---

## 6. 若要把路灯后端在本机跑通（最短清单）

1. 启动 Docker Desktop → `pgvector/pgvector:pg17` + `emqx`（端口 5432/1883）。  
2. 执行 `sql/schema.sql`（库名 `smart-street-light`）。  
3. 复制 `application-secret-example.yml` → `application-secret.yml`（勿提交）。  
4. 将 `application.yml` 中 host 改为 `127.0.0.1`（或本机可达地址）。  
5. 安装 **JDK 21** + **Maven**，再 `mvn spring-boot:run`。  
6. 用 API 文档打登录 / 设备 / 上报冒烟（无前端时用 curl/HTTP 客户端）。

---

## 7. 建议下一步（按序，接 bootstrap）

1. 用户确认：是否把 `CONTEXT.md`、`docs/`（含本 handoff）经 fork PR 推送。  
2. （可选）按 §6 把路灯参考仓跑通，作为联调沙箱。  
3. `/team-contract-align`：Sprint Must + MQTT/HTTP v1 frozen。  
4. `/to-spec` → `/to-tickets` → 物流后端骨架。  
5. DevEco：先通官方 D13/D5 Build/Upload，再改物流 telemetry。

---

## 8. Suggested skills

1. `/team-contract-align`  
2. `/iot-mvp-prd` 或 `/to-spec`  
3. `/implement`（骨架时）  
4. `/handoff`（上下文将满时）
