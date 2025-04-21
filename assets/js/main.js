/**
 * 音效文件名翻译插件主脚本
 */

// 全局状态
window.pluginState = {
    initialized: false,
    translationService: null,
    csvMatcher: null,
    namingRules: null,
    fileProcessor: null,
    fileSelector: null,
    translationPanel: null,
    previewPanel: null
};

/**
 * 更新加载状态
 * @param {string} status - 状态信息
 */
function updateLoadingStatus(status) {
    console.log('加载状态:', status);
    const statusElement = document.getElementById('loadingStatus');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * 显示加载错误
 * @param {string} message - 错误信息
 */
function showLoadingError(message) {
    console.error('加载错误:', message);
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingError = document.getElementById('loadingError');
    const errorMessage = document.getElementById('errorMessage');

    if (loadingError && errorMessage) {
        errorMessage.textContent = message || '请刷新页面或重启 Eagle 后重试。';
        loadingError.style.display = 'block';

        // 隐藏加载动画
        const spinner = loadingIndicator.querySelector('div');
        const loadingText = loadingIndicator.querySelector('p:not(#loadingStatus)');
        if (spinner) spinner.style.display = 'none';
        if (loadingText) loadingText.style.display = 'none';
        if (document.getElementById('loadingStatus')) {
            document.getElementById('loadingStatus').style.display = 'none';
        }
    }
}

/**
 * 隐藏加载指示器并显示应用
 */
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const appElement = document.getElementById('app');

    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    if (appElement) {
        appElement.style.display = 'flex';
    }
}

/**
 * 初始化插件
 */
function initPlugin() {
    if (window.pluginState.initialized) {
        hideLoadingIndicator();
        return;
    }

    try {
        console.log('初始化插件');
        updateLoadingStatus('初始化插件核心组件...');

        // 初始化翻译服务
        window.pluginState.translationService = new TranslationService();
        console.log('翻译服务初始化成功');
        updateLoadingStatus('翻译服务已就绪');

        // 初始化命名规则引擎
        window.pluginState.namingRules = new NamingRules();
        console.log('命名规则引擎初始化成功');
        updateLoadingStatus('命名规则引擎已就绪');

        // 初始化CSV匹配器
        try {
            console.log('CSV匹配器初始化开始');
            updateLoadingStatus('加载术语库...');
            window.pluginState.csvMatcher = new CSVMatcher('./assets/data/categorylist.csv');
            console.log('CSV匹配器初始化完成');
            updateLoadingStatus('术语库加载完成');
        } catch (csvError) {
            console.error('CSV匹配器初始化失败:', csvError);
            updateLoadingStatus('术语库加载失败，使用默认配置');
            // 创建一个空的CSV匹配器，避免后续代码出错
            window.pluginState.csvMatcher = {
                loaded: false,
                terms: [],
                categories: [],
                findMatch: function() { return null; },
                identifyCategory: function() { return ''; }
            };
        }

        // 初始化文件处理器
        updateLoadingStatus('初始化文件处理器...');
        window.pluginState.fileProcessor = new FileProcessor(
            window.pluginState.translationService,
            window.pluginState.csvMatcher,
            window.pluginState.namingRules
        );
        console.log('文件处理器初始化成功');
        updateLoadingStatus('文件处理器已就绪');

        // 等待 DOM 加载完成后再初始化 UI 组件
        const initUIComponents = function() {
            try {
                console.log('开始初始化 UI 组件');
                updateLoadingStatus('初始化用户界面...');

                // 初始化翻译面板
                window.pluginState.translationPanel = new TranslationPanel(
                    window.pluginState.translationService
                );
                console.log('翻译面板初始化成功');
                updateLoadingStatus('翻译面板已就绪');

                // 初始化预览面板
                window.pluginState.previewPanel = new PreviewPanel(
                    window.pluginState.fileProcessor
                );
                console.log('预览面板初始化成功');
                updateLoadingStatus('预览面板已就绪');

                // 初始化文件选择器
                window.pluginState.fileSelector = new FileSelector(
                    window.pluginState.fileProcessor,
                    function(files) {
                        // 选中文件后的回调
                        updateStatus('已选择 ' + files.length + ' 个音频文件');

                        // 更新预览面板
                        if (window.pluginState.previewPanel) {
                            window.pluginState.previewPanel.showPreview(files);
                        }

                        // 激活工作流程步骤
                        activateWorkflowStep(2);
                    }
                );
                console.log('文件选择器初始化成功');
                updateLoadingStatus('文件选择器已就绪');

                // 初始化主题管理器
                initThemeManager();

                // 初始化命名规则设置
                initNamingRuleSettings();

                // 初始化翻译设置
                initTranslationSettings();

                window.pluginState.initialized = true;
                console.log('UI组件初始化完成');
                updateLoadingStatus('插件加载完成');

                // 隐藏加载指示器，显示应用
                setTimeout(hideLoadingIndicator, 500);

                // 显示成功信息
                console.log('插件初始化完成！可以开始使用了。');
            } catch (error) {
                console.error('UI组件初始化失败:', error);
                showLoadingError('UI组件初始化失败: ' + error.message);
            }
        };

        // 根据 DOM 加载状态决定初始化时机
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUIComponents);
        } else {
            initUIComponents();
        }
    } catch (error) {
        console.error('插件初始化失败:', error);
        showLoadingError('插件初始化失败: ' + error.message);
    }
}

