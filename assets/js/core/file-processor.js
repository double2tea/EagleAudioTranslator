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

            // 首先检查csvMatcher中是否有SmartClassifier实例
            if (this.csvMatcher && this.csvMatcher.smartClassifier) {
                console.log('使用csvMatcher中的SmartClassifier实例');
                existingClassifier = this.csvMatcher.smartClassifier;
            }
            // 如果没有，检查全局状态中是否有SmartClassifier实例
            else if (window.pluginState && window.pluginState.csvMatcher && window.pluginState.csvMatcher.smartClassifier) {
                console.log('使用全局状态中的SmartClassifier实例');
                existingClassifier = window.pluginState.csvMatcher.smartClassifier;
            }

            // 如果找到了现有实例，使用它
            if (existingClassifier) {
                this.smartClassifier = existingClassifier;

                // 确保csvMatcher中的classifier也是同一个实例
                if (this.csvMatcher && this.csvMatcher.classifier !== this.smartClassifier) {
                    this.csvMatcher.classifier = this.smartClassifier;
                    console.log('已将智能分类器设置到CSV匹配器中，用于过滤词汇');
                }

                console.log('智能分类器初始化成功（使用现有实例）');
            }
            // 如果没有找到现有实例，创建一个新的实例
            else if (window.SmartClassifier && this.csvMatcher) {
                console.log('创建新的SmartClassifier实例');
                this.smartClassifier = new window.SmartClassifier(this.csvMatcher);

                // 设置智能分类器实例，用于过滤词汇
                this.csvMatcher.classifier = this.smartClassifier;

                // 如果csvMatcher没有smartClassifier属性，设置它
                if (!this.csvMatcher.smartClassifier) {
                    this.csvMatcher.smartClassifier = this.smartClassifier;
                }

                // 如果有全局状态，也设置到全局状态中
                if (window.pluginState && window.pluginState.csvMatcher) {
                    window.pluginState.csvMatcher.smartClassifier = this.smartClassifier;
                    window.pluginState.csvMatcher.classifier = this.smartClassifier;
                }

                console.log('智能分类器初始化成功（新实例）');
                console.log('已将智能分类器设置到CSV匹配器中，用于过滤词汇');
            } else {
                console.warn('智能分类器初始化失败: SmartClassifier类不可用');
            }

            // 输出smartClassifier的状态，用于调试
            if (this.smartClassifier) {
                console.log('文件处理器中的SmartClassifier实例状态:', {
                    initialized: this.smartClassifier.initialized,
                    hasAliyunNLPAdapter: !!this.smartClassifier.aliyunNLPAdapter,
                    aliyunNLPAdapterInitialized: this.smartClassifier.aliyunNLPAdapter ? this.smartClassifier.aliyunNLPAdapter.initialized : false
                });
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
        // 如果文件已经成功匹配，跳过AI匹配
        if (file.matchSuccessful) {
            Logger.debug(`跳过AI匹配: 文件 "${filename}" 已经成功匹配`);
            return null;
        }

        if (!this.useCSV || !this.csvMatcher || !this.csvMatcher.loaded ||
            !this.csvMatcher.matchSettings.useAIClassification || !this.csvMatcher.aiClassifier) {
            return null;
        }

        try {
            Logger.debug(`尝试使用AI辅助分类匹配${isChinese ? '中文' : ''}文件名: "${filename}"`);

            // 使用AI辅助分类器获取分类信息
            let aiClassification = await this.csvMatcher.aiClassifier.getClassification(filename, this.translationService, !isChinese);

            if (aiClassification) {
                Logger.debug(`文件 "${filename}" 使用AI辅助分类匹配结果: CatID=${aiClassification.catID || '无'}, 分类=${aiClassification.category || '无'}`);

                // 使用智能分类器处理AI分类结果
                let processedClassification = aiClassification;

                if (this.smartClassifier && this.smartClassifier.initialized) {
                    // 使用智能分类器处理AI分类结果
                    const smartResult = this.smartClassifier.processAIClassification(aiClassification, filename);

                    if (smartResult) {
                        Logger.debug(`文件 "${filename}" 智能分类器处理结果: CatID=${smartResult.catID || '无'}, 分类=${smartResult.category || '无'}`);
                        processedClassification = smartResult;
                    } else {
                        Logger.debug(`文件 "${filename}" 智能分类器处理失败，将尝试使用智能分类器直接分类文件名`);

                        // 尝试使用智能分类器的中心化匹配逻辑
                        const options = {
                            matchStrategy: 'auto',
                            isChinese: isChinese
                        };

                        const directClassification = await this.smartClassifier.classifyFile(filename, null, options);
                        if (directClassification) {
                            Logger.debug(`文件 "${filename}" 智能分类器中心化匹配结果: CatID=${directClassification.catID || '无'}, 分类=${directClassification.category || '无'}`);
                            processedClassification = directClassification;
                        } else {
                            Logger.debug(`文件 "${filename}" 智能分类器中心化匹配失败，使用原始AI分类结果`);
                        }
                    }
                } else {
                    // 如果智能分类器不可用，使用传统方式验证
                    if (processedClassification.catID) {
                        // 检查CatID是否在CSV表格中存在
                        const validCatID = this.csvMatcher.isValidCatID(processedClassification.catID);

                        if (!validCatID) {
                            Logger.debug(`文件 "${filename}" 的AI分类结果中的CatID "${processedClassification.catID}" 不在CSV表格中，将尝试使用CSV匹配器`);

                            // 移除重复的匹配调用，这部分逻辑已经在smartClassifier.classifyFile中处理
                            Logger.debug(`文件 "${filename}" 的AI分类结果中的CatID "${processedClassification.catID}" 不在CSV表格中，将跳过匹配`);
                            processedClassification = null;
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

                    // 更新匹配状态
                    file.matchSuccessful = true;

                    Logger.info(`文件 "${filename}" 应用AI分类结果: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                    return fileCategory;
                }
            }
            return null;
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

                            // 使用中心化的匹配逻辑处理中文文件名
                            if (this.useCSV && this.csvMatcher && this.csvMatcher.loaded && this.smartClassifier) {
                                try {
                                    console.log(`中文文件 "${file.nameWithoutNumber}" 使用中心化匹配逻辑`);

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
                                        file.category = smartResult.catShort || '';
                                        file.categoryName = smartResult.category || '';
                                        file.categoryNameZh = smartResult.category_zh || '';
                                        file.subCategory = smartResult.subCategory || '';
                                        file.subCategoryTranslated = smartResult.subCategory_zh || '';
                                        file.catID = smartResult.catID || '';

                                        // 保存匹配结果
                                        if (smartResult.matchResults) {
                                            file.matchResults = smartResult.matchResults;
                                            file.availableMatchCount = smartResult.availableMatchCount || smartResult.matchResults.length;
                                            file.currentMatchRank = 0; // 默认使用最佳匹配
                                        }

                                        console.log(`中文文件 "${file.nameWithoutNumber}" 使用中心化匹配逻辑成功: 分类=${file.categoryName}(${file.category}), 子分类=${file.subCategory}, CatID=${file.catID}`);
                                    } else {
                                        console.log(`中文文件 "${file.nameWithoutNumber}" 中心化匹配逻辑未找到匹配结果`);

                                        // 如果匹配失败，尝试使用AI辅助分类
                                        if (this.csvMatcher.matchSettings.useAIClassification) {
                                            await this._classifyWithAI(file, englishName, true);
                                        }
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
                    } else {
                        // 非中文文件名的处理
                        // 识别分类 - 这部分逻辑已经移到了processTranslation方法中的智能分类器部分
                        // 这里不再需要重复的匹配逻辑
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
                                    file.category = fileCategory.catShort || '';
                                    file.categoryName = fileCategory.category || '';
                                    file.categoryNameZh = fileCategory.category_zh || '';
                                    file.subCategory = fileCategory.subCategory || '';
                                    file.subCategoryTranslated = fileCategory.subCategory_zh || '';
                                    file.catID = fileCategory.catID || '';

                                    // 保存匹配结果
                                    if (smartResult.matchResults) {
                                        file.matchResults = smartResult.matchResults;
                                        file.availableMatchCount = smartResult.availableMatchCount || smartResult.matchResults.length;
                                        file.currentMatchRank = 0; // 默认使用最佳匹配
                                    }

                                    // 更新匹配状态
                                    file.matchSuccessful = true;

                                    // 确保文件状态更新，以便UI能够正确显示
                                    if (file.status === 'processing' || file.status === 'pending') {
                                        file.status = 'matching_complete';
                                    }

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

        // 应用命名规则
        file.formattedName = this.namingRules.formatFilename(file);
        Logger.debug(`文件名格式化: 原始="${file.name}", 翻译="${file.translatedName}", 分类="${file.category}", 最终="${file.formattedName}"`);

        return file.formattedName;
    }
}

// 导出FileProcessor
window.FileProcessor = FileProcessor;