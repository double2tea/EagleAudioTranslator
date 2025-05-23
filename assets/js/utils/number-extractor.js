/**
 * 数字提取工具
 * 用于从文件名中提取和分离数字序号
 */
class NumberExtractor {
    // 常用的正则表达式模式
    static PATTERNS = {
        VERSION: /^(.*?)(v|version|ver)\s*(\d+(\.\d+)*)(.*)$/i,
        END_NUMBER: /^(.*?)[\s_\-\.]+(\d+)$/,
        MIDDLE_NUMBER: /^(.*?\s+)(\d+)(\s+.*?)$/,
        START_NUMBER: /^(\d+)[\s_\-\.]+(.*)$/,
        BRACKET_NUMBER: /^(.*?)\((\d+)\)$/,
        MULTIPLE_NUMBERS: /\b(\d+)\b/g
    }

    // 特殊关键词列表
    static SPECIAL_KEYWORDS = [
        'tab', 'channel', 'ch', 'track', 'key',
        'keyboard', 'button', 'btn', 'version', 'ver'
    ];
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
        // 7. "Tab 16" - 单词后跟数字，特别处理
        // 8. "Tab 16 Key" - 单词中间包含数字
        // 9. "v2.0" - 版本号模式

        // 先检查是否是版本号模式 (如 "v2.0", "version 3.1")
        const versionMatch = text.match(NumberExtractor.PATTERNS.VERSION);

        if (versionMatch) {
            const prefix = versionMatch[1] ? versionMatch[1].trim() : '';
            const versionNumber = versionMatch[3];
            const suffix = versionMatch[5] ? versionMatch[5].trim() : '';

            return {
                text: (prefix + ' ' + suffix).trim(),
                number: versionNumber,
                suffix: 'version'
            };
        }

        // 尾部数字模式 (如 "Name 01", "Name_01")
        const endMatch = text.match(NumberExtractor.PATTERNS.END_NUMBER);

        if (endMatch) {
            return {
                text: endMatch[1].trim(), // 文本部分
                number: endMatch[2],      // 数字部分
                suffix: ''                // 没有后缀
            };
        }

        // 单词中间的数字模式 (如 "Tab 16 Key", "Keyboard Tab 16")
        const middleMatch = text.match(NumberExtractor.PATTERNS.MIDDLE_NUMBER);

        if (middleMatch) {
            // 判断是否是特殊模式，如"Tab 16"、"Channel 5"等
            const beforeText = middleMatch[1].trim().toLowerCase();
            const afterText = middleMatch[3].trim().toLowerCase();

            // 如果前面是特定关键词，并且后面没有文本或者后面是特定关键词
            const isSpecialBefore = NumberExtractor.SPECIAL_KEYWORDS.some(keyword => beforeText.includes(keyword));
            const isSpecialAfter = !afterText || NumberExtractor.SPECIAL_KEYWORDS.some(keyword => afterText.includes(keyword));

            if (isSpecialBefore && isSpecialAfter) {
                // 对于特殊模式，保留关键词但移除数字
                return {
                    text: (beforeText + ' ' + afterText).trim(),
                    number: middleMatch[2],
                    suffix: 'special'
                };
            } else {
                // 对于一般模式，组合前后文本
                return {
                    text: (middleMatch[1] + middleMatch[3]).trim(),
                    number: middleMatch[2],
                    suffix: 'middle'
                };
            }
        }

        // 开头数字模式 (如 "01 Name")
        const startMatch = text.match(NumberExtractor.PATTERNS.START_NUMBER);

        if (startMatch) {
            return {
                text: startMatch[2].trim(), // 文本部分
                number: startMatch[1],      // 数字部分
                prefix: true                // 数字在前面
            };
        }

        // 括号中的数字 (如 "Name(01)")
        const bracketMatch = text.match(NumberExtractor.PATTERNS.BRACKET_NUMBER);

        if (bracketMatch) {
            return {
                text: bracketMatch[1].trim(), // 文本部分
                number: bracketMatch[2],      // 数字部分
                suffix: '()'                  // 括号后缀
            };
        }

        // 尝试匹配多个数字的情况
        const allNumbers = [];
        let match;

        while ((match = NumberExtractor.PATTERNS.MULTIPLE_NUMBERS.exec(text)) !== null) {
            allNumbers.push({
                number: match[1],
                index: match.index
            });
        }

        if (allNumbers.length > 0) {
            // 如果有多个数字，选择最后一个作为序号
            const lastNumber = allNumbers[allNumbers.length - 1];

            // 将数字从文本中移除
            const cleanedText = text.substring(0, lastNumber.index) +
                               text.substring(lastNumber.index + lastNumber.number.length);

            return {
                text: cleanedText.trim().replace(/\s+/g, ' '),
                number: lastNumber.number,
                suffix: 'extracted'
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
        if (!parts || !parts.number) {
            return parts ? parts.text : '';
        }

        // 根据不同的模式组合文本和数字
        switch (true) {
            case !!parts.prefix:
                // 数字在前面
                return `${parts.number} ${parts.text}`;

            case parts.suffix === '()':
                // 括号中的数字
                return `${parts.text}(${parts.number})`;

            case parts.suffix === 'middle': {
                // 单词中间的数字
                const words = parts.text.split(/\s+/);
                if (words.length >= 2) {
                    // 如果是"Tab Key"类型，将数字插入到第一个单词后
                    return `${words[0]} ${parts.number} ${words.slice(1).join(' ')}`;
                } else {
                    // 如果只有一个单词，将数字添加到后面
                    return `${parts.text} ${parts.number}`;
                }
            }

            case parts.suffix === 'special': {
                // 特殊模式，如"Tab 16"、"Channel 5"等
                const words = parts.text.split(/\s+/);

                // 找到第一个匹配的关键词
                for (let i = 0; i < words.length; i++) {
                    const word = words[i].toLowerCase();
                    if (NumberExtractor.SPECIAL_KEYWORDS.some(keyword => word.includes(keyword))) {
                        // 在关键词后插入数字
                        const result = [...words];
                        result.splice(i + 1, 0, parts.number);
                        return result.join(' ');
                    }
                }

                // 如果没有找到关键词，将数字添加到最后
                return `${parts.text} ${parts.number}`;
            }

            case parts.suffix === 'version':
                // 版本号模式，如"v2.0"、"version 3.1"
                return parts.text.trim() === '' ? `v${parts.number}` : `${parts.text} v${parts.number}`;

            case parts.suffix === 'extracted':
            default:
                // 默认数字在后面
                return `${parts.text} ${parts.number}`;
        }
    }
}

// 导出NumberExtractor
window.NumberExtractor = NumberExtractor;
