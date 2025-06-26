/**
 * 批量重命名工具
 * 用于批量处理文件名，如去除特定词语、替换信息等
 */
class BatchRenamer {
    /**
     * 构造函数
     */
    constructor() {
        this.operations = [];
        this.files = [];
    }

    /**
     * 设置要处理的文件
     * @param {Array} files - 文件对象数组
     */
    setFiles(files) {
        this.files = [...files];
        Logger.info(`批量重命名工具已设置 ${this.files.length} 个文件`);
        return this;
    }

    /**
     * 添加替换操作
     * @param {string} searchText - 要查找的文本
     * @param {string} replaceText - 替换为的文本
     * @param {Object} options - 替换选项
     * @param {boolean} options.caseSensitive - 是否区分大小写
     * @param {boolean} options.wholeWord - 是否匹配整个单词
     * @param {boolean} options.useRegex - 是否使用正则表达式
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addReplaceOperation(searchText, replaceText, options = {}) {
        const defaultOptions = {
            caseSensitive: false,
            wholeWord: false,
            useRegex: false,
            target: 'both' // 'fxName', 'fxName_zh', 'both'
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.operations.push({
            type: 'replace',
            searchText,
            replaceText,
            options: mergedOptions
        });

        Logger.info(`添加替换操作: "${searchText}" -> "${replaceText}"`, mergedOptions);
        return this;
    }

    /**
     * 添加移除操作
     * @param {string} text - 要移除的文本
     * @param {Object} options - 移除选项
     * @param {boolean} options.caseSensitive - 是否区分大小写
     * @param {boolean} options.wholeWord - 是否匹配整个单词
     * @param {boolean} options.useRegex - 是否使用正则表达式
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addRemoveOperation(text, options = {}) {
        return this.addReplaceOperation(text, '', options);
    }

    /**
     * 添加大小写转换操作
     * @param {string} caseType - 大小写类型 ('upper', 'lower', 'title', 'sentence')
     * @param {Object} options - 转换选项
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addCaseOperation(caseType, options = {}) {
        const defaultOptions = {
            target: 'fxName' // 默认只对英文描述进行大小写转换
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.operations.push({
            type: 'case',
            caseType,
            options: mergedOptions
        });

        Logger.info(`添加大小写转换操作: "${caseType}"`, mergedOptions);
        return this;
    }

    /**
     * 添加去除符号操作
     * @param {Object} options - 选项
     * @param {boolean} options.preserveSpaces - 是否保留空格
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addRemoveSymbolsOperation(options = {}) {
        const defaultOptions = {
            preserveSpaces: true,
            target: 'both'
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.operations.push({
            type: 'removeSymbols',
            options: mergedOptions
        });

        Logger.info('添加去除符号操作', mergedOptions);
        return this;
    }

    /**
     * 添加去除数字操作
     * @param {Object} options - 选项
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addRemoveNumbersOperation(options = {}) {
        const defaultOptions = {
            target: 'both'
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.operations.push({
            type: 'removeNumbers',
            options: mergedOptions
        });

        Logger.info('添加去除数字操作', mergedOptions);
        return this;
    }

    /**
     * 添加前缀操作
     * @param {string} prefix - 要添加的前缀
     * @param {Object} options - 选项
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addPrefixOperation(prefix, options = {}) {
        const defaultOptions = {
            target: 'both'
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.operations.push({
            type: 'prefix',
            prefix,
            options: mergedOptions
        });

        Logger.info(`添加前缀操作: "${prefix}"`, mergedOptions);
        return this;
    }

    /**
     * 添加后缀操作
     * @param {string} suffix - 要添加的后缀
     * @param {Object} options - 选项
     * @param {string} options.target - 替换目标 ('fxName', 'fxName_zh', 'both')
     */
    addSuffixOperation(suffix, options = {}) {
        const defaultOptions = {
            target: 'both'
        };

        const mergedOptions = { ...defaultOptions, ...options };

        this.operations.push({
            type: 'suffix',
            suffix,
            options: mergedOptions
        });

        Logger.info(`添加后缀操作: "${suffix}"`, mergedOptions);
        return this;
    }

    /**
     * 清除所有操作
     */
    clearOperations() {
        this.operations = [];
        Logger.info('已清除所有批量重命名操作');
        return this;
    }

    /**
     * 执行所有操作
     * @returns {Array} 处理后的文件
     */
    execute() {
        if (this.files.length === 0) {
            Logger.warn('没有文件可以处理');
            return [];
        }

        if (this.operations.length === 0) {
            Logger.warn('没有操作可以执行');
            return this.files;
        }

        Logger.info(`开始执行 ${this.operations.length} 个批量重命名操作，处理 ${this.files.length} 个文件`);

        // 复制文件数组，避免修改原数组
        const processedFiles = [...this.files];

        // 对每个文件执行所有操作
        for (const file of processedFiles) {
            // 保存原始值，以便在操作失败时恢复
            const originalStandardizedName = file.standardizedName;
            const originalTranslatedName = file.translatedName;

            try {
                // 执行每个操作
                for (const operation of this.operations) {
                    this._applyOperation(file, operation);
                }

                Logger.debug(`文件 "${file.name}" 批量重命名完成: FXName="${file.standardizedName}", FXName_zh="${file.translatedName}"`);
            } catch (error) {
                Logger.error(`文件 "${file.name}" 批量重命名失败`, error);
                // 恢复原始值
                file.standardizedName = originalStandardizedName;
                file.translatedName = originalTranslatedName;
            }
        }

        return processedFiles;
    }

