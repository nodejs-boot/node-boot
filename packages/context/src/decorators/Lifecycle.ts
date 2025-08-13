import {ApplicationFeatureAdapter} from "../adapters";
import {LifecycleType} from "../types";
import {LIFECYCLE_TYPE_METADATA_KEY} from "../metadata";

/**
 * Class decorator that associates a specific lifecycle phase with an application feature.
 *
 * The lifecycle type determines **when** during the application’s execution
 * the decorated feature will be initialized, started, or stopped.
 *
 * This decorator is typically applied to classes implementing `ApplicationFeatureAdapter`,
 * allowing the application runtime to automatically discover and invoke them
 * at the appropriate lifecycle stage.
 *
 * **Lifecycle phases:**
 * - `"application.initialized"` — Runs after core application setup but before services start.
 * - `"application.started"` — Runs after all services are up and the application is ready.
 * - `"persistence.started"` — Runs when persistence/data layer is initialized.
 * - `"application.stopped"` — Runs during graceful shutdown.
 *
 * **Example usage:**
 * ```ts
 * // 1. Run after app initialization
 * @Lifecycle("application.initialized")
 * export class CacheWarmupFeature implements ApplicationFeatureAdapter {
 *   async bind(context: ApplicationFeatureContext) {
 *     console.log("Preloading caches...");
 *   }
 * }
 *
 * // 2. Run when persistence layer starts
 * @Lifecycle("persistence.started")
 * export class MigrationRunnerFeature implements ApplicationFeatureAdapter {
 *   async bind(context: ApplicationFeatureContext) {
 *     await runMigrations();
 *   }
 * }
 *
 * // 3. Run during graceful shutdown
 * @Lifecycle("application.stopped")
 * export class CleanupFeature implements ApplicationFeatureAdapter {
 *   async bind(context: ApplicationFeatureContext) {
 *     await cleanupResources();
 *   }
 * }
 * ```
 *
 * @param type - The lifecycle phase in which the decorated feature should be invoked.
 * @returns A class decorator that stores lifecycle metadata for runtime orchestration.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function Lifecycle<THandler extends new (...args: any[]) => ApplicationFeatureAdapter>(type: LifecycleType) {
    return (target: THandler) => {
        Reflect.defineMetadata(LIFECYCLE_TYPE_METADATA_KEY, type, target);
    };
}
