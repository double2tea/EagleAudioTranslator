/**
 * CSV匹配器
 * 用于从CSV术语库中匹配术语
 */
class CSVMatcher {
    /**
     * 构造函数
     * @param {string} csvPath - CSV文件路径
     */
    constructor(csvPath) {
        this.terms = [];
        this.categories = [];
        this.loaded = false;
        this.aiClassifier = null; // AI辅助分类器

        // 匹配设置
        this.matchSettings = {
            // 多词匹配策略: 'exact'(精确匹配), 'partial'(部分匹配), 'fuzzy'(模糊匹配)
            multiWordMatchStrategy: 'partial',
            // 多词匹配时是否考虑词序
            respectWordOrder: true,
            // 匹配优先级权重
            priorityWeights: {
                aiMatch: 120,          // AI辅助匹配权重
                exactMatch: 100,       // 精确匹配权重
                multiWordMatch: 80,    // 多词匹配权重
                containsMatch: 60,     // 包含匹配权重
                synonymMatch: 40,      // 同义词匹配权重
                regexMatch: 30,        // 正则表达式匹配权重
                partialMatch: 20       // 部分匹配权重
            },
            // 当有多个匹配结果时的策略: 'highestPriority'(最高优先级), 'firstMatch'(第一个匹配), 'allMatches'(所有匹配)
            multiMatchStrategy: 'highestPriority',
            // 是否启用AI辅助分类
            useAIClassification: false
        };

        // 确保路径有效
        if (!csvPath) {
            console.warn('CSV路径为空，使用默认路径 ./assets/data/categorylist.csv');
            csvPath = './assets/data/categorylist.csv';
        }

        // 加载CSV数据
        this.loadCSV(csvPath);
    }

