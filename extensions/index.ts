/**
 * working-activity — Working 行：实时显示模型在做什么（中文 + 活泼动画）
 *
 * 数据：tool_execution_start/end 事件（无二次模型调用）
 *
 * 动画：
 *   - 指示器多套预设（/activity frames <名> 切换）：
 *       moon 月相 ◐◓◑◒ | comet 彗星往返 | breathe 呼吸条
 *       dots 光点旋转 | arrow 罗盘 | spark 星光闪烁 | bar 生长条 | braille 经典点阵
 *   - 文案星辉扫过：主题 accent 提亮色光带从文字上扫过（读主题色，兼容任意主题）
 *   - 思考文案约 2s 轮换 + 省略号呼吸；并行工具 1.2s 轮播；>2.5s 显示秒数
 *
 * 配置持久化：~/.pi/agent/working-activity.json
 */
import fs from "node:fs";
import path from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// ─── 指示器预设 ───────────────────────────────────────────────────

// \uFE0E = 强制文本渲染，防止 Windows 把符号画成彩色 emoji（绿块问题）
const TE = "\uFE0E";

// 帧间隔：在“不闪”和“不拖”之间取平衡，本次统一微调快约 10%
const FRAME_PRESETS: Record<string, { frames: string[]; intervalMs: number }> = {
	// Claude Code 真实序列：· ✢ * ✶ ✻ ✽ 正放 + 倒放（官方源码确认）
	claude: {
		frames: ["·", `✢${TE}`, "*", `✶${TE}`, `✻${TE}`, `✽${TE}`, `✻${TE}`, `✶${TE}`, "*", `✢${TE}`],
		intervalMs: 150,
	},
	star2: { frames: [`✶${TE}`, `✸${TE}`, `✹${TE}`, `✺${TE}`, `✹${TE}`, `✷${TE}`], intervalMs: 140 },
	sand: {
		frames: ["⠁", "⠂", "⠄", "⡀", "⡈", "⡐", "⡠", "⣀", "⣁", "⣂", "⣄", "⣌", "⣔", "⣤", "⣥", "⣦", "⣮", "⣶", "⣷", "⣿", "⡿", "⠿", "⢟", "⠟", "⡛", "⠛", "⠫", "⢋", "⠋", "⠍", "⡉", "⠉", "⠑", "⠡", "⢁"],
		intervalMs: 120,
	},
	triangle: { frames: ["◢", "◣", "◤", "◥"], intervalMs: 180 },
	box: { frames: ["▖", "▘", "▝", "▗"], intervalMs: 180 },
	box2: { frames: ["▌", "▀", "▐", "▄"], intervalMs: 180 },
	corners: { frames: ["◰", "◳", "◲", "◱"], intervalMs: 190 },
	point: { frames: ["∙∙∙", "●∙∙", "∙●∙", "∙∙●", "∙∙∙"], intervalMs: 190 },
	layer: { frames: ["-", "=", "≡"], intervalMs: 220 },
	flip: { frames: ["_", "_", "_", "-", "`", "`", "'", "´", "-", "_", "_", "_"], intervalMs: 140 },
	aesthetic: {
		frames: ["▰▱▱▱▱▱▱", "▰▰▱▱▱▱▱", "▰▰▰▱▱▱▱", "▰▰▰▰▱▱▱", "▰▰▰▰▰▱▱", "▰▰▰▰▰▰▱", "▰▰▰▰▰▰▰", "▰▱▱▱▱▱▱"],
		intervalMs: 140,
	},
	hamburger: { frames: ["☱", "☲", "☴"], intervalMs: 220 },
	moon: { frames: ["◐", "◓", "◑", "◒"], intervalMs: 240 },
	comet: {
		frames: ["●    ", " ●   ", "  ●  ", "   ● ", "    ●", "   ● ", "  ●  ", " ●   "],
		intervalMs: 160,
	},
	breathe: { frames: ["▁", "▃", "▅", "▇", "▅", "▃"], intervalMs: 210 },
	dots: { frames: ["⣾", "⣷", "⣯", "⣟", "⡿", "⢿", "⣻", "⣽"], intervalMs: 140 },
	arrow: { frames: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"], intervalMs: 160 },
	spark: { frames: ["·", "∘", "°", "✧", "°", "∘"], intervalMs: 240 },
	bar: { frames: ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█", "▉", "▊", "▋", "▌", "▍", "▎"], intervalMs: 120 },
	braille: { frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], intervalMs: 120 },
	arc: { frames: ["◜", "◠", "◝", "◞", "◡", "◟"], intervalMs: 160 },
	circle: { frames: ["◴", "◷", "◶", "◵"], intervalMs: 190 },
	grow: { frames: [".", "o", "O", "0", "O", "o"], intervalMs: 210 },
	noise: { frames: ["▓", "▒", "░", "▒"], intervalMs: 160 },
	bounce: { frames: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"], intervalMs: 140 },
	bar2: {
		frames: [
			"[    ]", "[=   ]", "[==  ]", "[=== ]", "[ ===]",
			"[  ==]", "[   =]", "[    ]", "[   =]", "[  ==]",
			"[ ===]", "[=== ]", "[==  ]", "[=   ]",
		],
		intervalMs: 140,
	},
	dqpb: { frames: ["d", "q", "p", "b"], intervalMs: 210 },
	toggle: { frames: ["⊶", "⊷"], intervalMs: 300 },
};
const DEFAULT_PRESET = "moon";
/** 收尾闪现的扩展状态 key */
const DONE_STATUS_KEY = "working-activity-done";
/** 调试日志路径（配置 debugLog: true 开启） */
function debugLogPath(): string {
	return path.join(getAgentDir(), "working-activity-debug.log");
}

// ─── 配置读写 ─────────────────────────────────────────────────────

type Config = { frames: string; customPhrases?: string[]; narrate?: boolean; debugLog?: boolean; contextWarnAt?: number };

function configPath(): string {
	return path.join(getAgentDir(), "working-activity.json");
}

function readConfig(): Config {
	try {
		const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
		const cfg: Config = { frames: DEFAULT_PRESET };
		if (typeof raw.frames === "string" && (FRAME_PRESETS[raw.frames] || raw.frames === "random")) {
			cfg.frames = raw.frames;
		}
		if (Array.isArray(raw.customPhrases)) {
			cfg.customPhrases = raw.customPhrases.filter((s: unknown) => typeof s === "string" && s.trim());
		}
		if (typeof raw.narrate === "boolean") cfg.narrate = raw.narrate;
		if (typeof raw.debugLog === "boolean") cfg.debugLog = raw.debugLog;
		if (typeof raw.contextWarnAt === "number") cfg.contextWarnAt = raw.contextWarnAt;
		return cfg;
	} catch {}
	return { frames: DEFAULT_PRESET };
}

function writeConfig(cfg: Config): void {
	try {
		fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + "\n", "utf8");
	} catch {}
}

// ─── 文案映射（俏皮 + 保留真实参数）───────────────────────────────

const ACTION_MAP: Array<{ test: RegExp; actions: string[] }> = [
	{ test: /^(read|read_file|cat)$/i, actions: ["翻翻", "看看", "瞄一眼", "读一下", "康康", "翻一页", "翻翻看"] },
	{ test: /^(write|write_file|create_file)$/i, actions: ["写一下", "记下来", "落笔", "存个文件", "开写", "生成文件"] },
	{ test: /^(edit|edit_file|str_replace|apply_patch|search_replace)$/i, actions: ["改改", "修一下", "改两行", "调一下", "整一下", "补一刀", "动动手指"] },
	{ test: /^(bash|shell|run|exec|powershell|cmd)$/i, actions: ["跑一下", "执行", "敲个命令", "跑命令", "整一下", "搞一下", "使唤终端", "跑个腿"] },
	{ test: /^(grep|rg|search|search_in_files|ffgrep)$/i, actions: ["搜搜", "找找", "搜一下", "翻翻", "搜一圈", "扫一眼", "挖一挖"] },
	{ test: /^(find|glob|fffind)$/i, actions: ["找找文件", "找一下", "摸一下", "搜搜目录"] },
	{ test: /^(ls|list_dir|list)$/i, actions: ["看看目录", "列一下", "瞟一眼", "翻翻"] },
	{ test: /^(web_search|search_web|brave|tavily|exa|search-layer)$/i, actions: ["上网搜搜", "查查", "搜一下", "搜一圈", "打听一下"] },
	{ test: /^(web_fetch|fetch|fetch_content|get_search_content|batch_web_fetch)$/i, actions: ["抓个页面", "取一下", "扒一下", "拉一下", "打开看看"] },
	{ test: /^(mcp)$/i, actions: ["调个工具", "喊外援", "接一下", "问问插件"] },
	{ test: /^(recall)$/i, actions: ["回想一下", "翻翻记忆", "回忆一下", "想想之前"] },
	{ test: /^(subagent|agent|task)$/i, actions: ["分个任务", "交给小弟", "派出去", "委派一下"] },
	{ test: /^(todo|manage_todo_list)$/i, actions: ["记个待办", "划个清单"] },
	{ test: /^(browser|chrome|playwright|agent_browser|chrome_devtools)/i, actions: ["开浏览器", "点点页面", "开个页面"] },
	{ test: /^(git)/i, actions: ["git 一下", "提交一下"] },
	{ test: /^(notebook|jupyter)/i, actions: ["跑一下 notebook", "跑个 cell"] },
	// context-mode 系
	{ test: /^(ctx_execute|ctx_execute_file|ctx_batch_execute)$/i, actions: ["跑段代码", "算一下", "后台跑一下", "跑一下"] },
	{ test: /^(ctx_search|ctx_index|ctx_fetch_and_index)$/i, actions: ["翻知识库", "查索引", "搜一下笔记", "翻一下"] },
	{ test: /^(ctx_stats|ctx_doctor|ctx_upgrade|ctx_purge|ctx_insight)$/i, actions: ["看看状态", "诊断一下", "查一下"] },
	// Pi 特有
	{ test: /^(ask_user_question|ask)$/i, actions: ["问你个事", "确认一下", "问问你"] },
	{ test: /^(goal_complete|goal_blocked)$/i, actions: ["标记目标", "更新进度", "打个勾"] },
	{ test: /^(manage_todo_list)$/i, actions: ["划个清单", "记个待办", "打个勾"] },
	// 收尾兜底
	{ test: /^(subagent|workflow|orchestrat)/i, actions: ["分个任务", "交给小弟", "派出去"] },
];

/** 思考文案池：随机抽，不重复。短、自然、带点可爱 */
const THINKING_PHRASES = [
	"嗯…",
	"让我想想",
	"在想呢",
	"理一理",
	"稍等",
	"盘一下",
	"想一下",
	"等我看看",
	"琢磨一下",
	"捋一捋",
	"在想了",
	"对对对",
	"好了好了",
	"快了快了",
	"马上",
	"再想想",
	"有了有了",
	"嗯嗯嗯",
	"唔…",
	"哦哦",
	"啊哈",
	"我看看",
	"好呢",
	"在路上了",
	"等等我",
	"转转脑子",
	"emm",
	"…诶",
	"好滴",
	"懂了懂了",
	"没问题",
	"来咯",
	"走着",
	"康康",
	"嗯哼",
	"来劲了",
	"冲",
	"好嘞",
	"收到",
	"明白明白",
	"好叭",
	"okk",
	"hhh",
	"哇哦",
	"可以可以",
	"好好好",
	"wow",
	"nice",
	"rgrg",
	"lol",
	"hm",
	"oh",
	"ok",
	"um",
	"heh",
	"等一下",
	"我查查",
	"翻翻看",
	"emmm",
	"诶…",
	"喵",
	"网速还行",
	"翻翻笔记",
	"加载中…",
	"打字打字",
	"唔唔",
	"看看",
	"想想看",
	"等下",
	"诶嘿",
	"嗯",
	"啾",
	"等一下下",
	"别催别催",
	"这个我会",
	"轻轻松松",
	"想好了想好了",
	"脑袋转起来了",
];

/** 想久了自动换文案：30s / 1min / 5min 四档 */
const THINKING_PHRASES_30S = ["有点久…", "快了快了", "马上好…", "给我点时间…", "转圈圈…", "等等", "马上马上", "再等一小下"];
const THINKING_PHRASES_1M = ["还在努力…", "这个有点绕…", "在收尾了…", "快了真的快了…", "快了快了快了", "马上了马上了…", "烧脑中…", "脑细胞阵亡中…"];
const THINKING_PHRASES_5M = ["还没放弃…", "这题真的硬…", "再给我一会…", "在路上了…", "还没好…", "再等等", "我给跪了…", "下次不敢了…"];
const THINKING_TIER_30S = 30_000;
const THINKING_TIER_1M = 60_000;
const THINKING_TIER_5M = 300_000;

/** 深夜（0–6 点）专属文案，混入思考池 */
const NIGHT_PHRASES = [
	"夜深了…",
	"还在肝…",
	"夜宵时间…",
	"月亮不睡我不睡",
	"凌晨的灵感…",
	"熬夜冠军",
	"夜猫子出没",
	"还不睡吗",
	"这个点还不睡？",
	"修仙中…",
];
/** 稀有文案：约 1/80 概率（每 3–4 分钟出现一次） */
const RARE_PHRASES = [
	"摸鱼ing",
	"这条不常见",
	"彩蛋！",
	"隐藏款",
	"wink ~",
	"SSR！",
	"金色传说",
	"暴击了",
	"稀有掉落",
	"你发现我了",
	"（突然出现）",
	"悄悄冒个泡",
	"咦",
	"哦豁",
	"诶嘿",
	"UR！",
	"限定款",
	"欧皇时刻",
	"一发入魂",
	"嘿嘿",
	"啵",
	"闪现",
	"芜湖",
	"噔噔",
	"逮到你了",
	"是我是我",
	"gg",
	"ez",
];
const RARE_CHANCE = 1 / 150;
/** 收尾文案池：随机挑 */
const DONE_PHRASES = ["搞定", "收工", "妥了", "完事", "收摊", "齐活", "拿下", "好啦", "搞定收工", "交差", "收工大吉"];
/** 打断后再启动的接梗文案 */
const CONTINUE_PHRASES = ["继续…", "刚才说到哪…", "回来了…", "好，接着来…", "接上…", "继续继续", "没断片"];
/** 等待模型第一个 token 时轮换的文案 */
const WAITING_PHRASES = [
	"呼叫模型…",
	"嗯…",
	"让我想想",
	"正在想",
	"在打字了",
	"码字中…",
	"酝酿一下",
	"马上就来",
	"来了来了",
	"emmm",
	"等一下",
	"快好了",
	"想想先",
	"让我盘盘",
	"在加载了…",
	"别急别急",
	"拨号中…",
	"信号挺好",
	"等等我嘛",
	"快了快了",
	"开机中…",
	"热热身…",
	"喂喂喂…",
	"在吗在吗",
];
const WAITING_PHRASE_TICKS = 15; // ~2.6s 换一句
/** combo 阈值：连续多少个工具算火力全开 */
const COMBO_THRESHOLD = 5;
/** 慢工具预警阈值 */
const SLOW_TOOL_MS = 30_000;
/** 工具结束后自述保留的宽限期：跟着活动走，安静 5s 退回预设 */
const NARRATE_GRACE_MS = 5_000;
/** 每句自述的最低展示时长：防止快速工具/队列重播把自述挤没 */
const NARRATE_MIN_MS = 2000;
/** 注入给模型的状态栏约定（必须 + 信息优先、风格自然俏皮） */
const NARRATE_INSTRUCTION =
	"[状态栏] 你有一个状态栏展示给用户。【必须】在每个步骤/子任务开始时（不只是调用工具前），在正文单独一行写：⏵ 你在做的具体事情（不超过20字）。信息为主——让人一眼知道你在干什么，风格自然、可以带点俏皮。例：⏵ 修复登录页样式、⏵ 查一下报错原因、⏵ 给补丁跑个验证、⏵ 分析这个文件的入口逻辑。切换任务时必须更新。";

const DOT_FRAMES = ["", " ·", " ··", " ···", " ··", " ·"];

/** 思考文案切换间隔（tick 数）：TICK_MS=170 → 约 2.6s */
const THINKING_PHRASE_TICKS = 15;
/** 彩蛋停留更久：约 7.5s 才换 */
const RARE_PHRASE_TICKS = 45;

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 格式化毫秒为可读时长 */
function fmtTime(ms: number): string {
	if (ms < 1000) return "0s";
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rs = s % 60;
	if (m < 60) return `${m}m${rs}s`;
	const h = Math.floor(m / 60);
	const rm = m % 60;
	return `${h}h${rm}m`;
}

/** 随机抽一条，尽量不与上次相同 */
function pickDifferent<T>(arr: T[], prev: T | null | undefined): T {
	if (arr.length <= 1) return arr[0]!;
	let next = pick(arr);
	let guard = 0;
	while (next === prev && guard++ < 8) next = pick(arr);
	return next;
}

function actionFor(toolName: string): string {
	const n = toolName.trim();
	for (const { test, actions } of ACTION_MAP) {
		if (test.test(n)) return pick(actions);
	}
	if (/^mcp__|__/.test(n) || n.startsWith("mcp")) return pick(["调个工具", "喊外援", "接一下"]);
	return pick(["干活", "调用", "整一下", "搞一下", "动动手"]);
}

function short(s: string, n = 48): string {
	const t = s.replace(/\s+/g, " ").trim();
	if (t.length <= n) return t;
	return `${t.slice(0, n - 1)}…`;
}

function basename(p: string): string {
	const norm = p.replace(/\\/g, "/");
	const i = norm.lastIndexOf("/");
	return i >= 0 ? norm.slice(i + 1) : norm;
}

function mcpDetail(args: Record<string, unknown>): string {
	const pickStr = (...ks: string[]) => {
		for (const k of ks) {
			const v = args[k];
			if (typeof v === "string" && v.trim()) return v.trim();
		}
		return "";
	};
	const action = pickStr("action");
	if (action) return short(action, 28);
	const tool = pickStr("tool");
	const server = pickStr("server");
	if (tool) return short(server ? `${server}/${tool}` : tool, 36);
	const connect = pickStr("connect");
	if (connect) return short(`connect ${connect}`, 36);
	const describe = pickStr("describe");
	if (describe) return short(describe, 36);
	if (server) return short(server, 36);
	return short(pickStr("search"), 36);
}

function detailFor(toolName: string, args: unknown): string {
	if (!args || typeof args !== "object") return "";
	const a = args as Record<string, unknown>;
	const str = (...keys: string[]): string => {
		for (const k of keys) {
			const v = a[k];
			if (typeof v === "string" && v.trim()) return v.trim();
		}
		return "";
	};

	const n = toolName.toLowerCase();
	if (n === "mcp" || n.startsWith("mcp__") || n.includes("__")) return mcpDetail(a);

	const path = str("path", "file", "file_path", "filepath", "target");
	if (path) {
		const show = path.length > 42 ? basename(path) : path;
		return short(show, 42);
	}
	const cmd = str("command", "cmd");
	if (cmd) return short(cmd, 44);
	const pattern = str("pattern", "query", "search");
	if (pattern) return short(pattern, 40);
	const url = str("url");
	if (url) return short(url, 40);
	const prompt = str("prompt", "description");
	if (prompt && /subagent|agent|task/i.test(toolName)) return short(prompt, 40);
	const name = str("name", "server", "tool", "id", "goal");
	if (name) return short(name, 32);

	const base = toolName.includes("__") ? toolName.split("__").pop()! : toolName;
	return base === toolName ? "" : short(base, 28);
}

function summarize(toolName: string, args: unknown): string {
	const action = actionFor(toolName);
	const detail = detailFor(toolName, args);
	if (!detail) return action;
	return `${action} ${detail}`;
}

// ─── 星辉扫过（读主题 accent，提亮光带扫过文字）────────────────────

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace("#", "");
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16),
	];
}

