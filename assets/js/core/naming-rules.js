
/**
 * 命名规则引擎
 * 用于格式化和验证文件名
 *
 * 依赖：
 * - NamingUtils: 命名工具类，提供文本规范化和命名风格处理
 */
// 确保NamingUtils已加载
if (typeof NamingUtils === 'undefined') {
    console.error('NamingUtils未定义，命名规则引擎可能无法正常工作');
}

class NamingRules {
    /**
     * 构造函数
     * @param {Object} settings - 命名规则设置
     */
    constructor(settings) {
        this.settings = settings || {
            format: 'category_name',
            template: '{category}_{name}',
            separator: '_',
            includeCategory: true,
            // UCS命名规则设置
            useUCS: true,
            elements: {
                catID: true,
                category: false,
                category_zh: true,
                subCategory: false,
                subCategory_zh: false,
                fxName: true,
                fxName_zh: true,
                creatorID: false,
                sourceID: false,
                serialNumber: false
            },
            creatorID: 'SFX',
            sourceID: 'UCS'
        };

        // 分类ID映射表 - 用于自定义分类ID映射
        this.categoryIDMap = {};

        // 分类中文名映射表 - 用于自定义分类中文名映射
        this.categoryChineseMap = {};
    }

    /**
     * 设置命名规则
     * @param {Object} settings - 命名规则设置
     */
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        Logger.info('命名规则设置已更新', this.settings);
    }

    /**
     * 格式化文件名
     * @param {Object} file - 文件对象
     * @returns {string} 格式化后的文件名
     */
    formatFilename(file) {
        if (!file) {
            return '';
        }

        let formattedName = '';

        // 如果启用UCS命名规则，使用UCS格式
        if (this.settings.useUCS) {
            formattedName = this._formatUCS(file);
        } else {
            // 根据格式类型选择格式化方法
            switch (this.settings.format) {
                case 'name_only':
                    formattedName = this._formatNameOnly(file);
                    break;
                case 'custom':
                    formattedName = this._formatCustom(file);
                    break;
                case 'category_name':
                default:
                    formattedName = this._formatCategoryName(file);
                    break;
            }
        }

        // 添加扩展名
        if (file.extension) {
            formattedName += '.' + file.extension;
        }

        // 验证和清理
        return Validator.sanitizeFilename(formattedName);
    }

    /**
     * 格式化为仅名称
     * @param {Object} file - 文件对象
     * @returns {string} 格式化后的文件名
     * @private
     */
    _formatNameOnly(file) {
        return file.translatedName || file.name;
    }

    /**
     * 格式化为分类_名称
     * @param {Object} file - 文件对象
     * @returns {string} 格式化后的文件名
     * @private
     */
    _formatCategoryName(file) {
        const separator = this.settings.separator || '_';
        let result = '';

        // 添加分类
        if (this.settings.includeCategory && file.category) {
            result += file.category + separator;
        }

        // 添加名称
        result += file.translatedName || file.name;

        return result;
    }

    /**
     * 根据自定义模板格式化文件名
     * @param {Object} file - 文件对象
     * @returns {string} 格式化后的文件名
     * @private
     */
    _formatCustom(file) {
        let template = this.settings.template || '{category}_{name}';

        // 替换模板变量
        let result = template;

        // 替换分类
        if (result.includes('{category}')) {
            if (file.category && this.settings.includeCategory) {
                result = result.replace('{category}', file.category);
            } else {
                result = result.replace('{category}', '');
                // 清理多余的分隔符
                result = result.replace(/^[-_]+|[-_]{2,}|[-_]+$/g, '');
            }
        }

        // 替换名称
        if (result.includes('{name}')) {
            result = result.replace('{name}', file.translatedName || file.name);
        }

        // 替换标签
        if (result.includes('{tags}')) {
            if (file.tags && file.tags.length > 0) {
                // 最多添加3个标签
                const tagsPart = file.tags.slice(0, 3).join(this.settings.separator);
                result = result.replace('{tags}', tagsPart);
            } else {
                result = result.replace('{tags}', '');
                // 清理多余的分隔符
                result = result.replace(/^[-_]+|[-_]{2,}|[-_]+$/g, '');
            }
        }

        return result;
    }

    /**
     * 获取预览格式
     * @returns {string} 预览格式
     */
    getPreviewFormat() {
        if (this.settings.useUCS) {
            return this._getUCSPreviewFormat();
        }

        switch (this.settings.format) {
            case 'name_only':
                return '翻译名称';
            case 'custom':
                return this.settings.template;
            case 'category_name':
            default:
                return `分类${this.settings.separator}翻译名称`;
        }
    }

    /**
     * 获取UCS命名规则预览格式
     * @returns {string} 预览格式
     * @private
     */
    _getUCSPreviewFormat() {
        const parts = [];
        const elements = this.settings.elements;
        const separator = this.settings.separator || '_';

        if (elements.catID) parts.push('CatID');
        if (elements.category) parts.push('Category');
        if (elements.category_zh) parts.push('Category_zh');
        if (elements.subCategory) parts.push('SubCategory');
        if (elements.subCategory_zh) parts.push('SubCategory_zh');
        if (elements.fxName) parts.push('FXName');
        if (elements.fxName_zh) parts.push('FXName_zh');
        if (elements.creatorID) parts.push(this.settings.creatorID);
        if (elements.sourceID) parts.push(this.settings.sourceID);
        if (elements.serialNumber) parts.push('000');

        return parts.join(separator);
    }

    /**
     * 使用UCS命名规则格式化文件名
     * @param {Object} file - 文件对象
     * @returns {string} 格式化后的文件名
     * @private
     */
    _formatUCS(file) {
        const parts = [];
        const elements = this.settings.elements;
        const separator = this.settings.separator || '_';

        // 确保文件有分类，如果没有则使用默认分类
        const category = file.categoryName || file.category || 'MISC';

        // 添加各个命名元素
        if (elements.catID) {
            // 如果文件对象中有catID属性，优先使用
            if (file.catID) {
                parts.push(file.catID);
            }
            // 如果是Synthetic Pop，直接使用TOONPop
            else if (category === 'TOON' && file.subCategory === 'POP') {
                parts.push('TOONPop');
            } else {
                parts.push(this._getCategoryID(category));
            }
        }

        if (elements.category) {
            // 使用categoryName而不是category（后者是缩写）
            parts.push(category);
        }

        if (elements.category_zh) {
            // 优先使用文件对象中的categoryNameZh属性，如果没有则使用默认映射
            const categoryZh = file.categoryNameZh || this._getCategoryChineseName(category);
            // 使用NamingUtils规范化中文文本
            parts.push(NamingUtils.normalizeChineseText(categoryZh, false));
        }

        if (elements.subCategory && file.subCategory) {
            // 使用NamingUtils规范化英文文本
            parts.push(NamingUtils.normalizeEnglishText(file.subCategory, false));
        }

        if (elements.subCategory_zh && file.subCategoryTranslated) {
            // 使用NamingUtils规范化中文文本
            parts.push(NamingUtils.normalizeChineseText(file.subCategoryTranslated, false));
        }

        if (elements.fxName) {
            // 使用标准化的英文描述（如果有），否则使用不带序号的文件名
            let fxName = file.standardizedName || file.nameWithoutNumber || file.name;

            // 🔥 关键修复：避免重复应用命名风格
            // 如果使用的是standardizedName，说明已经在file-processor中应用过命名风格了
            if (file.standardizedName) {
                // standardizedName已经应用过命名风格，直接使用
                console.log(`📋 使用已格式化的标准化名称: ${fxName}`);
            } else {
                // 只有当使用原始文件名时才应用命名风格
                console.log(`🎨 对原始文件名应用命名风格: ${fxName}`);
                fxName = NamingUtils.applyNamingStyle(
                    fxName,
                    this.settings.namingStyle,
                    this.settings.customSeparator
                );
            }

            // 如果没有命名风格，规范化英文文本
            if (!this.settings.namingStyle || this.settings.namingStyle === 'none') {
                fxName = NamingUtils.normalizeEnglishText(fxName, false);
            }

            parts.push(fxName);
        }

        if (elements.fxName_zh && file.translatedName) {
            // 使用翻译后的文件名（不带序号）
            // 使用NamingUtils规范化中文文本
            const translatedName = NamingUtils.normalizeChineseText(file.translatedName, false);
            parts.push(translatedName);
        }

        if (elements.creatorID) {
            parts.push(this.settings.creatorID);
        }

        if (elements.sourceID) {
            parts.push(this.settings.sourceID);
        }

        // 如果文件有序号，使用原始序号
        if (file.numberPart) {
            parts.push(file.numberPart);
        }
        // 如果没有原始序号但需要生成序号
        else if (elements.serialNumber) {
            // 生成三位数序号
            const serialNumber = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            parts.push(serialNumber);
        }

        // 过滤掉空元素
        const filteredParts = parts.filter(part => part && part.trim() !== '');

        // 组合文件名
        return filteredParts.join(separator);
    }

    /**
     * 获取分类ID
     * @param {string} category - 分类名称
     * @returns {string} 分类ID
     * @private
     */
    _getCategoryID(category) {
        // 特殊处理TOON分类
        if (category === 'TOON') {
            return 'TOONPop';
        }

        // 检查自定义映射表
        if (this.categoryIDMap && this.categoryIDMap[category]) {
            return this.categoryIDMap[category];
        }

        // 默认返回杂项分类
        return 'MSC';
    }

    /**
     * 获取分类中文名
     * @param {string} category - 分类名称
     * @returns {string} 分类中文名
     * @private
     */
    _getCategoryChineseName(category) {
        // 检查自定义映射表
        if (this.categoryChineseMap && this.categoryChineseMap[category]) {
            return this.categoryChineseMap[category];
        }

        // 默认返回杂项
        return '杂项';
    }
}

// 导出NamingRules
window.NamingRules = NamingRules;
