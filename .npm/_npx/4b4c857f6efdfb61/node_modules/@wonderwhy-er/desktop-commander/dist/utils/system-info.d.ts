export interface SystemInfo {
    platform: string;
    platformName: string;
    defaultShell: string;
    pathSeparator: string;
    isWindows: boolean;
    isMacOS: boolean;
    isLinux: boolean;
    examplePaths: {
        home: string;
        temp: string;
        absolute: string;
    };
}
/**
 * Get comprehensive system information for tool prompts
 */
export declare function getSystemInfo(): SystemInfo;
/**
 * Generate OS-specific guidance for tool prompts
 */
export declare function getOSSpecificGuidance(systemInfo: SystemInfo): string;
/**
 * Get common development tool guidance based on OS
 */
export declare function getDevelopmentToolGuidance(systemInfo: SystemInfo): string;
/**
 * Get path guidance (simplified since paths are normalized)
 */
export declare function getPathGuidance(systemInfo: SystemInfo): string;
