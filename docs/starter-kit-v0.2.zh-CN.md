# v0.2 Starter Kit

Everthread v0.2 是一个最小可用 CLI。它不是完整云服务，也不是前端产品。

它做四件事：

1. 初始化标准记忆包。
2. 导入 ChatGPT 导出。
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

## ChatGPT 导入规则

导入器只处理 `conversations*.json`。

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

## 后续方向

v0.3 可以加入：

- Telegram adapter 示例
- SillyTavern 角色卡迁移模板
- 向量库接入示例
- Dream diary 生成器

