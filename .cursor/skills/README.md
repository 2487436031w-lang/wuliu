# Cursor Skills 使用说明（mattpocock + 本仓库）

来源：[mattpocock/skills](https://github.com/mattpocock/skills)（已精选拷贝到本目录）

## 好不好用？

**好用，且和你们目标高度对齐**：用可组合的小流程约束 Agent，减少「没对齐就开写」「一次改太大」「无反馈乱修」「意外破坏性 git」类问题。它不是替你接管整条流水线（不像 GSD/BMAD 那种重框架），更适合实训/真实工程里按需调用。

## 在 Cursor 里怎么用

1. 用 Cursor 打开 **`wuliu-main`** 作为工作区根（或确保本目录在项目内）。
2. 对话里输入 `/` 选 skill，或 `@` 技能名，例如：`/grill-me`、`/tdd`、`/code-review`。
3. **第一次**先跑：`/setup-matt-pocock-skills`（选 issue 跟踪方式：GitHub Issues 或本地 `.scratch/`；文档落点等）。

推荐日常流水线：

```text
/grill-me 或 /grill-with-docs   → 对齐需求，少意外
/to-spec                        → 写成规格
/to-tickets                     → 拆成可执行小单
/implement  (+ /tdd)            → 按票实现
/code-review                    → 对照标准和规格审 diff
出 bug 时 → /diagnosing-bugs
换会话 → /handoff
```

与本仓自建 skill 的配合：

| 场景 | 用 |
|------|----|
| 选题 / MVP / 答辩 | `iot-*`、`team-contract-align` |
| 改代码防跑偏 | `grill-*` → `to-spec` → `implement`/`tdd` → `code-review` |

## 已安装（精选）

| Skill | 用途 |
|-------|------|
| setup-matt-pocock-skills | 每仓首次配置 |
| grill-me / grilling / grill-with-docs | 实现前追问对齐 |
| to-spec / to-tickets | 规格与拆票 |
| implement | 按规格实现并收尾评审 |
| tdd | 红绿重构，减少假测 |
| diagnosing-bugs | 硬 bug 诊断闭环 |
| code-review | 标准轴 + 规格轴审 diff |
| codebase-design / domain-modeling | 模块边界与领域语言 |
| resolving-merge-conflicts | 按意图解冲突 |
| handoff / wait-what | 交接与澄清 |

## 未装（原因）

- `git-guardrails-claude-code`：只针对 **Claude Code hooks**，Cursor 不直接适用
- `ask-matt`、写作课、exercise scaffold 等：与当前物联网实训关联弱
- `in-progress/*`：作者标记未稳定

完整清单与哲学见上游 README；更新可：`npx skills@latest add mattpocock/skills` 或从 `D:\ohos\mattpocock-skills` 再拷贝。
