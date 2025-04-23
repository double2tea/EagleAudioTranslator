/**
 * 智能分类器
 * 用于智能分类音效文件，减少硬编码数据依赖
 */
class SmartClassifier {
    /**
     * 构造函数
     * @param {CSVMatcher} csvMatcher - CSV匹配器实例
     */
    constructor(csvMatcher) {
        this.csvMatcher = csvMatcher;
        this.nlpProcessor = null; // 自然语言处理器，用于词性分析
        this.initialized = false;

        // 分类设置
        this.classificationSettings = {
            // 词性优先级 - 数字越大优先级越高
            posWeights: {
                noun: 100,       // 名词优先级最高
                adjective: 80,   // 形容词次之
                verb: 60,        // 动词再次
                adverb: 40,      // 副词优先级较低
                other: 20        // 其他词性优先级最低
            },
            // 默认匹配策略
            defaultMatchStrategy: 'auto', // 'auto', 'ai', 'bilingual', 'pos', 'translated', 'multiWord', 'keyword'
            // 匹配策略优先级
            matchStrategyPriority: [
                'ai',           // AI辅助分类（如果启用）
                'bilingual',     // 双语匹配（中英文结合）
                'pos',          // 基于分词系统的匹配
                'translated',    // 翻译文本直接匹配
                'multiWord',     // 多词匹配
                'keyword'        // 关键词匹配
            ],
            // 是否启用词性分析
            usePosAnalysis: true,
            // 是否验证AI返回的分类
            validateAIClassification: true
        };

        // 初始化
        this.init();
    }

    /**
     * 初始化分类器
     */
    init() {
        try {
            // 初始化compromise.js词性分析器
            this._initNLPProcessor();
            this.initialized = true;
            console.log('智能分类器初始化成功');
        } catch (error) {
            console.error('智能分类器初始化失败:', error);
            this.initialized = false;
        }
    }

    /**
     * 初始化NLP处理器
     * @private
     */
    _initNLPProcessor() {
        try {
            // 检查compromise.js是否可用
            if (typeof nlp === 'undefined') {
                console.error('compromise.js库不可用，将使用备用词性分析器');
                this._initPosAnalyzer();
                return;
            }

            // 检查segmentit分词库是否可用
            if (typeof SegmentitDirect === 'undefined') {
                console.warn('segmentit分词库不可用，中文分词可能不准确');
            } else {
                console.log('segmentit分词库加载成功');
                this.chineseTokenizer = SegmentitDirect;
            }

            // 创建测试文档确认功能正常
            try {
                const testDoc = nlp('test keyboard');
                const testNouns = testDoc.nouns().out('array');
                console.log('英文NLP处理器初始化成功，测试结果:', testNouns);

                if (this.chineseTokenizer) {
                    try {
                        const testChineseResult = this.chineseTokenizer.analyzeGeneral('键盘点击');
                        console.log('中文词性分析器测试结果:', testChineseResult);
                    } catch (e) {
                        console.error('中文词性分析器测试失败:', e);
                    }
                }

                // 设置已初始化标志
                this.nlpProcessor = nlp;
            } catch (error) {
                console.error('NLP测试失败:', error);
                this._initPosAnalyzer();
            }
        } catch (error) {
            console.error('NLP处理器初始化失败:', error);
            // 如果初始化失败，使用备用词性分析器
            this._initPosAnalyzer();
        }
    }

