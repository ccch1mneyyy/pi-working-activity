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
/** 空闲时展示模型切换梗的状态 key */
const MODEL_STATUS_KEY = "working-activity-model";
/** 调试日志路径（配置 debugLog: true 开启） */
function debugLogPath(): string {
	return path.join(getAgentDir(), "working-activity-debug.log");
}

// ─── 配置读写 ─────────────────────────────────────────────────────

type Config = {
	frames: string;
	customPhrases?: string[];
	customActions?: Record<string, string[]>;
	narrate?: boolean;
	debugLog?: boolean;
	contextWarnAt?: number;
	contextDangerAt?: number;
	showTokPerSec?: boolean;
	workRemindAt?: number;
	/** 总开关：lively 全量花哨（默认） / minimal 只保留功能性信息 */
	mode?: "lively" | "minimal";
	/** 单特性开关：显式设置时覆盖 mode 默认值 */
	features?: Record<string, boolean>;
};

/** 可独立开关的特性 */
const FEATURE_FLAGS = [
	"phrases",          // 俏皮文案池（思考/等待/收尾/工具动词）
	"rareEggs",         // 稀有彩虹彩蛋
	"nightPhrases",     // 深夜文案
	"weekend",          // 周末问候
	"holidays",         // 节假日彩蛋
	"combo",            // 连击火力全开
	"failPhrases",      // 失败文案池
	"modelQuips",       // 模型切换梗
	"shimmer",          // 文案星辉扫过/彩虹流光
	"continuePhrases",  // 打断后接梗
] as const;

/** minimal 模式的朴素文案 */
const MINIMAL_THINKING = "思考中";
const MINIMAL_WAITING = "等待模型响应";

function configPath(): string {
	return path.join(getAgentDir(), "working-activity.json");
}

function readConfig(): { cfg: Config; raw: Record<string, unknown> } {
	try {
		const raw = JSON.parse(fs.readFileSync(configPath(), "utf8")) as Record<string, unknown>;
		const cfg: Config = { frames: DEFAULT_PRESET };
		if (typeof raw.frames === "string" && (FRAME_PRESETS[raw.frames] || raw.frames === "random")) {
			cfg.frames = raw.frames;
		}
		if (Array.isArray(raw.customPhrases)) {
			cfg.customPhrases = raw.customPhrases.filter((s: unknown) => typeof s === "string" && s.trim());
		}
		if (typeof raw.narrate === "boolean") cfg.narrate = raw.narrate;
		if (typeof raw.debugLog === "boolean") cfg.debugLog = raw.debugLog;
		if (typeof raw.contextWarnAt === "number" && Number.isFinite(raw.contextWarnAt) && raw.contextWarnAt >= 0 && raw.contextWarnAt <= 100) {
			cfg.contextWarnAt = raw.contextWarnAt;
		}
		if (typeof raw.contextDangerAt === "number" && Number.isFinite(raw.contextDangerAt) && raw.contextDangerAt >= 0 && raw.contextDangerAt <= 100) {
			cfg.contextDangerAt = raw.contextDangerAt;
		}
		if (typeof raw.showTokPerSec === "boolean") cfg.showTokPerSec = raw.showTokPerSec;
		if (typeof raw.workRemindAt === "number" && Number.isFinite(raw.workRemindAt) && raw.workRemindAt >= 0 && raw.workRemindAt <= 24) {
			cfg.workRemindAt = raw.workRemindAt;
		}
		if (raw.customActions && typeof raw.customActions === "object" && !Array.isArray(raw.customActions)) {
			const ca: Record<string, string[]> = {};
			for (const [key, value] of Object.entries(raw.customActions)) {
				const actions = Array.isArray(value)
					? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())
					: [];
				if (key.trim() && actions.length > 0) ca[key.trim()] = actions;
			}
			if (Object.keys(ca).length > 0) cfg.customActions = ca;
		}
		if (raw.mode === "lively" || raw.mode === "minimal") cfg.mode = raw.mode;
		if (raw.features && typeof raw.features === "object" && !Array.isArray(raw.features)) {
			const f: Record<string, boolean> = {};
			for (const [k, v] of Object.entries(raw.features)) {
				if (typeof v === "boolean") f[k] = v;
			}
			if (Object.keys(f).length > 0) cfg.features = f;
		}
		return { cfg, raw };
	} catch {}
	return { cfg: { frames: DEFAULT_PRESET }, raw: {} };
}

function writeConfig(cfg: Config, raw: Record<string, unknown>): void {
	try {
		// 合并不认识的键（如用户手写的 position 等），防止被静默删除
		fs.writeFileSync(configPath(), JSON.stringify({ ...raw, ...cfg }, null, 2) + "\n", "utf8");
	} catch {}
}

// ─── 文案映射（俏皮 + 保留真实参数）───────────────────────────────