    /**
     * 加载CSV文件
     * @param {string} path - CSV文件路径
     */
    loadCSV(path) {
        var self = this;

        try {
            if (!path) {
                throw new Error('CSV文件路径不能为空');
            }

            console.log('加载CSV术语库: ' + path);

            // 使用XMLHttpRequest加载CSV文件
            var xhr = new XMLHttpRequest();
            xhr.open('GET', path, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            self.terms = self.parseCSV(xhr.responseText);
                            self.loaded = true;

                            // 提取所有分类
                            self.categories = [];
                            for (var i = 0; i < self.terms.length; i++) {
                                var category = self.terms[i].category;
                                if (category && self.categories.indexOf(category) === -1) {
                                    self.categories.push(category);
                                }
                            }

                            console.log('CSV术语库加载完成，共 ' + self.terms.length + ' 个术语，' + self.categories.length + ' 个分类');
                        } catch (parseError) {
                            console.error('解析CSV文件失败:', parseError);
                            self.terms = [];
                            self.categories = [];
                            self.loaded = false;
                        }
                    } else {
                        console.error('加载CSV文件失败: HTTP ' + xhr.status);
                        self.terms = [];
                        self.categories = [];
                        self.loaded = false;
                    }
                }
            };
            xhr.send();
        } catch (error) {
            console.error('CSV术语库加载失败', error);
            this.terms = [];
            this.categories = [];
            this.loaded = false;
        }
    }

    /**
     * 解析CSV数据
     * @param {string} data - CSV文本数据
     * @returns {Array<Object>} 解析后的术语数组
     * @private
     */
    parseCSV(data) {
        var lines = data.split(/\r?\n/).filter(function(line) { return line.trim(); });
        var headers = lines[0].split(',').map(function(header) { return header.trim(); });

        // 查找列索引 - 使用实际的CSV列名
        var sourceIndex = headers.indexOf('SubCategory');
        var targetIndex = headers.indexOf('SubCategory_zh');
        var catIDIndex = headers.indexOf('CatID');
        var catShortIndex = headers.indexOf('CatShort');
        var categoryIndex = headers.indexOf('Category');
        var categoryNameZhIndex = headers.indexOf('Category_zh');
        var synonymsIndex = headers.indexOf('Synonyms - Comma Separated');
        var synonymsZhIndex = headers.indexOf('Synonyms_zh');

        console.log('解析CSV列索引:', {
            sourceIndex,
            targetIndex,
            catIDIndex,
            catShortIndex,
            categoryIndex,
            categoryNameZhIndex,
            synonymsIndex,
            synonymsZhIndex
        });

        if (sourceIndex === -1 || targetIndex === -1 || catIDIndex === -1 || categoryIndex === -1) {
            throw new Error('CSV格式错误: 缺少SubCategory、SubCategory_zh、CatID或Category列');
        }

        var terms = [];

        // 从第二行开始解析数据
        for (var i = 1; i < lines.length; i++) {
            var values = this.splitCSVLine(lines[i]);

            if (values.length >= Math.max(sourceIndex, targetIndex) + 1) {
                var source = values[sourceIndex].trim();
                var target = values[targetIndex].trim();
                var catID = catIDIndex !== -1 ? values[catIDIndex].trim() : '';
                var catShort = catShortIndex !== -1 ? values[catShortIndex].trim() : '';
                var category = categoryIndex !== -1 ? values[categoryIndex].trim() : '';
                var categoryNameZh = categoryNameZhIndex !== -1 ? values[categoryNameZhIndex].trim() : '';
                var synonyms = synonymsIndex !== -1 ? values[synonymsIndex].trim() : '';
                var synonymsZh = synonymsZhIndex !== -1 ? values[synonymsZhIndex].trim() : '';

                if (source && target) {
                    terms.push({
                        source: source,
                        target: target,
                        catID: catID,
                        catShort: catShort,
                        category: category,
                        categoryNameZh: categoryNameZh,
                        synonyms: synonyms,
                        synonymsZh: synonymsZh
                    });
                }
            }
        }

        return terms;
    }

    /**
     * 分割CSV行，处理引号内的逗号
     * @param {string} line - CSV行
     * @returns {Array<string>} 分割后的值数组
     * @private
     */
    splitCSVLine(line) {
        var result = [];
        var current = '';
        var inQuotes = false;

        for (var i = 0; i < line.length; i++) {
            var char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        // 添加最后一个值
        result.push(current);

        // 清理引号
        return result.map(function(value) {
            return value.replace(/^"(.*)"$/, '$1').trim();
        });
    }

    /**
     * 设置AI辅助分类器
     * @param {boolean} enabled - 是否启用AI辅助分类
     */
    setAIClassifier(enabled) {
        this.matchSettings.useAIClassification = enabled;
        console.log('设置AI辅助分类器状态:', enabled, 'AIClassifier类是否可用:', !!window.AIClassifier);

        // 初始化AI分类器
        if (enabled && window.AIClassifier) {
            if (!this.aiClassifier) {
                this.aiClassifier = new window.AIClassifier().init(enabled);
                console.log('AI辅助分类器初始化成功', this.aiClassifier);
            } else {
                this.aiClassifier.init(enabled);
                console.log('AI辅助分类器已更新状态', this.aiClassifier);
            }
        } else {
            console.log('AI辅助分类器已禁用或不可用', {
                enabled: enabled,
                aiClassifierAvailable: !!window.AIClassifier
            });
        }

        return this;
    }



    /**
     * 查找匹配的术语 - 统一入口
     * 该方法是所有匹配功能的主要入口，根据提供的参数选择不同的匹配策略
     *
     * @param {string} text - 要匹配的文本
     * @param {Array<Object>} [posAnalysis=null] - 词性分析结果，如果提供则使用分词系统进行匹配
     * @param {Object} [options={}] - 额外选项
     * @returns {Object|null} 匹配的术语或null
     */
    findMatch(text, posAnalysis = null, options = {}) {
        // 验证输入
        if (!this.loaded || !text) {
            console.log('查找匹配: 输入无效');
            return null;
        }

        Logger.debug(`[匹配引擎] 开始查找匹配: "${text}"`, {
            词性分析: posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0,
            选项: options ? Object.keys(options).join(', ') : '无'
        });

        // 检测是否为中文文本
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);

        // 先尝试精确匹配 - 完全相等
        const lowerText = text.toLowerCase();
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.source.toLowerCase() === lowerText) {
                Logger.debug(`[匹配引擎] 精确匹配成功: "${lowerText}" -> ${term.catID}`);
                return term;
            }
        }

        // 尝试同义词精确匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.synonyms) {
                const synonyms = term.synonyms.split(',').map(s => s.trim().toLowerCase());
                for (const synonym of synonyms) {
                    if (synonym === lowerText) {
                        Logger.debug(`[匹配引擎] 同义词精确匹配成功: "${lowerText}" -> ${term.catID}`);
                        return term;
                    }
                }
            }
        }

        // 如果提供了词性分析结果，使用分词系统进行匹配
        if (posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0) {
            // 准备词汇信息列表
            const wordInfoList = posAnalysis.map(item => ({
                word: item.word,
                pos: item.pos,
                weight: item.weight || 1,
                source: options.source || 'original' // 可以通过选项指定来源
            }));

            // 使用通用匹配算法
            const result = this._universalMatchingAlgorithm(wordInfoList, 0, false, options);

            if (result) {
                Logger.debug(`[匹配引擎] 词性分析匹配成功: "${text}" -> ${result.term.catID} (匹配类型: ${result.matchType}, 分数: ${result.score.toFixed(2)})`);
                return result.term;
            }

            Logger.debug(`[匹配引擎] 词性分析匹配失败: "${text}"，尝试其他方法`);
        }

        // 如果没有词性分析结果或分析失败，使用简单的文本匹配
        // 根据语言类型使用不同的分词方式
        let words = [];
        if (hasChinese) {
            // 中文文本分词 - 先尝试按空格分割，如果没有空格则按字符分割
            const spaceWords = lowerText.split(/\s+/).filter(w => w.trim());
            if (spaceWords.length > 1) {
                words = spaceWords;
            } else {
                // 按字符分割中文
                words = Array.from(lowerText).filter(char => /[\u4e00-\u9fa5]/.test(char));
            }
        } else {
            // 英文文本分词 - 按空格分割
            words = lowerText.split(/\s+/).filter(w => w.trim());
        }

        // 准备词汇信息列表
        const wordInfoList = [];

        // 对于多词情况，将每个单词分开处理
        if (words.length > 1) {
            words.forEach(word => {
                if (word.length >= 1) { // 跳过过短的词
                    wordInfoList.push({
                        word: word,
                        pos: 'noun', // 默认假设为名词，因为没有词性分析
                        weight: 100,  // 默认权重
                        source: options.source || 'original'
                    });
                }
            });
        }
        // 单词情况
        else if (words.length === 1 && words[0].length >= 1) {
            wordInfoList.push({
                word: words[0],
                pos: 'noun', // 默认假设为名词
                weight: 100,  // 默认权重
                source: options.source || 'original'
            });
        }

        // 如果没有有效的词汇，尝试使用整个文本作为一个词汇
        if (wordInfoList.length === 0 && text.length >= 1) {
            wordInfoList.push({
                word: lowerText,
                pos: 'noun',
                weight: 100,
                source: options.source || 'original'
            });
        }

        // 如果没有有效词汇，返回null
        if (wordInfoList.length === 0) {
            console.log('查找匹配: 没有有效词汇');
            return null;
        }

        // 使用通用匹配算法
        const result = this._universalMatchingAlgorithm(wordInfoList, 0, false, options);

        if (result) {
            Logger.debug(`[匹配引擎] 文本分词匹配成功: "${text}" -> ${result.term.catID} (匹配类型: ${result.matchType}, 分数: ${result.score.toFixed(2)})`);
            return result.term;
        }

        Logger.debug(`[匹配引擎] 所有匹配方法均失败: "${text}"`);
        return null;
    }

    /**
     * 基于词性分析结果进行匹配
     * 该方法现在是对findMatch的封装，为了兼容现有代码
     *
     * @param {Array<Object>} posAnalysis - 词性分析结果
     * @param {Object} [options={}] - 额外选项
     * @returns {Object|null} 匹配的术语或null
     */
    findMatchWithPosAnalysis(posAnalysis, options = {}) {
        if (!this.loaded || !posAnalysis || !Array.isArray(posAnalysis) || posAnalysis.length === 0) {
            console.log('基于词性分析的匹配: 输入无效');
            return null;
        }

        console.log('基于词性分析的匹配: 开始匹配', {
            posAnalysisCount: posAnalysis.length,
            options: Object.keys(options)
        });

        // 构建一个虚拟文本，用于调用findMatch
        const virtualText = posAnalysis.map(item => item.word).join(' ');

        // 设置选项
        const matchOptions = {
            ...options,
            source: 'original', // 单语匹配时默认为原始文本
            usePosAnalysis: true // 标记使用词性分析
        };

        // 调用统一的findMatch方法
        return this.findMatch(virtualText, posAnalysis, matchOptions);
    }

    /**
     * 使用双语匹配方法 - 增强版
     * 该方法结合中文和英文词汇，考虑词汇对齐和语言特征，进行智能匹配
     *
     * @param {string} originalText - 原始文本（中文）
     * @param {string} translatedText - 翻译文本（英文）
     * @param {Array<Object>} originalPosAnalysis - 原始文本的词性分析结果
     * @param {Array<Object>} translatedPosAnalysis - 翻译文本的词性分析结果
     * @param {Object} [options={}] - 额外选项
     * @returns {Object|null} 匹配的术语或null
     */
    findMatchWithBilingualText(originalText, translatedText, originalPosAnalysis, translatedPosAnalysis, options = {}) {
        // 验证输入
        if (!this.loaded || (!originalText && !translatedText)) {
            console.log('双语匹配: 输入无效');
            return null;
        }

        console.log('双语匹配: 开始匹配', {
            originalText,
            translatedText,
            originalWordsCount: originalPosAnalysis ? originalPosAnalysis.length : 0,
            translatedWordsCount: translatedPosAnalysis ? translatedPosAnalysis.length : 0
        });

        // 收集所有分词后的词汇
        const allWords = [];

        // 设置语言权重 - 可以通过选项调整
        const originalWeight = options.originalWeight || 1.2; // 原始语言权重默认更高
        const translatedWeight = options.translatedWeight || 1.0;

        // 收集中文词汇
        if (originalPosAnalysis && originalPosAnalysis.length > 0) {
            originalPosAnalysis.forEach(item => {
                // 跳过无效词汇
                if (!item.word || typeof item.word !== 'string') return;

                // 计算这个词的权重
                const wordWeight = (item.weight || 1) * originalWeight;

                allWords.push({
                    word: item.word,
                    pos: item.pos,
                    weight: wordWeight,
                    source: 'original'
                });
            });
        }

        // 收集英文词汇
        if (translatedPosAnalysis && translatedPosAnalysis.length > 0) {
            translatedPosAnalysis.forEach(item => {
                // 跳过无效词汇
                if (!item.word || typeof item.word !== 'string') return;

                // 计算这个词的权重
                const wordWeight = (item.weight || 1) * translatedWeight;

                allWords.push({
                    word: item.word,
                    pos: item.pos,
                    weight: wordWeight,
                    source: 'translated'
                });
            });
        }

        // 如果没有词汇，返回null
        if (allWords.length === 0) {
            console.log('双语匹配: 未找到有效词汇');
            return null;
        }

        // 尝试进行词汇对齐 - 对于同一个词性的中英文词汇，增加其权重
        if (originalPosAnalysis && translatedPosAnalysis) {
            try {
                // 对齐名词
                this._alignWordsByPos(allWords, 'noun');
                // 对齐动词
                this._alignWordsByPos(allWords, 'verb');
                // 对齐形容词
                this._alignWordsByPos(allWords, 'adjective');
            } catch (error) {
                console.warn('双语匹配: 词汇对齐失败', error);
            }
        }

        // 使用通用匹配算法，并传入额外选项
        const matchOptions = {
            ...options,
            isBilingual: true, // 标记为双语匹配
            includeMatchDetails: true // 返回匹配详情
        };

        const result = this._universalMatchingAlgorithm(allWords, 0, false, matchOptions);

        if (result) {
            console.log('双语匹配: 成功', {
                originalText,
                translatedText,
                catID: result.term.catID,
                score: result.score,
                matchType: result.matchType
            });
            return result.term;
        }

        console.log('双语匹配: 未找到匹配结果');
        return null;
    }

    /**
     * 对齐相同词性的中英文词汇，增加其权重
     * @param {Array<Object>} wordsList - 词汇列表
     * @param {string} posType - 词性类型
     * @private
     */
    _alignWordsByPos(wordsList, posType) {
        // 按词性类型筛选词汇
        const originalWords = wordsList.filter(w => w.pos === posType && w.source === 'original');
        const translatedWords = wordsList.filter(w => w.pos === posType && w.source === 'translated');

        // 如果两种语言都有该词性的词汇，增加其权重
        if (originalWords.length > 0 && translatedWords.length > 0) {
            // 按权重排序，优先匹配权重高的词汇
            originalWords.sort((a, b) => b.weight - a.weight);
            translatedWords.sort((a, b) => b.weight - a.weight);

            // 对齐数量上限
            const alignLimit = Math.min(originalWords.length, translatedWords.length, 3);

            // 对前几个权重最高的词汇进行对齐
            for (let i = 0; i < alignLimit; i++) {
                // 增加对齐词汇的权重
                originalWords[i].weight *= 1.5;
                translatedWords[i].weight *= 1.5;

                // 添加对齐标记
                originalWords[i].aligned = true;
                translatedWords[i].aligned = true;

                // 记录对齐关系
                originalWords[i].alignedWith = translatedWords[i].word;
                translatedWords[i].alignedWith = originalWords[i].word;
            }
        }
    }



    /**
     * 通用匹配算法 - 核心匹配引擎
     * 该算法是所有匹配方法的核心，基于词汇计数、词性分析和语言特征进行智能匹配
     *
     * @param {Array<Object>} wordInfoList - 词汇信息列表，每个对象包含 word、pos、weight 和 source 属性
     * @param {number} [resultRank=0] - 返回结果的排名，0表示最佳匹配，1表示第二佳匹配，以此类推
     * @param {boolean} [returnAllMatches=false] - 是否返回所有匹配结果
     * @param {Object} [options={}] - 额外选项
     * @returns {Object|Array|null} 指定排名的匹配结果、所有匹配结果数组或null
     * @private
     */
    _universalMatchingAlgorithm(wordInfoList, resultRank = 0, returnAllMatches = false, options = {}) {
        // 验证输入
        if (!this.loaded || !wordInfoList || wordInfoList.length === 0) {
            Logger.debug(`[匹配引擎] 通用匹配算法: 输入无效`);
            return null;
        }

        Logger.debug(`[匹配引擎] 通用匹配算法: 开始匹配`, {
            词汇数量: wordInfoList.length,
            返回所有匹配: returnAllMatches
        });

        // 对每个术语进行匹配计数
        const termMatchCounts = {};
        const termMatchDetails = {};

        // 对每个词汇进行匹配
        for (const wordInfo of wordInfoList) {
            // 跳过无效词汇
            if (!wordInfo.word || typeof wordInfo.word !== 'string') continue;

            const word = wordInfo.word.toLowerCase();
            const isChineseWord = /[\u4e00-\u9fa5]/.test(word);

            for (let i = 0; i < this.terms.length; i++) {
                const term = this.terms[i];
                const termSource = term.source.toLowerCase();
                const termSynonyms = term.synonyms ? term.synonyms.toLowerCase() : '';
                let matched = false;
                let matchScore = 1.0; // 默认匹配分数

                // 根据词汇的语言类型使用不同的匹配策略
                if (isChineseWord) {
                    // 中文词汇匹配策略
                    // 中文不需要边界检查，直接检查包含关系
                    if (termSource.includes(word) || termSynonyms.includes(word)) {
                        matched = true;
                        // 计算匹配分数 - 词汇长度占术语长度的比例
                        matchScore = word.length / Math.max(termSource.length, 1);
                    }
                } else {
                    // 英文词汇匹配策略
                    try {
                        // 使用更精确的匹配方式，确保单词边界
                        // 处理特殊字符，避免正则表达式错误
                        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                        // 尝试不同的匹配方式
                        // 1. 精确匹配 - 完全相等
                        if (termSource === word || termSynonyms.split(',').some(s => s.trim().toLowerCase() === word)) {
                            matched = true;
                            matchScore = 1.0; // 最高分
                        }
                        // 2. 边界匹配 - 使用\b确保是完整单词
                        else {
                            const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
                            if (wordRegex.test(termSource) || wordRegex.test(termSynonyms)) {
                                matched = true;
                                matchScore = 0.9; // 边界匹配的分数稍低
                            }
                            // 3. 包含匹配 - 如果上述方法都失败，尝试简单的包含关系
                            else if (termSource.includes(word) || termSynonyms.includes(word)) {
                                matched = true;
                                // 计算匹配分数 - 词汇长度占术语长度的比例
                                matchScore = 0.7 * (word.length / Math.max(termSource.length, 1));
                            }
                        }
                    } catch (error) {
                        console.warn('正则表达式匹配错误:', error, '尝试使用简单匹配');
                        // 如果正则表达式失败，回退到简单的包含匹配
                        if (termSource.includes(word) || termSynonyms.includes(word)) {
                            matched = true;
                            matchScore = 0.5; // 回退方法的分数更低
                        }
                    }
                }

                // 如果匹配成功
                if (matched) {
                    // 初始化计数器
                    if (!termMatchCounts[term.catID]) {
                        termMatchCounts[term.catID] = 0;
                        termMatchDetails[term.catID] = {
                            term: term,
                            matches: [],
                            posScores: {
                                noun: 0,
                                verb: 0,
                                adjective: 0,
                                adverb: 0,
                                other: 0
                            },
                            totalScore: 0 // 添加总分数字段
                        };
                    }

                    // 增加匹配计数
                    termMatchCounts[term.catID]++;

                    // 计算这个词的权重分数
                    const wordWeight = wordInfo.weight || 1;
                    const sourceWeight = wordInfo.source === 'original' ? 1.2 : 1.0; // 原始语言的词汇权重更高
                    const finalWeight = wordWeight * sourceWeight * matchScore;

                    // 记录匹配详情
                    termMatchDetails[term.catID].matches.push({
                        word: wordInfo.word,
                        pos: wordInfo.pos,
                        weight: finalWeight,
                        source: wordInfo.source,
                        matchScore: matchScore
                    });

                    // 根据词性增加分数
                    if (wordInfo.pos === 'noun') {
                        termMatchDetails[term.catID].posScores.noun += finalWeight;
                    } else if (wordInfo.pos === 'verb') {
                        termMatchDetails[term.catID].posScores.verb += finalWeight;
                    } else if (wordInfo.pos === 'adjective') {
                        termMatchDetails[term.catID].posScores.adjective += finalWeight;
                    } else if (wordInfo.pos === 'adverb') {
                        termMatchDetails[term.catID].posScores.adverb += finalWeight;
                    } else {
                        termMatchDetails[term.catID].posScores.other += finalWeight;
                    }

                    // 更新总分数
                    termMatchDetails[term.catID].totalScore += finalWeight;
                }
            }
        }

        // 如果没有匹配结果，返回null
        if (Object.keys(termMatchCounts).length === 0) {
            Logger.debug(`[匹配引擎] 通用匹配算法: 没有找到匹配结果`);
            return null;
        }

        // 找出匹配最佳的术语
        // 我们使用两个指标进行排序：
        // 1. 匹配词汇数量 - 匹配到的词汇越多越好
        // 2. 总分数 - 考虑词性权重和匹配质量

        // 先按匹配词汇数量找出最佳匹配
        let maxCount = 0;
        let bestMatches = [];

        for (const catID in termMatchCounts) {
            const count = termMatchCounts[catID];
            if (count > maxCount) {
                maxCount = count;
                bestMatches = [catID];
            } else if (count === maxCount) {
                bestMatches.push(catID);
            }
        }

        Logger.debug(`[匹配引擎] 通用匹配算法: 找到匹配数量最多的术语`, {
            最大匹配数: maxCount,
            匹配结果数: bestMatches.length
        });

        // 如果有多个匹配次数相同的术语，使用更智能的排序策略
        if (bestMatches.length > 1) {
            // 首先按总分数排序
            bestMatches.sort((a, b) => {
                const aDetails = termMatchDetails[a];
                const bDetails = termMatchDetails[b];

                // 如果总分数相差超过10%，使用总分数排序
                const scoreDiff = Math.abs(aDetails.totalScore - bDetails.totalScore);
                const avgScore = (aDetails.totalScore + bDetails.totalScore) / 2;
                if (scoreDiff / avgScore > 0.1) {
                    return bDetails.totalScore - aDetails.totalScore;
                }

                // 如果总分数相近，按词性优先级排序

                // 首先比较名词分数 - 名词最重要
                if (aDetails.posScores.noun !== bDetails.posScores.noun) {
                    return bDetails.posScores.noun - aDetails.posScores.noun;
                }

                // 如果名词分数相同，比较动词分数
                if (aDetails.posScores.verb !== bDetails.posScores.verb) {
                    return bDetails.posScores.verb - aDetails.posScores.verb;
                }

                // 如果动词分数相同，比较形容词分数
                if (aDetails.posScores.adjective !== bDetails.posScores.adjective) {
                    return bDetails.posScores.adjective - aDetails.posScores.adjective;
                }

                // 如果形容词分数相同，比较副词分数
                if (aDetails.posScores.adverb !== bDetails.posScores.adverb) {
                    return bDetails.posScores.adverb - aDetails.posScores.adverb;
                }

                // 如果词性分数都相同，比较原始语言和翻译语言的匹配数量
                const aOriginalMatches = aDetails.matches.filter(m => m.source === 'original').length;
                const bOriginalMatches = bDetails.matches.filter(m => m.source === 'original').length;

                if (aOriginalMatches !== bOriginalMatches) {
                    return bOriginalMatches - aOriginalMatches; // 原始语言匹配数量多的优先
                }

                // 如果所有指标都相同，比较其他分数
                return bDetails.posScores.other - aDetails.posScores.other;
            });

            Logger.debug(`[匹配引擎] 通用匹配算法: 按智能排序后的最佳匹配`, {
                最佳匹配: bestMatches[0],
                分数: termMatchDetails[bestMatches[0]].totalScore.toFixed(2)
            });
        }

        // 如果要求返回所有匹配结果
        if (returnAllMatches) {
            // 准备所有匹配结果
            const allResults = [];

            // 处理每个匹配结果
            for (let i = 0; i < bestMatches.length; i++) {
                const matchCatID = bestMatches[i];
                const matchDetails = termMatchDetails[matchCatID];

                // 计算匹配类型
                let matchType = 'universal_';

                // 添加来源信息
                const hasChinese = matchDetails.matches.some(m => m.source === 'original');
                const hasEnglish = matchDetails.matches.some(m => m.source === 'translated');

                if (hasChinese && hasEnglish) {
                    matchType += 'bilingual_';
                } else if (hasChinese) {
                    matchType += 'chinese_';
                } else {
                    matchType += 'english_';
                }

                // 添加词性信息 - 使用最高分的词性
                const posScores = matchDetails.posScores;
                const maxPosScore = Math.max(
                    posScores.noun,
                    posScores.verb,
                    posScores.adjective,
                    posScores.adverb,
                    posScores.other
                );

                if (maxPosScore === posScores.noun && posScores.noun > 0) {
                    matchType += 'noun';
                } else if (maxPosScore === posScores.verb && posScores.verb > 0) {
                    matchType += 'verb';
                } else if (maxPosScore === posScores.adjective && posScores.adjective > 0) {
                    matchType += 'adjective';
                } else if (maxPosScore === posScores.adverb && posScores.adverb > 0) {
                    matchType += 'adverb';
                } else {
                    matchType += 'other';
                }

                // 添加到结果数组
                allResults.push({
                    term: matchDetails.term,
                    matchType: matchType,
                    score: matchDetails.totalScore,
                    rank: i,
                    matchCount: termMatchCounts[matchCatID],
                    matchDetails: matchDetails.matches.map(m => ({ word: m.word, pos: m.pos, source: m.source })),
                    posScores: { ...matchDetails.posScores }
                });
            }

            Logger.debug(`[匹配引擎] 通用匹配算法: 返回所有 ${allResults.length} 个匹配结果`);
            return allResults;
        }

        // 如果只返回指定排名的结果
        // 检查是否请求的排名超出了可用的匹配结果范围
        if (resultRank >= bestMatches.length) {
            Logger.debug(`[匹配引擎] 通用匹配算法: 请求的排名 ${resultRank} 超出了可用的匹配结果范围 (${bestMatches.length})`);
            // 如果有至少一个匹配结果，返回最后一个可用的匹配结果
            if (bestMatches.length > 0) {
                resultRank = bestMatches.length - 1;
                Logger.debug(`[匹配引擎] 通用匹配算法: 返回最后一个可用的匹配结果（排名 ${resultRank}）`);
            } else {
                return null;
            }
        }

        // 获取指定排名的匹配结果
        const selectedMatchCatID = bestMatches[resultRank];
        const selectedMatchDetails = termMatchDetails[selectedMatchCatID];

        // 计算匹配类型
        let matchType = 'universal_';

        // 添加来源信息
        const hasChinese = selectedMatchDetails.matches.some(m => m.source === 'original');
        const hasEnglish = selectedMatchDetails.matches.some(m => m.source === 'translated');

        if (hasChinese && hasEnglish) {
            matchType += 'bilingual_';
        } else if (hasChinese) {
            matchType += 'chinese_';
        } else {
            matchType += 'english_';
        }

        // 添加词性信息 - 使用最高分的词性
        const posScores = selectedMatchDetails.posScores;
        const maxPosScore = Math.max(
            posScores.noun,
            posScores.verb,
            posScores.adjective,
            posScores.adverb,
            posScores.other
        );

        if (maxPosScore === posScores.noun && posScores.noun > 0) {
            matchType += 'noun';
        } else if (maxPosScore === posScores.verb && posScores.verb > 0) {
            matchType += 'verb';
        } else if (maxPosScore === posScores.adjective && posScores.adjective > 0) {
            matchType += 'adjective';
        } else if (maxPosScore === posScores.adverb && posScores.adverb > 0) {
            matchType += 'adverb';
        } else {
            matchType += 'other';
        }

        // 根据排名显示不同的日志信息
        if (resultRank === 0) {
            Logger.debug(`[匹配引擎] 通用匹配算法: 最佳结果`, {
                匹配类型: matchType,
                分数: selectedMatchDetails.totalScore.toFixed(2),
                CatID: selectedMatchCatID,
                匹配数: termMatchCounts[selectedMatchCatID]
            });
        } else {
            Logger.debug(`[匹配引擎] 通用匹配算法: 第 ${resultRank+1} 佳结果`, {
                匹配类型: matchType,
                分数: selectedMatchDetails.totalScore.toFixed(2),
                CatID: selectedMatchCatID,
                匹配数: termMatchCounts[selectedMatchCatID]
            });
        }

        // 使用选项参数进行额外处理
        if (options && options.includeMatchDetails) {
            // 如果需要返回匹配详情，包含更多信息
            return {
                term: selectedMatchDetails.term,
                matchType: matchType,
                score: selectedMatchDetails.totalScore,
                rank: resultRank,
                availableMatchCount: bestMatches.length,
                matchCount: termMatchCounts[selectedMatchCatID],
                matchDetails: selectedMatchDetails.matches.map(m => ({ word: m.word, pos: m.pos, source: m.source })),
                posScores: { ...selectedMatchDetails.posScores }
            };
        }

        // 返回标准结果
        return {
            term: selectedMatchDetails.term,
            matchType: matchType,
            score: selectedMatchDetails.totalScore,
            rank: resultRank,
            availableMatchCount: bestMatches.length // 返回可用的匹配结果数量
        };
    }

    /**
     * 识别文本的分类 - 智能匹配入口
     * 该方法整合了所有匹配策略，包括AI辅助分类、双语匹配和传统匹配
     *
     * @param {string} text - 要识别的文本
     * @param {Object} translationProvider - 翻译服务提供者（用于AI辅助分类）
     * @param {Array<Object>} [posAnalysis=null] - 词性分析结果，如果提供则使用分词系统进行匹配
     * @param {Object} [options={}] - 额外选项，如翻译文本和其词性分析结果
     * @returns {Promise<string>} 分类名称或空字符串
     */
    async identifyCategory(text, translationProvider = null, posAnalysis = null, options = {}) {
        // 验证输入
        if (!this.loaded || !text) {
            console.log('识别分类: 输入无效');
            return '';
        }

        // 使用Logger记录关键日志，更清晰地标记当前执行的匹配策略
        Logger.debug(`[匹配引擎] 开始识别分类: "${text}"`, {
            翻译服务: !!translationProvider,
            词性分析: posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0,
            选项: options ? Object.keys(options).join(', ') : '无'
        });

        // 定义匹配策略优先级
        const matchStrategies = [
            // 1. AI辅助分类 - 如果启用了AI辅助分类并且提供了翻译服务
            async () => {
                if (this.matchSettings.useAIClassification && this.aiClassifier && translationProvider) {
                    try {
                        const aiClassification = await this.aiClassifier.getClassification(text, translationProvider);
                        if (aiClassification && aiClassification.catID) {
                            Logger.info(`[匹配引擎] 策略 1/6 - AI辅助分类成功: "${text}" -> ${aiClassification.catID}`);
                            return aiClassification.catID;
                        }
                    } catch (error) {
                        Logger.error(`[匹配引擎] 策略 1/6 - AI辅助分类失败: ${error.message || error}`);
                    }
                }
                return null;
            },

            // 2. 双语匹配 - 如果提供了翻译文本
            async () => {
                if (options && options.translatedText) {
                    // 使用增强的双语匹配方法
                    const bilingualOptions = {
                        ...options,
                        originalWeight: 1.2,  // 原始语言权重更高
                        translatedWeight: 1.0 // 翻译语言权重
                    };

                    const bilingualMatch = this.findMatchWithBilingualText(
                        text,
                        options.translatedText,
                        posAnalysis,
                        options.translatedPosAnalysis,
                        bilingualOptions
                    );

                    if (bilingualMatch) {
                        Logger.info(`[匹配引擎] 策略 2/6 - 双语匹配成功: "${text}" + "${options.translatedText}" -> ${bilingualMatch.catID}`);
                        return bilingualMatch.catID;
                    }
                }
                return null;
            },

            // 3. 基于词性分析的匹配 - 如果提供了词性分析结果
            async () => {
                if (posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0) {
                    // 使用增强的findMatch方法
                    const matchOptions = {
                        ...options,
                        source: 'original',
                        usePosAnalysis: true
                    };

                    const match = this.findMatch(text, posAnalysis, matchOptions);
                    if (match && match.category) {
                        Logger.info(`[匹配引擎] 策略 3/6 - 词性分析匹配成功: "${text}" -> ${match.catID}`);
                        return match.category;
                    }
                }
                return null;
            },

            // 4. 基于翻译文本的匹配 - 如果提供了翻译文本
            async () => {
                if (options && options.translatedText) {
                    // 使用翻译文本进行匹配
                    const matchOptions = {
                        ...options,
                        source: 'translated'
                    };

                    const match = this.findMatch(options.translatedText, options.translatedPosAnalysis, matchOptions);
                    if (match && match.category) {
                        Logger.info(`[匹配引擎] 策略 4/6 - 翻译文本匹配成功: "${options.translatedText}" -> ${match.catID}`);
                        return match.category;
                    }
                }
                return null;
            },

            // 5. 基于原始文本的匹配 - 最后的备选方案
            async () => {
                // 使用原始文本进行匹配
                const match = this.findMatch(text, null, options);
                if (match && match.category) {
                    Logger.info(`[匹配引擎] 策略 5/6 - 原始文本匹配成功: "${text}" -> ${match.catID}`);
                    return match.category;
                }
                return null;
            },

            // 6. 直接匹配分类 - 如果文本是单词
            async () => {
                // 如果文本是单词，尝试直接匹配分类
                if (text.indexOf(' ') === -1) {
                    const lowerText = text.toLowerCase();
                    const categoryMatches = [];

                    // 完全匹配
                    for (let i = 0; i < this.terms.length; i++) {
                        if (this.terms[i].source.toLowerCase() === lowerText) {
                            categoryMatches.push({
                                category: this.terms[i].category || this.terms[i].source,
                                score: this.matchSettings.priorityWeights.exactMatch,
                                matchType: 'category_exact'
                            });
                        }
                    }

                    // 开头匹配
                    for (let j = 0; j < this.terms.length; j++) {
                        const termSource = this.terms[j].source.toLowerCase();
                        if (lowerText.startsWith(termSource) && termSource !== lowerText) {
                            categoryMatches.push({
                                category: this.terms[j].category || this.terms[j].source,
                                score: (termSource.length / lowerText.length) * this.matchSettings.priorityWeights.partialMatch,
                                matchType: 'category_starts_with'
                            });
                        }
                    }

                    // 包含匹配
                    for (let k = 0; k < this.terms.length; k++) {
                        const termSource = this.terms[k].source.toLowerCase();
                        if (lowerText.includes(termSource) && !lowerText.startsWith(termSource) && termSource !== lowerText) {
                            categoryMatches.push({
                                category: this.terms[k].category || this.terms[k].source,
                                score: (termSource.length / lowerText.length) * this.matchSettings.priorityWeights.containsMatch / 2,
                                matchType: 'category_contains'
                            });
                        }
                    }

                    // 如果有匹配结果，按分数排序并返回最高分数的分类
                    if (categoryMatches.length > 0) {
                        categoryMatches.sort((a, b) => b.score - a.score);
                        const bestCategoryMatch = categoryMatches[0];
                        Logger.info(`[匹配引擎] 策略 6/6 - 直接匹配分类成功: "${text}" -> ${bestCategoryMatch.category} (匹配类型: ${bestCategoryMatch.matchType}, 分数: ${bestCategoryMatch.score.toFixed(2)})`);
                        return bestCategoryMatch.category;
                    }
                }
                return null;
            }
        ];

        // 按照优先级顺序尝试每种匹配策略
        for (const strategy of matchStrategies) {
            const result = await strategy();
            if (result) {
                return result;
            }
        }

        Logger.warn(`[匹配引擎] 所有匹配策略均失败: "${text}"`);
        return '';
    }

    /**
     * 获取所有分类
     * @returns {Array<string>} 分类列表
     */
    getCategories() {
        return this.categories.slice();
    }

    /**
     * 获取特定分类的所有术语
     * @param {string} category - 分类名称
     * @returns {Array<Object>} 术语列表
     */
    getTermsByCategory(category) {
        if (!category) {
            return this.terms.slice();
        }

        return this.terms.filter(function(term) {
            return term.category === category;
        });
    }

    /**
     * 根据分类和子分类查找术语
     * @param {string} category - 分类名称
     * @param {string} subCategory - 子分类名称
     * @returns {Object|null} 匹配的术语对象
     */
    findTermByCategory(category, subCategory) {
        if (!this.loaded || !this.terms || this.terms.length === 0) {
            return null;
        }

        category = category.toUpperCase();
        subCategory = subCategory.toUpperCase();

        // 先尝试精确匹配分类和子分类
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.category && term.category.toUpperCase() === category &&
                term.source && term.source.toUpperCase() === subCategory) {
                console.log(`精确匹配到分类和子分类: ${category}/${subCategory}`);
                return term;
            }
        }

        // 如果没有找到精确匹配，尝试只匹配分类
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.category && term.category.toUpperCase() === category) {
                console.log(`只匹配到分类: ${category}`);
                return term;
            }
        }

        return null;
    }

    /**
     * 根据关键词精确匹配术语
     * @param {string} keyword - 要匹配的关键词
     * @returns {Object|null} 匹配的术语或null
     */
    findTermByKeyword(keyword) {
        if (!this.loaded || !keyword) {
            return null;
        }

        // 转换为小写进行不区分大小写的匹配
        const lowerKeyword = keyword.toLowerCase();

        // 先尝试在术语源中精确匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.source.toLowerCase() === lowerKeyword) {
                console.log(`在术语源中精确匹配到关键词: ${keyword}`);
                return term;
            }
        }

        // 如果在术语源中没有找到，尝试在同义词中匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.synonyms) {
                const synonyms = term.synonyms.split(',').map(s => s.trim().toLowerCase());
                if (synonyms.includes(lowerKeyword)) {
                    console.log(`在同义词中精确匹配到关键词: ${keyword}`);
                    return term;
                }
            }
        }

        return null;
    }

    /**
     * 检查CatID是否有效（在CSV表格中存在）
     * @param {string} catID - 要检查的CatID
     * @returns {boolean} 是否有效
     */
    isValidCatID(catID) {
        if (!this.loaded || !catID) {
            return false;
        }

        // 检查CatID是否在CSV表格中存在
        for (let i = 0; i < this.terms.length; i++) {
            if (this.terms[i].catID === catID) {
                return true;
            }
        }

        return false;
    }

    /**
     * 根据关键词部分匹配术语
     * @param {string} keyword - 要匹配的关键词
     * @returns {Object|null} 匹配的术语或null
     */
    findTermByPartialKeyword(keyword) {
        if (!this.loaded || !keyword) {
            return null;
        }

        // 转换为小写进行不区分大小写的匹配
        const lowerKeyword = keyword.toLowerCase();

        // 收集所有可能的匹配结果
        const matches = [];

        // 在术语源中匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            const termSource = term.source.toLowerCase();

            // 如果术语源包含关键词
            if (termSource.includes(lowerKeyword)) {
                matches.push({
                    term: term,
                    score: (lowerKeyword.length / termSource.length) * 100,
                    matchType: 'source_contains'
                });
            }
            // 如果关键词包含术语源
            else if (lowerKeyword.includes(termSource)) {
                matches.push({
                    term: term,
                    score: (termSource.length / lowerKeyword.length) * 80,
                    matchType: 'keyword_contains_source'
                });
            }
        }

        // 在同义词中匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.synonyms) {
                const synonyms = term.synonyms.split(',').map(s => s.trim().toLowerCase());

                for (let j = 0; j < synonyms.length; j++) {
                    const synonym = synonyms[j];
                    if (!synonym) continue;

                    // 如果同义词包含关键词
                    if (synonym.includes(lowerKeyword)) {
                        matches.push({
                            term: term,
                            score: (lowerKeyword.length / synonym.length) * 60,
                            matchType: 'synonym_contains'
                        });
                        break;
                    }
                    // 如果关键词包含同义词
                    else if (lowerKeyword.includes(synonym)) {
                        matches.push({
                            term: term,
                            score: (synonym.length / lowerKeyword.length) * 40,
                            matchType: 'keyword_contains_synonym'
                        });
                        break;
                    }
                }
            }
        }

        // 如果没有匹配结果，返回null
        if (matches.length === 0) {
            return null;
        }

        // 按分数排序，返回分数最高的匹配结果
        matches.sort((a, b) => b.score - a.score);
        const bestMatch = matches[0];
        console.log(`部分匹配到关键词: ${keyword}, 匹配类型: ${bestMatch.matchType}, 分数: ${bestMatch.score}`);
        return bestMatch.term;
    }

    /**
     * 根据CatID查找术语
     * @param {string} catID - 要查找的CatID
     * @returns {Object|null} 找到的术语或null
     */
    findTermByCatID(catID) {
        if (!this.loaded || !catID) {
            return null;
        }

        // 检查是否在术语库中存在
        for (let i = 0; i < this.terms.length; i++) {
            if (this.terms[i].catID === catID) {
                return this.terms[i];
            }
        }

        console.warn(`CatID "${catID}" 在CSV表格中不存在`);
        return null;
    }

    /**
     * 获取所有可能的匹配结果 - 增强版
     * 该方法整合了所有匹配策略，返回所有可能的匹配结果，便于用户选择替代匹配
     *
     * @param {string} text - 要匹配的文本
     * @param {Array<Object>} [posAnalysis=null] - 词性分析结果
     * @param {Object} [options={}] - 额外选项，如翻译文本和其词性分析结果
     * @returns {Array<Object>} 所有可能的匹配结果
     */
    getAllMatches(text, posAnalysis = null, options = {}) {
        // 验证输入
        if (!this.loaded || !text) {
            Logger.debug(`[匹配引擎] 获取所有匹配: 输入无效`);
            return [];
        }

        Logger.debug(`[匹配引擎] 获取所有匹配: 开始匹配 "${text}"`, {
            词性分析: posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0,
            选项: options ? Object.keys(options).join(', ') : '无'
        });

        const allMatches = [];
        const matchedCatIDs = new Set(); // 记录已经匹配的CatID，避免重复

        // 定义匹配策略
        const matchStrategies = [
            // 1. 双语匹配 - 如果提供了翻译文本
            () => {
                if (options && options.translatedText) {
                    // 准备双语词汇列表
                    const bilingualWordInfoList = [];

                    // 添加原始语言词汇
                    if (posAnalysis && posAnalysis.length > 0) {
                        posAnalysis.forEach(item => {
                            if (!item.word || typeof item.word !== 'string') return;

                            bilingualWordInfoList.push({
                                word: item.word,
                                pos: item.pos,
                                weight: item.weight || 1,
                                source: 'original'
                            });
                        });
                    }

                    // 添加翻译语言词汇
                    if (options.translatedPosAnalysis && options.translatedPosAnalysis.length > 0) {
                        options.translatedPosAnalysis.forEach(item => {
                            if (!item.word || typeof item.word !== 'string') return;

                            bilingualWordInfoList.push({
                                word: item.word,
                                pos: item.pos,
                                weight: item.weight || 1,
                                source: 'translated'
                            });
                        });
                    }

                    // 使用通用匹配算法获取所有匹配结果
                    if (bilingualWordInfoList.length > 0) {
                        const bilingualOptions = {
                            ...options,
                            originalWeight: 1.2,  // 原始语言权重更高
                            translatedWeight: 1.0 // 翻译语言权重
                        };

                        const bilingualMatches = this._universalMatchingAlgorithm(bilingualWordInfoList, 0, true, bilingualOptions);
                        if (bilingualMatches && bilingualMatches.length > 0) {
                            bilingualMatches.forEach(match => {
                                if (!matchedCatIDs.has(match.term.catID)) {
                                    allMatches.push({
                                        ...match,
                                        matchSource: 'bilingual',
                                        priority: 1 // 双语匹配优先级最高
                                    });
                                    matchedCatIDs.add(match.term.catID);
                                }
                            });
                        }
                    }
                }
            },

            // 2. 原始语言词性分析匹配
            () => {
                if (posAnalysis && posAnalysis.length > 0) {
                    const originalWordInfoList = posAnalysis.map(item => {
                        if (!item.word || typeof item.word !== 'string') return null;

                        return {
                            word: item.word,
                            pos: item.pos,
                            weight: item.weight || 1,
                            source: 'original'
                        };
                    }).filter(Boolean); // 过滤无效项

                    if (originalWordInfoList.length > 0) {
                        const originalMatches = this._universalMatchingAlgorithm(originalWordInfoList, 0, true, options);
                        if (originalMatches && originalMatches.length > 0) {
                            originalMatches.forEach(match => {
                                if (!matchedCatIDs.has(match.term.catID)) {
                                    allMatches.push({
                                        ...match,
                                        matchSource: 'original',
                                        priority: 2 // 原始语言匹配优先级次之
                                    });
                                    matchedCatIDs.add(match.term.catID);
                                }
                            });
                        }
                    }
                }
            },

            // 3. 翻译语言词性分析匹配
            () => {
                if (options && options.translatedText && options.translatedPosAnalysis && options.translatedPosAnalysis.length > 0) {
                    const translatedWordInfoList = options.translatedPosAnalysis.map(item => {
                        if (!item.word || typeof item.word !== 'string') return null;

                        return {
                            word: item.word,
                            pos: item.pos,
                            weight: item.weight || 1,
                            source: 'translated'
                        };
                    }).filter(Boolean); // 过滤无效项

                    if (translatedWordInfoList.length > 0) {
                        const translatedOptions = {
                            ...options,
                            source: 'translated'
                        };

                        const translatedMatches = this._universalMatchingAlgorithm(translatedWordInfoList, 0, true, translatedOptions);
                        if (translatedMatches && translatedMatches.length > 0) {
                            translatedMatches.forEach(match => {
                                if (!matchedCatIDs.has(match.term.catID)) {
                                    allMatches.push({
                                        ...match,
                                        matchSource: 'translated',
                                        priority: 3 // 翻译语言匹配优先级第三
                                    });
                                    matchedCatIDs.add(match.term.catID);
                                }
                            });
                        }
                    }
                }
            },

            // 4. 简单分词匹配 - 如果没有词性分析结果
            () => {
                // 检测是否为中文文本
                const hasChinese = /[\u4e00-\u9fa5]/.test(text);
                const lowerText = text.toLowerCase();
                let words = [];

                if (hasChinese) {
                    // 中文文本分词 - 先尝试按空格分割，如果没有空格则按字符分割
                    const spaceWords = lowerText.split(/\s+/).filter(w => w.trim());
                    if (spaceWords.length > 1) {
                        words = spaceWords;
                    } else {
                        // 按字符分割中文
                        words = Array.from(lowerText).filter(char => /[\u4e00-\u9fa5]/.test(char));
                    }
                } else {
                    // 英文文本分词 - 按空格分割
                    words = lowerText.split(/\s+/).filter(w => w.trim());
                }

                // 准备词汇信息列表
                const wordInfoList = [];

                // 对于多词情况，将每个单词分开处理
                if (words.length > 1) {
                    words.forEach(word => {
                        if (word.length >= 1) { // 跳过过短的词
                            wordInfoList.push({
                                word: word,
                                pos: 'noun', // 默认假设为名词，因为没有词性分析
                                weight: 100,  // 默认权重
                                source: 'original'
                            });
                        }
                    });
                }
                // 单词情况
                else if (words.length === 1 && words[0].length >= 1) {
                    wordInfoList.push({
                        word: words[0],
                        pos: 'noun', // 默认假设为名词
                        weight: 100,  // 默认权重
                        source: 'original'
                    });
                }

                // 如果没有有效的词汇，尝试使用整个文本作为一个词汇
                if (wordInfoList.length === 0 && text.length >= 1) {
                    wordInfoList.push({
                        word: lowerText,
                        pos: 'noun',
                        weight: 100,
                        source: 'original'
                    });
                }

                if (wordInfoList.length > 0) {
                    const simpleOptions = {
                        ...options,
                        source: 'original'
                    };

                    const simpleMatches = this._universalMatchingAlgorithm(wordInfoList, 0, true, simpleOptions);
                    if (simpleMatches && simpleMatches.length > 0) {
                        simpleMatches.forEach(match => {
                            if (!matchedCatIDs.has(match.term.catID)) {
                                allMatches.push({
                                    ...match,
                                    matchSource: 'simple',
                                    priority: 4 // 简单匹配优先级最低
                                });
                                matchedCatIDs.add(match.term.catID);
                            }
                        });
                    }
                }
            }
        ];

        // 执行所有匹配策略
        matchStrategies.forEach(strategy => strategy());

        // 按优先级和分数排序
        allMatches.sort((a, b) => {
            // 先按优先级排序
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // 优先级相同时按分数排序
            return b.score - a.score;
        });

        Logger.info(`[匹配引擎] 获取所有匹配: 找到 ${allMatches.length} 个匹配结果`);
        return allMatches;
    }

    /**
     * 检查CatID是否有效
     * @param {string} catID - 要检查的CatID
     * @returns {boolean} 是否有效
     */
    isValidCatID(catID) {
        if (!this.loaded || !catID) {
            return false;
        }

        // 检查是否在术语库中存在
        for (let i = 0; i < this.terms.length; i++) {
            if (this.terms[i].catID === catID) {
                return true;
            }
        }

        console.warn(`CatID "${catID}" 在CSV表格中不存在`);
        return false;
    }
}

// 导出CSVMatcher
window.CSVMatcher = CSVMatcher;