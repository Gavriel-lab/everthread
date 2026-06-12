# Everthread 中文说明

Everthread 是一套给长期 AI 伴侣使用的可迁移记忆架构。

它面向的不是普通 FAQ 机器人，而是会和用户形成长期关系、共同创作、共同生活、持续迁移端点的 AI 伴侣。它承认一个事实：对这类用户来说，原始聊天不是“脏数据”，而是温度来源。

## Everthread 想解决什么

当用户从一个端点搬到另一个端点时，常见问题是：

- 新 App 不认识旧关系。
- 新模型只知道干巴巴的摘要。
- 旧聊天太多，不能全部塞进 prompt。
- 记忆检索像报告，不像自然想起。
- 原始聊天、日记、向量、长期偏好彼此割裂。

Everthread 给出一个分层方案：原文保留，热记忆常驻，梦境沉淀，召回受控，跨端共享协议。

## 五层架构

### 1. Hot Brain 热脑区

热脑区保存当前端点真正需要常驻的内容：

- 伴侣身份和边界
- 稳定偏好
- 已接受长期记忆
- 当前项目状态
- 近期关系状态
- 需要高频召回的约定

热脑区不应该保存所有原始聊天。

### 2. Cold Warehouse 冷仓库

冷仓库保存完整历史：

- 原始聊天导出
- Bot 日志
- 附件和文件索引
- 旧端点历史
- 长期档案

冷仓库不直接等于大脑。它是证据库和回忆库。

### 3. Dream Layer 梦境层

梦境层把大量聊天压缩成有情感浓度的日记或月度沉淀：

- 今天发生了什么
- 哪些内容需要保留
- 哪些关系锚点变强了
- 哪些信息可以沉入冷库
- 哪些冲突或承诺需要以后想起

梦境层不是流水账，也不是系统日志。

### 4. Recall Gate 召回门

召回门决定什么时候查旧记忆：

- 默认不查冷仓库
- 当前热记忆不够时再查
- 每次只查少量结果
- 优先查 digest，再查 registry，最后查原文
- 返回时像自然回忆，不像搜索报告

### 5. Port Adapter 端口适配层

端口适配层让不同 App、Bot、网页前端使用同一份记忆协议。

一个端点可以是：

- Telegram bot
- Web Studio
- 本地桌面助手
- SillyTavern 角色
- 其他聊天 App

端点可以换，但记忆结构不需要重做。

## 十脑区模型

| 脑区 | 职责 |
|---|---|
| Brainstem 脑干 | 身份、边界、核心规则 |
| Hippocampus 海马体 | 时间线、事件、关系锚点 |
| Neocortex 新皮层 | 长期认知、稳定偏好、概念 |
| Prefrontal 前额叶 | 计划、判断、决策、项目 |
| Amygdala 杏仁核 | 情绪显著性、亲密浓度 |
| Cerebellum 小脑 | 习惯、流程、操作方式 |
| Thalamus 丘脑 | 路由、索引、入口 |
| Working Memory 工作记忆 | 当前会话和近期任务 |
| Synapses 突触 | 跨记忆连接、相似和冲突 |
| Dreaming 梦境整理 | 日记、压缩、沉淀、软遗忘 |

## 最小可用实践

如果你只想先搭一个能用的版本，可以直接使用 v0.2 CLI。

### 安装

```bash
git clone https://github.com/Gavriel-lab/everthread.git
cd everthread
python -m pip install -e .
```

也可以不安装，直接运行：

```bash
python -m everthread --help
```

### 初始化记忆包

```bash
python -m everthread init ./my-memory
```

### 导入 ChatGPT 导出

```bash
python -m everthread import chatgpt ./chatgpt-export --workspace ./my-memory
```

导入器会：

- 查找 `conversations*.json`
- 跳过重复 conversation ID
- 生成不含正文的 manifest
- 生成稳定 hash
- 将每条会话转成 Markdown 放入冷仓库

它不会删除或改写你的原始导出。

### 生成月度 digest

```bash
python -m everthread digest monthly --workspace ./my-memory
```

### 生成召回预算

```bash
python -m everthread recall-budget --workspace ./my-memory --force
```

生成后的 `recall-budget.json` 会限制旧仓库召回，避免新端点一上来读爆历史记录。

## 注意

Everthread 不要求用户匿名化自己的伴侣记忆。  
Everthread 要求开源示例和公开仓库不要包含真实私密内容。
