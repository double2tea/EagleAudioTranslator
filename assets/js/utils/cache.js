/**
 * 缓存工具，用于存储翻译结果和用户设置
 */
class Cache {
    /**
     * 构造函数
     * @param {string} namespace - 缓存命名空间
     * @param {number} maxSize - 最大缓存条目数
     */
    constructor(namespace = 'audio-translator-cache', maxSize = 1000) {
        this.namespace = namespace;
        this.maxSize = maxSize;
        this.storage = localStorage;
        this._initCache();
    }
    
    /**
     * 初始化缓存
     * @private
     */
    _initCache() {
        if (!this.storage.getItem(this.namespace)) {
            this.storage.setItem(this.namespace, JSON.stringify({
                items: {},
                keys: [],
                lastUpdated: Date.now()
            }));
        }
    }
    
    /**
     * 获取缓存数据
     * @private
     * @returns {Object} 缓存数据
     */
    _getCacheData() {
        try {
            return JSON.parse(this.storage.getItem(this.namespace));
        } catch (error) {
            Logger.error('Failed to parse cache data', error);
            return { items: {}, keys: [], lastUpdated: Date.now() };
        }
    }
    
    /**
     * 保存缓存数据
     * @private
     * @param {Object} data - 缓存数据
     */
    _saveCacheData(data) {
        try {
            this.storage.setItem(this.namespace, JSON.stringify(data));
        } catch (error) {
            Logger.error('Failed to save cache data', error);
            // 尝试清理缓存后再保存
            this.clear();
            try {
                this.storage.setItem(this.namespace, JSON.stringify(data));
            } catch (e) {
                Logger.error('Failed to save cache data after clearing', e);
            }
        }
    }
    
    /**
     * 设置缓存项
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @param {number} ttl - 生存时间（毫秒），默认一周
     */
    set(key, value, ttl = 7 * 24 * 60 * 60 * 1000) {
        const cacheData = this._getCacheData();
        const timestamp = Date.now();
        const expires = ttl ? timestamp + ttl : null;
        
        // 如果键已存在，先从keys数组中移除
        const keyIndex = cacheData.keys.indexOf(key);
        if (keyIndex !== -1) {
            cacheData.keys.splice(keyIndex, 1);
        }
        
        // 将键添加到队列末尾
        cacheData.keys.push(key);
        
        // 设置缓存项
        cacheData.items[key] = {
            value,
            timestamp,
            expires
        };
        
        // 检查缓存大小，如果超过最大值，移除最旧的项
        while (cacheData.keys.length > this.maxSize) {
            const oldestKey = cacheData.keys.shift();
            delete cacheData.items[oldestKey];
        }
        
        cacheData.lastUpdated = timestamp;
        this._saveCacheData(cacheData);
    }
    
    /**
     * 获取缓存项
     * @param {string} key - 缓存键
     * @returns {any|null} 缓存值或null（如果不存在或已过期）
     */
    get(key) {
        const cacheData = this._getCacheData();
        const item = cacheData.items[key];
        
        if (!item) {
            return null;
        }
        
        // 检查是否过期
        if (item.expires && item.expires < Date.now()) {
            // 自动删除过期项
            this.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    /**
     * 删除缓存项
     * @param {string} key - 缓存键
     */
    delete(key) {
        const cacheData = this._getCacheData();
        
        if (cacheData.items[key]) {
            delete cacheData.items[key];
            
            const keyIndex = cacheData.keys.indexOf(key);
            if (keyIndex !== -1) {
                cacheData.keys.splice(keyIndex, 1);
            }
            
            cacheData.lastUpdated = Date.now();
            this._saveCacheData(cacheData);
        }
    }
    
    /**
     * 清除所有缓存
     */
    clear() {
        this._saveCacheData({
            items: {},
            keys: [],
            lastUpdated: Date.now()
        });
    }
    
    /**
     * 获取缓存状态信息
     * @returns {Object} 缓存状态信息
     */
    getStats() {
        const cacheData = this._getCacheData();
        return {
            size: cacheData.keys.length,
            maxSize: this.maxSize,
            lastUpdated: new Date(cacheData.lastUpdated)
        };
    }
}

// 导出Cache
window.Cache = Cache;