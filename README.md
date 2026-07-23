# pi-working-activity

一个让 pi CLI 的 Working 行「活起来」的扩展：真实工具活动 + 俏皮中文文案 + 模型自述 + 稀有彩蛋清仓 + 上下文预警。

> A lively Working-line extension for [pi](https://github.com/earendil-works/pi-coding-agent): real tool activity, playful phrases, model self-narration, rare rainbow easter eggs, and context-usage warning.

## 功能一览

| 功能 | 说明 |
|------|------|
| 🛠 真实工具活动 | 监听 `tool_execution_start/end`，Working 行实时显示正在跑的工具（翻翻 xxx / 改改 xxx / 跑命令 xxx） |
| 💬 俏皮文案池 | 思考时轮换 60+ 条口语化短句（嗯… / 让我想想 / 盘一下），等待首个 token 时另有独立文案池 |
| ⏵ 模型自述 | 开启后模型会在每步开始时用一句话说明自己在做什么，Working 行直接展示（默认关） |
| 🎰 稀有彩蛋 | 约 1/150 概率蹦出「SSR！/ 金色传说 / 一发入魂」，**七彩流光加粗**滚动 7.5 秒 |
| 📊 配速显示 | 思考中显示总耗时（`· 总1m23s`），结束后弹总时间通知 |
| ⚠ 上下文预警 | context 用量超过阈值（默认 80%）时 Working 行亮黄色警告 |
| 🔥 连击检测 | 连续 5+ 工具触发「火力全开×N」，并行工具也算 |
| ⏱ 慢工具预警 | 单工具超 30s 提示「这个有点慢」 |
| 🌙 深夜/周末彩蛋 | 0–6 点混入深夜文案，周末首次会话有问候 |
| 🎨 30+ 动画预设 | Braille / Claude 原版帧 / 月亮 / 彗星… `/activity` 交互选择 |

## 安装

```bash
pi install npm:pi-working-activity
```

或本地开发：

```bash
pi install /path/to/pi-working-activity
```

## 使用

```
/activity                 # 打开动画预设选择器
/activity frames <name>   # 直接切换预设（/activity frames claude）
/activity frames random   # 每轮随机
/activity narrate on|off  # 模型自述开关
```

## 配置

配置文件 `~/.pi/agent/working-activity.json`（自动生成）：

```json
{
  "frames": "claude",
  "narrate": false,
  "contextWarnAt": 80,
  "customPhrases": ["我的自定义文案"],
  "debugLog": false
}
```

| 字段 | 默认 | 说明 |
|------|------|------|
| `frames` | `"moon"` | 动画预设名，或 `"random"` |
| `narrate` | `false` | 模型自述模式：向模型注入约定，让它每步写一行 ⏵ 状态 |
| `contextWarnAt` | `80` | 上下文预警阈值（百分比），`0` 关闭 |
| `customPhrases` | `[]` | 追加到思考文案池的自定义短句 |
| `debugLog` | `false` | 调试日志（`~/.pi/agent/working-activity-debug.log`，>512KB 自动截断） |

## 模型自述模式

`narrate: true` 时，扩展通过 `context` 事件向模型注入一条约定：每个步骤开始时在正文单独一行写 `⏵ 你在做的事（≤20字）`。扩展从流式输出中解析该行并显示在 Working 行，正文中的 ⏵ 行也会正常出现。

效果：`修复登录页样式 · 改改 login.tsx` —— 自述为主文案，工具动作退为后缀。

## License

MIT