function lightenRgb(r: number, g: number, b: number, amount: number): [number, number, number] {
	return [
		Math.min(255, Math.round(r + (255 - r) * amount)),
		Math.min(255, Math.round(g + (255 - g) * amount)),
		Math.min(255, Math.round(b + (255 - b) * amount)),
	];
}

function blend(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
	return [
		Math.round(c1[0] + (c2[0] - c1[0]) * t),
		Math.round(c1[1] + (c2[1] - c1[1]) * t),
		Math.round(c1[2] + (c2[2] - c1[2]) * t),
	];
}

/** 从主题 accent 提取 RGB hex（解析 theme.fg 的 ANSI 真彩输出） */
function accentHexOf(ctx: ExtensionContext): string | null {
	const sample = ctx.ui.theme.fg("accent", "█");
	const m = sample.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
	if (!m) return null;
	return [m[1]!, m[2]!, m[3]!]
		.map((v) => parseInt(v, 10).toString(16).padStart(2, "0"))
		.join("");
}

const SHIMMER_BAND = 4;

/** 光带扫过 text，frame 每 tick +1；baseHex 失败则退回 theme.fg 整色 */
function shimmer(text: string, frame: number, baseHex: string | null, ctx: ExtensionContext): string {
	if (!baseHex) return ctx.ui.theme.fg("accent", text);
	const base = hexToRgb(baseHex);
	const hi = lightenRgb(base[0], base[1], base[2], 0.45);
	const total = text.length + SHIMMER_BAND * 2;
	const pos = frame % total;
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const dist = Math.abs(i - pos);
		const t = Math.max(0, 1 - dist / SHIMMER_BAND);
		const c = blend(base, hi, t);
		out += `\x1b[38;2;${c[0]};${c[1]};${c[2]}m${text[i]}\x1b[0m`;
	}
	return out;
}

