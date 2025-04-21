/**
 * OpenRouter提供者实现
 * 使用OpenRouter API进行AI翻译
 */
class OpenRouterProvider extends TranslationProvider {
    /**
     * 构造函数
     * @param {Object} settings - 翻译设置
     */
    constructor(settings = {}) {
        super(settings);
        this.endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.defaultModel = 'deepseek-chat-v3'; // 默认使用免费的Deepseek模型

        // 默认翻译提示模板
        this.defaultPromptTemplate = '请将以下{from}文本翻译成{to}，保持原意，不要添加任何解释，直接返回翻译结果\n\n{text}';

        // 默认标准化提示模板
        this.defaultStandardizeTemplate = 'Please provide a concise English description of this sound effect in 2-5 words. Only return the description without any additional text or explanation.\n\n{text}';
    }

    /**
     * 获取提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        return 'openrouter';
    }

    /**
     * 获取提供者名称
     * @returns {string} 提供者名称
     */
    getName() {
        return 'OpenRouter AI';
    }

    /**
     * 是否需要API密钥
     * @returns {boolean} 是否需要API密钥
     */
    requiresApiKey() {
        return true;
    }

    /**
     * 获取支持的语言列表
     * @returns {Promise<Array<Object>>} 支持的语言列表
     */
    async getSupportedLanguages() {
        // 返回支持的常用语言
        return [
            { code: 'auto', name: '自动检测' },
            { code: 'en', name: 'English' },
            { code: 'zh-CN', name: 'Chinese (Simplified)' },
            { code: 'zh-TW', name: 'Chinese (Traditional)' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ru', name: 'Russian' },
            { code: 'es', name: 'Spanish' }
        ];
    }

    /**
     * 执行翻译
     * @param {string} text - 要翻译的文本
     * @param {string} from - 源语言代码
     * @param {string} to - 目标语言代码
     * @returns {Promise<string>} 翻译结果
     */
    async translate(text, from, to) {
        try {
            Logger.debug(`使用OpenRouter翻译: ${text} (${from} -> ${to})`);

            // 检查API密钥
            const apiKey = this.settings.apiKeys?.openrouter;
            if (!apiKey) {
                throw new Error('未设置OpenRouter API密钥');
            }

            // 获取模型
            const model = this.settings.aiModel || this.defaultModel;

            // 构建提示
            let prompt = '';

            // 如果有自定义提示模板，使用自定义提示模板
            if (this.settings.promptTemplate && this.settings.promptTemplate.trim()) {
                prompt = this.settings.promptTemplate
                    .replace(/{text}/g, text)
                    .replace(/{from}/g, this._getLanguageName(from))
                    .replace(/{to}/g, this._getLanguageName(to));
            }
            // 如果有自定义提示ID，使用自定义提示ID
            else if (this.settings.customPrompt && this.settings.customPrompt.trim()) {
                // 这里可以根据提示ID加载预定义的提示模板
                const promptId = this.settings.customPrompt.trim();
                const predefinedPrompts = {
                    'accurate': '请将以下{from}文本翻译成{to}，要求翻译准确、专业，保持原意，不要添加任何解释。直接返回翻译结果\n\n{text}',
                    'natural': '请将以下{from}文本翻译成自然、流畅的{to}，保持原意的同时让表达更加地道。直接返回翻译结果\n\n{text}',
                    'creative': '请将以下{from}文本翻译成有创意的{to}，可以适当调整表达方式使其更加生动。直接返回翻译结果\n\n{text}',
                    'audio': '请将以下音效文件名从{from}翻译成{to}，保持原意，使用简洁、准确的表达。直接返回翻译结果\n\n{text}'
                };

                const promptTemplate = predefinedPrompts[promptId] || this.defaultPromptTemplate;
                prompt = promptTemplate
                    .replace(/{text}/g, text)
                    .replace(/{from}/g, this._getLanguageName(from))
                    .replace(/{to}/g, this._getLanguageName(to));
            } else {
                // 使用默认提示模板
                prompt = this.defaultPromptTemplate
                    .replace(/{text}/g, text)
                    .replace(/{from}/g, from === 'auto' ? '' : this._getLanguageName(from))
                    .replace(/{to}/g, this._getLanguageName(to));

                // 如果是自动检测，移除多余的空格
                if (from === 'auto') {
                    prompt = prompt.replace(/以下\s+文本/g, '以下文本');
                }
            }

            // 构建请求体
            const requestBody = {
                model: this._getModelId(model),
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 低温度以获得更确定性的结果
                max_tokens: 1000
            };

            // 发送请求
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://eagle.cool', // 为OpenRouter统计
                    'X-Title': 'Eagle Audio Translator' // 为OpenRouter统计
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP错误 ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            // 解析结果
            const result = await response.json();

            if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                throw new Error('翻译结果无效');
            }

            // 提取翻译文本
            const translatedText = result.choices[0].message.content.trim();

            if (!translatedText) {
                throw new Error('翻译结果为空');
            }

            // 清理翻译结果（移除引号和解释性文本）
            const cleanedText = this._cleanTranslation(translatedText);

            Logger.debug(`翻译结果: ${cleanedText}`);
            return cleanedText;
        } catch (error) {
            Logger.error('OpenRouter翻译失败', error);
            throw new Error(`翻译失败: ${error.message}`);
        }
    }

