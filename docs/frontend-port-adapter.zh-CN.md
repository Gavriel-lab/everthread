# 前端与端口接入

Everthread 不替代聊天前端。它应该放在“前端”和“模型调用”之间，负责让记忆在不同端点之间流动。

一个端点可以是：

- Telegram bot
- 自制 Web 前端
- 本地桌面客户端
- 移动端聊天壳
- 角色卡或其他聊天系统

无论入口是什么，接入方式都应该保持一致：前端负责聊天体验，Everthread 负责记忆召回、写入和沉淀。

## 一轮聊天的标准流动

```text
user message
  -> frontend / bot
  -> get recall context from Everthread
  -> call model with current message + recall context
  -> show assistant reply
  -> capture turn back into Everthread
  -> Dream / digest later consolidates the turn
```

关键点：前端不要直接把全部历史塞给模型。前端只向 Everthread 要一份有限、结构化、适合当前话题的召回上下文。

## 钩子 1：模型调用前，获取召回上下文

前端在调用模型前，请求一份 `recall_context`。

请求可以包含：

```json
{
  "port": "tg-bot",
  "conversation_id": "tg_123456",
  "user_message": "我们昨天说到哪里了？",
  "current_topic": "project_planning",
  "recent_turns": [
    {
      "role": "user",
      "content": "我们先把前端接上记忆吧。"
    },
    {
      "role": "assistant",
      "content": "可以，我会先设计端口适配层。"
    }
  ],
  "recall_budget": {
    "max_legacy_queries": 1,
    "max_results": 5,
    "max_context_chars": 1800
  }
}
```

Everthread 返回：

```json
{
  "recall_context": {
    "working_memory": [
      "The current topic is connecting frontends to portable memory."
    ],
    "hot_brain": [
      "The companion should preserve warmth while staying lightweight."
    ],
    "dream": [
      "Recent work focused on Everthread as a portable memory architecture."
    ],
    "source_hints": [
      {
        "source_kind": "monthly_digest",
        "summary": "Prior discussions emphasized cross-endpoint continuity.",
        "confidence": 0.86
      }
    ]
  },
  "style_note": "Use retrieved context as natural memory, not as a search report."
}
```

前端再把这份上下文和当前消息一起交给模型。

## 钩子 2：模型回复后，写回本轮对话

模型回复完成后，前端把本轮对话写回 Everthread。

```json
{
  "port": "web-frontend",
  "conversation_id": "web_2026_06_13_001",
  "turn": {
    "user": "这样不管在 TG 还是自制前端，记忆都是流转的，对吗？",
    "assistant": "对。前端只负责聊天，Everthread 负责召回和沉淀。"
  },
  "capture_policy": {
    "write_to": "working_memory",
    "candidate_for_dream": true,
    "direct_accept_to_hot_brain": false
  }
}
```

默认不要把每一轮对话直接写进 Hot Brain。更推荐先进入 working memory 或 capture queue，再由 Dream、digest 或评分规则决定：

- retain：保留
- deepen：加深连接
- compress：压缩成日记或摘要
- sink：沉降到低频层
- soft_forget：降低主动召回

## 前端只需要接三个位置

### 1. 发送前

用户点击发送后，前端先向 Everthread 请求召回上下文。

### 2. 调模型时

前端把召回上下文放进模型输入，但要求模型自然使用，不要念成检索报告。

### 3. 回复后

前端把本轮用户消息和模型回复写回 Everthread，等待后台沉淀。

## 推荐前端伪代码

```ts
async function sendMessage(userMessage: string) {
  const recentTurns = chatState.getRecentTurns();

  const recall = await everthread.getRecallContext({
    port: "custom-web",
    conversation_id: chatState.id,
    user_message: userMessage,
    recent_turns: recentTurns,
    recall_budget: {
      max_legacy_queries: 1,
      max_results: 5,
      max_context_chars: 1800
    }
  });

  const assistantReply = await model.chat({
    messages: [
      systemPrompt,
      {
        role: "system",
        content: formatRecallAsNaturalMemory(recall)
      },
      ...recentTurns,
      {
        role: "user",
        content: userMessage
      }
    ]
  });

  chatState.append(userMessage, assistantReply);

  await everthread.captureTurn({
    port: "custom-web",
    conversation_id: chatState.id,
    turn: {
      user: userMessage,
      assistant: assistantReply
    },
    capture_policy: {
      write_to: "working_memory",
      candidate_for_dream: true,
      direct_accept_to_hot_brain: false
    }
  });
}
```

## Telegram Bot 接入位置

Telegram bot 的接入点通常在收到消息的 handler 里：

```text
on message
  -> getRecallContext(...)
  -> call model(...)
  -> send reply to Telegram
  -> captureTurn(...)
```

Bot 不需要拥有自己的独立长期记忆。它只需要带上 `port: "tg-bot"` 和当前 `conversation_id`，由 Everthread 管理跨端记忆。

## 自制前端接入位置

自制前端通常有一个 `/api/chat` 或类似接口。

建议把 Everthread 接在服务端，而不是只接在浏览器里：

```text
browser
  -> /api/chat
  -> Everthread recall
  -> model provider
  -> Everthread capture
  -> browser
```

这样可以避免把私密原文、召回规则或模型密钥暴露到浏览器。

## 不推荐

不要：

- 每轮聊天都全量搜索原文。
- 把召回结果原样念给用户。
- 让每个前端各存一份长期记忆。
- 未经过 Dream 或评分，直接把所有对话写入 Hot Brain。
- 让端口适配器拥有记忆主权。

推荐：

- 当前话题不断档。
- 少量召回，像自然想起。
- 回复后写回，但延迟沉淀。
- 多端共享同一个冷仓库、热脑区、Dream 和召回预算。

## 最小接口名称建议

Everthread 的具体服务端可以自由实现，但建议保留这两个语义接口：

```text
getRecallContext(input) -> recall_context
captureTurn(turn) -> capture_record
```

前者让聊天接上过去，后者让本轮聊天进入未来。
