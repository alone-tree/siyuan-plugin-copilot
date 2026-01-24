import { getSettings } from '../stores/settings';

// MCP 服务器连接状态
export enum MCPConnectionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error'
}

// MCP 工具信息
export interface MCPTool {
    name: string;
    description: string;
    parameters: any;
    resource?: string;
}

// MCP 资源信息
export interface MCPResource {
    uri: string;
    name: string;
    description: string;
}

// MCP 提示信息
export interface MCPPrompt {
    name: string;
    description: string;
    content: string;
}

// MCP 服务器实例
export class MCPServer {
    public id: string;
    public name: string;
    public url: string;
    public apiKey?: string;
    public timeout: number;
    public customHeaders: Record<string, string>;
    public enabled: boolean;
    public status: MCPConnectionStatus;
    public tools: MCPTool[];
    public resources: MCPResource[];
    public prompts: MCPPrompt[];
    public lastError?: string;

    private listeners: Map<string, Function[]> = new Map();

    constructor(config: any) {
        this.id = config.id;
        this.name = config.name;
        this.url = config.url;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout;
        this.customHeaders = config.customHeaders || {};
        this.enabled = config.enabled;
        this.status = MCPConnectionStatus.DISCONNECTED;
        this.tools = [];
        this.resources = [];
        this.prompts = [];
    }

