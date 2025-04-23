/**
 * AI辅助分类匹配功能
 * 使用AI接口获取音效文件的分类信息，提高匹配准确性
 */
class AIClassifier {
    constructor() {
        this.enabled = false;
        this.cache = new Map(); // 缓存已经查询过的结果
        this.batchSize = 5; // 批处理大小，避免频繁请求API
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

                // 如果是中文文件名且有英文描述，添加到分类信息中
                if (item.isChinese && classification && hasChineseFiles) {
                    // 确保英文描述字段存在
                    if (classification.englishDescription) {
                        console.log(`中文文件 ${item.filename} 获取到英文描述: ${classification.englishDescription}`);
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

        // 如果是中文文件名，使用中文提示词
        if (isChinese) {
            return `你是一个专业的音效分类专家，严格按照UCS音效分类规则，请根据以下中文音效文件名，分析并提供每个文件的分类信息。

请使用以下格式返回结果（JSON格式）：

{
  "results": [
    {
      "filename": "文件名",
      "classification": {
        "catID": "分类ID，必须是UCS标准表格中存在的ID，如GLASImpt、OBJTape、DSGNRythm、SCIMisc、TOONPop等",
        "catShort": "短分类名，如OBJ、DSGN、SCI、TOON等",
        "category": "主分类英文名，如OBJECT、DESIGNED、SCIENCE FICTION、CARTOON等",
        "category_zh": "主分类中文名，如物体、声音设计、科幻、卡通等",
        "subCategory": "子分类英文名，如TAPE、RHYTHMIC、MISC、POP等",
        "subCategory_zh": "子分类中文名，如磁带、节奏性、其他、爆破等",
        "englishDescription": "简短英文描述，不超过5个单词"
      }
    }
  ]
}

请分析以下中文音效文件名：
${filenames.join('\n')}

注意：
1. 请只返回JSON格式的结果，不要包含其他解释文字
2. 如果无法确定某个分类信息，可以将对应字段设为null
3. 你必须使用UCS标准表格中存在的有效分类ID(CatID)，不要创造新的分类ID
4. 请同时提供简短英文描述，便于生成英文标准化名称`;
        } else {
            // 英文文件名使用原有提示词
            return `你是一个专业的音效分类专家，严格按照UCS音效分类规则，请根据以下音效文件名，分析并提供每个文件的分类信息。

请使用以下格式返回结果（JSON格式）：

{
  "results": [
    {
      "filename": "文件名",
      "classification": {
        "catID": "分类ID，必须是UCS标准表格中存在的ID，如GLASImpt、OBJTape、DSGNRythm、SCIMisc、TOONPop等",
        "catShort": "短分类名，如OBJ、DSGN、SCI、TOON等",
        "category": "主分类英文名，如OBJECT、DESIGNED、SCIENCE FICTION、CARTOON等",
        "category_zh": "主分类中文名，如物体、声音设计、科幻、卡通等",
        "subCategory": "子分类英文名，如TAPE、RHYTHMIC、MISC、POP等",
        "subCategory_zh": "子分类中文名，如磁带、节奏性、其他、爆破等"
      }
    }
  ]
}

请分析以下音效文件名：
${filenames.join('\n')}

注意：
1. 请只返回JSON格式的结果，不要包含其他解释文字
2. 如果无法确定某个分类信息，可以将对应字段设为null
3. 你必须使用是UCS标准表格中存在的有效分类ID(CatID)，不要创造新的分类ID
4. 对于数字/电子类型的音效，应使用DSGNSynth或UIGlitch`;
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
                    if (item.filename && item.classification) {
                        // 直接使用分类信息，不进行验证
                        const classification = item.classification;

                        // 如果有英文描述字段，保留它
                        if (classification.englishDescription) {
                            console.log(`文件 ${item.filename} 包含英文描述: ${classification.englishDescription}`);
                        }

                        result[item.filename] = classification;
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

            // 尝试手动构建结果
            try {
                const result = {};

                // 为每个文件创建默认分类
                filenames.forEach(filename => {
                    // 对文件名进行小写处理便于匹配
                    const lowerFilename = filename.toLowerCase();

                    // 优先级 1: 动物叫声类型的音效，使用相应的动物分类
                    if (lowerFilename.includes('sheep') || lowerFilename.includes('羊')) {
                        result[filename] = {
                            catID: 'ANMLFarm',
                            catShort: 'ANML',
                            category: 'ANIMAL',
                            category_zh: '动物',
                            subCategory: 'FARM',
                            subCategory_zh: '农场'
                        };
                        console.log(`手动创建分类: ${filename} -> ANMLFarm`);
                    }
                    else if (lowerFilename.includes('cat') || lowerFilename.includes('猫')) {
                        result[filename] = {
                            catID: 'ANMLCat',
                            catShort: 'ANML',
                            category: 'ANIMAL',
                            category_zh: '动物',
                            subCategory: 'CAT',
                            subCategory_zh: '猫'
                        };
                        console.log(`手动创建分类: ${filename} -> ANMLCat`);
                    }
                    else if (lowerFilename.includes('dog') || lowerFilename.includes('狗')) {
                        result[filename] = {
                            catID: 'ANMLDog',
                            catShort: 'ANML',
                            category: 'ANIMAL',
                            category_zh: '动物',
                            subCategory: 'DOG',
                            subCategory_zh: '狗'
                        };
                        console.log(`手动创建分类: ${filename} -> ANMLDog`);
                    }
                    else if (lowerFilename.includes('bird') || lowerFilename.includes('鸟')) {
                        result[filename] = {
                            catID: 'BIRDMisc',
                            catShort: 'BIRD',
                            category: 'BIRD',
                            category_zh: '鸟类',
                            subCategory: 'MISC',
                            subCategory_zh: '其他'
                        };
                        console.log(`手动创建分类: ${filename} -> BIRDMisc`);
                    }
                    else if (lowerFilename.includes('seagull') || lowerFilename.includes('gull') || lowerFilename.includes('海鸥')) {
                        result[filename] = {
                            catID: 'BIRDSea',
                            catShort: 'BIRD',
                            category: 'BIRD',
                            category_zh: '鸟类',
                            subCategory: 'SEA',
                            subCategory_zh: '海鸟'
                        };
                        console.log(`手动创建分类: ${filename} -> BIRDSea`);
                    }
                    else if (lowerFilename.includes('cow') || lowerFilename.includes('牛')) {
                        result[filename] = {
                            catID: 'ANMLFarm',
                            catShort: 'ANML',
                            category: 'ANIMAL',
                            category_zh: '动物',
                            subCategory: 'FARM',
                            subCategory_zh: '农场'
                        };
                        console.log(`手动创建分类: ${filename} -> ANMLFarm`);
                    }

                    // 优先级 2: 物体相关的音效
                    else if (lowerFilename.includes('tape') || lowerFilename.includes('cassette') || lowerFilename.includes('磁带')) {
                        result[filename] = {
                            catID: 'OBJTape',
                            catShort: 'OBJ',
                            category: 'OBJECT',
                            category_zh: '物体',
                            subCategory: 'TAPE',
                            subCategory_zh: '磁带'
                        };
                        console.log(`手动创建分类: ${filename} -> OBJTape`);
                    }
                    else if (lowerFilename.includes('paper') || lowerFilename.includes('纸')) {
                        result[filename] = {
                            catID: 'OBJPaper',
                            catShort: 'OBJ',
                            category: 'OBJECT',
                            category_zh: '物体',
                            subCategory: 'PAPER',
                            subCategory_zh: '纸张'
                        };
                        console.log(`手动创建分类: ${filename} -> OBJPaper`);
                    }
                    else if (lowerFilename.includes('metal') || lowerFilename.includes('steel') || lowerFilename.includes('金属')) {
                        result[filename] = {
                            catID: 'OBJMetal',
                            catShort: 'OBJ',
                            category: 'OBJECT',
                            category_zh: '物体',
                            subCategory: 'METAL',
                            subCategory_zh: '金属'
                        };
                        console.log(`手动创建分类: ${filename} -> OBJMetal`);
                    }

                    // 优先级 3: 其他特殊类型的音效
                    else if (lowerFilename.includes('glitch')) {
                        result[filename] = {
                            catID: 'DSGNRythm',
                            catShort: 'DSGN',
                            category: 'DESIGNED',
                            category_zh: '声音设计',
                            subCategory: 'RHYTHMIC',
                            subCategory_zh: '节奏性'
                        };
                        console.log(`手动创建分类: ${filename} -> DSGNRythm`);
                    }
                    else if (lowerFilename.includes('sci-fi') || lowerFilename.includes('scifi') || lowerFilename.includes('科幻')) {
                        result[filename] = {
                            catID: 'SCIMisc',
                            catShort: 'SCI',
                            category: 'SCIENCE FICTION',
                            category_zh: '科幻',
                            subCategory: 'MISC',
                            subCategory_zh: '其他'
                        };
                        console.log(`手动创建分类: ${filename} -> SCIMisc`);
                    }
                    else if (lowerFilename.includes('digital') || lowerFilename.includes('electronic') || lowerFilename.includes('电子')) {
                        result[filename] = {
                            catID: 'DSGNSynth',
                            catShort: 'DSGN',
                            category: 'DESIGNED',
                            category_zh: '声音设计',
                            subCategory: 'SYNTHETIC',
                            subCategory_zh: '电子合成'
                        };
                        console.log(`手动创建分类: ${filename} -> DSGNSynth`);
                    }
                });

                return result;
            } catch (fallbackError) {
                console.error('手动构建结果失败:', fallbackError);
                return {};
            }
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