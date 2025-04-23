/**
 * segmentit API 测试脚本
 * 用于测试 segmentit 库的各种功能
 */

// 测试函数
function testSegmentit() {
    console.log('开始测试 segmentit 库...');
    
    // 检查 segmentit 是否可用
    if (typeof Segmentit === 'undefined') {
        console.error('Segmentit 库未加载！');
        return;
    }
    
    console.log('Segmentit 库已加载');
    
    try {
        // 初始化 segmentit
        const segmentit = Segmentit.useDefault(new Segmentit.Segment());
        console.log('Segmentit 初始化成功');
        
        // 测试文本
        const testText = '工信处女干事每月经过下属科室都要亲口交代24口交换机等技术性器件的安装工作。';
        
        // 测试简单分词
        console.log('\n测试简单分词:');
        const simpleResult = segmentit.doSegment(testText, {
            simple: true
        });
        console.log(simpleResult);
        
        // 测试详细分词
        console.log('\n测试详细分词:');
        const fullResult = segmentit.doSegment(testText, {
            simple: false
        });
        console.log(fullResult);
        
        // 测试 SegmentitPOS
        if (typeof SegmentitPOS !== 'undefined') {
            console.log('\n测试 SegmentitPOS:');
            
            // 测试分词
            console.log('测试 tokenize:');
            const tokens = SegmentitPOS.tokenize(testText);
            console.log(tokens);
            
            // 测试词性标注
            console.log('\n测试 tag:');
            const tagResult = SegmentitPOS.tag(testText);
            console.log(tagResult);
            
            // 测试词性分析
            console.log('\n测试 analyze:');
            const analyzeResult = SegmentitPOS.analyze(testText);
            console.log(analyzeResult);
            
            // 测试通用词性分析
            console.log('\n测试 analyzeGeneral:');
            const generalResult = SegmentitPOS.analyzeGeneral(testText);
            console.log(generalResult);
        } else {
            console.error('SegmentitPOS 未加载！');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 在页面加载完成后执行测试
document.addEventListener('DOMContentLoaded', function() {
    // 添加测试按钮
    const testButton = document.createElement('button');
    testButton.textContent = '测试 Segmentit API';
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '8px 16px';
    testButton.style.backgroundColor = '#4CAF50';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', function() {
        testSegmentit();
    });
    
    document.body.appendChild(testButton);
    
    // 添加测试结果区域
    const resultArea = document.createElement('div');
    resultArea.id = 'segmentit-test-results';
    resultArea.style.position = 'fixed';
    resultArea.style.top = '50px';
    resultArea.style.right = '10px';
    resultArea.style.width = '400px';
    resultArea.style.maxHeight = '80vh';
    resultArea.style.overflowY = 'auto';
    resultArea.style.backgroundColor = '#f8f8f8';
    resultArea.style.border = '1px solid #ddd';
    resultArea.style.borderRadius = '4px';
    resultArea.style.padding = '10px';
    resultArea.style.zIndex = '9998';
    resultArea.style.display = 'none';
    
    document.body.appendChild(resultArea);
    
    // 重写 console.log 和 console.error 以显示在结果区域
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = function() {
        // 调用原始的 console.log
        originalLog.apply(console, arguments);
        
        // 将输出添加到结果区域
        const message = Array.from(arguments).map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');
        
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '5px';
        logEntry.style.whiteSpace = 'pre-wrap';
        logEntry.style.fontFamily = 'monospace';
        logEntry.textContent = message;
        
        document.getElementById('segmentit-test-results').appendChild(logEntry);
        document.getElementById('segmentit-test-results').style.display = 'block';
    };
    
    console.error = function() {
        // 调用原始的 console.error
        originalError.apply(console, arguments);
        
        // 将错误输出添加到结果区域
        const message = Array.from(arguments).map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');
        
        const errorEntry = document.createElement('div');
        errorEntry.style.marginBottom = '5px';
        errorEntry.style.color = 'red';
        errorEntry.style.whiteSpace = 'pre-wrap';
        errorEntry.style.fontFamily = 'monospace';
        errorEntry.textContent = message;
        
        document.getElementById('segmentit-test-results').appendChild(errorEntry);
        document.getElementById('segmentit-test-results').style.display = 'block';
    };
});
