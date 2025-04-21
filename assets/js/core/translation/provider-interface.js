/**
 * 翻译提供者接口
 * 所有翻译服务提供者都应该实现这个接口
 */
class TranslationProvider {
    /**
     * 构造函数
     * @param {Object} settings - 翻译设置
     */
    constructor(settings = {}) {
        this.settings = settings;
    }

    /**
     * 获取提供者ID
     * @returns {string} 提供者ID
     */
    getId() {
        throw new Error("Method not implemented");
    }

    /**
     * 获取提供者名称
     * @returns {string} 提供者名称
     */
    getName() {
        throw new Error("Method not implemented");
    }

    /**
     * 是否需要API密钥
     * @returns {boolean} 是否需要API密钥
     */
    requiresApiKey() {
        throw new Error("Method not implemented");
    }

    /**
     * 获取支持的语言列表
     * @returns {Promise<Array<Object>>} 支持的语言列表，每个对象包含code和name
     */
    async getSupportedLanguages() {
        throw new Error("Method not implemented");
    }

    /**
     * 执行翻译
     * @param {string} text - 要翻译的文本
     * @param {string} from - 源语言代码
     * @param {string} to - 目标语言代码
     * @returns {Promise<string>} 翻译结果
     */
    async translate(text, from, to) {
        throw new Error("Method not implemented");
    }

    /**
     * 标准化处理文本（生成简短的英文描述）
     * @param {string} text - 要处理的文本
     * @param {string} language - 语言代码
     * @param {Object} options - 选项（如命名风格等）
     * @returns {Promise<string>} 处理结果
     */
    async standardize(text, language, options = {}) {
        throw new Error("Method not implemented");
    }

    /**
     * 格式化文本（应用命名风格）
     * @param {string} text - 要格式化的文本
     * @param {string} style - 命名风格（camelCase, PascalCase, snake_case, kebab-case, etc.）
     * @param {string} separator - 自定义分隔符（当style为'custom'时使用）
     * @returns {string} 格式化后的文本
     */
    formatText(text, style = 'none', separator = '_') {
        if (!text) return text;

        // 先将文本分割成单词
        const words = text.trim().split(/\s+/);

        switch (style) {
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
                return words.join(separator);

            case 'none':
            default:
                return text;
        }
    }
}

// 导出TranslationProvider
window.TranslationProvider = TranslationProvider;