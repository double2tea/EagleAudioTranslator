
/**
 * 文件处理器
 * 用于处理音效文件的获取、筛选和重命名
 */
class FileProcessor {
    /**
     * 构造函数
     * @param {TranslationService} translationService - 翻译服务实例
     * @param {FuseMatcher|CSVMatcher} csvMatcher - 匹配器实例
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
        this.smartClassifier = null; // 智能分类器

        // 初始化智能分类器
        this._initSmartClassifier();
    }

    /**
     * 初始化智能分类器
     * @private
     */
    _initSmartClassifier() {
        try {
            // 检查是否已经有SmartClassifier实例
            let existingClassifier = null;

            // 查找现有实例
            if (this.csvMatcher && this.csvMatcher.smartClassifier) {
                existingClassifier = this.csvMatcher.smartClassifier;
            } else if (window.pluginState && window.pluginState.csvMatcher && window.pluginState.csvMatcher.smartClassifier) {
                existingClassifier = window.pluginState.csvMatcher.smartClassifier;
            }

            // 使用现有实例或创建新实例
            if (existingClassifier) {
                this.smartClassifier = existingClassifier;

                // 确保csvMatcher中的classifier也是同一个实例
                if (this.csvMatcher && this.csvMatcher.classifier !== this.smartClassifier) {
                    this.csvMatcher.classifier = this.smartClassifier;
                }
            } else if (window.SmartClassifier && this.csvMatcher) {
                this.smartClassifier = new window.SmartClassifier(this.csvMatcher);

                // 设置智能分类器实例
                this.csvMatcher.classifier = this.smartClassifier;
                this.csvMatcher.smartClassifier = this.smartClassifier;

                // 如果有全局状态，也设置到全局状态中
                if (window.pluginState && window.pluginState.csvMatcher) {
                    window.pluginState.csvMatcher.smartClassifier = this.smartClassifier;
                    window.pluginState.csvMatcher.classifier = this.smartClassifier;
                }
            }
        } catch (error) {
            console.error('智能分类器初始化失败:', error);
        }
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
                    selected: true, // 默认选中
                    matchResults: [], // 存储所有匹配结果
                    currentMatchRank: 0, // 当前使用的匹配排名
                    availableMatchCount: 0 // 可用的匹配结果数量
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

    // 注意：_getNameWithoutExtension 方法已被移除，使用 NamingUtils.getNameWithoutExtension 替代

    // 注意：_isChineseFilename 方法已被移除，使用 NamingUtils.isChineseText 替代

    /**
     * 构建命名选项对象
     * @param {boolean} [useTranslationSettings=false] - 是否使用翻译服务的设置
     * @returns {Object} 命名选项对象
     * @private
     */
    _buildNamingOptions(useTranslationSettings = false) {
        const options = {
            useUCS: this.namingRules && this.namingRules.settings && this.namingRules.settings.useUCS,
            keepSpaces: false
        };

        // 根据参数决定使用哪个来源的命名风格设置
        if (useTranslationSettings && this.translationService && this.translationService.settings) {
            options.namingStyle = this.translationService.settings.namingStyle;
            options.customSeparator = this.translationService.settings.customSeparator;
        } else if (this.namingRules && this.namingRules.settings) {
            options.namingStyle = this.namingRules.settings.namingStyle;
            options.customSeparator = this.namingRules.settings.customSeparator;
        } else {
            options.namingStyle = 'none';
            options.customSeparator = '_';
        }

        return options;
    }

    /**
     * 处理文件名，提取序号和准备翻译
     * @param {Object} file - 文件对象
     * @returns {Promise<void>}
     * @private
     */
    async _processFileName(file) {
        // 使用NamingUtils处理文件名
        const options = this._buildNamingOptions();

        // 处理基本命名属性
        const processedFile = NamingUtils.processFileName(file, options);

        // 更新文件对象
        file.isChinese = processedFile.isChinese;
        file.nameWithoutNumber = processedFile.nameWithoutNumber;
        file.numberPart = processedFile.numberPart;
        file.numberFormat = processedFile.numberFormat;

        if (file.isChinese) {
            // 处理中文文件名
            Logger.info(`检测到中文文件名: ${file.name}`);
            file.originalChineseName = file.name;

            try {
                // 清理中文文件名
                file.translatedName = NamingUtils.normalizeChineseText(file.nameWithoutNumber, false);

                // 如果有序号，添加到翻译后的名称
                if (file.numberPart) {
                    file.translatedName = `${file.translatedName}${file.numberPart}`;
                }

                // 反向翻译为英文，用于分类匹配和标准化
                const englishName = await this.translationService.reverseTranslate(file.nameWithoutNumber);
                file.reversedEnglishName = englishName;

                // 标准化英文名
                file.standardizedName = NamingUtils.normalizeEnglishText(englishName, false);

                // 使用中心化的匹配逻辑处理中文文件名
                if (this.useCSV && this.csvMatcher && this.csvMatcher.loaded && this.smartClassifier) {
                    try {
                        // 准备双语匹配选项
                        const options = {
                            matchStrategy: 'bilingual', // 强制使用双语匹配
                            translatedText: englishName,
                            isChinese: true
                        };

                        // 使用智能分类器的中心化匹配逻辑
                        const smartResult = await this.smartClassifier.classifyFile(file.nameWithoutNumber, null, options);

                        if (smartResult) {
                            // 应用匹配结果到文件
                            this._applyMatchResult(file, smartResult);
                        } else if (this.csvMatcher.matchSettings.useAIClassification) {
                            // 如果匹配失败，尝试使用AI辅助分类
                            await this._classifyWithAI(file, englishName, true);
                        }
                    } catch (error) {
                        console.error('中文文件匹配失败:', error);
                    }
                }
            } catch (error) {
                Logger.error(`中文文件名处理失败: ${file.name}`, error);
                file.standardizedName = file.name;
                file.translatedName = file.name;
            }
        }
    }

    /**
     * 处理非中文文件名的翻译和标准化
     * @param {Object} file - 文件对象
     * @returns {Promise<void>}
     * @private
     */
    async _processNonChineseFileName(file) {
        // 处理标准化名称
        if (this.translationService.settings.standardizeEnglish) {
            try {
                // 生成标准化的英文描述
                let standardizedName = await this.translationService.standardize(file.nameWithoutNumber);

                // 应用命名风格和规范化
                const options = this._buildNamingOptions(true);

                standardizedName = NamingUtils.applyNamingStyle(
                    standardizedName,
                    options.namingStyle,
                    options.customSeparator
                );

                if (options.useUCS) {
                    standardizedName = NamingUtils.normalizeEnglishText(standardizedName, false);
                }

                file.standardizedName = standardizedName;
            } catch (error) {
                Logger.error(`文件 "${file.name}" 标准化失败`, error);
                // 如果标准化失败，使用原始文件名
                file.standardizedName = file.nameWithoutNumber;
            }
        } else {
            // 如果没有启用标准化，使用原始文件名
            file.standardizedName = file.nameWithoutNumber;
        }

        // 直接使用翻译服务处理FXname_zh
        try {
            // 清理文件名用于翻译
            let cleanName = NamingUtils.normalizeEnglishText(file.nameWithoutNumber, true);

            // 翻译清理后的文件名
            file.translatedName = await this.translationService.translate(cleanName);

            // 处理翻译结果
            if (file.translatedName) {
                // 规范化中文文本
                const options = this._buildNamingOptions();

                file.translatedName = NamingUtils.normalizeChineseText(file.translatedName, options.keepSpaces);

                // 如果原文件名中包含数字，添加到翻译后的名称
                if (file.numberPart) {
                    file.translatedName = `${file.translatedName}${file.numberPart}`;
                }
            }
        } catch (error) {
            Logger.error(`文件 "${file.name}" 翻译失败`, error);
            // 如果翻译失败，使用原始文件名
            file.translatedName = file.nameWithoutNumber;
        }
    }

    /**
     * 应用匹配结果到文件
     * @param {Object} file - 文件对象
     * @param {Object} matchResult - 匹配结果
     * @private
     */
    _applyMatchResult(file, matchResult) {
        if (!file || !matchResult) return;

        // 应用分类信息
        file.category = matchResult.catShort || '';
        file.categoryName = matchResult.category || '';
        file.categoryNameZh = matchResult.category_zh || '';
        file.subCategory = matchResult.subCategory || '';
        file.subCategoryTranslated = matchResult.subCategory_zh || '';
        file.catID = matchResult.catID || '';

        // 保存匹配结果
        if (matchResult.matchResults) {
            file.matchResults = matchResult.matchResults;
            file.availableMatchCount = matchResult.availableMatchCount || matchResult.matchResults.length;
            file.currentMatchRank = 0; // 默认使用最佳匹配
        }

        // 更新匹配状态
        file.matchSuccessful = true;

        // 确保文件状态更新，以便UI能够正确显示
        if (file.status === 'processing' || file.status === 'pending') {
            file.status = 'matching_complete';
        }
    }

    /**
     * 使用AI进行文件分类
     * @param {Object} file - 文件对象
     * @param {string} filename - 用于分类的文件名
     * @param {boolean} isChinese - 是否为中文文件名
     * @returns {Promise<Object>} 分类结果
     * @private
     */
    async _classifyWithAI(file, filename, isChinese = false) {
        // 如果文件已经成功匹配或AI分类不可用，跳过AI匹配
        if (file.matchSuccessful ||
            !this.useCSV ||
            !this.csvMatcher ||
            !this.csvMatcher.loaded ||
            !this.csvMatcher.matchSettings.useAIClassification ||
            !this.csvMatcher.aiClassifier) {
            return null;
        }

        try {
            // 使用AI辅助分类器获取分类信息
            let aiClassification = await this.csvMatcher.aiClassifier.getClassification(filename, this.translationService, !isChinese);
            if (!aiClassification) return null;

            // 使用智能分类器处理AI分类结果
            if (this.smartClassifier && this.smartClassifier.initialized) {
                // 先尝试处理AI分类结果
                const smartResult = this.smartClassifier.processAIClassification(aiClassification, filename);

                if (smartResult) {
                    aiClassification = smartResult;
                } else {
                    // 如果处理失败，尝试直接分类
                    const directClassification = await this.smartClassifier.classifyFile(filename, null, {
                        matchStrategy: 'auto',
                        isChinese: isChinese
                    });

                    if (directClassification) {
                        aiClassification = directClassification;
                    }
                }
            } else if (aiClassification.catID) {
                // 如果智能分类器不可用，验证CatID是否有效
                if (!this.csvMatcher.isValidCatID(aiClassification.catID)) {
                    return null;
                }
            }

            // 如果没有有效的分类结果，返回null
            if (!aiClassification || !aiClassification.category) {
                return null;
            }

            // 应用分类结果到文件
            const fileCategory = {
                catID: aiClassification.catID,
                catShort: aiClassification.catShort,
                category: aiClassification.category,
                categoryNameZh: aiClassification.category_zh,
                source: aiClassification.subCategory,
                target: aiClassification.subCategory_zh
            };

            file.category = fileCategory.catShort || '';
            file.categoryName = fileCategory.category || '';
            file.categoryNameZh = fileCategory.categoryNameZh || '';
            file.subCategory = fileCategory.source || '';
            file.subCategoryTranslated = fileCategory.target || '';
            file.catID = fileCategory.catID || '';
            file.matchSuccessful = true;

            return fileCategory;
        } catch (aiError) {
            Logger.error(`文件 "${filename}" AI辅助分类匹配失败: ${aiError.message}`);
            return null;
        }
    }

    /**
     * 处理文件翻译
     * @param {Array} files - 要处理的文件
     * @param {Function} onFileProcessed - 文件处理完成后的回调函数
     * @returns {Promise<Array>} 处理后的文件
     */
    async processTranslation(files, onFileProcessed = null) {
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
                    // 处理文件名，提取序号和准备翻译
                    await this._processFileName(file);

                    // 添加匹配状态跟踪
                    file.matchAttempted = false;
                    file.matchSuccessful = false;

                    // 使用通用的AI辅助分类匹配逻辑处理所有音效文件
                    let fileCategory = null;

                    // 如果文件已经有分类信息，跳过匹配
                    if (file.catID) {
                        file.matchAttempted = true;
                        file.matchSuccessful = true;
                        Logger.debug(`文件 "${file.name}" 已经有分类信息，跳过匹配`);
                    } else {
                        // 尝试使用AI辅助分类匹配
                        fileCategory = await this._classifyWithAI(file, file.name, false);
                        file.matchAttempted = true;
                        file.matchSuccessful = !!fileCategory;
                    }

                    // 如果AI分类失败或未启用，尝试使用智能分类器和双语匹配
                    if (!file.matchSuccessful && this.useCSV && this.csvMatcher && this.csvMatcher.loaded) {
                        // 获取匹配策略
                        let matchStrategy = 'auto';
                        if (window.pluginState && window.pluginState.translationPanel) {
                            matchStrategy = window.pluginState.translationPanel.settings.matchStrategy || 'auto';
                        }

                        // 阿里云NLP服务仅用于分词和词性分析，不用于分类
                        // 注意：matchStrategy中的'aliyun'选项已被移除，这里不再需要检查

                        // 使用中心化的匹配逻辑处理非中文文件名
                        if (!file.matchSuccessful && this.smartClassifier) {
                            try {
                                console.log(`文件 "${file.name}" 开始使用中心化匹配逻辑`);

                                // 准备匹配选项
                                const options = {
                                    matchStrategy: matchStrategy,
                                    translatedText: file.translatedName,
                                    isChinese: false
                                };

                                // 使用智能分类器的中心化匹配逻辑
                                const smartResult = await this.smartClassifier.classifyFile(file.nameWithoutNumber, null, options);
                                if (smartResult) {
                                    fileCategory = smartResult;

                                    // 应用匹配结果到文件
                                    this._applyMatchResult(file, smartResult);

                                    console.log(`文件 "${file.name}" 使用中心化匹配逻辑成功: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);

                                    // 如果提供了回调函数，立即通知UI更新
                                    if (typeof onFileProcessed === 'function') {
                                        setTimeout(() => {
                                            onFileProcessed(fileObjects, i);
                                        }, 0);
                                    }
                                } else {
                                    console.log(`文件 "${file.name}" 中心化匹配逻辑未找到匹配结果`);
                                }
                            } catch (error) {
                                console.error('中心化匹配逻辑失败:', error);
                            }
                        }

                        // 如果上述方法都失败，尝试使用传统的CSV匹配
                        // 注意：这里不再直接调用identifyCategory，因为它已经在smartClassifier.classifyFile中被调用了
                        if (!file.matchSuccessful) {
                            console.log(`文件 "${file.name}" 所有匹配方法都失败，使用默认分类`);
                        }
                    }

                    // 处理非中文文件名的翻译和标准化
                    if (!file.isChinese) {
                        await this._processNonChineseFileName(file);
                    }

                    // 应用命名规则
                    file.formattedName = this.namingRules.formatFilename(file);
                    Logger.debug(`文件名格式化: 原始="${file.name}", 翻译="${file.translatedName}", 分类="${file.category}", 最终="${file.formattedName}"`);

                    // 更新状态
                    file.status = 'success';

                    // 确保文件有匹配结果数组，即使没有找到匹配
                    if (!file.matchResults || !Array.isArray(file.matchResults) || file.matchResults.length === 0) {
                        // 创建一个默认的匹配结果
                        const defaultTerm = {
                            catID: file.catID || 'UNKNOWN',
                            catShort: file.category || 'UNK',
                            category: file.categoryName || 'Unknown',
                            categoryNameZh: file.categoryNameZh || '未知',
                            source: file.subCategory || file.nameWithoutNumber || '',
                            target: file.subCategoryTranslated || file.translatedName || ''
                        };

                        file.matchResults = [{
                            term: defaultTerm,
                            score: 100,
                            matchSource: 'default',
                            priority: 10
                        }];
                        file.availableMatchCount = 1;
                        file.currentMatchRank = 0;

                        // 如果没有设置catID，使用默认值
                        if (!file.catID) {
                            file.catID = defaultTerm.catID;
                            file.category = defaultTerm.catShort;
                            file.categoryName = defaultTerm.category;
                            file.categoryNameZh = defaultTerm.categoryNameZh;
                            file.subCategory = defaultTerm.source;
                            file.subCategoryTranslated = defaultTerm.target;
                        }
                    }

                    Logger.debug(`文件 "${file.name}" 翻译完成: "${file.translatedName}"`);
                } catch (error) {
                    file.status = 'error';
                    file.errorMessage = error.message;
                    Logger.error(`文件 "${file.name}" 翻译失败`, error);
                }

                // 如果提供了回调函数，则调用它通知文件处理完成
                if (typeof onFileProcessed === 'function') {
                    onFileProcessed(fileObjects, i);
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

    /**
     * 格式化文件名
     * @param {Object} file - 文件对象
     * @returns {string} 格式化后的文件名
     */
    formatFileName(file) {
        if (!file) return '';

        // 应用命名规则并返回结果
        return this.namingRules.formatFilename(file);
    }
}

// 导出FileProcessor
window.FileProcessor = FileProcessor;
