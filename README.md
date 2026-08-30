# 智慧光棚

设施农业光环境管控：作物光配方 → 补光/遮阳闭环 → 农艺工单 · 重庆日型仿真（一天压缩 2 分钟）。

## 上手

先看 **[docs/greenhouse/IMPLEMENT.md](docs/greenhouse/IMPLEMENT.md)** 与 **[HANDOFF.md](HANDOFF.md)**（含需求对照与已定方案）。

```powershell
git clone https://github.com/xikunn/wuliu.git
cd wuliu
cd smart-street-light-master
docker compose up -d
powershell -ExecutionPolicy Bypass -File scripts\apply-greenhouse.ps1
# 后端：Docker Maven 打 jar 或 IDE 以 local,secret 启动
```

另开终端：

```powershell
cd web
npm install
npm run dev
```

- Web：http://localhost:5173 （`admin` / `admin123` → **冠层光场**）
- API：http://localhost:8080 · EMQX：http://localhost:18083（`admin` / `public`）

产品文档：[`docs/greenhouse/`](docs/greenhouse/)（**先读** [棚体空间设计](docs/greenhouse/GREENHOUSE-LAYOUT.md)）

## 目录

| 路径 | 说明 |
|------|------|
| `docs/greenhouse/GREENHOUSE-LAYOUT.md` | **棚体设计真源**（边界/日光/床/灯/传感器） |
| `docs/greenhouse/layouts/` | 机器可读布局 JSON |
| `docs/greenhouse/` | PRD、BOM、契约、实施说明 |
| `smart-street-light-master/` | Spring Boot + Docker（PG/EMQX）+ `gh_*` |
| `web/` | 前端控制台 |
| `HANDOFF.md` | Agent / 组员交接 |

目录名仍含 `street-light`（历史包名）；**产品是智慧光棚，不是城市路灯。**

## Docker

```powershell
cd smart-street-light-master
docker compose up -d   # PG:5433  EMQX:1883
powershell -ExecutionPolicy Bypass -File scripts\docker-cleanup.ps1 -AlsoImages
```

勿提交：`application-secret.yml`、`web/.env.local`。
