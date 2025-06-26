# 文件夹树选择器 - 包含子文件夹功能

## 功能概述

为Eagle音效翻译插件的文件夹树选择器添加了"包含子文件夹中的文件"选项，允许用户在选择文件夹时决定是否同时获取所有子文件夹中的文件。

## 功能特性

### 1. 用户界面
- **复选框选项**：在搜索框下方添加"包含子文件夹中的文件"复选框
- **默认状态**：复选框默认为选中状态
- **实时反馈**：选择文件夹后，文件数量会根据复选框状态实时更新

### 2. 文件数量显示
- **动态计算**：根据复选框状态显示不同的文件数量
  - 选中：显示包含所有子文件夹的总文件数量
  - 未选中：只显示当前文件夹的文件数量
- **视觉标识**：有子文件夹时显示"(含子文件夹)"标识

### 3. 文件获取逻辑
- **智能获取**：根据用户选择决定获取范围
  - 包含子文件夹：获取当前文件夹及所有子文件夹中的文件
  - 不包含子文件夹：只获取当前文件夹中的文件

## 技术实现

### 1. HTML结构
```html
<div class="folder-tree-options">
    <label class="checkbox-label">
        <input type="checkbox" id="includeSubfolders" checked>
        <span class="checkmark"></span>
        包含子文件夹中的文件
    </label>
</div>
```

### 2. 核心方法

#### `_getAllFolderIds(folder)`
递归获取文件夹及其所有子文件夹的ID列表
- 输入：文件夹对象
- 输出：包含所有子文件夹ID的数组

#### `_getTotalFileCount(folder)`
递归计算文件夹及其所有子文件夹的总文件数量
- 输入：文件夹对象
- 输出：总文件数量

#### `_getItemsFromMultipleFolders(folderIds)`
逐个从多个文件夹获取文件
- 输入：文件夹ID数组
- 输出：所有文件的合并数组

### 3. 事件处理
- 复选框状态变化时更新文件数量显示
- 确认选择时根据复选框状态决定获取策略

## 技术难点与解决方案

### 问题1：Eagle API多文件夹查询限制
**现象**：当传递大量文件夹ID给`eagle.item.get()`时，API返回空结果

**原因分析**：
- Eagle API的`eagle.item.get({ folders: [id1, id2, ...] })`方法可能对文件夹ID数量有限制
- 单个文件夹查询正常工作，多文件夹查询失败

**解决方案**：
```javascript
// 原始方法（失败）
const items = await eagle.item.get({
    folders: folderIds // 27个文件夹ID
});

// 改进方法（成功）
async _getItemsFromMultipleFolders(folderIds) {
    const allItems = [];
    
    for (let i = 0; i < folderIds.length; i++) {
        const folderId = folderIds[i];
        const folderItems = await eagle.item.get({
            folders: [folderId] // 逐个查询
        });
        
        if (folderItems && folderItems.length > 0) {
            allItems.push(...folderItems);
        }
    }
    
    return allItems;
}
```

**优势**：
- 避免了API限制
- 提供了更好的错误处理
- 保持了功能的完整性

### 问题2：文件数量计算的准确性
**解决方案**：
- 使用递归算法准确计算所有层级的文件数量
- 区分当前文件夹和包含子文件夹的两种计算模式

## 代码结构

### 文件修改清单
1. `index.html` - 添加复选框HTML结构
2. `assets/css/main.css` - 添加复选框样式
3. `assets/js/ui/folder-tree-selector.js` - 核心功能实现
4. `assets/js/ui/file-selector.js` - 更新回调处理

### 关键代码片段
```javascript
// 确认选择逻辑
async _confirmSelection() {
    const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;
    
    let items = [];
    
    if (includeSubfolders) {
        const folderIds = this._getAllFolderIds(this.selectedFolder);
        items = await this._getItemsFromMultipleFolders(folderIds);
    } else {
        items = await eagle.item.get({
            folders: [this.selectedFolder.id]
        });
    }
    
    if (typeof this.onFolderSelected === 'function') {
        this.onFolderSelected(items, this.selectedFolder, includeSubfolders);
    }
}
```

## 使用方法

1. **打开文件夹树选择器**：点击"文件夹树"按钮
2. **设置选项**：根据需要勾选或取消勾选"包含子文件夹中的文件"
3. **选择文件夹**：点击要选择的文件夹
4. **查看文件数量**：底部会显示相应的文件数量
5. **确认选择**：点击"确认选择"按钮

## 性能考虑

- **逐个查询**：虽然需要多次API调用，但避免了API限制问题
- **异步处理**：使用async/await确保查询的顺序性
- **错误处理**：单个文件夹查询失败不会影响其他文件夹

## 后续优化建议

1. **缓存机制**：可以考虑缓存文件夹文件数量，减少重复查询
2. **进度显示**：对于大量子文件夹的情况，可以添加进度指示器
3. **并发控制**：可以考虑限制并发查询数量，避免过多同时请求
