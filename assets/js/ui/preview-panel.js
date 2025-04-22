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
        const selectAllFiles = document.getElementById('selectAllFiles');
        if (selectAllFiles) {
            selectAllFiles.addEventListener('change', (e) => {
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

            row.innerHTML = `
                <td><input type="checkbox" class="file-select-checkbox" ${file.selected ? 'checked' : ''}></td>
                <td title="${file.originalName}">${file.originalName}</td>
                <td class="cat-id">${file.catID || '等待分类...'}</td>
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
            case 'pending':
            default:
                return '待处理';
        }
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
            catIdCell.textContent = file.catID || '等待分类...';
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
            // 执行翻译
            const translatedFiles = await this.fileProcessor.processTranslation(selectedFiles);

            // 更新文件数据
            this.files = this.files.map(file => {
                const translatedFile = translatedFiles.find(tf => tf.id === file.id);
                return translatedFile || file;
            });

            // 更新表格显示
            this._updatePreviewTable();

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
     * @private
     */
    _showStatusMessage(message) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.classList.add('show');

        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }
}

// 导出PreviewPanel
window.PreviewPanel = PreviewPanel;