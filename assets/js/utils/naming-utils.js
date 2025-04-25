/**
 * 命名工具类
 * 集中处理所有与命名相关的逻辑
 */
class NamingUtils {
    /**
     * 从文本中提取数字序号
     * @param {string} text - 要处理的文本
     * @returns {Object} 包含提取的数字和剩余文本的对象
     */
    static extractNumber(text) {
        // 直接使用NumberExtractor的方法
        return NumberExtractor.extractNumber(text);
    }

    /**
     * 重新组合文本和数字
     * @param {Object} parts - 包含文本和数字的对象
     * @returns {string} 组合后的文本
     */
    static combineTextAndNumber(parts) {
        // 直接使用NumberExtractor的方法
        return NumberExtractor.combineTextAndNumber(parts);
    }

    /**
     * 规范化英文文本
     * 移除特殊符号，保留字母、数字
     * @param {string} text - 要处理的文本
     * @param {boolean} [keepSpaces=false] - 是否保留空格
     * @returns {string} 处理后的文本
     */
    static normalizeEnglishText(text, keepSpaces = false) {
        if (!text) return '';
        
        // 先规范化空格
        let normalized = text.replace(/\s+/g, ' ').trim();
        
        // 根据是否保留空格选择不同的正则表达式
        if (keepSpaces) {
            // 保留字母、数字和空格
            normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        } else {
            // 只保留字母和数字
            normalized = normalized.replace(/[^a-zA-Z0-9]/g, '').trim();
        }
        
        return normalized;
    }

    /**
     * 规范化中文文本
     * 移除特殊符号，保留中文、字母、数字
     * @param {string} text - 要处理的文本
     * @param {boolean} [keepSpaces=false] - 是否保留空格
     * @returns {string} 处理后的文本
     */
    static normalizeChineseText(text, keepSpaces = false) {
        if (!text) return '';
        
        // 先规范化空格
        let normalized = text.replace(/\s+/g, ' ').trim();
        
        // 根据是否保留空格选择不同的正则表达式
        if (keepSpaces) {
            // 保留中文、字母、数字和空格
            normalized = normalized.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').trim();
        } else {
            // 只保留中文、字母和数字
            normalized = normalized.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').trim();
        }
        
        return normalized;
    }

    /**
     * 应用命名风格
     * @param {string} text - 要处理的文本
     * @param {string} style - 命名风格 ('none', 'camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'custom')
     * @param {string} [customSeparator='_'] - 自定义分隔符
     * @returns {string} 处理后的文本
     */
    static applyNamingStyle(text, style, customSeparator = '_') {
        if (!text) return '';
        
        // 先清理文本，确保正确分割单词
        const cleanText = text.replace(/\s+/g, ' ').trim();
        
        // 分割单词
        const words = cleanText.split(/\s+/);
        
        switch (style) {
            case 'camelCase':
                return words.map((word, index) => {
                    if (index === 0) {
                        return word.toLowerCase();
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join('');
                
            case 'PascalCase':
                return words.map(word => {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join('');
                
            case 'snake_case':
                return words.map(word => word.toLowerCase()).join('_');
                
            case 'kebab-case':
                return words.map(word => word.toLowerCase()).join('-');
                
            case 'custom':
                return words.join(customSeparator);
                
            case 'none':
            default:
                // 如果没有指定命名风格，返回原始文本
                return cleanText;
        }
    }

    /**
     * 检测文本是否为中文
     * @param {string} text - 要检测的文本
     * @returns {boolean} 是否为中文文本
     */
    static isChineseText(text) {
        if (!text) return false;
        
        // 中文字符范围
        const chineseRegex = /[\u4e00-\u9fa5]/g;
        const chineseChars = text.match(chineseRegex) || [];
        
        // 如果中文字符占比超过40%，认为是中文文本
        return chineseChars.length / text.length > 0.4;
    }

    /**
     * 获取不带扩展名的文件名
     * @param {string} filename - 文件名
     * @returns {string} 不带扩展名的文件名
     */
    static getNameWithoutExtension(filename) {
        return Validator.getNameWithoutExtension(filename);
    }

    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 扩展名
     */
    static getExtension(filename) {
        return Validator.getExtension(filename);
    }

    /**
     * 清理文件名，移除无效字符
     * @param {string} filename - 要清理的文件名
     * @returns {string} 清理后的文件名
     */
    static sanitizeFilename(filename) {
        return Validator.sanitizeFilename(filename);
    }

    /**
     * 处理文件对象的命名
     * 统一处理文件名的提取、规范化和格式化
     * @param {Object} file - 文件对象
     * @param {Object} options - 处理选项
     * @returns {Object} 处理后的文件对象
     */
    static processFileName(file, options = {}) {
        if (!file) return file;
        
        const defaultOptions = {
            useUCS: true,
            namingStyle: 'none',
            customSeparator: '_',
            keepSpaces: false
        };
        
        const settings = { ...defaultOptions, ...options };
        
        // 创建文件对象的副本，避免修改原始对象
        const processedFile = { ...file };
        
        // 检测是否为中文文件名
        processedFile.isChinese = this.isChineseText(processedFile.name);
        
        // 从文件名中提取序号
        const nameParts = this.extractNumber(processedFile.name);
        processedFile.nameWithoutNumber = nameParts.text;
        processedFile.numberPart = nameParts.number;
        processedFile.numberFormat = {
            prefix: nameParts.prefix || false,
            suffix: nameParts.suffix || ''
        };
        
        // 处理英文描述(FXName)
        if (processedFile.standardizedName) {
            // 如果已经有标准化名称，应用命名风格
            processedFile.standardizedName = this.applyNamingStyle(
                processedFile.standardizedName,
                settings.namingStyle,
                settings.customSeparator
            );
            
            // 如果使用UCS命名规则，规范化英文文本
            if (settings.useUCS) {
                processedFile.standardizedName = this.normalizeEnglishText(
                    processedFile.standardizedName,
                    settings.keepSpaces
                );
            }
        } else {
            // 如果没有标准化名称，使用不带序号的文件名
            let fxName = processedFile.nameWithoutNumber;
            
            // 应用命名风格
            fxName = this.applyNamingStyle(
                fxName,
                settings.namingStyle,
                settings.customSeparator
            );
            
            // 如果使用UCS命名规则，规范化英文文本
            if (settings.useUCS) {
                fxName = this.normalizeEnglishText(fxName, settings.keepSpaces);
            }
            
            processedFile.standardizedName = fxName;
        }
        
        // 处理中文描述(FXName_zh)
        if (processedFile.translatedName) {
            // 如果使用UCS命名规则，规范化中文文本
            if (settings.useUCS) {
                processedFile.translatedName = this.normalizeChineseText(
                    processedFile.translatedName,
                    settings.keepSpaces
                );
            }
        }
        
        return processedFile;
    }
}

// 导出NamingUtils
window.NamingUtils = NamingUtils;