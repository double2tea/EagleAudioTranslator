export declare function blockCommand(args: unknown): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function unblockCommand(args: unknown): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare function listBlockedCommands(): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