/** 炫彩流光：每个字独立色相，快速滚动 + 加粗，效果夸张 */
function rainbowShimmer(text: string, frame: number, ctx: ExtensionContext): string {
	let out = "";
	for (let i = 0; i < text.length; i++) {
		// 色相：字符偏移 + 快速滚动，饱和度拉满，亮度偏高
		const hue = (i * 55 + frame * 14) % 360;
		const [r, g, b] = hslToRgb(hue, 0.95, 0.58);
		out += `\x1b[1;38;2;${r};${g};${b}m${text[i]}\x1b[0m`;
	}
	return out;
}

/** HSL → RGB 转换（0-360, 0-1, 0-1 → 0-255） */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r = 0, g = 0, b = 0;
	if (h < 60) { r = c; g = x; }
	else if (h < 120) { r = x; g = c; }
	else if (h < 180) { g = c; b = x; }
	else if (h < 240) { g = x; b = c; }
	else if (h < 300) { r = x; b = c; }
	else { r = c; b = x; }
	return [
		Math.round((r + m) * 255),
		Math.round((g + m) * 255),
		Math.round((b + m) * 255),
	];
}

// ─── 扩展主体 ─────────────────────────────────────────────────────

const ROTATE_MS = 1200;
/** 文案星辉扫光：140 太闪，220 偏慢，170 刚好 */
const TICK_MS = 170;
const SHOW_ELAPSED_AFTER_MS = 2500;
/** 快速工具入队逐个展示时长 */
const QUEUE_ITEM_MS = 1000;
/** 最后一个快速工具的粘留时长 */
const LAST_STICKY_MS = 3000;
/** 执行超过此时长的工具已在执行中可见，不再入队重播 */
const FAST_TOOL_MS = 1500;
/** 队列上限：超出丢最旧，防止积压 */
const QUEUE_MAX = 6;


