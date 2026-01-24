<script lang="ts">
    import { getSettings, updateSettings } from '../stores/settings';
    import { mcpManager, MCPServer } from '../services/mcpService';
    import { t } from '../utils/i18n';

    let settings = getSettings();
    let addingServer = false;
    let newServer = {
        id: '',
        name: '',
        url: '',
        apiKey: '',
        timeout: 30000,
        customHeaders: {} as Record<string, string>,
        enabled: true
    };
    let editingServer: any = null;
    let testResult = '';

    // 生成唯一 ID
    function generateId(): string {
        return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 显示添加服务器表单
    function showAddServer() {
        addingServer = true;
        newServer = {
            id: generateId(),
            name: '',
            url: '',
            apiKey: '',
            timeout: 30000,
            customHeaders: {},
            enabled: true
        };
    }

    // 取消添加服务器
    function cancelAddServer() {
        addingServer = false;
        newServer = {
            id: '',
            name: '',
            url: '',
            apiKey: '',
            timeout: 30000,
            customHeaders: {},
            enabled: true
        };
    }

    // 添加服务器
    async function addServer() {
        if (!newServer.name.trim() || !newServer.url.trim()) {
            return;
        }

        const updatedConfigs = [...settings.mcpConfigs, newServer];
        const newSettings = { ...settings, mcpConfigs: updatedConfigs };
        updateSettings(newSettings);

        await mcpManager.addServer(newServer);

        addingServer = false;
        newServer = {
            id: '',
            name: '',
            url: '',
            apiKey: '',
            timeout: 30000,
            customHeaders: {},
            enabled: true
        };
    }

    // 编辑服务器
    function editServer(server: any) {
        editingServer = { ...server };
    }

    // 取消编辑服务器
    function cancelEditServer() {
        editingServer = null;
    }

    // 更新服务器
    async function updateServer() {
        if (!editingServer || !editingServer.name.trim() || !editingServer.url.trim()) {
            return;
        }

        const updatedConfigs = settings.mcpConfigs.map(config =>
            config.id === editingServer.id ? editingServer : config
        );
        const newSettings = { ...settings, mcpConfigs: updatedConfigs };
        updateSettings(newSettings);

        await mcpManager.updateServer(editingServer.id, editingServer);

        editingServer = null;
    }

    // 删除服务器
    async function deleteServer(id: string) {
        if (!confirm(t('settings.mcp.deleteConfirm'))) {
            return;
        }

        const updatedConfigs = settings.mcpConfigs.filter(config => config.id !== id);
        const newSettings = { ...settings, mcpConfigs: updatedConfigs };
        updateSettings(newSettings);

        await mcpManager.removeServer(id);
    }

    // 测试服务器连接
    async function testConnection(server: any) {
        testResult = t('settings.mcp.testing');
        try {
            const testServer = new MCPServer(server);
            const success = await testServer.testConnection();
            testResult = success ? t('settings.mcp.testSuccess') : t('settings.mcp.testFailed');
        } catch (error) {
            testResult = `${t('settings.mcp.testFailed')}: ${error}`;
        }
    }

    // 切换服务器启用状态
    async function toggleServerEnabled(id: string, enabled: boolean) {
        const updatedConfigs = settings.mcpConfigs.map(config =>
            config.id === id ? { ...config, enabled } : config
        );
        const newSettings = { ...settings, mcpConfigs: updatedConfigs };
        updateSettings(newSettings);

        const server = mcpManager.getServer(id);
        if (server) {
            if (enabled) {
                await server.connect();
            } else {
                await server.disconnect();
            }
        }
    }

    // 添加自定义请求头
    function addCustomHeader(server: any) {
        if (!server.customHeaders) {
            server.customHeaders = {};
        }
        server.customHeaders[''] = '';
    }

    // 删除自定义请求头
    function removeCustomHeader(server: any, key: string) {
        if (server.customHeaders) {
            delete server.customHeaders[key];
        }
    }

    // 更新自定义请求头
    function updateCustomHeader(server: any, oldKey: string, newKey: string, value: string) {
        if (server.customHeaders) {
            if (oldKey !== newKey) {
                delete server.customHeaders[oldKey];
            }
            server.customHeaders[newKey] = value;
        }
    }
</script>

<div class="mcp-config-panel">
    <div class="panel-header">
        <h2>{t('settings.mcp.title')}</h2>
        <p class="description">{t('settings.mcp.description')}</p>
    </div>

    <!-- 服务器列表 -->
    <div class="server-list">
        {#each settings.mcpConfigs as server}
            <div class="server-card">
                <div class="server-header">
                    <div class="server-info">
                        <div class="server-name">{server.name}</div>
                        <div class="server-url">{server.url}</div>
                    </div>
                    <div class="server-actions">
                        <button class="btn-small" on:click={() => editServer(server)}>
                            {t('settings.mcp.edit')}
                        </button>
                        <button class="btn-small" on:click={() => deleteServer(server.id)}>
                            {t('settings.mcp.delete')}
                        </button>
                        <button class="btn-small" on:click={() => testConnection(server)}>
                            {t('settings.mcp.test')}
                        </button>
                    </div>
                </div>

                <div class="server-details">
                    <div class="server-status">
                        <label>
                            <input
                                type="checkbox"
                                checked={server.enabled}
                                on:change={(e) => toggleServerEnabled(server.id, e.target.checked)}
                            />
                            {t('settings.mcp.enabled')}
                        </label>
                    </div>

                    <div class="server-timeout">
                        {t('settings.mcp.timeout')}: {server.timeout}ms
                    </div>

                    {#if Object.keys(server.customHeaders || {}).length > 0}
                        <div class="server-headers">
                            <div class="headers-title">{t('settings.mcp.customHeaders')}:</div>
                            {#each Object.entries(server.customHeaders) as [key, value]}
                                <div class="header-item">
                                    {key}: {value}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <!-- 添加服务器按钮 -->
    {#if !addingServer}
        <button class="btn-primary" on:click={showAddServer}>
            {t('settings.mcp.addServer')}
        </button>
    {/if}

    <!-- 添加服务器表单 -->
    {#if addingServer}
        <div class="server-form">
            <h3>{t('settings.mcp.addServer')}</h3>

            <div class="form-group">
                <label for="serverName">{t('settings.mcp.serverName')}:</label>
                <input
                    id="serverName"
                    type="text"
                    bind:value={newServer.name}
                    placeholder={t('settings.mcp.serverNamePlaceholder')}
                />
            </div>

            <div class="form-group">
                <label for="serverUrl">{t('settings.mcp.serverUrl')}:</label>
                <input
                    id="serverUrl"
                    type="text"
                    bind:value={newServer.url}
                    placeholder={t('settings.mcp.serverUrlPlaceholder')}
                />
            </div>

            <div class="form-group">
                <label for="serverApiKey">{t('settings.mcp.apiKey')}:</label>
                <input
                    id="serverApiKey"
                    type="password"
                    bind:value={newServer.apiKey}
                    placeholder={t('settings.mcp.apiKeyPlaceholder')}
                />
            </div>

            <div class="form-group">
                <label for="serverTimeout">{t('settings.mcp.timeout')} (ms):</label>
                <input
                    id="serverTimeout"
                    type="number"
                    bind:value={newServer.timeout}
                    min="1000"
                    max="300000"
                />
            </div>

            <div class="form-group">
                <label>{t('settings.mcp.customHeaders')}:</label>
                {#each Object.entries(newServer.customHeaders) as [key, value]}
                    <div class="header-input-group">
                        <input
                            type="text"
                            bind:value={key}
                            placeholder={t('settings.mcp.headerKey')}
                            on:change={(e) => updateCustomHeader(newServer, key, e.target.value, value)}
                        />
                        <input
                            type="text"
                            bind:value={value}
                            placeholder={t('settings.mcp.headerValue')}
                            on:change={(e) => updateCustomHeader(newServer, key, key, e.target.value)}
                        />
                        <button class="btn-remove" on:click={() => removeCustomHeader(newServer, key)}>
                            {t('settings.mcp.remove')}
                        </button>
                    </div>
                {/each}
                <button class="btn-add-header" on:click={() => addCustomHeader(newServer)}>
                    {t('settings.mcp.addHeader')}
                </button>
            </div>

            <div class="form-group">
                <label>
                    <input
                        type="checkbox"
                        bind:checked={newServer.enabled}
                    />
                    {t('settings.mcp.enableOnAdd')}
                </label>
            </div>

            <div class="form-actions">
                <button class="btn-primary" on:click={addServer} disabled={!newServer.name.trim() || !newServer.url.trim()}>
                    {t('settings.mcp.save')}
                </button>
                <button class="btn-secondary" on:click={cancelAddServer}>
                    {t('settings.mcp.cancel')}
                </button>
            </div>
        </div>
    {/if}

    <!-- 编辑服务器表单 -->
    {#if editingServer}
        <div class="server-form">
            <h3>{t('settings.mcp.editServer')}</h3>

            <div class="form-group">
                <label for="editServerName">{t('settings.mcp.serverName')}:</label>
                <input
                    id="editServerName"
                    type="text"
                    bind:value={editingServer.name}
                    placeholder={t('settings.mcp.serverNamePlaceholder')}
                />
            </div>

            <div class="form-group">
                <label for="editServerUrl">{t('settings.mcp.serverUrl')}:</label>
                <input
                    id="editServerUrl"
                    type="text"
                    bind:value={editingServer.url}
                    placeholder={t('settings.mcp.serverUrlPlaceholder')}
                />
            </div>

            <div class="form-group">
                <label for="editServerApiKey">{t('settings.mcp.apiKey')}:</label>
                <input
                    id="editServerApiKey"
                    type="password"
                    bind:value={editingServer.apiKey}
                    placeholder={t('settings.mcp.apiKeyPlaceholder')}
                />
            </div>

            <div class="form-group">
                <label for="editServerTimeout">{t('settings.mcp.timeout')} (ms):</label>
                <input
                    id="editServerTimeout"
                    type="number"
                    bind:value={editingServer.timeout}
                    min="1000"
                    max="300000"
                />
            </div>

            <div class="form-group">
                <label>{t('settings.mcp.customHeaders')}:</label>
                {#each Object.entries(editingServer.customHeaders) as [key, value]}
                    <div class="header-input-group">
                        <input
                            type="text"
                            bind:value={key}
                            placeholder={t('settings.mcp.headerKey')}
                            on:change={(e) => updateCustomHeader(editingServer, key, e.target.value, value)}
                        />
                        <input
                            type="text"
                            bind:value={value}
                            placeholder={t('settings.mcp.headerValue')}
                            on:change={(e) => updateCustomHeader(editingServer, key, key, e.target.value)}
                        />
                        <button class="btn-remove" on:click={() => removeCustomHeader(editingServer, key)}>
                            {t('settings.mcp.remove')}
                        </button>
                    </div>
                {/each}
                <button class="btn-add-header" on:click={() => addCustomHeader(editingServer)}>
                    {t('settings.mcp.addHeader')}
                </button>
            </div>

            <div class="form-group">
                <label>
                    <input
                        type="checkbox"
                        bind:checked={editingServer.enabled}
                    />
                    {t('settings.mcp.enabled')}
                </label>
            </div>

            <div class="form-actions">
                <button class="btn-primary" on:click={updateServer} disabled={!editingServer.name.trim() || !editingServer.url.trim()}>
                    {t('settings.mcp.save')}
                </button>
                <button class="btn-secondary" on:click={cancelEditServer}>
                    {t('settings.mcp.cancel')}
                </button>
            </div>
        </div>
    {/if}

    <!-- 测试结果 -->
    {#if testResult}
        <div class="test-result">{testResult}</div>
    {/if}
</div>

<style>
    .mcp-config-panel {
        padding: 16px;
    }

    .panel-header {
        margin-bottom: 24px;
    }

    .panel-header h2 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
    }

    .description {
        margin: 0;
        color: #666;
        font-size: 14px;
    }

    .server-list {
        margin-bottom: 24px;
    }

    .server-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
    }

    .server-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .server-info {
        flex: 1;
    }

    .server-name {
        font-weight: 600;
        margin-bottom: 4px;
    }

    .server-url {
        color: #666;
        font-size: 14px;
        word-break: break-all;
    }

    .server-actions {
        display: flex;
        gap: 8px;
    }

    .btn-small {
        padding: 4px 8px;
        font-size: 12px;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        cursor: pointer;
    }

    .btn-small:hover {
        background: #e0e0e0;
    }

    .server-details {
        color: #666;
        font-size: 14px;
    }

    .server-status {
        margin-bottom: 8px;
    }

    .server-timeout {
        margin-bottom: 8px;
    }

    .server-headers {
        margin-top: 8px;
    }

    .headers-title {
        font-weight: 500;
        margin-bottom: 4px;
    }

    .header-item {
        margin-left: 16px;
        margin-bottom: 4px;
    }

    .btn-primary {
        padding: 8px 16px;
        background: #007aff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    .btn-primary:hover:not(:disabled) {
        background: #0056cc;
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .server-form {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
    }

    .server-form h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
    }

    .form-group {
        margin-bottom: 12px;
    }

    .form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
        font-size: 14px;
    }

    .form-group input[type="text"],
    .form-group input[type="password"],
    .form-group input[type="number"] {
        width: 100%;
        padding: 8px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 14px;
    }

    .header-input-group {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
    }

    .header-input-group input {
        flex: 1;
    }

    .btn-remove {
        padding: 4px 8px;
        background: #ff3b30;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }

    .btn-add-header {
        padding: 4px 8px;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 8px;
    }

    .form-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
    }

    .btn-secondary {
        padding: 8px 16px;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    .btn-secondary:hover {
        background: #e0e0e0;
    }

    .test-result {
        padding: 8px 12px;
        background: #f0f8ff;
        border: 1px solid #e0f0ff;
        border-radius: 4px;
        margin-top: 16px;
        font-size: 14px;
    }
</style>
