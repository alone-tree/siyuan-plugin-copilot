# MCP 功能快速接手指南

## 🎯 项目状态速览

### 一句话总结
MCP功能框架已搭建完成，但存在**关键初始化bug**导致按钮无响应，需要修复P0级问题后才能使用。

### 分支管理
```
当前分支: feature/mcp-integration (MCP开发分支)
稳定分支: main (干净，可构建稳定版)
状态: 代码在工作区，未提交
```

### 思源笔记状态
- ✅ **插件**: 使用市场稳定版 (0.3.6，无MCP功能)
- ✅ **配置**: `settings.json` 已清理 `mcpConfigs: []`
- ✅ **数据**: API密钥和对话历史安全 (`storage/petal/`)

## 🔧 核心问题清单（按优先级）

### P0 - 必须立即修复
1. **MCPServerSelector.svelte**: `settings` 变量未初始化
   - 位置: 第19行 `let settings: any = null;`
   - 症状: 无法加载全局服务器配置
   - 修复: 添加 `onMount(async () => { settings = await getSettings(); })`

2. **事件系统缺失**: `server.on?.('statusChange', initServers)` 调用失败
   - 位置: MCPServerSelector.svelte 第43行
   - 原因: `MCPServer` 类没有 `on` 方法
   - 修复: 在 `mcpService.ts` 中添加简单的事件系统

3. **测试连接错误**: 错误的构造函数调用
   - 位置: MCPConfigPanel.svelte 第121行
   - 代码: `new (mcpManager.constructor as any).MCPServer(server)`
   - 修复: 直接导入 `MCPServer` 类

### P1 - 影响用户体验
1. **全局变量依赖**: `(window as any).mcpManager` 模式
2. **异步竞争条件**: MCP初始化时序问题
3. **模拟数据**: `connect()` 返回硬编码工具列表

## 🚀 5分钟上手调试

### 步骤1: 切换到开发环境
```bash
# 确保在MCP开发分支
git checkout feature/mcp-integration

# 查看当前修改
git status
```

### 步骤2: 修复关键bug (P0)
```typescript
// 文件: src/components/MCPServerSelector.svelte
// 添加以下代码：
import { onMount } from 'svelte';

onMount(async () => {
    settings = await getSettings();
    initServers();
});
```

### 步骤3: 构建并测试
```bash
# 关闭思源笔记（重要！）
# 删除旧插件目录（可选）
rm -rf "D:\SiYuan\data\plugins\siyuan-plugin-copilot"

# 构建并复制开发版
pnpm run make-install
# 或
pnpm run build && pnpm run make_dev_copy

# 启动思源笔记测试
```

### 步骤4: 快速恢复（如果失败）
```bash
# 关闭思源笔记
rm -rf "D:\SiYuan\data\plugins\siyuan-plugin-copilot"
# 启动思源笔记 → 自动下载稳定版
```

## 📁 核心文件结构

```
src/
├── services/mcpService.ts          # MCP服务核心 ❤️
│   ├── MCPManager (单例管理器)
│   ├── MCPServer (服务器实例)
│   └── 连接状态、工具调用
├── components/
│   ├── MCPConfigPanel.svelte      # 服务器配置界面
│   └── MCPServerSelector.svelte   # 会话选择器
├── ai-sidebar.svelte              # 主界面MCP集成
├── tools/index.ts                 # MCP工具转换和执行
└── defaultSettings.ts             # MCPConfig接口
```

## 🐛 问题重现步骤

1. **构建开发版插件**
2. **启动思源笔记**
3. **打开Copilot侧边栏**
4. **点击"MCP服务器"按钮** → 无响应/错误
5. **打开设置 → MCP配置** → 测试连接失败

## 🔍 调试技巧

### 浏览器开发者工具
```javascript
// 控制台检查MCP状态
window.mcpManager                    // 应返回MCPManager实例
window.mcpManager.getServers()       // 应返回服务器列表
console.log('MCP initialized:', window.isMCPInitialized)
```

### 日志输出位置
- **思源笔记控制台**: 插件加载日志
- **浏览器控制台**: JavaScript错误
- **网络面板**: MCP服务器请求

## 📋 开发工作流

### 安全开发循环
```
1. 在 feature/mcp-integration 分支修改代码
2. 关闭思源笔记
3. 构建插件: pnpm run make-install
4. 启动思源笔记测试
5. 发现问题 → 删除插件目录 → 恢复稳定版
6. 修复问题 → 重复步骤2-4
```

### 分支切换
```bash
# 切换到MCP开发
git checkout feature/mcp-integration

# 切换到稳定版开发
git checkout main
git stash                   # 如果工作区有修改
# 构建稳定版...
git stash pop              # 恢复修改
```

## 🎯 成功标准

### 第一阶段完成（基础功能可用）
- [ ] MCP服务器配置界面可正常操作
- [ ] 服务器连接测试功能正常
- [ ] MCPServerSelector显示正确服务器列表
- [ ] MCP工具出现在工具选择器中

### 第二阶段完成（集成测试）
- [ ] 可连接到真实MCP服务器（需 `@modelcontextprotocol/sdk`）
- [ ] MCP工具可被AI调用
- [ ] 会话级别MCP配置可保存和恢复

## 📞 紧急联系人

### 关键文件负责人
- **架构设计**: `mcpService.ts` - @当前开发者
- **UI组件**: `MCPConfigPanel.svelte`, `MCPServerSelector.svelte` - @当前开发者
- **工具集成**: `tools/index.ts` - @当前开发者
- **主界面**: `ai-sidebar.svelte` - @当前开发者

### 交接清单
- [ ] 阅读 `MCP_DEVELOPMENT_STATUS.md` 了解详细问题
- [ ] 修复P0级bug（3个关键问题）
- [ ] 测试基础功能可用性
- [ ] 考虑添加 `@modelcontextprotocol/sdk` 依赖
- [ ] 创建测试用例防止回归

---

**文档版本**: 1.0
**最后更新**: 2026-01-24
**适用对象**: 后续接手MCP开发的AI或开发者
**紧急程度**: ⚠️ 需要优先修复P0级bug