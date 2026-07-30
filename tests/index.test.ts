import assert from "node:assert/strict";
import test from "node:test";

import { initTheme } from "@earendil-works/pi-coding-agent";
import workingActivity, { __testing } from "../extensions/index.ts";

initTheme("dark");

const stripAnsi = (text: string) => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");

function createContext() {
	const statuses: Array<{ key: string; value: string | undefined }> = [];
	const messages: Array<string | undefined> = [];
	const indicators: unknown[] = [];
	const notifications: string[] = [];
	const theme = {
		fg: (_color: string, text: string) => `\x1b[38;2;80;160;220m${text}\x1b[0m`,
		bold: (text: string) => text,
	};
	return {
		ctx: {
			mode: "tui",
			ui: {
				theme,
				setStatus: (key: string, value: string | undefined) => statuses.push({ key, value }),
				setWorkingMessage: (value?: string) => messages.push(value),
				setWorkingIndicator: (value?: unknown) => indicators.push(value),
				notify: (value: string) => notifications.push(value),
				custom: async (factory: any) => new Promise((resolve) => {
					const done = (value: unknown) => resolve(value);
					const component = factory({ requestRender() {} }, theme, {}, done);
					component.render(100);
					done(undefined);
				}),
			},
			getContextUsage: () => undefined,
		},
		statuses,
		messages,
		indicators,
		notifications,
	};
}

function createPiHarness() {
	const handlers = new Map<string, Array<(event: any, ctx: any) => unknown>>();
	const commands = new Map<string, { handler: (args: string, ctx: any) => unknown }>();
	const pi = {
		on(name: string, handler: (event: any, ctx: any) => unknown) {
			const list = handlers.get(name) ?? [];
			list.push(handler);
			handlers.set(name, list);
		},
		registerCommand(name: string, command: { handler: (args: string, ctx: any) => unknown }) {
			commands.set(name, command);
		},
	};
	workingActivity(pi as any);
	return {
		async emit(name: string, event: any, ctx: any) {
			for (const handler of handlers.get(name) ?? []) await handler(event, ctx);
		},
		async command(name: string, args: string, ctx: any) {
			const command = commands.get(name);
			assert.ok(command, `command ${name} should be registered`);
			await command.handler(args, ctx);
		},
	};
}

test("shimmer preserves emoji graphemes in UTF-8", () => {
	const { ctx } = createContext();
	const source = "🎄春节 👩‍💻";
	const styled = __testing.shimmer(source, 3, "50a0dc", ctx as any);
	assert.equal(stripAnsi(styled), source);
	assert.equal(Buffer.from(styled, "utf8").toString("utf8").includes("�"), false);
	assert.deepEqual(__testing.splitGraphemes("👩‍💻A"), ["👩‍💻", "A"]);
});

test("tool progress extracts structured, percentage, and stage updates", () => {
	assert.equal(__testing.extractToolProgress({ details: { percent: 0.42 } }), "42%");
	assert.equal(__testing.extractToolProgress({ details: { progress: { current: 3, total: 4 } } }), "75%");
	assert.equal(__testing.extractToolProgress({ content: [{ type: "text", text: "download 63.2%" }] }), "63%");
	assert.equal(__testing.extractToolProgress({ content: [{ type: "text", text: "下载 模型分片" }] }), "下载 模型分片");
	assert.equal(__testing.extractToolProgress({ content: [{ type: "text", text: "ordinary output" }] }), null);
});

test("danger threshold never remains below warning threshold", () => {
	assert.deepEqual(
		__testing.normalizeThresholds({ frames: "moon", contextWarnAt: 96, contextDangerAt: 90 }),
		{ frames: "moon", contextWarnAt: 96, contextDangerAt: 96 },
	);
	assert.deepEqual(
		__testing.normalizeThresholds({ frames: "moon", contextWarnAt: 0, contextDangerAt: 90 }),
		{ frames: "moon", contextWarnAt: 0, contextDangerAt: 90 },
	);
});

test("settings panel constructs and doctor completes its persistence probe", async () => {
	const harness = createPiHarness();
	const state = createContext();
	await harness.command("activity", "settings", state.ctx as any);
	await harness.command("activity", "doctor", state.ctx as any);
	assert.equal(state.notifications.some((message) => message.startsWith("Activity Doctor\n")), true);
});

test("completion waits for agent_settled and preserves retry tool totals", async () => {
	const harness = createPiHarness();
	const state = createContext();
	const ctx = state.ctx as any;
	const beforeEvent = { systemPrompt: "base", systemPromptOptions: {}, prompt: "test" };

	await harness.emit("before_agent_start", beforeEvent, ctx);
	await harness.emit("agent_start", {}, ctx);
	await harness.emit("tool_execution_start", { toolCallId: "a", toolName: "read", args: { path: "a.ts" } }, ctx);
	await harness.emit("tool_execution_end", { toolCallId: "a", toolName: "read", isError: false }, ctx);
	await harness.emit("agent_end", { messages: [{ role: "assistant", stopReason: "error" }] }, ctx);

	await new Promise((resolve) => setTimeout(resolve, 80));
	assert.equal(state.statuses.some(({ value }) => value && stripAnsi(value).includes("✓")), false);

	await harness.emit("agent_start", {}, ctx);
	await harness.emit("tool_execution_start", { toolCallId: "b", toolName: "bash", args: { command: "npm test" } }, ctx);
	await harness.emit("tool_execution_end", { toolCallId: "b", toolName: "bash", isError: false }, ctx);
	await harness.emit("agent_end", { messages: [{ role: "assistant", stopReason: "stop" }] }, ctx);
	await harness.emit("agent_settled", {}, ctx);

	await new Promise((resolve) => setTimeout(resolve, 90));
	const completion = [...state.statuses].reverse().find(({ value }) => value)?.value ?? "";
	assert.match(stripAnsi(completion), /✓/);
	assert.match(stripAnsi(completion), /2 工具/);

	await harness.emit("session_shutdown", {}, ctx);
	assert.equal(state.indicators.at(-1), undefined);
	assert.equal(state.messages.at(-1), undefined);
});