    /**
     * 应用操作到文件
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @private
     */
    _applyOperation(file, operation) {
        const { type, options } = operation;

        // 确定要处理的字段
        const processFields = [];
        if (options.target === 'fxName' || options.target === 'both') {
            processFields.push('standardizedName');
        }
        if (options.target === 'fxName_zh' || options.target === 'both') {
            processFields.push('translatedName');
        }

        // 根据操作类型处理
        switch (type) {
            case 'replace':
                this._applyReplaceOperation(file, operation, processFields);
                break;
            case 'case':
                this._applyCaseOperation(file, operation, processFields);
                break;
            case 'removeSymbols':
                this._applyRemoveSymbolsOperation(file, operation, processFields);
                break;
            case 'removeNumbers':
                this._applyRemoveNumbersOperation(file, operation, processFields);
                break;
            case 'prefix':
                this._applyPrefixOperation(file, operation, processFields);
                break;
            case 'suffix':
                this._applySuffixOperation(file, operation, processFields);
                break;
            default:
                Logger.warn(`未知的操作类型: ${type}`);
        }
    }

    /**
     * 应用替换操作
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @param {Array} fields - 要处理的字段
     * @private
     */
    _applyReplaceOperation(file, operation, fields) {
        const { searchText, replaceText, options } = operation;

        // 创建正则表达式
        let regex;
        if (options.useRegex) {
            try {
                const flags = options.caseSensitive ? 'g' : 'gi';
                regex = new RegExp(searchText, flags);
            } catch (error) {
                Logger.error(`创建正则表达式失败: ${error.message}`);
                return;
            }
        } else {
            let pattern = searchText;
            // 转义正则表达式特殊字符
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // 如果需要匹配整个单词，添加单词边界
            if (options.wholeWord) {
                pattern = `\\b${pattern}\\b`;
            }
            
            const flags = options.caseSensitive ? 'g' : 'gi';
            regex = new RegExp(pattern, flags);
        }

        // 应用替换
        for (const field of fields) {
            if (file[field]) {
                file[field] = file[field].replace(regex, replaceText);
            }
        }
    }

    /**
     * 应用大小写转换操作
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @param {Array} fields - 要处理的字段
     * @private
     */
    _applyCaseOperation(file, operation, fields) {
        const { caseType } = operation;

        for (const field of fields) {
            if (!file[field]) continue;

            switch (caseType) {
                case 'upper':
                    file[field] = file[field].toUpperCase();
                    break;
                case 'lower':
                    file[field] = file[field].toLowerCase();
                    break;
                case 'title':
                    file[field] = file[field].replace(/\w\S*/g, txt => {
                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    });
                    break;
                case 'sentence':
                    file[field] = file[field].charAt(0).toUpperCase() + file[field].substr(1).toLowerCase();
                    break;
                default:
                    Logger.warn(`未知的大小写类型: ${caseType}`);
            }
        }
    }

    /**
     * 应用去除符号操作
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @param {Array} fields - 要处理的字段
     * @private
     */
    _applyRemoveSymbolsOperation(file, operation, fields) {
        const { options } = operation;

        for (const field of fields) {
            if (!file[field]) continue;

            if (field === 'translatedName') {
                // 对于中文描述，保留中文和字母数字
                file[field] = options.preserveSpaces
                    ? file[field].replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')
                    : file[field].replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            } else {
                // 对于英文描述，保留字母数字
                file[field] = options.preserveSpaces
                    ? file[field].replace(/[^a-zA-Z0-9\s]/g, '')
                    : file[field].replace(/[^a-zA-Z0-9]/g, '');
            }

            // 规范化空格
            file[field] = file[field].replace(/\s+/g, ' ').trim();
        }
    }

    /**
     * 应用去除数字操作
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @param {Array} fields - 要处理的字段
     * @private
     */
    _applyRemoveNumbersOperation(file, operation, fields) {
        for (const field of fields) {
            if (!file[field]) continue;

            // 移除数字
            file[field] = file[field].replace(/\d+/g, '');
            
            // 规范化空格
            file[field] = file[field].replace(/\s+/g, ' ').trim();
        }
    }

    /**
     * 应用前缀操作
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @param {Array} fields - 要处理的字段
     * @private
     */
    _applyPrefixOperation(file, operation, fields) {
        const { prefix } = operation;

        for (const field of fields) {
            if (file[field] !== undefined) {
                file[field] = prefix + file[field];
            }
        }
    }

    /**
     * 应用后缀操作
     * @param {Object} file - 文件对象
     * @param {Object} operation - 操作对象
     * @param {Array} fields - 要处理的字段
     * @private
     */
    _applySuffixOperation(file, operation, fields) {
        const { suffix } = operation;

        for (const field of fields) {
            if (file[field] !== undefined) {
                file[field] = file[field] + suffix;
            }
        }
    }

    /**
     * 获取操作列表
     * @returns {Array} 操作列表
     */
    getOperations() {
        return [...this.operations];
    }

    /**
     * 获取操作数量
     * @returns {number} 操作数量
     */
    getOperationCount() {
        return this.operations.length;
    }

    /**
     * 获取文件数量
     * @returns {number} 文件数量
     */
    getFileCount() {
        return this.files.length;
    }
}

// 导出BatchRenamer
window.BatchRenamer = BatchRenamer;