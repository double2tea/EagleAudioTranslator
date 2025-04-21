/**
 * LibreTranslate提供者实现
 * 使用免费开源的LibreTranslate服务
 */
class LibreTranslateProvider extends TranslationProvider {
    /**
     * 构造函数
     * @param {Object} settings - 翻译设置
     */
    constructor(settings = {}) {
        super(settings);
        this.endpoint = (settings?.apiEndpoint) || 'https://libretranslate.com/translate';
    }

    /**
     * 获取提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        return 'libre';
    }

    /**
     * 获取提供者名称
     * @returns {string} 提供者名称
     */
    getName() {
        return 'LibreTranslate';
    }

    /**
     * 是否需要API密钥
     * @returns {boolean} 是否需要API密钥
     */
    requiresApiKey() {
        return false;
    }

    /**
     * 获取支持的语言列表
     * @returns {Promise<Array<Object>>} 支持的语言列表
     */
    async getSupportedLanguages() {
        try {
            const response = await fetch(`${this.endpoint.replace('/translate', '')}/languages`);
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }

            const languages = await response.json();
            return languages.map(lang => ({
                code: lang.code,
                name: lang.name
            }));
        } catch (error) {
            Logger.error('获取LibreTranslate支持的语言失败', error);
            // 返回默认支持的语言
            return [
                { code: 'en', name: 'English' },
                { code: 'zh', name: 'Chinese' },
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
            Logger.debug(`使用LibreTranslate翻译: ${text} (${from} -> ${to})`);

            const response = await fetch(this.endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    q: text,
                    source: from,
                    target: to,
                    format: 'text',
                    api_key: this.settings.apiKey || ''
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }

            const result = await response.json();

            if (!result.translatedText) {
                throw new Error('翻译结果无效');
            }

            Logger.debug(`翻译结果: ${result.translatedText}`);
            return result.translatedText;
        } catch (error) {
            Logger.error('LibreTranslate翻译失败', error);
            throw new Error(`翻译失败: ${error.message}`);
        }
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
            Logger.debug(`使用LibreTranslate标准化处理: ${text}`);

            // LibreTranslate不支持标准化处理，所以我们只能返回原始文本
            // 应用命名风格
            let standardizedText = text;
            if (options.style && options.style !== 'none') {
                standardizedText = this.formatText(standardizedText, options.style, options.separator);
            }

            Logger.debug(`标准化结果: ${standardizedText}`);
            return standardizedText;
        } catch (error) {
            Logger.error('LibreTranslate标准化处理失败', error);
            throw new Error(`标准化处理失败: ${error.message}`);
        }
    }
}

// 导出LibreTranslateProvider
window.LibreTranslateProvider = LibreTranslateProvider;