/**
 * 智谱AI提供者实现
 * 使用智谱AI GLM-4模型进行翻译
 */
class ZhipuAIProvider extends TranslationProvider {
    /**
     * 构造函数
     * @param {Object} settings - 翻译设置
     */
    constructor(settings = {}) {
        super(settings);
        this.endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        this.defaultModel = 'glm-4'; // 默认使用GLM-4模型

        // 创建提示词管理实例
        this.promptTemplates = new PromptTemplates();
    }

    /**
     * 获取提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        return 'zhipu';
    }

    /**
     * 获取提供者名称
     * @returns {string} 提供者名称
     */
    getName() {
        return '智谱AI';
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
            Logger.debug(`使用智谱AI翻译: ${text} (${from} -> ${to})`);

            // 检查API密钥
            const apiKey = this.settings.apiKeys?.zhipu;
            if (!apiKey) {
                throw new Error('未设置智谱AI API密钥');
            }

            // 获取模型
            const model = this.settings.zhipuModel || this.defaultModel;

            // 使用提示词管理模块获取提示词
            const prompt = this.promptTemplates.getTranslationPrompt(
                this.settings.customPrompt,
                text,
                from,
                to,
                this.settings.promptTemplate
            );

            // 构建请求体
            const requestBody = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 低温度以获得更确定性的结果
                max_tokens: 1000
            };

            // 生成JWT令牌
            const token = this._generateJWT(apiKey);

            // 发送请求
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            Logger.error('智谱AI翻译失败', error);
            throw new Error(`翻译失败: ${error.message}`);
        }
    }

    /**
     * 生成JWT令牌
     * @param {string} apiKey - API密钥
     * @returns {string} JWT令牌
     * @private
     */
    _generateJWT(apiKey) {
        // 智谱AI使用API Key直接作为Bearer Token
        // 如果需要生成JWT，可以在这里实现
        return apiKey;
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
     * 标准化处理文本（生成简短的英文描述）
     * @param {string} text - 要处理的文本
     * @param {string} language - 语言代码
     * @param {Object} options - 选项（如命名风格等）
     * @returns {Promise<string>} 处理结果
     */
    async standardize(text, language, options = {}) {
        try {
            Logger.debug(`使用智谱AI标准化处理: ${text}`);

            // 检查API密钥
            const apiKey = this.settings.apiKeys?.zhipu;
            if (!apiKey) {
                throw new Error('未设置智谱AI API密钥');
            }

            // 获取模型
            const model = this.settings.zhipuModel || this.defaultModel;

            // 使用提示词管理模块获取标准化提示词
            const prompt = this.promptTemplates.getStandardizePrompt(text);

            // 构建请求体
            const requestBody = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 低温度以获得更确定性的结果
                max_tokens: 100
            };

            // 生成JWT令牌
            const token = this._generateJWT(apiKey);

            // 发送请求
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            Logger.error('智谱AI标准化处理失败', error);
            throw new Error(`标准化处理失败: ${error.message}`);
        }
    }

    // _getLanguageName方法已移至PromptTemplates类中
}

// 导出ZhipuAIProvider
window.ZhipuAIProvider = ZhipuAIProvider;
