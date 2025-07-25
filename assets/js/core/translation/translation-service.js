
/**
 * 翻译服务
 * 用于管理和使用多个翻译提供者
 */
class TranslationService {
    /**
     * 构造函数
     */
    constructor() {
        this.providers = {};
        this.activeProvider = null;
        this.cache = new Cache('translation-cache');
        this.settings = {
            sourceLanguage: 'en',
            targetLanguage: 'zh-CN',
            useCache: true,
            provider: 'zhipu',
            useAI: true,
            aiModel: 'glm-4',
            zhipuModel: 'glm-4',
            deepseekModel: 'deepseek-chat', // Deepseek仅支持deepseek-chat模型
            bailianModel: 'qwen-max', // 阿里云百炼默认使用通义千问Max模型
            customPrompt: '',
            apiKeys: {
                zhipu: '',
                deepseek: '',
                openrouter: '',
                bailian: ''
            },
            standardizeEnglish: false, // 是否对英文进行标准化处理
            namingStyle: 'none', // 命名风格：'none', 'camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'custom'
            customSeparator: '_' // 自定义分隔符
        };

        // 注册默认提供者
        this._registerDefaultProviders();

        // 设置默认提供者为活动提供者
        try {
            // 优先使用智谱AI提供者
            if (this.providers['zhipu']) {
                this.activeProvider = this.providers['zhipu'];
                Logger.info('已设置默认活动翻译提供者: 智谱AI');
            }
            // 如果没有智谱AI，尝试使用Deepseek
            else if (this.providers['deepseek']) {
                this.activeProvider = this.providers['deepseek'];
                Logger.info('已设置默认活动翻译提供者: Deepseek');
            }
            // 如果没有Deepseek，尝试使用OpenRouter AI
            else if (this.providers['openrouter']) {
                this.activeProvider = this.providers['openrouter'];
                Logger.info('已设置默认活动翻译提供者: OpenRouter AI');
            }
            // 如果没有OpenRouter，尝试使用阿里云百炼
            else if (this.providers['bailian']) {
                this.activeProvider = this.providers['bailian'];
                Logger.info('已设置默认活动翻译提供者: 阿里云百炼');
            }
            // 如果没有阿里云百炼，尝试使用Google翻译
            else if (this.providers['google']) {
                this.activeProvider = this.providers['google'];
                Logger.info('已设置默认活动翻译提供者: Google Translate');
            }
            else {
                // 否则使用第一个可用的提供者
                const providers = Object.values(this.providers);
                if (providers.length > 0) {
                    this.activeProvider = providers[0];
                    Logger.info(`已设置默认活动翻译提供者: ${this.activeProvider.getName()}`);
                }
            }
        } catch (error) {
            Logger.error('设置默认翻译提供者失败', error);
        }
    }

    /**
     * 注册默认翻译提供者
     * @private
     */
    _registerDefaultProviders() {
        try {
            // 注册智谱AI提供者作为首选提供者
            this.registerProvider(new ZhipuAIProvider(this.settings));

            // 注册Deepseek提供者
            this.registerProvider(new DeepseekProvider(this.settings));

            // 注册OpenRouter AI提供者作为备选
            this.registerProvider(new OpenRouterProvider(this.settings));

            // 注册阿里云百炼提供者
            this.registerProvider(new BailianProvider(this.settings));

            // 注册Google翻译提供者作为备选
            this.registerProvider(new GoogleTranslateProvider(this.settings));

            Logger.info('已注册默认翻译提供者');
        } catch (error) {
            Logger.error('注册默认翻译提供者失败', error);
        }
    }

    /**
     * 注册翻译提供者
     * @param {Object} provider - 翻译提供者实例
     */
    registerProvider(provider) {
        // 检查提供者是否实现了必要的方法
        if (!provider || typeof provider.getId !== 'function' || typeof provider.getName !== 'function' || typeof provider.translate !== 'function') {
            throw new Error('提供者必须实现必要的接口方法');
        }

        this.providers[provider.getId()] = provider;
        Logger.info(`已注册翻译提供者: ${provider.getName()}`);
    }

