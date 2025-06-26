import { CommandExecutionResult } from '../types.js';
/**
 * Platform detection and sandbox execution router
 */
export declare function executeSandboxedCommand(command: string, timeoutMs?: number, shell?: string): Promise<CommandExecutionResult>;
/**
 * Check if sandboxed execution is available for the current platform
 */
export declare function isSandboxAvailable(): boolean;