    /**
     * 初始化备用词性分析器
     * @private
     */
    _initPosAnalyzer() {
        // 简单的词性词典
        this.posLexicon = {
            // 常见名词
            nouns: [
                'keyboard', 'mouse', 'computer', 'cat', 'dog', 'bird', 'sheep', 'cow', 'animal',
                'tape', 'cassette', 'paper', 'metal', 'steel', 'glitch', 'beep', 'bleep',
                'click', 'pop', 'hiss', 'static', 'noise', 'sound', 'effect', 'tone',
                'key', 'button', 'trackpad', 'touchpad', 'device', 'hardware',
                '键盘', '鼠标', '电脑', '猫', '狗', '鸟', '羊', '牛', '动物',
                '磁带', '纸', '金属', '钢', '故障', '哔', '噪音', '声音', '效果', '音调',
                '按键', '触控板', '设备', '硬件'
            ],
            // 常见动词
            verbs: [
                'typing', 'clicking', 'pressing', 'tapping', 'hitting', 'recording',
                'playing', 'scratching', 'rubbing', 'moving', 'scrolling',
                '打字', '点击', '按压', '敲击', '击打', '录制', '播放', '刮擦', '摩擦', '移动', '滚动'
            ],
            // 常见形容词
            adjectives: [
                'digital', 'electronic', 'mechanical', 'synthetic', 'sci-fi', 'scifi', 'futuristic',
                'rhythmic', 'glitchy', 'noisy', 'clean', 'clear', 'sharp', 'soft', 'loud',
                '数字', '电子', '机械', '合成', '科幻', '未来', '节奏', '故障', '嘈杂', '清晰', '尖锐', '柔和', '响亮'
            ],
            // 常见副词
            adverbs: [
                'quickly', 'slowly', 'loudly', 'softly', 'repeatedly', 'continuously',
                '快速', '缓慢', '大声', '轻柔', '重复', '连续'
            ]
        };

        // 为了更快的查找，将词典转换为映射
        this.posMap = {};

        // 添加名词
        this.posLexicon.nouns.forEach(word => {
            this.posMap[word.toLowerCase()] = 'noun';
        });

        // 添加动词
        this.posLexicon.verbs.forEach(word => {
            this.posMap[word.toLowerCase()] = 'verb';
        });

        // 添加形容词
        this.posLexicon.adjectives.forEach(word => {
            this.posMap[word.toLowerCase()] = 'adjective';
        });

        // 添加副词
        this.posLexicon.adverbs.forEach(word => {
            this.posMap[word.toLowerCase()] = 'adverb';
        });

        console.log('词性分析器初始化完成，共加载词汇:',
                    Object.keys(this.posMap).length);
    }

    /**
     * 分析文本中的词性
     * @param {string} text - 要分析的文本
     * @returns {Array<Object>} 词性分析结果
     */
    analyzePos(text) {
        if (!text) return [];

        // 如果NLP处理器可用，使用compromise.js进行词性分析
        if (this.nlpProcessor) {
            return this._analyzePosWithNLP(text);
        } else {
            // 否则使用备用词性分析器
            return this._analyzePosWithFallback(text);
        }
    }

