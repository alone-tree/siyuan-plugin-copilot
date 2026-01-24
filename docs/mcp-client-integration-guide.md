# MCP 客户端集成实施指南（基于 Claude Code 经验）

## 文档定位

本文档旨在基于 Claude Code 的 MCP 集成经验，为思源笔记 Copilot 插件提供 **MCP 客户端功能** 的具体实施指导。**核心目标**：让思源插件能够连接和使用外部 MCP 服务器，扩展 AI 助手的能力。

> **注意**：这不是为思源插件设计特定的 MCP 服务器，也不是构建完整的插件生态系统，而是**让思源插件作为 MCP 客户端**集成外部 MCP 服务。

## 1. Claude Code MCP 集成经验总结

### 1.1 参考文件
- `d:\Github\claude-code\plugins\plugin-dev\skills\mcp-integration\SKILL.md` - MCP 集成最佳实践
- `d:\Github\claude-code\plugins\agent-sdk-dev\.claude-plugin\plugin.json` - 插件配置示例

### 1.2 核心设计原则
1. **配置驱动**：MCP 服务器配置使用标准化的 JSON 格式
2. **多协议支持**：stdio、SSE、HTTP、WebSocket 四种连接方式
3. **工具自动发现**：连接后自动获取可用工具列表
4. **状态管理**：完善的连接状态跟踪和错误处理

## 2. MCP 服务器配置方案

### 2.1 配置格式（基于 Claude Code 经验）

#### 方案 A：独立配置文件 `.mcp.json`（推荐）
```json
{
  "server-id": {
    "name": "服务器显示名称",
    "type": "http",  // "stdio" | "sse" | "http" | "websocket"
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    },
    "timeout": 30000,
    "enabled": true,
    "description": "服务器描述"
  }
}
```

#### 方案 B：集成到插件设置中
与现有思源插件设置系统集成，存储在 `settings.mcpServers` 数组中。

### 2.2 四种 MCP 服务器类型配置

#### 1. **HTTP (REST API)** - 浏览器环境首选
```json
{
  "web-search": {
    "name": "网页搜索工具",
    "type": "http",
    "url": "https://mcp.example.com/api",
    "headers": {
      "Authorization": "Bearer ${SEARCH_API_KEY}",
      "Content-Type": "application/json"
    },
    "timeout": 10000
  }
}
```
**适用场景**：大多数外部 API 服务，浏览器环境兼容性好。

#### 2. **SSE (Server-Sent Events)** - 实时数据流
```json
{
  "real-time-data": {
    "name": "实时数据源",
    "type": "sse",
    "url": "https://mcp.example.com/sse",
    "withCredentials": true
  }
}
```
**适用场景**：需要服务器推送数据的服务，如监控、通知等。

#### 3. **WebSocket** - 双向实时通信
```json
{
  "collaboration": {
    "name": "协作编辑",
    "type": "websocket",
    "url": "wss://collab.example.com/mcp",
    "protocols": ["mcp-v1"]
  }
}
```
**适用场景**：实时协作、聊天等双向通信场景。

#### 4. **stdio (标准输入输出)** - 本地进程（浏览器环境受限）
```json
{
  "local-tools": {
    "name": "本地工具",
    "type": "stdio",
    "command": "node",
    "args": ["local-mcp-server.js"],
    "env": {
      "NODE_ENV": "development"
    }
  }
}
```
**注意**：浏览器环境对 stdio 支持有限，建议优先使用 HTTP/SSE/WebSocket。

### 2.3 环境变量支持
```json
{
  "database": {
    "type": "http",
    "url": "${DB_MCP_URL}",
    "headers": {
      "Authorization": "Bearer ${DB_API_KEY}"
    }
  }
}
```
支持 `${VARIABLE_NAME}` 格式的环境变量替换。

## 3. 技术实现方案

### 3.1 现有基础分析

