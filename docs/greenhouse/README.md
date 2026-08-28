# 智能光棚 · 文档索引

> 产品一句话：面向**铁皮石斛**（辅：金线莲）设施栽培的光环境管控——3D 冠层光分布 + 光配方驱动的补光/遮光闭环 + 农艺审批工单。

| 文档 | 用途 |
|------|------|
| [PRD-MVP.md](./PRD-MVP.md) | 场景、角色、MoSCoW、流程、验收 |
| [HARDWARE-BOM.md](./HARDWARE-BOM.md) | 真实传感器/灯/遮阳选型与信号映射 |
| [contracts/mqtt.md](./contracts/mqtt.md) | MQTT Topic 与 JSON 载荷 |
| [contracts/light-recipe.md](./contracts/light-recipe.md) | 作物光配方与设备模型契约 |
| [contracts/adapters.md](./contracts/adapters.md) | 仿真适配器 ↔ 真实驱动对照 |

**与路灯仓关系：** 本期以光棚为展示主线；路灯代码可复用鉴权/MQTT/告警/工单模式，领域模型独立。

**Agent 交接：** 仓库根目录 [HANDOFF.md](../../HANDOFF.md)（上下文压缩 + 下一步）。
