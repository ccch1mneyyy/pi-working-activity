# pi-working-activity

> 让 pi 的 Working 行活过来——实时工具动态 + 俏皮中文文案 + 稀有彩虹彩蛋 + 模型自述 + 上下文预警。

## 功能一览

### 🛠 真实工具活动
监听 `tool_execution_start` / `tool_execution_end`，Working 行实时显示正在跑什么——不是假转圈。

```
翻翻 src/index.ts
改改 package.json
跑命令 npm run build
搜搜 NARRATE_MIN_MS
```

### ⏩ 快工具队列重播
执行时间 < 1.5s 的工具一闪而过？不会。快工具排队逐个播 1s，最后一条粘留 3s，让你看得到。

### 💬 俏皮文案池
思考时 Working 行轮换 95 条口语化短句，约 2.6s 一换，像活人在说话。

> 嗯…让我捋捋 → 盘一下盘一下 → 大脑转起来了 → 思考.gif → 啾，让我想想 → lol → 别催别催

想太久了自动换档：
- 🕐 **30s**：转圈圈… 马上马上 嗯，让我细想想
- 🕑 **1min**：还在努力… 烧脑中… 这题有点东西
- 🕒 **5min**：还没放弃… 这题真的硬… 我给跪了…

### 🎰 稀有彩虹彩蛋
约 1/150 概率（每 6–7 分钟一次），Working 行炸出加粗七彩流光，停留 7.5 秒。

```
S S R ！  金色传说  g g  e z  暴击了  wink ~  你发现我了
```
每个字独立色相 & 加粗，95% 饱和度，14°/帧滚动。很浮夸，很爽。

### ⏵ 模型自述
可选功能。开关打开后，扩展通过 `context` 事件向模型注入一条约定：每个步骤开始时写 `⏵ 你在做什么（≤20 字）`。扩展实时解析流式输出，把自述显示在 Working 行。

```
⏵ 查一下报错原因        →  Working 行：查一下报错原因 · 搜搜 error.log
⏵ 给补丁跑个验证        →  Working 行：给补丁跑个验证 · 跑命令 node test
```

### 📊 实时配速
- 思考中：`嗯… · 总1m23s`
- 工具中：`改改 file.ts · 3s`
- 结束后：底部状态区闪现 `搞定 ✓ · 4 工具 · 想3s 干2s`，同时对话区末尾弹通知 `⏱ 总用时 1m23s · 4 工具 · 想12s 干11s`

### ⚠ 上下文预警
每 3s 检查一次 context 用量。超过阈值（默认 80%）时 Working 行亮黄：

```
⚠ 上下文85% · 嗯… · 总1m23s
```

`contextWarnAt: 0` 关闭。

### 🔥 连击检测
连续 5+ 工具触发 `火力全开×N`（并行工具也算连击）。10+ 工具收尾时显示 `十连击`。

### ⏱ 慢工具提示
单工具超 30s 亮 `这个有点慢 ·` 前缀。

### 🌙 时间感知
- **0–6 点**：思考池混入 `修仙中…` `夜猫子出没` `熬夜冠军` 等深夜专属文案
- **周末**：首次会话弹一句 `周末也在卷？` `放假也陪你`

### 🎨 30+ 动画预设
`/activity` 打开交互选择器，或 `/activity frames <name>` 直接切：

`claude` `braille` `moon` `comet` `spark` `breathe` `dots` `circle` `pulse` `star2` `flip` `aesthetic` `hamburger` `random` …

### 😐 英文冷幽默
`lol` `hm` `oh` `ok` `um` `heh` `uh` `nah` `mm` `wow` `nice` `rgrg` `done` `again` `gg` `ez`

混在一堆「嗯…」「盘一下」「啾」中间，冷不丁冒一句面无表情的英语。那种「我也不是真的在笑」的冷感。

### ❌ 工具失败文案
出错的工具不再只是 `✗`，而是随机一句：

```
翻车了 · 读文件 config.json ✗
权限不对？ · 跑命令 npm i ✗
```

### 🤖 子代理计数
并行多个子代理时显示 `小弟×N`：

```
派个小弟 修测试 · 小弟×3 · 另 2 项
```

