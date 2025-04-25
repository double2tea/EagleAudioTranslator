/**
 * 分词与匹配配置面板
 * 处理分词服务（阿里云NLP或本地）的配置和交互
 */
class TokenizationPanel {
    /**
     * 构造函数
     * @param {SmartClassifier} smartClassifier - 智能分类器实例
     */
    constructor(smartClassifier) {
        this.smartClassifier = smartClassifier;
        this.initialized = false;
        this.proxyManager = null;

        // 配置元素
        this.enableAliyunNLPCheckbox = document.getElementById('enableAliyunNLP');
        this.aliyunAccessKeyIdInput = document.getElementById('aliyunAccessKeyId');
        this.aliyunAccessKeySecretInput = document.getElementById('aliyunAccessKeySecret');
        this.aliyunDebugModeCheckbox = document.getElementById('aliyunDebugMode');
        this.aliyunMatchStrategySelect = document.getElementById('aliyunMatchStrategy');
        this.aliyunNLPSettings = document.getElementById('aliyunNLPSettings');

        // 分词方法选择元素
        this.useBasicChineseCheckbox = document.getElementById('useBasicChinese');
        this.useAdvancedChineseCheckbox = document.getElementById('useAdvancedChinese');
        this.useMultiLanguageCheckbox = document.getElementById('useMultiLanguage');

        // 词性过滤设置元素
        this.enablePosFilterCheckbox = document.getElementById('enablePosFilter');
        this.filterPunctuationCheckbox = document.getElementById('filterPunctuation');
        this.filterNumbersCheckbox = document.getElementById('filterNumbers');
        this.filterFunctionWordsCheckbox = document.getElementById('filterFunctionWords');

        // 状态元素
        this.aliyunServiceStatus = document.getElementById('aliyunServiceStatus');
        this.aliyunRequestStats = document.getElementById('aliyunRequestStats');
        this.aliyunRequestCount = document.getElementById('aliyunRequestCount');
        this.aliyunMaxRequests = document.getElementById('aliyunMaxRequests');
        this.aliyunRemainingRequests = document.getElementById('aliyunRemainingRequests');

        // 验证元素
        this.validateAliyunKeyBtn = document.getElementById('validateAliyunKeyBtn');
        this.aliyunKeyValidationResult = document.getElementById('aliyunKeyValidationResult');

        // 代理服务器状态元素
        this.proxyServerStatus = document.getElementById('proxyServerStatus');

        // 初始化
        this.init();
    }

    /**
     * 初始化面板
     */
    init() {
        try {
            // 初始化代理服务器管理器
            if (typeof ProxyManager !== 'undefined') {
                this.proxyManager = new ProxyManager();
                console.log('代理服务器管理器初始化成功');

                // 监听代理服务器状态变更事件
                window.addEventListener('proxyStatusChange', (event) => {
                    this.updateProxyStatus(event.detail.isRunning);
                });
            } else {
                console.warn('代理服务器管理器不可用');
            }

            // 加载保存的配置
            this.loadConfig();

            // 绑定事件
            this.bindEvents();

            // 更新UI
            this.updateUI();

            this.initialized = true;
            console.log('阿里云NLP服务配置面板初始化成功');
        } catch (error) {
            console.error('阿里云NLP服务配置面板初始化失败:', error);
        }
    }

    /**
     * 更新代理服务器状态
     * @param {boolean} isRunning - 代理服务器是否正在运行
     */
    updateProxyStatus(isRunning) {
        if (this.proxyServerStatus) {
            if (isRunning) {
                this.proxyServerStatus.textContent = '已启动';
                this.proxyServerStatus.className = 'status-available';

                // 更新阿里云NLP适配器的代理URL
                if (this.smartClassifier && this.smartClassifier.aliyunNLPAdapter && this.proxyManager) {
                    this.smartClassifier.aliyunNLPAdapter.setOptions({
                        proxyUrl: this.proxyManager.getProxyUrl()
                    });
                    console.log('已更新阿里云NLP适配器的代理URL:', this.proxyManager.getProxyUrl());
                }
            } else {
                this.proxyServerStatus.textContent = '未启动';
                this.proxyServerStatus.className = 'status-disabled';
            }
        }
    }

