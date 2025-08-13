import {BEAN_PROFILE_METADATA_KEY} from "../metadata";
import {toTargetClass} from "../utils";

/**
 * Class decorator that associates one or more profiles with a bean or configuration class.
 *
 * Profiles allow you to conditionally load or register beans/controllers/configurations
 * based on the application's active profiles.
 *
 * **How it works:**
 * - When the application starts, it checks the `NODE_BOOT_ACTIVE_PROFILES` environment variable
 *   for a comma-separated list of active profiles.
 * - If a class has a `@Profile` decorator, it will only be loaded if **at least one** of its
 *   specified profiles matches one of the active profiles.
 *
 * **Setting active profiles:**
 * ```bash
 * export NODE_BOOT_ACTIVE_PROFILES=kubernetes,v2
 * ```
 *
 * **Typical usage:**
 * - Apply to **controller classes** that should only be exposed in certain environments.
 * - Apply to **service classes** that have environment-specific implementations.
 * - Apply to **configuration classes** to enable or disable bean registration based on profiles.
 *
 * **Examples:**
 * ```ts
 * // Example 1: Restrict a controller to HTTP profile only
 * @Profile(["http"])
 * @Controller("/users")
 * export class UserController {
 *   // ...
 * }
 *
 * // Example 2: Load a bean only if datadog profile is active
 * @Profile(["datadog"])
 * @Configuration()
 * export class DevDatabaseConfig {
 *
 *  @Bean() // This bean will only be created if "datadog"profile is active
 *  public databaseConnection(): DatabaseConnection {
 *    return new DatabaseConnection("dev-db-url");
 *  }
 *   // ...
 * }
 *
 * // Example 3: Environment-specific service implementation
 * @Profile(["kubernetes"])
 * @Service()
 * export class KubernetesClusterService implements ClusterService {
 *   // ...
 * }
 * ```
 *
 * @param profiles - One or more profile names that the decorated class belongs to.
 * @returns A class decorator that stores profile metadata for conditional loading.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function Profile(profiles: string[]): ClassDecorator {
    return function (target: Function) {
        Reflect.defineMetadata(BEAN_PROFILE_METADATA_KEY, profiles, target);
    };
}

/**
 * Retrieves the active profiles from the environment variable `NODE_BOOT_ACTIVE_PROFILES`.
 * If the variable is not set, it returns an empty array.
 *
 * @returns {string[]} - An array of active profile names.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function getActiveProfiles(): string[] {
    return process.env["NODE_BOOT_ACTIVE_PROFILES"]
        ? process.env["NODE_BOOT_ACTIVE_PROFILES"].split(",").map(profile => profile.trim())
        : [];
}

/**
 * Checks if the given target is allowed based on the active profiles.
 * If no active profiles are defined, all configurations are allowed.
 * If the target has no required profiles, it is also allowed.
 *
 * @param target - The target configuration or class to check against the active profiles.
 * @returns {boolean} - Returns true if the target is allowed, false otherwise.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function allowedProfiles<T>(target: T | (new (...args: any[]) => T)): boolean {
    const activeProfiles = getActiveProfiles();

    if (activeProfiles.length === 0) {
        return true; // No active profiles, so all configurations are allowed
    }

    // Convert the target to its class constructor if it's an instance
    const targetClass = toTargetClass(target);

    // Check if the configuration has any required profiles
    if (!Reflect.hasMetadata(BEAN_PROFILE_METADATA_KEY, targetClass)) {
        return true; // No required profiles, so all configurations are allowed
    }

    // Get the required profiles from metadata
    const requiredProfiles: string[] = Reflect.getMetadata(BEAN_PROFILE_METADATA_KEY, targetClass) ?? [];
    // Check if any of the required profiles match the active profiles
    return requiredProfiles.some(profile => activeProfiles.includes(profile));
}
