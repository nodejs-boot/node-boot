import {DataSource} from "typeorm";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {QueryResultCacheOptions} from "typeorm/cache/QueryResultCacheOptions";
import {PersistenceCache} from "../../src";

export const cacheEvents: string[] = [];

/**
 * Minimal in-memory `QueryResultCache` implementation used to prove `@PersistenceCache()` actually
 * wires a custom cache provider into the DataSource, instead of TypeORM's own default database
 * cache table - every call is recorded in `cacheEvents` for the test to assert on.
 */
@PersistenceCache()
export class TrackingQueryCache implements QueryResultCache {
    private readonly store = new Map<string, QueryResultCacheOptions>();

    constructor(private readonly connection: DataSource) {
        void this.connection;
    }

    async connect(): Promise<void> {
        cacheEvents.push("connect");
    }

    async disconnect(): Promise<void> {
        cacheEvents.push("disconnect");
    }

    async synchronize(): Promise<void> {}

    async getFromCache(options: QueryResultCacheOptions): Promise<QueryResultCacheOptions | undefined> {
        const key = options.identifier ?? options.query ?? "";
        cacheEvents.push(`get:${key}`);
        return this.store.get(key);
    }

    async storeInCache(options: QueryResultCacheOptions): Promise<void> {
        const key = options.identifier ?? options.query ?? "";
        cacheEvents.push(`store:${key}`);
        this.store.set(key, {...options, time: Date.now()});
    }

    isExpired(): boolean {
        return false;
    }

    async clear(): Promise<void> {
        this.store.clear();
    }

    async remove(): Promise<void> {}
}
