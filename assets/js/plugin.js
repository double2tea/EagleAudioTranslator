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

    // 等待DOM加载完成后再初始化插件
    function tryInitPlugin() {
        console.log('Eagle插件创建事件触发，准备初始化插件');

        // 检查DOM是否已加载
        if (document.readyState === 'loading') {
            console.log('DOM尚未加载完成，等待DOMContentLoaded事件');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM加载完成，开始初始化插件');
                performInitialization();
            });
        } else {
            console.log('DOM已加载完成，直接初始化插件');
            performInitialization();
        }
    }

    function performInitialization() {
        // 尝试初始化插件，如果失败则重试几次
        let attempts = 0;
        const maxAttempts = 5;

        function attemptInit() {
            attempts++;
            console.log(`尝试初始化插件 (第${attempts}次)`);

            if (typeof updateLoadingStatus === 'function') {
                updateLoadingStatus(`正在检查环境... (第${attempts}次尝试)`);
            }

            // 检查依赖项
            if (typeof initPlugin === 'function' && typeof checkDependencies === 'function' && checkDependencies()) {
                console.log('所有依赖项已就绪，开始初始化插件');
                if (typeof updateLoadingStatus === 'function') {
                    updateLoadingStatus('环境检查完成，开始初始化插件');
                }
                initPlugin();
                return true;
            } else {
                console.warn(`依赖项未就绪 (第${attempts}次尝试)`);

                // 检查缺失的依赖项
                const missingDeps = [];
                if (typeof initPlugin !== 'function') missingDeps.push('initPlugin');
                if (typeof checkDependencies !== 'function') missingDeps.push('checkDependencies');

                if (typeof updateLoadingStatus === 'function') {
                    updateLoadingStatus(`等待缺失的组件: ${missingDeps.join(', ')}`);
                }

                if (attempts < maxAttempts) {
                    // 等待一段时间后重试
                    setTimeout(attemptInit, 500 * attempts);
                } else {
                    console.error(`已尝试${maxAttempts}次初始化插件，但仍然失败`);
                    if (typeof showLoadingError === 'function') {
                        showLoadingError(`插件初始化失败，缺失组件: ${missingDeps.join(', ')}。请刷新页面或重启 Eagle 后重试。`);
                    }
                }
                return false;
            }
        }

        // 开始尝试初始化
        attemptInit();
    }

    // 开始初始化流程
    tryInitPlugin();
});

// 插件运行事件
eagle.onPluginRun(() => {
    console.log('eagle.onPluginRun');
});

// 插件显示事件
eagle.onPluginShow(() => {
    console.log('eagle.onPluginShow');

    // 插件显示时检查是否已初始化，如果没有则尝试初始化
    if (!window.pluginState || !window.pluginState.initialized) {
        console.log('插件显示时发现未初始化，尝试初始化');
        if (typeof initPlugin === 'function') {
            initPlugin();
        } else {
            console.warn('插件显示时initPlugin函数不可用');
        }
    } else {
        console.log('插件已初始化，无需重复初始化');
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