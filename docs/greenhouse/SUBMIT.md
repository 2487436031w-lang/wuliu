# 智慧光棚 · 提交说明

> 版本：`v1.0` · 对应仓库提交主题：**智慧光棚 MVP 落地 + 产品壳层切换**  
> 日期：2026-08-30

---

## 1. 本次提交目的

将产品从城市照明「灯廊」切换为农业场景 **智慧光棚**，并交付可演示的测光—配方—补/遮—工单闭环（仿真驱动），同步分工与对接文档，便于组员并行与答辩叙述。

---

## 2. 变更摘要

### 文档

- 新增/更新 `docs/greenhouse/`：项目描述、分工、对接、实施、调研、PRD、光场契约  
- 根目录 `README.md`、`HANDOFF.md`、`分工.md` 统一产品名  

### 后端

- 包 `com.cqu.greenhouse.*`：实体、规则仿真、REST、定时 tick  
- 迁移 `V20260830_greenhouse.sql`（配方/分区/设备种子）  
- MQTT 订阅 `smart-greenhouse/#` 上下行  
- `application-local.yml`：`greenhouse.sim.enabled=true`  

### 前端

- 品牌与登录改为智慧光棚；默认路由 `/greenhouse`  
- 场务总览、Three.js 空间棚体 + 冠层热力、全日光照/温湿度曲线、工单审批  
- 已移除路灯地图/光照/告警/阈值页  
- Vite 代理增加 `/greenhouse`  

### 基础设施

- `docker-compose.yml` 收敛为 PG+EMQX；路灯 fleet 为可选 profile  
- `docker-cleanup.ps1`、`apply-greenhouse.ps1`  

---

## 3. 提交前检查清单

- [ ] 本地 `docker compose up -d` 后 PG/EMQX healthy  
- [ ] 已执行 `apply-greenhouse.ps1`（或全新 `init-db.ps1`）  
- [ ] 后端 `local,secret` 可登录；`GET /greenhouse/zones` 返回 2 区  
- [ ] 前端登录后进冠层；总览有 PPFD  
- [ ] 未提交 `application-secret.yml`、`.env.local`、密钥  
- [ ] 契约与代码 Topic/路径一致  

---

## 4. 建议 Git 提交信息（已用于本批）

```
feat: ship 智慧光棚 MVP with sim closed-loop and product rebrand

Add gh_* domain, Chongqing climate light-field rules, MQTT/REST,
Vue canopy console, and team docs (division, integration, submit).
```

如需拆分历史，可参考：

1. `docs:` 光棚描述/分工/对接/提交说明  
2. `feat:` 后端 gh 域与仿真  
3. `feat:` 前端智慧光棚壳层与冠层页  
4. `chore:` Docker 清理与 compose profile  

---

## 5. 推送与同步

```powershell
git push origin main
git push denglang main   # 团队镜像仓（若使用）
```

PR 说明可粘贴本文 §1–§2；测试计划粘贴 [INTEGRATION.md](./INTEGRATION.md) §6。

---

## 6. 已知限制（提交时声明）

- 光学为 MVP 解析/衰减模型，非 Radiance 实时光追  
- 棚内设备页仍部分共用路灯「设备」路由，后续应独立 `gh_devices` 视图  
- 多传感门控（VPD/EC）文档已有、代码未全开  
- 路灯 fleet 默认不启动；遗产页可能显示离线属预期  

---

## 7. 回滚提示

- 仅文档：还原 `docs/greenhouse/` 与 README/HANDOFF  
- 库表：`DROP TABLE gh_*`（慎用；需保留路灯表）  
- 关闭仿真：`greenhouse.sim.enabled=false`