    /**
     * 使用NLP工具进行词性分析
     * @param {string} text - 要分析的文本
     * @returns {Array<Object>} 词性分析结果
     * @private
     */
    _analyzePosWithNLP(text) {
        try {
            if (!text || typeof text !== 'string') {
                return [];
            }

            const result = [];

            // 检测是否包含中文字符
            const hasChinese = /[\u4e00-\u9fa5]/.test(text);
            const hasEnglish = /[a-zA-Z]/.test(text);

            // 如果包含中文字符且segmentit分词器可用
            if (hasChinese && typeof SegmentitDirect !== 'undefined' && this.chineseTokenizer) {
                try {
                    // 使用segmentit进行分词和词性分析
                    const chineseResults = this.chineseTokenizer.analyzeGeneral(text);
                    result.push(...chineseResults);
                    console.log('segmentit中文词性分析结果:', chineseResults);
                } catch (e) {
                    console.warn('segmentit中文词性分析失败:', e);
                }
            }

            // 如果包含英文字符且compromise.js可用
            if (hasEnglish && this.nlpProcessor) {
                try {
                    // 先进行基本分词，确保复合词被正确分解
                    const words = text.split(/\s+/);

                    // 对每个单词单独进行NLP处理
                    for (const word of words) {
                        if (!word.trim()) continue;

                        // 创建NLP文档
                        const doc = this.nlpProcessor(word);

                        // 提取名词
                        try {
                            const nouns = doc.nouns().out('array');
                            if (Array.isArray(nouns) && nouns.length > 0) {
                                nouns.forEach(noun => {
                                    if (noun && typeof noun === 'string') {
                                        result.push({
                                            word: noun.toLowerCase(),
                                            pos: 'noun',
                                            weight: this.classificationSettings.posWeights.noun
                                        });
                                    }
                                });
                            }
                        } catch (e) {
                            console.warn('提取名词失败:', e);
                        }

                        // 提取动词
                        try {
                            const verbs = doc.verbs().out('array');
                            if (Array.isArray(verbs) && verbs.length > 0) {
                                verbs.forEach(verb => {
                                    if (verb && typeof verb === 'string') {
                                        // 去除动词可能的后缀如'ing'
                                        const baseVerb = verb.toLowerCase().replace(/ing$/, '');
                                        result.push({
                                            word: baseVerb,
                                            pos: 'verb',
                                            weight: this.classificationSettings.posWeights.verb
                                        });
                                    }
                                });
                            } else if (word.toLowerCase() === 'clink' || word.toLowerCase() === 'tap' ||
                                      word.toLowerCase() === 'knock' || word.toLowerCase() === 'hit') {
                                // 特殊处理一些常见的声音动词
                                result.push({
                                    word: word.toLowerCase(),
                                    pos: 'verb',
                                    weight: this.classificationSettings.posWeights.verb
                                });
                            }
                        } catch (e) {
                            console.warn('提取动词失败:', e);
                        }

                        // 提取形容词
                        try {
                            const adjectives = doc.adjectives().out('array');
                            if (Array.isArray(adjectives) && adjectives.length > 0) {
                                adjectives.forEach(adj => {
                                    if (adj && typeof adj === 'string') {
                                        result.push({
                                            word: adj.toLowerCase(),
                                            pos: 'adjective',
                                            weight: this.classificationSettings.posWeights.adjective
                                        });
                                    }
                                });
                            }
                        } catch (e) {
                            console.warn('提取形容词失败:', e);
                        }

                        // 提取副词
                        try {
                            const adverbs = doc.adverbs().out('array');
                            if (Array.isArray(adverbs) && adverbs.length > 0) {
                                adverbs.forEach(adv => {
                                    if (adv && typeof adv === 'string') {
                                        result.push({
                                            word: adv.toLowerCase(),
                                            pos: 'adverb',
                                            weight: this.classificationSettings.posWeights.adverb
                                        });
                                    }
                                });
                            }
                        } catch (e) {
                            console.warn('提取副词失败:', e);
                        }
                    }
                } catch (e) {
                    console.warn('英文词性分析失败:', e);
                }
            }

            // 如果没有识别到任何词性，添加所有词作为未知词性
            if (result.length === 0) {
                // 将文本分词
                const words = text.split(/\s+/);
                words.forEach(word => {
                    if (word && word.trim()) {
                        // 去除标点符号
                        const cleanWord = word.trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
                        if (cleanWord) {
                            result.push({
                                word: cleanWord,
                                pos: 'other',
                                weight: this.classificationSettings.posWeights.other
                            });
                        }
                    }
                });

                // 处理中文字符
                const chineseChars = text.match(/[\u4e00-\u9fa5]+/g);
                if (chineseChars) {
                    chineseChars.forEach(word => {
                        if (word) {
                            // 默认当作名词
                            result.push({
                                word: word,
                                pos: 'noun',
                                weight: this.classificationSettings.posWeights.noun
                            });
                        }
                    });
                }
            }

            // 去除重复项
            const uniqueResult = [];
            const wordSet = new Set();

            for (const item of result) {
                if (!wordSet.has(item.word)) {
                    wordSet.add(item.word);
                    uniqueResult.push(item);
                }
            }

            // 按权重排序，高权重在前
            uniqueResult.sort((a, b) => b.weight - a.weight);

            return uniqueResult;
        } catch (error) {
            console.error('使用NLP处理器分析词性失败:', error);
            // 如果失败，使用备用分析器
            return this._analyzePosWithFallback(text);
        }
    }

    /**
     * 使用备用分析器进行词性分析
     * @param {string} text - 要分析的文本
     * @returns {Array<Object>} 词性分析结果
     * @private
     */
    _analyzePosWithFallback(text) {
        // 分词
        const words = text.toLowerCase().split(/\s+/);
        const result = [];

        // 分析每个词的词性
        for (let i = 0; i < words.length; i++) {
            const word = words[i].trim();
            if (!word) continue;

            // 去除标点符号
            const cleanWord = word.replace(/[^\w\u4e00-\u9fa5]/g, '');
            if (!cleanWord) continue;

            // 查找词性
            const pos = this.posMap[cleanWord] || 'other';

            result.push({
                word: cleanWord,
                pos: pos,
                weight: this.classificationSettings.posWeights[pos] || this.classificationSettings.posWeights.other,
                index: i
            });
        }

        // 按权重排序，高权重在前
        result.sort((a, b) => b.weight - a.weight);

        return result;
    }

    /**
     * 验证AI返回的分类是否在CSV表格中存在
     * @param {Object} aiClassification - AI返回的分类信息
     * @returns {boolean} 是否有效
     */
    validateCatID(catID) {
        if (!catID || !this.csvMatcher || !this.csvMatcher.loaded) {
            return false;
        }

        // 检查CatID是否在CSV表格中存在
        for (let i = 0; i < this.csvMatcher.terms.length; i++) {
            if (this.csvMatcher.terms[i].catID === catID) {
                return true;
            }
        }

        return false;
    }

