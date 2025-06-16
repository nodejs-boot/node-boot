/**
 * Configuration options for query caching.
 *
 * Allows configuring different cache types, expiration, error handling,
 * and specific options for the underlying cache provider.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export type QueryCacheProperties = {
    /**
     * Type of caching.
     *
     * - `"database"`: cached values will be stored in a separate table in the database. This is the default.
     * - `"redis"`: cached values will be stored inside Redis. You must provide Redis connection options.
     * - `"ioredis"`: cached values will be stored inside an ioredis instance.
     * - `"ioredis/cluster"`: cached values will be stored inside an ioredis cluster.
     *
     * // todo: add MongoDB and other cache providers in the future.
     */
    type?: "database" | "redis" | "ioredis" | "ioredis/cluster";

    /**
     * Configurable table name for `"database"` type cache.
     * Default value is `"query-result-cache"`.
     */
    tableName?: string;

    /**
     * Used to provide connection options for the Redis or other cache providers.
     */
    options?: any;

    /**
     * If set to `true`, queries (using find methods and QueryBuilder's methods) will always be cached.
     */
    alwaysEnabled?: boolean;

    /**
     * Time in milliseconds before the cache expires.
     * This can also be set on a per-query basis.
     * Default value is `1000` (1 second).
     */
    duration?: number;

    /**
     * Specifies whether cache errors should be ignored,
     * allowing the query to pass through directly to the database.
     */
    ignoreErrors?: boolean;
};
