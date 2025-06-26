/**
 * 阿里云NLP服务代理服务器 (使用官方SDK)
 * 用于解决Eagle插件无法直接请求阿里云NLP服务的问题
 */

const http = require('http');
const Core = require('@alicloud/pop-core');
const url = require('url');

// 服务器配置
// 允许通过命令行参数指定端口，例如：node proxy-server-sdk.js 3457
const PORT = process.argv[2] ? parseInt(process.argv[2]) : 3456;

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

            // 检查是否提供了accessKeyId和accessKeySecret
            if (!requestData.accessKeyId || !requestData.accessKeySecret) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required parameters: accessKeyId or accessKeySecret' }));
                return;
            }

            // 获取区域设置，默认为杭州
            const region = requestData.region || 'cn-hangzhou';
            const endpoint = `https://alinlp.${region}.aliyuncs.com`;

            console.log(`使用阿里云区域: ${region}, 端点: ${endpoint}`);

            // 创建阿里云客户端
            const client = new Core({
                accessKeyId: requestData.accessKeyId,
                accessKeySecret: requestData.accessKeySecret,
                endpoint: endpoint,
                apiVersion: '2020-06-29'
            });

            // 构建请求参数
            const params = {
                ...requestData.params,
                ServiceCode: 'alinlp'
            };

            // 请求选项
            const requestOption = {
                method: 'POST',
                timeout: 30000 // 30秒超时
            };

            console.log(`正在请求阿里云NLP服务: ${requestData.action}`);
            console.log('请求参数:', JSON.stringify(params, null, 2));

            // 记录请求详情
            console.log('完整请求参数:', {
                action: requestData.action,
                params: params,
                accessKeyId: requestData.accessKeyId.substring(0, 3) + '***',
                endpoint: 'https://alinlp.cn-hangzhou.aliyuncs.com',
                apiVersion: '2020-06-29'
            });

            // 发送请求到阿里云NLP服务
            client.request(requestData.action, params, requestOption)
                .then((result) => {
                    console.log('阿里云NLP服务请求成功');
                    console.log('响应数据:', JSON.stringify(result).substring(0, 200) + '...');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                })
                .catch((error) => {
                    console.error('阿里云NLP服务请求失败');
                    console.error('错误类型:', error.name);
                    console.error('错误消息:', error.message);

                    // 提取详细错误信息
                    let errorMessage = error.message || 'Unknown error';
                    let errorCode = 'UnknownError';
                    let statusCode = 500;

                    if (error.result) {
                        console.error('原始错误结果:', error.result);
                        try {
                            const errorResult = JSON.parse(error.result);
                            errorMessage = errorResult.Message || errorMessage;
                            errorCode = errorResult.Code || errorCode;
                            statusCode = error.statusCode || statusCode;
                            console.error('解析后的错误:', {
                                message: errorMessage,
                                code: errorCode,
                                statusCode: statusCode
                            });
                        } catch (e) {
                            errorMessage = error.result || errorMessage;
                            console.error('解析错误结果失败:', e.message);
                        }
                    }

                    if (error.statusCode) {
                        console.error('HTTP状态码:', error.statusCode);
                    }

                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: errorMessage,
                        code: errorCode,
                        statusCode: statusCode
                    }));
                });
        } catch (error) {
            console.error('解析请求数据失败:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`代理服务器运行在 http://localhost:${PORT}`);
    console.log('使用方法:');
    console.log(`1. 发送POST请求到 http://localhost:${PORT}`);
    console.log('2. 请求体格式: { "action": "GetPosChGeneral", "accessKeyId": "your-access-key-id", "accessKeySecret": "your-access-key-secret", "params": { "Text": "要分析的文本" } }');
    console.log('');
    console.log('如果端口 3456 已被占用，可以使用其他端口启动服务器:');
    console.log('node proxy-server-sdk.js 3457');
});

// 处理进程终止信号
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