    /**
     * 基于文件名中的关键词进行CSV匹配
     * @param {string} filename - 文件名
     * @returns {Object|null} 匹配结果
     */
    matchByKeywords(filename) {
        if (!filename || !this.csvMatcher || !this.csvMatcher.loaded) {
            return null;
        }

        // 分析词性
        const posAnalysis = this.analyzePos(filename);

        // 如果没有分析结果，返回null
        if (posAnalysis.length === 0) {
            return null;
        }

        // 收集所有可能的匹配结果
        const matches = [];

        // 按词性优先级尝试匹配
        for (const wordInfo of posAnalysis) {
            // 尝试使用当前词进行匹配
            for (let i = 0; i < this.csvMatcher.terms.length; i++) {
                const term = this.csvMatcher.terms[i];

                // 检查术语源是否包含当前词
                if (term.source.toLowerCase().includes(wordInfo.word)) {
                    matches.push({
                        term: term,
                        score: wordInfo.weight * (term.source.length / filename.length),
                        matchType: 'keyword_' + wordInfo.pos,
                        word: wordInfo.word
                    });
                }

                // 检查同义词是否包含当前词
                if (term.synonyms && term.synonyms.toLowerCase().includes(wordInfo.word)) {
                    matches.push({
                        term: term,
                        score: wordInfo.weight * 0.8 * (term.synonyms.length / filename.length),
                        matchType: 'synonym_' + wordInfo.pos,
                        word: wordInfo.word
                    });
                }
            }
        }

        // 如果没有匹配结果，返回null
        if (matches.length === 0) {
            return null;
        }

        // 按分数排序，高分在前
        matches.sort((a, b) => b.score - a.score);

        // 返回最高分的匹配结果
        return matches[0].term;
    }

    /**
     * 多词匹配算法
     * @param {string} filename - 文件名
     * @returns {Object|null} 匹配结果
     */
    multiWordMatch(filename) {
        if (!filename || !this.csvMatcher || !this.csvMatcher.loaded) {
            return null;
        }

        // 分析词性
        const posAnalysis = this.analyzePos(filename);

        // 如果没有分析结果，返回null
        if (posAnalysis.length === 0) {
            return null;
        }

        // 收集所有可能的匹配结果
        const matches = [];

        // 尝试使用多个词进行匹配
        // 首先，按词性权重排序，优先使用名词
        const sortedWords = posAnalysis.slice().sort((a, b) => b.weight - a.weight);

        // 从高权重词开始，尝试组合匹配
        for (let i = 0; i < sortedWords.length; i++) {
            const primaryWord = sortedWords[i];

            // 单词匹配
            const singleMatches = this._matchSingleWord(primaryWord.word);
            if (singleMatches.length > 0) {
                singleMatches.forEach(match => {
                    matches.push({
                        term: match.term,
                        score: primaryWord.weight * match.score,
                        matchType: 'single_' + primaryWord.pos,
                        words: [primaryWord.word]
                    });
                });
            }

            // 尝试与其他词组合
            for (let j = 0; j < sortedWords.length; j++) {
                if (i === j) continue; // 跳过自身

                const secondaryWord = sortedWords[j];

                // 组合两个词进行匹配
                const combinedMatches = this._matchWordCombination([primaryWord.word, secondaryWord.word]);
                if (combinedMatches.length > 0) {
                    combinedMatches.forEach(match => {
                        matches.push({
                            term: match.term,
                            score: (primaryWord.weight + secondaryWord.weight * 0.5) * match.score,
                            matchType: 'combined_' + primaryWord.pos + '_' + secondaryWord.pos,
                            words: [primaryWord.word, secondaryWord.word]
                        });
                    });
                }
            }
        }

        // 如果没有匹配结果，返回null
        if (matches.length === 0) {
            return null;
        }

        // 按分数排序，高分在前
        matches.sort((a, b) => b.score - a.score);

        // 返回最高分的匹配结果
        return matches[0].term;
    }

