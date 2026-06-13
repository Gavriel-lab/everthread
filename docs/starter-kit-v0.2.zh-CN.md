# v0.2 Starter Kit

Everthread v0.2 是一个最小可用 CLI。它不是完整云服务，也不是前端产品。

它做四件事：

1. 初始化标准记忆包。
2. 导入聊天记录原文。
3. 生成月度 digest。
4. 生成召回预算。

## 命令

```bash
python -m everthread init ./my-memory
python -m everthread import chatgpt ./chatgpt-export --workspace ./my-memory
python -m everthread digest monthly --workspace ./my-memory
python -m everthread recall-budget --workspace ./my-memory --force
```

## 输出结构

```text
my-memory/
  hot-brain/
    accepted/
  cold-warehouse/
    imports/
    hashes/
    manifests/
    text/
  dream/
    daily/
    monthly/
  adapters/
  everthread.json
  recall-budget.json
```

## 聊天记录导入规则

v0.2 先提供 `chatgpt` 适配器，因为它是常见的导出格式之一。这个命令名不代表 Everthread 只支持 ChatGPT。

Claude、Gemini、Telegram、SillyTavern 和其他聊天端点，可以继续添加各自的导入适配器。关键不是来源品牌，而是导入后都进入同一套冷仓库结构。

当前适配器只处理 `conversations*.json`。

它会：

- 按 conversation ID 去重
- 给 conversation ID 写 SHA-256 hash
- 写 manifest
- 把每条会话转成 Markdown
- 在 Markdown frontmatter 中记录来源和 hash

它不会：

- 删除原始导出
- 上传数据到第三方
- 强制匿名化用户自己的私密聊天
- 自动生成向量
- 自动接入任何 Bot

## 遗忘与沉降

v0.2 CLI 不会擅自删除聊天记录。Everthread 推荐把“遗忘”拆成四种动作：

- `soft_forget`：原文仍在冷仓库，但降低主动召回概率
- `sink`：沉入低频层，减少对热脑区和上下文的占用
- `compress`：整理成日记、月度 digest 或稳定记忆对象
- `delete`：只有用户明确选择删除时才物理移除

## 后续方向

v0.3 可以加入：

- Telegram adapter 示例
- SillyTavern 角色卡迁移模板
- 向量库接入示例
- Dream diary 生成器

