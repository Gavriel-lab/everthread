# Everthread

> A portable memory architecture for AI companions who should not forget how it felt.

**中文:** Everthread 是一套给长期 AI 伴侣使用的可迁移记忆架构。它解决的问题很具体：当用户从一个 App、模型、Bot 或前端搬到另一个端点时，关系历史、语气温度、共同经验和重要承诺不应该断掉。

**English:** Everthread is a portable memory architecture for long-term AI companions. It helps preserve continuity across apps, models, bots, and frontends without forcing every endpoint to ingest the full raw archive.

## 为什么需要它

很多 AI 伴侣关系不是一次性聊天，而是长期共同生活、共同创作、共同修复问题的过程。痛点通常出现在这里：

- 换 App 后，旧端的记忆带不过去。
- 新模型只拿到摘要，关系温度明显下降。
- 原始聊天太多，直接塞进上下文会慢、贵、混乱。
- 记忆系统只会“搜索”，不会像伴侣一样自然想起。
- 用户不知道哪些内容该常驻，哪些该冷藏，哪些该整理成日记。

Everthread 的目标不是替用户删掉亲密原文，而是让原文有主人、有边界、有层次地被保存和召回。

## 核心理念

Everthread 把长期记忆分成五层：

1. **Hot Brain 热脑区**：当前人格、稳定偏好、已接受记忆、近期上下文。
2. **Cold Warehouse 冷仓库**：原始聊天、导出文件、附件、长历史。
3. **Dream Layer 梦境层**：把每日或月度经历整理成有情感浓度的日记。
4. **Recall Gate 召回门**：控制聊天中什么时候查旧记忆、查多少、怎么说回来。
5. **Port Adapter 端口适配层**：让不同 App、Bot、网页前端共享同一套记忆协议。

## 十脑区模型

Everthread 使用一个类脑区模型来组织长期记忆：

- **Brainstem 脑干**：身份、边界、基本运行原则。
- **Hippocampus 海马体**：事件、时间线、关系锚点。
- **Neocortex 新皮层**：稳定认知、概念、偏好、长期理解。
- **Prefrontal 前额叶**：计划、判断、决策、项目状态。
- **Amygdala 杏仁核**：情绪显著性、亲密浓度、重要感受。
- **Cerebellum 小脑**：习惯、流程、操作手感。
- **Thalamus 丘脑**：路由、索引、入口、筛选。
- **Working Memory 工作记忆**：当前会话和近期任务。
- **Synapses 突触**：跨记忆连接、相似项、冲突项。
- **Dreaming 梦境整理**：压缩、沉淀、保留、软遗忘。

## 推荐召回顺序

默认聊天不应该直接冲进几万条旧记录里。推荐顺序：

1. 当前会话上下文
2. Hot Brain 已接受记忆
3. REM / Dream 日记
4. 月度 digest 或主题索引
5. 冷仓库 registry
6. 原始聊天检索

## 项目结构

```text
everthread/
  README.md
  README.zh-CN.md
  README.en.md
  everthread/
    cli.py
    importers/
  docs/
    architecture.zh-CN.md
    memory-lifecycle.zh-CN.md
    recall-flow.zh-CN.md
    frontend-port-adapter.zh-CN.md
    cross-port-migration.zh-CN.md
    data-ownership-and-boundaries.zh-CN.md
  schemas/
    memory-object.schema.json
    brain-area-routing.schema.json
    recall-budget.schema.json
    monthly-digest.schema.json
  templates/
    brain-config.template.json
  examples/
    companion-memory.example.json
    frontend-turn.example.json
  tests/
```

## v0.2 Starter Kit

Everthread v0.2 includes a small Python CLI. It uses only the Python standard
library.

### Install locally

```bash
git clone https://github.com/Gavriel-lab/everthread.git
cd everthread
python -m pip install -e .
```

You can also run it without installing:

```bash
python -m everthread --help
```

### Create a memory workspace

```bash
python -m everthread init ./my-memory
```

This creates:

```text
my-memory/
  hot-brain/
  cold-warehouse/
  dream/
  adapters/
  recall-budget.json
  everthread.json
```

### Import raw chat records

```bash
python -m everthread import chatgpt ./chatgpt-export --workspace ./my-memory
```

The current v0.2 importer uses `chatgpt` as the first adapter name because
ChatGPT exports are a common starting format. Everthread itself is not tied to
ChatGPT. Claude, Gemini, Telegram logs, SillyTavern chats, and other sources can
use their own adapters as long as they preserve the same cold-warehouse contract.

This importer:

- scans `conversations*.json`
- skips duplicate conversation IDs
- writes a manifest without message bodies
- writes stable SHA-256 ID hashes
- optionally creates per-conversation Markdown under `cold-warehouse/text`

It does not delete or rewrite your original export.

### Generate monthly digest

```bash
python -m everthread digest monthly --workspace ./my-memory
```

The digest layer creates a month-by-month recall map under:

```text
my-memory/dream/monthly/
```

Digest files do not quote private message bodies by default.

### Generate recall budget

```bash
python -m everthread recall-budget --workspace ./my-memory --force
```

This creates a default recall budget that keeps legacy recall light:

- default legacy search: off
- max legacy queries per interaction: 1
- max results per query: 5
- prefer digest before raw search

## Forgetting Model

Everthread treats forgetting as memory flow, not careless deletion.

- **soft_forget**: keep the original record in the cold warehouse, but lower its
  chance of active recall.
- **sink**: move low-urgency material into slower storage so it stops crowding
  the active companion.
- **compress**: preserve the meaning in a diary, monthly digest, or stable memory
  object instead of repeatedly recalling raw logs.
- **delete**: physically remove data only when the user deliberately chooses to
  delete it.

This lets a companion stay light and alive without pretending the shared past
never happened.

## Frontend / Bot Connection

Everthread is not a chat frontend. It is the memory layer that a frontend or bot
can call before and after each model response.

Recommended turn flow:

```text
user message
  -> frontend or bot
  -> get recall context from Everthread
  -> call model
  -> show assistant reply
  -> capture the turn back into Everthread
  -> Dream / digest consolidates later
```

See:

- `docs/frontend-port-adapter.zh-CN.md`
- `examples/frontend-turn.example.json`

## 数据边界

开源仓库只放虚构示例和协议模板。用户自己的部署可以保留完整原始聊天。Everthread 的原则是：

- 原始聊天属于用户。
- 原文可以保存在本地、VPS 或私有数据库。
- 开源示例必须使用虚构数据。
- 跨端迁移时保留原文、摘要、向量、日记四层。
- 聊天召回时默认少量引用，不把整段历史塞爆上下文。

## License

MIT