type ActiveTool = { id: string; name: string; label: string; startedAt: number };
/** 完成队列项：带成功/失败标记 */
type DoneItem = { label: string; isError: boolean };

export default function (pi: ExtensionAPI) {
	const active = new Map<string, ActiveTool>();
	/** 快速工具完成队列：逐个展示 1s，最后一个留 3s */
	const doneQueue: DoneItem[] = [];
	let showingDone: { item: DoneItem; startedAt: number } | null = null;
	let lastSticky: { item: DoneItem; endedAt: number } | null = null;
	let busy = false;
	/** 调试日志（config.debugLog = true 时启用） */
	const dbg = (event: string, data?: Record<string, unknown>) => {
		if (!config.debugLog) return;
		try {
			fs.appendFileSync(
				debugLogPath(),
				JSON.stringify({ t: Date.now(), event, ...data }) + "\n",
				"utf8",
			);
		} catch {}
	};
	/** 本轮工具计数（用于完成闪现摘要） */
	let toolCount = 0;
	/** 模型自述状态（⏵ 开头的那行） */
	let narratedStatus: string | null = null;
	/** 自述被抓到的时间（用于最低展示时长） */
	let narratedAtMs = 0;
	/** 最近一次模型活动时间（自述保鲜跟着活动走） */
	let lastActivityMs = 0;
	/** 流式文本滚动缓冲区（用于提取 ⏵ 状态行） */
	let recentText = "";
	/** 上一轮是否被打断（用于接梗） */
	let wasAborted = false;
	/** 是否已收到第一个 token */
	let firstTokenSeen = false;
	/** 本轮输出 token 累计 */
	let outputTokens = 0;
	/** 思考/干活耗时拆分（按 tick 累计） */
	let thinkingMs = 0;
	let toolMs = 0;
	/** 连续工具连击计数 */
	let streak = 0;
	let lastToolEndMs = 0;
	/** 本轮是否已显示过周末问候 */
	let weekendShown = false;
	let tickTimer: ReturnType<typeof setInterval> | null = null;
	let tick = 0;
	let rotateIdx = 0;
	let config = readConfig();
	let accentHex: string | null = null;
	/** 当前思考文案（随机切换） */
	let thinkingPhrase: string | null = null;
	let thinkingPhraseTick = 0;
	/** 当前是否稀有彩蛋文案（炫彩着色） */
	let isRarePhrase = false;
	/** 等待 first token 文案轮换 */
	let waitingPhrase: string | null = null;
	let waitingPhraseTick = 0;
	/** agent 启动时间（用于思考时长分档） */
	let agentStartMs = 0;
	/** 完成闪现计时 */
	let doneTimer: ReturnType<typeof setTimeout> | null = null;
	/** 打断接梗文案显示截止时间 */
	let continueUntil = 0;
	/** 上下文预警：当前用量百分比（达到阈值时非空） */
	let contextWarnPct: number | null = null;
	let lastContextCheckMs = 0;
	/** random 模式：本轮解析后的预设（一轮只随一次） */
	let resolvedPreset: string | null = null;

	const applyFrames = (ctx: ExtensionContext) => {
		if (config.frames === "random") {
			if (!resolvedPreset) {
				resolvedPreset = pick(Object.keys(FRAME_PRESETS));
			}
		} else {
			resolvedPreset = config.frames;
		}
		const preset = FRAME_PRESETS[resolvedPreset] ?? FRAME_PRESETS[DEFAULT_PRESET]!;
		const frames = preset.frames.map((f) => ctx.ui.theme.fg("accent", f));
		ctx.ui.setWorkingIndicator({ frames, intervalMs: preset.intervalMs });
	};

	const render = (ctx: ExtensionContext) => {
		if (!busy) {
			ctx.ui.setWorkingMessage(undefined);
			return;
		}
		const theme = ctx.ui.theme;
		// 接梗文案展示期：不覆盖
		if (continueUntil > 0 && Date.now() < continueUntil) return;
		if (continueUntil > 0) continueUntil = 0;
		const list = [...active.values()];
		// 上下文预警前缀
		const ctxWarn =
			contextWarnPct != null
				? theme.fg("warning", `⚠ 上下文${contextWarnPct}% · `)
				: "";

		if (list.length === 0) {
			const now = Date.now();
			// 新自述有最低展示权：优先于队列重播，防止被快工具挤没
			if (
				config.narrate &&
				narratedStatus &&
				now - narratedAtMs < NARRATE_MIN_MS
			) {
				ctx.ui.setWorkingMessage(
					shimmer(narratedStatus, tick, accentHex, ctx) +
					theme.fg("dim", DOT_FRAMES[Math.floor(tick / 3) % DOT_FRAMES.length]!),
				);
				return;
			}
			// 队列推进：当前项播满 1s → 记为 lastSticky，取下一项
			if (showingDone && now - showingDone.startedAt >= QUEUE_ITEM_MS) {
				lastSticky = { item: showingDone.item, endedAt: now };
				showingDone = null;
			}
			if (!showingDone && doneQueue.length > 0) {
				showingDone = { item: doneQueue.shift()!, startedAt: now };
			}
			if (showingDone) {
				const mark = showingDone.item.isError
					? theme.fg("error", " ✗")
					: theme.fg("success", " ✓");
				ctx.ui.setWorkingMessage(
					shimmer(showingDone.item.label, tick, accentHex, ctx) + mark,
				);
				return;
			}
			// 队列空了：最后一个粘留 3s
			if (lastSticky && now - lastSticky.endedAt < LAST_STICKY_MS) {
				const mark = lastSticky.item.isError
					? theme.fg("error", " ✗")
					: theme.fg("success", " ✓");
				ctx.ui.setWorkingMessage(
					shimmer(lastSticky.item.label, tick, accentHex, ctx) + mark,
				);
				return;
			}
			// 还没收到第一个 token：轮换等待文案（~2.6s 换一句）
			if (!firstTokenSeen) {
				if (!waitingPhrase || waitingPhraseTick >= WAITING_PHRASE_TICKS) {
					waitingPhrase = pickDifferent(WAITING_PHRASES, waitingPhrase);
					waitingPhraseTick = 0;
				}
				const dots = DOT_FRAMES[Math.floor(tick / 3) % DOT_FRAMES.length]!;
				ctx.ui.setWorkingMessage(
					ctxWarn +
					shimmer(waitingPhrase, tick, accentHex, ctx) + theme.fg("dim", dots),
				);
				return;
			}
			// 模型自述：近期有活动则显示；过期（超过宽限且播完最低时长）永久丢弃
			if (config.narrate && narratedStatus) {
				if (now - lastActivityMs < NARRATE_GRACE_MS) {
					ctx.ui.setWorkingMessage(
						shimmer(narratedStatus, tick, accentHex, ctx) +
						theme.fg("dim", DOT_FRAMES[Math.floor(tick / 3) % DOT_FRAMES.length]!),
					);
					return;
				}
				if (now - narratedAtMs >= NARRATE_MIN_MS) {
					narratedStatus = null; // 过期即丢弃，不再复活
				}
			}
			// 随机换思考文案（约 2.6s），省略号呼吸；想久了按 30s/1min/5min 分档
			if (!thinkingPhrase || thinkingPhraseTick >= (isRarePhrase ? RARE_PHRASE_TICKS : THINKING_PHRASE_TICKS)) {
				// 只在换文案时重新评估池子，而不是每 tick 都算（否则彩蛋 170ms 就被覆盖）
				const elapsed = agentStartMs > 0 ? Date.now() - agentStartMs : 0;
				let pool: string[];
				if (!weekendShown && [0, 6].includes(new Date().getDay())) {
					pool = [pick(["周末也在卷？", "周末还在写代码…", "卷王你好", "还在加班…"])];
					weekendShown = true;
					isRarePhrase = false;
				} else if (Math.random() < RARE_CHANCE && elapsed < THINKING_TIER_30S) {
					pool = RARE_PHRASES;
					isRarePhrase = true;
				} else {
					isRarePhrase = false;
					const hour = new Date().getHours();
					const base =
						config.customPhrases?.length
							? [...THINKING_PHRASES, ...config.customPhrases]
							: THINKING_PHRASES;
					pool =
						hour >= 0 && hour < 6
							? [...base, ...NIGHT_PHRASES]
							: base;
					// 越久掺越多分档文案，不是替换
					if (elapsed >= THINKING_TIER_30S) pool = [...pool, ...THINKING_PHRASES_30S];
					if (elapsed >= THINKING_TIER_1M) pool = [...pool, ...THINKING_PHRASES_1M];
					if (elapsed >= THINKING_TIER_5M) pool = [...pool, ...THINKING_PHRASES_5M];
				}
				thinkingPhrase = pickDifferent(pool, thinkingPhrase);
				thinkingPhraseTick = 0;
			}
			const dots = DOT_FRAMES[Math.floor(tick / 3) % DOT_FRAMES.length]!;
			const total = agentStartMs > 0 ? fmtTime(Date.now() - agentStartMs) : "";
			ctx.ui.setWorkingMessage(
				ctxWarn +
				(isRarePhrase
					? rainbowShimmer(thinkingPhrase, tick, ctx)
					: shimmer(thinkingPhrase, tick, accentHex, ctx)) +
				theme.fg("dim", (total ? ` · 总${total}` : "") + dots),
			);
			return;
		}

		const cur = list[rotateIdx % list.length]!;
		const elapsed = Date.now() - cur.startedAt;
		const secs =
			elapsed >= SHOW_ELAPSED_AFTER_MS
				? theme.fg("dim", ` ${Math.floor(elapsed / 1000)}s`)
				: "";
		const more = list.length > 1 ? theme.fg("dim", ` · 另 ${list.length - 1} 项`) : "";
		// combo 连击前缀 / 慢工具预警
		const combo =
			streak >= COMBO_THRESHOLD ? theme.fg("warning", `火力全开×${streak} · `) : "";
		const slow =
			elapsed >= SLOW_TOOL_MS ? theme.fg("warning", "这个有点慢 · ") : "";

		// 模型自述：最低展示 2s；有活动（流式/工具）持续有效；安静后丢弃
		const narrFresh =
			config.narrate &&
			narratedStatus &&
			(Date.now() - narratedAtMs < NARRATE_MIN_MS ||
				list.length > 0 ||
				Date.now() - lastActivityMs < NARRATE_GRACE_MS);
		if (!narrFresh && config.narrate && narratedStatus && list.length === 0) {
			narratedStatus = null;
		}
		if (narrFresh) {
				ctx.ui.setWorkingMessage(
					combo +
						slow +
						shimmer(narratedStatus!, tick, accentHex, ctx) +
						theme.fg("dim", ` · ${cur.label}`) +
						secs +
						more,
				);
				return;
			}

			ctx.ui.setWorkingMessage(
				ctxWarn + combo + slow + shimmer(cur.label, tick, accentHex, ctx) + secs + more,
			);
	};

	const startTick = (ctx: ExtensionContext) => {
		if (tickTimer) return;
		tickTimer = setInterval(() => {
			if (!busy) return;
			tick++;
			thinkingPhraseTick++;
			waitingPhraseTick++;
			// 思考/干活耗时拆分
			if (active.size > 0) toolMs += TICK_MS;
			else thinkingMs += TICK_MS;
			if (active.size > 1 && tick % Math.round(ROTATE_MS / TICK_MS) === 0) {
				rotateIdx++;
			}
			// 上下文用量检查：每 ~3s 一次（getContextUsage 是廉价 getter）
			const warnAt = config.contextWarnAt ?? 80;
			if (warnAt > 0 && Date.now() - lastContextCheckMs > 3000) {
				lastContextCheckMs = Date.now();
				const pct = ctx.getContextUsage()?.percent;
				contextWarnPct = typeof pct === "number" && pct >= warnAt ? Math.round(pct) : null;
			}
			render(ctx);
		}, TICK_MS);
	};

	const stopTick = () => {
		if (tickTimer) {
			clearInterval(tickTimer);
			tickTimer = null;
		}
	};

	pi.on("session_start", async (_e, ctx) => {
		ctx.ui.setStatus(DONE_STATUS_KEY, undefined);
		// debug 日志防无限增长：新会话截断到 512KB
		if (config.debugLog) {
			try {
				const p = debugLogPath();
				const st = fs.statSync(p);
				if (st.size > 512 * 1024) fs.writeFileSync(p, "", "utf8");
			} catch {}
		}
		active.clear();
		doneQueue.length = 0;
		showingDone = null;
		lastSticky = null;
		busy = false;
		tick = 0;
		rotateIdx = 0;
		toolCount = 0;
		firstTokenSeen = false;
		outputTokens = 0;
		thinkingMs = 0;
		toolMs = 0;
		streak = 0;
		lastToolEndMs = 0;
		narratedStatus = null;
		narratedAtMs = 0;
		lastActivityMs = 0;
		recentText = "";
		wasAborted = false;
		weekendShown = false;
		agentStartMs = 0;
		thinkingPhrase = null;
		thinkingPhraseTick = 0;
		isRarePhrase = false;
		waitingPhrase = null;
		waitingPhraseTick = 0;
		continueUntil = 0;
		resolvedPreset = null;
		if (doneTimer) {
			clearTimeout(doneTimer);
			doneTimer = null;
		}
		stopTick();
		config = readConfig();
		accentHex = accentHexOf(ctx);
		applyFrames(ctx);
		ctx.ui.setWorkingMessage(undefined);
		ctx.ui.setStatus(DONE_STATUS_KEY, undefined);
	});

	pi.on("agent_start", async (_e, ctx) => {
		dbg("agent_start", { narrate: config.narrate });
		active.clear();
		doneQueue.length = 0;
		showingDone = null;
		lastSticky = null;
		busy = true;
		tick = 0;
		toolCount = 0;
		firstTokenSeen = false;
		outputTokens = 0;
		thinkingMs = 0;
		toolMs = 0;
		streak = 0;
		lastToolEndMs = 0;
		narratedStatus = null;
		narratedAtMs = 0;
		lastActivityMs = 0;
		recentText = "";
		resolvedPreset = null; // 新一轮 random 重新随
		agentStartMs = Date.now();
		ctx.ui.setStatus(DONE_STATUS_KEY, undefined);
		if (doneTimer) {
			clearTimeout(doneTimer);
			doneTimer = null;
		}
		thinkingPhraseTick = THINKING_PHRASE_TICKS; // 立刻抽一条
		thinkingPhrase = null;
		isRarePhrase = false;
		waitingPhrase = null;
		waitingPhraseTick = 0;
		rotateIdx = 0;
		// 上一轮被打断：先亮一句接梗文案 1.5s
		if (wasAborted) {
			wasAborted = false;
			ctx.ui.setWorkingMessage(
				ctx.ui.theme.fg("accent", pick(CONTINUE_PHRASES)),
			);
			continueUntil = Date.now() + 1500;
		}
		if (!accentHex) accentHex = accentHexOf(ctx);
		applyFrames(ctx);
		if (continueUntil === 0) render(ctx);
		startTick(ctx);
	});

	pi.on("tool_execution_start", async (event, ctx) => {
		busy = true;
		toolCount++;
		lastActivityMs = Date.now();
		dbg("tool_start", { name: event.toolName });
		// combo 连击：上一个工具结束 2.5s 内开新工具，或有其他工具正在跑（并行爆发）
		const nowMs = Date.now();
		if (active.size > 0 || (lastToolEndMs > 0 && nowMs - lastToolEndMs < 2500)) streak++;
		else streak = 1;
		const id = String(event.toolCallId ?? event.toolName ?? Math.random());
		const name = String(event.toolName ?? "tool");
		active.set(id, {
			id,
			name,
			label: summarize(name, event.args),
			startedAt: Date.now(),
		});
		applyFrames(ctx);
		render(ctx);
		startTick(ctx);
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		const id = String(event.toolCallId ?? "");
		let finished: ActiveTool | undefined;
		if (id && active.has(id)) {
			finished = active.get(id);
			active.delete(id);
		} else if (event.toolName) {
			for (const [k, v] of active) {
				if (v.name === event.toolName) {
					finished = v;
					active.delete(k);
					break;
				}
			}
		}
		if (finished) {
			lastToolEndMs = Date.now();
			const isError = event.isError === true;
			const fast = Date.now() - finished.startedAt < FAST_TOOL_MS;
			dbg("tool_end", { name: finished.name, fast, isError, queued: fast || isError });
			// 快工具入队重播；出错工具不管快慢都入队（需要被看到）
			if (fast || isError) {
				doneQueue.push({ label: finished.label, isError });
				if (doneQueue.length > QUEUE_MAX) doneQueue.shift();
			}
		}
		if (active.size === 0) rotateIdx = 0;
		render(ctx);
	});

	pi.on("message_update", async (event, _ctx) => {
		if (event.message?.role !== "assistant") return;
		const evt = event.assistantMessageEvent;
		if (!evt) return;
		if (evt.type !== "text_delta" && evt.type !== "thinking_delta") {
			dbg("msg_update", { type: evt.type }); // 流式 delta 太高频，不记
		}
		if (evt.type === "text_delta") {
			firstTokenSeen = true;
			lastActivityMs = Date.now();
			if (!config.narrate) return; // 开关关：不解析自述
			const delta = evt.delta as string;
			if (!delta) return;
			recentText = (recentText + delta).slice(-2000);
			// 提取最新的 ⏵ 状态行
			const lines = recentText.split("\n");
			for (let i = lines.length - 1; i >= Math.max(0, lines.length - 6); i--) {
				const line = lines[i]!.trim();
				if (line.startsWith("⏵ ")) {
					const status = line.slice(2).trim();
					if (status && status !== narratedStatus) {
						narratedStatus = status;
						narratedAtMs = Date.now();
						dbg("narrate", { status });
					}
					break;
				}
			}
		} else if (evt.type === "thinking_delta") {
			firstTokenSeen = true;
			lastActivityMs = Date.now();
		}
	});

	pi.on("message_end", async (event, _ctx) => {
		if (event.message?.role !== "assistant") return;
		dbg("msg_end", { hasUsage: !!(event.message as any)?.usage });
		const out = (event.message as any)?.usage?.output;
		if (typeof out === "number" && out > 0) outputTokens += out;
	});

	pi.on("context", async (event, _ctx) => {
		if (!config.narrate) return; // 开关关：不注入约定
		// 注入状态栏约定：让模型在调工具前写一行 ⏵ 短语
		return {
			messages: [
				...event.messages,
				{ role: "developer", content: NARRATE_INSTRUCTION },
			],
		};
	});

	pi.on("agent_end", async (event, ctx) => {
		busy = false;
		active.clear();
		doneQueue.length = 0;
		showingDone = null;
		lastSticky = null;
		stopTick();
		// 被打断 / 出错 / 正常完成 三种收尾
		const lastAssistant = [...(event.messages ?? [])]
			.reverse()
			.find((m: any) => m.role === "assistant");
		const stopReason = lastAssistant?.stopReason;
		dbg("agent_end", { stopReason, toolCount });
		const secs = agentStartMs > 0 ? Math.round((Date.now() - agentStartMs) / 1000) : 0;
		const thinkSec = Math.round(thinkingMs / 1000);
		const toolSec = Math.round(toolMs / 1000);
		const tokPart = outputTokens > 0 ? ` · ${outputTokens >= 1000 ? `${(outputTokens / 1000).toFixed(1)}k` : outputTokens} tok` : "";
		const toolPart = toolCount > 0 ? ` · ${toolCount} 工具` : "";
		const timePart = secs >= 3 ? ` · 想 ${thinkSec}s 干 ${toolSec}s` : "";
		const comboPart = toolCount >= 10 ? " · 十连击" : "";

		// 收尾闪现走 setStatus（底部扩展状态区）：agent_end 后 Working 指示器已被 pi 拆除，
		// setWorkingMessage 无处显示；setStatus 由我们自己控制生命周期
		const flash = (text: string, ms: number) => {
			if (doneTimer) clearTimeout(doneTimer);
			doneTimer = setTimeout(() => {
				dbg("flash_show", { ms });
				ctx.ui.setStatus(DONE_STATUS_KEY, text);
				doneTimer = setTimeout(() => {
					doneTimer = null;
					dbg("flash_clear");
					ctx.ui.setStatus(DONE_STATUS_KEY, undefined);
				}, ms);
			}, 60);
		};

		if (stopReason === "aborted") {
			wasAborted = true;
			// Esc 打断：温和承认，不显示“搞定”
			flash(ctx.ui.theme.fg("dim", "好，停了"), 1200);
			return;
		}
		if (stopReason === "error") {
			flash(ctx.ui.theme.fg("error", "哎呀，出错了"), 2000);
			return;
		}
		// 正常完成：随机收尾文案 + 本轮摘要
		flash(
			ctx.ui.theme.fg("success", `${pick(DONE_PHRASES)} ✓`) +
				ctx.ui.theme.fg("dim", `${toolPart}${timePart}${tokPart}${comboPart}`),
			3000,
		);
		// 弹一个总时间通知（太短的一轮不值得弹）
		if (secs >= 3) {
			ctx.ui.notify(
				`⏱ 总用时 ${fmtTime(Date.now() - agentStartMs)}` +
					(toolCount > 0 ? ` · ${toolCount} 工具` : "") +
					` · 想${thinkSec}s 干${toolSec}s`,
				"info",
			);
		}
	});

	pi.on("session_shutdown", async () => {
		busy = false;
		active.clear();
		doneQueue.length = 0;
		showingDone = null;
		lastSticky = null;
		stopTick();
		waitingPhrase = null;
		waitingPhraseTick = 0;
		if (doneTimer) clearTimeout(doneTimer);
	});

	// ─── /activity 命令 ──────────────────────────────────────────

	pi.registerCommand("activity", {
		description: "Working 行：/activity 选动画 · /activity frames <名> · /activity narrate on|off",
		handler: async (args, ctx) => {
			const apply = (name: string) => {
				config = { ...config, frames: name };
				writeConfig(config);
				applyFrames(ctx);
				ctx.ui.notify(`指示器已切换：${name}`, "info");
			};

			const parts = args.trim().split(/\s+/).filter(Boolean);

			// /activity narrate [on|off] — 模型自述开关
			if (parts[0] === "narrate") {
				if (!parts[1]) {
					ctx.ui.notify(`模型自述：${config.narrate ? "开" : "关"}（/activity narrate on|off 切换）`, "info");
					return;
				}
				const on = parts[1] === "on";
				if (!on && parts[1] !== "off") {
					ctx.ui.notify("用法：/activity narrate on|off", "warning");
					return;
				}
				config = { ...config, narrate: on };
				writeConfig(config);
				if (!on) {
					narratedStatus = null;
					recentText = "";
				}
				ctx.ui.notify(
					on
						? "模型自述已开启：模型会在调工具前写「⏵ 短语」，状态栏优先显示"
						: "模型自述已关闭：回到预设文案模式",
					"info",
				);
				return;
			}

			// /activity frames <名> — 直接切换
			if (parts[0] === "frames" && parts[1]) {
				const name = parts[1].toLowerCase();
				if (name !== "random" && !FRAME_PRESETS[name]) {
					ctx.ui.notify(`未知预设「${name}」，可用：random / ${Object.keys(FRAME_PRESETS).join(" / ")}`, "warning");
					return;
				}
				apply(name);
				return;
			}

			// /activity — 交互选择
			const labels = Object.entries(FRAME_PRESETS).map(
				([name, p]) => `${name.padEnd(10)} ${p.frames.slice(0, 5).join(" ")}${name === config.frames ? "  ← 当前" : ""}`,
			);
			labels.unshift(`random     每次随机${config.frames === "random" ? "  ← 当前" : ""}`);
			const choice = await ctx.ui.select("选择指示器动画：", labels);
			if (!choice) return; // Esc 取消
			const name = choice.split(/\s+/)[0]!;
			if (name === "random" || FRAME_PRESETS[name]) apply(name);
		},
	});
}
