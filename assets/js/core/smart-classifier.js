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

        this.chineseTokenizer = null; // 中文分词器

        // 词性分析缓存，避免重复计算
        this.posAnalysisCache = new Map();
        this.maxCacheSize = 1000; // 最大缓存条目数

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
            // 默认匹配策略：智能自动选择
            defaultMatchStrategy: 'auto', // 'auto', 'ai', 'bilingual', 'pos'
            // 启用词性分析（提高匹配准确性）
            usePosAnalysis: true, // 重新启用，配合其他策略
            // 验证AI分类结果
            validateAIClassification: true,
            // 本地分词配置
            localTokenizer: {
                debug: false    // 是否开启调试模式
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
            } else {
                console.warn('compromise.js (nlp) 未加载，英文词性分析功能将不可用');
            }

            // 检查segmentit分词库是否可用
            if (typeof SegmentitDirect !== 'undefined') {
                this.chineseTokenizer = SegmentitDirect;
                console.log('中文分词器初始化成功');
            } else {
                console.warn('SegmentitDirect 未加载，中文词性分析功能将受限');
            }

            // 检查IntlSegmenterAdapter是否可用
            if (typeof IntlSegmenterAdapter !== 'undefined') {
                try {
                    this.nlpAdapter = new IntlSegmenterAdapter();
                    console.log('IntlSegmenterAdapter初始化成功');
                } catch (error) {
                    console.error('IntlSegmenterAdapter初始化失败:', error);
                }
            } else {
                console.warn('IntlSegmenterAdapter 未加载，将使用浏览器内置分词功能');
            }

            // 本地分词系统已就绪，无需额外初始化

            this.initialized = true;
            console.log('智能分类器初始化成功');
        } catch (error) {
            console.error('智能分类器初始化失败:', error);
            this.initialized = false;
        }
    }

    /**
     * 重新初始化分类器（当依赖库延迟加载时使用）
     * @returns {boolean} 是否初始化成功
     */
    reinitialize() {
        console.log('重新初始化智能分类器...');
        this.init();
        return this.initialized;
    }

    /**
     * 确保依赖可用，如果不可用则尝试重新初始化
     * @returns {boolean} 依赖是否可用
     */
    ensureDependencies() {
        if (!this.initialized) {
            return this.reinitialize();
        }
        return true;
    }

    /**
     * 统一的分词方法，根据文本类型和可用工具选择合适的分词策略
     * @param {string} text - 要分析的文本
     * @returns {Array} 分词结果
     * @private
     */
    tokenizeText(text, options = {}) {
        // 确保依赖可用
        if (!this.ensureDependencies()) {
            console.warn('【分词】依赖不可用，返回空结果');
            return [];
        }

        const result = [];

        // 检测文本语言
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        const hasEnglish = /[a-zA-Z]/.test(text);

        // 使用本地分词系统处理
        // 处理英文部分
        if (hasEnglish && this.nlpProcessor) {
            try {
                // 提取英文部分 - 优化性能，使用正则表达式一次性处理
                let englishText = text
                    .replace(/[\u4e00-\u9fa5]/g, ' ')  // 将中文字符替换为空格
                    .replace(/_/g, ' ')               // 将下划线替换为空格
                    .replace(/\s+/g, ' ')             // 规范化空格
                    .trim();

                if (englishText.trim().length > 0) {
                    console.log(`【分词】使用本地compromise.js处理英文文本: "${englishText}"`);

                    // 使用compromise.js进行更详细的分析
                    const doc = this.nlpProcessor(englishText);

                        // 获取所有术语
                        const allTerms = doc.terms();

                        // 定义要提取的词性及其权重
                        const posTypes = [
                            { type: '#Noun', filter: '.not(#Determiner).not(#Pronoun)', pos: 'noun' },
                            { type: '#Adjective', filter: '', pos: 'adjective' },
                            { type: '#Verb', filter: '.not(#Auxiliary)', pos: 'verb' },
                            { type: '#Adverb', filter: '', pos: 'adverb' }
                        ];

                        // 获取句子结构信息，用于更好地理解文本
                        const sentences = doc.sentences();
                        if (this.classificationSettings.localTokenizer.debug && sentences.length > 0) {
                            console.log(`【分词】文本包含 ${sentences.length} 个句子`);

                            // 分析每个句子的结构
                            sentences.forEach((sentence, idx) => {
                                try {
                                    // 获取主语和谓语
                                    const subjects = sentence.match('#Subject').out('array');
                                    const verbs = sentence.match('#Verb').out('array');

                                    if (subjects.length > 0 || verbs.length > 0) {
                                        console.log(`【分词】句子${idx+1}结构: 主语=[${subjects.join(', ')}], 谓语=[${verbs.join(', ')}]`);
                                    }
                                } catch (e) {
                                    if (this.classificationSettings.localTokenizer.debug) {
                                        console.warn(`【分词】句子分析失败: ${e.message}`, { sentence: sentence.text(), error: e });
                                    }
                                }
                            });
                        }

                        // 统一处理各种词性
                        for (const posType of posTypes) {
                            try {
                                // 构建匹配表达式
                                const matchExpr = posType.type + (posType.filter || '');
                                const words = allTerms.match(matchExpr).out('array');

                                // 记录找到的词数量
                                if (this.classificationSettings.localTokenizer.debug && words.length > 0) {
                                    console.log(`【分词】找到 ${words.length} 个${posType.pos}词: ${words.join(', ')}`);
                                }

                                words.forEach(word => {
                                    if (word && word.trim() && !SmartClassifier.ENGLISH_STOP_WORDS.has(word.toLowerCase())) {
                                        // 获取词的原形(lemma)，如running -> run
                                        let lemma = word.toLowerCase().trim();
                                        try {
                                            const wordDoc = this.nlpProcessor(word);
                                            const lemmas = wordDoc.verbs().toInfinitive().out('array');
                                            if (lemmas.length > 0 && posType.pos === 'verb') {
                                                lemma = lemmas[0].toLowerCase();
                                            }
                                        } catch (e) {
                                            if (this.classificationSettings.localTokenizer.debug) {
                                                console.warn(`【分词】词形还原失败: ${e.message}`, { word, error: e });
                                            }
                                        }

                                        const wordObj = {
                                            word: lemma,
                                            originalWord: word.toLowerCase().trim(),
                                            pos: posType.pos,
                                            weight: this.classificationSettings.posWeights[posType.pos]
                                        };

                                        if (this.classificationSettings.localTokenizer.debug) {
                                            const lemmaInfo = lemma !== word.toLowerCase().trim() ? ` (原形: ${lemma})` : '';
                                            console.log(`【分词】compromise.js识别词 "${word}"${lemmaInfo} 的词性: ${posType.pos}, 权重: ${this.classificationSettings.posWeights[posType.pos]}`);
                                        }

                                        result.push(wordObj);
                                    }
                                });
                            } catch (e) {
                                if (this.classificationSettings.localTokenizer.debug) {
                                    console.warn(`【分词】处理${posType.pos}词性时出错:`, e.message);
                                }
                            }
                        }
                    }
            } catch (error) {
                console.warn(`【分词】英文分词失败: ${error.message}`, { text, error });
            }
        }

        // 处理中文部分
        if (hasChinese) {
            try {
                    // 定义词性映射函数 - 使用配置中的权重保持一致性
                    const mapPosTag = (posTag) => {
                        const posMap = {
                            'a': 'adjective',
                            'v': 'verb',
                            'd': 'adverb',
                            'n': 'noun', 'nr': 'noun', 'ns': 'noun', 'nt': 'noun'
                        };
                        const pos = posMap[posTag] || 'noun';
                        return {
                            pos: pos,
                            weight: this.classificationSettings.posWeights[pos] || this.classificationSettings.posWeights.noun
                        };
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
                                    } catch (e) {
                                            if (this.classificationSettings.localTokenizer.debug) {
                                                console.warn(`【分词】获取中文词性失败: ${e.message}`, { word, error: e });
                                            }
                                        }
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
                    console.warn(`【分词】中文分词失败: ${error.message}`, { text, error });
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
     * 清理词性分析缓存
     */
    clearPosAnalysisCache() {
        this.posAnalysisCache.clear();
        console.log('【缓存】词性分析缓存已清理');
    }

    /**
     * 分析文本中的词性 - 增强版，使用统一的分词方法并提供详细日志
     * @param {string} text - 要分析的文本
     * @returns {Array<Object>} 词性分析结果
     */
    analyzePos(text) {
        if (!text) return [];

        // 检查缓存
        if (this.posAnalysisCache.has(text)) {
            console.log(`【词性分析】使用缓存结果: "${text}"`);
            return this.posAnalysisCache.get(text);
        }

        // 检测文本语言
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        const hasEnglish = /[a-zA-Z]/.test(text);

        console.log(`【词性分析】开始分析文本: "${text}"`);
        console.log(`【词性分析】文本语言: ${hasChinese ? '包含中文' : ''}${hasChinese && hasEnglish ? '，' : ''}${hasEnglish ? '包含英文' : ''}`);

        // 使用tokenizeText进行分词和词性分析
        const result = this.tokenizeText(text);

        // 缓存结果
        if (this.posAnalysisCache.size >= this.maxCacheSize) {
            // 如果缓存已满，删除最旧的条目
            const firstKey = this.posAnalysisCache.keys().next().value;
            this.posAnalysisCache.delete(firstKey);
        }
        this.posAnalysisCache.set(text, result);

        // 输出词性分析结果统计
        if (result.length > 0) {
            // 按词性统计
            const posCounts = {};
            result.forEach(item => {
                posCounts[item.pos] = (posCounts[item.pos] || 0) + 1;
            });

            // 构建词性统计信息
            const posStats = Object.entries(posCounts)
                .map(([pos, count]) => `${pos}(${count})`)
                .join(', ');

            console.log(`【词性分析】分析结果: 共 ${result.length} 个词，词性分布: ${posStats}`);

            // 输出高权重词汇
            const highWeightWords = result
                .filter(item => item.weight >= 100)
                .map(item => `${item.word}(${item.pos}:${item.weight})`)
                .join(', ');

            if (highWeightWords) {
                console.log(`【词性分析】高权重词汇: ${highWeightWords}`);
            }
        }

        return result;
    }

    /**
     * 处理AI分类结果（支持多分类选项）
     * @param {Object} aiResult - AI分类结果（可能包含多个选项）
     * @param {string} [filename] - 文件名（可选，用于调试）
     * @returns {Object|null} 处理后的分类结果
     */
    processAIClassification(aiResult, filename) {
        if (!aiResult) {
            if (this.classificationSettings.localTokenizer.debug && filename) {
                console.log(`【AI分类】处理失败，文件名: "${filename}"，AI分类结果无效`);
            }
            return null;
        }

        let classificationsToTry = [];

        // 处理多分类选项格式
        if (aiResult.classifications && Array.isArray(aiResult.classifications)) {
            classificationsToTry = aiResult.classifications.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        }
        // 兼容旧的单分类格式
        else if (aiResult.catID) {
            classificationsToTry = [aiResult];
        }
        else {
            return null;
        }

        // 如果需要验证AI返回的分类
        if (this.classificationSettings.validateAIClassification) {
            // 直接使用第一个分类选项（已在file-processor中验证过）
            const classification = classificationsToTry[0];
            if (classification && classification.catID) {
                // 查找对应的术语以获取完整信息
                const term = this.csvMatcher.findTermByCatID(classification.catID);
                if (term) {
                    return {
                        catID: term.catID,
                        catShort: term.catShort,
                        category: term.category,
                        category_zh: term.categoryNameZh,
                        subCategory: term.source,
                        subCategory_zh: term.target,
                        // 保留AI提供的额外信息
                        englishDescription: classification.englishDescription,
                        confidence: classification.confidence
                    };
                }
            }

            return null;
        }

        // 如果不需要验证，返回第一个分类结果
        return classificationsToTry[0] || null;
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
        const originalPosAnalysis = this.analyzePos(filename);

        // 3. 如果提供了翻译文本，分析其词性
        let translatedPosAnalysis = null;
        if (options.translatedText) {
            translatedPosAnalysis = this.analyzePos(options.translatedText);
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
        let allMatches = [];
        try {
            if (this.csvMatcher) {
                allMatches = this.csvMatcher.getAllMatches(
                    filename,
                    originalPosAnalysis,
                    matchOptions
                );
            }
        } catch (error) {
            console.warn(`获取匹配结果失败: ${error.message}`, { filename, error });
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
                        matchResults: allMatches, // 添加所有匹配结果
                        availableMatchCount: allMatches.length // 添加可用匹配结果数量
                    };
                }
            }
        } catch (error) {
            console.error(`匹配失败: ${error.message}`, { filename, error });
        }

        // 8. 如果所有匹配都失败，尝试使用文件名的第一部分（如果有空格）
        if (filename.indexOf(' ') !== -1) {
            try {
                const firstPart = filename.split(' ')[0];

                // 分析第一部分的词性
                const firstPartPosAnalysis = this.analyzePos(firstPart);

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
                if (this.classificationSettings.localTokenizer.debug) {
                    console.warn(`【分类】使用文件名第一部分匹配失败: ${error.message}`, { filename, firstPart, error });
                }
            }
        }

        // 9. 如果所有匹配都失败，返回null
        return null;
    }

    /**
     * 获取分类器状态信息，用于调试
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            initialized: this.initialized,
            dependencies: {
                nlpProcessor: !!this.nlpProcessor,
                chineseTokenizer: !!this.chineseTokenizer,
                nlpAdapter: !!this.nlpAdapter,
                csvMatcher: !!this.csvMatcher
            },
            cache: {
                size: this.posAnalysisCache.size,
                maxSize: this.maxCacheSize
            },
            settings: {
                defaultMatchStrategy: this.classificationSettings.defaultMatchStrategy,
                usePosAnalysis: this.classificationSettings.usePosAnalysis,
                validateAIClassification: this.classificationSettings.validateAIClassification,
                debugMode: this.classificationSettings.localTokenizer.debug
            }
        };
    }

    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.classificationSettings.localTokenizer.debug = enabled;
        console.log(`【设置】调试模式已${enabled ? '启用' : '禁用'}`);
    }

}

// 导出类
window.SmartClassifier = SmartClassifier;