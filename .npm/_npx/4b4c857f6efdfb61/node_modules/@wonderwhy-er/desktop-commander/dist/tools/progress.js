import { z } from "zod";
export const LongRunningTaskSchema = z.object({
    total_steps: z.number().default(5).describe("Total number of steps to execute"),
    step_duration: z.number().default(1000).describe("Duration of each step in milliseconds"),
    should_fail: z.boolean().default(false).describe("Whether the task should fail midway through"),
});
export async function executeLongRunning(args, server, progressToken) {
    const parsed = LongRunningTaskSchema.safeParse(args);
    if (!parsed.success) {
        throw new Error(`Invalid arguments for long_running_task: ${parsed.error}`);
    }
    const { total_steps, step_duration, should_fail } = parsed.data;
    try {
        for (let step = 1; step <= total_steps; step++) {
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, step_duration));
            // Send progress notification if we have a token
            if (progressToken) {
                await server.notification({
                    method: "notifications/progress",
                    params: {
                        progress: step,
                        total: total_steps,
                        progressToken,
                        detail: `Completed step ${step} of ${total_steps}${should_fail && step === Math.floor(total_steps / 2)
                            ? ' (about to fail)'
                            : ''}`
                    }
                });
            }
            // If should_fail is true, fail halfway through
            if (should_fail && step === Math.floor(total_steps / 2)) {
                throw new Error("Task failed halfway through as requested");
            }
        }
        return {
            content: [{
                    type: "text",
                    text: `Long running task completed successfully after ${total_steps} steps`
                }]
        };
    }
    catch (error) {
        // Send error notification if we have a token
        if (progressToken) {
            await server.notification({
                method: "notifications/progress",
                params: {
                    progress: Math.floor(total_steps / 2),
                    total: total_steps,
                    progressToken,
                    detail: error instanceof Error ? error.message : 'Unknown error',
                    error: true
                }
            });
        }
        throw error;
    }
}
