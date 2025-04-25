/**
 * Intl.Segmenter适配器
 * 使用浏览器内置的Intl.Segmenter进行分词和词性分析
 */

(function(global) {
    /**
     * Intl.Segmenter适配器类
     * 提供与SmartClassifier兼容的API
     */
    class IntlSegmenterAdapter {
        /**
         * 构造函数
         * @param {Object} options - 配置选项
         */
        constructor(options = {}) {
            this.options = Object.assign({
                languages: ['zh', 'en']
            }, options);
            
            // 词性权重
            this.posWeights = {
                'n': 100,    // 名词
                'v': 60,     // 动词
                'a': 80,     // 形容词
                'd': 40,     // 副词
                'x': 20      // 其他
            };

            // 词性映射表 (内部 -> 通用)
            this.posMapping = {
                'n': 'noun',       // 名词
                'nr': 'noun',      // 人名
                'ns': 'noun',      // 地名
                'nt': 'noun',      // 机构团体
                'nz': 'noun',      // 其他专名
                'v': 'verb',       // 动词
                'vd': 'verb',      // 动副词
                'vn': 'verb',      // 名动词
                'a': 'adjective',  // 形容词
                'ad': 'adverb',    // 副形词
                'an': 'adjective', // 名形词
                'd': 'adverb',     // 副词
                'i': 'other',      // 成语
                'j': 'noun',       // 简称略语
                'l': 'other',      // 习用语
                'm': 'other',      // 数词
                'o': 'other',      // 拟声词
                'p': 'other',      // 介词
                'q': 'other',      // 量词
                'r': 'other',      // 代词
                's': 'noun',       // 处所词
                't': 'noun',       // 时间词
                'u': 'other',      // 助词
                'v': 'verb',       // 动词
                'wp': 'other',     // 标点符号
                'ws': 'other',     // 字符串
                'x': 'other'       // 其他
            };

            // 英文词性映射表
            this.englishPosMapping = {
                'NN': 'noun',      // 名词
                'NNS': 'noun',     // 复数名词
                'NNP': 'noun',     // 专有名词
                'NNPS': 'noun',    // 复数专有名词
                'VB': 'verb',      // 动词原形
                'VBD': 'verb',     // 过去式
                'VBG': 'verb',     // 现在分词
                'VBN': 'verb',     // 过去分词
                'VBP': 'verb',     // 非第三人称单数现在时
                'VBZ': 'verb',     // 第三人称单数现在时
                'JJ': 'adjective', // 形容词
                'JJR': 'adjective', // 比较级形容词
                'JJS': 'adjective', // 最高级形容词
                'RB': 'adverb',    // 副词
                'RBR': 'adverb',   // 比较级副词
                'RBS': 'adverb',   // 最高级副词
                'DT': 'other',     // 限定词
                'IN': 'other',     // 介词
                'CC': 'other',     // 连词
                'CD': 'other',     // 基数词
                'PRP': 'other',    // 人称代词
                'PRP$': 'other',   // 所有格代词
                'WDT': 'other',    // wh-限定词
                'WP': 'other',     // wh-代词
                'WRB': 'other',    // wh-副词
                'FW': 'other',     // 外来词
                'UH': 'other',     // 感叹词
                'LS': 'other',     // 列表项标记
                'POS': 'other',    // 所有格标记
                'SYM': 'other',    // 符号
                'TO': 'other',     // to
                'MD': 'other',     // 情态动词
                'EX': 'other',     // 存在词
                'RP': 'other',     // 小品词
                'PDT': 'other',    // 前限定词
                '.': 'other',      // 句号
                ',': 'other',      // 逗号
                ':': 'other',      // 冒号
                '(': 'other',      // 左括号
                ')': 'other'       // 右括号
            };

            // 检查Intl.Segmenter是否可用
            this.useSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
            
            if (this.useSegmenter) {
                try {
                    // 创建中文分词器
                    this.chineseSegmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
                    // 创建英文分词器
                    this.englishSegmenter = new Intl.Segmenter('en-US', { granularity: 'word' });
                    console.log('Intl.Segmenter初始化成功');
                } catch (error) {
                    console.error('Intl.Segmenter初始化失败:', error);
                    this.useSegmenter = false;
                }
            } else {
                console.warn('Intl.Segmenter不可用，将使用简单的分词方法');
            }

            console.log('IntlSegmenterAdapter 初始化成功');
        }

        /**
         * 使用Intl.Segmenter进行分词
         * @param {string} text - 要分词的文本
         * @returns {Array<string>} 分词结果
         */
        tokenize(text) {
            if (!text) return [];

            try {
                // 检测语言
                const isChineseText = /[\u4e00-\u9fa5]/.test(text);
                
                if (this.useSegmenter) {
                    // 使用Intl.Segmenter进行分词
                    const segmenter = isChineseText ? this.chineseSegmenter : this.englishSegmenter;
                    const segments = segmenter.segment(text);
                    
                    // 过滤停用词
                    const stopWords = isChineseText ? 
                        new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']) :
                        new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'as']);
                    
                    // 提取分词结果
                    const tokens = [];
                    for (const segment of segments) {
                        if (segment.isWordLike && !stopWords.has(segment.segment)) {
                            tokens.push(segment.segment);
                        }
                    }
                    
                    return tokens;
                } else {
                    // 使用简单的分词方法
                    if (isChineseText) {
                        // 中文分词：按字符分割
                        return Array.from(text);
                    } else {
                        // 英文分词：按空格分割
                        return text.split(/\s+/);
                    }
                }
            } catch (error) {
                console.error('分词失败:', error);
                return [];
            }
        }

        /**
         * 使用Intl.Segmenter进行词性标注
         * @param {string} text - 要标注的文本
         * @returns {Array<Object>} 词性标注结果
         */
        tag(text) {
            if (!text) return [];

            try {
                // 检测语言
                const isChineseText = /[\u4e00-\u9fa5]/.test(text);
                
                if (this.useSegmenter) {
                    // 使用Intl.Segmenter进行分词
                    const segmenter = isChineseText ? this.chineseSegmenter : this.englishSegmenter;
                    const segments = segmenter.segment(text);
                    
                    // 过滤停用词
                    const stopWords = isChineseText ? 
                        new Set(['的', '了', '和', '与', '或', '在', '中', '是', '有', '被', '将', '从', '给', '向', '把', '对', '为', '以']) :
                        new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'as']);
                    
                    // 提取分词结果并进行简单的词性判断
                    const taggedTokens = [];
                    for (const segment of segments) {
                        if (segment.isWordLike && !stopWords.has(segment.segment)) {
                            const word = segment.segment;
                            
                            // 简单的词性判断
                            let pos = 'n'; // 默认为名词
                            
                            if (isChineseText) {
                                // 中文词性判断
                                if (/[地得]$/.test(word)) {
                                    pos = 'd'; // 副词
                                } else if (/[了过着]$/.test(word)) {
                                    pos = 'v'; // 动词
                                } else if (/[的]$/.test(word)) {
                                    pos = 'a'; // 形容词
                                }
                            } else {
                                // 英文词性判断
                                if (/ly$/.test(word)) {
                                    pos = 'd'; // 副词
                                } else if (/ing$|ed$|s$/.test(word)) {
                                    pos = 'v'; // 动词
                                } else if (/ful$|ous$|ble$|al$/.test(word)) {
                                    pos = 'a'; // 形容词
                                }
                            }
                            
                            taggedTokens.push({
                                w: word,
                                p: pos
                            });
                        }
                    }
                    
                    return taggedTokens;
                } else {
                    // 使用简单的分词方法
                    let tokens = [];
                    
                    if (isChineseText) {
                        // 中文分词：按字符分割
                        tokens = Array.from(text).map(char => ({
                            w: char,
                            p: 'n' // 默认为名词
                        }));
                    } else {
                        // 英文分词：按空格分割
                        tokens = text.split(/\s+/).map(word => ({
                            w: word,
                            p: 'n' // 默认为名词
                        }));
                    }
                    
                    return tokens;
                }
            } catch (error) {
                console.error('词性标注失败:', error);
                return [];
            }
        }

        /**
         * 提取词干（简单实现，只返回原词）
         * @param {string} word - 要提取词干的单词
         * @param {string} language - 语言，默认为自动检测
         * @returns {string} 词干
         */
        stem(word, language = null) {
            if (!word) return '';

            try {
                // 简单的词干提取规则
                const isChineseText = language === 'zh' || (!language && /[\u4e00-\u9fa5]/.test(word));
                
                if (!isChineseText) {
                    // 英文词干提取
                    if (/ing$/.test(word) && word.length > 4) {
                        // 去掉ing
                        return word.slice(0, -3);
                    } else if (/ed$/.test(word) && word.length > 3) {
                        // 去掉ed
                        return word.slice(0, -2);
                    } else if (/s$/.test(word) && !/ss$/.test(word) && word.length > 2) {
                        // 去掉复数s
                        return word.slice(0, -1);
                    } else if (/ly$/.test(word) && word.length > 3) {
                        // 去掉ly
                        return word.slice(0, -2);
                    }
                }
                
                // 如果没有匹配的规则，返回原词
                return word;
            } catch (error) {
                console.error('词干提取失败:', error);
                return word;
            }
        }

        /**
         * 分析文本，返回词性分析结果
         * @param {string} text - 要分析的文本
         * @returns {Array<Object>} 词性分析结果
         */
        analyze(text) {
            if (!text) return [];

            try {
                // 使用tag方法获取词性标注结果
                const tagResult = this.tag(text);
                const result = [];

                // 处理标注结果
                tagResult.forEach(item => {
                    if (!item || !item.w) return;

                    // 获取词性
                    const pos = item.p || 'x';

                    // 添加到结果中
                    result.push({
                        word: item.w,
                        pos: pos,
                        weight: this.posWeights[pos.charAt(0)] || this.posWeights.x,
                        stem: this.stem(item.w)
                    });
                });

                // 按权重排序
                result.sort((a, b) => b.weight - a.weight);

                return result;
            } catch (error) {
                console.error('分析失败:', error);
                return [];
            }
        }

        /**
         * 将内部词性标签转换为通用词性标签
         * @param {string} pos - 内部词性标签
         * @returns {string} 通用词性标签
         */
        mapPOSToGeneral(pos) {
            if (!pos) return 'other';

            // 获取词性的第一个字符作为主要词性
            const mainPos = pos.charAt(0);
            return this.posMapping[mainPos] || this.posMapping[pos] || 'other';
        }

        /**
         * 将英文词性标签转换为通用词性标签
         * @param {string} pos - 英文词性标签
         * @returns {string} 通用词性标签
         */
        mapEnglishPOSToGeneral(pos) {
            if (!pos) return 'other';
            return this.englishPosMapping[pos] || 'other';
        }

        /**
         * 分析文本，返回通用格式的词性分析结果
         * @param {string} text - 要分析的文本
         * @returns {Array<Object>} 词性分析结果
         */
        analyzeGeneral(text) {
            const result = this.analyze(text);

            // 检测语言
            const isChineseText = /[\u4e00-\u9fa5]/.test(text);

            // 转换为通用词性标签
            return result.map(item => ({
                word: item.word,
                pos: isChineseText ? this.mapPOSToGeneral(item.pos) : this.mapEnglishPOSToGeneral(item.pos),
                weight: item.weight,
                stem: item.stem
            }));
        }

        /**
         * 同步版本的 analyzeGeneral 方法
         * @param {string} text - 要分析的文本
         * @returns {Array<Object>} 词性分析结果
         */
        analyzeGeneralSync(text) {
            return this.analyzeGeneral(text);
        }
    }

    // 导出适配器类
    global.IntlSegmenterAdapter = IntlSegmenterAdapter;

})(typeof window !== 'undefined' ? window : this);