### ⚡ ~tok/s 流式速率
`showTokPerSec: true` 后，按 `text_delta` 的中英文字符粗估流式 token 速率：

```
~42 tok/s · 嗯… · 总1m23s
```

Pi 的流式事件不提供逐段 usage，因此这是实时估算值；收尾摘要里的 token 数仍使用模型返回的实际 usage。

### 🎄 节假日彩蛋
元旦、春节、情人节、愚人节、劳动节、儿童节、万圣节、平安夜、圣诞、跨年——自动检测，思考池混入节日专属文案，同样用七彩流光渲染。

### 🔄 模型切换梗
`/model` 切模型时，Working 行闪一句和模型名相关的梗，1.5s 后恢复。

### ☕ 累计活跃提醒
默认每累计活跃 3 小时弹一次提示，提醒喝水休息。只有 agent 真正运行的时间计入；`workRemindAt: 0` 关闭，或改成其他间隔（小时数）。

### 🔧 自定义工具映射
`customActions` 让你为自己的工具/MCP 定义文案映射，按工具名精确匹配（不执行配置中的正则）：

```json
{
  "customActions": {
    "my_deploy": ["部署一下", "上线中"],
    "format_code": ["格式化", "整理代码"]
  }
}
```

## 安装

```bash
pi install npm:pi-working-activity
```

## 配置

`~/.pi/agent/working-activity.json`（首次运行自动生成）：

| 键 | 类型 | 默认值 | 说明 |
|---|------|--------|------|
| `frames` | `string` | `"moon"` | 动画预设名，`"random"` 每轮随机 |
| `narrate` | `boolean` | `false` | ⏵ 模型自述开关 |
| `contextWarnAt` | `number` | `80` | 上下文预警阈值（百分比），`0` 关闭 |
| `contextDangerAt` | `number` | `95` | 上下文危险阈值，超过后变红 |
| `showTokPerSec` | `boolean` | `false` | 流式输出时显示 `~tok/s` 估算速率 |
| `workRemindAt` | `number` | `3` | 累计活跃 N 小时提醒喝水，`0` 关闭 |
| `customPhrases` | `string[]` | `[]` | 追加到思考文案池的自定义短句 |
| `customActions` | `object` | — | 自定义工具→文案映射，如 `{"my_tool": ["搞一下","整一个"]}` |
| `debugLog` | `boolean` | `false` | 调试日志（`~/.pi/agent/working-activity-debug.log`，>512KB 自动截断） |

## 命令

| 命令 | 说明 |
|------|------|
| `/activity` | 打开动画预设交互选择器 |
| `/activity frames <name>` | 直接切换预设，如 `/activity frames claude` |
| `/activity frames random` | 每轮随机一个预设 |
| `/activity narrate on\|off` | 开关模型自述 |
| `/activity status` | 显示当前所有配置 |
| `/activity warn <0-100>` | 修改上下文预警阈值，0=关闭 |
| `/activity danger <n>` | 修改红色危险阈值，必须不低于 warn 阈值 |
| `/activity tps on\|off` | 开关流式 `~tok/s` 估算显示 |
| `/activity remind <0-24>` | 设置累计活跃提醒间隔，0=关闭 |
| `/activity phrase add <文案>` | 追加自定义思考短语 |
| `/activity phrase list` | 列出所有自定义短语 |
| `/activity stats` | 本轮统计：工具数、想/干比、tps、会话时长 |

## 模型自述原理

1. 扩展通过 `before_agent_start` 把约定追加到该轮 system prompt：「每一步写 `⏵ 你正在做的事（≤20 字）`」
2. 模型在流式输出中写下 `⏵ 查一下报错原因`
3. 扩展实时解析 `text_delta`，提取最新 `⏵` 行展示在 Working 行
4. 每个 LLM turn 重置等待态；自述最低展示 2s，流式活跃时不消失，安静 5s 后退回普通文案

## 文案风格

- **中文**：短、口语、俏皮，不说教不摆谱
- **英文**：面无表情的冷幽默，穿插在中文文案中制造反差
- **游戏梗**（SSR、金色传说、gg、ez）只放在稀有彩蛋池（1/150 爆率），不影响日常使用

## License

MIT
