/**
 * 匹配策略配置类
 * 管理不同匹配方式的启用状态和优先级
 */
class MatchingStrategyConfig {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        // 匹配策略配置 - AI分类在更早阶段处理，不在此配置中
        this.strategies = {
            // 1. 双语文本匹配 (对中文文件至关重要)
            bilingualTextMatch: {
                enabled: true,
                priority: 1,
                threshold: 50,
                originalWeight: 3.5,  // 提高原始语言权重
                translatedWeight: 1.0,
                description: '双语文本匹配 - 同时使用原始文本和翻译文本进行匹配'
            },
            // 2. 增强搜索文本匹配 (词性分析匹配)
            enhancedTextMatch: {
                enabled: true,
                priority: 2,
                threshold: 0.2,
                description: '增强搜索文本匹配 - 使用词性分析结果增强搜索文本'
            },
            // 3. 原始文本完整匹配
            originalTextMatch: {
                enabled: true,
                priority: 2, // 与增强搜索同级
                threshold: 0.2,
                description: '原始文本完整匹配 - 使用完整的文件名进行匹配'
            },

            // 5. 单词级直接匹配 (保留但优先级较低)
            nounDirectMatch: {
                enabled: false, // 默认关闭，因为其他策略已经足够
                priority: 9,
                threshold: 0.1,
                description: '单词级直接匹配 - 从文件名中提取单个名词进行匹配'
            }
        };

        // 合并用户选项
        if (options.strategies) {
            for (const [key, value] of Object.entries(options.strategies)) {
                if (this.strategies[key]) {
                    this.strategies[key] = { ...this.strategies[key], ...value };
                }
            }
        }

        // 存储到本地存储
        this.saveToLocalStorage();
    }

    /**
     * 获取启用的匹配策略，按优先级排序
     * @returns {Array} 启用的匹配策略数组
     */
    getEnabledStrategies() {
        return Object.entries(this.strategies)
            .filter(([_, strategy]) => strategy.enabled)
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([key, strategy]) => ({ key, ...strategy }));
    }

    /**
     * 获取所有匹配策略
     * @returns {Object} 所有匹配策略
     */
    getAllStrategies() {
        return this.strategies;
    }

    /**
     * 启用或禁用匹配策略
     * @param {string} strategyKey - 策略键名
     * @param {boolean} enabled - 是否启用
     */
    setStrategyEnabled(strategyKey, enabled) {
        if (this.strategies[strategyKey]) {
            this.strategies[strategyKey].enabled = !!enabled;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * 设置匹配策略优先级
     * @param {string} strategyKey - 策略键名
     * @param {number} priority - 优先级（数字越小优先级越高）
     */
    setStrategyPriority(strategyKey, priority) {
        if (this.strategies[strategyKey]) {
            this.strategies[strategyKey].priority = priority;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * 设置匹配策略阈值
     * @param {string} strategyKey - 策略键名
     * @param {number} threshold - 阈值
     */
    setStrategyThreshold(strategyKey, threshold) {
        if (this.strategies[strategyKey]) {
            this.strategies[strategyKey].threshold = threshold;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * 设置匹配策略参数
     * @param {string} strategyKey - 策略键名
     * @param {string} paramKey - 参数键名
     * @param {any} value - 参数值
     */
    setStrategyParam(strategyKey, paramKey, value) {
        if (this.strategies[strategyKey]) {
            this.strategies[strategyKey][paramKey] = value;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * 重置为默认配置
     */
    resetToDefaults() {
        this.constructor();
        return true;
    }

    /**
     * 保存配置到本地存储
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('matching-strategy-config', JSON.stringify(this.strategies));
            return true;
        } catch (error) {
            console.error('保存匹配策略配置失败:', error);
            return false;
        }
    }

    /**
     * 从本地存储加载配置
     * @returns {MatchingStrategyConfig} 配置实例
     */
    static loadFromLocalStorage() {
        try {
            const savedConfig = localStorage.getItem('matching-strategy-config');
            if (savedConfig) {
                return new MatchingStrategyConfig({ strategies: JSON.parse(savedConfig) });
            }
        } catch (error) {
            console.error('加载匹配策略配置失败:', error);
        }
        return new MatchingStrategyConfig();
    }
}

// 导出类
window.MatchingStrategyConfig = MatchingStrategyConfig;
