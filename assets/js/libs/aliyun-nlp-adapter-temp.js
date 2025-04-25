/**
 * 阿里云NLP服务适配器
 * 提供与阿里云NLP服务的交互能力
 */
(function(global) {
    /**
     * 阿里云NLP服务适配器类
     */
    class AliyunNLPAdapter {
        /**
         * 构造函数
         * @param {Object} options - 配置选项
         */
        constructor(options = {}) {
            this.options = Object.assign({
                accessKeyId: '',
                accessKeySecret: '',
                region: 'cn-hangzhou', // 阿里云区域
                endpoint: 'alinlp.cn-hangzhou.aliyuncs.com',
                serviceCode: 'alinlp',
                enabled: false,
                proxyUrl: 'http://localhost:3456', // 代理服务器URL
                debug: true, // 是否开启调试模式

                // 分词方法选择
                tokenizer: {
                    // 默认使用基础版中文分词
                    useBasicChinese: true,     // 基础版中文分词（每天50万次免费额度）
                    useAdvancedChinese: false, // 高级版中文分词（累计50万次免费额度）
                    useMultiLanguage: false    // 高级版多语言分词（累计50万次免费额度）
                }
            }, options);

            // 初始化状态
            this.initialized = false;
            this.requestCount = 0; // 请求计数器，用于限制请求频率
            this.maxRequestPerDay = 50000; // 每天最大请求次数，防止超出免费额度
            this.lastResetDay = new Date().getDate(); // 上次重置计数器的日期
            this._lastRequestFailed = false; // 上次请求是否失败

            // 初始化
            this.init();
        }

        /**
         * 初始化适配器
         */
        init() {
            try {
                console.log('初始化阿里云NLP服务适配器...');
                console.log('阿里云NLP服务配置:', {
                    enabled: this.options.enabled,
                    accessKeyId: this.options.accessKeyId ? (this.options.accessKeyId.substring(0, 3) + '***') : '未设置',
                    accessKeySecret: this.options.accessKeySecret ? '******' : '未设置',
                    region: this.options.region,
                    endpoint: this.options.endpoint,
                    serviceCode: this.options.serviceCode,
                    proxyUrl: this.options.proxyUrl
                });

                // 即使未启用或缺少配置，也允许初始化成功
                // 这样可以使用模拟数据进行开发测试
                this.initialized = true;
                console.log('阿里云NLP服务适配器初始化成功');
            } catch (error) {
                console.error('阿里云NLP服务适配器初始化失败:', error);
                this.initialized = false;
            }
        }

        /**
         * 检查请求限制
         * @returns {boolean} 是否可以发送请求
         * @private
         */
        _checkRequestLimit() {
            // 检查是否需要重置计数器
            const today = new Date().getDate();
            if (today !== this.lastResetDay) {
                this.requestCount = 0;
                this.lastResetDay = today;
            }

            // 检查是否超出每日请求限制
            if (this.requestCount >= this.maxRequestPerDay) {
                console.warn('已达到每日请求限制，请明天再试');
                return false;
            }

            // 增加请求计数
            this.requestCount++;
            return true;
        }

        /**
         * 获取请求统计信息
         * @returns {Object} 请求统计信息
         */
        getRequestStats() {
            return {
                requestCount: this.requestCount,
                maxRequestPerDay: this.maxRequestPerDay,
                remainingRequests: Math.max(0, this.maxRequestPerDay - this.requestCount)
            };
        }

        /**
         * 检查服务是否可用
         * @returns {boolean} 服务是否可用
         */
        isAvailable() {
            // 即使未初始化或未启用，也返回可用
            return this.requestCount < this.maxRequestPerDay;
        }

        /**
         * 发送请求到阿里云NLP服务
         * @param {string} action - API操作名称
         * @param {Object} params - 请求参数
         * @returns {Promise<Object>} 请求结果
         * @private
         */
        async _sendRequest(action, params = {}) {
            // 只在调试模式下输出详细日志
            if (this.options.debug) {
                console.log(`【阿里云NLP】开始发送请求: action=${action}`);
            }

            try {
                // 检查是否初始化
                if (!this.initialized) {
                    throw new Error('阿里云NLP服务适配器未初始化');
                }

                // 检查请求限制
                if (!this._checkRequestLimit()) {
                    throw new Error('已达到阿里云NLP请求限制');
                }

                // 检查必要的凭证
                if (!this.options.accessKeyId || !this.options.accessKeySecret) {
                    throw new Error('缺少阿里云NLP服务必要的凭证');
                }

                // 使用代理服务器发送请求
                try {
                    // 检查代理服务器URL是否设置
                    let proxyUrl = this.options.proxyUrl || 'http://localhost:3456';
                    if (!proxyUrl) {
                        throw new Error('代理服务器URL未设置');
                    }

                    // 如果之前请求失败过，尝试使用备用端口
                    if (this._lastRequestFailed && proxyUrl === 'http://localhost:3456') {
                        const backupPorts = [3457, 3458, 3459];
                        const backupPort = backupPorts[Math.floor(Math.random() * backupPorts.length)];
                        proxyUrl = `http://localhost:${backupPort}`;
                    }

                    // 构建请求体
                    const requestBody = {
                        action: action,
                        accessKeyId: this.options.accessKeyId,
                        accessKeySecret: this.options.accessKeySecret,
                        region: this.options.region || 'cn-hangzhou',
                        params: params
                    };

                    // 构建请求选项
                    const requestOptions = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    };

                    // 设置超时，避免长时间等待（增加到15秒）
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    // 发送请求
                    const fetchFunction = typeof eagle !== 'undefined' && typeof eagle.fetch === 'function' ?
                        eagle.fetch : fetch;

                    const response = await fetchFunction(proxyUrl, {
                        ...requestOptions,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    // 检查响应状态
                    if (!response.ok) {
                        throw new Error(`代理服务器返回错误状态码: ${response.status}`);
                    }

                    const responseText = await response.text();

                    try {
                        const responseData = JSON.parse(responseText);

                        // 检查响应是否包含错误信息
                        if (responseData.Code && responseData.Code !== '200') {
                            throw new Error(`API返回错误: ${responseData.Message || responseData.Code}`);
                        }

                        // 重置请求失败标记
                        this._lastRequestFailed = false;

                        // 更新请求计数
                        this.requestCount++;

                        return responseData;
                    } catch (parseError) {
                        if (this.options.debug) {
                            console.error('【阿里云NLP】解析响应数据失败:', parseError);
                        }
                        throw parseError;
                    }
                } catch (proxyError) {
                    // 标记请求失败，下次尝试使用备用端口
                    this._lastRequestFailed = true;

                    // 如果是超时或网络错误，不打印详细错误日志
                    if (proxyError.name === 'AbortError') {
                        throw new Error('代理服务器请求超时');
                    } else if (proxyError.message && proxyError.message.includes('Failed to fetch')) {
                        throw new Error('代理服务器连接失败');
                    } else {
                        throw proxyError;
                    }
                }
            } catch (error) {
                if (this.options.debug) {
                    console.warn('【阿里云NLP】请求处理出错:', error.message);
                }
                throw error;
            }
        }

        // 移除了模拟数据生成方法

        /**
         * 中文分词（基础版）
         * @param {string} text - 要分词的文本
         * @returns {Promise<Array<string>>} 分词结果
         */
        async tokenizeChineseText(text) {
            if (!text) return [];

            try {
                console.log('【阿里云NLP】开始中文分词(基础版):', text);

                // 根据阿里云NLP API文档构建请求参数
                const response = await this._sendRequest('GetWsChGeneral', {
                    Text: text,
                    ServiceCode: this.options.serviceCode,
                    TokenizerId: 'GENERAL_CHN'
                });

                // 解析响应数据
                const data = JSON.parse(response.Data);
                if (data && data.success && data.result) {
                    const result = data.result.map(item => item.word);
                    console.log('【阿里云NLP】中文分词(基础版)结果:', result);
                    return result;
                }

                console.warn('【阿里云NLP】中文分词(基础版)返回无效数据');
                return [];
            } catch (error) {
                console.error('【阿里云NLP】中文分词(基础版)失败:', error);
                throw error; // 抛出错误，让调用者处理
            }
        }

        /**
         * 中文分词（高级版-通用领域）
         * @param {string} text - 要分词的文本
         * @returns {Promise<Array<Object>>} 分词结果
         */
        async tokenizeChineseAdvanced(text) {
            if (!text) return [];

            try {
                console.log('【阿里云NLP】开始中文分词(高级版-通用):', text);

                // 根据阿里云NLP API文档构建请求参数
                const response = await this._sendRequest('GetWsCustomizedChGeneralv2', {
                    Text: text,
                    ServiceCode: this.options.serviceCode,
                    OutType: '1' // 中粒度
                });

                // 解析响应数据
                const data = JSON.parse(response.Data);
                if (data && data.success && data.result) {
                    // 高级版API返回的结果结构可能与基础版不同
                    const result = data.result.map(item => ({
                        word: item.word,
                        pos: item.pos || ''
                    }));
                    console.log('【阿里云NLP】中文分词(高级版-通用)结果:', result);
                    return result;
                }

                console.warn('【阿里云NLP】中文分词(高级版-通用)返回无效数据');
                return [];
            } catch (error) {
                console.error('【阿里云NLP】中文分词(高级版-通用)失败:', error);
                throw error; // 抛出错误，让调用者处理
            }
        }

        /**
         * 多语言分词（高级版-通用领域）
         * @param {string} text - 要分词的文本
         * @param {string} language - 语言代码，如'en'表示英语
         * @returns {Promise<Array<Object>>} 分词结果
         */
        async tokenizeMultiLanguage(text, language = 'en') {
            if (!text) return [];

            try {
                console.log(`【阿里云NLP】开始多语言分词(高级版-通用): ${language}`, text);

                // 根据阿里云NLP API文档构建请求参数
                const response = await this._sendRequest('GetWsCustomizedSeaGeneral', {
                    Text: text,
                    ServiceCode: this.options.serviceCode,
                    Language: language // 语种代码：en(英语), vi(越南语), id(印尼语), th(泰语), ms(马来语)
                });

                // 解析响应数据
                const data = JSON.parse(response.Data);
                if (data && data.success && data.result && data.result.output && data.result.output.length > 0) {
                    const output = data.result.output[0];
                    const words = output.tags && output.tags.words ? output.tags.words : [];

                    console.log(`【阿里云NLP】多语言分词(高级版-通用)结果: ${language}`, words);
                    return words.map(word => ({ word }));
                }

                console.warn(`【阿里云NLP】多语言分词(高级版-通用)返回无效数据: ${language}`);
                return [];
            } catch (error) {
                console.error(`【阿里云NLP】多语言分词(高级版-通用)失败: ${language}`, error);
                throw error; // 抛出错误，让调用者处理
            }
        }

        /**
         * 词性标注
         * @param {string} text - 要标注的文本
         * @returns {Promise<Array<Object>>} 词性标注结果
         */
        async tagText(text) {
            console.log('【阿里云NLP】开始词性标注:', text);

            if (!text) {
                console.log('【阿里云NLP】文本为空，返回空结果');
                return [];
            }

            // 检查适配器状态
            if (!this.initialized) {
                console.error('【阿里云NLP】适配器未初始化，无法进行词性标注');
                throw new Error('阿里云NLP适配器未初始化');
            }

            console.log('【阿里云NLP】准备发送API请求');

            try {
                // 发送API请求
                console.log('【阿里云NLP】调用_sendRequest方法');
                const response = await this._sendRequest('GetPosChGeneral', {
                    Text: text,
                    ServiceCode: this.options.serviceCode || 'alinlp',
                    OutType: '1' // 中粒度
                });
                console.log('【阿里云NLP】_sendRequest返回结果:', response);

                // 解析响应数据
                if (!response) {
                    console.error('【阿里云NLP】响应为空');
                    throw new Error('阿里云NLP响应为空');
                }

                if (!response.Data) {
                    console.error('【阿里云NLP】响应数据为空');
                    throw new Error('阿里云NLP响应数据为空');
                }

                try {
                    console.log('【阿里云NLP】解析响应数据:', response.Data);
                    const data = JSON.parse(response.Data);
                    console.log('【阿里云NLP】解析后的数据:', data);

                    if (!data) {
                        console.error('【阿里云NLP】解析后的数据为空');
                        throw new Error('阿里云NLP解析后的数据为空');
                    }

                    if (!data.success) {
                        console.error('【阿里云NLP】API返回失败:', data);
                        throw new Error('阿里云NLP API返回失败');
                    }

                    if (!data.result || !Array.isArray(data.result) || data.result.length === 0) {
                        console.error('【阿里云NLP】结果为空或不是数组:', data);
                        throw new Error('阿里云NLP结果为空或不是数组');
                    }

                    const result = data.result.map(item => ({
                        w: item.word,
                        p: item.pos
                    }));
                    console.log('【阿里云NLP】词性标注结果:', result);
                    return result;
                } catch (parseError) {
                    console.error('【阿里云NLP】解析响应数据失败:', parseError);
                    console.error('【阿里云NLP】原始响应数据:', response.Data);
                    throw parseError;
                }
            } catch (error) {
                console.error('【阿里云NLP】词性标注失败:', error);
                console.error('【阿里云NLP】错误详情:', error.message, error.stack);
                throw error; // 抛出错误，让调用者处理
            }
        }

        /**
         * 分析文本，返回词性分析结果
         * 根据配置选择不同的分词方法
         * @param {string} text - 要分析的文本
         * @returns {Promise<Array<Object>>} 词性分析结果
         * @throws {Error} 如果分析失败，抛出错误
         */
        async analyzePos(text) {
            if (this.options.debug) {
                console.log('【阿里云NLP】开始分析文本:', text);
            }

            if (!text) {
                return [];
            }

            // 检查文本是否包含中文
            const hasChinese = /[\u4e00-\u9fa5]/.test(text);

            // 检查文本是否包含英文
            const hasEnglish = /[a-zA-Z]/.test(text);

            // 如果既不包含中文也不包含英文，返回空结果
            if (!hasChinese && !hasEnglish) {
                return [];
            }

            // 检查适配器状态
            if (!this.initialized) {
                throw new Error('阿里云NLP适配器未初始化');
            }

            if (!this.options.enabled) {
                throw new Error('阿里云NLP适配器未启用');
            }

            if (!this.options.accessKeyId || !this.options.accessKeySecret) {
                throw new Error('阿里云NLP缺少AccessKey');
            }

            try {
                // 根据配置和文本语言选择不同的处理方式
                let tagResult = [];

                // 获取分词器配置
                const tokenizerConfig = this.options.tokenizer || {
                    useBasicChinese: true,
                    useAdvancedChinese: false,
                    useMultiLanguage: false
                };

                // 输出分词器配置（仅在调试模式下）
                if (this.options.debug) {
                    console.log('【阿里云NLP】当前分词器配置:', {
                        useBasicChinese: tokenizerConfig.useBasicChinese,
                        useAdvancedChinese: tokenizerConfig.useAdvancedChinese,
                        useMultiLanguage: tokenizerConfig.useMultiLanguage
                    });
                }

                // 处理中文文本
                if (hasChinese) {
                    // 优先使用高级版中文分词（如果启用）
                    if (tokenizerConfig.useAdvancedChinese) {
                        try {
                            const chineseResult = await this.tokenizeChineseAdvanced(text);
                            if (chineseResult && chineseResult.length > 0) {
                                // 转换为内部格式
                                const formattedResult = chineseResult.map(item => ({
                                    w: item.word,
                                    p: item.pos || ''
                                }));
                                tagResult = tagResult.concat(formattedResult);
                            }
                        } catch (advancedError) {
                            // 回退到基础版
                            tokenizerConfig.useBasicChinese = true;
                        }
                    }

                    // 如果未启用高级版或高级版失败，使用基础版中文分词
                    if (tokenizerConfig.useBasicChinese && tagResult.length === 0) {
                        try {
                            const basicTagResult = await this.tagText(text);
                            if (basicTagResult && basicTagResult.length > 0) {
                                tagResult = tagResult.concat(basicTagResult);
                            }
                        } catch (basicError) {
                            if (this.options.debug) {
                                console.error('【阿里云NLP】基础版中文分词失败');
                            }
                        }
                    }
                }

                // 处理英文文本
                if (hasEnglish && !hasChinese) {
                    // 对于纯英文文本，我们总是返回空结果，让调用者使用本地compromise.js处理
                    // 这样可以确保词性标注的准确性
                    if (this.options.debug) {
                        console.log('【阿里云NLP】纯英文文本，将由本地compromise.js处理词性标注');
                    }
                    return [];
                }

                // 处理混合文本（中英文混合）
                if (hasEnglish && hasChinese && (tokenizerConfig.useMultiLanguage === true)) {
                    try {
                        // 对于中英文混合文本，我们可以使用多语言分词API进行分词
                        // 但不使用其词性标注结果
                        const englishResult = await this.tokenizeMultiLanguage(text, 'en');
                        if (englishResult && englishResult.length > 0) {
                            if (this.options.debug) {
                                console.log('【阿里云NLP】获取到多语言分词结果，但不使用其词性标注');
                            }

                            // 我们只提取分词结果，不添加词性标注
                            // 这些分词结果将与中文分词结果合并
                            // 但我们不会将这些结果添加到tagResult中
                            // 因为我们希望调用者使用compromise.js来处理英文部分的词性标注
                        }
                    } catch (englishError) {
                        if (this.options.debug) {
                            console.log('【阿里云NLP】多语言分词失败:', englishError.message);
                        }
                    }
                }

                // 如果所有方法都失败，尝试使用基础版词性标注作为最后的回退
                if (tagResult.length === 0) {
                    const basicTagResult = await this.tagText(text);
                    if (basicTagResult && basicTagResult.length > 0) {
                        tagResult = basicTagResult;
                    } else {
                        throw new Error('阿里云NLP词性标注结果为空');
                    }
                }

                // 词性映射表
                const posMapping = {
                    // 名词类 (阿里云NLP返回的是大写词性标签)
                    'n': { pos: 'noun', weight: 120 },
                    'nr': { pos: 'noun', weight: 120 },
                    'ns': { pos: 'noun', weight: 120 },
                    'nt': { pos: 'noun', weight: 120 },
                    'nz': { pos: 'noun', weight: 120 },
                    'nw': { pos: 'noun', weight: 120 },
                    'NN': { pos: 'noun', weight: 120 }, // 阿里云NLP返回的名词标签
                    'NR': { pos: 'noun', weight: 120 }, // 人名
                    'NS': { pos: 'noun', weight: 120 }, // 地名
                    'NT': { pos: 'noun', weight: 120 }, // 机构名
                    // 动词类
                    'v': { pos: 'verb', weight: 70 },
                    'vd': { pos: 'verb', weight: 70 },
                    'vn': { pos: 'verb', weight: 70 },
                    'VV': { pos: 'verb', weight: 70 }, // 阿里云NLP返回的动词标签
                    'VC': { pos: 'verb', weight: 70 }, // 系动词
                    // 形容词类
                    'a': { pos: 'adjective', weight: 80 },
                    'ad': { pos: 'adjective', weight: 80 },
                    'an': { pos: 'adjective', weight: 80 },
                    'JJ': { pos: 'adjective', weight: 80 }, // 阿里云NLP返回的形容词标签
                    // 副词类
                    'd': { pos: 'adverb', weight: 40 },
                    'AD': { pos: 'adverb', weight: 40 }, // 阿里云NLP返回的副词标签
                    // 数词
                    'CD': { pos: 'noun', weight: 60 }, // 基数词，当作名词处理
                    // 方位词
                    'LC': { pos: 'noun', weight: 60 }, // 方位词，当作名词处理
                    // 标点符号
                    'PU': { pos: 'punctuation', weight: 5 }, // 标点符号，低权重
                    // 默认
                    'default': { pos: 'other', weight: 20 }
                };

                // 处理标注结果
                const result = tagResult
                    .filter(item => item && item.w)
                    .map(item => {
                        const pos = item.p || 'x';
                        const mapping = posMapping[pos] || posMapping.default;

                        // 只在调试模式下输出详细日志
                        if (this.options.debug) {
                            console.log(`【阿里云NLP】词 "${item.w}" 的词性: ${pos} -> ${mapping.pos}, 权重: ${mapping.weight}`);
                        }

                        return {
                            word: item.w,
                            pos: mapping.pos,
                            weight: mapping.weight
                        };
                    });

                if (result.length === 0) {
                    throw new Error('阿里云NLP处理后的结果为空');
                }

                return result;
            } catch (error) {
                if (this.options.debug) {
                    console.error('【阿里云NLP】词性分析失败:', error.message);
                }
                throw error; // 抛出错误，让调用者处理
            }
        }

        /**
         * 文本分类方法（已禁用）
         * @returns {Promise<null>} 始终返回null
         */
        async classifyText() {
            console.log('文本分类功能已禁用');
            return null;
        }

        /**
         * 设置配置选项
         * @param {Object} options - 配置选项
         */
        setOptions(options) {
            if (!options) return;

            // 使用深拷贝避免引用问题
            const newOptions = JSON.parse(JSON.stringify(options));

            // 特殊处理tokenizer配置，确保它被正确合并
            if (newOptions.tokenizer) {
                this.options.tokenizer = Object.assign({}, this.options.tokenizer || {}, newOptions.tokenizer);
                // 删除newOptions中的tokenizer，避免下面的Object.assign覆盖整个tokenizer对象
                delete newOptions.tokenizer;
            }

            // 更新配置
            this.options = Object.assign({}, this.options, newOptions);

            // 如果设置了maxRequestPerDay，更新请求限制
            if (newOptions.maxRequestPerDay) {
                this.maxRequestPerDay = parseInt(newOptions.maxRequestPerDay, 10) || 50000;
            }

            // 如果更改了关键配置，重新初始化
            if ('accessKeyId' in newOptions || 'accessKeySecret' in newOptions || 'enabled' in newOptions) {
                this.init();
            }

            if (this.options.debug) {
                console.log('阿里云NLP适配器配置已更新:', {
                    enabled: this.options.enabled,
                    accessKeyId: this.options.accessKeyId ? (this.options.accessKeyId.substring(0, 3) + '***') : '未设置',
                    accessKeySecret: this.options.accessKeySecret ? '******' : '未设置',
                    region: this.options.region,
                    proxyUrl: this.options.proxyUrl,
                    maxRequestPerDay: this.maxRequestPerDay,
                    tokenizer: this.options.tokenizer
                });
            }
        }

        /**
         * 获取当前配置
         * @returns {Object} 当前配置
         */
        getOptions() {
            // 返回配置的副本，隐藏敏感信息
            const options = Object.assign({}, this.options);
            if (options.accessKeyId) {
                options.accessKeyId = options.accessKeyId.substring(0, 3) + '***';
            }
            if (options.accessKeySecret) {
                options.accessKeySecret = '******';
            }

            // 确保区域信息被包含
            options.region = options.region || 'cn-hangzhou';

            return options;
        }

        /**
         * 验证阿里云AccessKey凭证
         * @returns {Promise<Object>} 验证结果
         */
        async validateCredentials() {
            console.log('【阿里云NLP】开始验证AccessKey凭证');

            // 检查是否提供了AccessKey
            if (!this.options.accessKeyId || !this.options.accessKeySecret) {
                console.warn('【阿里云NLP】缺少AccessKey凭证');
                return {
                    valid: false,
                    message: '请先填写AccessKey ID和AccessKey Secret'
                };
            }

            try {
                // 使用一个简单的文本进行测试请求
                const testText = '测试验证';
                console.log(`【阿里云NLP】发送测试请求: "${testText}"`);

                // 发送API请求
                const response = await this._sendRequest('GetPosChGeneral', {
                    Text: testText,
                    ServiceCode: this.options.serviceCode,
                    OutType: '1' // 中粒度
                });

                console.log('【阿里云NLP】验证请求响应:', response);

                // 检查响应是否包含错误信息
                if (response && response.Code && response.Code !== '200') {
                    console.error(`【阿里云NLP】验证失败: ${response.Code} - ${response.Message || '未知错误'}`);
                    return {
                        valid: false,
                        message: `验证失败: ${response.Message || response.Code}`,
                        details: response
                    };
                }

                // 尝试解析Data字段
                if (response && response.Data) {
                    try {
                        const data = JSON.parse(response.Data);

                        // 检查是否成功
                        if (data && data.success === true) {
                            console.log('【阿里云NLP】验证成功');
                            return {
                                valid: true,
                                message: '验证成功！AccessKey有效',
                                details: data
                            };
                        } else {
                            console.warn('【阿里云NLP】验证失败: API返回success=false');
                            return {
                                valid: false,
                                message: '验证失败: API返回无效响应',
                                details: data
                            };
                        }
                    } catch (parseError) {
                        console.error('【阿里云NLP】解析响应数据失败:', parseError);
                        return {
                            valid: false,
                            message: '验证失败: 无法解析API响应',
                            details: response
                        };
                    }
                }

                // 如果没有明确的错误但也没有成功的响应
                console.warn('【阿里云NLP】验证结果不明确');
                return {
                    valid: false,
                    message: '验证失败: 无法确定AccessKey是否有效',
                    details: response
                };
            } catch (error) {
                console.error('【阿里云NLP】验证过程出错:', error);
                return {
                    valid: false,
                    message: `验证失败: ${error.message || '未知错误'}`,
                    error: error
                };
            }
        }
    }

    // 导出适配器类
    if (typeof global !== 'undefined') {
        global.AliyunNLPAdapter = AliyunNLPAdapter;
    }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
