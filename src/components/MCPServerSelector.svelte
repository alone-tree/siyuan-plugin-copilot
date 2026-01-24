<script lang="ts">
    import { onMount } from 'svelte';
    import { mcpManager } from '../services/mcpService';
    import { getSettings } from '../stores/settings';
    import { t } from '../utils/i18n';

    // 当前会话使用的 MCP 服务器列表（服务器 id）
    export let selectedServerIds: string[] = [];

    // 会话级别设置是否已修改
    export let isModified: boolean = false;

    // 服务器选择变化时的回调
    export let onSelect: (serverIds: string[]) => void = () => {};

    // 关闭选择器时的回调
    export let onClose: () => void = () => {};

    let settings: any = null;
    let availableServers: any[] = [];

    // 获取可用服务器列表
    function getAvailableServers() {
        return mcpManager.getServers().filter(server => server.enabled);
    }

    // 初始化服务器列表
    function initServers() {
        availableServers = getAvailableServers();
        // 如果没有设置会话级别的服务器，使用全局默认设置
        if (!isModified && selectedServerIds.length === 0 && settings) {
            selectedServerIds = (settings.mcpConfigs || [])
                .filter((config: any) => config.enabled)
                .map((config: any) => config.id);
        }
    }

    // 监听服务器变化
    function setupServerListeners() {
        const servers = mcpManager.getServers();
        if (servers && Array.isArray(servers)) {
            servers.forEach(server => {
                server.on?.('statusChange', initServers);
            });
        }
    }

    // 切换服务器选择
    function toggleServer(serverId: string) {
        let newSelected: string[];
        if (selectedServerIds.includes(serverId)) {
            newSelected = selectedServerIds.filter(id => id !== serverId);
        } else {
            newSelected = [...selectedServerIds, serverId];
        }
        selectedServerIds = newSelected;
        isModified = true;
        onSelect(newSelected);
    }

    // 重置为全局设置
    function resetToGlobal() {
        selectedServerIds = settings.mcpConfigs
            .filter((config: any) => config.enabled)
            .map((config: any) => config.id);
        isModified = false;
        onSelect(selectedServerIds);
    }

    // 服务器状态图标
    function getServerStatusIcon(server: any) {
        switch (server.status) {
            case 'connected':
                return '✅';
            case 'connecting':
                return '🔄';
            case 'error':
                return '❌';
            default:
                return '⚪';
        }
    }

    // 初始化
    initServers();
</script>

<div class="mcp-server-selector">
    <div class="selector-header">
        <h3>{t('mcp.serverSelector.title')}</h3>
        <div class="selector-header__actions">
            {#if isModified}
                <button class="btn-small" on:click={resetToGlobal}>
                    {t('mcp.serverSelector.resetToGlobal')}
                </button>
            {/if}
            <button class="btn-small" on:click={onClose}>
                {t('common.close')}
            </button>
        </div>
    </div>

    <div class="server-list">
        {#each availableServers as server}
            <div class="server-item">
                <label class="server-label">
                    <input
                        type="checkbox"
                        checked={selectedServerIds.includes(server.id)}
                        on:change={() => toggleServer(server.id)}
                        disabled={server.status === 'connecting'}
                    />
                    <span class="server-status">{getServerStatusIcon(server)}</span>
                    <span class="server-name">{server.name}</span>
                    <span class="server-url">{server.url}</span>
                </label>
            </div>
        {/each}

        {#if availableServers.length === 0}
            <div class="no-servers">
                {t('mcp.serverSelector.noServers')}
            </div>
        {/if}
    </div>

    {#if availableServers.length > 0}
        <div class="selector-footer">
            <div class="selected-count">
                {t('mcp.serverSelector.selectedCount', { count: selectedServerIds.length })}
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .mcp-server-selector {
        background: var(--b3-theme-surface);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
    }

    .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .selector-header__actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .selector-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--b3-theme-on-surface);
    }

    .btn-small {
        padding: 4px 8px;
        font-size: 12px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        cursor: pointer;
        color: var(--b3-theme-on-background);
    }

    .btn-small:hover {
        background: var(--b3-theme-hover);
    }

    .server-list {
        max-height: 200px;
        overflow-y: auto;
    }

    .server-item {
        margin-bottom: 8px;
    }

    .server-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .server-label:hover {
        background: var(--b3-theme-hover);
    }

    .server-label input[type="checkbox"] {
        margin: 0;
    }

    .server-status {
        font-size: 14px;
    }

    .server-name {
        flex: 1;
        font-size: 14px;
        color: var(--b3-theme-on-background);
    }

    .server-url {
        font-size: 12px;
        color: var(--b3-theme-on-surface-light);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 200px;
    }

    .no-servers {
        text-align: center;
        padding: 20px;
        color: var(--b3-theme-on-surface-light);
        font-size: 13px;
    }

    .selector-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--b3-border-color);
        font-size: 12px;
        color: var(--b3-theme-on-surface-light);
    }

    .selected-count {
        text-align: right;
    }
</style>