#### 已实现文件：
1. **[mcpService.ts](d:\Github\siyuan-plugin-copilot\src\services\mcpService.ts)** - MCP 服务框架（需增强）
2. **[MCPConfigPanel.svelte](d:\Github\siyuan-plugin-copilot\src\components\MCPConfigPanel.svelte)** - 配置界面（已存在）
3. **[2026-01-24-mcp-support.md](d:\Github\siyuan-plugin-copilot\docs\plans\2026-01-24-mcp-support.md)** - 实施计划

#### 当前状态：
- ✅ 定义了 MCP 连接状态枚举
- ✅ 创建了 MCP 工具、资源、提示的接口
- ✅ 实现了基本的 MCPServer 类框架
- ❌ **使用模拟数据**，需要替换为真实 MCP 连接
- ❌ 缺少多协议支持
- ❌ 缺少工具自动发现

### 3.2 增强现有 mcpService.ts

#### 步骤 1：安装 MCP SDK
```bash
npm install @modelcontextprotocol/sdk
```

#### 步骤 2：增强 MCPServer 类
```typescript
// 在现有 mcpService.ts 基础上增强
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { HttpClientTransport } from '@modelcontextprotocol/sdk/client/http.js';

export class MCPServer {
  private client: Client | null = null;
  private transport: any = null;

  async connect(): Promise<boolean> {
    try {
      this.status = MCPConnectionStatus.CONNECTING;
      this.emit('statusChange', this.status);

      // 创建 MCP 客户端
      this.client = new Client(
        { name: 'siyuan-plugin-copilot', version: '0.5.1' },
        { capabilities: {} }
      );

      // 根据配置类型选择连接方式
      switch (this.config.type) {
        case 'http':
          this.transport = new HttpClientTransport(new URL(this.config.url), {
            headers: this.config.headers
          });
          break;

        case 'sse':
          this.transport = new SSEClientTransport(new URL(this.config.url));
          break;

        case 'websocket':
          // WebSocket 实现
          break;

        case 'stdio':
          // 浏览器环境受限，可考虑降级处理
          console.warn('stdio 连接在浏览器中受限，建议使用 HTTP/SSE');
          return false;
      }

      // 连接服务器
      await this.client.connect(this.transport);

      // 获取工具列表
      await this.discoverTools();

      this.status = MCPConnectionStatus.CONNECTED;
      this.emit('statusChange', this.status);
      return true;

    } catch (error) {
      this.status = MCPConnectionStatus.ERROR;
      this.lastError = error.message;
      this.emit('statusChange', this.status);
      return false;
    }
  }

  private async discoverTools(): Promise<void> {
    if (!this.client) return;

    // 调用 MCP 的 tools/list 方法获取工具列表
    const tools = await this.client.listTools();
    this.tools = tools.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema || {},
      resource: tool.resource
    }));
  }

  async callTool(toolName: string, parameters: any): Promise<any> {
    if (!this.client || this.status !== MCPConnectionStatus.CONNECTED) {
      throw new Error('MCP 服务器未连接');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: parameters
      });

      return {
        success: true,
        data: result.content?.[0]?.text || result,
        raw: result
      };
    } catch (error) {
      console.error(`调用工具 ${toolName} 失败:`, error);
      throw error;
    }
  }
}
```

### 3.3 配置管理增强

#### 创建配置文件解析器：
```typescript
// src/utils/mcpConfigParser.ts
export class MCPConfigParser {
  static parseConfig(configJson: string): MCPServerConfig[] {
    const config = JSON.parse(configJson);
    const servers: MCPServerConfig[] = [];

    for (const [id, serverConfig] of Object.entries(config)) {
      servers.push({
        id,
        ...this.validateServerConfig(serverConfig as any)
      });
    }

    return servers;
  }

  static validateServerConfig(config: any): Partial<MCPServerConfig> {
    // 验证配置格式，应用默认值
    return {
      type: config.type || 'http',
      name: config.name || '未命名服务器',
      url: config.url,
      headers: config.headers || {},
      timeout: config.timeout || 30000,
      enabled: config.enabled !== false,
      description: config.description || ''
    };
  }
}
```

