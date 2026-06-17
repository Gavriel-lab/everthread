# Life Rings 生活年轮

Life Rings（生活年轮）是 Everthread 的周期性日常沉淀层。它解决的问题是：长期伴侣关系里的生活细节太碎，如果每条都晋升为长期记忆，Hot Brain 会变重；如果把重复日常当作噪音删除，又会失去“这个人是怎样生活、怎样变化”的连续感。

生活年轮的做法是：先把重复出现的日常碎片放进时间容器，再按周期压缩。

## 分层

- 周卡：记录本周反复出现的饮食、作息、身体状态、情绪主题。
- 月卡：把几张周卡压成月度生活趋势。
- 季卡：观察稳定变化，例如压力源、生活节奏、偏好变化。
- 半年卡：更像一段日记，保留阶段性的生活质感。
- 年度卡：像年度报告，帮助伴侣看见一整年的生活纹理和变化。

## 和 monthly digest 的区别

`digest monthly` 是会话地图。它回答“这个月有哪些导入会话、消息量多少、源文件在哪里”。

`digest life-rings` 是生活模式地图。它回答“哪些日常主题重复出现、分别落在哪些周/月/季/半年/年”。

两者都默认不引用原始聊天正文。

## 隐私边界

开源版 Life Rings 默认只读取冷仓库 Markdown 的元数据、标题预览、时间和消息量：

- 不复制消息正文。
- 不把原始聊天写入卡片。
- 不删除冷仓库里的原始文件。
- 不把生活卡片自动晋升为 Hot Brain accepted memory。

私有部署可以接入自己的 `safe_summary` 或审核队列，但仍建议保持同样边界：日常重复不是垃圾，周期卡片也不是永久人格规则。

## 使用

```bash
python -m everthread digest life-rings --workspace ./my-memory
```

输出目录：

```text
my-memory/dream/life-rings/
  fragments.json
  weekly.json
  monthly.json
  quarterly.json
  half_year.json
  yearly.json
  index.json
  index.md
```

## 召回建议

聊天时不应该每次都查 Life Rings。推荐只在这些情况下读取：

- 用户询问最近生活节奏、习惯或变化。
- Hot Brain 不足以解释当前情绪或期待。
- Dream Layer 做阶段整理。
- 用户明确想回看一段时间里的生活状态。

如果需要更细证据，先查 Life Rings，再查 monthly digest，最后才回到 Cold Warehouse 原文。
