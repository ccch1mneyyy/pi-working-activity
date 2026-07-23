# pi-working-activity 项目规则

## 用途
pi CLI Working 行扩展的开源仓库。源码在 `extensions/index.ts`，发布到 npm 供 `pi install npm:pi-working-activity` 使用。

## 开发约定
- 唯一源码文件：`extensions/index.ts`（无构建步骤，pi 直接加载 TS）
- 本机测试副本：`C:\Users\17481\.pi\agent\extensions\working-activity.ts`，改完源码同步过去 + `/reload` 验证
- 语法校验：`node --experimental-strip-types`（import 包解析失败是预期的，pi 运行时解析）
- 调试：`working-activity.json` 里 `debugLog: true`，日志在 `~/.pi/agent/working-activity-debug.log`

## 文案风格约束（用户明确要求）
- 短、口语、像聊天，不装不营业
- 不加二次元/游戏梗到普通文案池（游戏梗只允许在稀有彩蛋池）
- 新增文案先看现有池子风格再写

## 发布
- 版本号走 semver，改功能升 minor，修 bug 升 patch
- 发布前：`npm view pi-working-activity` 确认名字没被占
