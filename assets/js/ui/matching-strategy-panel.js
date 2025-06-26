/**
 * 匹配策略配置面板
 * 提供用户界面，允许用户配置匹配策略
 */
class MatchingStrategyPanel {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = options;
        this.container = null;
        this.config = null;
        this.initialized = false;
    }

    /**
     * 初始化面板
     * @param {HTMLElement} container - 容器元素
     */
    initialize(container) {
        if (!container) {
            console.error('初始化匹配策略面板失败: 未提供容器元素');
            return false;
        }

        this.container = container;

        // 加载配置
        if (window.MatchingStrategyConfig) {
            this.config = window.MatchingStrategyConfig.loadFromLocalStorage();
        } else {
            console.error('初始化匹配策略面板失败: MatchingStrategyConfig类不可用');
            return false;
        }

        // 渲染面板
        this.render();

        // 添加事件监听器
        this.addEventListeners();

        this.initialized = true;
        console.log('匹配策略配置面板初始化成功');

        return true;
    }

    /**
     * 渲染面板
     */
    render() {
        if (!this.container || !this.config) return;

        // 清空容器
        this.container.innerHTML = '';

        // 创建面板标题
        const title = document.createElement('h3');
        title.textContent = '匹配策略配置';
        title.className = 'panel-title';
        this.container.appendChild(title);

        // 创建说明文本
        const description = document.createElement('p');
        description.textContent = '配置不同匹配方式的启用状态和优先级。优先级数字越小，越先尝试该匹配方式。';
        description.className = 'panel-description';
        this.container.appendChild(description);

        // 创建策略列表
        const strategiesList = document.createElement('div');
        strategiesList.className = 'strategies-list';
        this.container.appendChild(strategiesList);

        // 获取所有策略
        const strategies = this.config.getAllStrategies();

        // 按优先级排序
        const sortedStrategies = Object.entries(strategies)
            .sort((a, b) => a[1].priority - b[1].priority);

        // 渲染每个策略
        sortedStrategies.forEach(([key, strategy]) => {
            const strategyItem = this.createStrategyItem(key, strategy);
            strategiesList.appendChild(strategyItem);
        });

        // 创建操作按钮
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        this.container.appendChild(buttonContainer);

        // 重置按钮
        const resetButton = document.createElement('button');
        resetButton.textContent = '重置为默认配置';
        resetButton.className = 'reset-button';
        resetButton.dataset.action = 'reset';
        buttonContainer.appendChild(resetButton);
    }

    /**
     * 创建策略项
     * @param {string} key - 策略键名
     * @param {Object} strategy - 策略对象
     * @returns {HTMLElement} 策略项元素
     */
    createStrategyItem(key, strategy) {
        const item = document.createElement('div');
        item.className = 'strategy-item';
        item.dataset.key = key;

        // 创建标题和描述
        const header = document.createElement('div');
        header.className = 'strategy-header';
        item.appendChild(header);

        // 启用/禁用复选框
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.checked = strategy.enabled;
        enabledCheckbox.className = 'strategy-enabled';
        enabledCheckbox.dataset.action = 'toggle';
        enabledCheckbox.dataset.key = key;
        header.appendChild(enabledCheckbox);

        // 策略名称
        const title = document.createElement('span');
        title.textContent = this.getStrategyDisplayName(key);
        title.className = 'strategy-title';
        header.appendChild(title);

        // 优先级输入
        const priorityContainer = document.createElement('div');
        priorityContainer.className = 'priority-container';
        header.appendChild(priorityContainer);

        const priorityLabel = document.createElement('span');
        priorityLabel.textContent = '优先级:';
        priorityLabel.className = 'priority-label';
        priorityContainer.appendChild(priorityLabel);

        const priorityInput = document.createElement('input');
        priorityInput.type = 'number';
        priorityInput.min = '1';
        priorityInput.max = '10';
        priorityInput.value = strategy.priority;
        priorityInput.className = 'priority-input';
        priorityInput.dataset.action = 'priority';
        priorityInput.dataset.key = key;
        priorityContainer.appendChild(priorityInput);

        // 描述
        const description = document.createElement('div');
        description.textContent = strategy.description || '';
        description.className = 'strategy-description';
        item.appendChild(description);

        // 阈值设置
        const thresholdContainer = document.createElement('div');
        thresholdContainer.className = 'threshold-container';
        item.appendChild(thresholdContainer);

        const thresholdLabel = document.createElement('span');
        thresholdLabel.textContent = '匹配阈值:';
        thresholdLabel.className = 'threshold-label';
        thresholdContainer.appendChild(thresholdLabel);

        const thresholdInput = document.createElement('input');
        thresholdInput.type = 'number';
        thresholdInput.step = key === 'bilingualTextMatch' ? '10' : '0.1';
        thresholdInput.min = key === 'bilingualTextMatch' ? '0' : '0';
        thresholdInput.max = key === 'bilingualTextMatch' ? '1000' : '1';
        thresholdInput.value = strategy.threshold;
        thresholdInput.className = 'threshold-input';
        thresholdInput.dataset.action = 'threshold';
        thresholdInput.dataset.key = key;
        thresholdContainer.appendChild(thresholdInput);

        // 添加特定策略的额外参数
        if (key === 'bilingualTextMatch') {
            // 原始文本权重
            const originalWeightContainer = document.createElement('div');
            originalWeightContainer.className = 'param-container';
            item.appendChild(originalWeightContainer);

            const originalWeightLabel = document.createElement('span');
            originalWeightLabel.textContent = '原始文本权重:';
            originalWeightLabel.className = 'param-label';
            originalWeightContainer.appendChild(originalWeightLabel);

            const originalWeightInput = document.createElement('input');
            originalWeightInput.type = 'number';
            originalWeightInput.step = '0.1';
            originalWeightInput.min = '0';
            originalWeightInput.max = '10';
            originalWeightInput.value = strategy.originalWeight || 2.0;
            originalWeightInput.className = 'param-input';
            originalWeightInput.dataset.action = 'param';
            originalWeightInput.dataset.key = key;
            originalWeightInput.dataset.param = 'originalWeight';
            originalWeightContainer.appendChild(originalWeightInput);

            // 翻译文本权重
            const translatedWeightContainer = document.createElement('div');
            translatedWeightContainer.className = 'param-container';
            item.appendChild(translatedWeightContainer);

            const translatedWeightLabel = document.createElement('span');
            translatedWeightLabel.textContent = '翻译文本权重:';
            translatedWeightLabel.className = 'param-label';
            translatedWeightContainer.appendChild(translatedWeightLabel);

            const translatedWeightInput = document.createElement('input');
            translatedWeightInput.type = 'number';
            translatedWeightInput.step = '0.1';
            translatedWeightInput.min = '0';
            translatedWeightInput.max = '10';
            translatedWeightInput.value = strategy.translatedWeight || 2.0;
            translatedWeightInput.className = 'param-input';
            translatedWeightInput.dataset.action = 'param';
            translatedWeightInput.dataset.key = key;
            translatedWeightInput.dataset.param = 'translatedWeight';
            translatedWeightContainer.appendChild(translatedWeightInput);
        } else if (key === 'semanticMatch') {
            // Fuse权重
            const fuseWeightContainer = document.createElement('div');
            fuseWeightContainer.className = 'param-container';
            item.appendChild(fuseWeightContainer);

            const fuseWeightLabel = document.createElement('span');
            fuseWeightLabel.textContent = 'Fuse.js权重:';
            fuseWeightLabel.className = 'param-label';
            fuseWeightContainer.appendChild(fuseWeightLabel);

            const fuseWeightInput = document.createElement('input');
            fuseWeightInput.type = 'number';
            fuseWeightInput.step = '0.1';
            fuseWeightInput.min = '0';
            fuseWeightInput.max = '1';
            fuseWeightInput.value = strategy.fuseWeight || 0.4;
            fuseWeightInput.className = 'param-input';
            fuseWeightInput.dataset.action = 'param';
            fuseWeightInput.dataset.key = key;
            fuseWeightInput.dataset.param = 'fuseWeight';
            fuseWeightContainer.appendChild(fuseWeightInput);

            // 语义权重
            const semanticWeightContainer = document.createElement('div');
            semanticWeightContainer.className = 'param-container';
            item.appendChild(semanticWeightContainer);

            const semanticWeightLabel = document.createElement('span');
            semanticWeightLabel.textContent = '语义权重:';
            semanticWeightLabel.className = 'param-label';
            semanticWeightContainer.appendChild(semanticWeightLabel);

            const semanticWeightInput = document.createElement('input');
            semanticWeightInput.type = 'number';
            semanticWeightInput.step = '0.1';
            semanticWeightInput.min = '0';
            semanticWeightInput.max = '1';
            semanticWeightInput.value = strategy.semanticWeight || 0.6;
            semanticWeightInput.className = 'param-input';
            semanticWeightInput.dataset.action = 'param';
            semanticWeightInput.dataset.key = key;
            semanticWeightInput.dataset.param = 'semanticWeight';
            semanticWeightContainer.appendChild(semanticWeightInput);
        }

        return item;
    }

    /**
     * 获取策略显示名称
     * @param {string} key - 策略键名
     * @returns {string} 显示名称
     */
    getStrategyDisplayName(key) {
        const displayNames = {
            bilingualTextMatch: '双语匹配 (中英文结合)',
            enhancedTextMatch: '基于词性系统的匹配',
            originalTextMatch: '翻译文本直接匹配',
            nounDirectMatch: '单词级直接匹配'
        };

        return displayNames[key] || key;
    }

    /**
     * 添加事件监听器
     */
    addEventListeners() {
        if (!this.container) return;

        // 使用事件委托处理所有点击事件
        this.container.addEventListener('click', (event) => {
            const target = event.target;
            const action = target.dataset.action;
            const key = target.dataset.key;

            if (!action) return;

            switch (action) {
                case 'toggle':
                    if (key) {
                        this.toggleStrategy(key, target.checked);
                    }
                    break;
                case 'reset':
                    this.resetConfig();
                    break;
            }
        });

        // 处理输入变化事件
        this.container.addEventListener('change', (event) => {
            const target = event.target;
            const action = target.dataset.action;
            const key = target.dataset.key;

            if (!action || !key) return;

            switch (action) {
                case 'priority':
                    this.setPriority(key, parseInt(target.value, 10));
                    break;
                case 'threshold':
                    this.setThreshold(key, parseFloat(target.value));
                    break;
                case 'param':
                    const param = target.dataset.param;
                    if (param) {
                        this.setParam(key, param, parseFloat(target.value));
                    }
                    break;
            }
        });
    }

    /**
     * 切换策略启用状态
     * @param {string} key - 策略键名
     * @param {boolean} enabled - 是否启用
     */
    toggleStrategy(key, enabled) {
        if (this.config.setStrategyEnabled(key, enabled)) {
            console.log(`${enabled ? '启用' : '禁用'}匹配策略: ${this.getStrategyDisplayName(key)}`);

            // 更新全局状态
            if (window.pluginState) {
                window.pluginState.matchingStrategyConfig = this.config;

                // 如果有FuseMatcher实例，也更新它的配置
                if (window.pluginState.fuseMatcher) {
                    window.pluginState.fuseMatcher.matchingStrategyConfig = this.config;
                }

                // 如果有CSVMatcher实例，也更新它的配置
                if (window.pluginState.csvMatcher) {
                    window.pluginState.csvMatcher.matchingStrategyConfig = this.config;
                }
            }

            // 记录详细日志，帮助调试
            console.log(`匹配策略 "${key}" 已${enabled ? '启用' : '禁用'}，当前启用的策略:`,
                this.config.getEnabledStrategies().map(s => s.key).join(', '));
        }
    }

    /**
     * 设置策略优先级
     * @param {string} key - 策略键名
     * @param {number} priority - 优先级
     */
    setPriority(key, priority) {
        if (isNaN(priority) || priority < 1) {
            console.warn('无效的优先级值:', priority);
            return;
        }

        if (this.config.setStrategyPriority(key, priority)) {
            console.log(`设置匹配策略优先级: ${this.getStrategyDisplayName(key)} = ${priority}`);

            // 更新全局状态
            if (window.pluginState) {
                window.pluginState.matchingStrategyConfig = this.config;

                // 如果有FuseMatcher实例，也更新它的配置
                if (window.pluginState.fuseMatcher) {
                    window.pluginState.fuseMatcher.matchingStrategyConfig = this.config;
                }

                // 如果有CSVMatcher实例，也更新它的配置
                if (window.pluginState.csvMatcher) {
                    window.pluginState.csvMatcher.matchingStrategyConfig = this.config;
                }
            }

            // 记录详细日志，帮助调试
            console.log(`匹配策略 "${key}" 优先级已更新为 ${priority}，当前策略顺序:`,
                this.config.getEnabledStrategies().map(s => `${s.key}(${s.priority})`).join(', '));

            // 重新渲染以反映优先级变化
            this.render();
        }
    }

    /**
     * 设置策略阈值
     * @param {string} key - 策略键名
     * @param {number} threshold - 阈值
     */
    setThreshold(key, threshold) {
        if (isNaN(threshold)) {
            console.warn('无效的阈值:', threshold);
            return;
        }

        if (this.config.setStrategyThreshold(key, threshold)) {
            console.log(`设置匹配策略阈值: ${this.getStrategyDisplayName(key)} = ${threshold}`);

            // 更新全局状态
            if (window.pluginState) {
                window.pluginState.matchingStrategyConfig = this.config;

                // 如果有FuseMatcher实例，也更新它的配置
                if (window.pluginState.fuseMatcher) {
                    window.pluginState.fuseMatcher.matchingStrategyConfig = this.config;
                }

                // 如果有CSVMatcher实例，也更新它的配置
                if (window.pluginState.csvMatcher) {
                    window.pluginState.csvMatcher.matchingStrategyConfig = this.config;
                }
            }

            // 记录详细日志，帮助调试
            console.log(`匹配策略 "${key}" 阈值已更新为 ${threshold}`);
        }
    }

    /**
     * 设置策略参数
     * @param {string} key - 策略键名
     * @param {string} param - 参数名
     * @param {any} value - 参数值
     */
    setParam(key, param, value) {
        if (isNaN(value)) {
            console.warn('无效的参数值:', value);
            return;
        }

        if (this.config.setStrategyParam(key, param, value)) {
            console.log(`设置匹配策略参数: ${this.getStrategyDisplayName(key)}.${param} = ${value}`);

            // 更新全局状态
            if (window.pluginState) {
                window.pluginState.matchingStrategyConfig = this.config;

                // 如果有FuseMatcher实例，也更新它的配置
                if (window.pluginState.fuseMatcher) {
                    window.pluginState.fuseMatcher.matchingStrategyConfig = this.config;
                }

                // 如果有CSVMatcher实例，也更新它的配置
                if (window.pluginState.csvMatcher) {
                    window.pluginState.csvMatcher.matchingStrategyConfig = this.config;
                }
            }

            // 记录详细日志，帮助调试
            console.log(`匹配策略 "${key}" 参数 "${param}" 已更新为 ${value}`);
        }
    }

    /**
     * 重置配置
     */
    resetConfig() {
        if (confirm('确定要重置为默认配置吗？这将丢失所有自定义设置。')) {
            if (this.config.resetToDefaults()) {
                console.log('已重置为默认配置');

                // 更新全局状态
                if (window.pluginState) {
                    window.pluginState.matchingStrategyConfig = this.config;

                    // 如果有FuseMatcher实例，也更新它的配置
                    if (window.pluginState.fuseMatcher) {
                        window.pluginState.fuseMatcher.matchingStrategyConfig = this.config;
                    }

                    // 如果有CSVMatcher实例，也更新它的配置
                    if (window.pluginState.csvMatcher) {
                        window.pluginState.csvMatcher.matchingStrategyConfig = this.config;
                    }
                }

                // 记录详细日志，帮助调试
                console.log('匹配策略已重置为默认配置，当前启用的策略:',
                    this.config.getEnabledStrategies().map(s => s.key).join(', '));

                // 重新渲染
                this.render();
            }
        }
    }
}

// 导出类
window.MatchingStrategyPanel = MatchingStrategyPanel;