/**
 * 更新状态提示
 * @param {string} message - 状态消息
 */
function updateStatus(message) {
    try {
        console.log('状态更新: ' + message);

        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.classList.add('show');

            setTimeout(function() {
                statusElement.classList.remove('show');
            }, 3000);
        }
    } catch (error) {
        console.error('更新状态失败:', error);
    }
}

/**
 * 激活工作流程步骤
 * @param {number} stepNumber - 步骤编号
 */
function activateWorkflowStep(stepNumber) {
    const workflowSteps = document.querySelectorAll('.workflow-step');
    workflowSteps.forEach(function(step, index) {
        if (index + 1 < stepNumber) {
            step.classList.remove('active');
            step.classList.add('completed');
        } else if (index + 1 === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active');
            step.classList.remove('completed');
        }
    });
}

/**
 * 初始化主题管理器
 */
function initThemeManager() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const themeIcon = themeToggle.querySelector('i');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem('theme');

    // 检查是否应该使用深色主题
    function shouldUseDarkTheme() {
        // 如果用户之前选择了主题，遵循用户的选择
        if (storedTheme) {
            return storedTheme === 'dark';
        }

        // 否则根据Eagle的应用主题或系统偏好设置
        try {
            // 尝试获取Eagle的主题设置，如果可能的话
            if (typeof eagle !== 'undefined' && eagle.app && typeof eagle.app.getTheme === 'function') {
                const eagleTheme = eagle.app.getTheme();
                return eagleTheme === 'dark';
            }
        } catch (e) {
            console.error('无法获取Eagle主题:', e);
        }

        // 回退到系统偏好
        return prefersDarkScheme.matches;
    }

    // 应用主题
    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }
    }

    // 切换主题
    function toggleTheme() {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        applyTheme(!isDarkTheme);
    }

    // 初始化主题
    applyTheme(shouldUseDarkTheme());

    // 注册切换事件
    themeToggle.addEventListener('click', toggleTheme);

    // 监听系统主题变化
    prefersDarkScheme.addEventListener('change', function(e) {
        // 只有当用户没有手动设置主题时才跟随系统变化
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches);
        }
    });
}

/**
 * 初始化命名规则设置
 */
