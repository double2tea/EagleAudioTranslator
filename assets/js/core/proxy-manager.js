/**
 * 代理服务器管理器
 * 负责启动和关闭阿里云NLP服务代理服务器
 */
class ProxyManager {
    /**
     * 构造函数
     */
    constructor() {
        this.proxyProcess = null;
        this.isRunning = false;
        this.port = 3456;
        this.proxyUrl = `http://localhost:${this.port}`;
        this.initialized = false;

        // 初始化
        this.init();
    }

    /**
     * 初始化代理管理器
     */
    init() {
        try {
            console.log('初始化代理服务器管理器...');

            // Eagle插件环境不支持启动子进程，所以我们只能检查代理服务器是否已经在运行
            this.initialized = true;
            console.log('代理服务器管理器初始化成功（仅检测模式）');

            // 立即检查代理服务器是否已经在运行
            this.checkProxyRunning();

            // 每30秒检查一次代理服务器状态
            setInterval(() => {
                this.checkProxyRunning();
            }, 30000);
        } catch (error) {
            console.error('初始化代理服务器管理器失败:', error);
        }
    }

    /**
     * 检查代理服务器是否已经在运行
     */
    async checkProxyRunning() {
        try {
            const isRunning = await this.isProxyRunning();
            this.isRunning = isRunning;

            if (isRunning) {
                console.log('检测到代理服务器正在运行');
            } else {
                console.log('代理服务器未运行，请手动启动');
            }

            // 触发状态变更事件
            this.triggerStatusChange();
        } catch (error) {
            console.error('检查代理服务器状态失败:', error);
        }
    }

    /**
     * 触发状态变更事件
     */
    triggerStatusChange() {
        // 创建自定义事件
        const event = new CustomEvent('proxyStatusChange', {
            detail: {
                isRunning: this.isRunning
            }
        });

        // 分发事件
        window.dispatchEvent(event);
    }

    /**
     * 启动代理服务器
     * @returns {Promise<boolean>} 是否成功启动
     */
    async startProxy() {
        if (!this.initialized) {
            console.error('代理服务器管理器未初始化，无法启动代理服务器');
            return false;
        }

        // 检查代理服务器是否已经在运行
        try {
            const isRunning = await this.isProxyRunning();
            if (isRunning) {
                console.log('代理服务器已经在运行中');
                this.isRunning = true;
                this.triggerStatusChange();
                return true;
            }
        } catch (error) {
            // 忽略错误，继续处理
        }

        // 在Eagle插件环境中，我们无法自动启动代理服务器
        // 显示用户指导信息
        console.log('无法自动启动代理服务器，请按照以下步骤手动启动：');
        console.log('1. 打开命令行终端');
        console.log('2. 导航到插件目录');
        console.log('3. 运行命令: node proxy-server-sdk.js');

        // 显示一个提示对话框，如果可能的话
        if (typeof eagle !== 'undefined' && typeof eagle.notification !== 'undefined') {
            eagle.notification.show({
                title: '需要手动启动代理服务器',
                description: '请打开命令行终端，导航到插件目录，然后运行命令: node proxy-server-sdk.js',
                duration: 10000
            });
        } else if (typeof alert !== 'undefined') {
            alert('请手动启动代理服务器：\n1. 打开命令行终端\n2. 导航到插件目录\n3. 运行命令: node proxy-server-sdk.js');
        }

        return false;
    }

    /**
     * 停止代理服务器
     * @returns {Promise<boolean>} 是否成功停止
     */
    async stopProxy() {
        // 在Eagle插件环境中，我们无法自动停止代理服务器
        // 显示用户指导信息
        console.log('无法自动停止代理服务器，请按照以下步骤手动停止：');
        console.log('1. 找到运行代理服务器的命令行终端');
        console.log('2. 按下 Ctrl+C 组合键停止服务器');
        console.log('3. 或者关闭命令行终端窗口');

        // 显示一个提示对话框，如果可能的话
        if (typeof eagle !== 'undefined' && typeof eagle.notification !== 'undefined') {
            eagle.notification.show({
                title: '需要手动停止代理服务器',
                description: '请找到运行代理服务器的命令行终端，然后按下 Ctrl+C 组合键停止服务器',
                duration: 10000
            });
        }

        // 重新检查状态
        await this.checkProxyRunning();

        return !this.isRunning;
    }

    /**
     * 等待代理服务器启动完成
     * @returns {Promise<boolean>} 是否成功启动
     */
    async waitForProxy() {
        console.log('等待代理服务器启动完成...');

        // 最多等待10秒
        const maxAttempts = 20;
        const interval = 500; // 500毫秒

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const isRunning = await this.isProxyRunning();
                if (isRunning) {
                    console.log('代理服务器已启动完成');
                    this.isRunning = true;
                    this.triggerStatusChange();
                    return true;
                }
            } catch (error) {
                // 继续等待
            }

            // 等待一段时间
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        console.warn('等待代理服务器启动超时');
        return false;
    }

    /**
     * 获取代理服务器URL
     * @returns {string} 代理服务器URL
     */
    getProxyUrl() {
        return this.proxyUrl;
    }

    /**
     * 检查代理服务器是否正在运行
     * @returns {Promise<boolean>} 是否正在运行
     */
    async isProxyRunning() {
        try {
            // 设置超时，避免长时间等待
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(this.proxyUrl, {
                method: 'OPTIONS',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            // 如果是超时或网络错误，不打印错误日志
            if (error.name !== 'AbortError') {
                console.debug('检查代理服务器状态时发生错误:', error.name);
            }
            return false;
        }
    }
}

// 导出代理管理器类
if (typeof window !== 'undefined') {
    window.ProxyManager = ProxyManager;
}
