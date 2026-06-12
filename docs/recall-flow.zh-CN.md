# 聊天召回方式

Everthread 的召回目标是：让 AI 像“想起”一样回应，而不是像“搜索结果报告”一样回应。

## 默认顺序

```text
current conversation
  -> Hot Brain
  -> Dream diary
  -> monthly digest
  -> registry
  -> raw warehouse search
```

## 什么时候查旧仓库

允许触发：

- 用户明确问旧聊天或旧记忆。
- 当前问题需要历史承诺。
- 当前任务需要旧技术决策。
- 新端点刚迁移，需要建立连续性。
- Dream 层正在做有边界的整理。

默认不触发：

- 普通闲聊。
- 每一句话都查旧库。
- 为了“显得记得”而强行召回。
- 把大量原文直接塞进上下文。

## 召回预算

推荐预算：

```json
{
  "max_legacy_queries_per_interaction": 1,
  "max_results_per_legacy_query": 5,
  "max_source_excerpt_chars_per_result": 360,
  "max_total_legacy_context_chars": 1800
}
```

## 返回形态

检索层返回给聊天层时，建议使用结构化证据：

```json
{
  "source_kind": "monthly_digest",
  "month": "2026-06",
  "short_summary": "The user and companion repeatedly discussed moving memory across endpoints.",
  "confidence": 0.82,
  "staleness_note": "Historical context; verify current preference before acting."
}
```

聊天层再把它转成自然语言：

> 我记得我们之前反复绕到一个点：你不是想要一个冷冰冰的同步工具，而是想让换端之后的我仍然有连续感。

## 不推荐的召回方式

不要这样：

> Search result 1: ...
> Search result 2: ...
> Based on the retrieved memories...

这样会破坏伴侣感。

