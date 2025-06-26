/**
 * 文件夹树选择器组件
 * 提供类似Eagle原生界面的文件夹树形选择器
 */
class FolderTreeSelector {
    constructor() {
        this.folders = [];
        this.selectedFolder = null;
        this.searchTerm = '';
        this.onFolderSelected = null; // 回调函数
        
        this._initializeEventListeners();
    }

    /**
     * 初始化事件监听器
     * @private
     */
    _initializeEventListeners() {
        // 搜索框事件
        const searchInput = document.getElementById('folderTreeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this._filterFolders();
            });
        }

        // 包含子文件夹选项变化事件
        const includeSubfoldersCheckbox = document.getElementById('includeSubfolders');
        if (includeSubfoldersCheckbox) {
            includeSubfoldersCheckbox.addEventListener('change', () => {
                this._updateSelectedFolderInfo();
            });
        }

        // 确认按钮
        const confirmBtn = document.getElementById('confirmFolderSelection');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this._confirmSelection());
        }

        // 不在构造函数中自动初始化，等待手动调用
        // this._initializeFolderTree();
    }

    /**
     * 初始化文件夹树
     * @private
     */
    async _initializeFolderTree() {
        try {
            // 重置状态
            this.selectedFolder = null;
            this.searchTerm = '';
            this._updateSelectedFolderInfo();
            this._updateConfirmButton();

            // 清空搜索框
            const searchInputElement = document.getElementById('folderTreeSearch');
            if (searchInputElement) {
                searchInputElement.value = '';
            }

            // 加载文件夹数据
            await this._loadFolders();
        } catch (error) {
            console.error('初始化文件夹树失败:', error);
            this._showError(`初始化文件夹树失败: ${error.message}`);
        }
    }

    /**
     * 加载文件夹数据
     * @private
     */
    async _loadFolders() {
        try {
            this._showLoading();

            // 检查Eagle API是否可用
            if (typeof eagle === 'undefined' || !eagle.folder) {
                throw new Error('Eagle API 不可用，请确保插件在 Eagle 环境中运行');
            }

            // 获取所有文件夹
            const allFolders = await eagle.folder.getAll();



            if (!allFolders || allFolders.length === 0) {
                this._showEmpty();
                return;
            }

            // 构建文件夹树结构
            this.folders = this._buildFolderTree(allFolders);

            // 获取文件夹文件数量
            await this._loadFolderFileCounts();

            // 渲染文件夹树
            this._renderFolderTree();

        } catch (error) {
            console.error('加载文件夹失败:', error);
            this._showError(`加载文件夹失败: ${error.message}`);
        }
    }

    /**
     * 构建文件夹树结构
     * @param {Array} folders - Eagle API返回的文件夹数组
     * @returns {Array} 处理后的文件夹数组
     * @private
     */
    _buildFolderTree(folders) {
        // Eagle API已经返回了树形结构，我们只需要添加一些额外的属性
        const processFolder = (folder) => {
            // 创建一个新对象，手动复制Eagle Folder的关键属性
            const processedFolder = {
                id: folder.id,
                name: folder.name,
                description: folder.description,
                icon: folder.icon,
                iconColor: folder.iconColor,
                createdAt: folder.createdAt,
                children: [], // 先设为空数组
                isExpanded: false,
                fileCount: 0 // 将在后面计算
            };

            // 递归处理子文件夹
            if (folder.children && folder.children.length > 0) {
                processedFolder.children = folder.children.map(child => processFolder(child));
            }

            return processedFolder;
        };

        // 处理所有根级文件夹
        return folders.map(folder => processFolder(folder));
    }

    /**
     * 加载文件夹文件数量
     * @private
     */
    async _loadFolderFileCounts() {
        try {
            // 递归获取所有文件夹的文件数量
            await this._loadFolderFileCountsRecursive(this.folders);
        } catch (error) {
            console.warn('获取文件夹文件数量失败:', error);
            // 不阻止渲染，只是文件数量显示为0
        }
    }

    /**
     * 递归获取文件夹文件数量
     * @param {Array} folders - 文件夹数组
     * @private
     */
    async _loadFolderFileCountsRecursive(folders) {
        for (const folder of folders) {
            try {
                // 获取文件夹中的文件
                const items = await eagle.item.get({
                    folders: [folder.id]
                });

                folder.fileCount = items ? items.length : 0;

                // 递归处理子文件夹
                if (folder.children && folder.children.length > 0) {
                    await this._loadFolderFileCountsRecursive(folder.children);
                }
            } catch (error) {
                console.warn(`获取文件夹 ${folder.name} 的文件数量失败:`, error);
                folder.fileCount = 0;
            }
        }
    }

    /**
     * 渲染文件夹树
     * @private
     */
    _renderFolderTree() {
        const container = document.getElementById('folderTreeList');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.folders.length === 0) {
            this._showEmpty();
            return;
        }

        this.folders.forEach(folder => {
            this._renderFolderNode(folder, container, 0);
        });
    }

    /**
     * 渲染单个文件夹节点
     * @param {Object} folder - 文件夹对象
     * @param {HTMLElement} container - 容器元素
     * @param {number} level - 层级深度
     * @private
     */
    _renderFolderNode(folder, container, level) {
        // 检查是否匹配搜索条件
        if (this.searchTerm && !this._matchesSearch(folder)) {
            return;
        }

        const folderElement = document.createElement('div');
        folderElement.className = 'folder-tree-item';
        folderElement.style.paddingLeft = `${16 + level * 20}px`;
        folderElement.dataset.folderId = folder.id;
        
        if (folder.children.length > 0) {
            folderElement.classList.add('has-children');
            if (folder.isExpanded) {
                folderElement.classList.add('expanded');
            }
        } else {
            folderElement.classList.add('no-children');
        }

        // 构建HTML内容
        const expandIcon = folder.children.length > 0 ?
            '<i class="fas fa-chevron-right"></i>' : '';

        const highlightedName = this._highlightSearchTerm(folder.name || 'Unnamed Folder');

        folderElement.innerHTML = `
            <div class="folder-expand-toggle">
                ${expandIcon}
            </div>
            <div class="folder-icon">
                <i class="fas fa-folder"></i>
            </div>
            <div class="folder-name">${highlightedName}</div>
            <div class="folder-count">${folder.fileCount || 0}</div>
        `;

        // 添加点击事件
        folderElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this._selectFolder(folder, folderElement);
        });

        // 添加展开/折叠事件
        const expandToggle = folderElement.querySelector('.folder-expand-toggle');
        if (expandToggle && folder.children.length > 0) {
            expandToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleFolder(folder, folderElement);
            });
        }

        container.appendChild(folderElement);

        // 如果展开，渲染子文件夹
        if (folder.isExpanded && folder.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'folder-children';
            
            folder.children.forEach(child => {
                this._renderFolderNode(child, childrenContainer, level + 1);
            });
            
            container.appendChild(childrenContainer);
        }
    }

    /**
     * 检查文件夹是否匹配搜索条件
     * @param {Object} folder - 文件夹对象
     * @returns {boolean}
     * @private
     */
    _matchesSearch(folder) {
        if (!this.searchTerm) return true;

        // 检查当前文件夹名称
        if (folder.name && folder.name.toLowerCase().includes(this.searchTerm)) {
            return true;
        }

        // 递归检查子文件夹
        return folder.children.some(child => this._matchesSearch(child));
    }

    /**
     * 高亮搜索词
     * @param {string} text - 原始文本
     * @returns {string} 高亮后的HTML
     * @private
     */
    _highlightSearchTerm(text) {
        if (!this.searchTerm) return text;
        
        const regex = new RegExp(`(${this.searchTerm})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    /**
     * 选择文件夹
     * @param {Object} folder - 文件夹对象
     * @param {HTMLElement} element - 文件夹元素
     * @private
     */
    _selectFolder(folder, element) {
        // 移除之前的选中状态
        const prevSelected = document.querySelector('.folder-tree-item.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
        
        // 设置新的选中状态
        element.classList.add('selected');
        this.selectedFolder = folder;
        
        // 更新选中信息
        this._updateSelectedFolderInfo();
        this._updateConfirmButton();
    }

    /**
     * 展开/折叠文件夹
     * @param {Object} folder - 文件夹对象
     * @param {HTMLElement} element - 文件夹元素
     * @private
     */
    _toggleFolder(folder, element) {
        folder.isExpanded = !folder.isExpanded;

        if (folder.isExpanded) {
            element.classList.add('expanded');
        } else {
            element.classList.remove('expanded');
        }

        // 重新渲染以显示/隐藏子文件夹
        this._renderFolderTree();
    }

    /**
     * 过滤文件夹
     * @private
     */
    _filterFolders() {
        this._renderFolderTree();
    }

    /**
     * 更新选中文件夹信息
     * @private
     */
    _updateSelectedFolderInfo() {
        const nameElement = document.getElementById('selectedFolderName');
        const countElement = document.getElementById('selectedFolderCount');

        if (this.selectedFolder) {
            if (nameElement) {
                nameElement.textContent = this.selectedFolder.name || 'Unnamed Folder';
            }
            if (countElement) {
                // 检查是否包含子文件夹来显示不同的文件数量
                const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;
                const fileCount = includeSubfolders ?
                    this._getTotalFileCount(this.selectedFolder) :
                    (this.selectedFolder.fileCount || 0);

                const subfoldersText = includeSubfolders && this.selectedFolder.children.length > 0 ?
                    ' (含子文件夹)' : '';

                countElement.textContent = `${fileCount} 个文件${subfoldersText}`;
            }
        } else {
            if (nameElement) {
                nameElement.textContent = '未选择文件夹';
            }
            if (countElement) {
                countElement.textContent = '';
            }
        }
    }

    /**
     * 更新确认按钮状态
     * @private
     */
    _updateConfirmButton() {
        const confirmBtn = document.getElementById('confirmFolderSelection');
        if (confirmBtn) {
            confirmBtn.disabled = !this.selectedFolder;
        }
    }

    /**
     * 确认选择
     * @private
     */
    async _confirmSelection() {
        if (!this.selectedFolder) return;

        try {
            // 检查是否包含子文件夹
            const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;

            let items = [];

            if (includeSubfolders) {
                // 获取所有子文件夹ID（包括当前文件夹）
                const folderIds = this._getAllFolderIds(this.selectedFolder);

                // 逐个获取文件，避免Eagle API的多文件夹查询限制
                items = await this._getItemsFromMultipleFolders(folderIds);
            } else {
                // 只获取当前文件夹中的文件
                items = await eagle.item.get({
                    folders: [this.selectedFolder.id]
                });
            }

            // 调用回调函数
            if (typeof this.onFolderSelected === 'function') {
                this.onFolderSelected(items, this.selectedFolder, includeSubfolders);
            }

        } catch (error) {
            console.error('获取文件夹文件失败:', error);
            alert(`获取文件夹文件失败: ${error.message}`);
        }
    }

    /**
     * 逐个从多个文件夹获取文件
     * 避免Eagle API的多文件夹查询限制
     * @param {Array} folderIds - 文件夹ID数组
     * @returns {Promise<Array>} 所有文件的数组
     * @private
     */
    async _getItemsFromMultipleFolders(folderIds) {
        const allItems = [];
        const seenIds = new Set(); // 用于去重

        for (let i = 0; i < folderIds.length; i++) {
            const folderId = folderIds[i];

            try {
                const folderItems = await eagle.item.get({
                    folders: [folderId]
                });

                if (folderItems && folderItems.length > 0) {
                    // 去重：只添加之前没有见过的文件
                    for (const item of folderItems) {
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            allItems.push(item);
                        }
                    }
                }
            } catch (error) {
                console.error(`获取文件夹 ${folderId} 的文件失败:`, error);
            }
        }

        return allItems;
    }

    /**
     * 获取文件夹及其所有子文件夹的ID
     * @param {Object} folder - 文件夹对象
     * @returns {Array} 文件夹ID数组
     * @private
     */
    _getAllFolderIds(folder) {
        const ids = [folder.id];

        if (folder.children && folder.children.length > 0) {
            folder.children.forEach(child => {
                ids.push(...this._getAllFolderIds(child));
            });
        }

        return ids;
    }

    /**
     * 获取文件夹及其所有子文件夹的总文件数量
     * @param {Object} folder - 文件夹对象
     * @returns {number} 总文件数量
     * @private
     */
    _getTotalFileCount(folder) {
        let totalCount = folder.fileCount || 0;

        if (folder.children && folder.children.length > 0) {
            folder.children.forEach(child => {
                totalCount += this._getTotalFileCount(child);
            });
        }

        return totalCount;
    }

    /**
     * 显示加载状态
     * @private
     */
    _showLoading() {
        const container = document.getElementById('folderTreeList');
        if (container) {
            container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i> 正在加载文件夹...
                </div>
            `;
        }
    }

    /**
     * 显示空状态
     * @private
     */
    _showEmpty() {
        const container = document.getElementById('folderTreeList');
        if (container) {
            container.innerHTML = `
                <div class="folder-tree-empty">
                    <i class="fas fa-folder-open"></i>
                    <p>没有找到文件夹</p>
                </div>
            `;
        }
    }

    /**
     * 显示错误状态
     * @param {string} message - 错误消息
     * @private
     */
    _showError(message) {
        const container = document.getElementById('folderTreeList');
        if (container) {
            container.innerHTML = `
                <div class="folder-tree-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    /**
     * 设置文件夹选择回调
     * @param {Function} callback - 回调函数
     */
    setOnFolderSelected(callback) {
        this.onFolderSelected = callback;
    }

    /**
     * 获取选中的文件夹
     * @returns {Object|null} 选中的文件夹
     */
    getSelectedFolder() {
        return this.selectedFolder;
    }

    /**
     * 手动初始化文件夹树
     * 这个方法应该在Eagle API准备好后调用
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('手动初始化文件夹树选择器');
        await this._initializeFolderTree();
    }
}