    /**
     * 清理翻译结果
     * @param {string} text - 翻译结果
     * @returns {string} 清理后的文本
     * @private
     */
    _cleanTranslation(text) {
        // 移除可能的引号
        let cleaned = text.replace(/^["']|["']$/g, '');

        // 移除可能的解释性文本
        const explanationPatterns = [
            /^翻译(结果)?[:：]/i,
            /^这是(您的)?翻译(结果)?[:：]/i,
            /^以下是(您的)?翻译(结果)?[:：]/i,
            /^Translation[:：]/i,
            /^Translated text[:：]/i
        ];

        for (const pattern of explanationPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        return cleaned.trim();
    }

    /**
     * 获取语言名称
     * @param {string} code - 语言代码
     * @returns {string} 语言名称
     * @private
     */
    _getLanguageName(code) {
        const languageMap = {
            'auto': '自动检测',
            'en': '英语',
            'zh': '中文',
            'zh-CN': '简体中文',
            'zh-TW': '繁体中文',
            'fr': '法语',
            'de': '德语',
            'it': '意大利语',
            'ja': '日语',
            'ko': '韩语',
            'pt': '葡萄牙语',
            'ru': '俄语',
            'es': '西班牙语'
        };

        return languageMap[code] || code;
    }

    /**
     * 获取模型ID
     * @param {string} model - 模型名称
     * @returns {string} 完整的模型ID
     * @private
     */
    _getModelId(model) {
        // 如果是自定义模型ID，直接返回
        if (model.includes('/')) {
            return model;
        }

        // 预设模型映射
        const modelMap = {
            'deepseek-chat-v3': 'deepseek/deepseek-chat-v3-0324',
            'gemini-flash': 'google/gemini-2.0-flash-exp',
            'qwen-32b': 'qwen/qwq-32b'
        };

        return modelMap[model] || model;
    }

    /**
     * 标准化处理文本（生成简短的英文描述）
     * @param {string} text - 要处理的文本
     * @param {string} language - 语言代码
     * @param {Object} options - 选项（如命名风格等）
     * @returns {Promise<string>} 处理结果
     */
    async standardize(text, language, options = {}) {
        try {
            Logger.debug(`使用OpenRouter标准化处理: ${text}`);

            // 检查API密钥
            const apiKey = this.settings.apiKeys?.openrouter;
            if (!apiKey) {
                throw new Error('未设置OpenRouter API密钥');
            }

            // 获取模型
            const model = this.settings.aiModel || this.defaultModel;

            // 构建提示
            const prompt = this.defaultStandardizeTemplate.replace(/{text}/g, text);

            // 构建请求体
            const requestBody = {
                model: this._getModelId(model),
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 低温度以获得更确定性的结果
                max_tokens: 100
            };

            // 发送请求
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://eagle.cool', // 为OpenRouter统计
                    'X-Title': 'Eagle Audio Translator' // 为OpenRouter统计
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP错误 ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            // 解析结果
            const result = await response.json();

            if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                throw new Error('处理结果无效');
            }

            // 提取文本
            let standardizedText = result.choices[0].message.content.trim();

            if (!standardizedText) {
                throw new Error('处理结果为空');
            }

            // 清理结果（移除引号和解释性文本）
            standardizedText = this._cleanTranslation(standardizedText);

            // 应用命名风格
            if (options.style && options.style !== 'none') {
                standardizedText = this.formatText(standardizedText, options.style, options.separator);
            }

            Logger.debug(`标准化结果: ${standardizedText}`);
            return standardizedText;
        } catch (error) {
            Logger.error('OpenRouter标准化处理失败', error);
            throw new Error(`标准化处理失败: ${error.message}`);
        }
    }
}

// 导出OpenRouterProvider
window.OpenRouterProvider = OpenRouterProvider;