function initNamingRuleSettings() {
    // UCS命名规则开关
    const useUCSNaming = document.getElementById('useUCSNaming');
    const ucsNamingOptions = document.getElementById('ucsNamingOptions');
    const traditionalNamingOptions = document.getElementById('traditionalNamingOptions');

    if (useUCSNaming && ucsNamingOptions && traditionalNamingOptions) {
        // 初始化显示/隐藏相应的设置面板
        if (useUCSNaming.checked) {
            ucsNamingOptions.style.display = 'block';
            traditionalNamingOptions.style.display = 'none';
        } else {
            ucsNamingOptions.style.display = 'none';
            traditionalNamingOptions.style.display = 'block';
        }

        // 监听开关变化
        useUCSNaming.addEventListener('change', function() {
            if (this.checked) {
                ucsNamingOptions.style.display = 'block';
                traditionalNamingOptions.style.display = 'none';
            } else {
                ucsNamingOptions.style.display = 'none';
                traditionalNamingOptions.style.display = 'block';
            }

            // 更新命名规则设置
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    useUCS: this.checked
                });
                updateNamingPreview();
            }
        });
    }

    // UCS命名元素复选框
    const elementIds = [
        'catID', 'category', 'category_zh', 'subCategory', 'subCategory_zh',
        'fxName', 'fxName_zh', 'creatorID', 'sourceID', 'serialNumber'
    ];

    elementIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                if (window.pluginState.namingRules) {
                    const elements = window.pluginState.namingRules.settings.elements || {};
                    elements[id] = this.checked;

                    window.pluginState.namingRules.setSettings({
                        elements: elements
                    });

                    updateNamingPreview();
                }
            });
        }
    });

    // CreatorID和SourceID输入框
    const creatorIDInput = document.getElementById('creatorIDValue');
    if (creatorIDInput) {
        creatorIDInput.addEventListener('input', function() {
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    creatorID: this.value
                });
                updateNamingPreview();
            }
        });
    }

    const sourceIDInput = document.getElementById('sourceIDValue');
    if (sourceIDInput) {
        sourceIDInput.addEventListener('input', function() {
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    sourceID: this.value
                });
                updateNamingPreview();
            }
        });
    }

    // UCS分隔符选择
    const ucsSeparatorSelect = document.getElementById('ucsSeparator');
    if (ucsSeparatorSelect) {
        ucsSeparatorSelect.addEventListener('change', function() {
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    separator: this.value
                });
                updateNamingPreview();
            }
        });
    }

    // 传统命名规则设置
    // 命名格式选择
    const namingFormatSelect = document.getElementById('namingFormat');
    const customFormatDiv = document.querySelector('.custom-format');

    if (namingFormatSelect && customFormatDiv) {
        // 初始化显示/隐藏自定义格式
        if (namingFormatSelect.value === 'custom') {
            customFormatDiv.style.display = 'flex';
        } else {
            customFormatDiv.style.display = 'none';
        }

        // 监听格式变化
        namingFormatSelect.addEventListener('change', function() {
            if (namingFormatSelect.value === 'custom') {
                customFormatDiv.style.display = 'flex';
            } else {
                customFormatDiv.style.display = 'none';
            }

            // 更新命名规则设置
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    format: namingFormatSelect.value
                });
            }
        });
    }

    // 分隔符设置
    const separatorInput = document.getElementById('separator');
    if (separatorInput) {
        separatorInput.addEventListener('change', function() {
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    separator: separatorInput.value
                });
            }
        });
    }

    // 自定义模板设置
    const customTemplateInput = document.getElementById('customTemplate');
    if (customTemplateInput) {
        customTemplateInput.addEventListener('change', function() {
            if (window.pluginState.namingRules) {
                window.pluginState.namingRules.setSettings({
                    template: customTemplateInput.value
                });
            }
        });
    }

    // 初始化命名预览
    updateNamingPreview();
}

/**
 * 更新命名预览
 */
function updateNamingPreview() {
    const previewElement = document.getElementById('namingPreview');
    if (!previewElement || !window.pluginState.namingRules) return;

    if (window.pluginState.namingRules.settings.useUCS) {
        previewElement.textContent = window.pluginState.namingRules._getUCSPreviewFormat();
    } else {
        previewElement.textContent = window.pluginState.namingRules.getPreviewFormat();
    }
}

/**
 * 初始化翻译设置
 */