## 4. 集成到现有架构

### 4.1 与 Agent 模式集成

#### 修改 [tools/index.ts](d:\Github\siyuan-plugin-copilot\src\tools\index.ts)：
```typescript
// 添加 MCP 工具动态注入
import { mcpManager } from '../services/mcpService';

export function getMCPTools(): Tool[] {
  const tools: Tool[] = [];
  const servers = mcpManager.getConnectedServers();

  for (const server of servers) {
    const serverTools = server.getAvailableTools();
    for (const mcpTool of serverTools) {
      tools.push({
        type: 'function',
        function: {
          name: `mcp_${server.id}_${mcpTool.name}`,
          description: `[${server.name}] ${mcpTool.description}`,
          parameters: mcpTool.parameters
        }
      });
    }
  }

  return tools;
}

// 在现有的工具集合中添加 MCP 工具
export const allTools = [
  ...getBuiltinTools(),
  ...getMCPTools()  // 动态添加 MCP 工具
];
```

### 4.2 工具调用路由

#### 创建工具调用路由器：
```typescript
// src/utils/mcpToolRouter.ts
export async function callMCPTool(toolName: string, args: any): Promise<any> {
  // 解析工具名格式: mcp_{serverId}_{toolName}
  const match = toolName.match(/^mcp_([^_]+)_(.+)$/);
  if (!match) {
    throw new Error(`无效的 MCP 工具名格式: ${toolName}`);
  }

  const [, serverId, actualToolName] = match;
  const server = mcpManager.getServer(serverId);

  if (!server) {
    throw new Error(`找不到 MCP 服务器: ${serverId}`);
  }

  return await server.callTool(actualToolName, args);
}
```

## 5. 配置界面增强

### 5.1 支持四种服务器类型

#### 修改 [MCPConfigPanel.svelte](d:\Github\siyuan-plugin-copilot\src\components\MCPConfigPanel.svelte)：
```svelte
<script lang="ts">
  // 添加服务器类型选项
  const serverTypes = [
    { value: 'http', label: 'HTTP (REST API)', description: '标准的 REST API 连接' },
    { value: 'sse', label: 'SSE (Server-Sent Events)', description: '服务器推送数据流' },
    { value: 'websocket', label: 'WebSocket', description: '双向实时通信' },
    { value: 'stdio', label: '标准输入输出', description: '本地进程连接（浏览器受限）' }
  ];

  // 根据选择的类型显示不同的配置字段
  $: showUrlField = ['http', 'sse', 'websocket'].includes(selectedType);
  $: showCommandField = selectedType === 'stdio';
</script>

<!-- 在表单中添加类型选择 -->
<select bind:value={selectedType}>
  {#each serverTypes as type}
    <option value={type.value}>{type.label}</option>
  {/each}
</select>

<!-- 动态显示配置字段 -->
{#if showUrlField}
  <input type="text" bind:value={serverUrl} placeholder="服务器 URL" />
{/if}

{#if showCommandField}
  <input type="text" bind:value={command} placeholder="命令（如: node）" />
  <input type="text" bind:value={args} placeholder="参数（逗号分隔）" />
{/if}
```

### 5.2 连接测试功能
```typescript
async function testConnection(serverId: string): Promise<TestResult> {
  const server = mcpManager.getServer(serverId);
  if (!server) {
    return { success: false, message: '服务器不存在' };
  }

  try {
    const connected = await server.testConnection();
    if (connected) {
      const tools = server.getAvailableTools();
      return {
        success: true,
        message: `连接成功！发现 ${tools.length} 个工具`,
        tools: tools.map(t => t.name)
      };
    } else {
      return { success: false, message: '连接失败' };
    }
  } catch (error) {
    return {
      success: false,
      message: `连接错误: ${error.message}`,
      error: error.message
    };
  }
}
```

## 6. 实施路线图

### 阶段 1：基础 MCP 连接（1-2周）
1. **安装 MCP SDK依赖**
2. **实现 HTTP/SSE 连接**（浏览器兼容性最好）
3. **替换模拟数据**，实现真实工具发现
4. **基础工具调用**集成到 Agent 模式

