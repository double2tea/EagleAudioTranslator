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
        this.specialRules = [];

        // 匹配设置
        this.matchSettings = {
            // 多词匹配策略: 'exact'(精确匹配), 'partial'(部分匹配), 'fuzzy'(模糊匹配), 'semantic'(语义匹配)
            multiWordMatchStrategy: 'semantic',
            // 多词匹配时是否考虑词序
            respectWordOrder: true,
            // 匹配优先级权重
            priorityWeights: {
                exactMatch: 100,       // 精确匹配权重
                multiWordMatch: 80,    // 多词匹配权重
                containsMatch: 60,     // 包含匹配权重
                synonymMatch: 40,      // 同义词匹配权重
                regexMatch: 30,        // 正则表达式匹配权重
                partialMatch: 20,      // 部分匹配权重
                semanticMatch: 70,     // 语义匹配权重
                contextMatch: 65,      // 上下文匹配权重
                editDistanceMatch: 25  // 编辑距离匹配权重
            },
            // 当有多个匹配结果时的策略: 'highestPriority'(最高优先级), 'firstMatch'(第一个匹配), 'allMatches'(所有匹配)
            multiMatchStrategy: 'highestPriority',
            // 模糊匹配设置
            fuzzyMatchSettings: {
                // 编辑距离阈值，越小越严格
                maxEditDistance: 2,
                // 最小匹配字符数
                minMatchLength: 3,
                // 模糊匹配阈值，范围从0到1，越大越宽松
                fuzzyThreshold: 0.7
            },
            // 上下文匹配设置
            contextMatchSettings: {
                // 上下文关键词权重
                keywordWeights: {
                    'sound': 1.5,       // 声音相关
                    'effect': 1.5,      // 音效相关
                    'audio': 1.5,       // 音频相关
                    'music': 1.2,       // 音乐相关
                    'voice': 1.2,       // 语音相关
                    'noise': 1.2,       // 噪音相关
                    'ambience': 1.2,    // 环境音相关
                    'foley': 1.3,       // 拉音相关
                    'sfx': 1.5          // 特效相关
                },
                // 上下文匹配的最大距离
                maxDistance: 3
            }
        };

        // 特殊规则设置
        this.ruleSettings = {
            defaultPriority: 10,
            multiMatchStrategy: 'highestPriority' // 可选值: 'highestPriority', 'firstMatch', 'allMatches'
        };

        // 初始化缓存
        this.matchCache = new Map();

        // 确保路径有效
        if (!csvPath) {
            console.warn('CSV路径为空，使用默认路径 ./assets/data/categorylist.csv');
            csvPath = './assets/data/categorylist.csv';
        }

        // 加载特殊规则
        this.loadSpecialRules();

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
        var categoryIndex = headers.indexOf('CatID');
        var categoryNameIndex = headers.indexOf('Category');
        var categoryNameZhIndex = headers.indexOf('Category_zh');
        var synonymsIndex = headers.indexOf('Synonyms - Comma Separated');
        var synonymsZhIndex = headers.indexOf('Synonyms_zh');

        console.log('解析CSV列索引:', {
            sourceIndex,
            targetIndex,
            categoryIndex,
            categoryNameIndex,
            categoryNameZhIndex,
            synonymsIndex,
            synonymsZhIndex
        });

        if (sourceIndex === -1 || targetIndex === -1 || categoryIndex === -1) {
            throw new Error('CSV格式错误: 缺少SubCategory、SubCategory_zh或CatID列');
        }

        var terms = [];

        // 从第二行开始解析数据
        for (var i = 1; i < lines.length; i++) {
            var values = this.splitCSVLine(lines[i]);

            if (values.length >= Math.max(sourceIndex, targetIndex) + 1) {
                var source = values[sourceIndex].trim();
                var target = values[targetIndex].trim();
                var category = categoryIndex !== -1 ? values[categoryIndex].trim() : '';
                var categoryName = categoryNameIndex !== -1 ? values[categoryNameIndex].trim() : '';
                var categoryNameZh = categoryNameZhIndex !== -1 ? values[categoryNameZhIndex].trim() : '';
                var synonyms = synonymsIndex !== -1 ? values[synonymsIndex].trim() : '';
                var synonymsZh = synonymsZhIndex !== -1 ? values[synonymsZhIndex].trim() : '';

                if (source && target) {
                    terms.push({
                        source: source,
                        target: target,
                        category: category,
                        categoryName: categoryName,
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
     * 加载特殊规则
     */
    loadSpecialRules() {
        try {
            var self = this;
            // 使用XMLHttpRequest加载特殊规则配置文件，与fetch保持一致的加载方式
            var xhr = new XMLHttpRequest();
            xhr.open('GET', './assets/data/special-rules.json', true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var data = JSON.parse(xhr.responseText);
                            if (data) {
                                // 加载规则设置
                                if (data.settings) {
                                    self.ruleSettings = Object.assign(self.ruleSettings, data.settings);
                                    console.log('加载规则设置:', self.ruleSettings);
                                }

                                // 加载特殊规则
                                if (data.specialPatterns) {
                                    self.specialRules = data.specialPatterns;
                                    console.log('特殊规则加载成功，共', self.specialRules.length, '条规则');

                                    // 确保每个规则都有优先级
                                    self.specialRules.forEach(rule => {
                                        if (rule.priority === undefined) {
                                            rule.priority = self.ruleSettings.defaultPriority;
                                        }
                                    });

                                    // 按优先级排序，高优先级在前
                                    self.specialRules.sort((a, b) => b.priority - a.priority);
                                }
                            }
                        } catch (parseError) {
                            console.error('解析特殊规则文件失败:', parseError);
                            self.specialRules = [];
                        }
                    } else {
                        console.error('加载特殊规则文件失败: HTTP ' + xhr.status);
                        self.specialRules = [];
                    }
                }
            };
            xhr.send();
        } catch (error) {
            console.error('加载特殊规则出错:', error);
            this.specialRules = [];
        }
    }

    /**
     * 查找匹配的术语
     * @param {string} text - 要匹配的文本
     * @returns {Object|null} 匹配的术语或null
     */
    findMatch(text) {
        if (!this.loaded || !text) {
            return null;
        }

        // 转换为小写进行不区分大小写的匹配
        var lowerText = text.toLowerCase();

        // 收集所有可能的匹配结果
        const matches = [];

        // 1. 应用特殊规则
        const specialMatch = this.applySpecialRules(lowerText);
        if (specialMatch) {
            // 处理数组结果（多规则匹配）
            if (Array.isArray(specialMatch)) {
                specialMatch.forEach(match => {
                    matches.push({
                        term: match,
                        score: this.matchSettings.priorityWeights.exactMatch + 10, // 特殊规则优先级更高
                        matchType: 'special_rule'
                    });
                });
            }
            // 处理单个结果
            else {
                matches.push({
                    term: specialMatch,
                    score: this.matchSettings.priorityWeights.exactMatch + 10, // 特殊规则优先级更高
                    matchType: 'special_rule'
                });
            }
        }

        // 2. 对于复合术语，尝试匹配多词短语
        const words = lowerText.split(/\s+/);
        if (words.length > 1) {
            for (var p = 0; p < this.terms.length; p++) {
                const term = this.terms[p];
                const termWords = term.source.toLowerCase().split(/\s+/);

                // 检查是否是多词短语
                if (termWords.length > 1) {
                    const wordMatchResult = this._containsAllWords(lowerText, termWords);
                    if (wordMatchResult.matched) {
                        matches.push({
                            term: term,
                            score: wordMatchResult.score,
                            matchType: 'multi_word_' + wordMatchResult.matchType
                        });
                    }
                }
            }
        }

        // 3. 精确匹配
        for (var i = 0; i < this.terms.length; i++) {
            const term = this.terms[i];
            if (term.source.toLowerCase() === lowerText) {
                matches.push({
                    term: term,
                    score: this.matchSettings.priorityWeights.exactMatch,
                    matchType: 'exact_match'
                });
            }
        }

        // 4. 包含匹配（按术语长度排序，优先匹配更长的术语）
        const sortedTerms = this.terms.slice().sort((a, b) => {
            return b.source.length - a.source.length;
        });

        for (var j = 0; j < sortedTerms.length; j++) {
            const term = sortedTerms[j];
            const termLower = term.source.toLowerCase();

            // 跳过已经精确匹配的术语
            if (termLower === lowerText) continue;

            if (lowerText.indexOf(termLower) !== -1) {
                // 计算分数，越长的术语分数越高
                const lengthScore = (term.source.length / lowerText.length) * this.matchSettings.priorityWeights.containsMatch;
                matches.push({
                    term: term,
                    score: lengthScore,
                    matchType: 'contains_match'
                });
            }
        }

        // 5. 同义词匹配
        for (var k = 0; k < this.terms.length; k++) {
            const term = this.terms[k];
            if (term.synonyms) {
                const synonyms = term.synonyms.split(',').map(s => s.trim().toLowerCase())
                    .sort((a, b) => b.length - a.length); // 按长度排序

                for (var s = 0; s < synonyms.length; s++) {
                    const synonym = synonyms[s];
                    if (!synonym) continue;

                    // 精确匹配同义词
                    if (synonym === lowerText) {
                        matches.push({
                            term: term,
                            score: this.matchSettings.priorityWeights.synonymMatch,
                            matchType: 'synonym_exact'
                        });
                        break;
                    }
                    // 包含匹配同义词
                    else if (lowerText.indexOf(synonym) !== -1) {
                        // 计算分数，越长的同义词分数越高
                        const lengthScore = (synonym.length / lowerText.length) * this.matchSettings.priorityWeights.synonymMatch;
                        matches.push({
                            term: term,
                            score: lengthScore,
                            matchType: 'synonym_contains'
                        });
                        break;
                    }
                }
            }
        }

        // 6. 正则表达式匹配
        // 从术语库中提取常见的音效关键词来生成正则表达式
        const soundEffectKeywords = new Set();
        const audioFileExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'alac', 'ape', 'opus', 'webm', 'mid', 'midi'];

        // 从术语库中提取关键词
        for (const term of this.terms) {
            // 添加源术语
            if (term.source && term.source.length > 3) {
                soundEffectKeywords.add(term.source.toLowerCase());
            }

            // 从同义词中提取关键词
            if (term.synonyms) {
                const synonyms = term.synonyms.split(',').map(s => s.trim().toLowerCase());
                for (const synonym of synonyms) {
                    if (synonym && synonym.length > 3) {
                        soundEffectKeywords.add(synonym);
                    }
                }
            }
        }

        // 构建正则表达式模式
        const regexPatterns = [
            // 匹配带数字的版本号，如 "v1.2.3"
            { pattern: /v\d+(\.\d+)*/, type: 'version' },
            // 匹配常见的文件后缀
            { pattern: new RegExp('\\.('+audioFileExtensions.join('|')+')\\b', 'i'), type: 'audio_file' }
        ];

        // 如果有足够的关键词，添加音效关键词正则表达式
        if (soundEffectKeywords.size > 0) {
            // 取前20个关键词构建正则表达式，避免正则表达式过长
            const keywordsArray = Array.from(soundEffectKeywords).slice(0, 20);
            regexPatterns.push({
                pattern: new RegExp('\\b('+keywordsArray.join('|')+')\\b', 'i'),
                type: 'sound_effect'
            });
        }

        for (const regexObj of regexPatterns) {
            if (regexObj.pattern.test(lowerText)) {
                // 如果正则表达式匹配，尝试找到相关的术语
                for (const term of this.terms) {
                    // 对于音效关键词，检查是否在正则表达式中匹配
                    if (regexObj.type === 'sound_effect') {
                        const match = lowerText.match(regexObj.pattern);
                        if (match && match[1] &&
                            (term.source.toLowerCase().includes(match[1]) ||
                             (term.synonyms && term.synonyms.toLowerCase().includes(match[1])))) {
                            matches.push({
                                term: term,
                                score: this.matchSettings.priorityWeights.regexMatch,
                                matchType: 'regex_' + regexObj.type
                            });
                            break;
                        }
                    }
                    // 对于其他类型，使用原来的匹配方式
                    else if (term.source.toLowerCase().includes(regexObj.type)) {
                        matches.push({
                            term: term,
                            score: this.matchSettings.priorityWeights.regexMatch,
                            matchType: 'regex_' + regexObj.type
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

        // 根据多匹配策略处理结果
        switch (this.matchSettings.multiMatchStrategy) {
            case 'firstMatch':
                // 返回第一个匹配结果
                console.log('使用首次匹配策略，返回第一个匹配:', matches[0].matchType);
                return matches[0].term;

            case 'allMatches':
                // 返回所有匹配结果
                console.log('使用所有匹配策略，返回', matches.length, '个匹配');
                return matches.map(match => match.term);

            case 'highestPriority':
            default:
                // 按分数排序，返回分数最高的匹配结果
                matches.sort((a, b) => b.score - a.score);
                const bestMatch = matches[0];
                console.log('使用最高优先级策略，选择匹配:', bestMatch.matchType, '分数:', bestMatch.score);
                return bestMatch.term;
        }
    }

    /**
     * 应用特殊规则
     * @param {string} lowerText - 小写的文本
     * @returns {Object|Array|null} 匹配的结果或null
     */
    applySpecialRules(lowerText) {
        if (!this.specialRules || this.specialRules.length === 0) {
            return null;
        }

        // 收集所有匹配的规则
        const matchedRules = [];

        for (const rule of this.specialRules) {
            let isMatch = false;

            if (rule.matchType === 'contains' && lowerText.includes(rule.pattern)) {
                isMatch = true;
            } else if (rule.matchType === 'startsWith' && lowerText.startsWith(rule.pattern)) {
                isMatch = true;
            } else if (rule.matchType === 'equals' && lowerText === rule.pattern) {
                isMatch = true;
            } else if (rule.matchType === 'regex') {
                try {
                    const regex = new RegExp(rule.pattern, 'i');
                    if (regex.test(lowerText)) {
                        isMatch = true;
                    }
                } catch (error) {
                    console.error('正则表达式错误:', error);
                }
            }

            if (isMatch) {
                matchedRules.push({
                    rule: rule,
                    priority: rule.priority || this.ruleSettings.defaultPriority
                });

                // 如果策略是首次匹配，直接返回第一个匹配的规则
                if (this.ruleSettings.multiMatchStrategy === 'firstMatch') {
                    console.log('使用首次匹配策略，返回第一个匹配的规则:', rule.id);
                    return rule.result;
                }
            }
        }

        // 如果没有匹配的规则，返回null
        if (matchedRules.length === 0) {
            return null;
        }

        // 如果策略是所有匹配，返回所有匹配的规则结果
        if (this.ruleSettings.multiMatchStrategy === 'allMatches') {
            console.log('使用所有匹配策略，返回', matchedRules.length, '个匹配的规则');
            return matchedRules.map(match => match.rule.result);
        }

        // 默认策略：最高优先级
        // 按优先级排序，高优先级在前
        matchedRules.sort((a, b) => b.priority - a.priority);
        const highestPriorityRule = matchedRules[0].rule;
        console.log('使用最高优先级策略，选择规则:', highestPriorityRule.id, '优先级:', highestPriorityRule.priority);
        return highestPriorityRule.result;
    }

    /**
     * 识别文本的分类
     * @param {string} text - 要识别的文本
     * @returns {string} 分类名称或空字符串
     */
    identifyCategory(text) {
        if (!this.loaded || !text) {
            return '';
        }

        // 直接使用改进后的findMatch方法来获取最佳匹配结果
        const match = this.findMatch(text);

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
     * 检查文本是否包含指定的单词
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 包含匹配结果和匹配分数
     * @private
     */
    _containsAllWords(text, words) {
        if (!text || !words || words.length === 0) {
            return { matched: false, score: 0 };
        }

        // 检查缓存
        const cacheKey = `${text}_${words.join('|')}`;
        if (this.matchCache.has(cacheKey)) {
            return this.matchCache.get(cacheKey);
        }

        // 根据多词匹配策略选择匹配方式
        let result;
        switch (this.matchSettings.multiWordMatchStrategy) {
            case 'exact':
                result = this._exactWordMatch(text, words);
                break;
            case 'fuzzy':
                result = this._fuzzyWordMatch(text, words);
                break;
            case 'semantic':
                result = this._semanticWordMatch(text, words);
                break;
            case 'partial':
            default:
                result = this._partialWordMatch(text, words);
                break;
        }

        // 将结果存入缓存
        this.matchCache.set(cacheKey, result);
        return result;
    }

    /**
     * 精确匹配 - 要求完全匹配短语
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 匹配结果和分数
     * @private
     */
    _exactWordMatch(text, words) {
        const phrase = words.join(' ');
        const matched = text.includes(phrase);
        return {
            matched: matched,
            score: matched ? this.matchSettings.priorityWeights.multiWordMatch : 0,
            matchType: 'exact'
        };
    }

    /**
     * 部分匹配 - 允许单词之间有其他文本
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 匹配结果和分数
     * @private
     */
    _partialWordMatch(text, words) {
        // 先尝试精确匹配
        const exactMatch = this._exactWordMatch(text, words);
        if (exactMatch.matched) {
            return exactMatch;
        }

        // 如果精确匹配失败，尝试部分匹配
        let allWordsFound = true;
        let lastIndex = -1;
        let score = 0;
        const respectOrder = this.matchSettings.respectWordOrder;

        // 检查每个单词是否存在于文本中
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const index = text.indexOf(word);

            if (index === -1) {
                // 单词不存在
                allWordsFound = false;
                break;
            } else if (respectOrder && index < lastIndex) {
                // 如果要求顺序一致，但当前单词在前一个单词之前出现
                allWordsFound = false;
                break;
            }

            lastIndex = index;
            // 每找到一个单词增加分数
            score += (this.matchSettings.priorityWeights.partialMatch / words.length);
        }

        return {
            matched: allWordsFound,
            score: allWordsFound ? score : 0,
            matchType: 'partial'
        };
    }

    /**
     * 模糊匹配 - 允许单词的变形和部分匹配
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 匹配结果和分数
     * @private
     */
    _fuzzyWordMatch(text, words) {
        // 先尝试精确匹配和部分匹配
        const exactMatch = this._exactWordMatch(text, words);
        if (exactMatch.matched) {
            return exactMatch;
        }

        const partialMatch = this._partialWordMatch(text, words);
        if (partialMatch.matched) {
            return partialMatch;
        }

        // 如果前两种匹配失败，尝试模糊匹配
        let matchedWords = 0;
        let score = 0;

        // 对每个单词进行模糊匹配
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // 检查文本中是否包含单词的一部分（至少三个字符）
            if (word.length >= 3) {
                for (let j = 0; j <= text.length - 3; j++) {
                    // 检查文本的每个位置是否包含单词的前三个字符
                    if (text.substring(j, j + 3).toLowerCase() === word.substring(0, 3).toLowerCase()) {
                        matchedWords++;
                        score += (this.matchSettings.priorityWeights.partialMatch / (2 * words.length));
                        break;
                    }
                }
            }
        }

        // 如果至少匹配了一半的单词，则认为是模糊匹配成功
        const threshold = Math.ceil(words.length / 2);
        return {
            matched: matchedWords >= threshold,
            score: matchedWords >= threshold ? score : 0,
            matchType: 'fuzzy'
        };
    }

    /**
     * 语义匹配 - 结合上下文和同义词进行智能匹配
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 匹配结果和分数
     * @private
     */
    _semanticWordMatch(text, words) {
        // 先尝试精确匹配和部分匹配
        const exactMatch = this._exactWordMatch(text, words);
        if (exactMatch.matched) {
            return exactMatch;
        }

        const partialMatch = this._partialWordMatch(text, words);
        if (partialMatch.matched) {
            return partialMatch;
        }

        const fuzzyMatch = this._fuzzyWordMatch(text, words);
        if (fuzzyMatch.matched) {
            return fuzzyMatch;
        }

        // 如果前几种匹配失败，尝试编辑距离匹配
        const editDistanceMatch = this._editDistanceMatch(text, words);
        if (editDistanceMatch.matched) {
            return editDistanceMatch;
        }

        // 如果编辑距离匹配失败，尝试上下文匹配
        const contextMatch = this._contextMatch(text, words);
        if (contextMatch.matched) {
            return contextMatch;
        }

        // 如果所有匹配都失败，返回不匹配
        return { matched: false, score: 0, matchType: 'none' };
    }

    /**
     * 编辑距离匹配 - 允许单词有少量的拼写错误
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 匹配结果和分数
     * @private
     */
    _editDistanceMatch(text, words) {
        const maxDistance = this.matchSettings.fuzzyMatchSettings.maxEditDistance;
        const minLength = this.matchSettings.fuzzyMatchSettings.minMatchLength;
        let matchedWords = 0;
        let totalScore = 0;

        // 将文本分解为单词
        const textWords = text.toLowerCase().split(/\s+/);

        // 对每个要匹配的单词
        for (const word of words) {
            if (word.length < minLength) continue;

            let bestDistance = Infinity;
            let bestMatch = null;

            // 与文本中的每个单词计算编辑距离
            for (const textWord of textWords) {
                if (textWord.length < minLength) continue;

                const distance = this._levenshteinDistance(word.toLowerCase(), textWord.toLowerCase());
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = textWord;
                }
            }

            // 如果找到了足够接近的匹配
            if (bestDistance <= maxDistance) {
                matchedWords++;
                // 分数越接近越高
                const similarity = 1 - (bestDistance / Math.max(word.length, bestMatch.length));
                totalScore += similarity * this.matchSettings.priorityWeights.editDistanceMatch / words.length;
            }
        }

        // 如果至少匹配了一半的单词，则认为是编辑距离匹配成功
        const threshold = Math.ceil(words.length / 2);
        return {
            matched: matchedWords >= threshold,
            score: matchedWords >= threshold ? totalScore : 0,
            matchType: 'edit_distance'
        };
    }

    /**
     * 计算两个字符串之间的编辑距离（Levenshtein 距离）
     * @param {string} a - 第一个字符串
     * @param {string} b - 第二个字符串
     * @returns {number} 编辑距离
     * @private
     */
    _levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // 初始化矩阵
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // 填充矩阵
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // 替换
                        matrix[i][j - 1] + 1,     // 插入
                        matrix[i - 1][j] + 1      // 删除
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * 上下文匹配 - 考虑文件名的上下文
     * @param {string} text - 要检查的文本
     * @param {Array<string>} words - 要检查的单词数组
     * @returns {Object} 匹配结果和分数
     * @private
     */
    _contextMatch(text, words) {
        const lowerText = text.toLowerCase();
        const contextKeywords = Object.keys(this.matchSettings.contextMatchSettings.keywordWeights);
        let contextScore = 0;
        let matchedContextWords = 0;

        // 检查文本中是否包含上下文关键词
        for (const keyword of contextKeywords) {
            if (lowerText.includes(keyword)) {
                const weight = this.matchSettings.contextMatchSettings.keywordWeights[keyword];
                contextScore += weight;
                matchedContextWords++;
            }
        }

        // 如果没有上下文关键词，则不进行上下文匹配
        if (matchedContextWords === 0) {
            return { matched: false, score: 0, matchType: 'context' };
        }

        // 检查要匹配的单词是否与上下文关键词足够接近
        const textWords = lowerText.split(/\s+/);
        let wordProximityScore = 0;

        for (const word of words) {
            const wordLower = word.toLowerCase();

            // 对于每个上下文关键词，计算与要匹配单词的距离
            for (let i = 0; i < textWords.length; i++) {
                if (textWords[i].includes(wordLower)) {
                    // 在文本中找到了要匹配的单词
                    // 检查前后是否有上下文关键词
                    const maxDistance = this.matchSettings.contextMatchSettings.maxDistance;

                    for (let j = Math.max(0, i - maxDistance); j <= Math.min(textWords.length - 1, i + maxDistance); j++) {
                        if (i === j) continue; // 跳过当前单词

                        for (const keyword of contextKeywords) {
                            if (textWords[j].includes(keyword)) {
                                // 计算距离分数，距离越近分数越高
                                const distance = Math.abs(i - j);
                                const proximityFactor = 1 - (distance / (maxDistance + 1));
                                const keywordWeight = this.matchSettings.contextMatchSettings.keywordWeights[keyword];
                                wordProximityScore += proximityFactor * keywordWeight;
                            }
                        }
                    }
                }
            }
        }

        // 综合考虑上下文关键词分数和距离分数
        const totalScore = (contextScore + wordProximityScore) * this.matchSettings.priorityWeights.contextMatch / 100;

        // 如果分数足够高，则认为是上下文匹配成功
        return {
            matched: totalScore > 0,
            score: totalScore,
            matchType: 'context'
        };
    }
}

// 导出CSVMatcher
window.CSVMatcher = CSVMatcher;