    /**
     * 启动代理服务器
     */
    async startProxyServer() {
        if (!this.proxyManager) {
            console.warn('代理服务器管理器不可用，无法启动代理服务器');
            return;
        }

        try {
            console.log('正在启动代理服务器...');

            // 更新UI
            if (this.proxyServerStatus) {
                this.proxyServerStatus.textContent = '正在检查...';
                this.proxyServerStatus.className = 'status-pending';
            }

            // 尝试启动代理服务器（实际上只是检查状态并显示指导）
            await this.proxyManager.startProxy();

            // 状态更新会通过事件处理程序自动完成
        } catch (error) {
            console.error('启动代理服务器失败:', error);

            // 更新UI
            if (this.proxyServerStatus) {
                this.proxyServerStatus.textContent = '检查失败';
                this.proxyServerStatus.className = 'status-error';
            }
        }
    }

    /**
     * 停止代理服务器
     */
    async stopProxyServer() {
        if (!this.proxyManager) {
            console.warn('代理服务器管理器不可用，无法停止代理服务器');
            return;
        }

        try {
            console.log('正在停止代理服务器...');

            // 更新UI
            if (this.proxyServerStatus) {
                this.proxyServerStatus.textContent = '请手动停止';
                this.proxyServerStatus.className = 'status-pending';
            }

            // 显示停止指导（实际上无法自动停止）
            await this.proxyManager.stopProxy();

            // 状态更新会通过事件处理程序自动完成
        } catch (error) {
            console.error('停止代理服务器失败:', error);

            // 更新UI
            if (this.proxyServerStatus) {
                this.proxyServerStatus.textContent = '请手动停止';
                this.proxyServerStatus.className = 'status-error';
            }
        }
    }

    /**
     * 加载保存的配置
     */
    loadConfig() {
        try {
            // 从localStorage加载配置
            const savedConfig = localStorage.getItem('aliyunNLPConfig');
            let config = {};

            if (savedConfig) {
                config = JSON.parse(savedConfig);
            }

            // 允许启用阿里云NLP服务，即使没有输入AccessKey ID和AccessKey Secret
            config.enabled = config.enabled || false;

            // 设置UI元素
            this.enableAliyunNLPCheckbox.checked = config.enabled;
            this.aliyunAccessKeyIdInput.value = config.accessKeyId || '';
            this.aliyunAccessKeySecretInput.value = config.accessKeySecret || '';
            this.aliyunDebugModeCheckbox.checked = config.debug || false;

            // 确保匹配策略有一个有效的值
            if (!config.matchStrategy || config.matchStrategy === 'aliyun') {
                config.matchStrategy = 'auto';
            }

            // 设置UI元素
            if (this.aliyunMatchStrategySelect) {
                this.aliyunMatchStrategySelect.value = config.matchStrategy;
            }

            // 设置分词方法选择
            if (!config.tokenizer) {
                config.tokenizer = {
                    useBasicChinese: true,
                    useAdvancedChinese: false,
                    useMultiLanguage: false
                };
            }

            if (this.useBasicChineseCheckbox) {
                this.useBasicChineseCheckbox.checked = config.tokenizer.useBasicChinese !== false;
            }

            if (this.useAdvancedChineseCheckbox) {
                this.useAdvancedChineseCheckbox.checked = config.tokenizer.useAdvancedChinese === true;
            }

            if (this.useMultiLanguageCheckbox) {
                this.useMultiLanguageCheckbox.checked = config.tokenizer.useMultiLanguage === true;
            }

            // 设置词性过滤选项
            if (!config.filterSettings) {
                config.filterSettings = {
                    enabled: true,
                    filterPunctuation: true,
                    punctuationWeightThreshold: 10,
                    filterNumbers: true,
                    numberWeightThreshold: 80,
                    filterFunctionWords: true
                };
            }

            // 更新智能分类器的过滤设置
            if (this.smartClassifier && this.smartClassifier.classificationSettings) {
                this.smartClassifier.classificationSettings.filterSettings = config.filterSettings;
            }

            // 更新UI
            if (this.enablePosFilterCheckbox) {
                this.enablePosFilterCheckbox.checked = config.filterSettings.enabled !== false;
            }

            if (this.filterPunctuationCheckbox) {
                this.filterPunctuationCheckbox.checked = config.filterSettings.filterPunctuation !== false;
            }

            if (this.filterNumbersCheckbox) {
                this.filterNumbersCheckbox.checked = config.filterSettings.filterNumbers !== false;
            }

            if (this.filterFunctionWordsCheckbox) {
                this.filterFunctionWordsCheckbox.checked = config.filterSettings.filterFunctionWords !== false;
            }

            // 更新智能分类器配置
            if (this.smartClassifier) {
                this.smartClassifier.setAliyunNLPConfig({
                    enabled: config.enabled,
                    accessKeyId: config.accessKeyId,
                    accessKeySecret: config.accessKeySecret,
                    debug: config.debug,
                    tokenizer: config.tokenizer
                });
            }

            // 显示/隐藏设置面板
            if (this.enableAliyunNLPCheckbox.checked) {
                this.aliyunNLPSettings.style.display = 'block';
            } else {
                this.aliyunNLPSettings.style.display = 'none';
            }

            // 保存更新后的配置
            localStorage.setItem('aliyunNLPConfig', JSON.stringify(config));
        } catch (error) {
            console.error('加载阿里云NLP服务配置失败:', error);
        }
    }

