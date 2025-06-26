/**
 * 智能分类器
 * 用于智能分类音效文件，减少硬编码数据依赖
 */
class SmartClassifier {
    // 静态常量定义
    static CHINESE_STOP_WORDS = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);
    static ENGLISH_STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'as']);

    /**
     * 构造函数
     * @param {CSVMatcher|FuseMatcher} csvMatcher - 匹配器实例
     */
    constructor(csvMatcher) {
        this.csvMatcher = csvMatcher;
        this.nlpProcessor = null; // 自然语言处理器，用于词性分析
        this.initialized = false;
        this.aliyunNLPAdapter = null; // 阿里云NLP服务适配器
        this.chineseTokenizer = null; // 中文分词器

        // 分类设置
        this.classificationSettings = {
            // 词性优先级 - 数字越大优先级越高
            posWeights: {
                noun: 120,       // 名词优先级最高
                adjective: 80,   // 形容词次之
                verb: 70,        // 动词优先级提高
                adverb: 40,      // 副词优先级较低
                other: 20        // 其他词性优先级最低
            },
            // 默认匹配策略
            defaultMatchStrategy: 'auto', // 'auto', 'ai', 'bilingual', 'pos'
            // 是否启用词性分析
            usePosAnalysis: true,
            // 是否验证AI返回的分类
            validateAIClassification: true,
            // 阿里云NLP服务配置
            aliyunNLP: {
                enabled: false,  // 是否启用阿里云NLP服务
                accessKeyId: '', // 阿里云AccessKey ID
                accessKeySecret: '', // 阿里云AccessKey Secret
                debug: false,    // 是否开启调试模式
                tokenizer: {     // 分词器配置
                    useBasicChinese: true,
                    useAdvancedChinese: false,
                    useMultiLanguage: true
                }
            },
            // 词性过滤设置
            filterSettings: {
                enabled: true,                // 是否启用过滤
                filterPunctuation: true,      // 是否过滤标点符号
                punctuationWeightThreshold: 10, // 标点符号权重阈值
                filterNumbers: true,          // 是否过滤单独的数字
                numberWeightThreshold: 80,    // 数字权重阈值
                filterFunctionWords: true     // 是否过滤功能词（如"的"、"了"等）
            }
        };

        // 初始化
        this.init();
    }

    /**
     * 初始化分类器
     */
    init() {
        try {
            // 检查compromise.js是否可用
            if (typeof nlp !== 'undefined') {
                this.nlpProcessor = nlp;
                console.log('NLP处理器初始化成功');
            }

            // 检查segmentit分词库是否可用
            if (typeof SegmentitDirect !== 'undefined') {
                this.chineseTokenizer = SegmentitDirect;
                console.log('中文分词器初始化成功');
            }

            // 检查IntlSegmenterAdapter是否可用
            if (typeof IntlSegmenterAdapter !== 'undefined') {
                try {
                    this.nlpAdapter = new IntlSegmenterAdapter();
                    console.log('IntlSegmenterAdapter初始化成功');
                } catch (error) {
                    console.error('IntlSegmenterAdapter初始化失败:', error);
                }
            }

            // 检查阿里云NLP适配器是否可用
            if (this.classificationSettings.aliyunNLP && this.classificationSettings.aliyunNLP.enabled) {
                try {
                    console.log('初始化阿里云NLP适配器...');

                    const options = {
                        accessKeyId: this.classificationSettings.aliyunNLP.accessKeyId,
                        accessKeySecret: this.classificationSettings.aliyunNLP.accessKeySecret,
                        enabled: this.classificationSettings.aliyunNLP.enabled,
                        debug: this.classificationSettings.aliyunNLP.debug,
                        tokenizer: this.classificationSettings.aliyunNLP.tokenizer
                    };

                    // 使用阿里云NLP适配器
                    if (typeof AliyunNLPAdapter !== 'undefined') {
                        this.aliyunNLPAdapter = new AliyunNLPAdapter(options);
                        console.log('阿里云NLP适配器初始化状态:', this.aliyunNLPAdapter.initialized);
                    } else {
                        console.error('未找到阿里云NLP适配器');
                    }
                } catch (error) {
                    console.error('阿里云NLP适配器初始化失败:', error);
                    this.aliyunNLPAdapter = null;
                }
            }

            this.initialized = true;
            console.log('智能分类器初始化成功');
        } catch (error) {
            console.error('智能分类器初始化失败:', error);
            this.initialized = false;
        }
    }

    /**
     * 统一的分词方法，根据文本类型和可用工具选择合适的分词策略
     * @param {string} text - 要分析的文本
     * @returns {Array} 分词结果
     * @private
     */
    async tokenizeText(text, options = {}) {
        const result = [];

        // 检测文本语言
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        const hasEnglish = /[a-zA-Z]/.test(text);

        // 1. 尝试使用阿里云NLP服务
        let aliyunSuccess = false;
        if ((hasChinese || hasEnglish) &&
            this.aliyunNLPAdapter &&
            this.classificationSettings.aliyunNLP.enabled) {
            try {
                // 确保适配器已初始化
                if (!this.aliyunNLPAdapter.initialized && typeof this.aliyunNLPAdapter.init === 'function') {
                    await this.aliyunNLPAdapter.init();
                }

                // 使用阿里云NLP服务进行词性分析
                const posResult = await this.aliyunNLPAdapter.analyzePos(text);
                if (posResult && posResult.length > 0) {
                    result.push(...posResult);
                    aliyunSuccess = true;
                } else {
                    // 阿里云NLP返回空结果，可能是纯英文文本或其他原因
                    if (this.classificationSettings.aliyunNLP.debug) {
                        console.log(`【分词】阿里云NLP服务返回空结果，将使用本地处理`);
                    }
                }
            } catch (error) {
                if (this.classificationSettings.aliyunNLP.debug) {
                    console.warn(`【分词】阿里云NLP服务分词失败: ${error.message}`);
                } else {
                    console.warn(`【分词】阿里云NLP服务分词失败`);
                }
            }
        }

        // 2. 如果阿里云NLP服务失败或未启用，使用本地处理
        if (!aliyunSuccess) {
            // 处理英文部分
            if (hasEnglish && this.nlpProcessor) {
                try {
                    // 提取英文部分
                    let englishText = '';
                    for (let i = 0; i < text.length; i++) {
                        if (/[a-zA-Z0-9\s\p{P}]/u.test(text[i]) && !/[\u4e00-\u9fa5]/u.test(text[i])) {
                            englishText += text[i];
                        }
                    }

                    // 预处理英文文本，将下划线替换为空格
                    englishText = englishText.replace(/_/g, ' ');

                    if (englishText.trim().length > 0) {
                        if (this.classificationSettings.aliyunNLP.debug) {
                            console.log(`【分词】使用本地compromise.js处理英文文本: "${englishText}"`);
                        }

                        const doc = this.nlpProcessor(englishText);
                        const allTerms = doc.terms();

                        // 定义要提取的词性及其权重
                        const posTypes = [
                            { type: '#Noun', filter: '.not(#Determiner).not(#Pronoun)', pos: 'noun' },
                            { type: '#Adjective', filter: '', pos: 'adjective' },
                            { type: '#Verb', filter: '.not(#Auxiliary)', pos: 'verb' },
                            { type: '#Adverb', filter: '', pos: 'adverb' }
                        ];

                        // 统一处理各种词性
                        for (const posType of posTypes) {
                            try {
                                // 构建匹配表达式
                                const matchExpr = posType.type + (posType.filter || '');
                                const words = allTerms.match(matchExpr).out('array');

                                words.forEach(word => {
                                    if (word && word.trim() && !SmartClassifier.ENGLISH_STOP_WORDS.has(word.toLowerCase())) {
                                        const wordObj = {
                                            word: word.toLowerCase().trim(),
                                            pos: posType.pos,
                                            weight: this.classificationSettings.posWeights[posType.pos]
                                        };

                                        if (this.classificationSettings.aliyunNLP.debug) {
                                            console.log(`【分词】compromise.js识别词 "${word}" 的词性: ${posType.pos}, 权重: ${this.classificationSettings.posWeights[posType.pos]}`);
                                        }

                                        result.push(wordObj);
                                    }
                                });
                            } catch (e) { /* 忽略错误 */ }
                        }
                    }
                } catch (error) {
                    console.warn(`【分词】英文分词失败`);
                }
            }

            // 处理中文部分
            if (hasChinese) {
                try {
                    // 定义词性映射函数
                    const mapPosTag = (posTag) => {
                        if (posTag === 'a') return { pos: 'adjective', weight: 80 };
                        if (posTag === 'v') return { pos: 'verb', weight: 100 };
                        if (posTag === 'd') return { pos: 'adverb', weight: 60 };
                        if (posTag === 'n' || posTag === 'nr' || posTag === 'ns' || posTag === 'nt') return { pos: 'noun', weight: 120 };
                        return { pos: 'noun', weight: 120 }; // 默认为名词
                    };

                    // 尝试使用Intl.Segmenter
                    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
                        const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
                        const segments = segmenter.segment(text);

                        for (const segment of segments) {
                            if (segment.isWordLike && !SmartClassifier.CHINESE_STOP_WORDS.has(segment.segment)) {
                                const word = segment.segment;
                                let posInfo = { pos: 'noun', weight: 120 }; // 默认为名词

                                // 尝试使用segmentit的tag方法获取词性
                                if (this.chineseTokenizer && typeof this.chineseTokenizer.tag === 'function') {
                                    try {
                                        const tagResult = this.chineseTokenizer.tag(word);
                                        if (tagResult && tagResult.length > 0 && tagResult[0].p) {
                                            posInfo = mapPosTag(tagResult[0].p);
                                        }
                                    } catch (e) { /* 忽略错误 */ }
                                }

                                result.push({
                                    word: segment.segment,
                                    pos: posInfo.pos,
                                    weight: posInfo.weight
                                });
                            }
                        }
                    }
                    // 如果Intl.Segmenter不可用，使用segmentit
                    else if (this.chineseTokenizer && typeof this.chineseTokenizer.tag === 'function') {
                        const tagResults = this.chineseTokenizer.tag(text);

                        tagResults.forEach(item => {
                            if (item && item.w && !SmartClassifier.CHINESE_STOP_WORDS.has(item.w)) {
                                const posInfo = mapPosTag(item.p);

                                result.push({
                                    word: item.w,
                                    pos: posInfo.pos,
                                    weight: posInfo.weight
                                });
                            }
                        });
                    }
                    // 最后的回退：使用简单的字符分割
                    else {
                        for (let i = 0; i < text.length; i++) {
                            const char = text[i];

                            // 跳过停用词和标点符号
                            if (!SmartClassifier.CHINESE_STOP_WORDS.has(char) && !/[\s\p{P}]/u.test(char)) {
                                result.push({
                                    word: char,
                                    pos: 'noun', // 默认为名词
                                    weight: 100
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`【分词】中文分词失败`);
                }
            }
        }

        // 3. 去除重复项
        const uniqueResult = [];
        const wordSet = new Set();

        for (const item of result) {
            if (!wordSet.has(item.word)) {
                wordSet.add(item.word);
                uniqueResult.push(item);
            }
        }

        // 4. 应用过滤规则
        return this.filterPosResults(uniqueResult);
    }

    /**
     * 过滤词性分析结果
     * @param {Array} posResults - 词性分析结果
     * @returns {Array} 过滤后的结果
     */
    filterPosResults(posResults) {
        if (!posResults || !Array.isArray(posResults) || posResults.length === 0) {
            return posResults;
        }

        if (!this.classificationSettings.filterSettings.enabled) {
            return posResults;
        }

        const settings = this.classificationSettings.filterSettings;

        return posResults.filter(item => {
            // 过滤标点符号
            if (settings.filterPunctuation &&
                item.pos === 'punctuation' &&
                item.weight <= settings.punctuationWeightThreshold) {
                return false;
            }

            // 过滤单独的数字
            if (settings.filterNumbers &&
                /^\d+$/.test(item.word) &&
                item.weight <= settings.numberWeightThreshold) {
                return false;
            }

            // 过滤功能词
            if (settings.filterFunctionWords) {
                if (SmartClassifier.CHINESE_STOP_WORDS.has(item.word) ||
                    SmartClassifier.ENGLISH_STOP_WORDS.has(item.word.toLowerCase())) {
                    return false;
                }
            }

            // 保留其他所有词
            return true;
        });
    }

    /**
     * 分析文本中的词性 - 简化版，使用统一的分词方法
     * @param {string} text - 要分析的文本
     * @returns {Promise<Array<Object>>} 词性分析结果
     */
    async analyzePos(text) {
        if (!text) return [];
        return this.tokenizeText(text);
    }

    /**
     * 处理AI分类结果
     * @param {Object} aiClassification - AI分类结果
     * @param {string} filename - 文件名
     * @returns {Object|null} 处理后的分类结果
     */
    processAIClassification(aiClassification, filename) {
        if (!aiClassification || !aiClassification.catID) {
            return null;
        }

        // 如果需要验证AI返回的分类
        if (this.classificationSettings.validateAIClassification) {
            // 查找对应的术语
            const term = this.csvMatcher.findTermByCatID(aiClassification.catID);
            if (term) {
                return {
                    catID: term.catID,
                    catShort: term.catShort,
                    category: term.category,
                    category_zh: term.categoryNameZh,
                    subCategory: term.source,
                    subCategory_zh: term.target
                };
            } else {
                return null;
            }
        }

        // 如果不需要验证，直接返回AI分类结果
        return aiClassification;
    }

    /**
     * 分类文件 - 中心化的匹配逻辑
     * @param {string} filename - 文件名
     * @param {Object} aiClassification - AI分类结果（可选）
     * @param {Object} options - 额外选项
     * @returns {Promise<Object>} 分类结果
     */
    async classifyFile(filename, aiClassification = null, options = {}) {
        if (!filename) {
            return null;
        }

        // 获取匹配策略
        const matchStrategy = options.matchStrategy || this.classificationSettings.defaultMatchStrategy || 'auto';

        // 1. 首先尝试使用AI分类结果（如果提供）
        if (aiClassification && (matchStrategy === 'auto' || matchStrategy === 'ai')) {
            const processedAIResult = this.processAIClassification(aiClassification, filename);
            if (processedAIResult) {
                return processedAIResult;
            }
        }

        // 2. 分析原始文件名的词性
        const originalPosAnalysis = await this.analyzePos(filename);

        // 3. 如果提供了翻译文本，分析其词性
        let translatedPosAnalysis = null;
        if (options.translatedText) {
            translatedPosAnalysis = await this.analyzePos(options.translatedText);
        }

        // 4. 准备匹配选项
        const matchOptions = {
            ...options,
            usePosAnalysis: true
        };

        // 5. 根据匹配策略准备不同的选项
        if (options.translatedText && (matchStrategy === 'auto' || matchStrategy === 'bilingual')) {
            // 双语匹配选项
            matchOptions.translatedText = options.translatedText;
            matchOptions.translatedPosAnalysis = translatedPosAnalysis;
        }

        // 6. 获取所有匹配结果（用于UI显示）
        try {
            if (this.csvMatcher) {
                const allMatches = this.csvMatcher.getAllMatches(
                    filename,
                    originalPosAnalysis,
                    matchOptions
                );

                // 保存匹配结果到选项中，以便调用者可以访问
                options.matchResults = allMatches;
                options.availableMatchCount = allMatches.length;
            }
        } catch (error) {
            console.warn(`获取匹配结果失败`);
        }

        // 7. 使用匹配器的identifyCategory方法进行匹配
        try {
            const catID = await this.csvMatcher.identifyCategory(filename, null, originalPosAnalysis, matchOptions);

            if (catID) {
                // 查找对应的术语
                const term = this.csvMatcher.findTermByCatID(catID);
                if (term) {
                    return {
                        catID: term.catID,
                        catShort: term.catShort,
                        category: term.category,
                        category_zh: term.categoryNameZh,
                        subCategory: term.source,
                        subCategory_zh: term.target,
                        matchResults: options.matchResults, // 添加所有匹配结果
                        availableMatchCount: options.availableMatchCount // 添加可用匹配结果数量
                    };
                }
            }
        } catch (error) {
            console.error('匹配失败');
        }

        // 8. 如果所有匹配都失败，尝试使用文件名的第一部分（如果有空格）
        if (filename.indexOf(' ') !== -1) {
            try {
                const firstPart = filename.split(' ')[0];

                // 分析第一部分的词性
                const firstPartPosAnalysis = await this.analyzePos(firstPart);

                // 使用第一部分进行匹配
                const firstPartCatID = await this.csvMatcher.identifyCategory(firstPart, null, firstPartPosAnalysis, {
                    ...matchOptions,
                    threshold: 0.1 // 使用更低的阈值
                });

                if (firstPartCatID) {
                    const term = this.csvMatcher.findTermByCatID(firstPartCatID);
                    if (term) {
                        return {
                            catID: term.catID,
                            catShort: term.catShort,
                            category: term.category,
                            category_zh: term.categoryNameZh,
                            subCategory: term.source,
                            subCategory_zh: term.target,
                            matchResults: [{
                                term: term,
                                score: 100,
                                matchSource: 'firstPart',
                                priority: 5
                            }],
                            availableMatchCount: 1
                        };
                    }
                }
            } catch (error) {
                // 忽略错误
            }
        }

        // 9. 如果所有匹配都失败，返回null
        return null;
    }
    /**
     * 设置阿里云NLP服务配置
     * @param {Object} config - 配置选项
     * @param {boolean} config.enabled - 是否启用阿里云NLP服务
     * @param {string} config.accessKeyId - 阿里云AccessKey ID
     * @param {string} config.accessKeySecret - 阿里云AccessKey Secret
     * @param {boolean} config.debug - 是否开启调试模式
     * @param {Object} config.tokenizer - 分词器配置
     * @param {Object} config.filterSettings - 词性过滤设置
     * @returns {boolean} 设置是否成功
     */
    setAliyunNLPConfig(config) {
        try {
            // 更新配置
            this.classificationSettings.aliyunNLP = Object.assign(
                this.classificationSettings.aliyunNLP || {},
                config
            );

            // 更新过滤设置
            if (config.filterSettings) {
                this.classificationSettings.filterSettings = Object.assign(
                    this.classificationSettings.filterSettings || {},
                    config.filterSettings
                );
            }

            // 如果已经初始化了适配器，更新适配器配置
            if (this.aliyunNLPAdapter) {
                const options = {
                    accessKeyId: this.classificationSettings.aliyunNLP.accessKeyId,
                    accessKeySecret: this.classificationSettings.aliyunNLP.accessKeySecret,
                    enabled: this.classificationSettings.aliyunNLP.enabled,
                    debug: this.classificationSettings.aliyunNLP.debug,
                    // 添加分词器配置
                    tokenizer: this.classificationSettings.aliyunNLP.tokenizer
                };

                this.aliyunNLPAdapter.setOptions(options);

                // 重新初始化适配器
                if (typeof this.aliyunNLPAdapter.init === 'function') {
                    this.aliyunNLPAdapter.init();
                }
            } else {
                // 尝试初始化适配器
                try {
                    const options = {
                        accessKeyId: this.classificationSettings.aliyunNLP.accessKeyId,
                        accessKeySecret: this.classificationSettings.aliyunNLP.accessKeySecret,
                        enabled: this.classificationSettings.aliyunNLP.enabled,
                        debug: this.classificationSettings.aliyunNLP.debug,
                        // 添加分词器配置
                        tokenizer: this.classificationSettings.aliyunNLP.tokenizer
                    };

                    // 使用阿里云NLP适配器
                    if (typeof AliyunNLPAdapter !== 'undefined') {
                        this.aliyunNLPAdapter = new AliyunNLPAdapter(options);
                    }
                    else {
                        this.aliyunNLPAdapter = null;
                        return false;
                    }
                } catch (error) {
                    this.aliyunNLPAdapter = null;
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取阿里云NLP服务配置
     * @returns {Object} 当前配置
     */
    getAliyunNLPConfig() {
        // 返回配置的副本，隐藏敏感信息
        const config = Object.assign({}, this.classificationSettings.aliyunNLP);
        if (config.accessKeyId) {
            config.accessKeyId = config.accessKeyId.substring(0, 3) + '***';
        }
        if (config.accessKeySecret) {
            config.accessKeySecret = '******';
        }

        // 添加服务状态信息
        config.isAvailable = this.aliyunNLPAdapter ? this.aliyunNLPAdapter.isAvailable() : false;

        if (this.aliyunNLPAdapter) {
            config.requestStats = this.aliyunNLPAdapter.getRequestStats();
        }

        return config;
    }
}

// 导出类
window.SmartClassifier = SmartClassifier;
