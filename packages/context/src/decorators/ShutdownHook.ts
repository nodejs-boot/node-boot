import {ShutdownHookContext, ShutdownHookMetadata} from "../shutdown";

/**
 * Options for configuring a shutdown hook
 */
export interface ShutdownHookOptions {
    /**
     * Priority of the shutdown hook (higher numbers execute first)
     * Default: 0
     */
    priority?: number;

    /**
     * Timeout in milliseconds for the cleanup operation
     * If not specified, no timeout is applied
     */
    timeout?: number;
}

/**
 * Decorator to mark a method as a shutdown hook that will be automatically
 * executed during application shutdown, hot reload, or process termination.
 *
 * The decorated method will be called automatically when:
 * - Process receives SIGINT (Ctrl+C)
 * - Process receives SIGTERM (kill command)
 * - Process receives SIGUSR2 (nodemon/ts-node-dev hot reload)
 * - Uncaught exception or unhandled promise rejection occurs
 *
 * Features:
 * - Priority-based execution order
 * - Timeout support for cleanup operations
 * - Automatic DI container integration
 * - Error handling and logging
 * - Supports both sync and async cleanup methods
 *
 * @param options - Configuration options for the shutdown hook
 *
 * @example
 * ```typescript
 * @Service()
 * class DatabaseService {
 *   private connection: Connection;
 *
 *   @ShutdownHook({ priority: 100, timeout: 5000 })
 *   async closeConnection() {
 *     await this.connection.close();
 *     console.log('Database connection closed');
 *   }
 * }
 *
 * @Service()
 * class CacheService {
 *   private cache: RedisClient;
 *
 *   @ShutdownHook({ priority: 50 })
 *   async flushCache() {
 *     await this.cache.flushall();
 *     await this.cache.quit();
 *   }
 * }
 * ```
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function ShutdownHook(options: ShutdownHookOptions = {}): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
        const metadata: ShutdownHookMetadata = {
            target,
            methodName: propertyKey,
            priority: options.priority || 0,
            timeout: options.timeout,
        };

        // Register the shutdown hook with the context
        ShutdownHookContext.get().addShutdownHook(metadata);

        // Add metadata to the method for introspection
        Reflect.defineMetadata("shutdown:hook", true, target, propertyKey);
    };
}