const ACTION_MAP: Array<{ test: RegExp; actions: string[] }> = [
	{ test: /^(read|read_file|cat)$/i, actions: ["翻翻文档","让我康康","读一下","看一眼","翻阅中","读读看","翻翻","看看","瞄一眼","康康","翻一页","翻翻看"] },
	{ test: /^(write|write_file|create_file)$/i, actions: ["写写写","下笔中","码字呢","写一段","记录一下","改改再写","写一下","记下来","落笔","开写","存个文件"] },
	{ test: /^(edit|edit_file|str_replace|apply_patch|search_replace)$/i, actions: ["改改","修修补补","润色一下","编辑中","调整调整","改一改","修一下","改两行","调一下","补一刀","动动手指"] },
	{ test: /^(bash|shell|run|exec|powershell|cmd)$/i, actions: ["跑个命令","bash一下","敲敲指令","命令行走起","执行一下","敲回车","跑一下","敲个命令","跑命令","使唤终端","跑个腿"] },
	{ test: /^(grep|rg|search|search_in_files|ffgrep)$/i, actions: ["搜搜东西","grep 一下","找找匹配","关键词走你","过滤中","搜搜看","搜搜","找找","搜一下","扫一眼","挖一挖"] },
	{ test: /^(find|glob|fffind)$/i, actions: ["找找文件","找一下","寻宝中","找啊找","文件在哪","查找中","摸一下","搜搜目录"] },
	{ test: /^(ls|list_dir|list)$/i, actions: ["列个清单","看看目录","ls 看一眼","瞄一下文件","目录走起","列出来","列一下","瞟一眼","翻翻"] },
	{ test: /^(web_search|search_web|brave|tavily|exa|search-layer)$/i, actions: ["网上搜搜","搜一下","网络冲浪","查找资料","搜搜看","上网瞄瞄","上网搜搜","查查","搜一圈","打听一下"] },
	{ test: /^(web_fetch|fetch|fetch_content|get_search_content|batch_web_fetch)$/i, actions: ["抓个页面","拉取一下","fetch 中","扒拉网页","取点内容","抓取资料","扒一下","拉一下","打开看看"] },
	{ test: /^(mcp)$/i, actions: ["mcp 连一下","调个服务","接个工具","mcp 走你","调接口","连一下","调个工具","喊外援","接一下","问问插件"] },
	{ test: /^(recall)$/i, actions: ["回想一下","回忆中","提取记忆","想起啥了","记起来","翻翻记忆","想想之前"] },
	{ test: /^(subagent|agent|task)$/i, actions: ["派个小弟","小助手出动","支个 agent","让小弟跑腿","代理干活","子任务起飞","分个任务","交给小弟","派出去"] },
	{ test: /^(todo|manage_todo_list)$/i, actions: ["列个待办","写个清单","todo 安排","记一下","待办走起","清单一下","记个待办","划个清单","打个勾"] },
	{ test: /^(browser|chrome|playwright|agent_browser|chrome_devtools)/i, actions: ["开个浏览器","浏览器跑腿","网页操作","浏览器干活","开网页","开浏览器","点点页面","开个页面"] },
	{ test: /^(git)/i, actions: ["git 操作","提交一下","版本控制","git 走你","提交代码","管个仓库","git 一下"] },
	{ test: /^(notebook|jupyter)/i, actions: ["笔记本记下","写个笔记","记个笔记","本子写写","记录东西","跑个 cell"] },
	{ test: /^(ctx_execute|ctx_execute_file|ctx_batch_execute)$/i, actions: ["上下文执行","跑上下文","ctx 执行","执行一下","上下文操作","运行中","跑段代码","算一下","后台跑一下"] },
	{ test: /^(ctx_search|ctx_index|ctx_fetch_and_index)$/i, actions: ["搜上下文","上下文搜搜","ctx 查找","找找上下文","搜一下历史","找找记录","翻知识库","查索引","搜一下笔记"] },
	{ test: /^(ctx_stats|ctx_doctor|ctx_upgrade|ctx_purge|ctx_insight)$/i, actions: ["统计一下","上下文统计","ctx 状态","看个状态","统计中","看看数目","看看状态","诊断一下","查一下"] },
	{ test: /^(ask_user_question|ask)$/i, actions: ["提问中","问一个问题","ask 一下","请教一下","问问看","问一问","问你个事","确认一下","问问你"] },
	{ test: /^(goal_complete|goal_blocked)$/i, actions: ["定个目标","设定目标","goal 设置","目标走起","规划一下","目标确认","标记目标","更新进度","打个勾"] },
];

/** 思考文案池：短、口语、俏皮 */
const THINKING_PHRASES = [
	"嗯…让我捋捋",
	"盘一下盘一下",
	"大脑转起来了",
	"思考.gif",
	"给我一秒",
	"脑子在冒烟",
	"想呢想呢",
	"别催别催",
	"啾，让我想想",
	"让我琢磨下",
	"嗯…等一下哦",
	"正在盘逻辑",
	"小脑瓜动一下",
	"嗯？哦…",
	"让我理理",
	"翻翻脑子",
	"回想中",
	"等一下下",
	"让我嗅嗅",
	"脑内风暴中",
	"嗯…让我品品",
	"滴滴滴思考中",
	"稍等，在想",
	"盘明白了么",
	"挠头…",
	"让子弹飞一会",
	"让我脑补一下",
	"加载中",
	"你说 我在听",
	"噢…是这样",
	"让我嚼一嚼",
	"嗯…有点意思",
	"搓搓手想想",
	"等下，在想",
	"让我康康",
	"想好了告诉你",
	"脑子转圈圈",
	"嗯…让我反应下",
	"等下下嘛",
	"思路加载中",
	"琢磨中",
	"嗯…让我拆一下",
	"盘，都可以盘",
	"让我嗅探一下",
	"脑内跑火车",
	"嗯…让我缓一下",
	"滴滴，想呢",
	"思索.jpg",
	"嗯…有点东西",
	"让我品",
	"小跑一下思路",
	"等下，有画面了",
	"让我咀嚼",
	"嗯…发会儿呆",
	"思考泡泡",
	"脑电波传输中",
	"嗯…转转",
	"等下，盘好了",
	"让我回味",
	"嗯…让我偷想一下",
	"滴滴滴",
	"思考的鱼",
	"嗯…让我摸一下",
	"脑子在煮咖啡",
	"等下，我打个腹稿",
	"嗯…重启一下",
	"让我挠墙",
	"嗯，来了来了",
	"脑子冒泡泡",
	"嗯…有点烫",
	"思考猫猫",
	"让我咕噜一下",
	"嗯…盘它",
	"等下，我闪个思路",
	"脑子在蹦迪",
	"嗯…",
	"让我想想",
	"盘一下",
	"啾",
	"lol",
	"hm",
	"oh",
	"ok",
	"um",
	"heh",
	"uh",
	"nah",
	"mm",
	"wow",
	"nice",
	"rgrg",
	"okk",
	"hhh",
	"emm",
	"emmm",
];

