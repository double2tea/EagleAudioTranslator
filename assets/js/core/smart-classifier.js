/**
 * 智能分类器
 * 用于智能分类音效文件，减少硬编码数据依赖
 */
class SmartClassifier {
    /**
     * 构造函数
     * @param {CSVMatcher|FuseMatcher} csvMatcher - 匹配器实例
     */
    constructor(csvMatcher) {
        this.csvMatcher = csvMatcher;
        this.nlpProcessor = null; // 自然语言处理器，用于词性分析
        this.initialized = false;
        this.aliyunNLPAdapter = null; // 阿里云NLP服务适配器

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
            defaultMatchStrategy: 'auto', // 'auto', 'ai', 'bilingual', 'pos', 'translated', 'aliyun'
            // 匹配策略优先级
            matchStrategyPriority: [
                'auto',         // 自动模式（按优先级）
                'ai',           // AI辅助分类（如果启用）
                'aliyun',       // 阿里云NLP服务（如果启用）
                'bilingual',     // 双语匹配（中英文结合）
                'pos',          // 基于分词系统的匹配
                'translated'     // 翻译文本直接匹配
            ],
            // 是否启用词性分析
            usePosAnalysis: true,
            // 是否验证AI返回的分类
            validateAIClassification: true,
            // 阿里云NLP服务配置
            aliyunNLP: {
                enabled: false,  // 是否启用阿里云NLP服务
                accessKeyId: '', // 阿里云AccessKey ID
                accessKeySecret: '', // 阿里云AccessKey Secret
                debug: false     // 是否开启调试模式
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
                        debug: this.classificationSettings.aliyunNLP.debug
                    };

                    // 使用阿里云NLP适配器
                    if (typeof AliyunNLPAdapter !== 'undefined') {
                        console.log('使用阿里云NLP适配器');
                        this.aliyunNLPAdapter = new AliyunNLPAdapter(options);
                    }
                    else {
                        console.error('未找到阿里云NLP适配器');
                        this.aliyunNLPAdapter = null;
                    }

                    if (this.aliyunNLPAdapter) {
                        console.log('阿里云NLP适配器初始化状态:', this.aliyunNLPAdapter.initialized);
                    }
                } catch (error) {
                    console.error('阿里云NLP适配器初始化失败:', error);
                    console.error('错误详情:', error.message, error.stack);
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
     * 使用analyzeGeneral方法作为回退方案
     * @param {string} text - 要分析的文本
     * @param {Array} result - 结果数组
     * @private
     */
    useFallbackChineseTokenizer(text, result) {
        try {
            // 直接使用segmentit进行分词
            this.useFallbackSegmentit(text, result);
        } catch (error) {
            console.error('分词器回退方法失败:', error);
            // 最后的回退：使用简单的字符分割
            this.useSimpleCharSplit(text, result);
        }
    }

    /**
     * 使用segmentit作为回退方案
     * @param {string} text - 要分析的文本
     * @param {Array} result - 结果数组
     * @private
     */
    useFallbackSegmentit(text, result) {
        try {
            // 尝试使用tag方法获取更细粒度的分词结果
            if (typeof this.chineseTokenizer.tag === 'function') {
                try {
                    // 使用tag方法获取原始分词结果
                    const tagResults = this.chineseTokenizer.tag(text);
                    console.log('中文分词器tag方法原始输出:', tagResults);

                    // 过滤停用词
                    const chineseStopWords = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);

                    // 处理分词结果
                    tagResults.forEach(item => {
                        if (item && item.w && !chineseStopWords.has(item.w)) {
                            // 获取通用词性，并输出详细信息
                            let generalPos;
                            if (this.chineseTokenizer.mapPOSToGeneral) {
                                generalPos = this.chineseTokenizer.mapPOSToGeneral(item.p);
                                console.log(`词 "${item.w}" 的原始词性标签: ${item.p}, 映射后的词性: ${generalPos}`);
                            } else {
                                // 基本映射
                                if (item.p === 'a') {
                                    generalPos = 'adjective';
                                    console.log(`词 "${item.w}" 被映射为形容词(adjective)`);
                                } else if (item.p === 'v') {
                                    generalPos = 'verb';
                                    console.log(`词 "${item.w}" 被映射为动词(verb)`);
                                } else if (item.p === 'd') {
                                    generalPos = 'adverb';
                                    console.log(`词 "${item.w}" 被映射为副词(adverb)`);
                                } else if (item.p === 'n' || item.p === 'nr' || item.p === 'ns' || item.p === 'nt') {
                                    generalPos = 'noun';
                                    console.log(`词 "${item.w}" 被映射为名词(noun)`);
                                } else {
                                    generalPos = 'other';
                                    console.log(`词 "${item.w}" 使用默认词性:其他(other)，原始标签: ${item.p}`);
                                }
                            }

                            // 获取权重
                            const weight = this.classificationSettings.posWeights[generalPos] ||
                                (generalPos === 'noun' ? 120 :
                                 generalPos === 'verb' ? 100 :
                                 generalPos === 'adjective' ? 80 :
                                 generalPos === 'adverb' ? 60 : 20);

                            result.push({
                                word: item.w,
                                pos: generalPos,
                                weight: weight
                            });
                        }
                    });

                    // 如果tag方法没有返回结果，使用analyzeGeneral方法
                    if (result.length === 0) {
                        this.useAnalyzeGeneral(text, result);
                    }
                } catch (tagError) {
                    console.warn('中文分词器tag方法失败，使用analyzeGeneral:', tagError);
                    this.useAnalyzeGeneral(text, result);
                }
            } else {
                // 如果没有tag方法，使用analyzeGeneral方法
                this.useAnalyzeGeneral(text, result);
            }
        } catch (error) {
            console.error('segmentit分词器失败:', error);
            // 最后的回退：使用简单的字符分割
            this.useSimpleCharSplit(text, result);
        }
    }