    /**
     * 匹配单个词
     * @param {string} word - 要匹配的词
     * @returns {Array<Object>} 匹配结果
     * @private
     */
    _matchSingleWord(word) {
        const matches = [];

        for (let i = 0; i < this.csvMatcher.terms.length; i++) {
            const term = this.csvMatcher.terms[i];

            // 精确匹配
            if (term.source.toLowerCase() === word) {
                matches.push({
                    term: term,
                    score: 1.0,
                    matchType: 'exact'
                });
            }
            // 包含匹配
            else if (term.source.toLowerCase().includes(word)) {
                matches.push({
                    term: term,
                    score: 0.8 * (word.length / term.source.length),
                    matchType: 'contains'
                });
            }
            // 同义词匹配
            else if (term.synonyms && term.synonyms.toLowerCase().includes(word)) {
                matches.push({
                    term: term,
                    score: 0.6,
                    matchType: 'synonym'
                });
            }
        }

        return matches;
    }

    /**
     * 匹配词组合
     * @param {Array<string>} words - 要匹配的词数组
     * @returns {Array<Object>} 匹配结果
     * @private
     */
    _matchWordCombination(words) {
        const matches = [];

        for (let i = 0; i < this.csvMatcher.terms.length; i++) {
            const term = this.csvMatcher.terms[i];
            const termLower = term.source.toLowerCase();

            // 计算匹配分数
            let matchScore = 0;
            let matchedWords = 0;

            for (const word of words) {
                if (termLower.includes(word)) {
                    matchScore += word.length / termLower.length;
                    matchedWords++;
                }
            }

            // 如果至少匹配了一个词
            if (matchedWords > 0) {
                // 匹配的词越多，分数越高
                const finalScore = matchScore * (matchedWords / words.length);

                matches.push({
                    term: term,
                    score: finalScore,
                    matchType: 'combination',
                    matchedCount: matchedWords
                });
            }
        }

        return matches;
    }

    /**
     * 处理AI分类结果
     * @param {Object} aiClassification - AI返回的分类信息
     * @param {string} filename - 文件名
     * @returns {Object} 处理后的分类信息
     */
    processAIClassification(aiClassification, filename) {
        if (!aiClassification || !filename) {
            return null;
        }

        // 如果不需要验证AI分类，直接返回
        if (!this.classificationSettings.validateAIClassification) {
            return aiClassification;
        }

        // 验证AI返回的CatID是否有效
        const validCatID = this.validateCatID(aiClassification.catID);

        if (validCatID) {
            console.log(`AI分类结果验证通过: ${filename} -> ${aiClassification.catID}`);
            return aiClassification;
        }

        console.warn(`AI分类结果验证失败: ${filename} -> ${aiClassification.catID}，尝试使用智能匹配`);

        // 分析文件名的词性
        const posAnalysis = this.analyzePos(filename);

        // 如果有词性分析结果，使用基于分词系统的匹配
        if (posAnalysis && posAnalysis.length > 0 && this.csvMatcher) {
            // 使用CSV匹配器的findMatch方法，传入词性分析结果
            const matchResult = this.csvMatcher.findMatch(filename, posAnalysis);

            if (matchResult) {
                console.log(`使用基于分词系统的匹配成功: ${filename} -> ${matchResult.catID}`);

                return {
                    catID: matchResult.catID,
                    catShort: matchResult.catShort,
                    category: matchResult.category,
                    category_zh: matchResult.categoryNameZh,
                    subCategory: matchResult.source,
                    subCategory_zh: matchResult.target
                };
            }
        }

        // 如果基于分词系统的匹配失败，回退到传统的多词匹配算法
        const matchResult = this.multiWordMatch(filename);

        if (matchResult) {
            console.log(`使用多词匹配算法匹配成功: ${filename} -> ${matchResult.catID}`);

            // 创建新的分类信息
            return {
                catID: matchResult.catID,
                catShort: matchResult.catShort,
                category: matchResult.category,
                category_zh: matchResult.categoryNameZh,
                subCategory: matchResult.source,
                subCategory_zh: matchResult.target
            };
        }

        // 如果多词匹配失败，尝试使用单词匹配
        const keywordMatch = this.matchByKeywords(filename);

        if (keywordMatch) {
            console.log(`使用关键词匹配算法匹配成功: ${filename} -> ${keywordMatch.catID}`);

            // 创建新的分类信息
            return {
                catID: keywordMatch.catID,
                catShort: keywordMatch.catShort,
                category: keywordMatch.category,
                category_zh: keywordMatch.categoryNameZh,
                subCategory: keywordMatch.source,
                subCategory_zh: keywordMatch.target
            };
        }

        // 如果所有匹配都失败，返回null
        console.warn(`所有匹配算法都失败: ${filename}`);
        return null;
    }