/** 想久了 30s 档 */
const THINKING_PHRASES_30S = ["嗯，让我细想想","30秒了，还在盘","等下，快好了","别急，就快出结果了","让我再捋一捋","嗯…思路没断","30秒，快了","等等，有眉目了","有点久…","转圈圈…","马上马上"];
/** 想久了 1min 档 */
const THINKING_PHRASES_1M = ["1分钟，还在想","这题有点东西","让我再钻研下","嗯…问题不简单","1分钟，别走开","盘得有点深","脑细胞在燃烧","等等，快盘清了","还在努力…","这个有点绕…","烧脑中…"];
/** 想久了 5min 档 */
const THINKING_PHRASES_5M = ["5分钟，大工程","这把我得认真","确实有点绕","等等，我在修仙","快好了，真的","盘了一大圈","别慌，在收尾","给我一首歌的时间","还没放弃…","这题真的硬…","我给跪了…"];
const THINKING_TIER_30S = 30_000;
const THINKING_TIER_1M = 60_000;
const THINKING_TIER_5M = 300_000;

/** 深夜（0–6 点）专属文案 */
const NIGHT_PHRASES = [
	"修仙中…",
	"深夜冒泡",
	"你也是夜猫子呀",
	"月亮不睡我不睡",
	"夜里脑子慢，谅解",
	"晚安？还早呢",
	"深夜盘东西",
	"熬夜冠军上线",
	"困了，但能行",
	"过了零点照样肝",
	"熬夜冠军",
	"夜猫子出没",
];
/** 稀有彩蛋（1/150，七彩流光） */
const RARE_PHRASES = [
	"SSR！稀有彩蛋",
	"UR 掉落",
	"金色传说！",
	"爆装备了",
	"ssr 彩蛋出现",
	"lol 中奖了",
	"这把 ez",
	"GG！闪耀",
	"稀有掉落确认",
	"wow，出橙了",
	"彩蛋砸脸",
	"我承认，被帅到了",
	"天选时刻",
	"五星好评掉落",
	"你发现了隐藏款",
	"触发隐藏对话",
	"稀有帧",
	"恭喜，这是稀有货",
	"lol 你赚了",
	"gg ez 彩蛋",
	"欧气爆棚",
	"这把不亏",
	"真·金色传说",
	"彩蛋蹦出来了",
	"sssr 隐藏",
	"你解锁了稀有",
	"SSR！",
	"UR！",
	"金色传说",
	"gg",
	"ez",
	"暴击了",
	"wink ~",
	"摸鱼ing",
	"你发现我了",
];
const RARE_CHANCE = 1 / 150;
/** 工具失败文案池 */
const FAIL_PHRASES = [
	"翻车了","哎呀","掉了","没跑通","摔了一跤","再来一次","这不对",
	"出岔子了","不灵了","坏消息","权限不对？","连不上？","404了",
	"空了我","有点问题","回头再看看","没接住","漏了","重试一次",
];
/** 收尾文案池 */
const DONE_PHRASES = ["交差！","搞定，下一个","好了，收工","done！","完成啦","交作业","结束，完美","完工咯","搞定啦","任务完成","好了，歇会儿","搞定","收工","妥了","完事","交差","done","齐活","拿下"];
/** 打断后再启动接梗 */
const CONTINUE_PHRASES = ["再来，again！","接着盘","继续整","again！走起","接着刚才的","续上，继续","再续一秒","继续继续","继续…","好，接着来…","again","没断片"];
/** 等待模型第一个 token */
const WAITING_PHRASES = [
	"呼叫模型…",
	"模型在路上了",
	"等它开口…",
	"稍等，它有点慢",
	"模型加载中",
	"嗯…等它一下",
	"它在组织语言",
	"等等我嘛",
	"模型醒了么",
	"等它伸懒腰",
	"它打了个哈欠",
	"模型：来了来了",
	"等它出字",
	"别急，在等",
	"它磨蹭呢",
	"模型说等一下",
	"等它滴一声",
	"模型在咕噜",
	"等它反应过来",
	"嗯…等它",
	"模型在喝水",
	"它说再等一下",
	"等它喘口气",
	"模型：快了快了",
	"别急别急",
	"来了来了",
];
const WAITING_PHRASE_TICKS = 15; // ~2.6s 换一句
/** 周末问候 */
const WEEKEND_PHRASES = ["周末摸鱼中","周末也在！","放假也陪你","周末不关机","周末偷着盘","周末也在卷？","卷王你好","还在加班…"];

