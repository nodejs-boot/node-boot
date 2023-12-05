import {RepositoryMetadata} from "./metadata/RepositoryMetadata";
import {NamingStrategyInterface} from "typeorm/naming-strategy/NamingStrategyInterface";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {EntitySubscriberInterface, MigrationInterface} from "typeorm";

export class PersistenceContext {
    private static context: PersistenceContext;

    repositories: RepositoryMetadata[] = [];
    migrations: (new (...args: any[]) => MigrationInterface)[] = [];
    eventSubscribers: (new (...args: any[]) => EntitySubscriberInterface)[] = [];
    namingStrategy?: new (...args: any[]) => NamingStrategyInterface;
    queryCache?: new (...args: any[]) => QueryResultCache;

    static get(): PersistenceContext {
        if (!PersistenceContext.context) {
            PersistenceContext.context = new PersistenceContext();
        }
        return PersistenceContext.context;
    }
}
