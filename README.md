# pi-working-activity

> A lively Working-line extension for [pi](https://github.com/earendil-works/pi-coding-agent).  
> Real tool activity, playful Chinese phrases, rare rainbow easter eggs, model self-narration, and context-usage warnings — all in your terminal's status bar.

## Features

### 🛠 Real Tool Activity
Watches `tool_execution_start` and `tool_execution_end` events. The Working line shows exactly what your agent is doing right now — no fake spinner verbs.

| Tool | Working line |
|------|-------------|
| `read` | `翻翻 config.yml` |
| `edit` | `改改 working-activity.ts` |
| `bash` | `跑命令 npm test` |
| `grep` | `搜搜 NARRATE_MIN_MS` |
| `web_search` | `上网搜搜` |
| `mcp` | `喊外援` |

Fast tools (under 1.5s) are queued and replayed one by one so you can actually see them — the last one sticks for 3 seconds. Slow tools show elapsed time live.

### 💬 Playful Phrase Pools
When the model is thinking, the Working line cycles through 60+ short, colloquial Chinese phrases — no stiff "Processing..." here.

```
嗯… → 让我想想 → 盘一下 → 在想了 → 快了快了 → 唔… → 喵 → 诶嘿
```

Thinking too long? Phrases change progressively:
- **30s**: `转圈圈…` `等等`
- **1min**: `还在努力…` `这个有点绕…`
- **5min**: `还没放弃…` `这题真的硬…`

### ⏵ Model Self-Narration (optional)
Toggle `narrate: true` in config. The extension injects a convention into the model: write a `⏵ short status line` before each step. The extension parses streaming output and displays it on the Working line.

```
⏵ 修复登录页样式    →   Working line: "修复登录页样式 · 改改 login.tsx"
⏵ 查一下报错原因   →   Working line: "查一下报错原因 · 搜搜 error.log"
```

### 🎰 Rare Rainbow Easter Eggs
At a 1/150 chance (roughly every 6–7 minutes of thinking), the Working line explodes into **bold rainbow text** that stays for 7.5 seconds.

```
SSR！ 金色传说  暴击了  欧皇时刻  一发入魂  你发现我了  ✨
```

Each character gets its own hue, scrolling at 14°/frame with 95% saturation. It's absurd. It's glorious.

### 📊 Live Timing
- During thinking: `嗯… · 总1m23s`
- During tools: `改改 file.ts · 3s`
- After completion: `⏱ 总用时 1m23s · 4 工具 · 想12s 干11s` (notification below the conversation)

### ⚠ Context-Window Warning
Checks context usage every 3 seconds. When usage exceeds the threshold (default 80%), a yellow warning appears:

```
⚠ 上下文85% · 嗯… · 总1m23s
```

Set `contextWarnAt: 0` to disable.

### 🔥 Combo Detection
5+ consecutive tool calls (within 2.5s gaps, or parallel) triggers `火力全开×N`. 10+ tools triggers `十连击` in the done summary.

### ⏱ Slow-Tool Warning
Single tool exceeding 30 seconds shows `这个有点慢 · ` as a warning prefix.

### 🌙 Time-Aware Fun
- **0–6 AM**: Night phrases like `熬夜冠军` `夜猫子出没` are mixed into the thinking pool.
- **Weekends**: First turn of the session gets a `周末也在卷？` greeting.

### 🎨 30+ Animation Presets
Switch indicator frames via `/activity` (interactive picker) or `/activity frames <name>`:

`claude` `braille` `moon` `comet` `spark` `breathe` `dots` `circle` `pulse` `star2` `flip` `aesthetic` `hamburger` `random` …

## Installation

```bash
pi install npm:pi-working-activity
```

Or from local path:

```bash
pi install /path/to/pi-working-activity
```

## Configuration

`~/.pi/agent/working-activity.json` (auto-created on first run):

```json
{
  "frames": "moon",
  "narrate": false,
  "contextWarnAt": 80,
  "customPhrases": [],
  "debugLog": false
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `frames` | `"moon"` | Animation preset name, or `"random"` for a different one each turn |
| `narrate` | `false` | Enable model self-narration (⏵ status lines) |
| `contextWarnAt` | `80` | Context-usage warning threshold in percent. `0` disables |
| `customPhrases` | `[]` | Extra phrases to mix into the thinking pool |
| `debugLog` | `false` | Write debug events to `~/.pi/agent/working-activity-debug.log` (auto-truncates at 512KB) |

## Commands

| Command | Description |
|---------|-------------|
| `/activity` | Open interactive preset picker (select with Enter) |
| `/activity frames <name>` | Switch preset directly |
| `/activity frames random` | Random preset each turn |
| `/activity narrate on\|off` | Toggle model self-narration |

## How Self-Narration Works

When `narrate: true`, the extension uses the `context` event to inject a developer message into every LLM call:

> [Status bar] You have a status bar shown to the user. **[Required]** At the start of every step/subtask, write a single line: ⏵ what you're doing (≤20 chars). Information-first — let people know at a glance what you're working on. Keep it natural and playful. Switch it when you switch tasks.

The extension parses `text_delta` events from the model's streaming output, looking for `⏵ ` lines. The latest captured line is displayed on the Working line with a 2-second minimum display time. It stays fresh during active streaming and fades 5 seconds after the model goes quiet.

## License

MIT