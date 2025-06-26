/**
 * Read a file from either the local filesystem or a URL
 * @param filePath Path to the file or URL
 * @param returnMetadata Whether to return metadata with the content
 * @param isUrl Whether the path is a URL
 * @returns File content or file result with metadata
 */
export declare function readFile(filePath: string, returnMetadata?: boolean, isUrl?: boolean): Promise<string | FileResult>;
export declare function writeFile(filePath: string, content: string): Promise<void>;
export interface MultiFileResult {
    path: string;
    content?: string;
    mimeType?: string;
    isImage?: boolean;
    error?: string;
}
export declare function readMultipleFiles(paths: string[]): Promise<MultiFileResult[]>;
export declare function createDirectory(dirPath: string): Promise<void>;
export declare function listDirectory(dirPath: string): Promise<string[]>;
export declare function moveFile(sourcePath: string, destinationPath: string): Promise<void>;
export declare function searchFiles(rootPath: string, pattern: string): Promise<string[]>;
export declare function getFileInfo(filePath: string): Promise<Record<string, any>>;
