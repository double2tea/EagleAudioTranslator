/**
 * 文件处理器
 * 用于处理音效文件的获取、筛选和重命名
 */
class FileProcessor {
    /**
     * 构造函数
     * @param {TranslationService} translationService - 翻译服务实例
     * @param {CSVMatcher} csvMatcher - CSV匹配器实例
     * @param {NamingRules} namingRules - 命名规则引擎实例
     */
    constructor(translationService, csvMatcher, namingRules) {
        this.translationService = translationService;
        this.csvMatcher = csvMatcher;
        this.namingRules = namingRules;
        this.files = [];
        this.isProcessing = false;
        this.pauseTranslation = false;
        this.useCSV = true; // 默认启用CSV术语库
    }

    /**
     * 从Eagle获取当前选中的文件
     * @returns {Promise<Array>} 选中的文件列表
     */
    async getCurrentSelection() {
        try {
            Logger.info('获取当前选中的文件');

            // 获取选中的文件
            const items = await eagle.item.getSelected();

            if (!items || items.length === 0) {
                Logger.warn('没有选中的文件');
                return [];
            }

            Logger.info(`获取到 ${items.length} 个选中的文件`);
            return this._processEagleItems(items);
        } catch (error) {
            Logger.error('获取当前选中的文件失败', error);
            throw new Error(`获取选中的文件失败: ${error.message}`);
        }
    }

    /**
     * 从Eagle获取指定文件夹中的文件
     * @param {string} folderId - 文件夹ID
     * @returns {Promise<Array>} 文件夹中的文件列表
     */
    async getFolderFiles(folderId) {
        try {
            if (!folderId) {
                Logger.error('获取文件夹文件失败: 文件夹ID不能为空');
                throw new Error('文件夹ID不能为空');
            }

            Logger.info(`获取文件夹 ${folderId} 中的文件`);

            // 获取指定文件夹中的文件
            const items = await eagle.item.getByFolderId(folderId);

            if (!items || items.length === 0) {
                Logger.warn(`文件夹 ${folderId} 中没有文件`);
                return [];
            }

            Logger.info(`获取到 ${items.length} 个文件`);
            return this._processEagleItems(items);
        } catch (error) {
            Logger.error(`获取文件夹 ${folderId} 中的文件失败`, error);
            throw new Error(`获取文件夹文件失败: ${error.message}`);
        }
    }

    /**
     * 从Eagle获取带指定标签的文件
     * @param {string} tag - 标签
     * @returns {Promise<Array>} 带标签的文件列表
     */
    async getFilesByTag(tag) {
        try {
            Logger.info(`获取带标签 "${tag}" 的文件`);

            // 获取带指定标签的文件
            const items = await eagle.item.getByTag(tag);

            if (!items || items.length === 0) {
                Logger.warn(`没有带标签 "${tag}" 的文件`);
                return [];
            }

            Logger.info(`获取到 ${items.length} 个带标签 "${tag}" 的文件`);
            return this._processEagleItems(items);
        } catch (error) {
            Logger.error(`获取带标签 "${tag}" 的文件失败`, error);
            throw new Error(`获取带标签的文件失败: ${error.message}`);
        }
    }