/** 节假日文案池（按日期匹配，命中后取代思考池一次） */
const HOLIDAY_PHRASES: Record<string, string[]> = {
	"01-01": ["新年快乐！","元旦快乐","新的一年，新的 bug","新年第一盘","开工大吉"],
	"02-14": ["情人节也在敲代码","代码才是真爱","今天不约会？","bug 也是 love"],
	"04-01": ["愚人节快乐","这个 bug 是假的吧","小心假报错","今天谁骗我"],
	"05-01": ["劳动节还在卷","劳动最光荣","打工人打工魂"],
	"06-01": ["儿童节快乐","谁还不是个宝宝","今天代码要写得可爱"],
	"10-31": ["万圣节快乐","不给糖就捣蛋","🎃 南瓜来了"],
	"12-24": ["平安夜快乐","圣诞老人来了","🎄 今晚写代码有礼物"],
	"12-25": ["圣诞快乐","Merry Christmas","🎅 圣诞也陪你","圣诞限定彩蛋"],
	"12-31": ["跨年夜","新年倒计时","今年最后一盘","🍾 准备跨年"],
};
/** 农历春节——这里按公历近似（2025–2027），再往后加 */
const LUNAR_NEW_YEAR_PHRASES = ["🧧 春节快乐！","过年还在写代码","红包拿来","新春快乐","拜年了","过年好","代码也拜个年"];
/** 公历日 → 春节标记（逐年加） */
const LUNAR_NEW_YEAR_DAYS: Record<string, true> = {
	"2025-01-29": true, "2025-01-30": true, "2025-01-31": true, "2025-02-01": true, "2025-02-02": true, "2025-02-03": true, "2025-02-04": true,
	"2026-02-17": true, "2026-02-18": true, "2026-02-19": true, "2026-02-20": true, "2026-02-21": true, "2026-02-22": true, "2026-02-23": true,
	"2027-02-06": true, "2027-02-07": true, "2027-02-08": true, "2027-02-09": true, "2027-02-10": true, "2027-02-11": true, "2027-02-12": true,
};
/** 模型切换梗 */
const MODEL_QUIPS: Record<string, string[]> = {
	"claude": ["Claude 来了","换 Claude 了","让 Claude 试试","Claude 出战"],
	"gpt": ["GPT 来了","换个 GPT","GPT 出战"],
	"grok": ["Grok 来了","Grok 出战","Grok 硬核"],
	"gemini": ["Gemini 来了","Gemini 出战","Google 选手"],
	"deepseek": ["DeepSeek 来了","DeepSeek 出战","国产选手"],
	"haiku": ["Haiku 快枪手","Haiku 来了","短平快模式"],
	"sonnet": ["Sonnet 来了","Sonnet 出战","文采担当"],
	"opus": ["Opus 来了","Opus 出战","放大招"],
	"flash": ["Flash 来了","闪电模式","快快快"],
	"pro": ["Pro 来了","Pro 出战","专业模式"],
	"mini": ["Mini 来了","Mini 轻装上阵","小模型也够用"],
};

/** 检测是否为节假日，返回对应文案（null = 不是） */
function holidayPhrase(): string | null {
	const now = new Date();
	const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	const ymd = `${now.getFullYear()}-${mmdd}`;
	// 春节优先
	if (LUNAR_NEW_YEAR_DAYS[ymd]) return pick(LUNAR_NEW_YEAR_PHRASES);
	// 固定节日
	const pool = HOLIDAY_PHRASES[mmdd];
	if (pool) return pick(pool);
	return null;
}

/** 根据模型名吐一句梗 */
function modelQuip(modelId: string): string | null {
	const lower = modelId.toLowerCase();
	for (const [key, quips] of Object.entries(MODEL_QUIPS)) {
		if (lower.includes(key)) return pick(quips);
	}
	return null;
}

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

/** 流式 delta 没有 usage，只能按中英文字符粗估 token 数。 */
function estimateTokens(text: string): number {
	const compact = text.replace(/\s/g, "");
	if (!compact) return 0;
	const cjkCount = (compact.match(/[\u3400-\u9fff]/g) ?? []).length;
	return Math.max(1, Math.ceil(cjkCount * 1.5 + (compact.length - cjkCount) / 4));
}

function isSubagentTool(toolName: string): boolean {
	return /^(subagent|agent|task)$/i.test(toolName.trim());
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
	return pick(["备选方案","换条路","降级操作","退一步","干活","调用","整一下","搞一下","动动手"]);
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
	// subagent: 优先用 description（短标签），其次 prompt（截断）
	if (/subagent|agent|task/i.test(toolName)) {
		const desc = str("description");
		if (desc) return short(desc, 32);
		if (prompt) return short(prompt, 40);
	}
	const name = str("name", "server", "tool", "id", "goal");
	if (name) return short(name, 32);

	const base = toolName.includes("__") ? toolName.split("__").pop()! : toolName;
	return base === toolName ? "" : short(base, 28);
}

function summarize(toolName: string, args: unknown, customActions?: Record<string, string[]>): string {
	const normalizedName = toolName.trim().toLowerCase();
	// 自定义映射按工具名精确匹配；不把用户配置当正则执行。
	const customAction = customActions
		? Object.entries(customActions).find(([name]) => name.toLowerCase() === normalizedName)?.[1]
		: undefined;
	const action = customAction ? pick(customAction) : actionFor(toolName);
	const detail = detailFor(toolName, args);
	if (!detail) return action;
	return `${action} ${detail}`;
}

