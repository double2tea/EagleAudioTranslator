/**
 * 日志工具
 * 用于记录插件运行日志
 */
class Logger {
    /**
     * 设置日志级别
     * @param {string} level - 日志级别 ('debug', 'info', 'warn', 'error')
     */
    static setLevel(level) {
        const levelUpper = level.toUpperCase();
        if (Logger.LEVELS[levelUpper] !== undefined) {
            Logger.currentLevel = Logger.LEVELS[levelUpper];
            console.log(`日志级别设置为: ${levelUpper}`);
        }
    }
    
    /**
     * 记录调试日志
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     */
    static debug(message, data) {
        if (Logger.currentLevel <= Logger.LEVELS.DEBUG) {
            Logger._log('DEBUG', message, data);
        }
    }
    
    /**
     * 记录信息日志
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     */
    static info(message, data) {
        if (Logger.currentLevel <= Logger.LEVELS.INFO) {
            Logger._log('INFO', message, data);
        }
    }
    
    /**
     * 记录警告日志
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     */
    static warn(message, data) {
        if (Logger.currentLevel <= Logger.LEVELS.WARN) {
            Logger._log('WARN', message, data);
        }
    }
    
    /**
     * 记录错误日志
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     */
    static error(message, data) {
        if (Logger.currentLevel <= Logger.LEVELS.ERROR) {
            Logger._log('ERROR', message, data);
        }
    }
    
    /**
     * 内部日志记录方法
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     * @private
     */
    static _log(level, message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        // 添加到日志数组
        Logger.logs.push(logEntry);
        
        // 限制日志数量
        if (Logger.logs.length > Logger.maxLogs) {
            Logger.logs.shift();
        }
        
        // 控制台输出
        const consoleMethod = level.toLowerCase();
        if (consoleMethod === 'debug') {
            console.debug(`[${timestamp}] [${level}] ${message}`, data || '');
        } else if (consoleMethod === 'info') {
            console.info(`[${timestamp}] [${level}] ${message}`, data || '');
        } else if (consoleMethod === 'warn') {
            console.warn(`[${timestamp}] [${level}] ${message}`, data || '');
        } else if (consoleMethod === 'error') {
            console.error(`[${timestamp}] [${level}] ${message}`, data || '');
        }
        
        // 保存到Eagle日志（如果可用）
        Logger._saveToEagleLog(level, message, data);
    }
    
    /**
     * 保存日志到Eagle日志（如果可用）
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {any} data - 附加数据
     * @private
     */
    static _saveToEagleLog(level, message, data) {
        // Eagle API 中可能没有 log 方法，避免调用不存在的方法
        if (typeof eagle !== 'undefined' && typeof eagle.log === 'function') {
            try {
                eagle.log(`[${level}] ${message} ${data ? JSON.stringify(data) : ''}`);
            } catch (e) {
                console.error('Failed to save log to Eagle', e);
            }
        }
    }
    
    /**
     * 获取所有日志
     * @returns {Array} 日志数组
     */
    static getLogs() {
        return [].concat(Logger.logs);
    }
    
    /**
     * 清除所有日志
     */
    static clearLogs() {
        Logger.logs = [];
        console.log('日志已清除');
    }
}

// 定义静态属性
Logger.LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};
Logger.currentLevel = Logger.LEVELS.INFO;
Logger.maxLogs = 100;
Logger.logs = [];

// 导出Logger
window.Logger = Logger;