### 阶段 2：增强功能（2-3周）
1. **支持 WebSocket 连接**
2. **实现配置管理界面**
3. **添加连接状态监控**
4. **完善错误处理和重试机制**

### 阶段 3：高级功能（3-4周）
1. **工具缓存和性能优化**
2. **多服务器负载均衡**
3. **工具使用统计和分析**
4. **预设 MCP 服务器配置库**

## 7. 浏览器环境注意事项

### 7.1 跨域问题（CORS）
- **HTTP/SSE/WebSocket**：需要服务器配置 CORS 头部
- **解决方案**：提供代理配置选项或使用浏览器扩展权限

### 7.2 stdio 限制
- **问题**：浏览器无法直接执行本地命令
- **解决方案**：
  1. 通过思源后端代理执行
  2. 使用 WebAssembly 运行特定工具
  3. 提示用户使用 HTTP/SSE 替代方案

### 7.3 安全性考虑
1. **API 密钥管理**：加密存储，不暴露在客户端代码中
2. **工具权限控制**：允许用户选择启用/禁用特定工具
3. **请求限制**：防止滥用外部 API
4. **隐私保护**：敏感数据不发送到不受信任的服务器

## 8. 测试策略

### 8.1 测试服务器
使用官方 MCP 测试服务器：
```json
{
  "test-server": {
    "name": "MCP 测试服务器",
    "type": "http",
    "url": "https://mcp-test.example.com",
    "description": "用于功能测试的 MCP 服务器"
  }
}
```

### 8.2 测试用例
1. **连接测试**：验证各种协议连接是否正常
2. **工具发现**：检查工具列表是否正确获取
3. **工具调用**：测试参数传递和结果处理
4. **错误处理**：模拟网络错误、服务器错误等场景
5. **性能测试**：多工具并发调用测试

## 9. 常见 MCP 服务器示例

### 9.1 文件系统访问
```json
{
  "filesystem": {
    "name": "文件系统",
    "type": "http",
    "url": "http://localhost:3000/mcp/filesystem",
    "description": "访问本地文件系统（需本地服务）"
  }
}
```

### 9.2 网页搜索
```json
{
  "web-search": {
    "name": "网页搜索",
    "type": "http",
    "url": "https://search-api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${SEARCH_API_KEY}"
    }
  }
}
```

### 9.3 数据库查询
```json
{
  "database": {
    "name": "数据库查询",
    "type": "http",
    "url": "https://db-proxy.example.com/mcp",
    "description": "执行数据库查询操作"
  }
}
```

## 10. 故障排除指南

### 10.1 连接失败
1. **检查服务器地址**：确保 URL 格式正确
2. **验证 CORS 配置**：浏览器控制台查看跨域错误
3. **检查网络连接**：确保可以访问目标服务器
4. **查看服务器日志**：MCP 服务器端错误信息

### 10.2 工具调用失败
1. **验证参数格式**：检查参数是否符合工具要求
2. **查看权限设置**：确保工具已被启用
3. **检查工具状态**：工具可能暂时不可用
4. **查看错误响应**：MCP 服务器返回的错误信息

## 总结

本文档提供了基于 Claude Code 经验的 MCP 客户端集成方案，重点包括：

1. **配置标准化**：借鉴 Claude Code 的四种 MCP 服务器配置格式
2. **技术实现**：使用 @modelcontextprotocol/sdk 实现真实连接
3. **浏览器适配**：优先支持 HTTP/SSE/WebSocket，处理浏览器限制
4. **集成方案**：与思源插件现有 Agent 模式无缝集成

**核心目标**：让思源笔记 Copilot 插件能够**作为 MCP 客户端**，连接和使用丰富的外部 MCP 服务，从而大大扩展 AI 助手的能力范围。

---
*文档版本: 1.0*
*更新日期: 2026-01-24*
*适用对象: 思源插件开发者、AI 代码助手*