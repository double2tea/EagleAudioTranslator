/**
 * segmentit-direct.js
 * 直接使用 segmentit 的中文分词和词性标注功能，提供与 SmartClassifier 兼容的 API
 */
(function(global) {
    // 检查 segmentit 是否可用
    let segmentitLib = null;

    // 检查全局变量中是否有 segmentit 或 Segmentit
    if (typeof global.segmentit !== 'undefined') {
        segmentitLib = global.segmentit;
    } else if (typeof global.Segmentit !== 'undefined') {
        segmentitLib = global.Segmentit;
    } else {
        console.error('segmentit.js 未加载，SegmentitDirect 将不可用');
        return;
    }

    // 初始化 segmentit
    let segmentitInstance = null;
    try {
        segmentitInstance = segmentitLib.useDefault(new segmentitLib.Segment());
        console.log('Segmentit 初始化成功');
    } catch (error) {
        console.error('Segmentit 初始化失败:', error);
    }

    // 词性编码映射表 - 将 segmentit 的数字编码映射为字符标签
    const POS_CODE_MAP = {
        // 名词
        1048576: 'n',      // 名词
        8: 'nr',           // 人名
        16: 'nz',          // 其他专名
        4: 'ns',           // 地名
        2: 'nt',           // 机构团体
        
        // 动词
        4096: 'v',         // 动词
        
        // 形容词
        1073741824: 'a',   // 形容词
        
        // 数词和量词
        2097152: 'm',      // 数词
        4194304: 'q',      // 量词
        
        // 代词
        8388608: 'r',      // 代词
        
        // 副词
        134217728: 'd',    // 副词
        
        // 介词
        262144: 'p',       // 介词
        
        // 连词
        268435456: 'c',    // 连词
        
        // 助词
        8192: 'u',         // 助词
        
        // 标点符号
        2048: 'wp',        // 标点符号
        
        // 其他
        131072: 'x'        // 其他
    };

    // 中文词性标注工具
    const SegmentitDirect = {
        // 词性权重
        posWeights: {
            'n': 100,    // 名词
            'v': 60,     // 动词
            'a': 80,     // 形容词
            'd': 40,     // 副词
            'x': 20      // 其他
        },

        // 词性映射表 (segmentit -> 通用)
        posMapping: {
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
        },

        /**
         * 获取词性标签
         * @param {number} posCode - 词性编码
         * @returns {string} 词性标签
         */
        getPosTag: function(posCode) {
            return POS_CODE_MAP[posCode] || `未知(${posCode})`;
        },

        /**
         * 使用 segmentit 进行分词
         * @param {string} text - 要分词的文本
         * @returns {Array<string>} 分词结果
         */
        tokenize: function(text) {
            if (!text || !segmentitInstance) return [];

            try {
                // 使用 segmentit 进行分词
                return segmentitInstance.doSegment(text, {
                    simple: true
                });
            } catch (error) {
                console.error('Segmentit 分词失败:', error);
                return [];
            }
        },

        /**
         * 使用 segmentit 进行词性标注
         * @param {string} text - 要标注的文本
         * @returns {Array<Object>} 词性标注结果
         */
        tag: function(text) {
            if (!text || !segmentitInstance) return [];

            try {
                // 使用 segmentit 进行分词和词性标注
                const result = segmentitInstance.doSegment(text, {
                    simple: false
                });

                // 处理结果，将数字编码转换为字符标签
                return result.map(item => ({
                    w: item.w,
                    p: this.getPosTag(item.p)
                }));
            } catch (error) {
                console.error('Segmentit 词性标注失败:', error);
                return [];
            }
        },

        /**
         * 分析文本，返回词性分析结果
         * @param {string} text - 要分析的文本
         * @returns {Array<Object>} 词性分析结果
         */
        analyze: function(text) {
            if (!text || !segmentitInstance) return [];

            try {
                // 使用 segmentit 进行词性标注
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
                        weight: this.posWeights[pos.charAt(0)] || this.posWeights.x
                    });
                });

                // 按权重排序
                result.sort((a, b) => b.weight - a.weight);

                return result;
            } catch (error) {
                console.error('Segmentit 分析失败:', error);
                return [];
            }
        },

        /**
         * 将内部词性标签转换为通用词性标签
         * @param {string} pos - 内部词性标签
         * @returns {string} 通用词性标签
         */
        mapPOSToGeneral: function(pos) {
            if (!pos) return 'other';

            // 获取词性的第一个字符作为主要词性
            const mainPos = pos.charAt(0);
            return this.posMapping[mainPos] || this.posMapping[pos] || 'other';
        },

        /**
         * 分析文本，返回通用格式的词性分析结果
         * @param {string} text - 要分析的文本
         * @returns {Array<Object>} 词性分析结果
         */
        analyzeGeneral: function(text) {
            const result = this.analyze(text);

            // 转换为通用词性标签
            return result.map(item => ({
                word: item.word,
                pos: this.mapPOSToGeneral(item.pos),
                weight: item.weight
            }));
        },

        /**
         * 同步版本的 analyzeGeneral 方法
         * @param {string} text - 要分析的文本
         * @returns {Array<Object>} 词性分析结果
         */
        analyzeGeneralSync: function(text) {
            return this.analyzeGeneral(text);
        }
    };

    // 导出到全局对象
    global.SegmentitDirect = SegmentitDirect;

})(typeof window !== 'undefined' ? window : this);