    /**
     * 处理Eagle返回的文件项
     * @param {Array} items - Eagle文件项
     * @returns {Array} 处理后的文件对象数组
     * @private
     */
    _processEagleItems(items) {
        try {
            // 转换为内部文件格式
            const files = items.map(item => {
                const extension = item.ext || this._getExtensionFromName(item.name) || '';
                return {
                    id: item.id,
                    name: this._getNameWithoutExtension(item.name),
                    originalName: item.name, // 保存原始文件名，便于调试
                    path: item.path || '',
                    extension: extension.toLowerCase(),
                    translatedName: '',
                    formattedName: '',
                    category: '',
                    tags: item.tags || [],
                    status: 'pending',
                    errorMessage: '',
                    selected: true // 默认选中
                };
            });

            Logger.debug(`检索到 ${files.length} 个文件，开始筛选音频文件`);

            // 如果没有找到任何文件，记录详细信息
            if (files.length === 0) {
                Logger.warn('未找到任何文件');
                return [];
            }

            // 筛选音频文件
            const audioFiles = files.filter(file => {
                return Validator.isAudioExtension(file.extension);
            });

            Logger.info(`筛选出 ${audioFiles.length} 个音频文件`);

            // 保存到实例
            this.files = audioFiles;

            return audioFiles;
        } catch (error) {
            Logger.error('处理Eagle文件项失败', error);
            throw new Error(`处理文件失败: ${error.message}`);
        }
    }

    /**
     * 从文件名获取扩展名
     * @param {string} filename - 文件名
     * @returns {string} 扩展名
     * @private
     */
    _getExtensionFromName(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop() : '';
    }

    /**
     * 获取不带扩展名的文件名
     * @param {string} filename - 文件名
     * @returns {string} 不带扩展名的文件名
     * @private
     */
    _getNameWithoutExtension(filename) {
        if (!filename) return '';
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
    }

