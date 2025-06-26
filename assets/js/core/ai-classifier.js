/**
 * AI辅助分类匹配功能
 * 使用AI接口获取音效文件的分类信息，提高匹配准确性
 */
class AIClassifier {
    constructor() {
        this.enabled = false;
        this.cache = new Map(); // 缓存已经查询过的结果
        this.batchSize = 10; // 批处理大小，避免频繁请求API
        this.batchQueue = []; // 批处理队列
        this.batchPromises = []; // 批处理Promise
        this.processingBatch = false; // 是否正在处理批次
    }

    /**
     * 初始化分类器
     * @param {boolean} enabled - 是否启用AI辅助分类
     */
    init(enabled) {
        this.enabled = enabled;
        console.log('AI辅助分类匹配功能已' + (enabled ? '启用' : '禁用'), '当前状态:', this.enabled);
        return this;
    }

    /**
     * 获取音效文件的分类信息
     * @param {string} filename - 音效文件名
     * @param {Object} translationProvider - 翻译服务提供者
     * @param {boolean} [isChinese=false] - 是否为中文文件名
     * @returns {Promise<Object>} 分类信息
     */
    async getClassification(filename, translationProvider, isChinese = false) {
        // 检测是否为中文文件名
        if (!isChinese) {
            const chineseRegex = /[\u4e00-\u9fa5]/;
            isChinese = chineseRegex.test(filename);
        }

        console.log('AI分类器尝试获取分类信息:', filename, '启用状态:', this.enabled, '是否中文:', isChinese ? '是' : '否');

        if (!this.enabled) {
            console.log('AI分类器未启用，跳过分类');
            return null;
        }

        // 检查缓存
        if (this.cache.has(filename)) {
            console.log('使用缓存的分类信息:', filename, this.cache.get(filename));
            return this.cache.get(filename);
        }

        console.log('添加到批处理队列:', filename);

        // 创建一个Promise，将其添加到批处理队列
        return new Promise((resolve, reject) => {
            this.batchQueue.push({
                filename,
                translationProvider,
                isChinese,
                resolve,
                reject
            });

            // 如果队列达到批处理大小或者没有正在处理的批次，开始处理
            if (this.batchQueue.length >= this.batchSize && !this.processingBatch) {
                this.processBatch();
            } else if (!this.processingBatch) {
                // 如果没有正在处理的批次，设置一个定时器，在短暂延迟后处理批次
                setTimeout(() => {
                    if (this.batchQueue.length > 0 && !this.processingBatch) {
                        this.processBatch();
                    }
                }, 500);
            }
        });
    }

    /**
     * 处理批次请求
     */
    async processBatch() {
        if (this.batchQueue.length === 0 || this.processingBatch) {
            console.log('批处理跳过: 队列为空或正在处理中', {
                queueLength: this.batchQueue.length,
                processing: this.processingBatch
            });
            return;
        }

        this.processingBatch = true;

        // 获取当前批次
        const currentBatch = this.batchQueue.splice(0, this.batchSize);
        console.log(`处理批次请求，共${currentBatch.length}个文件`, {
            files: currentBatch.map(item => item.filename)
        });

        // 检查是否有中文文件名
        const hasChineseFiles = currentBatch.some(item => item.isChinese);
        console.log('批次中是否包含中文文件名:', hasChineseFiles ? '是' : '否');

        try {
            // 构建批量请求，指定是否为中文文件名
            const batchPrompt = this.buildBatchPrompt(currentBatch.map(item => item.filename), hasChineseFiles);

            // 使用第一个请求的翻译提供者
            const translationProvider = currentBatch[0].translationProvider;

            // 发送请求
            console.log('发送AI分类请求', {
                provider: translationProvider && typeof translationProvider.getId === 'function' ? translationProvider.getId() : 'unknown',
                fileCount: currentBatch.length,
                isChinese: hasChineseFiles
            });

            const result = await this.queryAI(batchPrompt, translationProvider);
            console.log('AI分类请求返回结果', {
                resultLength: result ? result.length : 0
            });

            // 解析结果
            const classifications = this.parseAIResponse(result, currentBatch.map(item => item.filename));
            console.log('解析后的分类结果', classifications);

            // 处理每个文件的结果
            currentBatch.forEach(item => {
                const classification = classifications[item.filename] || null;
                console.log(`文件 ${item.filename} 的分类结果:`, classification);

                // 如果是中文文件名且有英文描述，记录日志
                if (item.isChinese && classification && hasChineseFiles) {
                    if (classification.classifications && classification.classifications[0] && classification.classifications[0].englishDescription) {
                        console.log(`中文文件 ${item.filename} 获取到英文描述: ${classification.classifications[0].englishDescription}`);
                    }
                }

                // 缓存结果
                if (classification) {
                    this.cache.set(item.filename, classification);
                }

                // 解析Promise
                item.resolve(classification);
            });
        } catch (error) {
            console.error('AI分类请求失败:', error);
            // 所有请求都失败
            currentBatch.forEach(item => {
                item.reject(error);
            });
        } finally {
            this.processingBatch = false;

            // 如果队列中还有请求，继续处理
            if (this.batchQueue.length > 0) {
                setTimeout(() => this.processBatch(), 1000); // 添加延迟，避免频繁请求
            }
        }
    }