    /**
     * 保存配置
     */
    saveConfig() {
        try {
            // 获取当前配置
            const accessKeyId = this.aliyunAccessKeyIdInput.value.trim();
            const accessKeySecret = this.aliyunAccessKeySecretInput.value.trim();

            // 允许启用阿里云NLP服务，即使没有输入AccessKey ID和AccessKey Secret
            const enabled = this.enableAliyunNLPCheckbox.checked;

            const config = {
                enabled: enabled,
                accessKeyId: accessKeyId,
                accessKeySecret: accessKeySecret,
                debug: this.aliyunDebugModeCheckbox.checked,
                matchStrategy: this.aliyunMatchStrategySelect ? this.aliyunMatchStrategySelect.value : 'auto',
                tokenizer: {
                    useBasicChinese: this.useBasicChineseCheckbox ? this.useBasicChineseCheckbox.checked : true,
                    useAdvancedChinese: this.useAdvancedChineseCheckbox ? this.useAdvancedChineseCheckbox.checked : false,
                    useMultiLanguage: this.useMultiLanguageCheckbox ? this.useMultiLanguageCheckbox.checked : false
                },
                filterSettings: {
                    enabled: this.enablePosFilterCheckbox ? this.enablePosFilterCheckbox.checked : true,
                    filterPunctuation: this.filterPunctuationCheckbox ? this.filterPunctuationCheckbox.checked : true,
                    punctuationWeightThreshold: 10,
                    filterNumbers: this.filterNumbersCheckbox ? this.filterNumbersCheckbox.checked : true,
                    numberWeightThreshold: 80,
                    filterFunctionWords: this.filterFunctionWordsCheckbox ? this.filterFunctionWordsCheckbox.checked : true
                }
            };

            // 如果没有输入AccessKey ID或AccessKey Secret，显示警告
            if (this.enableAliyunNLPCheckbox.checked && (!accessKeyId || !accessKeySecret)) {
                console.warn('阿里云NLP服务需要AccessKey ID和AccessKey Secret才能启用');
                alert('请输入阿里云AccessKey ID和AccessKey Secret以启用阿里云NLP服务');
            }

            // 保存到localStorage
            localStorage.setItem('aliyunNLPConfig', JSON.stringify(config));

            // 更新智能分类器配置
            if (this.smartClassifier) {
                this.smartClassifier.setAliyunNLPConfig({
                    enabled: config.enabled,
                    accessKeyId: config.accessKeyId,
                    accessKeySecret: config.accessKeySecret,
                    debug: config.debug,
                    tokenizer: config.tokenizer,
                    filterSettings: config.filterSettings
                });
            }

            console.log('阿里云NLP服务配置已保存');
        } catch (error) {
            console.error('保存阿里云NLP服务配置失败:', error);
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 启用/禁用阿里云NLP服务
        if (this.enableAliyunNLPCheckbox) {
            this.enableAliyunNLPCheckbox.addEventListener('change', () => {
                if (this.enableAliyunNLPCheckbox.checked) {
                    this.aliyunNLPSettings.style.display = 'block';

                    // 启动代理服务器
                    if (this.proxyManager) {
                        this.startProxyServer();
                    }
                } else {
                    this.aliyunNLPSettings.style.display = 'none';

                    // 停止代理服务器
                    if (this.proxyManager) {
                        this.stopProxyServer();
                    }
                }
                this.saveConfig();
                this.updateUI();
            });
        }

        // 配置变更事件
        const configInputs = [
            this.aliyunAccessKeyIdInput,
            this.aliyunAccessKeySecretInput,
            this.aliyunDebugModeCheckbox,
            this.aliyunMatchStrategySelect,
            this.useBasicChineseCheckbox,
            this.useAdvancedChineseCheckbox,
            this.useMultiLanguageCheckbox,
            this.enablePosFilterCheckbox,
            this.filterPunctuationCheckbox,
            this.filterNumbersCheckbox,
            this.filterFunctionWordsCheckbox
        ];

        configInputs.forEach(input => {
            if (input) {
                // 使用input事件而不是change事件，以便在用户输入时立即更新
                input.addEventListener('input', () => {
                    this.saveConfig();
                    this.updateUI();
                });

                // 同时保留change事件，以便在用户使用下拉菜单或复选框时更新
                input.addEventListener('change', () => {
                    this.saveConfig();
                    this.updateUI();
                });
            }
        });

        // 添加启动代理服务器按钮
        const startProxyBtn = document.getElementById('startProxyBtn');
        if (startProxyBtn) {
            startProxyBtn.addEventListener('click', () => {
                this.startProxyServer();
            });
        }

        // 添加验证AccessKey按钮
        if (this.validateAliyunKeyBtn) {
            this.validateAliyunKeyBtn.addEventListener('click', () => {
                this.validateAliyunKey();
            });
        }

        // 添加分词方法选择的互斥逻辑
        if (this.useBasicChineseCheckbox) {
            this.useBasicChineseCheckbox.addEventListener('change', () => {
                // 基础版中文分词至少要有一个选中
                if (!this.useBasicChineseCheckbox.checked &&
                    !this.useAdvancedChineseCheckbox.checked) {
                    this.useBasicChineseCheckbox.checked = true;
                    alert('至少需要选择一种中文分词方法');
                }
                this.saveConfig();
            });
        }

        if (this.useAdvancedChineseCheckbox) {
            this.useAdvancedChineseCheckbox.addEventListener('change', () => {
                // 如果选中高级版中文分词，可以取消基础版
                if (this.useAdvancedChineseCheckbox.checked) {
                    // 可以取消基础版，但不强制
                } else {
                    // 如果取消高级版，确保基础版选中
                    if (!this.useBasicChineseCheckbox.checked) {
                        this.useBasicChineseCheckbox.checked = true;
                    }
                }
                this.saveConfig();
            });
        }
    }

    /**
     * 验证阿里云AccessKey
     */
    async validateAliyunKey() {
        try {
            // 获取当前输入的AccessKey
            const accessKeyId = this.aliyunAccessKeyIdInput.value.trim();
            const accessKeySecret = this.aliyunAccessKeySecretInput.value.trim();

            // 检查是否输入了AccessKey
            if (!accessKeyId || !accessKeySecret) {
                this.showValidationResult(false, '请先填写AccessKey ID和AccessKey Secret');
                return;
            }

            // 显示验证中状态
            this.showValidationResult(null, '正在验证...');

            // 确保代理服务器正在运行
            if (this.proxyManager) {
                await this.startProxyServer();
            }

            // 创建临时适配器进行验证
            if (!this.smartClassifier || !this.smartClassifier.aliyunNLPAdapter) {
                this.showValidationResult(false, '无法创建阿里云NLP适配器，请检查配置');
                return;
            }

            // 设置当前输入的AccessKey
            this.smartClassifier.aliyunNLPAdapter.setOptions({
                accessKeyId: accessKeyId,
                accessKeySecret: accessKeySecret,
                enabled: true,
                debug: true
            });

            // 执行验证
            console.log('开始验证阿里云AccessKey...');
            const result = await this.smartClassifier.aliyunNLPAdapter.validateCredentials();
            console.log('验证结果:', result);

            // 显示验证结果
            this.showValidationResult(result.valid, result.message);

            // 如果验证成功，保存配置
            if (result.valid) {
                this.saveConfig();
                this.updateUI();
            }
        } catch (error) {
            console.error('验证阿里云AccessKey失败:', error);
            this.showValidationResult(false, `验证失败: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 显示验证结果
     * @param {boolean|null} isValid - 验证结果，null表示正在验证中
     * @param {string} message - 验证消息
     */
    showValidationResult(isValid, message) {
        if (!this.aliyunKeyValidationResult) return;

        // 显示结果元素
        this.aliyunKeyValidationResult.style.display = 'inline';

        // 设置样式和内容
        if (isValid === null) {
            // 验证中
            this.aliyunKeyValidationResult.className = 'validation-pending';
            this.aliyunKeyValidationResult.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        } else if (isValid) {
            // 验证成功
            this.aliyunKeyValidationResult.className = 'validation-success';
            this.aliyunKeyValidationResult.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        } else {
            // 验证失败
            this.aliyunKeyValidationResult.className = 'validation-error';
            this.aliyunKeyValidationResult.innerHTML = `<i class="fas fa-times-circle"></i> ${message}`;
        }

        // 3秒后自动隐藏失败消息
        if (isValid === false) {
            setTimeout(() => {
                if (this.aliyunKeyValidationResult) {
                    this.aliyunKeyValidationResult.style.display = 'none';
                }
            }, 5000);
        }
    }

    /**
     * 更新UI
     */
    updateUI() {
        try {
            // 获取服务状态
            if (this.smartClassifier && this.smartClassifier.getAliyunNLPConfig) {
                const config = this.smartClassifier.getAliyunNLPConfig();

                // 更新服务状态
                if (this.aliyunServiceStatus) {
                    if (config.isAvailable) {
                        this.aliyunServiceStatus.textContent = '已启用并可用';
                        this.aliyunServiceStatus.className = 'status-available';
                    } else if (config.enabled) {
                        this.aliyunServiceStatus.textContent = '已启用但不可用';
                        this.aliyunServiceStatus.className = 'status-error';
                    } else {
                        this.aliyunServiceStatus.textContent = '未启用';
                        this.aliyunServiceStatus.className = 'status-disabled';
                    }
                }

                // 更新请求统计
                if (config.requestStats && this.aliyunRequestStats) {
                    this.aliyunRequestStats.style.display = 'block';

                    if (this.aliyunRequestCount) {
                        this.aliyunRequestCount.textContent = config.requestStats.requestCount;
                    }

                    if (this.aliyunMaxRequests) {
                        this.aliyunMaxRequests.textContent = config.requestStats.maxRequestPerDay;
                    }

                    if (this.aliyunRemainingRequests) {
                        this.aliyunRemainingRequests.textContent = config.requestStats.remainingRequests;
                    }
                } else if (this.aliyunRequestStats) {
                    this.aliyunRequestStats.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('更新阿里云NLP服务UI失败:', error);
        }
    }
}

// 导出类
if (typeof window !== 'undefined') {
    window.TokenizationPanel = TokenizationPanel;
    // 保持向后兼容
    window.AliyunNLPPanel = TokenizationPanel;
}