    /**
     * 处理文件翻译
     * @param {Array} files - 要处理的文件
     * @returns {Promise<Array>} 处理后的文件
     */
    async processTranslation(files) {
        if (this.isProcessing) {
            throw new Error('已有翻译任务正在进行中');
        }

        this.isProcessing = true;
        this.pauseTranslation = false;

        try {
            Logger.info(`开始处理 ${files.length} 个文件的翻译`);

            // 确保文件是数组
            if (!Array.isArray(files) || files.length === 0) {
                throw new Error('没有文件可以处理');
            }

            // 复制文件数组，避免修改原数组
            const fileObjects = [...files];

            for (let i = 0; i < fileObjects.length; i++) {
                // 检查是否暂停
                if (this.pauseTranslation) {
                    Logger.info(`翻译已暂停，已处理 ${i} 个文件`);
                    break;
                }

                const file = fileObjects[i];
                try {
                    // 识别分类
                    if (this.csvMatcher && this.csvMatcher.loaded) {
                        // 先尝试使用完整文件名识别分类
                        const match = this.csvMatcher.findMatch(file.name);
                        if (match) {
                            file.category = match.category || '';
                            file.categoryName = match.categoryName || '';
                            file.categoryNameZh = match.categoryNameZh || '';
                            file.subCategory = match.source || '';
                            file.subCategoryTranslated = match.target || '';
                            Logger.debug(`文件 "${file.name}" 匹配到术语: 分类=${file.category}, 分类名=${file.categoryName}, 子分类=${file.subCategory}, 子分类翻译=${file.subCategoryTranslated}`);
                        } else {
                            // 如果没有匹配到术语，尝试使用AI辅助分类匹配
                            if (this.csvMatcher.matchSettings.useAIClassification && this.csvMatcher.aiClassifier) {
                                try {
                                    // 使用AI辅助分类器获取分类信息
                                    const aiClassification = await this.csvMatcher.aiClassifier.getClassification(file.name, this.translationService);

                                    if (aiClassification) {
                                        Logger.debug(`文件 "${file.name}" 使用AI辅助分类匹配结果:`, aiClassification);

                                        // 使用AI返回的分类信息
                                        file.category = aiClassification.catID || '';
                                        file.categoryName = aiClassification.category || '';
                                        file.categoryNameZh = aiClassification.category_zh || '';
                                        file.subCategory = aiClassification.subCategory || '';
                                        file.subCategoryTranslated = aiClassification.subCategory_zh || '';
                                    }
                                } catch (aiError) {
                                    Logger.error(`AI辅助分类匹配失败:`, aiError);
                                    // 失败时回退到传统匹配方式
                                }
                            }

                            // 如果AI分类失败或未启用，使用传统方式识别分类
                            if (!file.category) {
                                file.category = await this.csvMatcher.identifyCategory(file.name, this.translationService);

                                // 如果没有识别到分类，尝试使用文件名的第一部分
                                if (!file.category && file.name.indexOf(' ') !== -1) {
                                    const firstPart = file.name.split(' ')[0];
                                    file.category = await this.csvMatcher.identifyCategory(firstPart, this.translationService);
                                }
                            }
                        }
                    }

                    // 如果还是没有分类，设置默认分类
                    if (!file.category) {
                        // 设置默认分类为杂项
                        file.category = 'Misc';
                        Logger.debug(`文件 "${file.name}" 未识别分类，使用默认分类 Misc`);
                    } else {
                        // 特殊处理bleep/beep关键词
                        const lowerName = file.name.toLowerCase();
                        if ((lowerName === 'bleep' || lowerName.startsWith('bleep ') ||
                             lowerName === 'beep' || lowerName.startsWith('beep ') ||
                             lowerName.includes('哔哔')) && file.category === 'TEST') {
                            // 设置正确的分类信息
                            file.category = 'TEST';
                            file.subCategory = 'TEST TONE';
                            file.subCategoryTranslated = '测试音';
                            Logger.debug(`文件 "${file.name}" 被识别为测试音分类`);
                        }

                        // 如果没有子分类信息，尝试再次匹配
                        if (!file.subCategory && this.csvMatcher && this.csvMatcher.loaded) {
                            // 特殊处理Synthetic Pop、Small Pop和Slap Pop
                            if (lowerName.includes('pop')) {
                                if (lowerName.includes('synthetic pop') ||
                                    lowerName.includes('small pop') ||
                                    lowerName.includes('slap pop')) {
                                    // 强制设置为TOON分类
                                    file.category = 'TOON';
                                    file.categoryName = 'CARTOON';
                                    file.categoryNameZh = '卡通';
                                    file.subCategory = 'POP';
                                    file.subCategoryTranslated = '道具';

                                    Logger.debug(`特殊处理: 文件 "${file.name}" 强制设置为卡通道具分类`);
                                }
                            }

                            // 如果不是Pop类型文件，尝试其他匹配
                            if (!file.subCategory) {
                                // 尝试使用文件名匹配子分类
                                const words = lowerName.split(/\s+/);
                                if (words.length > 1) {
                                    // 获取当前分类的所有术语
                                    const categoryTerms = this.csvMatcher.getTermsByCategory(file.category);
                                    for (const term of categoryTerms) {
                                        const termWords = term.source.toLowerCase().split(/\s+/);
                                        // 检查是否是多词短语并且完全包含在文件名中
                                        if (termWords.length > 0) {
                                            const phrase = termWords.join(' ');
                                            if (lowerName.includes(phrase)) {
                                                file.subCategory = term.source;
                                                file.subCategoryTranslated = term.target;
                                                Logger.debug(`文件 "${file.name}" 匹配到子分类: ${term.source} -> ${term.target}`);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Logger.debug(`文件 "${file.name}" 被识别为 ${file.category} 分类${file.subCategory ? ', 子分类=' + file.subCategory : ''}`);
                    }

                    // 从文件名中提取序号
                    const nameParts = NumberExtractor.extractNumber(file.name);
                    file.nameWithoutNumber = nameParts.text;
                    file.numberPart = nameParts.number;
                    file.numberFormat = {
                        prefix: nameParts.prefix || false,
                        suffix: nameParts.suffix || ''
                    };

                    Logger.debug(`文件名分解: "${file.name}" -> 文本: "${file.nameWithoutNumber}", 序号: ${file.numberPart || '无'}`);

                    // 特殊处理Synthetic Pop、Small Pop和Slap Pop
                    const lowerName = file.name.toLowerCase();
                    if (lowerName.includes('pop')) {
                        if (lowerName.includes('synthetic pop')) {
                            // 强制设置标准化名称
                            file.standardizedName = 'swooshPop';
                            Logger.debug(`特殊处理: 文件 "${file.name}" 标准化结果强制设置为 "${file.standardizedName}"`);
                        } else if (lowerName.includes('small pop')) {
                            file.standardizedName = 'smallPop';
                            Logger.debug(`特殊处理: 文件 "${file.name}" 标准化结果强制设置为 "${file.standardizedName}"`);
                        } else if (lowerName.includes('slap pop')) {
                            file.standardizedName = 'slapPop';
                            Logger.debug(`特殊处理: 文件 "${file.name}" 标准化结果强制设置为 "${file.standardizedName}"`);
                        } else {
                            // 如果启用了英文标准化处理，先生成标准化的英文描述
                            if (this.translationService.settings.standardizeEnglish) {
                                try {
                                    // 生成标准化的英文描述
                                    file.standardizedName = await this.translationService.standardize(file.nameWithoutNumber);
                                    Logger.debug(`文件 "${file.name}" 标准化结果: "${file.standardizedName}"`);
                                } catch (error) {
                                    Logger.error(`文件 "${file.name}" 标准化失败`, error);
                                    // 如果标准化失败，使用原始文件名
                                    file.standardizedName = file.nameWithoutNumber;
                                }
                            } else {
                                // 如果没有启用标准化，使用原始文件名
                                file.standardizedName = file.nameWithoutNumber;
                            }
                        }
                    } else {
                        // 如果启用了英文标准化处理，先生成标准化的英文描述
                        if (this.translationService.settings.standardizeEnglish) {
                            try {
                                // 生成标准化的英文描述
                                file.standardizedName = await this.translationService.standardize(file.nameWithoutNumber);
                                Logger.debug(`文件 "${file.name}" 标准化结果: "${file.standardizedName}"`);
                            } catch (error) {
                                Logger.error(`文件 "${file.name}" 标准化失败`, error);
                                // 如果标准化失败，使用原始文件名
                                file.standardizedName = file.nameWithoutNumber;
                            }
                        } else {
                            // 如果没有启用标准化，使用原始文件名
                            file.standardizedName = file.nameWithoutNumber;
                        }
                    }

                    // 特殊处理Synthetic Pop、Small Pop和Slap Pop的翻译
                    if (lowerName.includes('pop')) {
                        if (lowerName.includes('synthetic pop')) {
                            file.translatedName = '电子合成';
                            Logger.debug(`特殊处理: 文件 "${file.name}" 翻译结果强制设置为 "${file.translatedName}"`);
                        } else if (lowerName.includes('small pop')) {
                            file.translatedName = '小型爆破';
                            Logger.debug(`特殊处理: 文件 "${file.name}" 翻译结果强制设置为 "${file.translatedName}"`);
                        } else if (lowerName.includes('slap pop')) {
                            file.translatedName = '拍击爆破';
                            Logger.debug(`特殊处理: 文件 "${file.name}" 翻译结果强制设置为 "${file.translatedName}"`);
                        } else {
                            // 先尝试CSV匹配
                            let matchedTranslation = null;
                            if (this.useCSV && this.csvMatcher && this.csvMatcher.loaded) {
                                // 使用不带序号的文件名进行匹配
                                const match = this.csvMatcher.findMatch(file.nameWithoutNumber);
                                if (match) {
                                    matchedTranslation = match.target;
                                }
                            }

                            // 如果CSV没有匹配结果，使用翻译服务
                            if (!matchedTranslation) {
                                // 只翻译不带序号的部分
                                file.translatedName = await this.translationService.translate(file.nameWithoutNumber);
                            } else {
                                file.translatedName = matchedTranslation;
                            }
                        }
                    } else {
                        // 先尝试CSV匹配
                        let matchedTranslation = null;
                        if (this.useCSV && this.csvMatcher && this.csvMatcher.loaded) {
                            // 使用不带序号的文件名进行匹配
                            const match = this.csvMatcher.findMatch(file.nameWithoutNumber);
                            if (match) {
                                matchedTranslation = match.target;
                            }
                        }

                        // 如果CSV没有匹配结果，使用翻译服务
                        if (!matchedTranslation) {
                            // 只翻译不带序号的部分
                            file.translatedName = await this.translationService.translate(file.nameWithoutNumber);
                        } else {
                            file.translatedName = matchedTranslation;
                        }
                    }

                    // 应用命名规则
                    file.formattedName = this.namingRules.formatFilename(file);
                    Logger.debug(`文件名格式化: 原始="${file.name}", 翻译="${file.translatedName}", 分类="${file.category}", 最终="${file.formattedName}"`);

                    // 更新状态
                    file.status = 'success';

                    Logger.debug(`文件 "${file.name}" 翻译完成: "${file.translatedName}"`);
                } catch (error) {
                    file.status = 'error';
                    file.errorMessage = error.message;
                    Logger.error(`文件 "${file.name}" 翻译失败`, error);
                }
            }

            return fileObjects;
        } catch (error) {
            Logger.error('处理文件翻译失败', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 执行重命名
     * @param {Array} files - 要重命名的文件
     * @returns {Promise<Array>} 重命名结果
     */
    async executeRename(files) {
        try {
            Logger.info(`开始重命名 ${files.length} 个文件`);

            // 确保文件是数组
            if (!Array.isArray(files) || files.length === 0) {
                throw new Error('没有文件可以重命名');
            }

            const results = [];

            for (const file of files) {
                try {
                    // 跳过未翻译或出错的文件
                    if (file.status !== 'success' || !file.formattedName) {
                        results.push({
                            id: file.id,
                            success: false,
                            message: '文件未翻译或翻译失败'
                        });
                        continue;
                    }

                    // 构建新的文件名（包含扩展名）
                    const newName = file.formattedName;

                    // 获取文件信息
                    const item = await eagle.item.getById(file.id);

                    if (!item) {
                        throw new Error(`找不到ID为 ${file.id} 的文件`);
                    }

                    // 更新文件名
                    item.name = newName;

                    // 调用Eagle API更新文件
                    await eagle.item.update(file.id, item);

                    results.push({
                        id: file.id,
                        success: true,
                        message: `重命名成功: ${file.originalName} -> ${newName}`
                    });

                    Logger.info(`文件重命名成功: ${file.originalName} -> ${newName}`);
                } catch (error) {
                    results.push({
                        id: file.id,
                        success: false,
                        message: `重命名失败: ${error.message}`
                    });

                    Logger.error(`文件 ${file.id} 重命名失败`, error);
                }
            }

            return results;
        } catch (error) {
            Logger.error('执行重命名失败', error);
            throw error;
        }
    }

    /**
     * 暂停翻译处理
     */
    pauseTranslationProcess() {
        this.pauseTranslation = true;
        Logger.info('翻译处理已暂停');
    }

    /**
     * 恢复翻译处理
     */
    resumeTranslationProcess() {
        this.pauseTranslation = false;
        Logger.info('翻译处理已恢复');
    }

    /**
     * 获取处理状态
     * @returns {Object} 处理状态
     */
    getProcessingStatus() {
        return {
            isProcessing: this.isProcessing,
            isPaused: this.pauseTranslation,
            totalFiles: this.files.length
        };
    }

    /**
     * 设置是否使用CSV术语库
     * @param {boolean} useCSV - 是否使用CSV术语库
     */
    setUseCSV(useCSV) {
        this.useCSV = useCSV;
        Logger.info(`已${useCSV ? '启用' : '禁用'}CSV术语库`);
    }
}

// 导出FileProcessor
window.FileProcessor = FileProcessor;