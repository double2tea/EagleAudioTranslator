/**
 * 翻译提示词模板管理
 * 用于集中管理和提供翻译提示词模板
 */
class PromptTemplates {
    /**
     * 构造函数
     */
    constructor() {
        // 默认翻译提示模板
        this.defaultTranslationTemplate = '请将以下{from}文本翻译成{to}，保持原意，不要添加任何解释，直接返回翻译结果\n\n{text}';

        // 默认标准化提示模板
        this.defaultStandardizeTemplate = 'Please provide a concise English description of this sound effect in 2-5 words. Only return the description without any additional text or explanation.\n\n{text}';

        // 预定义的提示模板
        this.predefinedPrompts = {
            'accurate': '请将以下{from}文本翻译成{to}，要求翻译准确、专业，保持原意，不要添加任何解释。直接返回翻译结果\n\n{text}',
            'natural': '请将以下{from}文本翻译成自然、流畅的{to}，保持原意的同时让表达更加地道。直接返回翻译结果\n\n{text}',
            'creative': '请将以下{from}文本翻译成有创意的{to}，可以适当调整表达方式使其更加生动。直接返回翻译结果\n\n{text}',
            'audio': '请将以下音效文件名从{from}翻译成{to}，生成详细但不超过7个字的中文描述，保持原意，使用准确、具体的表达。直接返回翻译结果，不要添加任何解释。\n\n{text}',
            'reverse': '请将以下中文音效文件名翻译成简洁、准确的英文描述，使用专业的音效术语。直接返回翻译结果，不要添加任何解释。\n\n{text}'
        };

        // 预定义的中文分类提示模板
        this.defaultChineseClassificationTemplate = '你是一个专业的音效分类专家，请分析这个中文音效文件名，并提供以下信息：\n\n1. CatID: 音效分类ID（例如：DSGNRythm, MSC, TOON 等）\n2. Category: 主分类英文名（例如：DESIGNED, MISCELLANEOUS 等）\n3. Category_zh: 主分类中文名（例如：声音设计, 杂项 等）\n4. 简短英文描述: 用英文简要描述这个音效（不超过5个单词）\n\n文件名：{text}\n\n请以JSON格式返回，不要有其他文字。';
    }

    /**
     * 获取翻译提示模板
     * @param {string} promptId - 提示ID
     * @param {string} text - 要翻译的文本
     * @param {string} from - 源语言
     * @param {string} to - 目标语言
     * @param {string} customTemplate - 自定义模板
     * @returns {string} 处理后的提示模板
     */
    getTranslationPrompt(promptId, text, from, to, customTemplate = '') {
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

        // 替换变量
        return template
            .replace(/{text}/g, text)
            .replace(/{from}/g, from === 'auto' ? '' : from)
            .replace(/{to}/g, to);
    }

    /**
     * 获取标准化提示模板
     * @param {string} text - 要处理的文本
     * @param {string} [language='en'] - 文本语言，默认为英文
     * @returns {string} 处理后的提示模板
     */
    getStandardizePrompt(text, language = 'en') {
        return this.defaultStandardizeTemplate.replace(/{text}/g, text);
    }

    /**
     * 获取中文音效分类提示模板
     * @param {string} text - 要分类的中文文件名
     * @returns {string} 处理后的提示模板
     */
    getChineseClassificationPrompt(text) {
        return this.defaultChineseClassificationTemplate.replace(/{text}/g, text);
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
