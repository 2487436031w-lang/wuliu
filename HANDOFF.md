# Agent Handoff · 智慧光棚

> 2026-08-30 · 仓库根 `wuliu-main` · 读本文 + `docs/greenhouse/` 即可开工。

---

## 工程顺序（冻结）

1. **棚体空间设计**（已定）：[docs/greenhouse/GREENHOUSE-LAYOUT.md](./docs/greenhouse/GREENHOUSE-LAYOUT.md) + [`layouts/cq-demo-bay-v1.json`](./docs/greenhouse/layouts/cq-demo-bay-v1.json)  
2. BOM / MQTT / 配方契约  
3. 仿真与光场计算、前后端 **按布局同步坐标**（见布局文 §9 待办）

禁止在未改布局文档的情况下「优化」灯位或棚尺寸。

---

## 已定方案（产品）

| 项 | 决策 |
|----|------|
| 产品 | **智慧光棚**：测光 → 光配方 → 补光/遮阳闭环 → 农艺工单 |
| 棚体 | `cq-demo-bay-v1`：**16×7 m** 单跨拱棚；**长轴东西**；西南角原点；正午光自南 |
| 分区 | ZONE-A 西半石斛（4 灯+3 PAR）；ZONE-B 东半金线莲/草莓（3 灯+3 PAR）；半跨外遮阳 |
| 主作物 | 铁皮石斛：组培 60–70 / 栽培 90–120 PPFD |
| 气候 | 重庆日型；演示日可压缩 120s |
| 呈现目标 | 3D 对齐真实床/灯/测点；热力+未控/调控曲线 |
| 硬件 | 演示 `sim.*`；BOM 真型号 |
| Agent/RAG | 可选只读 |

文档真源：`docs/greenhouse/`（**先读 GREENHOUSE-LAYOUT**）。

---

## 需求 vs 完成（摘要）

Must 闭环与 3D/2min 演示已落地；**`cq-demo-bay-v1` 坐标、灯数、32×14 网格、南北 `bedSunFactor`、连续仿真（250ms）已与布局真源同步**。

下步：口播脚本、真机适配、工单/告警打磨。

---

## 运行

| 项 | 值 |
|----|-----|
| 登录 | `admin` / `admin123` |
| Web | `:5173` → `/greenhouse` |
| API | `:8080` · PG `:5433` · EMQX `:1883` |
| 启动 | `docs/greenhouse/IMPLEMENT.md` |

Remotes：`origin`=xikunn/wuliu · `fork`/`denglang`=Someone-hates-Monday

---

## Git

仅用户要求时提交/推送；禁 force-push `main`。改棚体先改 `GREENHOUSE-LAYOUT` + JSON，再改代码。
