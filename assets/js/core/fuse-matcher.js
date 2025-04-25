/**
 * 基于 Fuse.js 的匹配器类
 * 使用模糊搜索算法提高匹配准确性
 * 直接使用 Papaparse 解析 CSV 文件，不依赖 CSVMatcher
 */
class FuseMatcher {
    /**
     * 构造函数
     * @param {Array|string} source - 术语数据数组或CSV文件路径
     * @param {Object} options - 配置选项
     */
    constructor(source, options = {}) {
        this.terms = [];
        this.categories = [];
        this.loaded = false;
        this.initialized = false;
        this.fuseIndex = null;
        this.options = options;

        // 初始化AI分类器和匹配设置
        this.useAIClassification = false;
        this.classifier = null;

        // 添加matchSettings属性，与CSVMatcher兼容
        this.matchSettings = {
            useAIClassification: false,
            matchStrategy: 'auto'
        };

        // 默认 Fuse.js 选项
        this.fuseOptions = {
            // 搜索键 - 使用平衡的权重设置
            keys: [
                { name: 'source', weight: 0.8 },     // 原始术语 (英文)
                { name: 'target', weight: 0.8 },     // 目标术语 (中文)
                { name: 'category', weight: 0.5 },   // 分类
                { name: 'synonyms', weight: 0.7 },   // 同义词 (英文)
                { name: 'synonymsZh', weight: 0.7 }  // 同义词 (中文)
            ],
            // 匹配选项 - 使用平衡的设置
            includeScore: true,     // 包含分数
            threshold: 0.5,         // 匹配阈值 (0.0 = 精确匹配, 1.0 = 匹配所有)
            distance: 150,          // 允许的编辑距离
            useExtendedSearch: true, // 使用扩展搜索
            ignoreLocation: true,   // 忽略位置
            findAllMatches: true,   // 查找所有匹配项
            minMatchCharLength: 2,  // 最小匹配字符长度
            shouldSort: true,       // 是否排序
            sortFn: (a, b) => a.score - b.score // 排序函数
        };

        // 合并用户选项
        if (options.fuseOptions) {
            this.fuseOptions = { ...this.fuseOptions, ...options.fuseOptions };
        }

        // 初始化数据源
        if (typeof source === 'string') {
            // 如果是字符串，则当作 CSV 文件路径
            this.loadFromCsv(source);
        } else if (Array.isArray(source)) {
            // 如果是数组，则直接使用
            this.terms = source;
            this.loaded = true;
            this.extractCategories();
            this.initialize();
        } else {
            console.warn('无效的数据源类型，应为数组或CSV文件路径');
        }
    }