    /**
     * 设置活动提供者
     * @param {string} providerId - 提供者ID
     */
    setActiveProvider(providerId) {
        if (!this.providers[providerId]) {
            throw new Error(`提供者${providerId}未注册`);
        }

        this.activeProvider = this.providers[providerId];
        this.settings.provider = providerId;

        // 确保提供者的设置是最新的
        if (!this.activeProvider.settings.apiKeys) {
            this.activeProvider.settings.apiKeys = {};
        }

        // 确保提供者的API密钥是最新的
        if (this.settings.apiKeys && this.settings.apiKeys[providerId]) {
            this.activeProvider.settings.apiKeys[providerId] = this.settings.apiKeys[providerId];
        }

        // 确保百炼模型设置是最新的
        if (providerId === 'bailian' && this.settings.bailianModel) {
            this.activeProvider.settings.bailianModel = this.settings.bailianModel;
        }

        Logger.info(`已设置活动翻译提供者: ${this.activeProvider.getName()}`);
    }

    /**
     * 获取所有注册的提供者
     * @returns {Array<Object>} 提供者列表
     */
    getProviders() {
        return Object.values(this.providers);
    }

    /**
     * 设置服务设置
     * @param {Object} settings - 翻译设置
     */
    setSettings(settings) {
        // 确保apiKeys对象存在
        if (!this.settings.apiKeys) {
            this.settings.apiKeys = {};
        }

        // 确保settings.apiKeys对象存在并正确合并
        if (settings.apiKeys) {
            // 合并apiKeys对象，确保所有提供者的密钥都存在
            this.settings.apiKeys = { ...this.settings.apiKeys, ...settings.apiKeys };

            // 从settings中删除apiKeys，以避免下面的浅合并覆盖整个apiKeys对象
            const { apiKeys, ...restSettings } = settings;
            settings = restSettings;
        }

        // 合并其他设置
        this.settings = { ...this.settings, ...settings };

        // 确保百炼模型设置存在
        if (!this.settings.bailianModel) {
            this.settings.bailianModel = 'qwen-max';
        }

        // 更新所有提供者的设置
        for (const providerId in this.providers) {
            this.providers[providerId].settings = { ...this.settings };
        }

        // 如果设置了提供者，则激活
        if (settings.provider && this.providers[settings.provider]) {
            this.setActiveProvider(settings.provider);
        }

        Logger.debug('翻译服务设置已更新', this.settings);
    }

    /**
     * 翻译文本
     * @param {string} text - 要翻译的文本
     * @param {string} [from] - 源语言，可选，默认使用设置中的源语言
     * @param {string} [to] - 目标语言，可选，默认使用设置中的目标语言
     * @returns {Promise<string>} 翻译结果
     */
    async translate(text, from = null, to = null) {
        if (!this.activeProvider) {
            throw new Error('未设置活动翻译提供者');
        }

        // 使用提供的语言参数或默认设置
        const sourceLanguage = from || this.settings.sourceLanguage;
        const targetLanguage = to || this.settings.targetLanguage;

        // 检查缓存
        const cacheKey = `${this.activeProvider.getId()}:${sourceLanguage}:${targetLanguage}:${text}`;
        if (this.settings.useCache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                Logger.debug(`使用缓存的翻译结果: ${text} -> ${cached}`);
                return cached;
            }
        }

