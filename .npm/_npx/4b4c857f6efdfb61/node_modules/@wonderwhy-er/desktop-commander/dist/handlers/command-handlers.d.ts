import { ServerResult } from '../types.js';
/**
 * Handle block_command command
 */
export declare function handleBlockCommand(args: unknown): Promise<ServerResult>;
/**
 * Handle unblock_command command
 */
export declare function handleUnblockCommand(args: unknown): Promise<ServerResult>;
/**
 * Handle list_blocked_commands command
 */
export declare function handleListBlockedCommands(): ServerResult;
