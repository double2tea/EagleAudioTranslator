/**
 * GoogleTranslate提供者实现
 * 使用免费的谷歌翻译服务（无需API密钥）
 */
class GoogleTranslateProvider extends TranslationProvider {
    /**
     * 构造函数
     * @param {Object} settings - 翻译设置
     */
    constructor(settings = {}) {
        super(settings);
        // 使用非官方的谷歌翻译API，不需要密钥
        this.endpoint = 'https://translate.googleapis.com/translate_a/single';
    }

    /**
     * 获取提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        return 'google';
    }

    /**
     * 获取提供者名称
     * @returns {string} 提供者名称
     */
    getName() {
        return 'Google Translate';
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
        // 返回谷歌翻译支持的常用语言
        return [
            { code: 'en', name: 'English' },
            { code: 'zh', name: 'Chinese' },
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
            Logger.debug(`使用GoogleTranslate翻译: ${text} (${from} -> ${to})`);

            // 构建查询参数
            const params = new URLSearchParams({
                client: 'gtx',
                sl: from,
                tl: to,
                dt: 't',
                q: text
            });

            // 发送请求
            const response = await fetch(`${this.endpoint}?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }

            // 解析结果
            const result = await response.json();

            // 谷歌翻译API返回的是一个嵌套数组，我们需要提取翻译结果
            if (!result || !result[0] || !result[0][0] || !result[0][0][0]) {
                throw new Error('翻译结果无效');
            }

            // 提取翻译文本
            let translatedText = '';
            for (let i = 0; i < result[0].length; i++) {
                if (result[0][i][0]) {
                    translatedText += result[0][i][0];
                }
            }

            if (!translatedText) {
                throw new Error('翻译结果为空');
            }

            Logger.debug(`翻译结果: ${translatedText}`);
            return translatedText;
        } catch (error) {
            Logger.error('GoogleTranslate翻译失败', error);
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
            Logger.debug(`使用GoogleTranslate标准化处理: ${text}`);

            // Google翻译不支持标准化处理，所以我们只能返回原始文本
            // 应用命名风格
            let standardizedText = text;
            if (options.style && options.style !== 'none') {
                standardizedText = this.formatText(standardizedText, options.style, options.separator);
            }

            Logger.debug(`标准化结果: ${standardizedText}`);
            return standardizedText;
        } catch (error) {
            Logger.error('GoogleTranslate标准化处理失败', error);
            throw new Error(`标准化处理失败: ${error.message}`);
        }
    }
}

// 导出GoogleTranslateProvider
window.GoogleTranslateProvider = GoogleTranslateProvider;