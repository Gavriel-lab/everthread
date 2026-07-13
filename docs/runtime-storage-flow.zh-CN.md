# Runtime 存储与流转协议

## 稳定目录

```text
workspace/
  runtime.json
  capture/inbox.jsonl
  capture/quarantine.jsonl
  capture/processed.json
  candidates/candidate_memory.jsonl
  review/decisions.jsonl
  review/accepted.jsonl
  review/deferred.jsonl
  review/needs_human_review.jsonl
  review/rejected.jsonl
  review/processed.json
  consolidation/life_rings.json
  consolidation/rem_dreams.jsonl
  read/context.json
  read/state.json
  vector/shadow_index.json
  loop/state.json
```

## 写入规则

- `inbox.jsonl`、候选队列和审查输出是追加式记录。
- `processed.json` 保存已处理稳定 ID，确保重复运行不重复产出。
- Life Rings、Read Context、向量索引和循环状态属于派生快照，先写同目录临时文件，再原子替换。
- 即使某类审查结果为零，对应 JSONL 文件也会存在，方便宿主稳定读取。
- quarantine 只保存错误、时间和可用 ID，不把畸形输入正文复制到 active flow。

## 一轮运行

`runOnce(root)` 依次调用 Capture Processor、Review Engine、Life Rings、REM 和 Read Context Builder，把各阶段计数写入 `loop/state.json` 后返回。它不会创建计时器、监听端口或安排下一轮。

没有新事件时，读路径和状态仍可重建，但候选数与审查决策新增数应为零。这是正常的幂等 no-op，不是失败。

## 隐私边界

只有 `review/accepted.jsonl` 的内容能够进入 active read items。`deferred` 仅提供元数据；`needs_human_review` 仅提供数量；`quarantine` 与 `rejected` 完全不参与召回。旧系统若被配置，只能作为只读引用。

## Life Rings 与 REM

- `core`：身份、边界或显著性不低于 0.85 的已接受记忆。
- `recent`：30 天内的其他已接受记忆。
- `archive`：更早的已接受记忆。
- REM 按 UTC 月份聚合 accepted 内容，只保留紧凑摘要、主题与来源记忆 ID。

这两层都是可重建派生数据，不改变 accepted 原始记录。

## 宿主接入最小契约

1. 把一条符合 `schemas/runtime-capture-event.schema.json` 的事件交给 Capture Gateway。
2. 在安全时机调用一次 `run`。
3. 从 `read/context.json` 获取受预算限制的模型上下文。
4. 在宿主自己的受控界面里处理人工审阅；不要把待审队列直接当记忆使用。
5. 如需向量检索，由宿主提供 embedding 函数；失败时继续使用旧影子索引或纯文本读路径。
