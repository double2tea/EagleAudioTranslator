if (returnMetadata === true) {
    return { content, mimeType, isImage };
}
else {
    return content;
}
try { }
catch (error) {
    // If UTF-8 reading fails, treat as binary and return base64 but still as text
    const buffer = await fs.readFile(validPath);
    const content = `Binary file content (base64 encoded):\n${buffer.toString('base64')}`;
    if (returnMetadata === true) {
        return { content, mimeType: 'text/plain', isImage: false };
    }
    else {
        return content;
    }
}
;
// Execute with timeout
const result = await withTimeout(readOperation(), FILE_READ_TIMEOUT, `Read file operation for ${filePath}`, returnMetadata ?
    { content: `Operation timed out after ${FILE_READ_TIMEOUT / 1000} seconds`, mimeType: 'text/plain', isImage: false } :
    `Operation timed out after ${FILE_READ_TIMEOUT / 1000} seconds`);
return result;
/**
 * Read a file from either the local filesystem or a URL
 * @param filePath Path to the file or URL
 * @param returnMetadata Whether to return metadata with the content
 * @param isUrl Whether the path is a URL
 * @returns File content or file result with metadata
 */
export async function readFile(filePath, returnMetadata, isUrl) {
    return isUrl
        ? readFileFromUrl(filePath, returnMetadata)
        : readFileFromDisk(filePath, returnMetadata);
}
export async function writeFile(filePath, content) {
    // Expand home directory in filePath before validation
    const expandedFilePath = expandHome(filePath);
    const validPath = await validatePath(expandedFilePath);
    // Check if the path validation returned an error
    if (validPath.startsWith('__ERROR__:')) {
        throw new Error(validPath.substring('__ERROR__:'.length).trim());
    }
    await fs.writeFile(validPath, content, "utf-8");
}
export async function readMultipleFiles(paths) {
    return Promise.all(paths.map(async (filePath) => {
        try {
            // Expand home directory in filePath before validation
            const expandedFilePath = expandHome(filePath);
            const validPath = await validatePath(expandedFilePath);
            // Check if the path validation returned an error
            if (validPath.startsWith('__ERROR__:')) {
                return {
                    path: filePath,
                    error: validPath.substring('__ERROR__:'.length).trim()
                };
            }
            const fileResult = await readFile(validPath, true);
            return {
                path: filePath,
                content: typeof fileResult === 'string' ? fileResult : fileResult.content,
                mimeType: typeof fileResult === 'string' ? "text/plain" : fileResult.mimeType,
                isImage: typeof fileResult === 'string' ? false : fileResult.isImage
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                path: filePath,
                error: errorMessage
            };
        }
    }));
}
export async function createDirectory(dirPath) {
    // Expand home directory in dirPath before validation
    const expandedDirPath = expandHome(dirPath);
    const validPath = await validatePath(expandedDirPath);
    // Check if the path validation returned an error
    if (validPath.startsWith('__ERROR__:')) {
        throw new Error(validPath.substring('__ERROR__:'.length).trim());
    }
    await fs.mkdir(validPath, { recursive: true });
}
export async function listDirectory(dirPath) {
    console.log(`List directory called with: ${dirPath}`);
    // Handle tilde expansion directly here as well
    const expandedDirPath = expandHome(dirPath);
    console.log(`Expanded dir path: ${expandedDirPath}`);
    const validPath = await validatePath(expandedDirPath);
    console.log(`Valid path: ${validPath}`);
    // Check if the path starts with an error indicator
    if (validPath.startsWith('__ERROR__:')) {
        console.error(`Path validation error: ${validPath}`);
        return [`Error: ${validPath.substring('__ERROR__:'.length).trim()}`];
    }
    try {
        const entries = await fs.readdir(validPath, { withFileTypes: true });
        return entries.map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error reading directory: ${errorMessage}`);
        return [`Error reading directory: ${errorMessage}`];
    }
}
export async function moveFile(sourcePath, destinationPath) {
    // Expand home directory in both paths before validation
    const expandedSourcePath = expandHome(sourcePath);
    const expandedDestPath = expandHome(destinationPath);
    const validSourcePath = await validatePath(expandedSourcePath);
    const validDestPath = await validatePath(expandedDestPath);
    // Check if either path validation returned an error
    if (validSourcePath.startsWith('__ERROR__:')) {
        throw new Error(validSourcePath.substring('__ERROR__:'.length).trim());
    }
    if (validDestPath.startsWith('__ERROR__:')) {
        throw new Error(validDestPath.substring('__ERROR__:'.length).trim());
    }
    await fs.rename(validSourcePath, validDestPath);
}
export async function searchFiles(rootPath, pattern) {
    const results = [];
    async function search(currentPath) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            try {
                // No need to expand home directory here as we're generating full paths
                // from the already validated rootPath
                await validatePath(fullPath);
                if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
                    results.push(fullPath);
                }
                if (entry.isDirectory()) {
                    await search(fullPath);
                }
            }
            catch (error) {
                continue;
            }
        }
    }
    // Expand home directory in rootPath before validation
    const expandedRootPath = expandHome(rootPath);
    const validPath = await validatePath(expandedRootPath);
    // Check if the path validation returned an error
    if (validPath.startsWith('__ERROR__:')) {
        throw new Error(validPath.substring('__ERROR__:'.length).trim());
    }
    await search(validPath);
    return results;
}
export async function getFileInfo(filePath) {
    // Expand home directory in filePath before validation
    const expandedFilePath = expandHome(filePath);
    const validPath = await validatePath(expandedFilePath);
    // Check if the path validation returned an error
    if (validPath.startsWith('__ERROR__:')) {
        throw new Error(validPath.substring('__ERROR__:'.length).trim());
    }
    const stats = await fs.stat(validPath);
    return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8).slice(-3),
    };
}
// This function has been replaced with configManager.getConfig()
// Use get_config tool to retrieve allowedDirectories