    /**
     * 构建批量请求的提示词
     * @param {Array<string>} filenames - 文件名数组
     * @param {boolean} [isChinese=false] - 是否为中文文件名
     * @returns {string} 提示词
     */
    buildBatchPrompt(filenames, isChinese = false) {
        // 检测文件名是否为中文
        if (!isChinese) {
            // 检查第一个文件名是否包含中文字符
            const chineseRegex = /[\u4e00-\u9fa5]/;
            if (filenames.length > 0 && chineseRegex.test(filenames[0])) {
                isChinese = true;
            }
        }

        // 如果是中文文件名，使用增强的中文提示词
        if (isChinese) {
            return `你是专业的UCS音效分类专家。UCS(Universal Category System)是音效行业标准分类系统。

## UCS分类规则：
- **OBJECT(OBJ)**: 物体音效 - 如撞击、摩擦、破碎等
- **DESIGNED(DSGN)**: 设计音效 - 如节奏、音乐元素、合成音效
- **SCIENCE FICTION(SCI)**: 科幻音效 - 如激光、机器人、太空音效
- **CARTOON(TOON)**: 卡通音效 - 如夸张效果、喜剧音效
- **GLASS**: 玻璃音效 - 如破碎、撞击玻璃
- **METAL**: 金属音效 - 如金属撞击、摩擦

## 真实CatID示例（必须使用这些或类似的）：
- **切割相关**: CLOTHRip(布料撕扯), GOREStab(血腥刺伤), OBJOffc(办公设备-含裁纸机), TOOLHand(手持工具-含切割器)
- **物体音效**: OBJFash(时尚物品), OBJOffc(办公设备), OBJMisc(物体杂项)
- **工具音效**: TOOLHand(手持工具), TOOLMisc(工具杂项)
- **食物音效**: FOODKware(厨具), FOODTware(餐具), FOODMisc(食物杂项)
- **机器音效**: MACHInd(工业机器), MACHOffc(办公机器), MACHMisc(机器杂项)

请根据音效文件名的语义特征，智能匹配最合适的UCS分类：

${filenames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

返回JSON格式：
{
  "results": [
    {
      "filename": "文件名",
      "classifications": [
        {
          "catID": "最可能的UCS分类ID",
          "catShort": "分类简称",
          "category": "主分类英文名",
          "category_zh": "主分类中文名",
          "subCategory": "子分类英文名",
          "subCategory_zh": "子分类中文名",
          "englishDescription": "英文描述(≤5词)",
          "confidence": "匹配置信度(0-100)"
        },
        {
          "catID": "第二可能的UCS分类ID",
          "catShort": "分类简称",
          "category": "主分类英文名",
          "category_zh": "主分类中文名",
          "subCategory": "子分类英文名",
          "subCategory_zh": "子分类中文名",
          "englishDescription": "英文描述(≤5词)",
          "confidence": "匹配置信度(0-100)"
        },
        {
          "catID": "第三可能的UCS分类ID",
          "catShort": "分类简称",
          "category": "主分类英文名",
          "category_zh": "主分类中文名",
          "subCategory": "子分类英文名",
          "subCategory_zh": "子分类中文名",
          "englishDescription": "英文描述(≤5词)",
          "confidence": "匹配置信度(0-100)"
        }
      ]
    }
  ]
}

要求：
1. 只返回JSON，无其他文字
2. 基于音效特征智能推理分类
3. **每个文件提供3个可能的分类选项，按置信度排序**
4. **必须使用上述示例中的真实CatID，不要创造新的ID**
5. 对于切割音效，优先使用: TOOLHand(手持工具), OBJOffc(办公设备), CLOTHRip(布料撕扯)
6. 提供置信度评估，确保第一个选项置信度最高
7. **为每个文件生成独特的英文描述，避免重复，体现文件名的具体特征**
8. **英文描述应该简洁(≤5词)但具有区分性，突出每个音效的独特性**`;
        } else {
            // 英文文件名使用增强的提示词
            return `You are a professional UCS (Universal Category System) audio classification expert.

## UCS Classification Rules:
- **OBJECT(OBJ)**: Physical object sounds - impacts, friction, breaking, etc.
- **DESIGNED(DSGN)**: Designed sounds - rhythmic, musical elements, synthesized
- **SCIENCE FICTION(SCI)**: Sci-fi sounds - lasers, robots, space effects
- **CARTOON(TOON)**: Cartoon sounds - exaggerated effects, comedy sounds
- **GLASS**: Glass sounds - breaking, impacts
- **METAL**: Metal sounds - impacts, friction

## Real CatID Examples (must use these or similar):
- **Cutting related**: CLOTHRip(cloth rip), GOREStab(gore stab), OBJOffc(office objects-includes cutters), TOOLHand(hand tools-includes cutters)
- **Object sounds**: OBJFash(fashion objects), OBJOffc(office objects), OBJMisc(object misc)
- **Tool sounds**: TOOLHand(hand tools), TOOLMisc(tool misc)
- **Food sounds**: FOODKware(kitchenware), FOODTware(tableware), FOODMisc(food misc)
- **Machine sounds**: MACHInd(industrial machines), MACHOffc(office machines), MACHMisc(machine misc)

Analyze these audio filenames and intelligently match the most appropriate UCS classification:

${filenames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

Return JSON format:
{
  "results": [
    {
      "filename": "filename",
      "classifications": [
        {
          "catID": "most likely UCS classification ID",
          "catShort": "category abbreviation",
          "category": "main category name",
          "subCategory": "subcategory name",
          "confidence": "matching confidence (0-100)"
        },
        {
          "catID": "second likely UCS classification ID",
          "catShort": "category abbreviation",
          "category": "main category name",
          "subCategory": "subcategory name",
          "confidence": "matching confidence (0-100)"
        },
        {
          "catID": "third likely UCS classification ID",
          "catShort": "category abbreviation",
          "category": "main category name",
          "subCategory": "subcategory name",
          "confidence": "matching confidence (0-100)"
        }
      ]
    }
  ]
}

Requirements:
1. Return only JSON, no other text
2. Intelligently infer classification based on audio characteristics
3. **Provide 3 possible classification options for each file, sorted by confidence**
4. **Must use real CatIDs from examples above, do not create new IDs**
5. For cutting sounds, prefer: TOOLHand(hand tools), OBJOffc(office objects), CLOTHRip(cloth rip)
6. Provide confidence assessment, ensure first option has highest confidence
7. **Generate unique English descriptions for each file, avoid duplicates, reflect specific characteristics**
8. **English descriptions should be concise (≤5 words) but distinctive, highlighting each sound's uniqueness**`;
        }
    }

