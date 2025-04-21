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
        console.log('AI辅助分类匹配功能已' + (enabled ? '启用' : '禁用'));
        return this;
    }

    /**
     * 获取音效文件的分类信息
     * @param {string} filename - 音效文件名
     * @param {Object} translationProvider - 翻译服务提供者
     * @returns {Promise<Object>} 分类信息
     */
    async getClassification(filename, translationProvider) {
        if (!this.enabled) {
            return null;
        }

        // 检查缓存
        if (this.cache.has(filename)) {
            console.log('使用缓存的分类信息:', filename);
            return this.cache.get(filename);
        }

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
            return;
        }

        this.processingBatch = true;
        
        // 获取当前批次
        const currentBatch = this.batchQueue.splice(0, this.batchSize);
        console.log(`处理批次请求，共${currentBatch.length}个文件`);

        try {
            // 构建批量请求
            const batchPrompt = this.buildBatchPrompt(currentBatch.map(item => item.filename));
            
            // 使用第一个请求的翻译提供者
            const translationProvider = currentBatch[0].translationProvider;
            
            // 发送请求
            const result = await this.queryAI(batchPrompt, translationProvider);
            
            // 解析结果
            const classifications = this.parseAIResponse(result, currentBatch.map(item => item.filename));
            
            // 处理每个文件的结果
            currentBatch.forEach((item, index) => {
                const classification = classifications[item.filename] || null;
                
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
        return `你是一个专业的音效分类专家，请根据以下音效文件名，分析并提供每个文件的分类信息。
请使用以下格式返回结果（JSON格式）：

{
  "results": [
    {
      "filename": "文件名",
      "classification": {
        "catID": "分类ID，例如DSGN、TOON、ANML等",
        "category": "主分类英文名，例如DESIGNED、CARTOON、ANIMAL等",
        "category_zh": "主分类中文名，例如设计音、卡通、动物等",
        "subCategory": "子分类英文名，例如WHOOSH、POP、CAT等",
        "subCategory_zh": "子分类中文名，例如呼啸、爆破、猫等"
      }
    }
  ]
}

请分析以下音效文件名：
${filenames.join('\n')}

注意：
1. 请只返回JSON格式的结果，不要包含其他解释文字
2. 如果无法确定某个分类信息，可以将对应字段设为null
3. 请尽可能准确地分析文件名中隐含的分类信息`;
    }

    /**
     * 查询AI接口
     * @param {string} prompt - 提示词
     * @param {Object} translationProvider - 翻译服务提供者
     * @returns {Promise<string>} AI响应
     */
    async queryAI(prompt, translationProvider) {
        try {
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
            // 尝试从响应中提取JSON
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                             response.match(/```\n([\s\S]*?)\n```/) || 
                             response.match(/{[\s\S]*?}/);
            
            let jsonStr = '';
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
                if (jsonMatch[1]) {
                    jsonStr = jsonMatch[1];
                }
            } else {
                jsonStr = response;
            }
            
            // 解析JSON
            const data = JSON.parse(jsonStr);
            
            // 构建结果映射
            const result = {};
            if (data && data.results && Array.isArray(data.results)) {
                data.results.forEach(item => {
                    if (item.filename && item.classification) {
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
            return {};
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