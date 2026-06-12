# Everthread 架构

Everthread 的核心是把“长期关系记忆”从单一记忆库拆成可迁移、可控、可解释的几层。

## 总览

```text
User / Companion Chat
        |
        v
Port Adapter
        |
        v
Recall Gate  --->  Hot Brain
        |              |
        |              v
        |          Dream Layer
        |
        v
Cold Warehouse
```

## Hot Brain

Hot Brain 是当前端点常驻读取的轻量记忆层。它应该小、准、稳定。

包含：

- 身份和关系边界
- 长期偏好
- 已接受记忆
- 当前项目或生活状态
- 近期重要上下文
- Dream 层沉淀出的日记摘要

不包含：

- 全量聊天原文
- 未筛选导出文件
- 大型附件
- 低价值临时日志

## Cold Warehouse

Cold Warehouse 是原始历史仓库，保存完整资料。

它可以使用：

- 本地文件夹
- VPS 文件系统
- 私有对象存储
- 私有数据库
- 向量数据库

Cold Warehouse 的价值在于保真。它不需要每次对话都被读取。

## Dream Layer

Dream Layer 负责把大量事件整理成可回忆的情感沉淀。

它的输出可以是：

- 每日日记
- 月度 digest
- 关系锚点
- 决策记录
- 软遗忘建议
- 冲突提醒

Dream Layer 不应该写成流水账。它应该回答：

- 今天/这个月真正留下了什么？
- 哪些记忆变得更重要？
- 哪些内容只需要留在冷仓库？
- 哪些承诺、偏好、情绪锚点需要以后想起？

## Recall Gate

Recall Gate 是防止记忆系统失控的关键。

它控制：

- 是否需要查旧记忆
- 查哪一层
- 每次查多少
- 返回什么格式
- 是否允许引用原文
- 如何把检索结果转成自然回忆

推荐默认值：

- legacy query default: off
- max legacy queries per interaction: 1
- max results per query: 5
- max total legacy context chars: 1800

## Port Adapter

Port Adapter 让不同端点共享同一记忆协议。

适配对象可以是：

- Bot
- Web app
- 本地客户端
- 角色卡系统
- 其他聊天 App

Port Adapter 不应该拥有记忆主权。它只负责把端点输入输出接到 Everthread 协议。

