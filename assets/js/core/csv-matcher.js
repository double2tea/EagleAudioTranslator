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

        // 确保路径有效
        if (!csvPath) {
            console.warn('CSV路径为空，使用默认路径 ./assets/data/categorylist.csv');
            csvPath = './assets/data/categorylist.csv';
        }

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
        var sourceIndex = headers.indexOf('Category');
        var targetIndex = headers.indexOf('Category_zh');
        var categoryIndex = headers.indexOf('CatID');
        var subCategoryIndex = headers.indexOf('SubCategory');
        var subCategoryZhIndex = headers.indexOf('SubCategory_zh');
        var synonymsIndex = headers.indexOf('Synonyms - Comma Separated');
        var synonymsZhIndex = headers.indexOf('Synonyms_zh');

        if (sourceIndex === -1 || targetIndex === -1) {
            throw new Error('CSV格式错误: 缺少Category或Category_zh列');
        }

        var terms = [];

        // 从第二行开始解析数据
        for (var i = 1; i < lines.length; i++) {
            var values = this.splitCSVLine(lines[i]);

            if (values.length >= Math.max(sourceIndex, targetIndex) + 1) {
                var source = values[sourceIndex].trim();
                var target = values[targetIndex].trim();
                var category = categoryIndex !== -1 ? values[categoryIndex].trim() : '';
                var subCategory = subCategoryIndex !== -1 ? values[subCategoryIndex].trim() : '';
                var subCategoryZh = subCategoryZhIndex !== -1 ? values[subCategoryZhIndex].trim() : '';
                var synonyms = synonymsIndex !== -1 ? values[synonymsIndex].trim() : '';
                var synonymsZh = synonymsZhIndex !== -1 ? values[synonymsZhIndex].trim() : '';

                if (source && target) {
                    terms.push({
                        source: source,
                        target: target,
                        category: category,
                        subCategory: subCategory,
                        subCategoryZh: subCategoryZh,
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

        // 特殊处理bleep/beep关键词
        if (lowerText === 'bleep' || lowerText.startsWith('bleep ') ||
            lowerText === 'beep' || lowerText.startsWith('beep ') ||
            lowerText.includes('哔哔')) {
            // 查找TEST TONE分类
            for (var m = 0; m < this.terms.length; m++) {
                if (this.terms[m].source === 'TEST TONE' && this.terms[m].category === 'TEST') {
                    return this.terms[m];
                }
            }
        }

        // 精确匹配
        for (var i = 0; i < this.terms.length; i++) {
            if (this.terms[i].source.toLowerCase() === lowerText) {
                return this.terms[i];
            }
        }

        // 包含匹配
        for (var j = 0; j < this.terms.length; j++) {
            if (lowerText.indexOf(this.terms[j].source.toLowerCase()) !== -1) {
                return this.terms[j];
            }
        }

        // 检查同义词匹配
        for (var k = 0; k < this.terms.length; k++) {
            if (this.terms[k].synonyms) {
                const synonyms = this.terms[k].synonyms.split(',').map(s => s.trim().toLowerCase());
                for (var s = 0; s < synonyms.length; s++) {
                    if (synonyms[s] && (synonyms[s] === lowerText || lowerText.indexOf(synonyms[s]) !== -1)) {
                        return this.terms[k];
                    }
                }
            }
        }

        return null;
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

        // 特殊处理bleep/beep关键词
        var lowerText = text.toLowerCase();
        if (lowerText === 'bleep' || lowerText.startsWith('bleep ') ||
            lowerText === 'beep' || lowerText.startsWith('beep ') ||
            lowerText.includes('哔哔')) {
            return 'TEST'; // 返回TEST作为CatID
        }

        // 先尝试匹配术语
        var match = this.findMatch(text);
        if (match && match.category) {
            return match.category;
        }

        // 如果没有匹配到术语，尝试直接匹配分类

        // 如果文本是单词，检查是否与分类名称匹配
        if (text.indexOf(' ') === -1) {
            // 先检查完全匹配
            for (var i = 0; i < this.terms.length; i++) {
                if (this.terms[i].source.toLowerCase() === lowerText) {
                    return this.terms[i].source;
                }
            }

            // 然后检查开头匹配
            for (var j = 0; j < this.terms.length; j++) {
                if (lowerText.startsWith(this.terms[j].source.toLowerCase())) {
                    return this.terms[j].source;
                }
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
}

// 导出CSVMatcher
window.CSVMatcher = CSVMatcher;