    /**
     * 从 CSV 文件加载术语数据
     * @param {string} csvPath - CSV 文件路径
     */
    loadFromCsv(csvPath) {
        console.log('开始从 CSV 文件加载术语数据:', csvPath);

        // 确保 Papaparse 已加载
        if (typeof Papa === 'undefined') {
            console.error('Papaparse 未加载，请确保已引入 papaparse.min.js');
            return;
        }

        const self = this;

        // 使用 Papaparse 加载和解析 CSV 文件
        Papa.parse(csvPath, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                console.log('CSV 文件解析完成，共 ' + results.data.length + ' 行数据');

                if (results.errors && results.errors.length > 0) {
                    console.warn('CSV 解析警告:', results.errors);
                }

                // 处理解析结果
                self.terms = self.processCSVData(results.data);
                self.loaded = true;

                // 提取分类
                self.extractCategories();

                // 初始化 Fuse.js 索引
                self.initialize();
            },
            error: function(error) {
                console.error('CSV 文件解析错误:', error);
                self.terms = [];
                self.loaded = false;
            }
        });
    }

    /**
     * 处理 CSV 数据
     * @param {Array} data - 原始 CSV 数据
     * @returns {Array} 处理后的术语数据
     * @private
     */
    processCSVData(data) {
        console.log('开始处理 CSV 数据...');

        const terms = [];

        // 遍历每一行数据
        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            // 提取必要字段
            const source = row.SubCategory ? row.SubCategory.trim() : '';
            const target = row.SubCategory_zh ? row.SubCategory_zh.trim() : '';
            const catID = row.CatID ? row.CatID.trim() : '';
            const catShort = row.CatShort ? row.CatShort.trim() : '';
            const category = row.Category ? row.Category.trim() : '';
            const categoryNameZh = row.Category_zh ? row.Category_zh.trim() : '';
            const synonyms = row['Synonyms - Comma Separated'] ? row['Synonyms - Comma Separated'].trim() : '';
            const synonymsZh = row.Synonyms_zh ? row.Synonyms_zh.trim() : '';

            // 至少需要有 source 和 catID
            if (source && catID) {
                terms.push({
                    source: source,
                    target: target || source, // 如果没有 target，使用 source
                    catID: catID,
                    catShort: catShort || catID.substring(0, 4), // 如果没有 catShort，使用 catID 的前 4 个字符
                    category: category || '',
                    categoryNameZh: categoryNameZh || category || '',
                    synonyms: synonyms || '',
                    synonymsZh: synonymsZh || ''
                });
            }
        }

        console.log('处理完成，共 ' + terms.length + ' 个术语');
        return terms;
    }

    /**
     * 从术语数据中提取分类
     */
    extractCategories() {
        this.categories = [];

        // 遍历每一个术语，提取唯一的分类
        for (let i = 0; i < this.terms.length; i++) {
            const category = this.terms[i].category;
            if (category && this.categories.indexOf(category) === -1) {
                this.categories.push(category);
            }
        }

        console.log('共提取到 ' + this.categories.length + ' 个分类');
    }

    /**
     * 初始化 Fuse.js 索引
     */
    initialize() {
        if (!this.terms || !Array.isArray(this.terms) || this.terms.length === 0) {
            console.warn('术语数据为空或格式不正确，无法初始化 Fuse.js 索引');
            return;
        }

        try {
            // 确保 Fuse.js 已加载
            if (typeof Fuse === 'undefined') {
                console.error('Fuse.js 未加载，请确保已引入 fuse.min.js');
                return;
            }

            // 创建 Fuse 索引
            this.fuseIndex = new Fuse(this.terms, this.fuseOptions);
            this.initialized = true;
            console.log(`FuseMatcher 初始化成功，加载了 ${this.terms.length} 个术语`);

            // 初始化智能分类器
            this.initSmartClassifier();
        } catch (error) {
            console.error('初始化 Fuse.js 索引时出错:', error);
        }
    }

    /**
     * 初始化智能分类器
     */
    initSmartClassifier() {
        try {
            // 检查是否已经有SmartClassifier实例
            let existingClassifier = null;

            // 检查全局状态中是否有SmartClassifier实例
            if (window.pluginState) {
                if (window.pluginState.csvMatcher && window.pluginState.csvMatcher.smartClassifier) {
                    existingClassifier = window.pluginState.csvMatcher.smartClassifier;
                } else if (window.pluginState.fileProcessor && window.pluginState.fileProcessor.smartClassifier) {
                    existingClassifier = window.pluginState.fileProcessor.smartClassifier;
                }
            }

            // 使用现有实例或创建新实例
            if (existingClassifier) {
                this.smartClassifier = existingClassifier;
            } else if (typeof SmartClassifier !== 'undefined') {
                this.smartClassifier = new SmartClassifier(this);

                // 将实例共享到全局状态
                if (window.pluginState) {
                    if (window.pluginState.csvMatcher) {
                        window.pluginState.csvMatcher.smartClassifier = this.smartClassifier;
                    }
                    if (window.pluginState.fileProcessor) {
                        window.pluginState.fileProcessor.smartClassifier = this.smartClassifier;
                    }
                }
            } else {
                console.warn('SmartClassifier类不可用，无法初始化智能分类器');
            }
        } catch (error) {
            console.error('初始化SmartClassifier时出错:', error);
        }
    }

    /**
     * 设置术语数据
     * @param {Array} termsData - 术语数据数组
     */
    setTermsData(termsData) {
        this.terms = termsData || [];
        this.extractCategories();
        this.initialize();
    }

    /**
     * 查找匹配
     * @param {string} text - 要匹配的文本
     * @param {Object} options - 匹配选项
     * @returns {Object} 匹配结果
     */
    findMatch(text, options = {}) {
        if (!this.initialized || !text) {
            return { matched: false, catID: null, score: 0, matchType: 'none' };
        }

        try {
            // 检查是否有词性分析结果
            const hasPosAnalysis = options.posAnalysis && Array.isArray(options.posAnalysis) && options.posAnalysis.length > 0;

            if (hasPosAnalysis) {
                console.log(`[匹配引擎] 使用词性分析结果进行匹配，共 ${options.posAnalysis.length} 个词`);

                // 提取名词，它们通常是最重要的匹配依据
                const nouns = options.posAnalysis.filter(item => item.pos === 'noun');

                if (nouns.length > 0) {
                    console.log(`[匹配引擎] 从词性分析中提取了 ${nouns.length} 个名词`);

                    // 构建增强的搜索文本，将名词重复添加以增加其权重
                    let enhancedText = text;

                    // 将名词添加到搜索文本中，增加其权重
                    nouns.forEach(noun => {
                        if (noun.word.length >= 2) { // 跳过太短的词
                            // 根据权重决定重复次数
                            const repeatCount = Math.floor(noun.weight / 40); // 例如，权重120会重复3次
                            if (repeatCount > 0) {
                                enhancedText += ' ' + noun.word.repeat(repeatCount);
                            }
                        }
                    });

                    console.log(`[匹配引擎] 使用增强搜索文本进行匹配`);

                    // 使用增强的文本执行搜索
                    const searchResults = this.fuseIndex.search(enhancedText);

                    // 如果有结果，处理它们
                    if (searchResults && searchResults.length > 0) {
                        // 获取最佳匹配
                        const bestMatch = searchResults[0];
                        const matchScore = 1 - bestMatch.score; // Fuse.js 分数是 0-1，0 表示完全匹配，所以我们需要反转

                        // 如果分数低于阈值，返回未匹配
                        const threshold = options.threshold || 0.2; // 降低阈值，使匹配更容易成功
                        if (matchScore < threshold) {
                            console.log(`[匹配引擎] 增强匹配分数 ${matchScore.toFixed(3)} 低于阈值 ${threshold}，视为未匹配`);
                            return { matched: false, catID: null, score: 0, matchType: 'none' };
                        } else {
                            console.log(`[匹配引擎] 增强匹配分数 ${matchScore.toFixed(3)} 高于阈值 ${threshold}，匹配成功`);

                            // 返回匹配结果
                            return {
                                matched: true,
                                catID: bestMatch.item.catID,
                                score: matchScore * 1000, // 转换为 0-1000 范围，与原有系统保持一致
                                matchType: 'fuse_enhanced',
                                term: bestMatch.item,
                                allMatches: searchResults.map(result => ({
                                    catID: result.item.catID,
                                    score: (1 - result.score) * 1000,
                                    term: result.item
                                }))
                            };
                        }
                    }
                }
            }

            // 如果没有词性分析结果，使用原始文本
            console.log(`[匹配引擎] 使用原始文本进行匹配: "${text}"`);
            const searchResults = this.fuseIndex.search(text);

            // 如果没有结果，返回未匹配
            if (!searchResults || searchResults.length === 0) {
                return { matched: false, catID: null, score: 0, matchType: 'none' };
            }

            // 获取最佳匹配
            const bestMatch = searchResults[0];
            const matchScore = 1 - bestMatch.score; // Fuse.js 分数是 0-1，0 表示完全匹配，所以我们需要反转

            // 如果分数低于阈值，返回未匹配
            const threshold = options.threshold || 0.2; // 降低阈值，使匹配更容易成功
            if (matchScore < threshold) {
                console.log(`[匹配引擎] 匹配分数 ${matchScore.toFixed(3)} 低于阈值 ${threshold}，视为未匹配`);
                return { matched: false, catID: null, score: 0, matchType: 'none' };
            }

            console.log(`[匹配引擎] 匹配分数 ${matchScore.toFixed(3)} 高于阈值 ${threshold}，匹配成功`);

            // 返回匹配结果
            return {
                matched: true,
                catID: bestMatch.item.catID,
                score: matchScore * 1000, // 转换为 0-1000 范围，与原有系统保持一致
                matchType: 'fuse',
                term: bestMatch.item,
                allMatches: searchResults.map(result => ({
                    catID: result.item.catID,
                    score: (1 - result.score) * 1000,
                    term: result.item
                }))
            };
        } catch (error) {
            console.error('执行 Fuse.js 搜索时出错:', error);
            return { matched: false, catID: null, score: 0, matchType: 'error' };
        }
    }

    /**
     * 获取所有匹配
     * @param {string} text - 要匹配的文本
     * @param {Object} options - 匹配选项
     * @returns {Array} 匹配结果数组
     */
    getAllMatches(text, options = {}) {
        if (!this.initialized || !text) {
            return [];
        }

        try {
            // 执行搜索
            const searchResults = this.fuseIndex.search(text);

            // 如果没有结果，返回空数组
            if (!searchResults || searchResults.length === 0) {
                return [];
            }

            // 限制返回结果数量
            const limit = options.limit || 20;
            const limitedResults = searchResults.slice(0, limit);

            // 转换结果格式
            return limitedResults.map(result => ({
                catID: result.item.catID,
                score: (1 - result.score) * 1000, // 转换为 0-1000 范围
                matchType: 'fuse',
                term: result.item,
                matchedWords: [{ word: text, score: (1 - result.score) * 1000 }]
            }));
        } catch (error) {
            console.error('执行 Fuse.js 搜索时出错:', error);
            return [];
        }
    }

    /**
     * 使用双语文本进行匹配
     * @param {string} originalText - 原始文本
     * @param {string} translatedText - 翻译文本
     * @param {Object} options - 匹配选项
     * @returns {Object} 匹配结果
     */
    findMatchWithBilingualText(originalText, translatedText, options = {}) {
        if (!this.initialized) {
            return { matched: false, catID: null, score: 0, matchType: 'none' };
        }

        // 平衡中英文权重，降低原始语言权重，提高翻译语言权重
        const originalWeight = options.originalWeight || 2.0; // 降低原始语言权重
        const translatedWeight = options.translatedWeight || 2.0; // 提高翻译语言权重

        try {
            // 分别搜索原始文本和翻译文本
            const originalResults = originalText ? this.fuseIndex.search(originalText) : [];
            const translatedResults = translatedText ? this.fuseIndex.search(translatedText) : [];

            // 简化的调试日志
            if (originalResults.length > 0 || translatedResults.length > 0) {
                console.log(`双语匹配搜索结果: 原文匹配=${originalResults.length}, 译文匹配=${translatedResults.length}`);
            }

            // 如果两者都没有结果，返回未匹配
            if ((!originalResults || originalResults.length === 0) &&
                (!translatedResults || translatedResults.length === 0)) {
                return { matched: false, catID: null, score: 0, matchType: 'none' };
            }

            // 合并结果并计算综合分数
            const combinedResults = new Map();

            // 处理原始文本结果
            originalResults.forEach(result => {
                const catID = result.item.catID;
                const score = (1 - result.score) * 1000 * originalWeight;

                if (combinedResults.has(catID)) {
                    combinedResults.get(catID).score += score;
                    combinedResults.get(catID).matchCount++;
                } else {
                    combinedResults.set(catID, {
                        catID,
                        score,
                        matchCount: 1,
                        term: result.item,
                        matchType: 'fuse_bilingual'
                    });
                }
            });

            // 处理翻译文本结果
            translatedResults.forEach(result => {
                const catID = result.item.catID;
                const score = (1 - result.score) * 1000 * translatedWeight;

                if (combinedResults.has(catID)) {
                    combinedResults.get(catID).score += score;
                    combinedResults.get(catID).matchCount++;
                } else {
                    combinedResults.set(catID, {
                        catID,
                        score,
                        matchCount: 1,
                        term: result.item,
                        matchType: 'fuse_bilingual'
                    });
                }
            });

            // 如果有词性分析结果，使用它们来调整分数
            if (options.posAnalysis && options.translatedPosAnalysis) {
                // 按词性分组
                const wordsByPos = {
                    noun: [],
                    adjective: [],
                    verb: [],
                    adverb: [],
                    unknown: [] // 未知词性
                };

                // 收集所有词汇并按词性分组
                [...(options.posAnalysis || []), ...(options.translatedPosAnalysis || [])].forEach(item => {
                    if (item.word && item.pos) {
                        // 将词汇添加到对应的词性组
                        if (wordsByPos[item.pos]) {
                            wordsByPos[item.pos].push({
                                word: item.word.toLowerCase(),
                                weight: item.weight || 100
                            });
                        }
                    }
                });

                // 遍历所有结果，根据词性匹配情况调整分数
                combinedResults.forEach(result => {
                    const term = result.term;
                    let totalBoost = 0;
                    let matchDetails = [];

                    // 检查每种词性的匹配情况
                    Object.keys(wordsByPos).forEach(pos => {
                        const words = wordsByPos[pos];
                        let posMatchCount = 0;
                        let posMatchWeight = 0;

                        words.forEach(wordInfo => {
                            const word = wordInfo.word;
                            const weight = wordInfo.weight;

                            // 检查术语的各个字段是否包含这个词
                            let matched = false;

                            if (term.source && term.source.toLowerCase().includes(word)) {
                                matched = true;
                            } else if (term.target && term.target.toLowerCase().includes(word)) {
                                matched = true;
                            } else if (term.synonyms && Array.isArray(term.synonyms) && term.synonyms.some(s => s.toLowerCase().includes(word))) {
                                matched = true;
                            } else if (term.synonymsZh && Array.isArray(term.synonymsZh) && term.synonymsZh.some(s => s.includes(word))) {
                                matched = true;
                            }

                            if (matched) {
                                posMatchCount++;
                                posMatchWeight += weight;
                            }
                        });

                        // 简化的词性权重设置
                        let posBoostFactor = 0;
                        switch (pos) {
                            case 'noun':
                                posBoostFactor = 0.2; // 名词最重要
                                break;
                            case 'adjective':
                                posBoostFactor = 0.15; // 形容词次之
                                break;
                            case 'verb':
                                posBoostFactor = 0.12; // 动词再次之
                                break;
                            case 'adverb':
                                posBoostFactor = 0.08; // 副词
                                break;
                            case 'unknown':
                            case 'other':
                                posBoostFactor = 0.1; // 未知词性或其他词性
                                break;
                            default:
                                posBoostFactor = 0.1; // 默认权重
                        }

                        // 计算这个词性的提升系数
                        const posBoost = posMatchCount > 0 ? posMatchWeight * posBoostFactor / 100 : 0;
                        totalBoost += posBoost;

                        if (posMatchCount > 0) {
                            matchDetails.push(`${pos}(${posMatchCount}): +${(posBoost * 100).toFixed(1)}%`);
                        }
                    });

                    // 应用总提升系数
                    if (totalBoost > 0) {
                        const oldScore = result.score;
                        result.score *= (1 + totalBoost);

                        // 记录调整详情（仅用于调试）
                        result.matchDetails = matchDetails;
                        result.scoreAdjustment = {
                            before: oldScore,
                            after: result.score,
                            boost: `+${(totalBoost * 100).toFixed(1)}%`
                        };
                    }
                });
            }

            // 转换为数组并排序
            const sortedResults = Array.from(combinedResults.values())
                .sort((a, b) => b.score - a.score);

            // 如果没有结果，返回未匹配
            if (sortedResults.length === 0) {
                return { matched: false, catID: null, score: 0, matchType: 'none' };
            }

            // 获取最佳匹配
            const bestMatch = sortedResults[0];

            // 如果分数低于阈值，返回未匹配
            const threshold = options.threshold || 50; // 降低阈值，使匹配更容易成功
            if (bestMatch.score < threshold) {
                console.log(`[匹配引擎] 双语匹配分数 ${bestMatch.score.toFixed(1)} 低于阈值 ${threshold}，视为未匹配`);
                return { matched: false, catID: null, score: 0, matchType: 'none' };
            }

            console.log(`[匹配引擎] 双语匹配分数 ${bestMatch.score.toFixed(1)} 高于阈值 ${threshold}，匹配成功`);


            // 简化的匹配结果输出
            if (sortedResults.length > 0) {
                console.log(`[匹配引擎] 最佳匹配: ${bestMatch.catID}, 分数: ${bestMatch.score.toFixed(1)}, 总匹配数: ${sortedResults.length}`);
            }

            // 返回匹配结果
            return {
                matched: true,
                catID: bestMatch.catID,
                score: bestMatch.score,
                matchType: 'fuse_bilingual',
                term: bestMatch.term,
                allMatches: sortedResults
            };
        } catch (error) {
            console.error('执行双语 Fuse.js 搜索时出错:', error);
            return { matched: false, catID: null, score: 0, matchType: 'error' };
        }
    }

    /**
     * 根据分类和子分类查找术语
     * @param {string} category - 分类名称
     * @param {string} subCategory - 子分类名称
     * @returns {Object|null} 匹配的术语对象
     */
    findTermByCategory(category, subCategory) {
        if (!this.initialized || !category) {
            return null;
        }

        // 查找匹配的术语
        const matchingTerm = this.terms.find(term =>
            term.category === category &&
            (!subCategory || term.source === subCategory)
        );

        return matchingTerm || null;
    }

    /**
     * 根据CatID查找术语
     * @param {string} catID - 分类ID
     * @returns {Object|null} 匹配的术语对象
     */
    findTermByCatID(catID) {
        if (!this.initialized || !catID) {
            return null;
        }

        // 查找匹配的术语
        return this.terms.find(term => term.catID === catID) || null;
    }

    /**
     * 检查CatID是否有效
     * @param {string} catID - 分类ID
     * @returns {boolean} 是否有效
     */
    isValidCatID(catID) {
        return !!this.findTermByCatID(catID);
    }

    /**
     * 设置AI辅助分类器
     * @param {boolean} enabled - 是否启用AI辅助分类
     * @returns {FuseMatcher} 当前实例，支持链式调用
     */
    setAIClassifier(enabled) {
        // 存储AI分类器状态
        this.useAIClassification = enabled;

        // 更新matchSettings属性
        if (this.matchSettings) {
            this.matchSettings.useAIClassification = enabled;
        }

        // 初始化AI分类器
        if (enabled && typeof window !== 'undefined' && window.AIClassifier) {
            try {
                this.aiClassifier = new window.AIClassifier().init(enabled);
            } catch (error) {
                console.error('AI辅助分类器初始化失败:', error);
            }
        }

        return this;
    }

    /**
     * 设置智能分类器
     * @param {Object} classifier - 智能分类器实例
     * @returns {FuseMatcher} 当前实例，支持链式调用
     */
    setClassifier(classifier) {
        if (!classifier) {
            console.warn('设置智能分类器失败: 分类器实例为空');
            return this;
        }

        console.log('设置智能分类器:', classifier);
        this.classifier = classifier;
        return this;
    }

    /**
     * 尝试匹配名词
     * @private
     * @param {Array} nouns - 名词数组
     * @returns {string|null} 匹配的分类ID或null
     */
    _tryMatchNouns(nouns) {
        if (!nouns || nouns.length === 0) return null;

        for (const noun of nouns) {
            if (noun.word.length < 2) continue; // 跳过太短的词

            const nounMatch = this.findMatch(noun.word, { threshold: 0.1 }); // 使用更低的阈值
            if (nounMatch && nounMatch.matched) {
                console.log(`[匹配引擎] 名词直接匹配成功: "${noun.word}" -> ${nounMatch.catID}`);
                return nounMatch.catID;
            }
        }

        return null;
    }

    /**
     * 识别分类
     * @param {string} text - 要识别的文本
     * @param {Object} aiClassification - AI分类结果（可选）
     * @param {Array} posAnalysis - 词性分析结果（可选）
     * @param {Object} options - 识别选项
     * @returns {string|null} 分类ID或null
     */
    identifyCategory(text, aiClassification = null, posAnalysis = null, options = {}) {
        // 如果提供了AI分类结果，优先使用
        if (aiClassification && aiClassification.catID && this.isValidCatID(aiClassification.catID)) {
            return aiClassification.catID;
        }

        // 检查是否为简单文件名（不包含空格或特殊字符）
        const isSimpleFilename = !/[\s\-_]/.test(text) && text.length < 15;
        const hasValidPosAnalysis = posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0;

        // 如果是简单文件名，直接尝试关键词匹配
        if (isSimpleFilename && hasValidPosAnalysis) {
            // 尝试直接匹配名词
            const nouns = posAnalysis.filter(item => item.pos === 'noun');
            const nounMatchResult = this._tryMatchNouns(nouns);
            if (nounMatchResult) return nounMatchResult;

            // 如果名词匹配失败，尝试直接匹配整个文本
            const directMatch = this.findMatch(text, { threshold: 0.1 });
            if (directMatch && directMatch.matched) {
                return directMatch.catID;
            }
        }

        // 如果提供了翻译文本，使用双语匹配
        if (options.translatedText) {
            // 如果提供了词性分析结果，将其添加到选项中
            if (hasValidPosAnalysis) {
                options.posAnalysis = posAnalysis;
            }

            const bilingualMatch = this.findMatchWithBilingualText(text, options.translatedText, options);
            if (bilingualMatch && bilingualMatch.matched) {
                return bilingualMatch.catID;
            }
        }

        // 使用单语匹配
        // 如果提供了词性分析结果，将其添加到选项中
        if (hasValidPosAnalysis) {
            options.posAnalysis = posAnalysis;
        }

        // 添加调试选项，降低匹配阈值
        options.threshold = options.threshold || 0.2; // 单语匹配阈值

        const match = this.findMatch(text, options);
        if (match && match.matched) {
            return match.catID;
        }

        // 如果词性分析结果中有名词，尝试直接匹配名词
        if (hasValidPosAnalysis) {
            const nouns = posAnalysis.filter(item => item.pos === 'noun');
            const nounMatchResult = this._tryMatchNouns(nouns);
            if (nounMatchResult) return nounMatchResult;
        }

        // 如果所有匹配都失败，返回null
        return null;
    }
}

// 导出类
window.FuseMatcher = FuseMatcher;
