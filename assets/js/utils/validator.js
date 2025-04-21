/**
 * 验证工具
 * 用于验证和清理文件名等
 */
class Validator {
    /**
     * 无效的文件名字符
     * @type {RegExp}
     */
    static INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;
    
    /**
     * 验证文件名是否有效
     * @param {string} filename - 要验证的文件名
     * @returns {boolean} 是否有效
     */
    static isValidFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return false;
        }
        
        // 检查是否包含无效字符
        if (Validator.INVALID_FILENAME_CHARS.test(filename)) {
            return false;
        }
        
        // 检查长度
        if (filename.length > 255) {
            return false;
        }
        
        // 检查是否为保留名称
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        
        const nameWithoutExt = filename.split('.')[0].toUpperCase();
        if (reservedNames.includes(nameWithoutExt)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 清理文件名，移除无效字符
     * @param {string} filename - 要清理的文件名
     * @returns {string} 清理后的文件名
     */
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'unnamed';
        }
        
        // 替换无效字符
        let sanitized = filename.replace(Validator.INVALID_FILENAME_CHARS, '_');
        
        // 处理保留名称
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        
        const parts = sanitized.split('.');
        const nameWithoutExt = parts[0];
        
        if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
            parts[0] = nameWithoutExt + '_';
            sanitized = parts.join('.');
        }
        
        // 处理长度
        if (sanitized.length > 255) {
            const extension = sanitized.split('.').pop();
            sanitized = sanitized.substring(0, 250 - extension.length) + '.' + extension;
        }
        
        // 处理空文件名
        if (sanitized.trim() === '' || sanitized === '.') {
            sanitized = 'unnamed';
        }
        
        return sanitized;
    }
    
    /**
     * 验证是否为有效的音频文件扩展名
     * @param {string} extension - 文件扩展名
     * @returns {boolean} 是否为有效的音频文件
     */
    static isAudioExtension(extension) {
        if (!extension || typeof extension !== 'string') {
            return false;
        }
        
        // 移除前导点号
        const ext = extension.startsWith('.') ? extension.substring(1) : extension;
        
        // 常见音频文件扩展名
        const audioExtensions = [
            'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma',
            'aiff', 'alac', 'ape', 'opus', 'webm', 'mid', 'midi'
        ];
        
        return audioExtensions.includes(ext.toLowerCase());
    }
    
    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 扩展名
     */
    static getExtension(filename) {
        if (!filename || typeof filename !== 'string') {
            return '';
        }
        
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }
    
    /**
     * 获取不带扩展名的文件名
     * @param {string} filename - 文件名
     * @returns {string} 不带扩展名的文件名
     */
    static getNameWithoutExtension(filename) {
        if (!filename || typeof filename !== 'string') {
            return filename;
        }
        
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
    }
}

// 导出Validator
window.Validator = Validator;