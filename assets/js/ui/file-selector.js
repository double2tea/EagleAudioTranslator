/**
 * 文件选择器类
 * 负责处理文件选择相关的UI交互
 */
class FileSelector {
    constructor() {
        this.selectedFiles = [];
        this.onFilesSelected = null;
        this.folderTreeSelector = null;
        this._initializeEventListeners();
        this._initializeFolderTreeSelector();
    }

    /**
     * 初始化事件监听器
     * @private
     */
    _initializeEventListeners() {
        // 从当前选中获取文件
        const selectedBtn = document.getElementById('selectFromCurrent');
        if (selectedBtn) {
            selectedBtn.addEventListener('click', () => this._selectFromSelected());
        }

        // 从标签获取文件
        const tagBtn = document.getElementById('selectFromTag');
        if (tagBtn) {
            tagBtn.addEventListener('click', () => this._selectFromTag());
        }


    }

    /**
     * 从当前选中获取文件
     * @private
     */
    async _selectFromSelected() {
        try {
            this._showLoading('正在获取当前选中的文件...');
            
            const selectedItems = await eagle.item.getSelected();

            if (!selectedItems || selectedItems.length === 0) {
                this._showError('请先在Eagle中选择文件，然后再点击"从选中"按钮');
                return;
            }

            this._updateSelectedFiles(selectedItems);
        } catch (error) {
            this._showError(`从选中获取文件失败: ${error.message}`);
            Logger.error('从选中获取文件失败', error);
        } finally {
            this._hideLoading();
        }
    }



    /**
     * 从标签获取文件
     * @private
     */
    async _selectFromTag() {
        try {
            // 创建一个标签输入对话框
            const dialogHTML = `
                <div id="tagInputDialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:1000;max-width:80%;width:400px;">
                    <h3 style="margin-top:0;margin-bottom:15px;">输入标签名称</h3>
                    <div style="margin-bottom:15px;">
                        <input type="text" id="tagInput" placeholder="输入标签名称" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:10px;">
                        <button id="tagInputCancel" style="padding:8px 16px;background:#f5f5f5;border:none;border-radius:4px;cursor:pointer;">取消</button>
                        <button id="tagInputConfirm" style="padding:8px 16px;background:var(--primary-color, #4a6cf7);color:white;border:none;border-radius:4px;cursor:pointer;">确定</button>
                    </div>
                </div>
                <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;"></div>
            `;

            // 添加对话框到文档
            const dialogContainer = document.createElement('div');
            dialogContainer.innerHTML = dialogHTML;
            document.body.appendChild(dialogContainer);

            // 返回一个Promise，在用户输入标签后解析
            const tagName = await new Promise((resolve, reject) => {
                const inputField = document.getElementById('tagInput');
                const cancelBtn = document.getElementById('tagInputCancel');
                const confirmBtn = document.getElementById('tagInputConfirm');

                // 设置焦点
                inputField.focus();

                // 回车键也可以确认
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        document.body.removeChild(dialogContainer);
                        resolve(inputField.value.trim());
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(dialogContainer);
                    resolve(null);
                });

                confirmBtn.addEventListener('click', () => {
                    document.body.removeChild(dialogContainer);
                    resolve(inputField.value.trim());
                });
            });

            if (!tagName) {
                Logger.info('用户取消了标签输入');
                return;
            }

            this._showLoading(`正在获取带标签 "${tagName}" 的文件...`);

            // 使用Eagle API正确的方式获取带指定标签的文件
            const items = await eagle.item.get({
                tags: [tagName]
            });

            if (!items || items.length === 0) {
                this._showError(`没有找到带标签 "${tagName}" 的文件`);
                return;
            }

