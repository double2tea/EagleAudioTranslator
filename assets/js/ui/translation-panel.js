/**
 * 翻译面板
 * 用于管理翻译设置
 */
class TranslationPanel {
    /**
     * 构造函数
     * @param {TranslationService} translationService - 翻译服务实例
     */
    constructor(translationService) {
        this.translationService = translationService;
        this.settings = {
            provider: 'google',
            sourceLanguage: 'en',
            targetLanguage: 'zh',
            useCache: true,
            useCSV: true,
            standardizeEnglish: false,
            namingStyle: 'none',
            customSeparator: '_'
        };

        // 初始化事件监听器
        this._initEventListeners();

        // 加载初始设置
        this._loadSettings();
    }

    /**
     * 初始化事件监听器
     * @private
     */
    _initEventListeners() {
        // 翻译提供者选择
        const providerSelect = document.getElementById('translationProvider');
        if (providerSelect) {
            providerSelect.addEventListener('change', () => {
                this.settings.provider = providerSelect.value;
                this._saveSettings();
                this.translationService.setActiveProvider(providerSelect.value);
            });
        }

        // 源语言选择
        const sourceLanguageSelect = document.getElementById('sourceLanguage');
        if (sourceLanguageSelect) {
            sourceLanguageSelect.addEventListener('change', () => {
                this.settings.sourceLanguage = sourceLanguageSelect.value;
                this._saveSettings();
                this.translationService.setSettings({ sourceLanguage: sourceLanguageSelect.value });
            });
        }

        // 目标语言选择
        const targetLanguageSelect = document.getElementById('targetLanguage');
        if (targetLanguageSelect) {
            targetLanguageSelect.addEventListener('change', () => {
                this.settings.targetLanguage = targetLanguageSelect.value;
                this._saveSettings();
                this.translationService.setSettings({ targetLanguage: targetLanguageSelect.value });
            });
        }

        // 使用缓存开关
        const useCacheCheckbox = document.getElementById('useCache');
        if (useCacheCheckbox) {
            useCacheCheckbox.addEventListener('change', () => {
                this.settings.useCache = useCacheCheckbox.checked;
                this._saveSettings();
                this.translationService.setSettings({ useCache: useCacheCheckbox.checked });
            });
        }

        // 使用CSV术语库开关
        const useCSVCheckbox = document.getElementById('useCSV');
        if (useCSVCheckbox) {
            useCSVCheckbox.addEventListener('change', () => {
                this.settings.useCSV = useCSVCheckbox.checked;
                this._saveSettings();
            });
        }

        // 英文标准化开关
        const standardizeEnglishCheckbox = document.getElementById('standardizeEnglish');
        if (standardizeEnglishCheckbox) {
            standardizeEnglishCheckbox.addEventListener('change', () => {
                this.settings.standardizeEnglish = standardizeEnglishCheckbox.checked;
                this._saveSettings();
                this.translationService.setStandardizeEnglish(standardizeEnglishCheckbox.checked);

                // 如果启用了标准化，显示命名风格选项
                const namingStyleContainer = document.getElementById('namingStyleContainer');
                if (namingStyleContainer) {
                    namingStyleContainer.style.display = standardizeEnglishCheckbox.checked ? 'block' : 'none';
                }
            });
        }

        // 命名风格选择
        const namingStyleSelect = document.getElementById('namingStyle');
        if (namingStyleSelect) {
            namingStyleSelect.addEventListener('change', () => {
                this.settings.namingStyle = namingStyleSelect.value;
                this._saveSettings();
                this.translationService.setNamingStyle(namingStyleSelect.value);

                // 如果选择了自定义分隔符，显示自定义分隔符输入框
                const customSeparatorContainer = document.getElementById('customSeparatorContainer');
                if (customSeparatorContainer) {
                    customSeparatorContainer.style.display = namingStyleSelect.value === 'custom' ? 'block' : 'none';
                }
            });
        }

        // 自定义分隔符输入
        const customSeparatorInput = document.getElementById('customSeparator');
        if (customSeparatorInput) {
            customSeparatorInput.addEventListener('input', () => {
                this.settings.customSeparator = customSeparatorInput.value;
                this._saveSettings();
                this.translationService.setCustomSeparator(customSeparatorInput.value);
            });
        }
    }

