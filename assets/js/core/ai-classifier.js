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
     * @returns {Promise<Object>} 分类信息
     */
    async getClassification(filename, translationProvider) {
        console.log('AI分类器尝试获取分类信息:', filename, '启用状态:', this.enabled);

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

        try {
            // 构建批量请求
            const batchPrompt = this.buildBatchPrompt(currentBatch.map(item => item.filename));

            // 使用第一个请求的翻译提供者
            const translationProvider = currentBatch[0].translationProvider;

            // 发送请求
            console.log('发送AI分类请求', {
                provider: translationProvider && typeof translationProvider.getId === 'function' ? translationProvider.getId() : 'unknown',
                fileCount: currentBatch.length
            });

            const result = await this.queryAI(batchPrompt, translationProvider);
            console.log('AI分类请求返回结果', {
                resultLength: result ? result.length : 0
            });

            // 解析结果
            const classifications = this.parseAIResponse(result, currentBatch.map(item => item.filename));
            console.log('解析后的分类结果', classifications);

            // 处理每个文件的结果
            currentBatch.forEach((item, index) => {
                const classification = classifications[item.filename] || null;
                console.log(`文件 ${item.filename} 的分类结果:`, classification);

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
     * @returns {string} 提示词
     */
    buildBatchPrompt(filenames) {
        return `你是一个专业的音效分类专家，严格按照UCS音效分类规则，请根据以下音效文件名，分析并提供每个文件的分类信息。

重要：你必须严格使用以下有效的分类ID(CatID)，不要创造新的分类ID：
- 对于Glitch类型的音效，应使用DSGNRythm（设计音/节奏性）作为CatID
- 对于科幻类型的音效，应使用SCIMisc（科幻/其他）或其他SCI前缀的分类
- 对于数字/电子类型的音效，应使用DSGNSynth（设计音/电子合成）或UIGlitch（用户界面/故障）

请使用以下格式返回结果（JSON格式）：

{
  "results": [
    {
      "filename": "文件名",
      "classification": {
        "catID": "分类ID，必须是CSV表格中存在的ID，如DSGNRythm、SCIMisc、TOONPop等",
        "catShort": "短分类名，如DSGN、SCI、TOON等",
        "category": "主分类英文名，如DESIGNED、SCIENCE FICTION、CARTOON等",
        "category_zh": "主分类中文名，如声音设计、科幻、卡通等",
        "subCategory": "子分类英文名，如RHYTHMIC、MISC、POP等",
        "subCategory_zh": "子分类中文名，如节奏性、其他、爆破等"
      }
    }
  ]
}

请分析以下音效文件名：
${filenames.join('\n')}

注意：
1. 请只返回JSON格式的结果，不要包含其他解释文字
2. 如果无法确定某个分类信息，可以将对应字段设为null
3. 你必须使用CSV表格中存在的有效分类ID(CatID)，不要创造新的分类ID
4. 对于Glitch类型的音效，应使用DSGNRythm作为CatID
5. 对于科幻类型的音效，应使用SCIMisc或其他SCI前缀的分类
6. 对于数字/电子类型的音效，应使用DSGNSynth或UIGlitch`;
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
                        result[item.filename] = item.classification;
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
                    // 对于Glitch类型的音效，使用DSGNRythm
                    if (filename.toLowerCase().includes('glitch')) {
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
                    // 对于科幻类型的音效，使用SCIMisc
                    else if (filename.toLowerCase().includes('sci-fi')) {
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
                    // 对于数字/电子类型的音效，使用DSGNSynth
                    else if (filename.toLowerCase().includes('digital')) {
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