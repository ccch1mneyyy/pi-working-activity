# pi-working-activity 项目规则

## 用途
pi CLI Working 行扩展的开源仓库。源码在 `extensions/index.ts`，发布到 npm 供 `pi install npm:pi-working-activity` 使用。

## 开发约定
- 唯一源码：`extensions/index.ts`（无构建，pi 直接加载 TS）
- 本机活动副本：`C:\Users\17481\.pi\agent\extensions\working-activity.ts`，改完同步 + `/reload`
- 语法校验：`node --experimental-strip-types`（import 包解析失败是预期）
- 调试：`working-activity.json` 里 `debugLog: true`

## 文案
- 开源文案（README + 状态栏短语池）优先用 **DeepSeek 官方 V4 Pro** 生成
- 生成脚本：`.local/gen-with-ds.cjs` / `.local/gen-phrases.cjs` / `.local/apply-phrases.cjs`（不入库）
- 输出缓存：`.local/ds-gen/`（不入库）
- 风格：短、口语、俏皮、有活人感；游戏梗仅 rare 池；允许 deadpan 英文

## 发布
- semver：功能 minor，修 bug patch
- 发布前：`npm view pi-working-activity` 确认包名；填 `package.json` 的 author/repository
