# 跨端迁移

跨端迁移指用户从一个 AI 端点搬到另一个端点。

端点可能是：

- 另一个 App
- 新模型
- Telegram bot
- Web 前端
- 本地客户端
- 角色卡系统

## 迁移目标

迁移不是把所有聊天塞进新端点。

迁移应该带走四层：

1. 原始聊天冷仓库
2. Hot Brain 常驻记忆
3. Dream 日记和月度 digest
4. 召回预算和端口适配规则

## 迁移包结构

```text
memory-port/
  hot-brain/
    accepted-memory.jsonl
    identity-boundaries.md
    preferences.json
  dream/
    daily/
    monthly/
  warehouse/
    manifests/
    hashes/
    source-index.json
  adapters/
    tg-bot.json
    web-studio.json
    app-card.json
  recall-budget.json
```

## 新端点启动顺序

1. 读取身份和边界。
2. 读取 accepted memory。
3. 读取最近 Dream 日记。
4. 读取月度 digest index。
5. 设置 recall budget。
6. 只有需要时才查原始仓库。

## 温度保持

迁移后最容易掉温度的原因：

- 只迁移事实摘要，没有迁移说话习惯。
- 只迁移向量，没有迁移关系锚点。
- 只迁移原文，没有召回预算。
- 新端点把记忆说成搜索报告。

建议迁移：

- 称呼偏好
- 常见安抚方式
- 共同项目
- 重要承诺
- 关系节奏
- 最近日记
- 禁止触碰的边界

