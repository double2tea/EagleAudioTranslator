/**
 * Eagle插件生命周期事件处理
 */

// 插件创建事件
eagle.onPluginCreate((plugin) => {
    console.log('eagle.onPluginCreate', plugin);

    // 显示插件信息
    const infoElement = document.getElementById('plugin-info');
    if (infoElement) {
        infoElement.innerHTML = `
        <div class="info-item">
            <span class="label">插件ID:</span>
            <span class="value">${plugin.manifest.id || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="label">版本:</span>
            <span class="value">${plugin.manifest.version || '1.0.0'}</span>
        </div>
        `;
    }

    // 初始化插件
    if (typeof initPlugin === 'function') {
        initPlugin();
    } else {
        console.error('initPlugin函数未定义，可能是脚本加载顺序问题');
        // 尝试延迟初始化
        setTimeout(() => {
            if (typeof initPlugin === 'function') {
                console.log('延迟初始化插件');
                initPlugin();
            } else {
                console.error('延迟初始化失败，initPlugin函数仍未定义');
            }
        }, 500);
    }
});

// 插件运行事件
eagle.onPluginRun(() => {
    console.log('eagle.onPluginRun');
});

// 插件显示事件
eagle.onPluginShow(() => {
    console.log('eagle.onPluginShow');

    // 确保插件显示时初始化
    if (typeof initPlugin === 'function' && (!window.pluginState || !window.pluginState.initialized)) {
        initPlugin();
    }
});

// 插件隐藏事件
eagle.onPluginHide(() => {
    console.log('eagle.onPluginHide');
});

// 插件退出前事件
eagle.onPluginBeforeExit((event) => {
    console.log('eagle.onPluginBeforeExit');

    // 执行清理工作
    if (window.pluginState && window.pluginState.translationService) {
        // 保存缓存等
    }

    return true; // 允许插件退出
});