    /**
     * 查询AI接口
     * @param {string} prompt - 提示词
     * @param {Object} translationProvider - 翻译服务提供者
     * @returns {Promise<string>} AI响应
     */
    async queryAI(prompt, translationProvider) {
        try {
            // 检查translationProvider是否有sendRequest方法
            if (!translationProvider || typeof translationProvider.sendRequest !== 'function') {
                console.error('translationProvider无效或没有sendRequest方法');

                // 如果translationProvider有translate方法，尝试使用translate方法
                if (translationProvider && typeof translationProvider.translate === 'function') {
                    console.log('尝试使用translate方法代替sendRequest');
                    return await translationProvider.translate(prompt, 'auto', 'auto');
                }

                throw new Error('translationProvider无效或没有可用的方法');
            }

            // 使用现有的翻译服务提供者发送请求
            const response = await translationProvider.sendRequest(prompt, 'auto', 'auto', 'classification');
            return response;
        } catch (error) {
            console.error('AI查询失败:', error);
            throw error;
        }
    }

    /**
     * 解析AI响应
     * @param {string} response - AI响应
     * @param {Array<string>} filenames - 文件名数组
     * @returns {Object} 解析后的分类信息
     */
    parseAIResponse(response, filenames) {
        try {
            // 先打印原始响应以便调试
            console.log('原始响应:', response);

            // 尝试从响应中提取JSON
            let jsonStr = '';

            try {
                // 尝试直接解析整个响应
                JSON.parse(response);
                jsonStr = response;
            } catch (parseError) {
                // 如果直接解析失败，尝试提取JSON部分
                const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                                 response.match(/```\n([\s\S]*?)\n```/) ||
                                 response.match(/{[\s\S]*?}/);

                if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                    if (jsonMatch[1]) {
                        jsonStr = jsonMatch[1];
                    }

                    // 清理JSON字符串，移除可能导致解析错误的字符
                    jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                } else {
                    // 如果没有匹配到JSON，尝试手动提取
                    const jsonStart = response.indexOf('{');
                    const jsonEnd = response.lastIndexOf('}');

                    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                        jsonStr = response.substring(jsonStart, jsonEnd + 1);
                        // 清理JSON字符串
                        jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                    } else {
                        throw new Error('无法从响应中提取JSON');
                    }
                }
            }

