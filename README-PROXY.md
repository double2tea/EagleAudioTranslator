# 阿里云NLP服务代理服务器使用说明

为了解决Eagle插件无法直接请求阿里云NLP服务的问题，我们提供了一个简单的代理服务器。这个代理服务器可以转发请求到阿里云NLP服务，并处理签名等复杂操作。

## 重要提示

**由于Eagle插件环境的限制，代理服务器无法自动启动。您需要手动启动代理服务器，才能使用阿里云NLP服务。**

## 安装步骤

1. 确保您已经安装了Node.js和npm。如果没有，请先从[Node.js官网](https://nodejs.org/)下载并安装。

2. 打开命令行终端（如Windows的命令提示符或PowerShell，macOS的Terminal）。

3. 导航到插件目录。例如：
   ```
   cd /path/to/EagleAudioTranslator
   ```

4. 运行以下命令安装依赖（包括阿里云官方SDK）：
   ```
   npm install
   ```

## 启动代理服务器

1. 在命令行终端中，导航到插件目录。

2. 运行以下命令启动代理服务器（使用阿里云官方SDK）：
   ```
   npm run start-proxy
   ```

   或者直接运行：
   ```
   node proxy-server-sdk.js
   ```

   **如果端口 3456 已被占用**，您可以使用预设的其他端口：
   ```
   npm run start-proxy-3457
   ```

   或者直接指定端口：
   ```
   node proxy-server-sdk.js 3457
   ```

   我们提供了多个预设端口脚本：
   - `npm run start-proxy-3457` (使用端口 3457)
   - `npm run start-proxy-3458` (使用端口 3458)
   - `npm run start-proxy-3459` (使用端口 3459)

   如果您遇到问题，也可以尝试使用旧版代理服务器：
   ```
   npm run start-proxy-legacy
   ```
   或
   ```
   node proxy-server.js
   ```

3. 如果一切正常，您应该会看到以下输出：
   ```
   代理服务器运行在 http://localhost:3456
   使用方法:
   1. 发送POST请求到 http://localhost:3456
   2. 请求体格式: { "action": "GetPosChGeneral", "accessKeyId": "your-access-key-id", "accessKeySecret": "your-access-key-secret", "params": { "Text": "要分析的文本" } }
   ```

4. **重要：** 保持命令行窗口打开，不要关闭它，否则代理服务器将停止运行。

## 配置Eagle插件

1. 打开Eagle应用程序。

2. 加载音效文件名翻译重命名插件。

3. 在插件设置中，导航到"翻译设置" > "阿里云NLP"选项卡。

4. 启用阿里云NLP服务，并输入您的AccessKey ID和AccessKey Secret。

5. **区域设置**：默认使用杭州区域（cn-hangzhou）。如果您的阿里云服务在其他区域，可以在代码中修改区域设置。

6. 点击"检查代理服务器"按钮，检查代理服务器是否正在运行。

7. 如果代理服务器正在运行，您应该会看到"代理服务器状态"显示为"已启动"。

8. 如果代理服务器未运行，您需要按照上述步骤手动启动代理服务器。

## 获取阿里云AccessKey

如果您还没有阿里云AccessKey，请按照以下步骤获取：

1. 登录[阿里云控制台](https://console.aliyun.com/)。
2. 在右上角的用户头像下拉菜单中，选择"AccessKey管理"。
3. 在弹出的对话框中，选择"继续使用AccessKey"。
4. 点击"创建AccessKey"按钮。
5. 完成安全验证后，您将获得AccessKey ID和AccessKey Secret。请妥善保管这些信息。

## 关于阿里云SDK

新版代理服务器使用阿里云官方的Node.js SDK，相比旧版有以下优势：

- **更可靠的认证机制**：使用官方SDK处理认证和签名，避免自定义实现可能存在的问题
- **更好的错误处理**：提供更详细的错误信息，便于排查问题
- **更简洁的代码**：代码更加简洁，易于维护
- **自动处理重试**：在网络问题时自动重试请求

## 注意事项

- **代理服务器必须手动启动，Eagle插件无法自动启动代理服务器。**
- 每次使用阿里云NLP服务前，都需要确保代理服务器正在运行。
- 阿里云NLP服务为付费服务，基础版每天有50万次的免费额度。
- 本插件默认限制每天最多使用50000次请求，以避免超出免费额度。
- 如果您需要更高的请求限制，可以在代码中修改`maxRequestPerDay`参数。
- 请确保您的阿里云账户已开通NLP服务，并且有足够的余额。
- 代理服务器仅在本地运行，不会将您的AccessKey信息发送到任何第三方服务器。
- 如果您遇到"HTTP error: 403"错误，请检查您的AccessKey权限和阿里云NLP服务是否已开通。

## 故障排除

如果您在使用过程中遇到问题，请尝试以下步骤：

1. **确保代理服务器正在运行。** 这是最常见的问题原因。
2. 检查您的网络连接，确保可以访问阿里云API。
3. 检查您的AccessKey ID和AccessKey Secret是否正确。
4. 查看代理服务器的命令行输出，这通常会提供详细的错误信息。
5. 如果您看到"HTTP error: 403"错误，这通常意味着：
   - 您的AccessKey没有调用NLP服务的权限
   - 您的阿里云账户未开通NLP服务
   - 您的账户余额不足
6. 尝试使用新版代理服务器（使用官方SDK）：`npm run start-proxy`
7. 如果问题仍然存在，请查看浏览器控制台中的错误信息，这可能会提供更多线索。

### 常见错误及解决方案

| 错误信息 | 可能的原因 | 解决方案 |
|---------|-----------|---------|
| HTTP error: 403 | AccessKey权限不足或服务未开通 | 检查AccessKey权限，确保已开通NLP服务 |
| 连接被拒绝 | 代理服务器未运行 | 启动代理服务器 |
| EADDRINUSE: address already in use | 端口已被占用 | 使用其他端口启动代理服务器，例如：`node proxy-server-sdk.js 3457` |
| InvalidAccessKeyId | AccessKey ID不正确 | 检查并更正AccessKey ID |
| SignatureDoesNotMatch | AccessKey Secret不正确 | 检查并更正AccessKey Secret |
| 请求超时 | 网络问题或阿里云服务响应慢 | 检查网络连接，稍后重试 |
| InvalidRegionId | 区域设置不正确 | 检查并更正区域设置，默认为cn-hangzhou |
| ProductNotExist | 指定区域不支持NLP服务 | 尝试使用cn-hangzhou区域 |
| 代理服务器请求超时 | 网络延迟或阿里云服务响应慢 | 增加超时时间，检查网络连接 |

## 停止代理服务器

当您不再需要使用阿里云NLP服务时，可以按照以下步骤停止代理服务器：

1. 找到运行代理服务器的命令行终端窗口。
2. 按下 Ctrl+C 组合键停止服务器。
3. 或者直接关闭命令行终端窗口。

如果您需要进一步的帮助，请联系插件作者或阿里云客服。
