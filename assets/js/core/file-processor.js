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
            if (window.SmartClassifier && this.csvMatcher) {
                this.smartClassifier = new window.SmartClassifier(this.csvMatcher);
                console.log('智能分类器初始化成功');
            } else {
                console.warn('智能分类器初始化失败: SmartClassifier类不可用');
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
     * 检测文件名是否为中文
     * @param {string} filename - 文件名
     * @returns {boolean} 是否为中文文件名
     * @private
     */
    _isChineseFilename(filename) {
        if (!filename) return false;

        // 中文字符范围
        const chineseRegex = /[\u4e00-\u9fa5]/g;
        const chineseChars = filename.match(chineseRegex) || [];

        // 如果中文字符占比超过40%，认为是中文文件名
        return chineseChars.length / filename.length > 0.4;
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
        if (!this.useCSV || !this.csvMatcher || !this.csvMatcher.loaded ||
            !this.csvMatcher.matchSettings.useAIClassification || !this.csvMatcher.aiClassifier) {
            return null;
        }

        try {
            console.log(`尝试使用AI辅助分类匹配${isChinese ? '中文' : ''}文件名:`, filename,
                        '分类器状态:', this.csvMatcher.aiClassifier.enabled,
                        '翻译服务:', this.translationService ? '可用' : '不可用');

            // 使用AI辅助分类器获取分类信息
            let aiClassification = await this.csvMatcher.aiClassifier.getClassification(filename, this.translationService, !isChinese);

            if (aiClassification) {
                console.log(`文件 "${filename}" 使用AI辅助分类匹配结果:`, aiClassification);
                Logger.debug(`文件 "${filename}" 使用AI辅助分类匹配结果:`, aiClassification);

                // 使用智能分类器处理AI分类结果
                let processedClassification = aiClassification;

                if (this.smartClassifier && this.smartClassifier.initialized) {
                    // 使用智能分类器处理AI分类结果
                    const smartResult = this.smartClassifier.processAIClassification(aiClassification, filename);

                    if (smartResult) {
                        console.log(`智能分类器处理结果:`, smartResult);
                        processedClassification = smartResult;
                    } else {
                        console.warn(`智能分类器处理失败，将尝试使用智能分类器直接分类文件名`);

                        // 尝试使用智能分类器直接分类文件名
                        const directClassification = this.smartClassifier.classifyFile(filename);
                        if (directClassification) {
                            console.log(`智能分类器直接分类结果:`, directClassification);
                            processedClassification = directClassification;
                        } else {
                            console.warn(`智能分类器直接分类失败，使用原始AI分类结果`);
                        }
                    }
                } else {
                    // 如果智能分类器不可用，使用传统方式验证
                    if (processedClassification.catID) {
                        // 检查CatID是否在CSV表格中存在
                        const validCatID = this.csvMatcher.isValidCatID(processedClassification.catID);

                        if (!validCatID) {
                            console.warn(`文件 "${filename}" 的AI分类结果中的CatID "${processedClassification.catID}" 不在CSV表格中，将尝试使用CSV匹配器`);

                            // 尝试使用identifyCategory方法进行匹配
                            const catID = await this.csvMatcher.identifyCategory(filename, this.translationService);
                            if (catID) {
                                const term = this.csvMatcher.findTermByCatID(catID);
                                if (term) {
                                    processedClassification = {
                                        catID: term.catID,
                                        catShort: term.catShort,
                                        category: term.category,
                                        category_zh: term.categoryNameZh,
                                        subCategory: term.source,
                                        subCategory_zh: term.target
                                    };
                                    console.log(`使用identifyCategory方法匹配成功: ${filename} -> ${processedClassification.catID}`);
                                }
                            }
                        }
                    }
                }

                // 使用处理后的分类结果替换原始AI分类结果
                aiClassification = processedClassification;

                // 使用AI返回的分类信息创建一个类似于术语的对象
                const fileCategory = {
                    catID: aiClassification.catID,
                    catShort: aiClassification.catShort,
                    category: aiClassification.category,
                    categoryNameZh: aiClassification.category_zh,
                    source: aiClassification.subCategory,
                    target: aiClassification.subCategory_zh
                };

                // 如果有分类信息，应用到文件
                if (fileCategory.category) {
                    file.category = fileCategory.catShort || '';
                    file.categoryName = fileCategory.category || '';
                    file.categoryNameZh = fileCategory.categoryNameZh || '';
                    file.subCategory = fileCategory.source || '';
                    file.subCategoryTranslated = fileCategory.target || '';
                    file.catID = fileCategory.catID || '';

                    console.log(`文件 "${filename}" 应用AI分类结果: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                    return fileCategory;
                }
            }
            return null;
        } catch (aiError) {
            console.error(`AI辅助分类匹配失败:`, aiError);
            Logger.error(`AI辅助分类匹配失败:`, aiError);
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
                    // 检测是否为中文文件名 - 将中文检测移到处理流程的开始
                    const isChinese = this._isChineseFilename(file.name);
                    file.isChinese = isChinese;

                    if (isChinese) {
                        Logger.info(`检测到中文文件名: ${file.name}`);

                        // 保存原始中文名
                        file.originalChineseName = file.name;
                        file.nameWithoutNumber = file.name; // 先设置为原始名，后面会提取序号

                        try {
                            // 从文件名中提取序号
                            const nameParts = NumberExtractor.extractNumber(file.name);
                            file.nameWithoutNumber = nameParts.text;
                            file.numberPart = nameParts.number;
                            file.numberFormat = {
                                prefix: nameParts.prefix || false,
                                suffix: nameParts.suffix || ''
                            };

                            Logger.debug(`中文文件名分解: "${file.name}" -> 文本: "${file.nameWithoutNumber}", 序号: ${file.numberPart || '无'}`);

                            // 先处理原始中文名，移除可能的序号和特殊符号
                            let cleanName = file.nameWithoutNumber;

                            // 移除多余的空格和特殊符号
                            cleanName = cleanName.replace(/\s+/g, '').trim();

                            Logger.debug(`清理后的中文文件名: "${cleanName}" (原始: "${file.nameWithoutNumber}")`);

                            // 使用清理后的中文名作为翻译结果
                            file.translatedName = cleanName;

                            // 如果有序号，添加到翻译后的名称
                            if (file.numberPart) {
                                file.translatedName = `${file.translatedName}${file.numberPart}`;
                                Logger.debug(`将数字 ${file.numberPart} 添加到中文名称: "${file.translatedName}"`);
                            }

                            // 反向翻译为英文，用于分类匹配和标准化
                            const englishName = await this.translationService.reverseTranslate(file.nameWithoutNumber);
                            file.reversedEnglishName = englishName;
                            file.standardizedName = englishName; // 对于中文文件名，使用反向翻译的英文名作为标准化名称
                            Logger.debug(`中文文件名反向翻译结果: ${englishName}`);

                            // 直接进入双语匹配流程
                            if (this.useCSV && this.csvMatcher && this.csvMatcher.loaded && this.smartClassifier) {
                                try {
                                    // 分析原始文件名和翻译后的文件名的词性
                                    const originalPosAnalysis = this.smartClassifier.analyzePos(file.nameWithoutNumber);
                                    const englishPosAnalysis = this.smartClassifier.analyzePos(englishName);

                                    // 准备双语匹配选项
                                    const bilingualOptions = {
                                        translatedText: englishName,
                                        translatedPosAnalysis: englishPosAnalysis
                                    };

                                    console.log('中文文件名直接进入双语匹配流程:', {
                                        originalText: file.nameWithoutNumber,
                                        translatedText: englishName,
                                        originalPosAnalysis,
                                        translatedPosAnalysis: englishPosAnalysis
                                    });

                                    // 获取所有匹配结果
                                    const allMatches = this.csvMatcher.getAllMatches(
                                        file.nameWithoutNumber,
                                        originalPosAnalysis,
                                        bilingualOptions
                                    );

                                    // 保存匹配结果
                                    file.matchResults = allMatches;
                                    file.availableMatchCount = allMatches.length;
                                    file.currentMatchRank = 0; // 默认使用最佳匹配

                                    // 使用双语匹配
                                    const catID = await this.csvMatcher.identifyCategory(
                                        file.nameWithoutNumber,
                                        this.translationService,
                                        originalPosAnalysis,
                                        bilingualOptions
                                    );

                                    if (catID) {
                                        // 查找对应的术语
                                        const term = this.csvMatcher.findTermByCatID(catID);
                                        if (term) {
                                            // 应用匹配结果到文件
                                            file.category = term.catShort || '';
                                            file.categoryName = term.category || '';
                                            file.categoryNameZh = term.categoryNameZh || '';
                                            file.subCategory = term.source || '';
                                            file.subCategoryTranslated = term.target || '';
                                            file.catID = term.catID || '';

                                            console.log(`中文文件 "${file.nameWithoutNumber}" 使用双语匹配成功: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                                        }
                                    }
                                } catch (error) {
                                    console.error('双语匹配失败:', error);

                                    // 如果双语匹配失败，尝试使用AI辅助分类
                                    if (!file.catID && this.csvMatcher.matchSettings.useAIClassification) {
                                        await this._classifyWithAI(file, englishName, true);
                                    }
                                }
                            }
                        } catch (error) {
                            Logger.error(`中文文件名处理失败: ${file.name}`, error);
                            file.standardizedName = file.name;
                            file.translatedName = file.name;
                        }
                    } else {
                        // 非中文文件名的处理
                        // 识别分类
                        if (this.csvMatcher && this.csvMatcher.loaded) {
                            // 先尝试使用identifyCategory方法进行匹配
                            const catID = await this.csvMatcher.identifyCategory(file.name, this.translationService);
                            if (catID) {
                                const term = this.csvMatcher.findTermByCatID(catID);
                                if (term) {
                                    file.category = term.catShort || '';
                                    file.categoryName = term.category || '';
                                    file.categoryNameZh = term.categoryNameZh || '';
                                    file.subCategory = term.source || '';
                                    file.subCategoryTranslated = term.target || '';
                                    file.catID = term.catID || '';
                                    Logger.debug(`文件 "${file.name}" 使用identifyCategory匹配成功: 分类=${file.category}, 分类名=${file.categoryName}, 子分类=${file.subCategory}, 子分类翻译=${file.subCategoryTranslated}`);
                                }
                            } else {
                                // 如果没有匹配到术语，尝试使用AI辅助分类匹配
                                await this._classifyWithAI(file, file.name, false);

                                // 如果AI分类失败或未启用，使用传统方式识别分类
                                if (!file.catID) {
                                    const catID = await this.csvMatcher.identifyCategory(file.name, this.translationService);
                                    if (catID) {
                                        const term = this.csvMatcher.findTermByCatID(catID);
                                        if (term) {
                                            file.category = term.catShort || '';
                                            file.categoryName = term.category || '';
                                            file.categoryNameZh = term.categoryNameZh || '';
                                            file.subCategory = term.source || '';
                                            file.subCategoryTranslated = term.target || '';
                                            file.catID = term.catID || '';
                                        }
                                    }

                                    // 如果没有识别到分类，尝试使用文件名的第一部分
                                    if (!file.catID && file.name.indexOf(' ') !== -1) {
                                        const firstPart = file.name.split(' ')[0];
                                        const firstPartCatID = await this.csvMatcher.identifyCategory(firstPart, this.translationService);
                                        if (firstPartCatID) {
                                            const term = this.csvMatcher.findTermByCatID(firstPartCatID);
                                            if (term) {
                                                file.category = term.catShort || '';
                                                file.categoryName = term.category || '';
                                                file.categoryNameZh = term.categoryNameZh || '';
                                                file.subCategory = term.source || '';
                                                file.subCategoryTranslated = term.target || '';
                                                file.catID = term.catID || '';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 从文件名中提取序号（如果还没有提取）
                    if (!file.isChinese) { // 中文文件名已经在前面提取了序号
                        const nameParts = NumberExtractor.extractNumber(file.name);
                        file.nameWithoutNumber = nameParts.text;
                        file.numberPart = nameParts.number;
                        file.numberFormat = {
                            prefix: nameParts.prefix || false,
                            suffix: nameParts.suffix || ''
                        };

                        Logger.debug(`文件名分解: "${file.name}" -> 文本: "${file.nameWithoutNumber}", 序号: ${file.numberPart || '无'}`);
                    }


                    // 使用通用的AI辅助分类匹配逻辑处理所有音效文件
                    let fileCategory = null;

                    // 尝试使用AI辅助分类匹配
                    fileCategory = await this._classifyWithAI(file, file.name, false);

                    // 如果AI分类失败或未启用，尝试使用智能分类器和双语匹配
                    if (!fileCategory && this.useCSV && this.csvMatcher && this.csvMatcher.loaded) {
                        // 获取匹配策略
                        let matchStrategy = 'auto';
                        if (window.pluginState && window.pluginState.translationPanel) {
                            matchStrategy = window.pluginState.translationPanel.settings.matchStrategy || 'auto';
                        }

                        // 如果有翻译结果，使用双语匹配
                        if (file.translatedName && (matchStrategy === 'auto' || matchStrategy === 'bilingual')) {
                            try {
                                // 分析原始文件名和翻译后的文件名的词性
                                const originalPosAnalysis = this.smartClassifier ?
                                    this.smartClassifier.analyzePos(file.nameWithoutNumber) : [];
                                const translatedPosAnalysis = this.smartClassifier ?
                                    this.smartClassifier.analyzePos(file.translatedName) : [];

                                // 准备双语匹配选项
                                const bilingualOptions = {
                                    translatedText: file.translatedName,
                                    translatedPosAnalysis: translatedPosAnalysis
                                };



                                // 获取所有匹配结果
                                const allMatches = this.csvMatcher.getAllMatches(
                                    file.nameWithoutNumber,
                                    originalPosAnalysis,
                                    bilingualOptions
                                );

                                // 保存匹配结果
                                file.matchResults = allMatches;
                                file.availableMatchCount = allMatches.length;
                                file.currentMatchRank = 0; // 默认使用最佳匹配

                                // 使用双语匹配
                                const catID = await this.csvMatcher.identifyCategory(
                                    file.nameWithoutNumber,
                                    this.translationService,
                                    originalPosAnalysis,
                                    bilingualOptions
                                );

                                if (catID) {
                                    // 查找对应的术语
                                    const term = this.csvMatcher.findTermByCatID(catID);
                                    if (term) {
                                        fileCategory = term;

                                        // 应用匹配结果到文件
                                        file.category = fileCategory.catShort || '';
                                        file.categoryName = fileCategory.category || '';
                                        file.categoryNameZh = fileCategory.categoryNameZh || '';
                                        file.subCategory = fileCategory.source || '';
                                        file.subCategoryTranslated = fileCategory.target || '';
                                        file.catID = fileCategory.catID || '';

                                        console.log(`文件 "${file.name}" 使用双语匹配成功: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                                    }
                                }
                            } catch (error) {
                                console.error('双语匹配失败:', error);
                            }
                        }

                        // 如果双语匹配失败或未启用，尝试使用智能分类器
                        if (!fileCategory && this.smartClassifier && (matchStrategy === 'auto' || matchStrategy === 'pos')) {
                            try {
                                // 使用智能分类器分类文件
                                const options = {
                                    matchStrategy: matchStrategy,
                                    translatedText: file.translatedName
                                };

                                const smartResult = await this.smartClassifier.classifyFile(file.nameWithoutNumber, null, options);
                                if (smartResult) {
                                    fileCategory = smartResult;

                                    // 应用匹配结果到文件
                                    file.category = fileCategory.catShort || '';
                                    file.categoryName = fileCategory.category || '';
                                    file.categoryNameZh = fileCategory.category_zh || '';
                                    file.subCategory = fileCategory.subCategory || '';
                                    file.subCategoryTranslated = fileCategory.subCategory_zh || '';
                                    file.catID = fileCategory.catID || '';

                                    console.log(`文件 "${file.name}" 使用智能分类器分类成功: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                                }
                            } catch (error) {
                                console.error('智能分类器分类失败:', error);
                            }
                        }

                        // 如果上述方法都失败，尝试使用传统的CSV匹配
                        if (!fileCategory) {
                            // 使用identifyCategory方法进行匹配
                            const catID = await this.csvMatcher.identifyCategory(file.nameWithoutNumber, this.translationService);
                            if (catID) {
                                const term = this.csvMatcher.findTermByCatID(catID);
                                if (term) {
                                    fileCategory = term;

                                    // 应用匹配结果到文件
                                    file.category = fileCategory.catShort || '';
                                    file.categoryName = fileCategory.category || '';
                                    file.categoryNameZh = fileCategory.categoryNameZh || '';
                                    file.subCategory = fileCategory.source || '';
                                    file.subCategoryTranslated = fileCategory.target || '';
                                    file.catID = fileCategory.catID || '';

                                    console.log(`文件 "${file.name}" 使用identifyCategory匹配成功: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                                }
                            }
                        }
                    }

                    // 下面的中文文件名处理代码已经移动到处理流程的开始
                    // 这里不再需要重复检测和处理中文文件名
                    if (!file.isChinese) {
                        // 处理标准化名称
                        if (this.translationService.settings.standardizeEnglish) {
                            try {
                                // 生成标准化的英文描述
                                let standardizedName = await this.translationService.standardize(file.nameWithoutNumber);

                                // 确保应用命名风格
                                standardizedName = this.translationService.formatText(standardizedName);

                                file.standardizedName = standardizedName;
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

                        // 直接使用翻译服务处理FXname_zh，不使用CSV匹配
                        try {
                            // 先处理文件名，移除可能的序号和特殊符号
                            let cleanName = file.nameWithoutNumber;

                            // 移除文件名中的数字序号模式（如"Tab 16"中的"16"）
                            cleanName = cleanName.replace(/\b\d+\b/g, '').trim();

                            // 移除多余的空格和特殊符号
                            cleanName = cleanName.replace(/\s+/g, ' ').trim();

                            Logger.debug(`清理后的文件名用于翻译: "${cleanName}" (原始: "${file.nameWithoutNumber}")`);

                            // 翻译清理后的文件名
                            file.translatedName = await this.translationService.translate(cleanName);

                            // 去除翻译结果中的多余空格
                            if (file.translatedName) {
                                // 将多个连续空格替换为单个空格，然后去除首尾空格
                                file.translatedName = file.translatedName.replace(/\s+/g, ' ').trim();

                                // 如果原文件名中包含数字，尝试提取并添加到翻译后的名称
                                const numberMatch = file.nameWithoutNumber.match(/\b(\d+)\b/);
                                if (numberMatch) {
                                    // 将数字添加到翻译后的名称中
                                    file.translatedName = `${file.translatedName}${numberMatch[1]}`;
                                    Logger.debug(`将数字 ${numberMatch[1]} 添加到翻译后的名称: "${file.translatedName}"`);
                                }
                            }

                            Logger.debug(`文件 "${file.name}" 翻译结果(FXname_zh): "${file.translatedName}"`);
                        } catch (translateError) {
                            Logger.error(`文件 "${file.name}" 翻译失败`, translateError);
                            // 如果翻译失败，使用原始文件名
                            file.translatedName = file.nameWithoutNumber;
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

        // 应用命名规则
        file.formattedName = this.namingRules.formatFilename(file);
        Logger.debug(`文件名格式化: 原始="${file.name}", 翻译="${file.translatedName}", 分类="${file.category}", 最终="${file.formattedName}"`);

        return file.formattedName;
    }
}

// 导出FileProcessor
window.FileProcessor = FileProcessor;