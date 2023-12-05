export type QueryCacheProperties = {
    /**
     * Type of caching.
     *
     * - "database" means cached values will be stored in the separate table in database. This is default value.
     * - "redis" means cached values will be stored inside redis. You must provide redis connection options.
     */
    type?: "database" | "redis" | "ioredis" | "ioredis/cluster"; // todo: add mongodb and other cache providers as well in the future

    /**
     * Configurable table name for "database" type cache.
     * Default value is "query-result-cache"
     */
    tableName?: string;

    /**
     * Used to provide redis connection options.
     */
    options?: any;

    /**
     * If set to true then queries (using find methods and QueryBuilder's methods) will always be cached.
     */
    alwaysEnabled?: boolean;

    /**
     * Time in milliseconds in which cache will expire.
     * This can be setup per-query.
     * Default value is 1000 which is equivalent to 1 second.
     */
    duration?: number;

    /**
     * Used to specify if cache errors should be ignored, and pass through the call to the Database.
     */
    ignoreErrors?: boolean;
};
