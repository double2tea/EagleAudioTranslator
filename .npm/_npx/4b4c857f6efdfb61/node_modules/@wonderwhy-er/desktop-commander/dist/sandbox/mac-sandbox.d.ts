/**
 * Generate a temporary sandbox profile for macOS that restricts access to allowed directories
 * @param allowedDirectories Array of directories that should be accessible
 * @returns Path to the generated sandbox profile file
 */
export declare function generateSandboxProfile(allowedDirectories: string[]): Promise<string>;
/**
 * Execute a command in a macOS sandbox with access restricted to allowed directories
 * @param command Command to execute
 * @param allowedDirectories Array of allowed directory paths
 * @param options Additional execution options
 * @returns Promise resolving to the execution result
 */
export declare function executeSandboxedCommand(command: string, allowedDirectories: string[], timeoutMs?: number): Promise<{
    output: string;
    exitCode: number | null;
    isBlocked: boolean;
    pid: number;
}>;
