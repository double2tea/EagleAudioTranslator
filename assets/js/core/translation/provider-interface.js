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
}

// 导出TranslationProvider
window.TranslationProvider = TranslationProvider;