/** minimal 模式的朴素工具标签：真名 + 参数，无俏皮动词 */
function plainLabel(toolName: string, args: unknown): string {
	const detail = detailFor(toolName, args);
	return detail ? `${toolName} ${detail}` : toolName;
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


type ActiveTool = {
	id: string;
	name: string;
	label: string;
	startedAt: number;
	isSubagent: boolean;
};
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
	let rawConfig: Record<string, unknown> = {};
	let config: Config;
	{
		const initial = readConfig();
		config = initial.cfg;
		rawConfig = initial.raw;
	}
	/** 写配置：合并未知键，防止用户手写字段被删 */
	const saveConfig = () => writeConfig(config, rawConfig);
	/** 特性开关：显式 features 优先，否则 minimal 全关、lively 全开 */
	const featureOn = (name: string): boolean => {
		const explicit = config.features?.[name];
		if (typeof explicit === "boolean") return explicit;
		return config.mode !== "minimal";
	};
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
	/** 空闲模型梗闪现计时 */
	let modelTimer: ReturnType<typeof setTimeout> | null = null;
	/** 打断接梗文案显示截止时间 */
	let continueUntil = 0;
	/** 上下文预警：当前用量百分比（达到阈值时非空） */
	let contextWarnPct: number | null = null;
	let lastContextCheckMs = 0;
	/** random 模式：本轮解析后的预设（一轮只随一次） */
	let resolvedPreset: string | null = null;
	/** 会话总启动时间（用于连续工作提醒） */
	let sessionStartMs = 0;
	/** 当前模型名（用于 model_select 梗） */
	let currentModelId = "";
	/** tps 计算：来自 text_delta 的近似 token 累加 */
	let tokBucket = 0;
	let tokBucketStartMs = 0;
	/** 最近一次文本流式增量，用于清除陈旧速率 */
	let lastTextDeltaMs = 0;
	/** 当前瞬时估算 tps（非零时显示） */
	let currentTps = 0;
	/** 本轮是否已触发节假日文案 */
	let holidayShown = false;
	/** 会话内累计活跃时长与已发提醒次数 */
	let sessionActiveMs = 0;
	let workRemindCount = 0;
	/** 本轮子代理总数与最高连击 */
	let subagentTotal = 0;
	let maxStreak = 0;

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
		// 上下文预警前缀（分级）
		const warnAt = config.contextWarnAt ?? 80;
		const dangerAt = Math.max(warnAt, config.contextDangerAt ?? 95);
		const ctxWarn =
			contextWarnPct != null
				? (contextWarnPct >= dangerAt
					? theme.fg("error", `⚠ 上下文${contextWarnPct}% · `)
					: theme.fg("warning", `⚠ 上下文${contextWarnPct}% · `))
				: "";
		// Pi 的 text_delta 不带 token usage，这里明确展示为估算速率。
		const tpsPrefix =
			config.showTokPerSec && currentTps > 0 && list.length === 0 && Date.now() - lastTextDeltaMs < 3_500
				? theme.fg("dim", `~${currentTps} tok/s · `)
				: "";
		// 星辉/彩虹开关：关时用主题 accent 纯色
		const fx = (text: string) =>
			featureOn("shimmer") ? shimmer(text, tick, accentHex, ctx) : theme.fg("accent", text);
		const fxRare = (text: string) =>
			featureOn("shimmer") ? rainbowShimmer(text, tick, ctx) : theme.fg("accent", text);

		if (list.length === 0) {
			const now = Date.now();
			// 新自述有最低展示权：优先于队列重播，防止被快工具挤没
			if (
				config.narrate &&
				narratedStatus &&
				now - narratedAtMs < NARRATE_MIN_MS
			) {
				ctx.ui.setWorkingMessage(
					ctxWarn + tpsPrefix + fx(narratedStatus) +
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
				const label = showingDone.item.isError
					? theme.fg("error", showingDone.item.label)
					: fx(showingDone.item.label);
				ctx.ui.setWorkingMessage(label + mark);
				return;
			}
			// 队列空了：最后一个粘留 3s
			if (lastSticky && now - lastSticky.endedAt < LAST_STICKY_MS) {
				const mark = lastSticky.item.isError
					? theme.fg("error", " ✗")
					: theme.fg("success", " ✓");
				const label = lastSticky.item.isError
					? theme.fg("error", lastSticky.item.label)
					: fx(lastSticky.item.label);
				ctx.ui.setWorkingMessage(label + mark);
				return;
			}
			// 还没收到第一个 token：轮换等待文案（~2.6s 换一句）
			if (!firstTokenSeen) {
				if (!waitingPhrase || waitingPhraseTick >= WAITING_PHRASE_TICKS) {
					waitingPhrase = featureOn("phrases")
						? pickDifferent(WAITING_PHRASES, waitingPhrase)
						: MINIMAL_WAITING;
					waitingPhraseTick = 0;
				}
				const dots = DOT_FRAMES[Math.floor(tick / 3) % DOT_FRAMES.length]!;
				ctx.ui.setWorkingMessage(
					ctxWarn + tpsPrefix +
					fx(waitingPhrase) + theme.fg("dim", dots),
				);
				return;
			}
			// 模型自述：近期有活动则显示；过期（超过宽限且播完最低时长）永久丢弃
			if (config.narrate && narratedStatus) {
				if (now - lastActivityMs < NARRATE_GRACE_MS) {
					ctx.ui.setWorkingMessage(
						ctxWarn + tpsPrefix +
						fx(narratedStatus) +
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
				const holiday = featureOn("holidays") && !holidayShown ? holidayPhrase() : null;
				if (holiday) {
					holidayShown = true;
					pool = [holiday];
					isRarePhrase = true; // 节假日也用炫彩
				} else if (featureOn("weekend") && !weekendShown && [0, 6].includes(new Date().getDay())) {
					pool = [pick(WEEKEND_PHRASES)];
					weekendShown = true;
					isRarePhrase = false;
				} else if (featureOn("rareEggs") && Math.random() < RARE_CHANCE && elapsed < THINKING_TIER_30S) {
					pool = RARE_PHRASES;
					isRarePhrase = true;
				} else if (!featureOn("phrases")) {
					pool = [MINIMAL_THINKING];
					isRarePhrase = false;
				} else {
					isRarePhrase = false;
					const hour = new Date().getHours();
					const base =
						config.customPhrases?.length
							? [...THINKING_PHRASES, ...config.customPhrases]
							: THINKING_PHRASES;
					pool =
						featureOn("nightPhrases") && hour >= 0 && hour < 6
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
				ctxWarn + tpsPrefix +
				(isRarePhrase
					? fxRare(thinkingPhrase)
					: fx(thinkingPhrase)) +
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
		// 子代理并行提示：只统计当前仍在执行的子代理。
		const activeSubagentCount = list.filter((tool) => tool.isSubagent).length;
		const subHint =
			activeSubagentCount > 1
				? theme.fg("dim", featureOn("phrases") ? ` · 小弟×${activeSubagentCount}` : ` · sub×${activeSubagentCount}`)
				: "";
		// combo 连击前缀 / 慢工具预警
		const combo =
			featureOn("combo") && streak >= COMBO_THRESHOLD ? theme.fg("warning", `火力全开×${streak} · `) : "";
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
						fx(narratedStatus!) +
						theme.fg("dim", ` · ${cur.label}`) +
						secs +
						more +
						subHint,
				);
				return;
			}

			ctx.ui.setWorkingMessage(
				ctxWarn + combo + slow + fx(cur.label) + secs + more + subHint,
			);
	};

	const startTick = (ctx: ExtensionContext) => {
		if (tickTimer) return;
		tickTimer = setInterval(() => {
			if (!busy) return;
			tick++;
			thinkingPhraseTick++;
			waitingPhraseTick++;
			// 思考/干活耗时拆分，同时累计会话内实际活跃时间。
			if (active.size > 0) toolMs += TICK_MS;
			else thinkingMs += TICK_MS;
			sessionActiveMs += TICK_MS;
			if (active.size > 1 && tick % Math.round(ROTATE_MS / TICK_MS) === 0) {
				rotateIdx++;
			}
			// 上下文用量检查：每 ~3s 一次（getContextUsage 是廉价 getter）
			const warnAt = config.contextWarnAt ?? 80;
			if (warnAt <= 0) {
				contextWarnPct = null;
			} else if (Date.now() - lastContextCheckMs > 3000) {
				lastContextCheckMs = Date.now();
				const pct = ctx.getContextUsage()?.percent;
				contextWarnPct = typeof pct === "number" && pct >= warnAt ? Math.round(pct) : null;
			}
			// tps 计算：只在文本仍持续流入时显示，避免把旧值带到下一阶段。
			if (lastTextDeltaMs > 0 && Date.now() - lastTextDeltaMs >= 3_500) {
				currentTps = 0;
				tokBucket = 0;
				tokBucketStartMs = 0;
			} else if (config.showTokPerSec && tokBucketStartMs > 0 && Date.now() - tokBucketStartMs >= 3000) {
				const elapsed = (Date.now() - tokBucketStartMs) / 1000;
				currentTps = elapsed > 0 ? Math.round(tokBucket / elapsed) : 0;
				tokBucket = 0;
				tokBucketStartMs = Date.now();
			}
			// 累计活跃 N 小时提醒；空闲时间不计入，避免会话挂着就误报。
			const remindAt = config.workRemindAt ?? 3;
			const remindEveryMs = remindAt * 3_600_000;
			if (remindEveryMs > 0 && sessionActiveMs >= (workRemindCount + 1) * remindEveryMs) {
				workRemindCount++;
				ctx.ui.notify(
					`☕ 累计活跃 ${fmtTime(sessionActiveMs)}，起来喝口水吧`,
					"info",
				);
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
		ctx.ui.setStatus(MODEL_STATUS_KEY, undefined);
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
		sessionStartMs = Date.now();
		currentModelId = "";
		tokBucket = 0;
		tokBucketStartMs = 0;
		lastTextDeltaMs = 0;
		currentTps = 0;
		holidayShown = false;
		sessionActiveMs = 0;
		workRemindCount = 0;
		subagentTotal = 0;
		maxStreak = 0;
		if (doneTimer) {
			clearTimeout(doneTimer);
			doneTimer = null;
		}
		if (modelTimer) {
			clearTimeout(modelTimer);
			modelTimer = null;
		}
		stopTick();
		{
			const loaded = readConfig();
			config = loaded.cfg;
			rawConfig = loaded.raw;
		}
		if (!fs.existsSync(configPath())) saveConfig();
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
		maxStreak = 0;
		subagentTotal = 0;
		lastToolEndMs = 0;
		narratedStatus = null;
		narratedAtMs = 0;
		lastActivityMs = 0;
		recentText = "";
		resolvedPreset = null; // 新一轮 random 重新随
		agentStartMs = Date.now();
		tokBucket = 0;
		tokBucketStartMs = 0;
		lastTextDeltaMs = 0;
		currentTps = 0;
		holidayShown = false;
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
			if (featureOn("continuePhrases")) {
				ctx.ui.setWorkingMessage(
					ctx.ui.theme.fg("accent", pick(CONTINUE_PHRASES)),
				);
				continueUntil = Date.now() + 1500;
			}
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
		maxStreak = Math.max(maxStreak, streak);
		const id = String(event.toolCallId ?? event.toolName ?? Math.random());
		const name = String(event.toolName ?? "tool");
		const isSubagent = isSubagentTool(name);
		if (isSubagent) subagentTotal++;
		active.set(id, {
			id,
			name,
			label: featureOn("phrases")
				? summarize(name, event.args, config.customActions)
				: plainLabel(name, event.args),
			startedAt: Date.now(),
			isSubagent,
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
				const item = {
					label: isError && featureOn("failPhrases") ? `${pick(FAIL_PHRASES)} · ${finished.label}` : finished.label,
					isError,
				};
				// 错误不能被先前成功项压住；抢占队列，下一帧就展示。
				if (isError) {
					showingDone = null;
					lastSticky = null;
					doneQueue.unshift(item);
				} else {
					doneQueue.push(item);
				}
				if (doneQueue.length > QUEUE_MAX) {
					const oldestSuccess = doneQueue.findIndex((queued) => !queued.isError);
					doneQueue.splice(oldestSuccess >= 0 ? oldestSuccess : doneQueue.length - 1, 1);
				}
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
			const delta = typeof evt.delta === "string" ? evt.delta : "";
			firstTokenSeen = true;
			lastActivityMs = Date.now();
			if (delta && config.showTokPerSec) {
				if (!tokBucketStartMs) tokBucketStartMs = lastActivityMs;
				tokBucket += estimateTokens(delta);
				lastTextDeltaMs = lastActivityMs;
			}
			if (!config.narrate || !delta) return; // 开关关：不解析自述
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

	pi.on("model_select", async (event, ctx) => {
		currentModelId = `${event.model.provider}/${event.model.id}`;
		if (!featureOn("modelQuips")) return;
		const quip = modelQuip(currentModelId);
		if (!quip) return;
		if (busy) {
			ctx.ui.setWorkingMessage(ctx.ui.theme.fg("accent", quip));
			continueUntil = Date.now() + 1500;
			return;
		}
		if (modelTimer) clearTimeout(modelTimer);
		ctx.ui.setStatus(MODEL_STATUS_KEY, ctx.ui.theme.fg("accent", quip));
		modelTimer = setTimeout(() => {
			modelTimer = null;
			ctx.ui.setStatus(MODEL_STATUS_KEY, undefined);
		}, 1500);
	});

	pi.on("before_agent_start", async (event, _ctx) => {
		if (!config.narrate) return;
		// developer role 不是 Pi 的会话消息类型；追加到系统提示才会实际送入模型。
		return { systemPrompt: `${event.systemPrompt}\n\n${NARRATE_INSTRUCTION}` };
	});

	pi.on("turn_start", async (_event, _ctx) => {
		// 每轮工具返回后会重新向模型请求；旧轮次的 token/自述不能污染等待态。
		firstTokenSeen = false;
		waitingPhrase = null;
		waitingPhraseTick = WAITING_PHRASE_TICKS;
		narratedStatus = null;
		currentTps = 0;
		tokBucket = 0;
		tokBucketStartMs = 0;
		lastTextDeltaMs = 0;
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
		const comboPart = featureOn("combo") && toolCount >= 10 ? " · 十连击" : "";

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
		const donePhrase = featureOn("phrases") ? pick(DONE_PHRASES) : "完成";
		flash(
			ctx.ui.theme.fg("success", `${donePhrase} ✓`) +
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

	pi.on("session_shutdown", async (_event, ctx) => {
		busy = false;
		active.clear();
		doneQueue.length = 0;
		showingDone = null;
		lastSticky = null;
		stopTick();
		waitingPhrase = null;
		waitingPhraseTick = 0;
		if (doneTimer) clearTimeout(doneTimer);
		if (modelTimer) clearTimeout(modelTimer);
		ctx.ui.setStatus(MODEL_STATUS_KEY, undefined);
	});

	// ─── /activity 命令 ──────────────────────────────────────────

	pi.registerCommand("activity", {
		description: "Working 行：/activity [mode|feature|status|warn|danger|tps|remind|phrase|stats|frames|narrate]",
		handler: async (args, ctx) => {
			const apply = (name: string) => {
				config = { ...config, frames: name };
				saveConfig();
				applyFrames(ctx);
				ctx.ui.notify(`指示器已切换：${name}`, "info");
			};

			const parts = args.trim().split(/\s+/).filter(Boolean);

			// /activity status — 显示当前配置
			if (parts[0] === "status") {
				const overrides = Object.entries(config.features ?? {}).map(([k, v]) => `${k}:${v ? "开" : "关"}`);
				const lines = [
					`🎭 模式：${config.mode ?? "lively"}`,
					`🎨 动画预设：${config.frames}`,
					`📝 模型自述：${config.narrate ? "开" : "关"}`,
					`⚠ 上下文预警：${config.contextWarnAt ?? 80}%`,
					`🚨 危险阈值：${config.contextDangerAt ?? 95}%`,
					`⚡ ~tok/s 显示：${config.showTokPerSec ? "开" : "关"}`,
					`☕ 工作提醒：${(config.workRemindAt ?? 3) > 0 ? `${config.workRemindAt ?? 3}h` : "关"}`,
					`🔧 自定义映射：${config.customActions ? Object.keys(config.customActions).join(", ") : "无"}`,
					`💬 自定义短语：${config.customPhrases?.length ?? 0} 条`,
					...(overrides.length > 0 ? [`🎚 特性覆盖：${overrides.join(" · ")}`] : []),
				];
				ctx.ui.notify(lines.join(" · "), "info");
				return;
			}

			// /activity mode [lively|minimal] — 总开关
			if (parts[0] === "mode") {
				if (!parts[1]) {
					ctx.ui.notify(`当前模式：${config.mode ?? "lively"}（/activity mode lively|minimal 切换）`, "info");
					return;
				}
				if (parts[1] !== "lively" && parts[1] !== "minimal") {
					ctx.ui.notify("用法：/activity mode lively|minimal", "warning");
					return;
				}
				config = { ...config, mode: parts[1] };
				saveConfig();
				// 立即换池，不等下一轮
				thinkingPhrase = null;
				thinkingPhraseTick = THINKING_PHRASE_TICKS;
				isRarePhrase = false;
				waitingPhrase = null;
				ctx.ui.notify(
					parts[1] === "minimal"
						? "极简模式：只显示真实工具 + 计时 + 预警，无俏皮文案"
						: "活力模式：全套俏皮文案 + 彩蛋",
					"info",
				);
				return;
			}

			// /activity feature [name on|off|auto] — 单特性开关
			if (parts[0] === "feature") {
				if (!parts[1]) {
					const lines = FEATURE_FLAGS.map((f) =>
						`${f}:${featureOn(f) ? "开" : "关"}${config.features?.[f] !== undefined ? "*" : ""}`,
					);
					ctx.ui.notify(`特性（*=手动覆盖模式默认）：${lines.join(" · ")}`, "info");
					return;
				}
				const name = parts[1];
				if (!(FEATURE_FLAGS as readonly string[]).includes(name)) {
					ctx.ui.notify(`未知特性「${name}」，可用：${FEATURE_FLAGS.join(" / ")}`, "warning");
					return;
				}
				if (parts[2] === "auto") {
					const features = { ...config.features };
					delete features[name];
					config = { ...config, features };
					saveConfig();
					ctx.ui.notify(`${name} 已恢复跟随模式（当前${featureOn(name) ? "开" : "关"}）`, "info");
					return;
				}
				if (parts[2] !== "on" && parts[2] !== "off") {
					ctx.ui.notify(`用法：/activity feature ${name} on|off|auto`, "warning");
					return;
				}
				config = { ...config, features: { ...config.features, [name]: parts[2] === "on" } };
				saveConfig();
				thinkingPhrase = null;
				thinkingPhraseTick = THINKING_PHRASE_TICKS;
				isRarePhrase = false;
				waitingPhrase = null;
				ctx.ui.notify(`${name} 已${parts[2] === "on" ? "开启" : "关闭"}`, "info");
				return;
			}

			// /activity warn <n> — 修改上下文预警阈值
			if (parts[0] === "warn") {
				const n = parseInt(parts[1] ?? "", 10);
				if (isNaN(n) || n < 0 || n > 100) {
					ctx.ui.notify("用法：/activity warn <0-100>，0=关闭预警", "warning");
					return;
				}
				config = { ...config, contextWarnAt: n };
				saveConfig();
				ctx.ui.notify(
					n === 0 ? "上下文预警已关闭" : `上下文预警阈值已设为 ${n}%`,
					"info",
				);
				return;
			}

			// /activity danger <n> — 修改红色危险阈值
			if (parts[0] === "danger") {
				const n = parseInt(parts[1] ?? "", 10);
				const warnAt = config.contextWarnAt ?? 80;
				if (isNaN(n) || n < warnAt || n > 100) {
					ctx.ui.notify(`用法：/activity danger <${warnAt}-100>`, "warning");
					return;
				}
				config = { ...config, contextDangerAt: n };
				saveConfig();
				ctx.ui.notify(`上下文危险阈值已设为 ${n}%`, "info");
				return;
			}

			// /activity tps on|off — 开关流式 token 估算速率
			if (parts[0] === "tps") {
				if (parts[1] !== "on" && parts[1] !== "off") {
					ctx.ui.notify("用法：/activity tps on|off", "warning");
					return;
				}
				const on = parts[1] === "on";
				config = { ...config, showTokPerSec: on };
				if (!on) {
					currentTps = 0;
					tokBucket = 0;
					tokBucketStartMs = 0;
				}
				saveConfig();
				ctx.ui.notify(on ? "~tok/s 显示已开启（流式估算）" : "~tok/s 显示已关闭", "info");
				return;
			}

			// /activity remind <0-24> — 设置累计活跃提醒间隔
			if (parts[0] === "remind") {
				const hours = Number(parts[1]);
				if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
					ctx.ui.notify("用法：/activity remind <0-24>，0=关闭", "warning");
					return;
				}
				config = { ...config, workRemindAt: hours };
				saveConfig();
				ctx.ui.notify(hours === 0 ? "累计活跃提醒已关闭" : `每累计活跃 ${hours} 小时提醒一次`, "info");
				return;
			}

			// /activity phrase add <文案> — 追加自定义思考短语
			if (parts[0] === "phrase") {
				if (parts[1] === "add" && parts.length > 2) {
					const phrase = parts.slice(2).join(" ").trim();
					if (phrase.length > 48) {
						ctx.ui.notify("短语最长 48 个字符", "warning");
						return;
					}
					if ((config.customPhrases ?? []).includes(phrase)) {
						ctx.ui.notify("这条短语已经在池子里了", "info");
						return;
					}
					config = {
						...config,
						customPhrases: [...(config.customPhrases ?? []), phrase],
					};
					saveConfig();
					ctx.ui.notify(`已添加自定义短语：${phrase}`, "info");
					return;
				}
				if (parts[1] === "list") {
					const list = config.customPhrases ?? [];
					ctx.ui.notify(
						list.length > 0
							? `自定义短语（${list.length}）：${list.join(" / ")}`
							: "暂无自定义短语，用 /activity phrase add <文案> 添加",
						"info",
					);
					return;
				}
				ctx.ui.notify("用法：/activity phrase add <文案> · /activity phrase list", "info");
				return;
			}

			// /activity stats — 本轮统计
			if (parts[0] === "stats") {
				const thinkSec = Math.round(thinkingMs / 1000);
				const toolSec = Math.round(toolMs / 1000);
				const sessionHrs = sessionStartMs > 0 ? ((Date.now() - sessionStartMs) / 3_600_000).toFixed(1) : "0";
				ctx.ui.notify(
					`📊 本轮：${toolCount} 工具 · 想 ${thinkSec}s 干 ${toolSec}s · ${outputTokens} tok${currentTps > 0 ? ` · ~${currentTps} tok/s` : ""} · 连击峰值 ${maxStreak} · 子代理 ${subagentTotal} · 会话 ${sessionHrs}h`,
					"info",
				);
				return;
			}

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
				saveConfig();
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
