/**
 * 阿里云NLP服务代理服务器
 * 用于解决Eagle插件无法直接请求阿里云NLP服务的问题
 */

const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');

// 服务器配置
const PORT = 3000;

// 阿里云NLP服务配置
let accessKeyId = '';
let accessKeySecret = '';
const endpoint = 'alinlp.cn-hangzhou.aliyuncs.com';
const apiVersion = '2020-06-29';

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 设置CORS头，允许来自任何源的请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求（预检请求）
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 只处理POST请求
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    // 读取请求体
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const requestData = JSON.parse(body);
            
            // 检查必要的参数
            if (!requestData.action) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required parameter: action' }));
                return;
            }

            // 如果提供了accessKeyId和accessKeySecret，则更新配置
            if (requestData.accessKeyId && requestData.accessKeySecret) {
                accessKeyId = requestData.accessKeyId;
                accessKeySecret = requestData.accessKeySecret;
            }

            // 检查是否已配置accessKeyId和accessKeySecret
            if (!accessKeyId || !accessKeySecret) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required configuration: accessKeyId or accessKeySecret' }));
                return;
            }

            // 构建请求参数
            const params = {
                Action: requestData.action,
                Format: 'JSON',
                Version: apiVersion,
                AccessKeyId: accessKeyId,
                SignatureMethod: 'HMAC-SHA1',
                SignatureVersion: '1.0',
                SignatureNonce: generateNonce(),
                Timestamp: new Date().toISOString(),
                ...requestData.params,
                ServiceCode: 'alinlp'
            };

            // 计算签名
            const signature = computeSignature(params, accessKeySecret);
            params.Signature = signature;

            // 发送请求到阿里云NLP服务
            sendRequestToAliyun(params, (error, data) => {
                if (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data);
                }
            });
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`代理服务器运行在 http://localhost:${PORT}`);
    console.log('使用方法:');
    console.log('1. 发送POST请求到 http://localhost:3000');
    console.log('2. 请求体格式: { "action": "GetPosChGeneral", "accessKeyId": "your-access-key-id", "accessKeySecret": "your-access-key-secret", "params": { "Text": "要分析的文本" } }');
});

/**
 * 生成随机字符串作为签名随机数
 * @returns {string} 随机字符串
 */
function generateNonce() {
    return 'nlp-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
}

/**
 * 计算阿里云API签名
 * @param {Object} params - 请求参数
 * @param {string} accessKeySecret - AccessKey Secret
 * @returns {string} 签名
 */
function computeSignature(params, accessKeySecret) {
    // 1. 按参数名称的字典顺序排序
    const sortedKeys = Object.keys(params).sort();
    
    // 2. 构建规范化的请求字符串
    let canonicalizedQueryString = '';
    sortedKeys.forEach(key => {
        // 对参数名称和值进行URL编码
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(params[key]);
        canonicalizedQueryString += `&${encodedKey}=${encodedValue}`;
    });
    
    // 去掉第一个&
    canonicalizedQueryString = canonicalizedQueryString.substring(1);
    
    // 3. 构建待签名字符串
    const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalizedQueryString)}`;
    
    // 4. 计算签名
    const hmac = crypto.createHmac('sha1', accessKeySecret + '&');
    hmac.update(stringToSign);
    return hmac.digest('base64');
}

/**
 * 发送请求到阿里云NLP服务
 * @param {Object} params - 请求参数
 * @param {Function} callback - 回调函数
 */
function sendRequestToAliyun(params, callback) {
    // 构建请求体
    const postData = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    // 构建请求选项
    const options = {
        hostname: endpoint,
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    // 发送HTTPS请求
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                callback(null, data);
            } else {
                callback(new Error(`HTTP error: ${res.statusCode}`), null);
            }
        });
    });

    req.on('error', (error) => {
        callback(error, null);
    });

    // 写入请求体
    req.write(postData);
    req.end();
}
