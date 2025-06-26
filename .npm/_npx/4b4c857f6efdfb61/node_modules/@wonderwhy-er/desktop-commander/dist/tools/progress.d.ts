import { z } from "zod";
export declare const LongRunningTaskSchema: z.ZodObject<{
    total_steps: z.ZodDefault<z.ZodNumber>;
    step_duration: z.ZodDefault<z.ZodNumber>;
    should_fail: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    total_steps: number;
    step_duration: number;
    should_fail: boolean;
}, {
    total_steps?: number | undefined;
    step_duration?: number | undefined;
    should_fail?: boolean | undefined;
}>;
export declare function executeLongRunning(args: unknown, server: any, progressToken?: string): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
