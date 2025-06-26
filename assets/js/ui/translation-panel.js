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
            provider: 'zhipu',
            sourceLanguage: 'en',
            targetLanguage: 'zh',
            useCache: true,
            useCSV: true,
            standardizeEnglish: false,
            namingStyle: 'none',
            customSeparator: '_',
            matchStrategy: 'auto',  // 确保默认值为'auto'
            useAIClassification: false,
            charLimitEn: 30,  // 英文字符限制默认值
            charLimitZh: 7,   // 中文字符限制默认值
            apiKeys: {},      // 初始化API密钥对象
            bailianModel: 'qwen-max' // 初始化百炼模型
        };

        // 初始化事件监听器
        this._initEventListeners();

        // 加载初始设置
        this._loadSettings();

        // 确保设置被正确应用
        this._ensureSettingsApplied();
    }

    /**
     * 确保设置被正确应用
     * @private
     */
    _ensureSettingsApplied() {
        // 确保API密钥对象存在
        if (!this.settings.apiKeys) {
            this.settings.apiKeys = {};
            this._saveSettings();
        }

        // 确保百炼模型设置存在
        if (!this.settings.bailianModel) {
            this.settings.bailianModel = 'qwen-max';
            this._saveSettings();
        }

        // 确保设置被应用到翻译服务
        this.translationService.setSettings(this.settings);

        // 如果当前提供者是百炼，确保百炼模型被设置
        if (this.settings.provider === 'bailian') {
            this.translationService.setBailianModel(this.settings.bailianModel);

            // 如果有API密钥，确保它被设置
            if (this.settings.apiKeys.bailian) {
                this.translationService.setAPIKey('bailian', this.settings.apiKeys.bailian);
                Logger.info(`已设置bailianAPI密钥: ${this.settings.apiKeys.bailian ? '******' : '(空)'}`);
            }
        }
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
                const providerId = providerSelect.value;
                this.settings.provider = providerId;
                this._saveSettings();
                this.translationService.setActiveProvider(providerId);

                // 显示当前提供者的设置面板
                this._showProviderSettings(providerId);

                // 切换提供者后初始化该提供者的设置
                this._initProviderSettings(providerId);

                console.log(`已切换到翻译提供者: ${providerId}`);
            });
        }

        // 字符限制设置
        const charLimitEnInput = document.getElementById('charLimitEn');
        if (charLimitEnInput) {
            charLimitEnInput.addEventListener('change', () => {
                const value = parseInt(charLimitEnInput.value);
                if (!isNaN(value) && value > 0) {
                    this.settings.charLimitEn = value;
                    this._saveSettings();

                    // 更新提示词模板中的字符限制
                    if (this.translationService.getActiveProvider() &&
                        this.translationService.getActiveProvider().promptTemplates) {
                        this.translationService.getActiveProvider().promptTemplates.setDefaultCharLimit('en', value);
                    }
                }
            });
        }

        const charLimitZhInput = document.getElementById('charLimitZh');
        if (charLimitZhInput) {
            charLimitZhInput.addEventListener('change', () => {
                const value = parseInt(charLimitZhInput.value);
                if (!isNaN(value) && value > 0) {
                    this.settings.charLimitZh = value;
                    this._saveSettings();

                    // 更新提示词模板中的字符限制
                    if (this.translationService.getActiveProvider() &&
                        this.translationService.getActiveProvider().promptTemplates) {
                        this.translationService.getActiveProvider().promptTemplates.setDefaultCharLimit('zh', value);
                    }
                }
            });
        }

        // 初始化所有提供者的设置
        this._initAllProviderSettings();

        // 查看提示词按钮
        const viewPromptBtns = document.querySelectorAll('.viewPromptBtn');
        viewPromptBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this._showPromptPreview();
            });
        });

        // 关闭按钮
        const closeBtn = document.querySelector('#promptPreviewModal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('promptPreviewModal').style.display = 'none';
            });
        }

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('promptPreviewModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

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

        // AI辅助分类开关
        const useAIClassificationCheckbox = document.getElementById('useAIClassification');
        if (useAIClassificationCheckbox) {
            useAIClassificationCheckbox.addEventListener('change', () => {
                this.settings.useAIClassification = useAIClassificationCheckbox.checked;
                this._saveSettings();

                // 如果启用了AI辅助分类，更新到分类器
                if (window.pluginState && window.pluginState.smartClassifier) {
                    try {
                        window.pluginState.smartClassifier.classificationSettings.useAIClassification =
                            useAIClassificationCheckbox.checked;
                        console.log('已更新AI辅助分类设置:', useAIClassificationCheckbox.checked);
                    } catch (error) {
                        console.error('更新AI辅助分类设置失败:', error);
                    }
                }
            });
        }

        // 匹配策略选择
        const matchStrategySelect = document.getElementById('matchStrategy');
        if (matchStrategySelect) {
            matchStrategySelect.addEventListener('change', () => {
                this.settings.matchStrategy = matchStrategySelect.value;
                this._saveSettings();

                // 更新到分类器
                if (window.pluginState && window.pluginState.smartClassifier) {
                    try {
                        window.pluginState.smartClassifier.classificationSettings.defaultMatchStrategy =
                            matchStrategySelect.value;
                        console.log('已更新匹配策略设置:', matchStrategySelect.value);
                    } catch (error) {
                        console.error('更新匹配策略设置失败:', error);
                    }
                }
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

                // 同步命名风格设置到命名规则引擎
                try {
                    if (window.pluginState && window.pluginState.namingRules) {
                        window.pluginState.namingRules.setSettings({
                            namingStyle: namingStyleSelect.value
                        });
                        console.log('已同步命名风格设置到命名规则引擎:', namingStyleSelect.value);
                        // 更新命名预览
                        if (typeof updateNamingPreview === 'function') {
                            updateNamingPreview();
                        }
                    }
                } catch (error) {
                    console.error('同步命名风格设置失败:', error);
                }

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

                // 同步自定义分隔符设置到命名规则引擎
                try {
                    if (window.pluginState && window.pluginState.namingRules) {
                        window.pluginState.namingRules.setSettings({
                            customSeparator: customSeparatorInput.value
                        });
                        console.log('已同步自定义分隔符设置到命名规则引擎:', customSeparatorInput.value);
                        // 更新命名预览
                        if (typeof updateNamingPreview === 'function') {
                            updateNamingPreview();
                        }
                    }
                } catch (error) {
                    console.error('同步自定义分隔符设置失败:', error);
                }
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

            // 同步命名风格设置到命名规则引擎
            try {
                if (window.pluginState && window.pluginState.namingRules) {
                    window.pluginState.namingRules.setSettings({
                        namingStyle: this.settings.namingStyle || 'none',
                        customSeparator: this.settings.customSeparator || '_'
                    });
                    console.log('加载设置时同步命名风格到命名规则引擎:', this.settings.namingStyle);
                    // 更新命名预览
                    if (typeof updateNamingPreview === 'function') {
                        updateNamingPreview();
                    }
                }
            } catch (error) {
                console.error('加载设置时同步命名风格失败:', error);
            }

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
            // 确保设置对象中包含所有必要的字段
            if (!this.settings.apiKeys) {
                this.settings.apiKeys = {};
            }

            // 确保百炼模型设置存在
            if (!this.settings.bailianModel) {
                this.settings.bailianModel = 'qwen-max';
            }

            // 保存到本地存储
            localStorage.setItem('translation-settings', JSON.stringify(this.settings));

            // 同步设置到翻译服务
            this.translationService.setSettings(this.settings);

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
        if (providerSelect) {
            // 确保有默认提供者
            if (!this.settings.provider) {
                this.settings.provider = 'zhipu';
            }

            // 设置下拉菜单的值
            providerSelect.value = this.settings.provider;

            // 显示当前提供者的设置面板
            this._showProviderSettings(this.settings.provider);

            console.log(`初始化翻译提供者: ${this.settings.provider}`);
        }

        // 初始化所有提供者的设置
        this._initAllProviderSettings();

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

        // 更新AI辅助分类开关
        const useAIClassificationCheckbox = document.getElementById('useAIClassification');
        if (useAIClassificationCheckbox) {
            useAIClassificationCheckbox.checked = this.settings.useAIClassification;
        }

        // 更新匹配策略选择
        const matchStrategySelect = document.getElementById('matchStrategy');
        if (matchStrategySelect) {
            // 如果没有保存的匹配策略或者值为'aliyun'，则使用'auto'作为默认值
            if (!this.settings.matchStrategy || this.settings.matchStrategy === 'aliyun') {
                this.settings.matchStrategy = 'auto';
            }

            // 设置下拉菜单的值
            matchStrategySelect.value = this.settings.matchStrategy;

            // 同步到智能分类器
            if (window.pluginState && window.pluginState.smartClassifier) {
                try {
                    window.pluginState.smartClassifier.classificationSettings.defaultMatchStrategy = this.settings.matchStrategy;
                    console.log('已设置默认匹配策略为:', this.settings.matchStrategy);
                } catch (error) {
                    console.error('设置默认匹配策略失败:', error);
                }
            }
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

        // 更新字符限制设置
        const charLimitEnInput = document.getElementById('charLimitEn');
        if (charLimitEnInput && this.settings.charLimitEn) {
            charLimitEnInput.value = this.settings.charLimitEn;
        }

        const charLimitZhInput = document.getElementById('charLimitZh');
        if (charLimitZhInput && this.settings.charLimitZh) {
            charLimitZhInput.value = this.settings.charLimitZh;
        }

        // 更新所有提供者的提示词模板中的字符限制
        if (this.translationService) {
            const providers = this.translationService.getProviders();
            providers.forEach(provider => {
                if (provider.promptTemplates) {
                    if (this.settings.charLimitEn) {
                        provider.promptTemplates.setDefaultCharLimit('en', this.settings.charLimitEn);
                    }
                    if (this.settings.charLimitZh) {
                        provider.promptTemplates.setDefaultCharLimit('zh', this.settings.charLimitZh);
                    }
                }
            });
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

    /**
     * 初始化所有提供者的设置
     * @private
     */
    _initAllProviderSettings() {
        // 获取所有提供者
        const providers = this.translationService.getProviders();

        // 为每个提供者初始化设置
        providers.forEach(provider => {
            this._initProviderSettings(provider.getId());
        });
    }

    /**
     * 显示指定提供者的设置面板
     * @param {string} providerId - 提供者ID
     * @private
     */
    _showProviderSettings(providerId) {
        // 隐藏所有提供者设置面板
        const allSettings = document.querySelectorAll('.api-settings');
        allSettings.forEach(panel => {
            panel.style.display = 'none';
        });

        // 显示当前提供者的设置面板
        const currentSettings = document.getElementById(`${providerId}Settings`);
        if (currentSettings) {
            currentSettings.style.display = 'block';
            console.log(`显示${providerId}设置面板`);
        } else {
            console.error(`未找到${providerId}设置面板`);
        }
    }

    /**
     * 初始化指定提供者的设置
     * @param {string} providerId - 提供者ID
     * @private
     */
    _initProviderSettings(providerId) {
        // 初始化提示词ID选择
        const customPromptSelect = document.querySelector(`#${providerId}PromptID`);
        if (customPromptSelect) {
            // 设置初始值
            if (this.settings.customPrompt) {
                customPromptSelect.value = this.settings.customPrompt;
            }

            // 添加事件监听器
            customPromptSelect.addEventListener('change', () => {
                this.settings.customPrompt = customPromptSelect.value;
                this._saveSettings();
                this.translationService.setCustomPrompt(customPromptSelect.value);

                // 显示或隐藏自定义提示模板输入框
                const customPromptContainer = document.querySelector(`#${providerId}CustomPromptContainer`);
                if (customPromptContainer) {
                    customPromptContainer.style.display = customPromptSelect.value === 'custom' ? 'block' : 'none';
                }
            });
        }

        // 初始化自定义提示模板
        const promptTemplateTextarea = document.querySelector(`#${providerId}PromptTemplate`);
        if (promptTemplateTextarea) {
            // 设置初始值
            if (this.settings.promptTemplate) {
                promptTemplateTextarea.value = this.settings.promptTemplate;
            }

            // 添加事件监听器
            promptTemplateTextarea.addEventListener('input', () => {
                this.settings.promptTemplate = promptTemplateTextarea.value;
                this._saveSettings();
                this.translationService.setPromptTemplate(promptTemplateTextarea.value);
            });
        }

        // 初始化API密钥输入
        const apiKeyInput = document.querySelector(`#${providerId}Key`);
        if (apiKeyInput) {
            // 如果有保存的API密钥，设置输入框的值
            if (this.settings.apiKeys && this.settings.apiKeys[providerId]) {
                apiKeyInput.value = this.settings.apiKeys[providerId];
            }

            // 添加事件监听器
            apiKeyInput.addEventListener('input', () => {
                if (!this.settings.apiKeys) {
                    this.settings.apiKeys = {};
                }
                this.settings.apiKeys[providerId] = apiKeyInput.value;
                this._saveSettings();
                this.translationService.setAPIKey(providerId, apiKeyInput.value);
            });
        }

        // 初始化模型选择
        if (providerId === 'zhipu') {
            const zhipuModelSelect = document.querySelector('#zhipuModel');
            if (zhipuModelSelect && this.settings.zhipuModel) {
                zhipuModelSelect.value = this.settings.zhipuModel;

                zhipuModelSelect.addEventListener('change', () => {
                    this.settings.zhipuModel = zhipuModelSelect.value;
                    this._saveSettings();
                    this.translationService.setZhipuModel(zhipuModelSelect.value);
                });
            }
        } else if (providerId === 'openrouter') {
            const aiModelSelect = document.querySelector('#aiModel');
            if (aiModelSelect && this.settings.aiModel) {
                aiModelSelect.value = this.settings.aiModel;

                aiModelSelect.addEventListener('change', () => {
                    this.settings.aiModel = aiModelSelect.value;
                    this._saveSettings();
                    this.translationService.setAIModel(aiModelSelect.value);

                    // 显示或隐藏自定义模型ID输入框
                    const customModelContainer = document.querySelector('#customModelContainer');
                    if (customModelContainer) {
                        customModelContainer.style.display = aiModelSelect.value === 'custom' ? 'block' : 'none';
                    }
                });
            }

            // 初始化自定义模型ID
            const customModelIdInput = document.querySelector('#customModelId');
            if (customModelIdInput && this.settings.customModelId) {
                customModelIdInput.value = this.settings.customModelId;

                customModelIdInput.addEventListener('input', () => {
                    this.settings.customModelId = customModelIdInput.value;
                    this._saveSettings();
                });
            }
        } else if (providerId === 'bailian') {
            const bailianModelSelect = document.querySelector('#bailianModel');
            if (bailianModelSelect) {
                // 如果有保存的模型设置，使用保存的设置；否则使用默认值'qwen-max'
                const modelValue = this.settings.bailianModel || 'qwen-max';
                bailianModelSelect.value = modelValue;

                // 确保设置中有bailianModel值
                if (!this.settings.bailianModel) {
                    this.settings.bailianModel = modelValue;
                    this._saveSettings();
                    this.translationService.setBailianModel(modelValue);
                }

                bailianModelSelect.addEventListener('change', () => {
                    this.settings.bailianModel = bailianModelSelect.value;
                    this._saveSettings();
                    this.translationService.setBailianModel(bailianModelSelect.value);
                });
            }
        }
    }

    /**
     * 显示提示词预览
     * @private
     */
    _showPromptPreview() {
        try {
            // 获取当前翻译提供者
            const provider = this.translationService.getActiveProvider();
            if (!provider) {
                alert('无法获取当前翻译提供者');
                return;
            }

            // 获取提示词管理实例
            const promptTemplates = provider.promptTemplates;
            if (!promptTemplates) {
                alert('当前翻译提供者不支持提示词预览');
                return;
            }

            // 获取当前设置
            // 获取当前选择的提示词ID
            const activeProvider = this.translationService.getActiveProvider();
            if (!activeProvider) {
                throw new Error('未找到活动的翻译提供者');
            }
            const providerId = activeProvider.getId();
            const customPromptSelect = document.querySelector(`#${providerId}PromptID`);
            const customPrompt = customPromptSelect ? customPromptSelect.value : (this.settings.customPrompt || '');

            // 获取自定义提示模板
            const promptTemplateTextarea = document.querySelector(`#${providerId}PromptTemplate`);
            const promptTemplate = promptTemplateTextarea ? promptTemplateTextarea.value : (this.settings.promptTemplate || '');

            // 获取字符限制设置
            const charLimitEnInput = document.getElementById('charLimitEn');
            const charLimitZhInput = document.getElementById('charLimitZh');
            const charLimitEn = charLimitEnInput ? parseInt(charLimitEnInput.value) : null;
            const charLimitZh = charLimitZhInput ? parseInt(charLimitZhInput.value) : null;

            const sourceLanguage = this.settings.sourceLanguage || 'en';
            const targetLanguage = this.settings.targetLanguage || 'zh';

            console.log('当前提示词设置:', {
                provider: this.translationService.getId(),
                customPrompt,
                promptTemplate,
                sourceLanguage,
                targetLanguage,
                charLimitEn,
                charLimitZh
            });

            // 获取翻译提示词，根据目标语言选择字符限制
            const charLimit = targetLanguage.startsWith('zh') ? charLimitZh : charLimitEn;
            const translationPrompt = promptTemplates.getTranslationPrompt(
                customPrompt,
                '[Your text here]',
                sourceLanguage,
                targetLanguage,
                promptTemplate,
                charLimit
            );

            // 获取标准化提示词
            const standardizePrompt = promptTemplates.getStandardizePrompt('[Your text here]', 'en', charLimitEn);

            // 更新预览内容
            document.getElementById('translationPromptPreview').textContent = translationPrompt;
            document.getElementById('standardizePromptPreview').textContent = standardizePrompt;

            // 显示模态框
            document.getElementById('promptPreviewModal').style.display = 'block';
        } catch (error) {
            Logger.error('显示提示词预览失败', error);
            alert(`显示提示词预览失败: ${error.message}`);
        }
    }




}

// 导出TranslationPanel
window.TranslationPanel = TranslationPanel;