            console.log('提取的JSON字符串:', jsonStr);

            // 尝试修复常见的JSON格式问题
            jsonStr = jsonStr.replace(/,\s*}/g, '}');
            jsonStr = jsonStr.replace(/,\s*]/g, ']');

            // 解析JSON
            const data = JSON.parse(jsonStr);
            console.log('解析后的数据:', data);

            // 构建结果映射
            const result = {};
            if (data && data.results && Array.isArray(data.results)) {
                data.results.forEach(item => {
                    if (item.filename) {
                        // 处理新的多分类格式
                        if (item.classifications && Array.isArray(item.classifications)) {
                            console.log(`文件 ${item.filename} 获得 ${item.classifications.length} 个分类选项`);

                            // 应用命名风格到所有分类选项的英文描述
                            item.classifications.forEach((classification, index) => {
                                if (classification.englishDescription) {
                                    console.log(`选项 ${index + 1} 原始英文描述: ${classification.englishDescription}`);

                                    const formattedDescription = this._applyNamingStyleToDescription(
                                        classification.englishDescription
                                    );

                                    if (formattedDescription !== classification.englishDescription) {
                                        console.log(`选项 ${index + 1} 应用命名风格后: ${formattedDescription}`);
                                        classification.englishDescription = formattedDescription;
                                    }
                                }
                            });

                            // 存储所有分类选项，供后续验证和选择
                            result[item.filename] = {
                                classifications: item.classifications,
                                selectedClassification: null // 将在验证阶段设置
                            };

                            // 记录关键信息
                            console.log(`  最佳选项: ${item.classifications[0].catID} (置信度: ${item.classifications[0].confidence})`);
                        }
                        // 兼容旧的单分类格式
                        else if (item.classification) {
                            const classification = item.classification;
                            console.log(`文件 ${item.filename} 使用旧格式，单个分类: ${classification.catID}`);

                            // 应用命名风格到英文描述
                            if (classification.englishDescription) {
                                console.log(`旧格式原始英文描述: ${classification.englishDescription}`);

                                const formattedDescription = this._applyNamingStyleToDescription(
                                    classification.englishDescription
                                );

                                if (formattedDescription !== classification.englishDescription) {
                                    console.log(`旧格式应用命名风格后: ${formattedDescription}`);
                                    classification.englishDescription = formattedDescription;
                                }
                            }

                            result[item.filename] = {
                                classifications: [classification],
                                selectedClassification: null
                            };
                        }
                    }
                });
            }

            // 检查是否所有文件都有结果
            filenames.forEach(filename => {
                if (!result[filename]) {
                    console.warn(`未找到文件 ${filename} 的分类信息`);
                }
            });

            return result;
        } catch (error) {
            console.error('解析AI响应失败:', error, 'Response:', response);
        }
    }

    /**
     * 应用命名风格到英文描述
     * @param {string} description - 原始英文描述
     * @returns {string} 应用命名风格后的描述
     */
    _applyNamingStyleToDescription(description) {
        try {
            // 获取翻译服务的设置
            let namingStyle = 'none';
            let customSeparator = '_';

            // 尝试从翻译服务获取命名风格设置
            if (window.pluginState && window.pluginState.translationService) {
                const settings = window.pluginState.translationService.getSettings();
                namingStyle = settings.namingStyle || 'none';
                customSeparator = settings.customSeparator || '_';
            }

            // 如果没有设置命名风格，直接返回原描述
            if (namingStyle === 'none') {
                return description;
            }

            // 使用NamingUtils应用命名风格
            if (window.NamingUtils && typeof window.NamingUtils.applyNamingStyle === 'function') {
                return window.NamingUtils.applyNamingStyle(description, namingStyle, customSeparator);
            }

            // 如果NamingUtils不可用，使用简单的实现
            return this._simpleApplyNamingStyle(description, namingStyle, customSeparator);

        } catch (error) {
            console.error('应用命名风格失败:', error);
            return description; // 出错时返回原描述
        }
    }

    /**
     * 简单的命名风格应用实现
     * @param {string} text - 要处理的文本
     * @param {string} style - 命名风格
     * @param {string} customSeparator - 自定义分隔符
     * @returns {string} 处理后的文本
     */
    _simpleApplyNamingStyle(text, style, customSeparator = '_') {
        if (!text) return '';

        // 清理文本并分割单词
        const cleanText = text.replace(/\s+/g, ' ').trim();
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
                return cleanText;
        }
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('AI分类缓存已清除');
    }
}

// 导出AIClassifier
window.AIClassifier = AIClassifier;