function initTranslationSettings() {
    // 标签页切换
    const tabLinks = document.querySelectorAll('.nav-tabs a');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // 移除所有标签页的活动状态
            tabLinks.forEach(l => l.parentElement.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // 激活当前标签页
            this.parentElement.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 翻译服务选择
    const translationProviderSelect = document.getElementById('translationProvider');
    const zhipuSettings = document.getElementById('zhipuSettings');
    const deepseekSettings = document.getElementById('deepseekSettings');
    const openrouterSettings = document.getElementById('openrouterSettings');
    const googleSettings = document.getElementById('googleSettings');
    const libreSettings = document.getElementById('libreSettings');

    if (translationProviderSelect) {
        // 初始化显示/隐藏相应的设置面板
        function updateProviderSettings() {
            const provider = translationProviderSelect.value;

            if (zhipuSettings) zhipuSettings.style.display = provider === 'zhipu' ? 'block' : 'none';
            if (deepseekSettings) deepseekSettings.style.display = provider === 'deepseek' ? 'block' : 'none';
            if (openrouterSettings) openrouterSettings.style.display = provider === 'openrouter' ? 'block' : 'none';
            if (googleSettings) googleSettings.style.display = provider === 'google' ? 'block' : 'none';
            if (libreSettings) libreSettings.style.display = provider === 'libre' ? 'block' : 'none';

            // 更新翻译服务设置
            if (window.pluginState.translationService) {
                window.pluginState.translationService.setProvider(provider);
            }
        }

        // 初始化显示
        updateProviderSettings();

        // 监听变化
        translationProviderSelect.addEventListener('change', updateProviderSettings);
    }

    // 源语言和目标语言设置
    const sourceLanguageSelect = document.getElementById('sourceLanguage');
    const targetLanguageSelect = document.getElementById('targetLanguage');

    if (sourceLanguageSelect && window.pluginState.translationService) {
        sourceLanguageSelect.addEventListener('change', function() {
            window.pluginState.translationService.setSourceLanguage(this.value);
        });

        // 设置初始值
        window.pluginState.translationService.setSourceLanguage(sourceLanguageSelect.value);
    }

    if (targetLanguageSelect && window.pluginState.translationService) {
        targetLanguageSelect.addEventListener('change', function() {
            window.pluginState.translationService.setTargetLanguage(this.value);
        });

        // 设置初始值
        window.pluginState.translationService.setTargetLanguage(targetLanguageSelect.value);
    }

    // AI模型设置
    const useAICheckbox = document.getElementById('useAI');
    const aiModelSelect = document.getElementById('aiModel');
    const customModelContainer = document.getElementById('customModelContainer');
    const customModelIdInput = document.getElementById('customModelId');
    const openrouterKeyInput = document.getElementById('openrouterKey');

    if (useAICheckbox && window.pluginState.translationService) {
        useAICheckbox.addEventListener('change', function() {
            window.pluginState.translationService.setUseAI(this.checked);
        });

        // 设置初始值
        window.pluginState.translationService.setUseAI(useAICheckbox.checked);
    }

    // 模型选择与自定义模型ID处理
    if (aiModelSelect && window.pluginState.translationService) {
        // 显示/隐藏自定义模型输入框
        aiModelSelect.addEventListener('change', function() {
            if (this.value === 'custom' && customModelContainer) {
                customModelContainer.style.display = 'flex';

                // 如果有保存的自定义模型ID，使用它
                if (customModelIdInput && customModelIdInput.value) {
                    window.pluginState.translationService.setAIModel(customModelIdInput.value);
                }
            } else {
                if (customModelContainer) {
                    customModelContainer.style.display = 'none';
                }
                window.pluginState.translationService.setAIModel(this.value);
            }
        });

        // 自定义模型ID输入框事件
        if (customModelIdInput) {
            customModelIdInput.addEventListener('input', function() {
                if (aiModelSelect.value === 'custom' && this.value) {
                    window.pluginState.translationService.setAIModel(this.value);
                }
            });

            // 从本地存储加载自定义模型ID
            const savedCustomModel = localStorage.getItem('customModelId');
            if (savedCustomModel) {
                customModelIdInput.value = savedCustomModel;
            }

            // 保存到本地存储
            customModelIdInput.addEventListener('blur', function() {
                if (this.value) {
                    localStorage.setItem('customModelId', this.value);
                }
            });
        }

        // 初始化显示/隐藏自定义模型输入框
        if (aiModelSelect.value === 'custom' && customModelContainer) {
            customModelContainer.style.display = 'flex';
        } else if (customModelContainer) {
            customModelContainer.style.display = 'none';
        }

        // 设置初始值
        if (aiModelSelect.value === 'custom' && customModelIdInput && customModelIdInput.value) {
            window.pluginState.translationService.setAIModel(customModelIdInput.value);
        } else {
            window.pluginState.translationService.setAIModel(aiModelSelect.value);
        }
    }

    // 智谱AI设置
    const zhipuKeyInput = document.getElementById('zhipuKey');
    const zhipuModelSelect = document.getElementById('zhipuModel');

    if (zhipuKeyInput && window.pluginState.translationService) {
        zhipuKeyInput.addEventListener('change', function() {
            window.pluginState.translationService.setAPIKey('zhipu', this.value);
        });

        // 从本地存储加载密钥（如果有）
        const savedKey = localStorage.getItem('zhipuKey');
        if (savedKey) {
            zhipuKeyInput.value = savedKey;
            window.pluginState.translationService.setAPIKey('zhipu', savedKey);
        }

        // 保存到本地存储
        zhipuKeyInput.addEventListener('blur', function() {
            if (this.value) {
                localStorage.setItem('zhipuKey', this.value);
            }
        });
    }

    if (zhipuModelSelect && window.pluginState.translationService) {
        zhipuModelSelect.addEventListener('change', function() {
            window.pluginState.translationService.setZhipuModel(this.value);
        });

        // 从本地存储加载模型设置（如果有）
        const savedModel = localStorage.getItem('zhipuModel');
        if (savedModel) {
            zhipuModelSelect.value = savedModel;
            window.pluginState.translationService.setZhipuModel(savedModel);
        } else {
            // 设置初始值
            window.pluginState.translationService.setZhipuModel(zhipuModelSelect.value);
        }

        // 保存到本地存储
        zhipuModelSelect.addEventListener('blur', function() {
            localStorage.setItem('zhipuModel', this.value);
        });
    }

    // Deepseek设置
    const deepseekKeyInput = document.getElementById('deepseekKey');

    if (deepseekKeyInput && window.pluginState.translationService) {
        deepseekKeyInput.addEventListener('change', function() {
            window.pluginState.translationService.setAPIKey('deepseek', this.value);
        });

        // 从本地存储加载密钥（如果有）
        const savedKey = localStorage.getItem('deepseekKey');
        if (savedKey) {
            deepseekKeyInput.value = savedKey;
            window.pluginState.translationService.setAPIKey('deepseek', savedKey);
        }

        // 保存到本地存储
        deepseekKeyInput.addEventListener('blur', function() {
            if (this.value) {
                localStorage.setItem('deepseekKey', this.value);
            }
        });
    }

    // Deepseek仅支持deepseek-chat模型，因此不需要模型选择的处理代码

    // OpenRouter设置
    if (openrouterKeyInput && window.pluginState.translationService) {
        openrouterKeyInput.addEventListener('change', function() {
            window.pluginState.translationService.setAPIKey('openrouter', this.value);
        });

        // 从本地存储加载密钥（如果有）
        const savedKey = localStorage.getItem('openrouterKey');
        if (savedKey) {
            openrouterKeyInput.value = savedKey;
            window.pluginState.translationService.setAPIKey('openrouter', savedKey);
        }

        // 保存到本地存储
        openrouterKeyInput.addEventListener('blur', function() {
            if (this.value) {
                localStorage.setItem('openrouterKey', this.value);
            }
        });
    }

    // LibreTranslate设置
    const libreEndpointInput = document.getElementById('libreEndpoint');
    const libreKeyInput = document.getElementById('libreKey');

    if (libreEndpointInput && window.pluginState.translationService) {
        libreEndpointInput.addEventListener('change', function() {
            window.pluginState.translationService.setLibreEndpoint(this.value);
        });

        // 从本地存储加载端点（如果有）
        const savedEndpoint = localStorage.getItem('libreEndpoint');
        if (savedEndpoint) {
            libreEndpointInput.value = savedEndpoint;
            window.pluginState.translationService.setLibreEndpoint(savedEndpoint);
        }

        // 保存到本地存储
        libreEndpointInput.addEventListener('blur', function() {
            if (this.value) {
                localStorage.setItem('libreEndpoint', this.value);
            }
        });
    }

    if (libreKeyInput && window.pluginState.translationService) {
        libreKeyInput.addEventListener('change', function() {
            window.pluginState.translationService.setAPIKey('libre', this.value);
        });

        // 从本地存储加载密钥（如果有）
        const savedKey = localStorage.getItem('libreKey');
        if (savedKey) {
            libreKeyInput.value = savedKey;
            window.pluginState.translationService.setAPIKey('libre', savedKey);
        }

        // 保存到本地存储
        libreKeyInput.addEventListener('blur', function() {
            if (this.value) {
                localStorage.setItem('libreKey', this.value);
            }
        });
    }

    // 自定义提示设置
    const customPromptIDSelect = document.getElementById('customPromptID');
    const customPromptContainer = document.getElementById('customPromptContainer');
    const promptTemplateTextarea = document.getElementById('promptTemplate');

    if (customPromptIDSelect && window.pluginState.translationService) {
        // 显示/隐藏自定义提示模板输入框
        customPromptIDSelect.addEventListener('change', function() {
            if (this.value === 'custom' && customPromptContainer) {
                customPromptContainer.style.display = 'block';

                // 如果有保存的自定义提示模板，使用它
                if (promptTemplateTextarea && promptTemplateTextarea.value) {
                    window.pluginState.translationService.setPromptTemplate(promptTemplateTextarea.value);
                }
            } else {
                if (customPromptContainer) {
                    customPromptContainer.style.display = 'none';
                }
                window.pluginState.translationService.setCustomPrompt(this.value);
                updateStatus(`已应用提示风格: ${this.options[this.selectedIndex].text}`);
            }
        });

        // 从本地存储加载自定义提示ID
        const savedPromptID = localStorage.getItem('customPromptID');
        if (savedPromptID) {
            customPromptIDSelect.value = savedPromptID;

            // 如果是自定义提示，显示自定义提示模板输入框
            if (savedPromptID === 'custom' && customPromptContainer) {
                customPromptContainer.style.display = 'block';
            }

            // 设置初始值
            window.pluginState.translationService.setCustomPrompt(savedPromptID);
        }

        // 保存到本地存储
        customPromptIDSelect.addEventListener('change', function() {
            localStorage.setItem('customPromptID', this.value);
        });
    }

    // 自定义提示模板输入框
    if (promptTemplateTextarea && window.pluginState.translationService) {
        promptTemplateTextarea.addEventListener('input', function() {
            if (customPromptIDSelect.value === 'custom') {
                window.pluginState.translationService.setPromptTemplate(this.value);
            }
        });

        // 从本地存储加载自定义提示模板
        const savedPromptTemplate = localStorage.getItem('promptTemplate');
        if (savedPromptTemplate) {
            promptTemplateTextarea.value = savedPromptTemplate;
            window.pluginState.translationService.setPromptTemplate(savedPromptTemplate);
        }

        // 保存到本地存储
        promptTemplateTextarea.addEventListener('blur', function() {
            if (this.value) {
                localStorage.setItem('promptTemplate', this.value);
            }
        });
    }

    // 初始化显示/隐藏自定义提示模板输入框
    if (customPromptIDSelect && customPromptContainer) {
        if (customPromptIDSelect.value === 'custom') {
            customPromptContainer.style.display = 'block';
        } else {
            customPromptContainer.style.display = 'none';
        }
    }

    // 缓存和术语库设置
    const useCacheCheckbox = document.getElementById('useCache');
    const useCSVCheckbox = document.getElementById('useCSV');
    const useAIClassificationCheckbox = document.getElementById('useAIClassification');

    if (useCacheCheckbox && window.pluginState.translationService) {
        useCacheCheckbox.addEventListener('change', function() {
            window.pluginState.translationService.setUseCache(this.checked);
        });

        // 设置初始值
        window.pluginState.translationService.setUseCache(useCacheCheckbox.checked);
    }

    if (useCSVCheckbox && window.pluginState.fileProcessor) {
        useCSVCheckbox.addEventListener('change', function() {
            window.pluginState.fileProcessor.setUseCSV(this.checked);
        });

        // 设置初始值
        window.pluginState.fileProcessor.setUseCSV(useCSVCheckbox.checked);
    }

    // AI辅助分类匹配设置
    if (useAIClassificationCheckbox && window.pluginState.csvMatcher) {
        useAIClassificationCheckbox.addEventListener('change', function() {
            window.pluginState.csvMatcher.setAIClassifier(this.checked);

            // 显示状态提示
            updateStatus('AI辅助分类匹配功能已' + (this.checked ? '启用' : '禁用'));

            // 如果启用了AI辅助分类匹配，但没有加载AI分类器脚本，显示警告
            if (this.checked && !window.AIClassifier) {
                console.warn('AI分类器脚本未加载，请检查是否已包含ai-classifier.js');
                updateStatus('警告：AI分类器脚本未加载，该功能可能无法正常工作');
            }
        });

        // 从本地存储加载设置（如果有）
        const savedAIClassification = localStorage.getItem('useAIClassification');
        if (savedAIClassification === 'true') {
            useAIClassificationCheckbox.checked = true;
            window.pluginState.csvMatcher.setAIClassifier(true);
        }

        // 保存到本地存储
        useAIClassificationCheckbox.addEventListener('change', function() {
            localStorage.setItem('useAIClassification', this.checked);
        });
    }
}

// 检查所有必要的类是否已加载
function checkDependencies() {
    const requiredClasses = [
        'TranslationService',
        'TranslationProvider',
        'GoogleTranslateProvider',
        'LibreTranslateProvider',
        'NamingRules',
        'CSVMatcher',
        'FileProcessor',
        'FileSelector',
        'TranslationPanel',
        'PreviewPanel',
        'Cache',
        'Logger',
        'Validator'
    ];

    const missing = [];
    for (const className of requiredClasses) {
        if (typeof window[className] === 'undefined') {
            missing.push(className);
        }
    }

    if (missing.length > 0) {
        console.error('缺少必要的类:', missing.join(', '));
        return false;
    }

    return true;
}

// 在页面加载完成后初始化插件
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，准备初始化插件');

    // 尝试初始化插件，如果失败则重试几次
    let attempts = 0;
    const maxAttempts = 5;

    function tryInitPlugin() {
        attempts++;
        console.log(`尝试初始化插件 (第${attempts}次)`);
        updateLoadingStatus(`正在检查环境... (第${attempts}次尝试)`);

        // 检查Eagle API和依赖项
        if (typeof eagle !== 'undefined' && checkDependencies()) {
            console.log('所有依赖项已就绪，开始初始化插件');
            updateLoadingStatus('环境检查完成，开始初始化插件');
            initPlugin();
            return true;
        } else {
            console.warn(`Eagle环境或依赖项未就绪 (第${attempts}次尝试)`);

            // 检查缺失的依赖项
            const missingDeps = [];
            if (typeof eagle === 'undefined') missingDeps.push('Eagle API');

            const requiredClasses = [
                'TranslationService', 'TranslationProvider', 'GoogleTranslateProvider',
                'LibreTranslateProvider', 'NamingRules', 'CSVMatcher', 'FileProcessor'
            ];

            for (const className of requiredClasses) {
                if (typeof window[className] === 'undefined') {
                    missingDeps.push(className);
                }
            }

            updateLoadingStatus(`等待缺失的组件: ${missingDeps.join(', ')}`);

            if (attempts < maxAttempts) {
                // 等待一段时间后重试
                setTimeout(tryInitPlugin, 500 * attempts);
            } else {
                console.error(`已尝试${maxAttempts}次初始化插件，但仍然失败`);
                showLoadingError(`插件初始化失败，缺失组件: ${missingDeps.join(', ')}。请刷新页面或重启 Eagle 后重试。`);
            }
            return false;
        }
    }

    // 开始尝试初始化
    tryInitPlugin();
});