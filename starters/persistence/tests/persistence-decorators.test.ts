/**
 * Annotation-level tests for the persistence starter's decorators, mirroring the style used for
 * `@Bean`/`@Controller`/... in `packages/core/test/decorators-*.test.ts` and `packages/di/test`:
 * call each decorator function directly against throwaway classes and assert on the resulting
 * `PersistenceContext`/`Reflect` metadata state, with no live database involved.
 *
 * For proof that these decorators actually take effect against a real, running Node-Boot
 * application (real schema, real inserts, real transaction commit/rollback), see
 * `persistence-decorators.it.test.ts` and `persistence-migration.it.test.ts`.
 */
import {describe, it, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import {Container} from "typedi";
import {
    DefaultNamingStrategy,
    EntitySubscriberInterface,
    MigrationInterface,
    MongoRepository,
    NamingStrategyInterface,
    QueryRunner,
    Repository,
    TreeRepository,
} from "typeorm";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {QueryResultCacheOptions} from "typeorm/cache/QueryResultCacheOptions";

import {PersistenceContext} from "../src/PersistenceContext";
import {DataRepository} from "../src/decorator/DataRepository";
import {EntityEventSubscriber} from "../src/decorator/EntityEventSubscriber";
import {Migration} from "../src/decorator/Migration";
import {PersistenceCache} from "../src/decorator/PersistenceCache";
import {PersistenceNamingStrategy} from "../src/decorator/PersistenceNamingStrategy";
import {Transactional} from "../src/decorator/Transactional";
import {RepositoryType} from "../src/types";

class Widget {}

describe("persistence decorators (annotation-level, no live database)", () => {
    beforeEach(() => {
        PersistenceContext.reset();
    });

    afterEach(() => {
        PersistenceContext.reset();
    });

    describe("@DataRepository", () => {
        it("registers a Repository-based class with the SQL repository type", () => {
            class WidgetRepository extends Repository<Widget> {}
            DataRepository(Widget)(WidgetRepository as any);

            assert.equal(Reflect.getMetadata("__isRepository", WidgetRepository), true);
            assert.equal(Reflect.getMetadata("custom:repotype", WidgetRepository.prototype), RepositoryType.SQL);
            assert.deepEqual(PersistenceContext.get().repositories, [
                {target: WidgetRepository, entity: Widget, type: RepositoryType.SQL},
            ]);
        });

        it("registers a MongoRepository-based class with the MONGO repository type", () => {
            class WidgetMongoRepository extends MongoRepository<Widget> {}
            DataRepository(Widget)(WidgetMongoRepository as any);

            assert.equal(PersistenceContext.get().repositories[0]?.type, RepositoryType.MONGO);
        });

        it("registers a TreeRepository-based class with the TREE repository type", () => {
            class WidgetTreeRepository extends TreeRepository<Widget> {}
            DataRepository(Widget)(WidgetTreeRepository as any);

            assert.equal(PersistenceContext.get().repositories[0]?.type, RepositoryType.TREE);
        });

        it("throws for a class that doesn't extend a supported TypeORM repository base", () => {
            class NotARepository {}
            assert.throws(() => DataRepository(Widget)(NotARepository as any), /Invalid repository type/);
            assert.equal(PersistenceContext.get().repositories.length, 0);
        });

        it("does not register the same target/entity pair twice", () => {
            class WidgetRepository extends Repository<Widget> {}
            DataRepository(Widget)(WidgetRepository as any);
            DataRepository(Widget)(WidgetRepository as any);

            assert.equal(PersistenceContext.get().repositories.length, 1);
        });
    });

    describe("@EntityEventSubscriber", () => {
        class WidgetSubscriber implements EntitySubscriberInterface<Widget> {
            listenTo() {
                return Widget;
            }
        }

        it("registers the class as an event subscriber", () => {
            EntityEventSubscriber()(WidgetSubscriber);

            assert.deepEqual(PersistenceContext.get().eventSubscribers, [WidgetSubscriber]);
        });

        it("does not register the same subscriber twice", () => {
            EntityEventSubscriber()(WidgetSubscriber);
            EntityEventSubscriber()(WidgetSubscriber);

            assert.equal(PersistenceContext.get().eventSubscribers.length, 1);
        });
    });

    describe("@Migration", () => {
        class AddWidgetsTable implements MigrationInterface {
            async up(_queryRunner: QueryRunner) {}
            async down(_queryRunner: QueryRunner) {}
        }

        it("registers the class as a migration", () => {
            Migration()(AddWidgetsTable);

            assert.deepEqual(PersistenceContext.get().migrations, [AddWidgetsTable]);
        });

        it("does not register the same migration twice", () => {
            Migration()(AddWidgetsTable);
            Migration()(AddWidgetsTable);

            assert.equal(PersistenceContext.get().migrations.length, 1);
        });
    });

    describe("@PersistenceCache", () => {
        class CustomCache implements QueryResultCache {
            async connect() {}
            async disconnect() {}
            async synchronize() {}
            async getFromCache(): Promise<QueryResultCacheOptions | undefined> {
                return undefined;
            }
            async storeInCache() {}
            isExpired() {
                return false;
            }
            async clear() {}
            async remove() {}
        }

        it("registers the class as the active query cache provider", () => {
            PersistenceCache()(CustomCache);

            assert.equal(PersistenceContext.get().queryCache, CustomCache);
        });

        it("applies DI decoration so the class becomes injectable", () => {
            PersistenceCache()(CustomCache);

            const instance = Container.get(CustomCache);
            assert.ok(instance instanceof CustomCache);
        });
    });

    describe("@PersistenceNamingStrategy", () => {
        class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
            override tableName(className: string, customName: string): string {
                return customName ? customName : `nb_${className.toLowerCase()}`;
            }
        }

        it("registers the class as the active naming strategy", () => {
            PersistenceNamingStrategy()(CustomNamingStrategy);

            assert.equal(PersistenceContext.get().namingStrategy, CustomNamingStrategy);
        });
    });

    describe("@Transactional", () => {
        it("replaces the method implementation with a transaction-wrapping function", () => {
            class WidgetService {
                createWidget() {
                    return "created";
                }
            }
            const descriptor = Object.getOwnPropertyDescriptor(WidgetService.prototype, "createWidget")!;
            const originalMethod = descriptor.value;

            Transactional()(WidgetService.prototype, "createWidget", descriptor);

            assert.notEqual(descriptor.value, originalMethod);
            assert.equal(descriptor.value.name, "createWidget");
        });

        it("copies pre-existing reflect metadata from the original method onto the wrapper", () => {
            class WidgetService {
                createWidget() {
                    return "created";
                }
            }
            const descriptor = Object.getOwnPropertyDescriptor(WidgetService.prototype, "createWidget")!;
            Reflect.defineMetadata("custom:marker", "hello", descriptor.value);

            Transactional()(WidgetService.prototype, "createWidget", descriptor);

            assert.equal(Reflect.getMetadata("custom:marker", descriptor.value), "hello");
        });
    });
});
