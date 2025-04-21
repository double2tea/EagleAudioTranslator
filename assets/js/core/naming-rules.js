/**
 * 命名规则引擎
 * 用于格式化和验证文件名
 */
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

        // 分类ID映射表
        this.categoryIDMap = {
            'Ambience': 'AMB',
            'Impact': 'IMP',
            'Foley': 'FOL',
            'Voice': 'VOX',
            'Music': 'MUS',
            'Interface': 'UI',
            'Weapon': 'WPN',
            'Vehicle': 'VEH',
            'Creature': 'CRE',
            'Magic': 'MAG',
            'Footstep': 'FST',
            'Door': 'DOR',
            'Mechanism': 'MCH',
            'Explosion': 'EXP',
            'Weather': 'WTH',
            'Nature': 'NAT',
            'Cloth': 'CLT',
            'Metal': 'MTL',
            'Wood': 'WOD',
            'Glass': 'GLS',
            'Stone': 'STN',
            'Water': 'WTR',
            'Fire': 'FIR',
            'Wind': 'WND',
            'Electricity': 'ELC',
            'Button': 'BTN',
            'Notification': 'NTF',
            'Alarm': 'ALM',
            'Beep': 'BEP',
            'Whoosh': 'WSH',
            'Sci-Fi': 'SCI',
            'Horror': 'HOR',
            'Fantasy': 'FNT',
            'Cartoon': 'CTN',
            'Human': 'HUM',
            'Animal': 'ANM',
            'Robot': 'ROB',
            'Monster': 'MON',
            'Insect': 'INS',
            'Bird': 'BRD',
            'Debris': 'DBR',
            'Destruction': 'DST',
            'Cinematic': 'CIN',
            'Transition': 'TRN',
            'Stinger': 'STG',
            'Loop': 'LOP',
            'Oneshot': 'ONE',
            'Misc': 'MSC',
            'TEST': 'TEST',
            'ARCHIVED': 'ARCH'
        };

        // 分类中文名映射表
        this.categoryChineseMap = {
            'Ambience': '环境',
            'Impact': '撞击',
            'Foley': '拟音',
            'Voice': '语音',
            'Music': '音乐',
            'Interface': '界面',
            'Weapon': '武器',
            'Vehicle': '载具',
            'Creature': '生物',
            'Magic': '魔法',
            'Footstep': '脚步',
            'Door': '门',
            'Mechanism': '机械',
            'Explosion': '爆炸',
            'Weather': '天气',
            'Nature': '自然',
            'Cloth': '布料',
            'Metal': '金属',
            'Wood': '木头',
            'Glass': '玻璃',
            'Stone': '石头',
            'Water': '水',
            'Fire': '火',
            'Wind': '风',
            'Electricity': '电',
            'Button': '按钮',
            'Notification': '通知',
            'Alarm': '警报',
            'Beep': '蜂鸣',
            'Whoosh': '呼啸',
            'Sci-Fi': '科幻',
            'Horror': '恐怖',
            'Fantasy': '奇幻',
            'Cartoon': '卡通',
            'Human': '人类',
            'Animal': '动物',
            'Robot': '机器人',
            'Monster': '怪物',
            'Insect': '昆虫',
            'Bird': '鸟类',
            'Debris': '碎片',
            'Destruction': '破坏',
            'Cinematic': '电影',
            'Transition': '过渡',
            'Stinger': '短音',
            'Loop': '循环',
            'Oneshot': '单次',
            'Misc': '杂项',
            'TEST': '测试',
            'ARCHIVED': '归档'
        };
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
        const category = file.category || 'Misc';

        // 添加各个命名元素
        if (elements.catID) {
            parts.push(this._getCategoryID(category));
        }

        if (elements.category) {
            parts.push(category);
        }

        if (elements.category_zh) {
            parts.push(this._getCategoryChineseName(category));
        }

        if (elements.subCategory && file.subCategory) {
            parts.push(file.subCategory);
        }

        if (elements.subCategory_zh && file.subCategory) {
            parts.push(file.subCategoryTranslated || '');
        }

        if (elements.fxName) {
            // 使用标准化的英文描述（如果有），否则使用不带序号的文件名
            parts.push(file.standardizedName || file.nameWithoutNumber || file.name);
        }

        if (elements.fxName_zh) {
            // 使用翻译后的文件名（不带序号）
            parts.push(file.translatedName);
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

        // 组合文件名
        return parts.join(separator);
    }

    /**
     * 获取分类ID
     * @param {string} category - 分类名称
     * @returns {string} 分类ID
     * @private
     */
    _getCategoryID(category) {
        return this.categoryIDMap[category] || 'MSC'; // 默认返回杂项分类
    }

    /**
     * 获取分类中文名
     * @param {string} category - 分类名称
     * @returns {string} 分类中文名
     * @private
     */
    _getCategoryChineseName(category) {
        return this.categoryChineseMap[category] || '杂项'; // 默认返回杂项
    }
}

// 导出NamingRules
window.NamingRules = NamingRules;