        // 执行翻译
        try {
            const result = await this.activeProvider.translate(
                text,
                sourceLanguage,
                targetLanguage
            );

            // 更新缓存
            if (this.settings.useCache) {
                this.cache.set(cacheKey, result);
            }

            return result;
        } catch (error) {
            Logger.error(`翻译失败: ${text}`, error);
            throw error;
        }
    }

    /**
     * 反向翻译（中文到英文）
     * @param {string} text - 要翻译的中文文本
     * @returns {Promise<string>} 翻译结果（英文）
     */
    async reverseTranslate(text) {
        try {
            Logger.debug(`反向翻译（中文到英文）: ${text}`);

            // 检查缓存
            const cacheKey = `reverse:${this.activeProvider.getId()}:zh-CN:en:${text}`;
            if (this.settings.useCache) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    Logger.debug(`使用缓存的反向翻译结果: ${text} -> ${cached}`);
                    return cached;
                }
            }

            // 执行翻译，将源语言设置为中文，目标语言设置为英文
            const result = await this.translate(text, 'zh-CN', 'en');

            // 更新缓存
            if (this.settings.useCache) {
                this.cache.set(cacheKey, result);
            }

            return result;
        } catch (error) {
            Logger.error(`反向翻译失败: ${text}`, error);
            throw error;
        }
    }

    /**
     * 标准化处理文本（生成简短的英文描述）
     * @param {string} text - 要处理的文本
     * @returns {Promise<string>} 处理结果
     */
    async standardize(text) {
        if (!this.activeProvider) {
            throw new Error('未设置活动翻译提供者');
        }

        // 检查缓存
        const cacheKey = `standardize:${this.activeProvider.getId()}:${text}`;
        if (this.settings.useCache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                Logger.debug(`使用缓存的标准化结果: ${text} -> ${cached}`);
                return cached;
            }
        }

        try {
            // 如果提供者支持标准化方法，则使用提供者的方法
            if (typeof this.activeProvider.standardize === 'function') {
                const options = {
                    style: this.settings.namingStyle,
                    separator: this.settings.customSeparator
                };

                const result = await this.activeProvider.standardize(text, 'en', options);

                // 更新缓存
                if (this.settings.useCache) {
                    this.cache.set(cacheKey, result);
                }

                return result;
            } else {
                // 如果提供者不支持标准化方法，则使用翻译方法并添加特殊提示
                const prompt = `Please provide a concise English description of this sound effect in 2-5 words: "${text}". Only return the description without any additional text.`;

                const result = await this.activeProvider.translate(
                    prompt,
                    'en',
                    'en'
                );

                // 提取结果中的描述部分（去除可能的引号和额外文本）
                let cleanResult = result.replace(/^["']|["']$/g, '').trim();

                // 如果结果还包含原始文本，则只保留第一部分
                if (cleanResult.includes(text)) {
                    cleanResult = cleanResult.split(text)[0].trim();
                }

                // 应用命名风格
                cleanResult = this.formatText(cleanResult);

                // 更新缓存
                if (this.settings.useCache) {
                    this.cache.set(cacheKey, cleanResult);
                }

                return cleanResult;
            }
        } catch (error) {
            Logger.error(`标准化处理失败: ${text}`, error);
            throw error;
        }
    }

    /**
     * 格式化文本（应用命名风格）
     * @param {string} text - 要格式化的文本
     * @returns {string} 格式化后的文本
     */
    formatText(text) {
        if (!text) return text;

        // 先清理文本，移除多余空格
        let cleanedText = text.replace(/\s+/g, ' ').trim();

        // 如果提供者支持格式化方法，则使用提供者的方法
        if (this.activeProvider && typeof this.activeProvider.formatText === 'function') {
            return this.activeProvider.formatText(cleanedText, this.settings.namingStyle, this.settings.customSeparator);
        }

        // 否则使用默认实现
        // 分割单词
        const words = cleanedText.split(/\s+/);

        switch (this.settings.namingStyle) {
            case 'camelCase':
                return words.map((word, index) => {
                    if (index === 0) {
                        return word.toLowerCase();
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join('');

            case 'PascalCase':
                return words.map(word => {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join('');

            case 'snake_case':
                return words.map(word => word.toLowerCase()).join('_');

            case 'kebab-case':
                return words.map(word => word.toLowerCase()).join('-');

            case 'custom':
                return words.join(this.settings.customSeparator);

            case 'none':
            default:
                return cleanedText; // 返回清理后的文本，而不是原始文本
        }
    }

    /**
     * 清除翻译缓存
     */
    clearCache() {
        this.cache.clear();
        Logger.info('翻译缓存已清除');
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计信息
     */
    getCacheStats() {
        return this.cache.getStats();
    }

    /**
     * 设置翻译提供者
     * @param {string} providerId - 提供者ID
     */
    setProvider(providerId) {
        try {
            this.setActiveProvider(providerId);
            this.settings.provider = providerId;
            Logger.info(`已设置翻译提供者: ${providerId}`);
        } catch (error) {
            Logger.error(`设置翻译提供者失败: ${providerId}`, error);
        }
    }

    /**
     * 设置源语言
     * @param {string} language - 语言代码
     */
    setSourceLanguage(language) {
        this.settings.sourceLanguage = language;
        Logger.info(`已设置源语言: ${language}`);
    }

    /**
     * 设置目标语言
     * @param {string} language - 语言代码
     */
    setTargetLanguage(language) {
        this.settings.targetLanguage = language;
        Logger.info(`已设置目标语言: ${language}`);
    }

    /**
     * 设置是否使用缓存
     * @param {boolean} useCache - 是否使用缓存
     */
    setUseCache(useCache) {
        this.settings.useCache = useCache;
        Logger.info(`已${useCache ? '启用' : '禁用'}翻译缓存`);
    }

    /**
     * 设置是否使用AI标准化
     * @param {boolean} useAI - 是否使用AI标准化
     */
    setUseAI(useAI) {
        this.settings.useAI = useAI;
        Logger.info(`已${useAI ? '启用' : '禁用'}AI标准化处理`);
    }

    /**
     * 设置AI模型
     * @param {string} model - 模型名称
     */
    setAIModel(model) {
        this.settings.aiModel = model;
        Logger.info(`已设置AI模型: ${model}`);
    }

    /**
     * 设置智谱AI模型
     * @param {string} model - 模型名称
     */
    setZhipuModel(model) {
        this.settings.zhipuModel = model;
        Logger.info(`已设置智谱AI模型: ${model}`);
    }

    /**
     * 设置Deepseek模型
     * Deepseek仅支持deepseek-chat模型
     */
    setDeepseekModel() {
        this.settings.deepseekModel = 'deepseek-chat';
        Logger.info('已设置Deepseek模型: deepseek-chat');
    }

    /**
     * 设置阿里云百炼模型
     * @param {string} model - 模型名称
     */
    setBailianModel(model) {
        this.settings.bailianModel = model;

        // 更新百炼提供者的设置
        if (this.providers['bailian']) {
            this.providers['bailian'].settings.bailianModel = model;
        }

        Logger.info(`已设置阿里云百炼模型: ${model}`);
    }

    /**
     * 设置API密钥
     * @param {string} provider - 提供者ID
     * @param {string} key - API密钥
     */
    setAPIKey(provider, key) {
        if (!this.settings.apiKeys) {
            this.settings.apiKeys = {};
        }
        this.settings.apiKeys[provider] = key;

        // 更新对应提供者的设置
        if (this.providers[provider]) {
            if (!this.providers[provider].settings.apiKeys) {
                this.providers[provider].settings.apiKeys = {};
            }
            this.providers[provider].settings.apiKeys[provider] = key;
        }

        Logger.info(`已设置${provider}API密钥: ${key ? '******' : '(空)'}`);
    }



    /**
     * 发送请求到AI接口
     * @param {string} prompt - 提示词
     * @param {string} from - 源语言代码
     * @param {string} to - 目标语言代码
     * @param {string} type - 请求类型（翻译、分类等）
     * @returns {Promise<string>} AI响应
     */
    async sendRequest(prompt, from, to, type = 'translation') {
        if (!this.activeProvider) {
            throw new Error('未设置活动翻译提供者');
        }

        // 如果活动提供者有sendRequest方法，使用它
        if (typeof this.activeProvider.sendRequest === 'function') {
            return await this.activeProvider.sendRequest(prompt, from, to, type);
        }

        // 否则使用translate方法
        return await this.activeProvider.translate(prompt, from, to);
    }

    /**
     * 获取当前活动的提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        if (!this.activeProvider) {
            return 'unknown';
        }
        return this.activeProvider.getId();
    }

    /**
     * 获取当前活动的提供者实例
     * @returns {Object} 提供者实例
     */
    getActiveProvider() {
        return this.activeProvider;
    }

    /**
     * 设置自定义提示
     * @param {string} promptId - 提示ID
     */
    setCustomPrompt(promptId) {
        this.settings.customPrompt = promptId;
        // 如果设置了新的提示ID，清除提示模板
        if (promptId !== 'custom') {
            this.settings.promptTemplate = '';
        }
        Logger.info(`已设置提示风格: ${promptId}`);
    }

    /**
     * 设置自定义提示模板
     * @param {string} template - 提示模板
     */
    setPromptTemplate(template) {
        this.settings.promptTemplate = template;
        Logger.info('已设置自定义提示模板');
    }

    /**
     * 设置是否对英文进行标准化处理
     * @param {boolean} standardize - 是否标准化
     */
    setStandardizeEnglish(standardize) {
        this.settings.standardizeEnglish = standardize;
        Logger.info(`已${standardize ? '启用' : '禁用'}英文标准化处理`);
    }

    /**
     * 设置命名风格
     * @param {string} style - 命名风格
     */
    setNamingStyle(style) {
        this.settings.namingStyle = style;
        Logger.info(`已设置命名风格: ${style}`);
    }

    /**
     * 设置自定义分隔符
     * @param {string} separator - 分隔符
     */
    setCustomSeparator(separator) {
        this.settings.customSeparator = separator;
        Logger.info(`已设置自定义分隔符: ${separator}`);
    }

    /**
     * 获取当前翻译服务的设置
     * @returns {Object} 翻译设置
     */
    getSettings() {
        return { ...this.settings };
    }
}

// 导出TranslationService
window.TranslationService = TranslationService;