    /**
     * 添加事件监听器
     */
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /**
     * 触发事件
     */
    private emit(event: string, ...args: any[]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(...args));
        }
    }

    /**
     * 连接到 MCP 服务器
     */
    async connect(): Promise<boolean> {
        if (!this.enabled) {
            return false;
        }

        this.status = MCPConnectionStatus.CONNECTING;
        this.emit('statusChange', this.status);
        this.lastError = undefined;

        try {
            // TODO: 实现 MCP 服务器连接逻辑
            // 使用 @modelcontextprotocol/sdk 连接到服务器
            // 这里先使用模拟数据进行测试

            // 模拟连接延迟
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 模拟获取工具列表
            this.tools = [
                {
                    name: 'search_web',
                    description: '搜索网页内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: '搜索查询'
                            }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'read_file',
                    description: '读取文件内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: '文件路径'
                            }
                        },
                        required: ['path']
                    }
                }
            ];

            // 模拟获取资源列表
            this.resources = [
                {
                    uri: 'https://example.com/api/data',
                    name: '示例数据 API',
                    description: '提供示例数据的 API'
                }
            ];

            // 模拟获取提示列表
            this.prompts = [
                {
                    name: 'code_review',
                    description: '代码审查提示',
                    content: '请帮我审查以下代码...'
                }
            ];

            this.status = MCPConnectionStatus.CONNECTED;
            this.emit('statusChange', this.status);
            return true;
        } catch (error) {
            console.error(`Failed to connect to MCP server ${this.name}:`, error);
            this.status = MCPConnectionStatus.ERROR;
            this.emit('statusChange', this.status);
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            return false;
        }
    }

    /**
     * 断开与 MCP 服务器的连接
     */
    async disconnect(): Promise<void> {
        this.status = MCPConnectionStatus.DISCONNECTED;
        this.emit('statusChange', this.status);
        this.tools = [];
        this.resources = [];
        this.prompts = [];
        this.lastError = undefined;
    }

    /**
     * 测试服务器连接
     */
    async testConnection(): Promise<boolean> {
        return this.connect();
    }

    /**
     * 调用 MCP 工具
     */
    async callTool(toolName: string, parameters: any): Promise<any> {
        if (this.status !== MCPConnectionStatus.CONNECTED) {
            throw new Error('MCP server is not connected');
        }

        const tool = this.tools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
        }

        try {
            // TODO: 实现工具调用逻辑
            // 这里先使用模拟数据
            return {
                success: true,
                data: `Tool ${toolName} called with parameters: ${JSON.stringify(parameters)}`
            };
        } catch (error) {
            console.error(`Failed to call tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * 获取所有可用工具
     */
    getAvailableTools(): MCPTool[] {
        return this.enabled && this.status === MCPConnectionStatus.CONNECTED ? this.tools : [];
    }

    /**
     * 更新服务器配置
     */
    updateConfig(config: any): void {
        this.name = config.name;
        this.url = config.url;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout;
        this.customHeaders = config.customHeaders || {};
        this.enabled = config.enabled;

        // 如果配置变化导致需要重新连接
        if (this.status === MCPConnectionStatus.CONNECTED) {
            this.disconnect();
            if (this.enabled) {
                this.connect();
            }
        }
    }
}

// MCP 服务管理器
export class MCPManager {
    private servers: Map<string, MCPServer>;
    private static instance: MCPManager;

    private constructor() {
        this.servers = new Map();
    }

    static getInstance(): MCPManager {
        if (!MCPManager.instance) {
            MCPManager.instance = new MCPManager();
        }
        return MCPManager.instance;
    }

    /**
     * 初始化 MCP 服务器
     */
    async initialize(): Promise<void> {
        try {
            const settings = await getSettings();
            this.servers.clear();

            // 防御性编程：确保 mcpConfigs 存在且是数组
            if (settings?.mcpConfigs && Array.isArray(settings.mcpConfigs)) {
                settings.mcpConfigs.forEach(config => {
                    this.servers.set(config.id, new MCPServer(config));
                });

                // 自动连接启用的服务器
                await this.connectAllEnabledServers();
            } else {
                console.warn('MCP configs not found or not an array in settings');
            }
        } catch (error) {
            console.error('Failed to initialize MCP manager:', error);
            // 继续执行，不阻止插件加载
        }
    }

    /**
     * 连接所有启用的服务器
     */
    async connectAllEnabledServers(): Promise<void> {
        const connectPromises = Array.from(this.servers.values())
            .filter(server => server.enabled)
            .map(server => server.connect());

        await Promise.all(connectPromises);
    }

    /**
     * 添加服务器
     */
    async addServer(config: any): Promise<MCPServer> {
        const server = new MCPServer(config);
        this.servers.set(config.id, server);

        if (server.enabled) {
            await server.connect();
        }

        return server;
    }

    /**
     * 更新服务器
     */
    async updateServer(id: string, config: any): Promise<MCPServer | undefined> {
        const server = this.servers.get(id);
        if (server) {
            server.updateConfig(config);
        }
        return server;
    }

    /**
     * 删除服务器
     */
    async removeServer(id: string): Promise<void> {
        const server = this.servers.get(id);
        if (server) {
            await server.disconnect();
            this.servers.delete(id);
        }
    }

    /**
     * 获取所有服务器
     */
    getServers(): MCPServer[] {
        return Array.from(this.servers.values());
    }

    /**
     * 获取启用的服务器
     */
    getEnabledServers(): MCPServer[] {
        return this.getServers().filter(server => server.enabled);
    }

    /**
     * 获取已连接的服务器
     */
    getConnectedServers(): MCPServer[] {
        return this.getServers().filter(server => server.status === MCPConnectionStatus.CONNECTED);
    }

    /**
     * 获取服务器
     */
    getServer(id: string): MCPServer | undefined {
        return this.servers.get(id);
    }

    /**
     * 获取所有可用工具
     */
    getAllAvailableTools(): MCPTool[] {
        const tools: MCPTool[] = [];
        this.getConnectedServers().forEach(server => {
            tools.push(...server.getAvailableTools());
        });
        return tools;
    }

    /**
     * 调用 MCP 工具
     */
    async callTool(serverId: string, toolName: string, parameters: any): Promise<any> {
        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error(`MCP server ${serverId} not found`);
        }

        return server.callTool(toolName, parameters);
    }

    /**
     * 重新加载服务器配置
     */
    async reloadConfig(): Promise<void> {
        await this.initialize();
    }
}

// 创建 MCP 管理器实例
export const mcpManager = MCPManager.getInstance();