    /**
     * 使用analyzeGeneral方法
     * @param {string} text - 要分析的文本
     * @param {Array} result - 结果数组
     * @private
     */
    useAnalyzeGeneral(text, result) {
        try {
            // 使用analyzeGeneral方法获取基本分词结果
            const chineseResults = this.chineseTokenizer.analyzeGeneral(text);
            console.log('中文分词器analyzeGeneral方法原始输出:', chineseResults);

            // 过滤停用词
            const chineseStopWords = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);

            // 添加基本分词结果
            chineseResults.forEach(item => {
                if (item && item.word && !chineseStopWords.has(item.word)) {
                    // 输出原始词性信息
                    console.log(`词 "${item.word}" 的原始词性标签: ${item.pos || 'unknown'}`);

                    result.push({
                        word: item.word,
                        pos: item.pos || 'noun',
                        weight: this.classificationSettings.posWeights[item.pos] || 100
                    });

                    // 输出最终使用的词性
                    console.log(`词 "${item.word}" 最终使用的词性: ${item.pos || 'noun'}`);

                }
            });

            // 如果analyzeGeneral方法没有返回结果，使用简单的字符分割
            if (result.length === 0) {
                this.useSimpleCharSplit(text, result);
            }
        } catch (error) {
            console.warn('中文分词器analyzeGeneral方法失败:', error);
            this.useSimpleCharSplit(text, result);
        }
    }

    /**
     * 使用简单的字符分割作为最后的回退方案
     * @param {string} text - 要分析的文本
     * @param {Array} result - 结果数组
     * @private
     */
    useSimpleCharSplit(text, result) {
        console.log('使用简单的字符分割作为最后的回退方案');

        // 过滤停用词
        const chineseStopWords = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);

        // 将文本拆分为单个字符
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // 跳过停用词和标点符号
            if (!chineseStopWords.has(char) && !/[\s\p{P}]/u.test(char)) {
                result.push({
                    word: char,
                    pos: 'noun', // 默认为名词
                    weight: 100
                });
            }
        }
    }

    /**
     * 使用阿里云NLP服务进行分词和词性分析
     * 根据配置选择不同的分词方法
     * @param {string} text - 要分析的文本
     * @param {Array} result - 结果数组
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否成功使用阿里云NLP服务
     * @private
     */
    async useAliyunNLP(text, result, options = {}) {
        console.log(`【词性分析】尝试使用阿里云NLP服务进行分词和词性分析: "${text}"`);

        // 检查文本是否包含中文
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);

        // 检查文本是否包含英文
        const hasEnglish = /[a-zA-Z]/.test(text);

        console.log(`【词性分析】文本语言检测: 包含中文=${hasChinese}, 包含英文=${hasEnglish}`);

        // 如果既不包含中文也不包含英文，跳过处理
        if (!hasChinese && !hasEnglish) {
            console.log(`【词性分析】文本不包含中文或英文，跳过阿里云NLP处理: "${text}"`);
            return false;
        }

        // 检查适配器是否可用
        if (!this.aliyunNLPAdapter) {
            console.error('【词性分析】阿里云NLP适配器不存在');
            return false;
        }

        if (!this.aliyunNLPAdapter.initialized) {
            console.warn('【词性分析】阿里云NLP适配器未初始化');

            // 尝试初始化适配器
            try {
                if (typeof this.aliyunNLPAdapter.init === 'function') {
                    await this.aliyunNLPAdapter.init();
                    console.log('【词性分析】阿里云NLP适配器初始化成功');
                } else {
                    console.error('【词性分析】阿里云NLP适配器没有init方法');
                    return false;
                }
            } catch (error) {
                console.error('【词性分析】阿里云NLP适配器初始化失败:', error);
                return false;
            }
        }

        try {
            console.log(`【词性分析】阿里云NLP适配器状态: 初始化=${this.aliyunNLPAdapter.initialized}, 启用=${this.aliyunNLPAdapter.options.enabled}`);

            // 获取分词器配置
            const tokenizerConfig = options.tokenizer || this.classificationSettings.aliyunNLP?.tokenizer || {
                useBasicChinese: true,
                useAdvancedChinese: false,
                useMultiLanguage: false
            };

            console.log(`【词性分析】分词器配置:`, tokenizerConfig);

            // 更新适配器的分词器配置
            if (this.aliyunNLPAdapter.options && this.aliyunNLPAdapter.options.tokenizer) {
                this.aliyunNLPAdapter.options.tokenizer = {
                    ...this.aliyunNLPAdapter.options.tokenizer,
                    ...tokenizerConfig
                };
                console.log(`【词性分析】已更新适配器分词器配置:`, this.aliyunNLPAdapter.options.tokenizer);
            }

            // 使用阿里云NLP服务进行词性分析
            console.log(`【词性分析】调用阿里云NLP服务进行词性分析: "${text}"`);

            try {
                // 使用配置的分词方法处理文本
                const posResult = await this.aliyunNLPAdapter.analyzePos(text);
                console.log(`【词性分析】阿里云NLP服务词性分析结果:`, posResult);

                if (posResult && posResult.length > 0) {
                    // 将阿里云NLP的结果添加到结果数组中
                    // 注意：不清空原有结果，因为可能已经包含了其他分析结果
                    result.push(...posResult);
                    console.log(`【词性分析】阿里云NLP服务词性分析成功，结果数量: ${posResult.length}`);
                    return true;
                } else {
                    console.warn(`【词性分析】阿里云NLP服务词性分析返回空结果`);
                    return false;
                }
            } catch (apiError) {
                // 如果是因为特定错误，记录详细信息
                if (apiError.message) {
                    console.log(`【词性分析】阿里云NLP服务错误信息: ${apiError.message}`);

                    // 如果是多语言分词失败的错误，这可能是预期的行为
                    if (apiError.message.includes('多语言分词失败') ||
                        apiError.message.includes('未启用多语言分词')) {
                        console.log(`【词性分析】阿里云NLP服务多语言分词失败或未启用，这可能是预期的行为`);

                        // 如果是纯英文文本，让调用者使用本地处理
                        if (hasEnglish && !hasChinese) {
                            return false;
                        }
                    }
                }

                console.error(`【词性分析】阿里云NLP服务API调用失败:`, apiError);
                return false;
            }
        } catch (error) {
            console.error(`【词性分析】阿里云NLP服务词性分析出错:`, error);
            console.warn(`【词性分析】阿里云NLP服务词性分析失败，将使用备选方案`);
            return false;
        }
    }

    /**
     * 分析文本中的词性
     * @param {string} text - 要分析的文本
     * @returns {Promise<Array<Object>>} 词性分析结果
     */
    async analyzePos(text) {
        if (!text) return [];

        const result = [];

        // 检测是否包含中文字符
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);

        // 检测是否包含英文字符
        const hasEnglish = /[a-zA-Z]/.test(text);

        console.log(`【词性分析】文本语言检测: 包含中文=${hasChinese}, 包含英文=${hasEnglish}`);

        // 尝试使用阿里云NLP高级版API处理文本（中英文）
        let aliyunSuccess = false;

        // 如果文本包含中文或英文，尝试使用阿里云NLP服务
        if (hasChinese || hasEnglish) {
            try {
                console.log(`【词性分析】尝试使用阿里云NLP高级版API处理文本: "${text}"`);

                // 检查是否启用了阿里云NLP服务
                const aliyunEnabled = this.classificationSettings.aliyunNLP?.enabled || false;
                const hasAccessKey = !!(this.classificationSettings.aliyunNLP?.accessKeyId &&
                                      this.classificationSettings.aliyunNLP?.accessKeySecret);

                console.log(`【词性分析】阿里云NLP服务状态: 启用=${aliyunEnabled}, 有AccessKey=${hasAccessKey}`);

                // 强制创建阿里云NLP适配器（如果不存在）
                if (aliyunEnabled && hasAccessKey && !this.aliyunNLPAdapter) {
                    console.log(`【词性分析】阿里云NLP适配器不存在，尝试创建`);

                    try {
                        if (typeof AliyunNLPAdapter !== 'undefined') {
                            this.aliyunNLPAdapter = new AliyunNLPAdapter({
                                accessKeyId: this.classificationSettings.aliyunNLP.accessKeyId,
                                accessKeySecret: this.classificationSettings.aliyunNLP.accessKeySecret,
                                enabled: true,
                                debug: true
                            });

                            // 初始化适配器
                            if (typeof this.aliyunNLPAdapter.init === 'function') {
                                await this.aliyunNLPAdapter.init();
                            }

                            console.log(`【词性分析】成功创建阿里云NLP适配器，初始化状态: ${this.aliyunNLPAdapter.initialized}`);
                        } else {
                            console.error(`【词性分析】未找到AliyunNLPAdapter类`);
                        }
                    } catch (initError) {
                        console.error(`【词性分析】创建阿里云NLP适配器失败:`, initError);
                    }
                }

                if (aliyunEnabled && hasAccessKey && this.aliyunNLPAdapter) {
                    // 确保适配器已初始化
                    if (!this.aliyunNLPAdapter.initialized && typeof this.aliyunNLPAdapter.init === 'function') {
                        console.log(`【词性分析】阿里云NLP适配器未初始化，尝试初始化`);
                        await this.aliyunNLPAdapter.init();
                    }

                    console.log(`【词性分析】阿里云NLP适配器状态: 初始化=${this.aliyunNLPAdapter.initialized}`);

                    // 获取分词器配置
                    const tokenizerConfig = this.classificationSettings.aliyunNLP?.tokenizer || {
                        useBasicChinese: true,
                        useAdvancedChinese: false,
                        useMultiLanguage: false
                    };

                    console.log(`【词性分析】使用分词器配置:`, tokenizerConfig);

                    // 尝试使用阿里云NLP服务处理文本，传递分词器配置
                    aliyunSuccess = await this.useAliyunNLP(text, result, { tokenizer: tokenizerConfig });

                    if (aliyunSuccess) {
                        console.log(`【词性分析】阿里云NLP服务处理成功: "${text}"`);
                    } else {
                        console.warn(`【词性分析】阿里云NLP服务处理失败，将使用备选方案`);
                    }
                } else {
                    console.log(`【词性分析】阿里云NLP服务未启用、缺少AccessKey或适配器创建失败，跳过阿里云NLP服务`);
                }
            } catch (error) {
                console.warn(`【词性分析】阿里云NLP高级版API处理出错: "${text}"`, error);
            }
        }

        // 如果阿里云NLP服务失败或未启用，使用本地处理
        // 对于英文部分，使用compromise处理
        if (!aliyunSuccess && hasEnglish && this.nlpProcessor) {
            try {
                console.log(`【词性分析】使用本地compromise处理英文部分: "${text}"`);

                // 提取英文部分（包括数字和标点）
                let englishText = '';
                for (let i = 0; i < text.length; i++) {
                    if (/[a-zA-Z0-9\s\p{P}]/u.test(text[i]) && !/[\u4e00-\u9fa5]/u.test(text[i])) {
                        englishText += text[i];
                    }
                }

                // 预处理英文文本，将下划线替换为空格，以便更好地分词
                englishText = englishText.replace(/_/g, ' ');

                if (englishText.trim().length > 0) {
                    console.log(`【词性分析】预处理后的英文文本: "${englishText}"`);

                    // 使用compromise处理英文
                    const doc = this.nlpProcessor(englishText);

                    // 常见的虚词集合，用于过滤
                    const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'as']);

                    // 使用compromise的词性标注功能
                    try {
                        // 获取所有词条
                        const allTerms = doc.terms();

                        // 提取名词
                        try {
                            const nouns = allTerms.match('#Noun').not('#Determiner').not('#Pronoun').out('array');
                            console.log('【词性分析】英文名词:', nouns);

                            nouns.forEach(noun => {
                                if (noun && noun.trim() && !stopWords.has(noun.toLowerCase())) {
                                    result.push({
                                        word: noun.toLowerCase().trim(),
                                        pos: 'noun',
                                        weight: this.classificationSettings.posWeights.noun
                                    });
                                }
                            });
                        } catch (nounError) {
                            console.warn('【词性分析】提取英文名词失败:', nounError);
                        }

                        // 提取形容词
                        try {
                            const adjectives = allTerms.match('#Adjective').out('array');
                            console.log('【词性分析】英文形容词:', adjectives);

                            adjectives.forEach(adj => {
                                if (adj && adj.trim() && !stopWords.has(adj.toLowerCase())) {
                                    result.push({
                                        word: adj.toLowerCase().trim(),
                                        pos: 'adjective',
                                        weight: this.classificationSettings.posWeights.adjective
                                    });
                                }
                            });
                        } catch (adjError) {
                            console.warn('【词性分析】提取英文形容词失败:', adjError);
                        }

                        // 提取动词
                        try {
                            const verbs = allTerms.match('#Verb').not('#Auxiliary').out('array');
                            console.log('【词性分析】英文动词:', verbs);

                            verbs.forEach(verb => {
                                if (verb && verb.trim() && !stopWords.has(verb.toLowerCase())) {
                                    result.push({
                                        word: verb.toLowerCase().trim(),
                                        pos: 'verb',
                                        weight: this.classificationSettings.posWeights.verb
                                    });
                                }
                            });
                        } catch (verbError) {
                            console.warn('【词性分析】提取英文动词失败:', verbError);
                        }

                        // 提取副词
                        try {
                            const adverbs = allTerms.match('#Adverb').out('array');
                            console.log('【词性分析】英文副词:', adverbs);

                            adverbs.forEach(adv => {
                                if (adv && adv.trim() && !stopWords.has(adv.toLowerCase())) {
                                    result.push({
                                        word: adv.toLowerCase().trim(),
                                        pos: 'adverb',
                                        weight: this.classificationSettings.posWeights.adverb
                                    });
                                }
                            });
                        } catch (advError) {
                            console.warn('【词性分析】提取英文副词失败:', advError);
                        }

                        console.log('【词性分析】本地英文词性分析结果:', result);
                    } catch (termsError) {
                        console.warn('【词性分析】英文词性分析失败:', termsError);
                    }
                }
            } catch (error) {
                console.warn(`【词性分析】使用compromise处理英文部分失败:`, error);
            }
        }

        // 如果阿里云NLP服务失败且包含中文，使用本地分词器处理中文部分
        if (!aliyunSuccess && hasChinese) {
            try {
                console.log(`【词性分析】使用本地分词器处理中文部分: "${text}"`);

                // 使用Intl.Segmenter进行中文分词
                this.useIntlSegmenter(text, result);

                // 过滤中文停用词
                const chineseStopWords = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);
                for (let i = 0; i < result.length; i++) {
                    if (chineseStopWords.has(result[i].word)) {
                        result.splice(i, 1);
                        i--; // 调整索引
                    }
                }
            } catch (e) {
                console.warn('【词性分析】本地中文分词失败:', e);
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

        // 应用过滤规则
        const filteredResult = this.filterPosResults(uniqueResult);

        console.log(`【词性分析】最终词性分析结果: ${filteredResult.length}个词`);
        return filteredResult;
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
            console.log('【词性过滤】过滤功能已禁用，返回原始结果');
            return posResults;
        }

        const settings = this.classificationSettings.filterSettings;
        console.log('【词性过滤】开始过滤，原始结果数量:', posResults.length);
        console.log('【词性过滤】过滤设置:', settings);

        const filteredResults = posResults.filter(item => {
            // 过滤标点符号
            if (settings.filterPunctuation &&
                item.pos === 'punctuation' &&
                item.weight <= settings.punctuationWeightThreshold) {
                console.log(`【词性过滤】过滤标点符号: "${item.word}"`);
                return false;
            }

            // 过滤单独的数字
            if (settings.filterNumbers &&
                /^\d+$/.test(item.word) &&
                item.weight <= settings.numberWeightThreshold) {
                console.log(`【词性过滤】过滤数字: "${item.word}"`);
                return false;
            }

            // 过滤功能词
            if (settings.filterFunctionWords) {
                // 中文功能词
                const chineseStopWords = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);
                // 英文功能词
                const englishStopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'as']);

                if (chineseStopWords.has(item.word) || englishStopWords.has(item.word.toLowerCase())) {
                    console.log(`【词性过滤】过滤功能词: "${item.word}"`);
                    return false;
                }
            }

            // 保留其他所有词
            return true;
        });

        console.log('【词性过滤】过滤后结果数量:', filteredResults.length);
        return filteredResults;
    }

    /**
     * 使用Intl.Segmenter进行中文分词
     * @param {string} text - 要分析的文本
     * @param {Array} result - 结果数组
     * @private
     */
    useIntlSegmenter(text, result) {
        try {
            // 检查Intl.Segmenter是否可用
            if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
                console.log('使用Intl.Segmenter进行中文分词');

                // 创建中文分词器，使用"word"粒度
                const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
                const segments = segmenter.segment(text);

                // 简化日志输出
                console.log('Intl.Segmenter分词完成');

                // 过滤停用词
                const chineseStopWords = new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']);

                // 处理分词结果
                for (const segment of segments) {
                    // 只处理词语，跳过空格和标点
                    if (segment.isWordLike && !chineseStopWords.has(segment.segment)) {
                        // 尝试使用segmentit的tag方法获取词性
                        const word = segment.segment;
                        let pos = 'noun'; // 默认为名词
                        let weight = 120;

                        // 检查是否有tag方法可用
                        if (this.chineseTokenizer && typeof this.chineseTokenizer.tag === 'function') {
                            try {
                                // 使用tag方法获取词性
                                const tagResult = this.chineseTokenizer.tag(word);
                                console.log(`词 "${word}" 的tag结果:`, tagResult);

                                // 输出更详细的信息，包括原始词性标签
                                if (tagResult && tagResult.length > 0) {
                                    console.log(`词 "${word}" 的原始词性标签:`, tagResult[0].p);

                                    // 如果有mapPOSToGeneral方法，输出映射后的词性
                                    if (this.chineseTokenizer.mapPOSToGeneral) {
                                        const mappedPos = this.chineseTokenizer.mapPOSToGeneral(tagResult[0].p);
                                        console.log(`词 "${word}" 映射后的词性:`, mappedPos);
                                    }
                                }

                                if (tagResult && tagResult.length > 0 && tagResult[0].p) {
                                    // 获取词性标签
                                    const posTag = tagResult[0].p;

                                    // 输出原始词性标签，用于调试
                                    console.log(`词 "${word}" 的原始词性标签详情:`, posTag);

                                    // 映射词性标签到通用词性
                                    if (posTag === 'a') {
                                        pos = 'adjective';
                                        weight = 80;
                                        console.log(`词 "${word}" 被映射为形容词(adjective)`);
                                    } else if (posTag === 'v') {
                                        pos = 'verb';
                                        weight = 100;
                                        console.log(`词 "${word}" 被映射为动词(verb)`);
                                    } else if (posTag === 'd') {
                                        pos = 'adverb';
                                        weight = 60;
                                        console.log(`词 "${word}" 被映射为副词(adverb)`);
                                    } else if (posTag === 'n' || posTag === 'nr' || posTag === 'ns' || posTag === 'nt') {
                                        pos = 'noun';
                                        weight = 120;
                                        console.log(`词 "${word}" 被映射为名词(noun)`);
                                    } else {
                                        console.log(`词 "${word}" 使用默认词性:名词(noun)，原始标签:`, posTag);
                                    }
                                }
                            } catch (tagError) {
                                console.warn(`词 "${word}" 的tag方法失败:`, tagError);
                                // 如果tag方法失败，使用默认词性
                                console.log(`词 "${word}" 的tag方法失败，使用默认词性: noun`);
                            }
                        }

                        // 移除后缀判断逻辑，保留原始词性标注
                        console.log(`词 "${word}" 保持原始词性标注: ${pos}`);

                        // 不再使用后缀判断，直接使用segmentit返回的词性或默认词性

                        result.push({
                            word: segment.segment,
                            pos: pos,
                            weight: weight
                        });
                    }
                }

                // 如果没有结果，回退到原来的分词器
                if (result.length === 0) {
                    console.log('Intl.Segmenter没有返回有效结果，回退到原来的分词器');
                    this.useFallbackChineseTokenizer(text, result);
                }
            } else {
                // Intl.Segmenter不可用，回退到原来的分词器
                console.log('Intl.Segmenter不可用，回退到原来的分词器');
                this.useFallbackChineseTokenizer(text, result);
            }
        } catch (segmenterError) {
            console.warn('Intl.Segmenter分词失败，回退到原来的分词器:', segmenterError);
            // 回退到原来的分词器
            this.useFallbackChineseTokenizer(text, result);
        }

        // 处理英文部分
        // 检查文本是否包含英文字符
        const hasEnglish = /[a-zA-Z]/.test(text);
        if (hasEnglish && this.nlpProcessor) {
            try {
                const doc = this.nlpProcessor(text);

                // 简化日志输出
                console.log('英文分词器处理完成');

                // 常见的虚词集合，用于过滤
                const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'as']);

                // 使用compromise的词性标注功能，更精确地处理每个词
                try {
                    // 简化日志输出
                    console.log('Compromise词性分析开始');

                    // 使用terms()方法获取所有词条，然后根据词性分类
                    // 这样可以更精确地处理每个词，而不是整个短语
                    const allTerms = doc.terms();

                    // 提取单个名词（不包括限定词和代词）
                    try {
                        const singleNouns = allTerms.match('#Noun').not('#Determiner').not('#Pronoun');
                        const nounWords = singleNouns.out('array');
                        console.log('单个名词:', nounWords);

                        nounWords.forEach(noun => {
                            if (noun && noun.trim() && !stopWords.has(noun.toLowerCase())) {
                                result.push({
                                    word: noun.toLowerCase().trim(),
                                    pos: 'noun',
                                    weight: this.classificationSettings.posWeights.noun
                                });
                            }
                        });
                    } catch (nounError) {
                        console.warn('提取名词失败:', nounError);

                        // 使用doc.nouns()作为备选方案
                        try {
                            if (typeof doc.nouns === 'function') {
                                const fallbackNouns = doc.nouns().not('#Pronoun').out('array');
                                console.log('使用doc.nouns()作为备选方案:', fallbackNouns);

                                fallbackNouns.forEach(noun => {
                                    if (noun && noun.trim() && !stopWords.has(noun.toLowerCase())) {
                                        result.push({
                                            word: noun.toLowerCase().trim(),
                                            pos: 'noun',
                                            weight: this.classificationSettings.posWeights.noun
                                        });
                                    }
                                });
                            }
                        } catch (fallbackError) {
                            console.warn('名词备选方案也失败:', fallbackError);
                        }
                    }

                    // 提取形容词
                    try {
                        const adjWords = allTerms.match('#Adjective').out('array');
                        console.log('形容词:', adjWords);

                        adjWords.forEach(adj => {
                            if (adj && adj.trim() && !stopWords.has(adj.toLowerCase())) {
                                result.push({
                                    word: adj.toLowerCase().trim(),
                                    pos: 'adjective',
                                    weight: this.classificationSettings.posWeights.adjective
                                });
                            }
                        });
                    } catch (adjError) {
                        console.warn('提取形容词失败:', adjError);

                        // 使用doc.adjectives()作为备选方案
                        try {
                            if (typeof doc.adjectives === 'function') {
                                const fallbackAdjs = doc.adjectives().out('array');
                                console.log('使用doc.adjectives()作为备选方案:', fallbackAdjs);

                                fallbackAdjs.forEach(adj => {
                                    if (adj && adj.trim() && !stopWords.has(adj.toLowerCase())) {
                                        result.push({
                                            word: adj.toLowerCase().trim(),
                                            pos: 'adjective',
                                            weight: this.classificationSettings.posWeights.adjective
                                        });
                                    }
                                });
                            }
                        } catch (fallbackError) {
                            console.warn('形容词备选方案也失败:', fallbackError);
                        }
                    }

                    // 提取动词（基本形式）
                    try {
                        // 直接获取动词，不使用toInfinitive方法
                        const verbTerms = allTerms.match('#Verb').not('#Auxiliary');
                        const verbWords = verbTerms.out('array');

                        console.log('动词:', verbWords);

                        verbWords.forEach(verb => {
                            if (verb && verb.trim() && !stopWords.has(verb.toLowerCase())) {
                                result.push({
                                    word: verb.toLowerCase().trim(),
                                    pos: 'verb',
                                    weight: this.classificationSettings.posWeights.verb
                                });
                            }
                        });
                    } catch (verbError) {
                        console.warn('提取动词失败:', verbError);

                        // 使用doc.verbs()作为备选方案
                        try {
                            if (typeof doc.verbs === 'function') {
                                // 直接获取动词，不使用toInfinitive方法
                                const fallbackVerbs = doc.verbs().out('array');
                                console.log('使用doc.verbs()作为备选方案:', fallbackVerbs);

                                fallbackVerbs.forEach(verb => {
                                    if (verb && verb.trim() && !stopWords.has(verb.toLowerCase())) {
                                        result.push({
                                            word: verb.toLowerCase().trim(),
                                            pos: 'verb',
                                            weight: this.classificationSettings.posWeights.verb
                                        });
                                    }
                                });
                            }
                        } catch (fallbackError) {
                            console.warn('备选方案也失败:', fallbackError);
                        }
                    }

                    // 提取副词
                    try {
                        const advWords = allTerms.match('#Adverb').out('array');
                        console.log('副词:', advWords);

                        advWords.forEach(adv => {
                            if (adv && adv.trim() && !stopWords.has(adv.toLowerCase())) {
                                result.push({
                                    word: adv.toLowerCase().trim(),
                                    pos: 'adverb',
                                    weight: this.classificationSettings.posWeights.adverb
                                });
                            }
                        });
                    } catch (advError) {
                        console.warn('提取副词失败:', advError);

                        // 使用doc.adverbs()作为备选方案
                        try {
                            if (typeof doc.adverbs === 'function') {
                                const fallbackAdverbs = doc.adverbs().out('array');
                                console.log('使用doc.adverbs()作为备选方案:', fallbackAdverbs);

                                fallbackAdverbs.forEach(adv => {
                                    if (adv && adv.trim() && !stopWords.has(adv.toLowerCase())) {
                                        result.push({
                                            word: adv.toLowerCase().trim(),
                                            pos: 'adverb',
                                            weight: this.classificationSettings.posWeights.adverb
                                        });
                                    }
                                });
                            }
                        } catch (fallbackError) {
                            console.warn('副词备选方案也失败:', fallbackError);
                        }
                    }

                    // 如果没有结果，尝试使用简单的分词
                    if (result.length === 0) {
                        console.log('没有找到任何词性，使用简单分词');
                        const words = text.split(/\s+/);
                        words.forEach(word => {
                            if (word && word.trim() && !stopWords.has(word.toLowerCase())) {
                                result.push({
                                    word: word.toLowerCase().trim(),
                                    pos: 'unknown',
                                    weight: 50
                                });
                            }
                        });
                    }
                } catch (termsError) {
                    console.warn('获取词条失败，回退到简单分词:', termsError);

                    // 使用简单的分词方法
                    const words = text.split(/\s+/);
                    words.forEach(word => {
                        if (word && word.trim() && !stopWords.has(word.toLowerCase())) {
                            result.push({
                                word: word.toLowerCase().trim(),
                                pos: 'unknown',
                                weight: 50
                            });
                        }
                    });
                }

                // 不再提取短语，只使用原始分词结果

                // 英文停用词过滤已经在上面的代码中实现，这里不需要重复

                // 不再单独提取命名实体，因为terms().json()已经处理了这部分

                // 不再提取主题词，只使用原始分词结果

                console.log('英文词性分析结果:', result);
            } catch (e) {
                console.warn('英文词性分析失败:', e);

                // 如果分析失败，使用简单的分词
                const words = text.split(/\s+/);
                words.forEach(word => {
                    if (word && word.trim() && !stopWords.has(word.toLowerCase())) {
                        result.push({
                            word: word.toLowerCase().trim(),
                            pos: 'unknown',
                            weight: 50
                        });
                    }
                });
            }
        }

        // 如果没有结果，使用简单的分词
        if (result.length === 0) {
            const words = text.split(/\s+/);
            words.forEach(word => {
                if (word && word.trim()) {
                    result.push({
                        word: word.toLowerCase().trim(),
                        pos: 'unknown',
                        weight: 50
                    });
                }
            });
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

        return uniqueResult;
    }

    /**
     * 验证AI返回的分类是否在CSV表格中存在
     * @param {string} catID - 分类ID
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

        console.warn(`AI分类结果验证失败: ${filename} -> ${aiClassification.catID}`);
        return null;
    }

    // 已移除未使用的方法

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

        console.log(`【智能分类】开始分类文件: "${filename}"`);

        // 获取匹配策略
        const matchStrategy = options.matchStrategy || this.classificationSettings.defaultMatchStrategy || 'auto';
        console.log(`【智能分类】使用匹配策略: ${matchStrategy}`);

        // 1. 首先尝试使用AI分类结果（如果提供）
        if (aiClassification && (matchStrategy === 'auto' || matchStrategy === 'ai')) {
            console.log(`【智能分类】处理提供的AI分类结果`);
            const processedAIResult = this.processAIClassification(aiClassification, filename);
            if (processedAIResult) {
                console.log(`【智能分类】AI分类成功: ${filename} -> ${processedAIResult.catID}`);
                return processedAIResult;
            }
        }

        // 2. 分析原始文件名的词性
        console.log(`【智能分类】开始分析文件名词性: "${filename}"`);
        const originalPosAnalysis = await this.analyzePos(filename);
        console.log(`【智能分类】文件名词性分析完成，结果数量: ${originalPosAnalysis ? originalPosAnalysis.length : 0}`);

        // 3. 如果提供了翻译文本，分析其词性
        let translatedPosAnalysis = null;
        if (options.translatedText) {
            console.log(`【智能分类】开始分析翻译文本词性: "${options.translatedText}"`);
            translatedPosAnalysis = await this.analyzePos(options.translatedText);
            console.log(`【智能分类】翻译文本词性分析完成，结果数量: ${translatedPosAnalysis ? translatedPosAnalysis.length : 0}`);
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
            console.log(`【智能分类】启用双语匹配: 原文="${filename}", 翻译="${options.translatedText}"`);
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

                console.log(`【智能分类】获取到 ${allMatches.length} 个匹配结果`);
            }
        } catch (error) {
            console.warn(`【智能分类】获取所有匹配结果失败:`, error);
        }

        // 7. 使用匹配器的identifyCategory方法进行匹配
        try {
            console.log(`【智能分类】开始调用匹配引擎，词性分析结果数量: ${originalPosAnalysis ? originalPosAnalysis.length : 0}`);

            const catID = await this.csvMatcher.identifyCategory(filename, null, originalPosAnalysis, matchOptions);

            if (catID) {
                // 查找对应的术语
                const term = this.csvMatcher.findTermByCatID(catID);
                if (term) {
                    console.log(`【智能分类】匹配成功: ${filename} -> ${catID}`);

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
            console.error('【智能分类】匹配失败:', error);
        }

        // 8. 如果所有匹配都失败，尝试使用文件名的第一部分（如果有空格）
        if (filename.indexOf(' ') !== -1) {
            try {
                const firstPart = filename.split(' ')[0];
                console.log(`【智能分类】尝试使用文件名的第一部分: "${firstPart}"`);

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
                        console.log(`【智能分类】使用文件名第一部分匹配成功: ${firstPart} -> ${firstPartCatID}`);

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
                console.warn(`【智能分类】使用文件名第一部分匹配失败:`, error);
            }
        }

        // 9. 如果所有匹配都失败，返回null
        console.warn(`【智能分类】所有匹配策略都失败: ${filename}`);
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
            console.log('设置阿里云NLP服务配置:', {
                enabled: config.enabled,
                accessKeyId: config.accessKeyId ? (config.accessKeyId.substring(0, 3) + '***') : '未设置',
                accessKeySecret: config.accessKeySecret ? '******' : '未设置',
                debug: config.debug
            });

            // 更新配置
            this.classificationSettings.aliyunNLP = Object.assign(
                this.classificationSettings.aliyunNLP || {},
                config
            );

            // 更新过滤设置
            if (config.filterSettings) {
                console.log('更新词性过滤设置:', config.filterSettings);
                this.classificationSettings.filterSettings = Object.assign(
                    this.classificationSettings.filterSettings || {},
                    config.filterSettings
                );
            }

            // 如果已经初始化了适配器，更新适配器配置
            if (this.aliyunNLPAdapter) {
                console.log('更新现有阿里云NLP适配器配置');

                const options = {
                    accessKeyId: this.classificationSettings.aliyunNLP.accessKeyId,
                    accessKeySecret: this.classificationSettings.aliyunNLP.accessKeySecret,
                    enabled: this.classificationSettings.aliyunNLP.enabled,
                    debug: this.classificationSettings.aliyunNLP.debug
                };

                this.aliyunNLPAdapter.setOptions(options);

                // 重新初始化适配器
                if (typeof this.aliyunNLPAdapter.init === 'function') {
                    console.log('重新初始化阿里云NLP适配器');
                    this.aliyunNLPAdapter.init();
                    console.log('阿里云NLP适配器重新初始化后状态:', this.aliyunNLPAdapter.initialized);
                }

                console.log('阿里云NLP适配器配置已更新');
            } else {
                // 尝试初始化适配器，即使没有启用服务或没有提供必要的配置
                try {
                    console.log('创建新的阿里云NLP适配器');

                    const options = {
                        accessKeyId: this.classificationSettings.aliyunNLP.accessKeyId,
                        accessKeySecret: this.classificationSettings.aliyunNLP.accessKeySecret,
                        enabled: this.classificationSettings.aliyunNLP.enabled,
                        debug: this.classificationSettings.aliyunNLP.debug
                    };

                    // 使用阿里云NLP适配器
                    if (typeof AliyunNLPAdapter !== 'undefined') {
                        console.log('使用阿里云NLP适配器');
                        this.aliyunNLPAdapter = new AliyunNLPAdapter(options);
                    }
                    else {
                        console.error('未找到阿里云NLP适配器');
                        this.aliyunNLPAdapter = null;
                        return false;
                    }

                    if (this.aliyunNLPAdapter) {
                        console.log('阿里云NLP适配器初始化状态:', this.aliyunNLPAdapter.initialized);
                        console.log('阿里云NLP适配器初始化成功');
                    }
                } catch (error) {
                    console.error('阿里云NLP适配器初始化失败:', error);
                    console.error('错误详情:', error.message, error.stack);
                    this.aliyunNLPAdapter = null;
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('设置阿里云NLP服务配置失败:', error);
            console.error('错误详情:', error.message, error.stack);
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