/**
 * 数字提取工具
 * 用于从文件名中提取和分离数字序号
 */
class NumberExtractor {
    /**
     * 从文本中提取数字序号
     * @param {string} text - 要处理的文本
     * @returns {Object} 包含提取的数字和剩余文本的对象
     */
    static extractNumber(text) {
        if (!text) {
            return { text: '', number: null, suffix: '' };
        }

        // 匹配常见的序号模式：
        // 1. "Name 01" - 文本后跟空格和数字
        // 2. "01 Name" - 数字开头后跟空格和文本
        // 3. "Name_01" - 文本后跟下划线和数字
        // 4. "Name-01" - 文本后跟连字符和数字
        // 5. "Name.01" - 文本后跟点和数字
        // 6. "Name(01)" - 文本后跟括号中的数字

        // 尾部数字模式 (如 "Name 01", "Name_01")
        const endNumberPattern = /^(.*?)[\s_\-\.]+(\d+)$/;
        const endMatch = text.match(endNumberPattern);
        
        if (endMatch) {
            return {
                text: endMatch[1].trim(), // 文本部分
                number: endMatch[2],      // 数字部分
                suffix: ''                // 没有后缀
            };
        }
        
        // 开头数字模式 (如 "01 Name")
        const startNumberPattern = /^(\d+)[\s_\-\.]+(.*)$/;
        const startMatch = text.match(startNumberPattern);
        
        if (startMatch) {
            return {
                text: startMatch[2].trim(), // 文本部分
                number: startMatch[1],      // 数字部分
                prefix: true                // 数字在前面
            };
        }
        
        // 括号中的数字 (如 "Name(01)")
        const bracketNumberPattern = /^(.*?)\((\d+)\)$/;
        const bracketMatch = text.match(bracketNumberPattern);
        
        if (bracketMatch) {
            return {
                text: bracketMatch[1].trim(), // 文本部分
                number: bracketMatch[2],      // 数字部分
                suffix: '()'                  // 括号后缀
            };
        }
        
        // 没有找到数字模式，返回原始文本
        return {
            text: text,
            number: null,
            suffix: ''
        };
    }
    
    /**
     * 重新组合文本和数字
     * @param {Object} parts - 包含文本和数字的对象
     * @returns {string} 组合后的文本
     */
    static combineTextAndNumber(parts) {
        if (!parts.number) {
            return parts.text;
        }
        
        if (parts.prefix) {
            // 数字在前面
            return `${parts.number} ${parts.text}`;
        } else if (parts.suffix === '()') {
            // 括号中的数字
            return `${parts.text}(${parts.number})`;
        } else {
            // 默认数字在后面
            return `${parts.text} ${parts.number}`;
        }
    }
}

// 导出NumberExtractor
window.NumberExtractor = NumberExtractor;