    /**
     * 加载设置
     * @private
     */
    _loadSettings() {
        try {
            // 尝试从本地存储加载设置
            const savedSettings = localStorage.getItem('translation-settings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
            }

            // 更新UI
            this._updateUI();

            // 更新翻译服务设置
            this.translationService.setSettings(this.settings);

            Logger.info('已加载翻译设置', this.settings);
        } catch (error) {
            Logger.error('加载翻译设置失败', error);
        }
    }

    /**
     * 保存设置
     * @private
     */
    _saveSettings() {
        try {
            localStorage.setItem('translation-settings', JSON.stringify(this.settings));
            Logger.info('已保存翻译设置', this.settings);
        } catch (error) {
            Logger.error('保存翻译设置失败', error);
        }
    }

    /**
     * 更新UI
     * @private
     */
    _updateUI() {
        // 更新翻译提供者选择
        const providerSelect = document.getElementById('translationProvider');
        if (providerSelect && this.settings.provider) {
            providerSelect.value = this.settings.provider;
        }

        // 更新源语言选择
        const sourceLanguageSelect = document.getElementById('sourceLanguage');
        if (sourceLanguageSelect && this.settings.sourceLanguage) {
            sourceLanguageSelect.value = this.settings.sourceLanguage;
        }

        // 更新目标语言选择
        const targetLanguageSelect = document.getElementById('targetLanguage');
        if (targetLanguageSelect && this.settings.targetLanguage) {
            targetLanguageSelect.value = this.settings.targetLanguage;
        }

        // 更新使用缓存开关
        const useCacheCheckbox = document.getElementById('useCache');
        if (useCacheCheckbox) {
            useCacheCheckbox.checked = this.settings.useCache;
        }

        // 更新使用CSV术语库开关
        const useCSVCheckbox = document.getElementById('useCSV');
        if (useCSVCheckbox) {
            useCSVCheckbox.checked = this.settings.useCSV;
        }

        // 更新英文标准化开关
        const standardizeEnglishCheckbox = document.getElementById('standardizeEnglish');
        if (standardizeEnglishCheckbox) {
            standardizeEnglishCheckbox.checked = this.settings.standardizeEnglish;

            // 显示或隐藏命名风格选项
            const namingStyleContainer = document.getElementById('namingStyleContainer');
            if (namingStyleContainer) {
                namingStyleContainer.style.display = this.settings.standardizeEnglish ? 'block' : 'none';
            }
        }

        // 更新命名风格选择
        const namingStyleSelect = document.getElementById('namingStyle');
        if (namingStyleSelect) {
            namingStyleSelect.value = this.settings.namingStyle;

            // 显示或隐藏自定义分隔符输入框
            const customSeparatorContainer = document.getElementById('customSeparatorContainer');
            if (customSeparatorContainer) {
                customSeparatorContainer.style.display = this.settings.namingStyle === 'custom' ? 'block' : 'none';
            }
        }

        // 更新自定义分隔符输入
        const customSeparatorInput = document.getElementById('customSeparator');
        if (customSeparatorInput) {
            customSeparatorInput.value = this.settings.customSeparator;
        }
    }

    /**
     * 获取翻译设置
     * @returns {Object} 翻译设置
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * 设置翻译设置
     * @param {Object} settings - 翻译设置
     */
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this._updateUI();
        this._saveSettings();
        this.translationService.setSettings(this.settings);
    }

    /**
     * 清除翻译缓存
     */
    clearCache() {
        this.translationService.clearCache();
        alert('翻译缓存已清除');
    }
}

// 导出TranslationPanel
window.TranslationPanel = TranslationPanel;