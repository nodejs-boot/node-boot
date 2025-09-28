import {ApplicationContext} from "../ApplicationContext";
import {LoggerService} from "../services";

/**
 * Metadata for shutdown hook methods
 */
export interface ShutdownHookMetadata {
    target: any;
    methodName: string | symbol;
    priority: number;
    timeout?: number;
}

/**
 * Centralized context for managing shutdown hooks and application cleanup.
 *
 * This singleton class tracks all shutdown hooks registered via @ShutdownHook decorator
 * and provides automatic cleanup during application shutdown, hot reload, or process termination.
 *
 * Features:
 * - Automatic process signal handling (SIGINT, SIGTERM, SIGUSR2, etc.)
 * - Priority-based hook execution
 * - Timeout support for cleanup operations
 * - Integration with NodeBoot application lifecycle
 * - Memory leak prevention
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export class ShutdownHookContext {
    private static context: ShutdownHookContext;
    private readonly shutdownHooks: ShutdownHookMetadata[] = [];
    private isShuttingDown = false;
    private processListenersRegistered = false;

    private constructor() {}

    /**
     * Get the singleton instance of ShutdownHookContext
     * @return ShutdownHookContext instance
     */
    static get(): ShutdownHookContext {
        if (!ShutdownHookContext.context) {
            ShutdownHookContext.context = new ShutdownHookContext();
        }
        return ShutdownHookContext.context;
    }

    /**
     * Register a shutdown hook method to be called during application shutdown.
     *
     * @param metadata - Metadata describing the shutdown hook
     *
     * @example
     * ```typescript
     * ShutdownHookContext.get().addShutdownHook({
     *   target: myServiceInstance,
     *   methodName: 'cleanupMethod',
     *   priority: 100,
     *   timeout: 5000
     * });
     * ```
     */
    addShutdownHook(metadata: ShutdownHookMetadata): void {
        // Prevent duplicates
        const exists = this.shutdownHooks.some(
            hook => hook.target === metadata.target && hook.methodName === metadata.methodName,
        );

        if (!exists) {
            this.shutdownHooks.push(metadata);
            // Sort by priority (higher numbers execute first)
            this.shutdownHooks.sort((a, b) => b.priority - a.priority);
        }

        // Auto-register process listeners on first hook
        if (!this.processListenersRegistered) {
            this.registerProcessListeners();
        }
    }

    /**
     * Remove a shutdown hook method (if needed)
     *
     * @param target - The instance containing the method
     * @param methodName - The name of the method to remove
     *
     * @example
     * ```typescript
     * ShutdownHookContext.get().removeShutdownHook(myServiceInstance, 'cleanupMethod');
     * ```
     */
    removeShutdownHook(target: any, methodName: string | symbol): void {
        const index = this.shutdownHooks.findIndex(hook => hook.target === target && hook.methodName === methodName);
        if (index !== -1) {
            this.shutdownHooks.splice(index, 1);
        }
    }

    /**
     * Get count of registered shutdown hooks (for testing/debugging)
     *
     * @return number of registered shutdown hooks
     *
     * @example
     * ```typescript
     * const count = ShutdownHookContext.get().getShutdownHooksCount();
     * console.log(`Registered shutdown hooks: ${count}`);
     * ```
     */
    getShutdownHooksCount(): number {
        return this.shutdownHooks.length;
    }

    /**
     * Execute all shutdown hooks in priority order with error handling and timeouts.
     * This is called automatically during application shutdown or can be invoked manually.
     *
     * @param reason - Optional reason for shutdown (e.g. signal name)
     */
    async executeShutdownHooks(reason = "shutdown"): Promise<void> {
        if (this.isShuttingDown) {
            return; // Prevent multiple executions
        }

        this.isShuttingDown = true;
        const context = ApplicationContext.get();
        const logger = context.diOptions?.iocContainer?.get("logger") as LoggerService;

        logger?.info(
            `🛑 NodeBoot shutdown initiated (${reason}). Executing ${this.shutdownHooks.length} cleanup hooks...`,
        );

        for (const hook of this.shutdownHooks) {
            try {
                logger?.info(
                    `🧹 Executing shutdown hook: ${hook.target.constructor?.name || "Unknown"}::${String(
                        hook.methodName,
                    )}()`,
                );

                // Get the bean instance from DI container
                let beanInstance;
                if (context.diOptions?.iocContainer) {
                    try {
                        beanInstance = context.diOptions.iocContainer.get(hook.target.constructor);
                    } catch {
                        beanInstance = hook.target; // Fallback to target itself
                    }
                } else {
                    beanInstance = hook.target;
                }

                // Execute the cleanup method with timeout
                const cleanupPromise = Promise.resolve(beanInstance[hook.methodName]());

                if (hook.timeout) {
                    await Promise.race([
                        cleanupPromise,
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Shutdown hook timeout")), hook.timeout),
                        ),
                    ]);
                } else {
                    await cleanupPromise;
                }

                logger?.info(
                    `✅ Shutdown hook completed: ${hook.target.constructor?.name || "Unknown"}::${String(
                        hook.methodName,
                    )}()`,
                );
            } catch (error: any) {
                logger?.error(
                    `❌ Shutdown hook failed: ${hook.target.constructor?.name || "Unknown"}::${String(
                        hook.methodName,
                    )}() - ${error.message}`,
                );
                // Continue with other hooks even if one fails
            }
        }

        logger?.info(`🏁 NodeBoot shutdown hooks completed`);
    }

    /**
     * Register process signal listeners for automatic cleanup
     * - SIGINT (Ctrl+C)
     * - SIGTERM (kill command)
     * - SIGUSR2 (nodemon/ts-node-dev hot reload)
     * - uncaughtException
     * - unhandledRejection
     *
     * This is called automatically when the first shutdown hook is registered.
     * Subsequent calls have no effect.
     */
    private registerProcessListeners(): void {
        if (this.processListenersRegistered) return;

        const gracefulShutdown = async (signal: string) => {
            await this.executeShutdownHooks(signal);
            process.exit(0);
        };

        const forcefulShutdown = async (signal: string) => {
            await this.executeShutdownHooks(signal);
            process.exit(1);
        };

        // Graceful shutdown signals
        process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // kill command

        // Hot reload (nodemon, ts-node-dev)
        process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // nodemon restart

        // Error conditions
        process.on("uncaughtException", async error => {
            console.error("Uncaught Exception:", error);
            await forcefulShutdown("uncaughtException");
        });

        process.on("unhandledRejection", async reason => {
            console.error("Unhandled Rejection:", reason);
            await forcefulShutdown("unhandledRejection");
        });

        this.processListenersRegistered = true;
        console.log("🎯 NodeBoot shutdown hooks registered for process signals");
    }

    /**
     * Clear all shutdown hooks (useful for testing)
     */
    clear(): void {
        this.shutdownHooks.length = 0;
        this.isShuttingDown = false;
    }

    /**
     * Reset the singleton context (for testing purposes only)
     * This clears all registered hooks and process listeners.
     * Use with caution as it affects global state.
     */
    static reset(): void {
        if (ShutdownHookContext.context) {
            ShutdownHookContext.context.clear();
        }
        ShutdownHookContext.context = undefined as any;
    }
}
