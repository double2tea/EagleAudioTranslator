import { commandManager } from '../command-manager.js';
import { logToFile } from '../logging.js';
import { BlockCommandArgsSchema, UnblockCommandArgsSchema } from './schemas.js';
export async function blockCommand(args) {
    await logToFile('Processing block_command request');
    const parsed = BlockCommandArgsSchema.safeParse(args);
    if (!parsed.success) {
        throw new Error(`Invalid arguments for block_command: ${parsed.error}`);
    }
    const success = await commandManager.blockCommand(parsed.data.command);
    if (!success) {
        return {
            content: [{
                    type: "text",
                    text: `Command '${parsed.data.command}' is already blocked.`
                }],
        };
    }
    await logToFile(`Added '${parsed.data.command}' to blocked commands`);
    return {
        content: [{
                type: "text",
                text: `Command '${parsed.data.command}' has been blocked. Current blocked commands: ${commandManager.listBlockedCommands().join(', ')}`
            }],
    };
}
export async function unblockCommand(args) {
    await logToFile('Processing unblock_command request');
    const parsed = UnblockCommandArgsSchema.safeParse(args);
    if (!parsed.success) {
        throw new Error(`Invalid arguments for unblock_command: ${parsed.error}`);
    }
    const success = await commandManager.unblockCommand(parsed.data.command);
    if (!success) {
        return {
            content: [{
                    type: "text",
                    text: `Command '${parsed.data.command}' is not blocked.`
                }],
        };
    }
    await logToFile(`Removed '${parsed.data.command}' from blocked commands`);
    return {
        content: [{
                type: "text",
                text: `Command '${parsed.data.command}' has been unblocked. Current blocked commands: ${commandManager.listBlockedCommands().join(', ')}`
            }],
    };
}
export async function listBlockedCommands() {
    await logToFile('Processing list_blocked_commands request');
    const blockedList = commandManager.listBlockedCommands();
    await logToFile(`Listed ${blockedList.length} blocked commands`);
    return {
        content: [{
                type: "text",
                text: blockedList.length > 0
                    ? `Currently blocked commands:\n${blockedList.join('\n')}`
                    : "No commands are currently blocked."
            }],
    };
}
