/**
 * 阿里云百炼提供者实现
 * 使用阿里云百炼API进行翻译
 */
class BailianProvider extends TranslationProvider {
    /**
     * 构造函数
     * @param {Object} settings - 翻译设置
     */
    constructor(settings = {}) {
        super(settings);
        this.endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        this.defaultModel = 'qwen-max'; // 默认使用通义千问Max模型

        // 创建提示词管理实例
        this.promptTemplates = new PromptTemplates();
    }

    /**
     * 获取提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        return 'bailian';
    }

    /**
     * 获取提供者名称
     * @returns {string} 提供者名称
     */
    getName() {
        return '阿里云百炼';
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
            Logger.debug(`百炼翻译: ${text} (${from} -> ${to})`);

            // 检查API密钥
            const apiKey = this.settings.apiKeys?.bailian;
            if (!apiKey) {
                throw new Error('未设置阿里云百炼API密钥');
            }

            // 使用设置中的模型或默认模型
            const model = this.settings.bailianModel || this.defaultModel;

            // 使用提示词管理模块获取提示词
            const prompt = this.promptTemplates.getTranslationPrompt(
                this.settings.customPrompt,
                text,
                from,
                to,
                this.settings.promptTemplate
            );

            // 构建请求体 - 根据阿里云百炼API文档
            const requestBody = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 低温度以获得更确定性的结果
                top_p: 0.8,
                max_tokens: 1000
            };

            // 发送请求
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP错误 ${response.status}: ${errorData.message || response.statusText}`);
            }

            // 解析结果
            const result = await response.json();



            // 根据阿里云百炼API文档检查响应格式
            if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                throw new Error(`翻译结果无效: ${JSON.stringify(result)}`);
            }

            // 提取翻译文本
            const translatedText = result.choices[0].message.content.trim();

            if (!translatedText) {
                throw new Error('翻译结果为空');
            }

            // 清理翻译结果（移除引号和解释性文本）
            const cleanedText = this._cleanTranslation(translatedText);

            Logger.debug(`百炼翻译结果: ${cleanedText}`);
            return cleanedText;
        } catch (error) {
            Logger.error('阿里云百炼翻译失败', error);
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
     * 标准化处理文本（生成简短的英文描述）
     * @param {string} text - 要处理的文本
     * @param {string} language - 语言代码
     * @param {Object} options - 选项（如命名风格等）
     * @returns {Promise<string>} 处理结果
     */
    async standardize(text, language, options = {}) {
        try {
            Logger.debug(`百炼标准化处理: ${text}`);

            // 检查API密钥
            const apiKey = this.settings.apiKeys?.bailian;
            if (!apiKey) {
                throw new Error('未设置阿里云百炼API密钥');
            }

            // 使用设置中的模型或默认模型
            const model = this.settings.bailianModel || this.defaultModel;

            // 使用提示词管理模块获取标准化提示词
            const prompt = this.promptTemplates.getStandardizePrompt(text, language);

            // 构建请求体 - 根据阿里云百炼API文档
            const requestBody = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 低温度以获得更确定性的结果
                top_p: 0.8,
                max_tokens: 100
            };

            // 发送请求
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP错误 ${response.status}: ${errorData.message || response.statusText}`);
            }

            // 解析结果
            const result = await response.json();



            // 根据阿里云百炼API文档检查响应格式
            if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                throw new Error(`标准化结果无效: ${JSON.stringify(result)}`);
            }

            // 提取文本
            let standardizedText = result.choices[0].message.content.trim();

            if (!standardizedText) {
                throw new Error('标准化结果为空');
            }

            // 清理结果（移除引号和解释性文本）
            standardizedText = this._cleanTranslation(standardizedText);

            // 应用命名风格
            if (options.style && options.style !== 'none') {
                standardizedText = this.formatText(standardizedText, options.style, options.separator);
            }

            Logger.debug(`百炼标准化结果: ${standardizedText}`);
            return standardizedText;
        } catch (error) {
            Logger.error('阿里云百炼标准化处理失败', error);
            throw new Error(`标准化处理失败: ${error.message}`);
        }
    }
}

// 导出BailianProvider
window.BailianProvider = BailianProvider;