    /**
     * 分类文件
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
        console.log(`使用匹配策略: ${matchStrategy}`);

        // 如果提供了AI分类结果，先处理它
        if (aiClassification && (matchStrategy === 'auto' || matchStrategy === 'ai')) {
            const processedAIResult = this.processAIClassification(aiClassification, filename);
            if (processedAIResult) {
                return processedAIResult;
            }
        }

        // 分析原始文件名的词性
        const originalPosAnalysis = this.analyzePos(filename);

        // 如果提供了翻译文本，分析其词性
        let translatedPosAnalysis = null;
        if (options.translatedText) {
            translatedPosAnalysis = this.analyzePos(options.translatedText);
        }

        // 使用双语匹配
        if ((matchStrategy === 'auto' || matchStrategy === 'bilingual') &&
            options.translatedText && this.csvMatcher) {

            // 准备双语匹配选项
            const bilingualOptions = {
                translatedText: options.translatedText,
                translatedPosAnalysis: translatedPosAnalysis
            };

            try {
                // 使用CSV匹配器的identifyCategory方法，传入双语匹配选项
                const catID = await this.csvMatcher.identifyCategory(filename, null, originalPosAnalysis, bilingualOptions);

                if (catID) {
                    // 查找对应的术语
                    const term = this.csvMatcher.findTermByCatID(catID);
                    if (term) {
                        console.log(`使用双语匹配成功: ${filename} -> ${catID}`);

                        return {
                            catID: term.catID,
                            catShort: term.catShort,
                            category: term.category,
                            category_zh: term.categoryNameZh,
                            subCategory: term.source,
                            subCategory_zh: term.target
                        };
                    }
                }
            } catch (error) {
                console.error('双语匹配失败:', error);
            }
        }

        // 使用基于分词系统的匹配
        if ((matchStrategy === 'auto' || matchStrategy === 'pos') &&
            originalPosAnalysis && originalPosAnalysis.length > 0 && this.csvMatcher) {

            // 使用CSV匹配器的findMatch方法，传入词性分析结果
            const matchResult = this.csvMatcher.findMatch(filename, originalPosAnalysis);

            if (matchResult) {
                console.log(`使用基于分词系统的匹配成功: ${filename} -> ${matchResult.catID}`);

                return {
                    catID: matchResult.catID,
                    catShort: matchResult.catShort,
                    category: matchResult.category,
                    category_zh: matchResult.categoryNameZh,
                    subCategory: matchResult.source,
                    subCategory_zh: matchResult.target
                };
            }
        }

        // 使用翻译文本直接匹配
        if ((matchStrategy === 'auto' || matchStrategy === 'translated') &&
            options.translatedText && this.csvMatcher) {

            // 直接使用翻译文本进行匹配
            const translatedMatchResult = this.csvMatcher.findMatch(options.translatedText, translatedPosAnalysis);

            if (translatedMatchResult) {
                console.log(`使用翻译文本直接匹配成功: ${options.translatedText} -> ${translatedMatchResult.catID}`);

                return {
                    catID: translatedMatchResult.catID,
                    catShort: translatedMatchResult.catShort,
                    category: translatedMatchResult.category,
                    category_zh: translatedMatchResult.categoryNameZh,
                    subCategory: translatedMatchResult.source,
                    subCategory_zh: translatedMatchResult.target
                };
            }
        }

        // 使用多词匹配算法
        if (matchStrategy === 'auto' || matchStrategy === 'multiWord') {
            console.log(`尝试使用多词匹配算法: ${filename}`);

            const multiWordResult = this.multiWordMatch(filename);
            if (multiWordResult) {
                return {
                    catID: multiWordResult.catID,
                    catShort: multiWordResult.catShort,
                    category: multiWordResult.category,
                    category_zh: multiWordResult.categoryNameZh,
                    subCategory: multiWordResult.source,
                    subCategory_zh: multiWordResult.target
                };
            }
        }

        // 使用关键词匹配
        if (matchStrategy === 'auto' || matchStrategy === 'keyword') {
            console.log(`尝试使用关键词匹配算法: ${filename}`);

            const keywordResult = this.matchByKeywords(filename);
            if (keywordResult) {
                return {
                    catID: keywordResult.catID,
                    catShort: keywordResult.catShort,
                    category: keywordResult.category,
                    category_zh: keywordResult.categoryNameZh,
                    subCategory: keywordResult.source,
                    subCategory_zh: keywordResult.target
                };
            }
        }

        // 如果所有匹配都失败，返回null
        console.warn(`所有匹配策略都失败: ${filename}`);
        return null;
    }
}

// 导出类
window.SmartClassifier = SmartClassifier;
