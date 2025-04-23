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
     * 查找匹配的术语
     * @param {string} text - 要匹配的文本
     * @param {Array<Object>} [posAnalysis=null] - 词性分析结果，如果提供则使用分词系统进行匹配
     * @returns {Object|null} 匹配的术语或null
     */
    findMatch(text, posAnalysis = null) {
        if (!this.loaded || !text) {
            return null;
        }

        // 检查是否提供了词性分析结果
        if (posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0) {
            // 使用分词系统进行匹配
            return this.findMatchWithPosAnalysis(posAnalysis);
        }

        // 如果没有词性分析结果，尝试使用简单的分词方式
        const lowerText = text.toLowerCase();
        const words = lowerText.split(/\s+/);

        // 准备词汇信息列表
        const wordInfoList = [];

        // 对于单词，添加到词汇列表
        if (words.length > 1) {
            // 多词情况，将每个单词分开处理
            words.forEach(word => {
                if (word.length >= 2) { // 跳过过短的词
                    wordInfoList.push({
                        word: word,
                        pos: 'noun', // 默认假设为名词，因为没有词性分析
                        weight: 100,  // 默认权重
                        source: 'original'
                    });
                }
            });
        } else if (words.length === 1 && words[0].length >= 2) {
            // 单词情况
            wordInfoList.push({
                word: words[0],
                pos: 'noun', // 默认假设为名词
                weight: 100,  // 默认权重
                source: 'original'
            });
        }

        // 如果没有有效的词汇，尝试使用整个文本作为一个词汇
        if (wordInfoList.length === 0 && text.length >= 2) {
            wordInfoList.push({
                word: lowerText,
                pos: 'noun',
                weight: 100,
                source: 'original'
            });
        }

        // 使用通用匹配算法
        const result = this._universalMatchingAlgorithm(wordInfoList, 0);

        if (result) {
            console.log('基于文本的匹配成功:', result.matchType, '分数:', result.score);
            return result.term;
        }

        // 如果通用算法失败，尝试精确匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.source.toLowerCase() === lowerText) {
                console.log('使用精确匹配成功:', lowerText);
                return term;
            }
        }

        // 如果精确匹配也失败，尝试同义词匹配
        for (let i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.synonyms) {
                const synonyms = term.synonyms.split(',').map(s => s.trim().toLowerCase());
                for (const synonym of synonyms) {
                    if (synonym === lowerText) {
                        console.log('使用同义词精确匹配成功:', lowerText);
                        return term;
                    }
                }
            }
        }

        return null;
    }

    /**
     * 基于词性分析结果进行匹配
     * @param {Array<Object>} posAnalysis - 词性分析结果
     * @returns {Object|null} 匹配的术语或null
     */
    findMatchWithPosAnalysis(posAnalysis) {
        if (!this.loaded || !posAnalysis || !Array.isArray(posAnalysis) || posAnalysis.length === 0) {
            return null;
        }

        console.log('使用分词系统进行匹配，词性分析结果:', posAnalysis);

        // 准备词汇信息列表
        const wordInfoList = posAnalysis.map(item => ({
            word: item.word,
            pos: item.pos,
            weight: item.weight,
            source: 'original' // 单语匹配时默认为原始文本
        }));

        // 使用通用匹配算法
        const result = this._universalMatchingAlgorithm(wordInfoList, 0);

        if (result) {
            console.log('基于词性分析的匹配成功:', result.matchType, '分数:', result.score);
            return result.term;
        }

        console.log('基于词性分析的匹配未找到结果');
        return null;
    }

    /**
     * 使用双语匹配方法
     * @param {string} originalText - 原始文本（中文）
     * @param {string} translatedText - 翻译文本（英文）
     * @param {Array<Object>} originalPosAnalysis - 原始文本的词性分析结果
     * @param {Array<Object>} translatedPosAnalysis - 翻译文本的词性分析结果
     * @returns {Object|null} 匹配的术语或null
     */
    findMatchWithBilingualText(originalText, translatedText, originalPosAnalysis, translatedPosAnalysis) {
        if (!this.loaded || (!originalText && !translatedText)) {
            return null;
        }

        console.log('使用双语匹配方法:', {
            originalText,
            translatedText,
            originalPosAnalysis,
            translatedPosAnalysis
        });

        // 收集所有分词后的词汇
        const allWords = [];

        // 收集中文词汇
        if (originalPosAnalysis && originalPosAnalysis.length > 0) {
            originalPosAnalysis.forEach(item => {
                allWords.push({
                    word: item.word,
                    pos: item.pos,
                    weight: item.weight,
                    source: 'original'
                });
            });
        }

        // 收集英文词汇
        if (translatedPosAnalysis && translatedPosAnalysis.length > 0) {
            translatedPosAnalysis.forEach(item => {
                allWords.push({
                    word: item.word,
                    pos: item.pos,
                    weight: item.weight,
                    source: 'translated'
                });
            });
        }

        // 如果没有词汇，返回null
        if (allWords.length === 0) {
            console.log('双语匹配未找到词汇');
            return null;
        }

        // 使用通用匹配算法
        const result = this._universalMatchingAlgorithm(allWords, 0);

        if (result) {
            console.log('双语匹配成功:', originalText, '->', result.term.catID);
            return result.term;
        }

        return null;
    }



    /**
     * 通用匹配算法 - 基于词汇计数和词性排序
     * @param {Array<Object>} wordInfoList - 词汇信息列表，每个对象包含 word、pos、weight 和 source 属性
     * @param {number} [resultRank=0] - 返回结果的排名，0表示最佳匹配，1表示第二佳匹配，以此类推
     * @param {boolean} [returnAllMatches=false] - 是否返回所有匹配结果
     * @returns {Object|Array|null} 指定排名的匹配结果、所有匹配结果数组或null
     * @private
     */
    _universalMatchingAlgorithm(wordInfoList, resultRank = 0, returnAllMatches = false) {
        if (!this.loaded || !wordInfoList || wordInfoList.length === 0) {
            return null;
        }

        // 对每个术语进行匹配计数
        const termMatchCounts = {};
        const termMatchDetails = {};

        // 对每个词汇进行匹配
        for (const wordInfo of wordInfoList) {
            for (let i = 0; i < this.terms.length; i++) {
                const term = this.terms[i];
                const termSource = term.source.toLowerCase();
                const termSynonyms = term.synonyms ? term.synonyms.toLowerCase() : '';

                // 使用更精确的匹配方式，确保单词边界
                const wordRegex = new RegExp(`\\b${wordInfo.word}\\b`, 'i');
                if (wordRegex.test(termSource) || wordRegex.test(termSynonyms)) {
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
                            }
                        };
                    }

                    // 增加匹配计数
                    termMatchCounts[term.catID]++;

                    // 记录匹配详情
                    termMatchDetails[term.catID].matches.push({
                        word: wordInfo.word,
                        pos: wordInfo.pos,
                        weight: wordInfo.weight,
                        source: wordInfo.source
                    });

                    // 根据词性增加分数
                    if (wordInfo.pos === 'noun') {
                        termMatchDetails[term.catID].posScores.noun += wordInfo.weight;
                    } else if (wordInfo.pos === 'verb') {
                        termMatchDetails[term.catID].posScores.verb += wordInfo.weight;
                    } else if (wordInfo.pos === 'adjective') {
                        termMatchDetails[term.catID].posScores.adjective += wordInfo.weight;
                    } else if (wordInfo.pos === 'adverb') {
                        termMatchDetails[term.catID].posScores.adverb += wordInfo.weight;
                    } else {
                        termMatchDetails[term.catID].posScores.other += wordInfo.weight;
                    }
                }
            }
        }

        // 如果没有匹配结果，返回null
        if (Object.keys(termMatchCounts).length === 0) {
            return null;
        }

        // 找出匹配次数最多的术语
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

        // 如果有多个匹配次数相同的术语，按词性排序
        if (bestMatches.length > 1) {
            // 按名词分数排序，名词分数高的优先
            bestMatches.sort((a, b) => {
                const aDetails = termMatchDetails[a];
                const bDetails = termMatchDetails[b];

                // 首先比较名词分数
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

                // 如果所有词性分数都相同，比较其他分数
                return bDetails.posScores.other - aDetails.posScores.other;
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

                // 添加词性信息
                if (matchDetails.posScores.noun > 0) {
                    matchType += 'noun';
                } else if (matchDetails.posScores.verb > 0) {
                    matchType += 'verb';
                } else if (matchDetails.posScores.adjective > 0) {
                    matchType += 'adjective';
                } else {
                    matchType += 'other';
                }

                // 计算总分数
                const totalScore = matchDetails.posScores.noun +
                                  matchDetails.posScores.verb +
                                  matchDetails.posScores.adjective +
                                  matchDetails.posScores.adverb +
                                  matchDetails.posScores.other;

                // 添加到结果数组
                allResults.push({
                    term: matchDetails.term,
                    matchType: matchType,
                    score: totalScore,
                    rank: i
                });
            }

            console.log(`返回所有 ${allResults.length} 个匹配结果`);
            return allResults;
        }

        // 如果只返回指定排名的结果
        // 检查是否请求的排名超出了可用的匹配结果范围
        if (resultRank >= bestMatches.length) {
            console.log(`请求的排名 ${resultRank} 超出了可用的匹配结果范围 (${bestMatches.length})`);
            // 如果有至少一个匹配结果，返回最后一个可用的匹配结果
            if (bestMatches.length > 0) {
                resultRank = bestMatches.length - 1;
                console.log(`返回最后一个可用的匹配结果（排名 ${resultRank}）`);
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

        // 添加词性信息
        if (selectedMatchDetails.posScores.noun > 0) {
            matchType += 'noun';
        } else if (selectedMatchDetails.posScores.verb > 0) {
            matchType += 'verb';
        } else if (selectedMatchDetails.posScores.adjective > 0) {
            matchType += 'adjective';
        } else {
            matchType += 'other';
        }

        // 计算总分数
        const totalScore = selectedMatchDetails.posScores.noun +
                          selectedMatchDetails.posScores.verb +
                          selectedMatchDetails.posScores.adjective +
                          selectedMatchDetails.posScores.adverb +
                          selectedMatchDetails.posScores.other;

        // 根据排名显示不同的日志信息
        if (resultRank === 0) {
            console.log('通用匹配算法最佳结果:', matchType, '分数:', totalScore, 'CatID:', selectedMatchCatID);
        } else {
            console.log(`通用匹配算法第 ${resultRank+1} 佳结果:`, matchType, '分数:', totalScore, 'CatID:', selectedMatchCatID);
        }

        return {
            term: selectedMatchDetails.term,
            matchType: matchType,
            score: totalScore,
            rank: resultRank,
            availableMatchCount: bestMatches.length // 返回可用的匹配结果数量
        };
    }

    /**
     * 识别文本的分类
     * @param {string} text - 要识别的文本
     * @param {Object} translationProvider - 翻译服务提供者（用于AI辅助分类）
     * @param {Array<Object>} [posAnalysis=null] - 词性分析结果，如果提供则使用分词系统进行匹配
     * @param {Object} [options=null] - 额外选项，如翻译文本和其词性分析结果
     * @returns {Promise<string>} 分类名称或空字符串
     */
    async identifyCategory(text, translationProvider = null, posAnalysis = null, options = null) {
        if (!this.loaded || !text) {
            return '';
        }

        // 如果启用了AI辅助分类匹配并且提供了翻译服务
        if (this.matchSettings.useAIClassification && this.aiClassifier && translationProvider) {
            try {
                // 使用AI辅助分类器获取分类信息
                const aiClassification = await this.aiClassifier.getClassification(text, translationProvider);

                if (aiClassification && aiClassification.catID) {
                    console.log('使用AI辅助分类匹配结果:', text, '->', aiClassification.catID);
                    return aiClassification.catID;
                }
            } catch (error) {
                console.error('使用AI辅助分类匹配失败:', error);
                // 失败时回退到传统匹配方式
            }
        }

        // 检查是否提供了双语匹配选项
        if (options && options.translatedText) {
            // 使用双语匹配方法
            const bilingualMatch = this.findMatchWithBilingualText(
                text,
                options.translatedText,
                posAnalysis,
                options.translatedPosAnalysis
            );

            if (bilingualMatch) {
                console.log('使用双语匹配成功:', text, '->', bilingualMatch.catID);
                return bilingualMatch.catID;
            }
        }

        // 使用findMatch方法来获取匹配结果
        const match = this.findMatch(text, posAnalysis);

        // 如果有匹配结果并且包含分类信息
        if (match) {
            // 处理数组结果（多匹配策略为'allMatches'时）
            if (Array.isArray(match)) {
                if (match.length > 0 && match[0].category) {
                    console.log('在identifyCategory中应用多个匹配结果，选择第一个:', match[0].category);
                    return match[0].category;
                }
            }
            // 处理单个结果
            else if (match.category) {
                console.log('在identifyCategory中找到分类:', match.category);
                return match.category;
            }
        }

        // 如果没有匹配到术语或术语没有分类信息，尝试直接匹配分类
        var lowerText = text.toLowerCase();

        // 如果文本是单词，检查是否与分类名称匹配
        if (text.indexOf(' ') === -1) {
            // 收集所有可能的分类匹配
            const categoryMatches = [];

            // 完全匹配
            for (var i = 0; i < this.terms.length; i++) {
                if (this.terms[i].source.toLowerCase() === lowerText) {
                    categoryMatches.push({
                        category: this.terms[i].category || this.terms[i].source,
                        score: this.matchSettings.priorityWeights.exactMatch,
                        matchType: 'category_exact'
                    });
                }
            }

            // 开头匹配
            for (var j = 0; j < this.terms.length; j++) {
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
            for (var k = 0; k < this.terms.length; k++) {
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
                console.log('在identifyCategory中直接匹配分类:', bestCategoryMatch.matchType, '分数:', bestCategoryMatch.score);
                return bestCategoryMatch.category;
            }
        }

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
     * 获取所有可能的匹配结果
     * @param {string} text - 要匹配的文本
     * @param {Array<Object>} [posAnalysis=null] - 词性分析结果，如果提供则使用分词系统进行匹配
     * @param {Object} [options=null] - 额外选项，如翻译文本和其词性分析结果
     * @returns {Array} 所有匹配结果的数组
     */
    getAllMatches(text, posAnalysis = null, options = null) {
        if (!this.loaded || !text) {
            return [];
        }

        // 检查是否提供了双语匹配选项
        if (options && options.translatedText) {
            // 准备词汇信息列表
            const wordInfoList = [];

            // 收集原始文本的词汇
            if (posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0) {
                posAnalysis.forEach(item => {
                    wordInfoList.push({
                        word: item.word,
                        pos: item.pos,
                        weight: item.weight,
                        source: 'original'
                    });
                });
            }

            // 收集翻译文本的词汇
            if (options.translatedPosAnalysis && Array.isArray(options.translatedPosAnalysis) && options.translatedPosAnalysis.length > 0) {
                options.translatedPosAnalysis.forEach(item => {
                    wordInfoList.push({
                        word: item.word,
                        pos: item.pos,
                        weight: item.weight,
                        source: 'translated'
                    });
                });
            }

            // 使用通用匹配算法获取所有匹配结果
            return this._universalMatchingAlgorithm(wordInfoList, 0, true) || [];
        }

        // 如果没有双语选项，使用普通匹配
        if (posAnalysis && Array.isArray(posAnalysis) && posAnalysis.length > 0) {
            // 准备词汇信息列表
            const wordInfoList = posAnalysis.map(item => ({
                word: item.word,
                pos: item.pos,
                weight: item.weight,
                source: 'original'
            }));

            // 使用通用匹配算法获取所有匹配结果
            return this._universalMatchingAlgorithm(wordInfoList, 0, true) || [];
        }

        // 如果没有词性分析结果，尝试使用简单的分词方式
        const lowerText = text.toLowerCase();
        const words = lowerText.split(/\s+/);

        // 准备词汇信息列表
        const wordInfoList = [];

        // 对于单词，添加到词汇列表
        if (words.length > 1) {
            // 多词情况，将每个单词分开处理
            words.forEach(word => {
                if (word.length >= 2) { // 跳过过短的词
                    wordInfoList.push({
                        word: word,
                        pos: 'noun', // 默认假设为名词，因为没有词性分析
                        weight: 100,  // 默认权重
                        source: 'original'
                    });
                }
            });
        } else if (words.length === 1 && words[0].length >= 2) {
            // 单词情况
            wordInfoList.push({
                word: words[0],
                pos: 'noun', // 默认假设为名词
                weight: 100,  // 默认权重
                source: 'original'
            });
        }

        // 如果没有有效的词汇，尝试使用整个文本作为一个词汇
        if (wordInfoList.length === 0 && text.length >= 2) {
            wordInfoList.push({
                word: lowerText,
                pos: 'noun',
                weight: 100,
                source: 'original'
            });
        }

        // 使用通用匹配算法获取所有匹配结果
        return this._universalMatchingAlgorithm(wordInfoList, 0, true) || [];
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