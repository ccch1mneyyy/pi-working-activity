# pi-working-activity

_Make the pi CLI working line come alive — real tool activity, playful Chinese + English phrases, and self-narration._

## Features

### 1. Real tool activity animations
Monitors `tool_execution_start` / `tool_execution_end` and shows live Chinese action labels + file names / command summaries.

```
翻翻 src/index.ts
改改 package.json
跑命令 rm -rf node_modules
```

### 2. Fast tool queue replay
Tools finishing in < 1.5 s are queued. Each plays for 1 s in order; the last one sticks for 3 s so you can read it.

### 3. Witty Chinese thinking phrase pool
70+ colloquial Chinese lines rotate every ~2.6 s while waiting.

> 嗯...让我想想  
> 搜肠刮肚中  
> 大脑过载请稍候

### 4. Waiting-for-first-token pool
A separate set of phrases used specifically when the model hasn’t emitted its first token yet.

### 5. Thinking time tiers
After 30 s / 1 min / 5 min of thinking, the phrase pool mixes in more self‑deprecating or time‑aware lines.

### 6. Rare easter egg (1 in 150 chance)
A 7.5 s rainbow bold animation triggers randomly — with messages like `SSR`, `金色传说`, `gg`, `ez`.

### 7. Self‑narration via ⏵ status line
Inject a convention so the model writes its own ⏵ line. The extension parses and displays it, letting the model explain what it’s doing.

```
⏵ 正在分析类型定义...
⏵ 刚刚发现了一个循环引用
```

### 8. Pacing with total & split times
During thinking: `· 总1m23s`  
After completion: a notification with total time + breakdown: think Xs / do Ys.

### 9. Context usage warning
When `getContextUsage` percent ≥ 80%, shows `⚠ 上下文80%` in the working line.

### 10. Streak combos
- 5+ consecutive fast tools → `火力全开×5`
- 10+ → `十连击!`

### 11. Slow tool hint
Tools taking > 30 s show a gentle `这个有点慢…` cue.

### 12. Late‑night / weekend greetings
Automatically detects 00:00–06:00 or weekend days and inserts a friendly message.

### 13. 30+ animation presets with `/activity` chooser
Pick a visual style interactively via `/activity` – includes flashes, spinner variants, rainbow effects, etc.

### 14. Deadpan English interjections
`lol` `hm` `oh` `ok` `um` `heh` `uh` `nah` `mm` `wow` `nice` `rgrg` `done` `again` `gg` `ez` — dropped into the working line to keep you entertained.

## Installation

```bash
pi install npm:pi-working-activity
```

## Configuration

Config file: `~/.pi/agent/working-activity.json`

| Key             | Type     | Default | Description |
|-----------------|----------|---------|-------------|
| `frames`        | `string` | `"moon"` | Animation preset name. Use `/activity frames` to list. |
| `narrate`       | `boolean`| `false`   | Enable ⏵ self‑narration parsing. |
| `contextWarnAt` | `number` | `80`     | Context percent threshold for warning. |
| `customPhrases` | `string[]` | `[]`   | Additional thinking phrases (Chinese or English). |
| `debugLog`      | `boolean`| `false`  | Write NDJSON debug events to `~/.pi/agent/working-activity-debug.log` (auto-truncate >512KB). |

## Commands

- `/activity`  
  Opens an interactive picker to choose animation preset.

- `/activity frames <name>`  
  Switch to a specific animation preset. Example: `/activity frames rainbow`

- `/activity narrate on|off`  
  Turn model self‑narration on or off.

## How self‑narration works

1. The extension injects a system‑level hint: “When you are thinking or performing a multi‑step action, write a ⏵ line describing what you’re doing.”
2. The model emits a line like `⏵ 正在读取配置文件…`.
3. The extension parses ⏵‑prefixed lines and renders them in a distinct style within the working line.
4. If narration is off, ⏵ lines are hidden.

## Phrase style notes

- **Chinese phrases** are casual, affectionate, slightly self‑deprecating, matching the PI CLI’s Chinese UI voice.  
- **English interjections** are short, deadpan (lol, hm, oh, ok, um, heh, uh, nah, mm, wow, nice, rgrg, done, again, gg, ez). They appear in the working line beside tool actions or during idle moments.  
- All phrases are chosen to feel lightweight, never distracting.

## License

MIT

## Credits

Phrase pools and README copy were generated with [DeepSeek V4 Pro](https://www.deepseek.com/) (official API), then lightly filtered for length and consistency.

