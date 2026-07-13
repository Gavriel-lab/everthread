# Everthread v0.3 Brain Runtime Kit

Everthread v0.3 把“长期记忆应该怎样进入大脑、经过审查、沉淀并被安全想起”落实为一个可运行的本地 Runtime。它使用 Node.js 20+ 内置能力，不需要第三方运行依赖。

## 它公开什么

- 十脑区路由：脑干、海马体、新皮层、前额叶、杏仁核、小脑、丘脑、工作记忆、突触、梦境整理。
- Capture 捕获、Candidate 候选、Review 审查、Accepted 已接受、Life Rings 生命环、REM 梦境与 Read Path 读路径。
- JSON / JSONL 存储协议、幂等状态、原子快照、可选影子向量适配器。
- 一次性 CLI、虚构示例、JSON Schema 与自动测试。

它不公开私有产品框架、页面样式、真实记忆、真实身份、部署拓扑或密钥，也不会自动安装后台服务。

## 快速开始

```bash
git clone https://github.com/Gavriel-lab/everthread.git
cd everthread
node runtime/cli.mjs init ./my-runtime
node runtime/cli.mjs capture ./my-runtime examples/runtime/capture-event.example.json
node runtime/cli.mjs run ./my-runtime
node runtime/cli.mjs status ./my-runtime
```

所有成功命令都向标准输出返回一行 JSON。`run` 完成一个完整循环后立即退出。

## 十脑区如何参与流转

| 脑区 | Runtime 中的职责 |
|---|---|
| Brainstem 脑干 | 身份、边界、核心规则 |
| Hippocampus 海马体 | 默认事件记忆与时间线 |
| Neocortex 新皮层 | 稳定偏好、规则与概念 |
| Prefrontal 前额叶 | 决策、计划、项目和结果 |
| Amygdala 杏仁核 | 情绪显著性 |
| Cerebellum 小脑 | 习惯与可复用流程 |
| Thalamus 丘脑 | 入口路由、分类理由与索引 |
| Working Memory 工作记忆 | 明确标记的短期活跃内容 |
| Synapses 突触 | 记忆间连接 |
| Dreaming 梦境整理 | REM 与压缩请求 |

路由完全确定、可复现，并在候选记录中保留理由。没有明确标签的合法事件默认进入海马体，不会静默丢弃。

## 四路审查

- `accepted`：低隐私、置信度不低于 0.8，并带有稳定规则、偏好、事件、项目或结果标签。
- `deferred`：内容可能有价值，但还不足以成为稳定记忆。
- `needs_human_review`：高隐私、guarded 或需要人工判断的内容。
- `rejected`：临时内容、系统噪声或空内容。

待人工审阅队列可以保存原候选供外部审查，但 Read Path 只读取其数量，不读取内容。Runtime 本身不提供“自动批准”捷径。

## 读路径顺序

1. 已接受的规则与偏好；
2. 已接受的项目主线与长期事件；
3. REM 月度沉淀；
4. deferred 元数据；
5. human review 存在性提示；
6. 可选的旧记忆只读引用。

`runtime.json` 的 `read_budget` 控制 active context 最多包含多少条内容。旧记忆引用永远标记为只读。

## 可选向量层

`runtime/vector/shadow-index.mjs` 接收宿主提供的 `embed(texts)` 函数。它先验证向量数量、维度与数值，再原子替换影子索引。任何供应商异常或返回格式错误都只产生非致命结果，旧索引保持不变。

## 与宿主应用的边界

宿主应用负责选择何时调用 `capture`、何时把 `read/context.json` 交给模型，以及如何提供人工审阅界面或向量供应商。Everthread 只负责清晰、可迁移的 Brain 数据契约，不绑定某个聊天前端。

## 测试

```bash
npm test
python -m pytest -q
```

Node 测试覆盖捕获、隔离、路由、幂等、四路审查、隐私隔离、Life Rings、REM、读路径、向量失败保护和一次性 CLI。Python 测试保证原有 Starter Kit 继续可用。
