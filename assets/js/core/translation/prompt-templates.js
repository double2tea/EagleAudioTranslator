/**
 * 翻译提示词模板管理
 * 用于集中管理和提供翻译提示词模板
 */
class PromptTemplates {
    /**
     * 构造函数
     */
    constructor() {
        // 默认字符限制
        this.defaultCharLimit = {
            en: 30,  // 英文默认30个字符
            zh: 7    // 中文默认7个字符
        };

        // 默认翻译提示模板
        this.defaultTranslationTemplate = '请将以下{from}文本翻译成{to}，保持原意，{charLimit}，不要添加任何解释，直接返回翻译结果\n\n{text}';

        // 默认标准化提示模板
        this.defaultStandardizeTemplate = 'Please provide a concise English description of this sound effect in {charLimit} characters or less. Only return the description without any additional text or explanation.\n\n{text}';

        // 预定义的提示模板
        this.predefinedPrompts = {
            'accurate': '请将以下{from}文本翻译成{to}，要求翻译准确、专业，保持原意，{charLimit}，不要添加任何解释。直接返回翻译结果\n\n{text}',
            'natural': '请将以下{from}文本翻译成自然、流畅的{to}，保持原意的同时让表达更加地道，{charLimit}。直接返回翻译结果\n\n{text}',
            'creative': '请将以下{from}文本翻译成有创意的{to}，可以适当调整表达方式使其更加生动，{charLimit}。直接返回翻译结果\n\n{text}',
            'audio': '请将以下音效文件名从{from}翻译成{to}，生成详细但{charLimit}的描述，保持原意，使用准确、具体的表达。直接返回翻译结果，不要添加任何解释。\n\n{text}',
            'reverse': '请将以下中文音效文件名翻译成简洁、准确的英文描述，{charLimit}，使用专业的音效术语。直接返回翻译结果，不要添加任何解释。\n\n{text}'
        };

        // 预定义的中文分类提示模板
        this.defaultChineseClassificationTemplate = '你是一个专业的音效分类专家，请分析这个中文音效文件名，并提供以下信息：\n\n1. CatID: 音效分类ID（例如：DSGNRythm, MSC, TOON 等）\n2. Category: 主分类英文名（例如：DESIGNED, MISCELLANEOUS 等）\n3. Category_zh: 主分类中文名（例如：声音设计, 杂项 等）\n4. 简短英文描述: 用英文简要描述这个音效（{charLimit}）\n\n文件名：{text}\n\n请以JSON格式返回，不要有其他文字。';
    }

    /**
     * 获取字符限制提示文本
     * @param {string} language - 语言代码
     * @param {number} [limit=null] - 自定义字符限制
     * @returns {string} 字符限制提示文本
     * @private
     */
    _getCharLimitText(language, limit = null) {
        const lang = language.startsWith('zh') ? 'zh' : 'en';
        const charLimit = limit || this.defaultCharLimit[lang] || 30;

        if (lang === 'zh') {
            return `不超过${charLimit}个字`;
        } else {
            return `use no more than ${charLimit} characters`;
        }
    }

    /**
     * 获取翻译提示模板
     * @param {string} promptId - 提示ID
     * @param {string} text - 要翻译的文本
     * @param {string} from - 源语言
     * @param {string} to - 目标语言
     * @param {string} customTemplate - 自定义模板
     * @param {number} [charLimit=null] - 自定义字符限制
     * @returns {string} 处理后的提示模板
     */
    getTranslationPrompt(promptId, text, from, to, customTemplate = '', charLimit = null) {
        let template = '';

        // 如果有自定义模板，优先使用
        if (customTemplate && customTemplate.trim()) {
            template = customTemplate;
        }
        // 如果有预定义提示ID，使用预定义模板
        else if (promptId && this.predefinedPrompts[promptId]) {
            template = this.predefinedPrompts[promptId];
        }
        // 否则使用默认模板
        else {
            template = this.defaultTranslationTemplate;
        }

        // 获取字符限制文本
        const charLimitText = this._getCharLimitText(to, charLimit);

        // 替换变量
        return template
            .replace(/{text}/g, text)
            .replace(/{from}/g, from === 'auto' ? '' : from)
            .replace(/{to}/g, to)
            .replace(/{charLimit}/g, charLimitText);
    }

    /**
     * 获取标准化提示模板
     * @param {string} text - 要处理的文本
     * @param {string} [language='en'] - 文本语言，默认为英文
     * @param {number} [charLimit=null] - 自定义字符限制
     * @returns {string} 处理后的提示模板
     */
    getStandardizePrompt(text, language = 'en', charLimit = null) {
        // 获取字符限制文本，但不使用本地化格式
        const limit = charLimit || this.defaultCharLimit[language === 'zh' ? 'zh' : 'en'] || 30;

        return this.defaultStandardizeTemplate
            .replace(/{text}/g, text)
            .replace(/{charLimit}/g, limit);
    }

    /**
     * 获取中文音效分类提示模板
     * @param {string} text - 要分类的中文文件名
     * @param {number} [charLimit=null] - 自定义英文描述字符限制
     * @returns {string} 处理后的提示模板
     */
    getChineseClassificationPrompt(text, charLimit = null) {
        // 获取英文描述的字符限制
        const limit = charLimit || this.defaultCharLimit.en || 30;
        const charLimitText = `不超过${limit}个字符`;

        return this.defaultChineseClassificationTemplate
            .replace(/{text}/g, text)
            .replace(/{charLimit}/g, charLimitText);
    }

    /**
     * 添加或更新预定义提示模板
     * @param {string} promptId - 提示ID
     * @param {string} template - 提示模板
     */
    setPromptTemplate(promptId, template) {
        if (!promptId || !template) {
            throw new Error('提示ID和模板不能为空');
        }

        this.predefinedPrompts[promptId] = template;
    }

    /**
     * 设置默认字符限制
     * @param {string} language - 语言代码 ('en' 或 'zh')
     * @param {number} limit - 字符限制
     */
    setDefaultCharLimit(language, limit) {
        if (language !== 'en' && language !== 'zh') {
            throw new Error('语言代码必须是 "en" 或 "zh"');
        }

        if (typeof limit !== 'number' || limit <= 0) {
            throw new Error('字符限制必须是正数');
        }

        this.defaultCharLimit[language] = limit;
    }

    /**
     * 获取所有预定义提示模板
     * @returns {Object} 所有预定义提示模板
     */
    getAllPromptTemplates() {
        return { ...this.predefinedPrompts };
    }

    /**
     * 获取语言名称
     * @param {string} code - 语言代码
     * @returns {string} 语言名称
     */
    getLanguageName(code) {
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
}

// 导出PromptTemplates
window.PromptTemplates = PromptTemplates;
