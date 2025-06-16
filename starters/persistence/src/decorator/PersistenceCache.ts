import {PersistenceContext} from "../PersistenceContext";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {decorateDi} from "@nodeboot/di";

/**
 * Decorator to register a custom QueryResultCache implementation for persistence query caching.
 *
 * This decorator applies dependency injection decoration and sets the provided class
 * as the active query cache provider in the persistence context.
 *
 * @template T - A class extending TypeORM's QueryResultCache.
 * @returns {ClassDecorator} The class decorator function.
 *
 * @example
 * ```ts
 * import {PersistenceCache} from "@nodeboot/starter-persistence";
 * import {QueryResultCache} from "typeorm/cache/QueryResultCache";
 *
 * @PersistenceCache()
 * class CustomQueryCache extends QueryResultCache {
 *   // custom cache implementation
 * }
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function PersistenceCache<T extends new (...args: any[]) => QueryResultCache>() {
    return (target: T) => {
        // Inject dependencies if DI container is configured
        decorateDi(target);
        PersistenceContext.get().queryCache = target;
    };
}
