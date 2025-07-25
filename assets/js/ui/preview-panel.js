/**
 * 预览面板
 * 用于显示和编辑翻译结果
 */
class PreviewPanel {
    /**
     * 构造函数
     * @param {FileProcessor} fileProcessor - 文件处理器实例
     */
    constructor(fileProcessor) {
        this.fileProcessor = fileProcessor;
        this.files = [];
        this.isProcessing = false;

        // 初始化事件监听器
        this._initEventListeners();
    }

    /**
     * 初始化事件监听器
     * @private
     */
    _initEventListeners() {
        // 开始翻译按钮
        const startTranslationBtn = document.getElementById('startTranslationBtn');
        if (startTranslationBtn) {
            startTranslationBtn.addEventListener('click', () => this.startTranslation());
        }

        // 应用文件名按钮
        const applyNamesBtn = document.getElementById('applyNamesBtn');
        if (applyNamesBtn) {
            applyNamesBtn.addEventListener('click', () => this.applyNames());
        }

        // 返回按钮
        const backToFilesBtn = document.getElementById('backToFilesBtn');
        if (backToFilesBtn) {
            backToFilesBtn.addEventListener('click', () => this.backToFiles());
        }

        // 全选/取消全选
        const selectAllPreviewFiles = document.getElementById('selectAllPreviewFiles');
        if (selectAllPreviewFiles) {
            selectAllPreviewFiles.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('#previewTableBody .file-select-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
    }

    /**
     * 显示文件预览
     * @param {Array} files - 文件列表
     */
    showPreview(files) {
        if (!files || files.length === 0) {
            return;
        }

        this.files = files;

        // 显示预览表格
        const previewTable = document.getElementById('previewTable');
        const previewPlaceholder = document.getElementById('previewPlaceholder');

        if (previewTable) {
            previewTable.style.display = 'table';
        }

        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'none';
        }

        // 更新表格内容
        this._updatePreviewTable();
    }

    /**
     * 更新预览表格
     * @private
     */
    _updatePreviewTable() {
        const tableBody = document.getElementById('previewTableBody');
        if (!tableBody) return;

        // 清空表格
        tableBody.innerHTML = '';

        // 添加文件行
        this.files.forEach(file => {
            const row = document.createElement('tr');
            row.dataset.fileId = file.id;

            // 调试：检查originalName属性
            if (!file.originalName || file.originalName === 'undefined') {
                console.warn(`文件 ${file.id} 的originalName为空或undefined:`, file);
                // 尝试从其他属性重建originalName
                file.originalName = (file.name || 'unknown') + (file.extension ? '.' + file.extension : '');
            }

            row.innerHTML = `
                <td><input type="checkbox" class="file-select-checkbox" ${file.selected ? 'checked' : ''}></td>
                <td title="${file.originalName || file.name || 'unknown'}">${file.originalName || file.name || 'unknown'}</td>
                <td class="cat-id">${file.catID || '等待分类...'}</td>
                <td class="alt-match">
                    ${this._createAlternateMatchDropdown(file)}
                </td>
                <td class="fx-name">${file.standardizedName || file.nameWithoutNumber || '等待翻译...'}</td>
                <td class="translation-result">${file.translatedName || '等待翻译...'}</td>
                <td class="final-name">${file.formattedName || '等待生成...'}</td>
                <td class="status-cell">
                    <span class="status-${file.status || 'pending'}">
                        ${this._getStatusText(file.status)}
                    </span>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * 获取状态文本
     * @param {string} status - 状态
     * @returns {string} 状态文本
     * @private
     */
    _getStatusText(status) {
        switch (status) {
            case 'success':
                return '已完成';
            case 'error':
                return '失败';
            case 'processing':
                return '处理中';
            case 'matching_complete':
                return '匹配完成';
            case 'pending':
            default:
                return '待处理';
        }
    }

    /**
     * 创建替代匹配下拉菜单
     * @param {Object} file - 文件对象
     * @returns {string} 下拉菜单HTML
     * @private
     */
    _createAlternateMatchDropdown(file) {
        // 如果文件还没有匹配结果或者正在处理中，显示等待消息
        if (!file.matchResults || file.matchResults.length === 0) {
            // 检查文件是否已经匹配成功但UI未更新
            if (file.matchSuccessful === true) {
                console.log(`文件 "${file.originalName}" 已匹配成功，但UI未更新`);
                // 创建一个默认的匹配结果，确保UI能够显示
                if (!file.matchResults) {
                    file.matchResults = [{
                        term: {
                            catID: file.catID || 'UNKNOWN',
                            catShort: file.category || 'UNK',
                            category: file.categoryName || 'Unknown',
                            categoryNameZh: file.categoryNameZh || '未知',
                            source: file.subCategory || file.nameWithoutNumber || '',
                            target: file.subCategoryTranslated || file.translatedName || ''
                        },
                        score: 100,
                        matchSource: 'default',
                        priority: 10
                    }];
                    file.availableMatchCount = 1;
                    file.currentMatchRank = 0;
                }
            } else if (file.status === 'processing' || file.status === 'pending') {
                return '等待匹配...';
            } else {
                return '无匹配结果';
            }
        }

        // 创建下拉菜单
        let html = `<select class="alt-match-select" data-file-id="${file.id}" ${file.status !== 'success' ? 'disabled' : ''}`;

        // 添加变更事件
        html += ` onchange="window.PreviewPanel.handleAlternateMatchChange(this, '${file.id}')">`;

        // 添加选项
        for (let i = 0; i < file.matchResults.length; i++) {
            const match = file.matchResults[i];
            const selected = i === file.currentMatchRank ? 'selected' : '';
            html += `<option value="${i}" ${selected}>匹配 ${i+1}: ${match.term.catID}</option>`;
        }

        // 如果没有匹配结果，添加一个禁用的选项
        if (file.matchResults.length === 0) {
            html += `<option value="-1" disabled>无匹配结果</option>`;
        }

        html += '</select>';
        return html;
    }

    /**
     * 更新行数据
     * @param {number} index - 行索引
     * @param {Object} file - 文件对象
     * @private
     */
    _updateRowData(index, file) {
        const tableBody = document.getElementById('previewTableBody');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        if (index >= rows.length) return;

        const row = rows[index];

        // 更新CatID
        const catIdCell = row.querySelector('.cat-id');
        if (catIdCell) {
            if (file.matchSuccessful && file.catID) {
                catIdCell.textContent = file.catID;
            } else {
                catIdCell.textContent = file.catID || '等待分类...';
            }
        }

        // 更新替代匹配下拉菜单
        const altMatchCell = row.querySelector('.alt-match');
        if (altMatchCell) {
            altMatchCell.innerHTML = this._createAlternateMatchDropdown(file);
        }

        // 更新英文描述(FXName)
        const fxNameCell = row.querySelector('.fx-name');
        if (fxNameCell) {
            fxNameCell.textContent = file.standardizedName || file.nameWithoutNumber || '';
        }

        // 更新中文描述(FXName_zh)
        const translationCell = row.querySelector('.translation-result');
        if (translationCell) {
            translationCell.textContent = file.translatedName || '';
        }

        // 更新最终文件名
        const finalNameCell = row.querySelector('.final-name');
        if (finalNameCell) {
            finalNameCell.textContent = file.formattedName || '';
        }

        // 更新状态
        const statusCell = row.querySelector('.status-cell');
        if (statusCell) {
            statusCell.innerHTML = `
                <span class="status-${file.status || 'pending'}">
                    ${this._getStatusText(file.status)}
                </span>
            `;
        }
    }

    /**
     * 开始翻译
     */
    async startTranslation() {
        if (this.isProcessing) {
            alert('翻译正在进行中，请等待完成');
            return;
        }

        // 获取选中的文件
        const selectedFiles = this._getSelectedFiles();

        if (selectedFiles.length === 0) {
            alert('请至少选择一个文件进行翻译');
            return;
        }

        this.isProcessing = true;

        // 禁用开始翻译按钮
        const startTranslationBtn = document.getElementById('startTranslationBtn');
        if (startTranslationBtn) {
            startTranslationBtn.disabled = true;
            startTranslationBtn.textContent = '翻译中...';
        }

        // 更新状态为处理中
        selectedFiles.forEach(file => {
            file.status = 'processing';
        });

        // 更新表格显示
        this._updatePreviewTable();

        try {
            // 执行翻译，并传入回调函数实现实时更新
            await this.fileProcessor.processTranslation(selectedFiles, (files, index) => {
                // 在每个文件处理完成后更新数据
                const processedFile = files[index];

                // 更新当前文件的数据
                this.files = this.files.map(file => {
                    if (file.id === processedFile.id) {
                        return processedFile;
                    }
                    return file;
                });

                // 更新表格中当前文件的行
                // 找到文件在数组中的索引
                const fileIndex = this.files.findIndex(f => f.id === processedFile.id);
                if (fileIndex !== -1) {
                    this._updateRowData(fileIndex, processedFile);
                }

                // 显示处理进度
                const processedCount = this.files.filter(f => f.status === 'success' || f.status === 'error').length;
                const totalCount = selectedFiles.length;
                this._showStatusMessage(`翻译进度: ${processedCount}/${totalCount}`);
            });

            // 启用应用文件名按钮
            const applyNamesBtn = document.getElementById('applyNamesBtn');
            if (applyNamesBtn) {
                applyNamesBtn.disabled = false;
            }

            // 显示成功消息
            this._showStatusMessage('翻译完成');
        } catch (error) {
            Logger.error('翻译处理失败', error);
            alert(`翻译失败: ${error.message}`);
        } finally {
            this.isProcessing = false;

            // 恢复开始翻译按钮
            if (startTranslationBtn) {
                startTranslationBtn.disabled = false;
                startTranslationBtn.textContent = '开始翻译';
            }
        }
    }

    /**
     * 应用文件名
     */
    async applyNames() {
        if (this.isProcessing) {
            alert('处理正在进行中，请等待完成');
            return;
        }

        // 获取翻译成功的文件
        const successFiles = this.files.filter(file =>
            file.status === 'success' && file.formattedName
        );

        if (successFiles.length === 0) {
            alert('没有可以应用的翻译结果，请先翻译文件');
            return;
        }

        if (!confirm(`确定要将 ${successFiles.length} 个文件重命名为翻译后的名称吗？`)) {
            return;
        }

        this.isProcessing = true;

        // 禁用应用按钮
        const applyNamesBtn = document.getElementById('applyNamesBtn');
        if (applyNamesBtn) {
            applyNamesBtn.disabled = true;
        }

        try {
            // 执行重命名
            const results = await this.fileProcessor.executeRename(successFiles);

            // 统计结果
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            // 显示结果消息
            if (failCount === 0) {
                alert(`所有 ${successCount} 个文件重命名成功！`);
            } else {
                alert(`重命名完成: ${successCount} 个成功, ${failCount} 个失败`);
            }

            // 返回文件选择
            this.backToFiles();
        } catch (error) {
            Logger.error('应用文件名失败', error);
            alert(`应用文件名失败: ${error.message}`);
        } finally {
            this.isProcessing = false;

            // 恢复应用按钮
            if (applyNamesBtn) {
                applyNamesBtn.disabled = false;
            }
        }
    }

    /**
     * 返回文件选择
     */
    backToFiles() {
        // 隐藏预览表格
        const previewTable = document.getElementById('previewTable');
        const previewPlaceholder = document.getElementById('previewPlaceholder');

        if (previewTable) {
            previewTable.style.display = 'none';
        }

        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'block';
        }

        // 清空文件列表
        this.files = [];

        // 清空表格
        const tableBody = document.getElementById('previewTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
        }

        // 禁用应用按钮
        const applyNamesBtn = document.getElementById('applyNamesBtn');
        if (applyNamesBtn) {
            applyNamesBtn.disabled = true;
        }

        // 滚动到文件选择区域
        const fileSelector = document.getElementById('fileSelector');
        if (fileSelector) {
            fileSelector.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * 获取选中的文件
     * @returns {Array} 选中的文件
     * @private
     */
    _getSelectedFiles() {
        const tableBody = document.getElementById('previewTableBody');
        if (!tableBody) return [];

        const selectedRows = Array.from(tableBody.querySelectorAll('tr')).filter(row => {
            const checkbox = row.querySelector('.file-select-checkbox');
            return checkbox && checkbox.checked;
        });

        return selectedRows.map(row => {
            const fileId = row.dataset.fileId;
            return this.files.find(file => file.id === fileId);
        }).filter(Boolean);
    }

    /**
     * 显示状态消息
     * @param {string} message - 状态消息
     * @param {boolean} autoHide - 是否自动隐藏消息
     * @private
     */
    _showStatusMessage(message, autoHide = true) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;

        // 清除之前的定时器
        if (this._statusMessageTimer) {
            clearTimeout(this._statusMessageTimer);
            this._statusMessageTimer = null;
        }

        statusElement.textContent = message;
        statusElement.classList.add('show');

        // 如果是进度消息，添加特殊样式并不自动隐藏
        const isProgressMessage = message.includes('进度:');
        if (isProgressMessage) {
            statusElement.classList.add('progress');
        } else {
            statusElement.classList.remove('progress');
        }

        if (autoHide && !isProgressMessage) {
            this._statusMessageTimer = setTimeout(() => {
                statusElement.classList.remove('show');
            }, 3000);
        }
    }
}

/**
 * 处理替代匹配变更的静态方法
 * @param {HTMLElement} selectElement - 选择元素
 * @param {string} fileId - 文件ID
 */
PreviewPanel.handleAlternateMatchChange = function(selectElement, fileId) {
    try {
        // 获取当前页面上的PreviewPanel实例
        const previewPanels = Object.values(window).filter(obj => obj instanceof PreviewPanel);
        if (previewPanels.length === 0) {
            console.error('找不到PreviewPanel实例');
            alert('内部错误：找不到PreviewPanel实例');
            return;
        }

        const previewPanel = previewPanels[0];
        const newRank = parseInt(selectElement.value, 10);

        // 找到对应的文件
        const file = previewPanel.files.find(f => f.id === fileId);
        if (!file) {
            console.error(`找不到ID为 ${fileId} 的文件`);
            alert(`内部错误：找不到ID为 ${fileId} 的文件`);
            return;
        }

        // 检查文件是否有匹配结果
        if (!file.matchResults || !Array.isArray(file.matchResults)) {
            console.error('文件没有匹配结果数组');
            alert('内部错误：文件没有匹配结果数组');
            return;
        }

        // 更新文件的当前匹配排名
        file.currentMatchRank = newRank;

        // 获取新的匹配结果
        const newMatch = file.matchResults[newRank];

        if (!newMatch) {
            console.error(`找不到排名为 ${newRank} 的匹配结果`);
            alert(`内部错误：找不到排名为 ${newRank} 的匹配结果`);
            return;
        }

        // 检查匹配结果是否有term属性
        if (!newMatch.term) {
            console.error('匹配结果没有term属性', newMatch);
            alert('内部错误：匹配结果格式不正确');
            return;
        }

        // 更新文件的分类信息
        file.category = newMatch.term.catShort || '';
        file.categoryName = newMatch.term.category || '';
        file.categoryNameZh = newMatch.term.categoryNameZh || '';
        file.subCategory = newMatch.term.source || '';
        file.subCategoryTranslated = newMatch.term.target || '';
        file.catID = newMatch.term.catID || '';

        // 重新生成最终文件名
        if (window.pluginState && window.pluginState.fileProcessor) {
            const newFileName = window.pluginState.fileProcessor.formatFileName(file);
        } else {
            console.error('找不到fileProcessor实例');
        }

        // 找到文件在数组中的索引
        const fileIndex = previewPanel.files.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            // 更新表格中当前文件的行
            previewPanel._updateRowData(fileIndex, file);
        } else {
            console.error('找不到文件在数组中的索引');
        }

        // 显示状态消息
        previewPanel._showStatusMessage(`已应用第 ${newRank+1} 佳匹配结果：${newMatch.term.catID}`);
    } catch (error) {
        console.error('处理替代匹配变更时发生错误：', error);
        alert(`处理替代匹配变更时发生错误：${error.message}`);
    }
};

// 导出PreviewPanel
window.PreviewPanel = PreviewPanel;