            this._updateSelectedFiles(items);
        } catch (error) {
            this._showError(`从标签获取文件失败: ${error.message}`);
            Logger.error('从标签获取文件失败', error);
        } finally {
            this._hideLoading();
        }
    }



    /**
     * 更新选中的文件
     * @param {Array} files - 文件列表
     * @private
     */
    _updateSelectedFiles(files) {
        this.selectedFiles = files;

        // 更新文件计数
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = files.length;
        }

        // 更新文件列表
        this._updateFilesList();

        // 调用回调
        if (typeof this.onFilesSelected === 'function') {
            this.onFilesSelected(files);
        }

        Logger.info(`已选择 ${files.length} 个文件`);
    }

    /**
     * 更新文件列表显示
     * @private
     */
    _updateFilesList() {
        const listElement = document.getElementById('selectedFilesList');
        if (!listElement) return;

        // 清空列表
        listElement.innerHTML = '';

        // 添加文件项
        this.selectedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name" title="${file.name}">${file.name}</span>
                <span class="file-category">${file.category || ''}</span>
            `;
            listElement.appendChild(fileItem);
        });
    }

    /**
     * 显示加载中状态
     * @param {string} message - 加载消息
     * @private
     */
    _showLoading(message) {
        // 显示加载状态
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.classList.add('show');
        }
    }

    /**
     * 隐藏加载中状态
     * @private
     */
    _hideLoading() {
        // 隐藏加载状态
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.classList.remove('show');
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     * @private
     */
    _showError(message) {
        alert(message);
    }

    /**
     * 获取选中的文件
     * @returns {Array} 选中的文件
     */
    getSelectedFiles() {
        return [...this.selectedFiles];
    }

    /**
     * 清除选中的文件
     */
    clearSelectedFiles() {
        this.selectedFiles = [];

        // 更新文件计数
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = '0';
        }

        // 清空文件列表
        const listElement = document.getElementById('selectedFilesList');
        if (listElement) {
            listElement.innerHTML = '';
        }

        Logger.info('已清除选中的文件');
    }

    /**
     * 初始化文件夹树选择器
     * @private
     */
    _initializeFolderTreeSelector() {
        // 确保FolderTreeSelector类已加载
        if (typeof FolderTreeSelector !== 'undefined') {
            this.folderTreeSelector = new FolderTreeSelector();

            // 设置文件夹选择回调
            this.folderTreeSelector.setOnFolderSelected((items, folder, includeSubfolders) => {
                this._handleFolderTreeSelection(items, folder, includeSubfolders);
            });
        }
    }

    /**
     * 手动初始化文件夹树选择器
     * 这个方法应该在Eagle API准备好后调用
     * @returns {Promise<void>}
     */
    async initializeFolderTree() {
        if (this.folderTreeSelector && typeof this.folderTreeSelector.initialize === 'function') {
            await this.folderTreeSelector.initialize();
        }
    }

    /**
     * 处理文件夹树选择
     * @param {Array} items - 文件列表
     * @param {Object} folder - 选中的文件夹
     * @param {boolean} includeSubfolders - 是否包含子文件夹
     * @private
     */
    _handleFolderTreeSelection(items, folder, includeSubfolders = true) {
        try {
            if (!items || items.length === 0) {
                const subfoldersText = includeSubfolders ? '及其子文件夹' : '';
                this._showError(`文件夹 "${folder.name}"${subfoldersText} 中没有找到文件`);
                return;
            }

            this._updateSelectedFiles(items);
            const subfoldersText = includeSubfolders ? '及其子文件夹' : '';
            Logger.info(`从文件夹 "${folder.name}"${subfoldersText} 选择了 ${items.length} 个文件`);
        } catch (error) {
            this._showError(`处理文件夹选择失败: ${error.message}`);
            Logger.error('处理文件夹选择失败', error);
        }
    }

    /**
     * 获取文件夹树选择器实例
     * @returns {FolderTreeSelector|null}
     */
    getFolderTreeSelector() {
        return this.folderTreeSelector;
    }
}

// 导出FileSelector
window.FileSelector = FileSelector;
