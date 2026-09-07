import "reflect-metadata";
import {describe, it, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext} from "../src/ApplicationContext";
import {ApplicationFeatureAdapter} from "../src/adapters";
import {LIFECYCLE_TYPE_METADATA_KEY} from "../src/metadata/metadata.keys";
import {LifecycleType} from "../src/types";
import {IocContainer} from "../src/ioc";

function makeAdapter(): ApplicationFeatureAdapter {
    return {bind: () => undefined};
}

describe("ApplicationContext", () => {
    // The context is a process-wide singleton with no reset method, so every test snapshots
    // the fields it mutates and restores them afterwards to avoid bleeding state into other tests.
    let snapshot: {
        applicationFeatureAdapters: ApplicationFeatureAdapter[];
        diOptions: any;
        serverType: string;
    };

    beforeEach(() => {
        const context = ApplicationContext.get();
        snapshot = {
            applicationFeatureAdapters: context.applicationFeatureAdapters,
            diOptions: context.diOptions,
            serverType: context.serverType,
        };
    });

    afterEach(() => {
        const context = ApplicationContext.get();
        context.applicationFeatureAdapters = snapshot.applicationFeatureAdapters;
        context.diOptions = snapshot.diOptions;
        context.serverType = snapshot.serverType;
    });

    describe("get()", () => {
        it("returns the same singleton instance on repeated calls", () => {
            const a = ApplicationContext.get();
            const b = ApplicationContext.get();
            assert.equal(a, b);
        });

        it("provides sensible default field state", () => {
            const context = ApplicationContext.get();
            assert.deepEqual(context.applicationOptions, context.applicationOptions);
            assert.ok(Array.isArray(context.configurationAdapters));
            assert.ok(Array.isArray(context.configurationPropertiesAdapters));
            assert.ok(Array.isArray(context.applicationFeatureAdapters));
            assert.ok(Array.isArray(context.controllerClasses));
            assert.ok(Array.isArray(context.interceptorClasses));
            assert.ok(Array.isArray(context.globalMiddlewares));
        });

        it("reflects field mutations across subsequent get() calls (delta assertion)", () => {
            const context = ApplicationContext.get();
            const before = context.controllerClasses.length;

            class SomeController {}
            context.controllerClasses.push(SomeController);

            assert.equal(ApplicationContext.get().controllerClasses.length, before + 1);
            assert.ok(ApplicationContext.get().controllerClasses.includes(SomeController));

            // cleanup this specific mutation (not part of the snapshot/restore fields above)
            context.controllerClasses.splice(context.controllerClasses.indexOf(SomeController), 1);
        });
    });

    describe("getIocContainer()", () => {
        it("returns undefined when diOptions is not set", () => {
            ApplicationContext.get().diOptions = undefined;
            assert.equal(ApplicationContext.getIocContainer(), undefined);
        });

        it("returns undefined when diOptions is set but iocContainer is not", () => {
            ApplicationContext.get().diOptions = {} as any;
            assert.equal(ApplicationContext.getIocContainer(), undefined);
        });

        it("returns the registered IoC container", () => {
            const fakeContainer = {get: () => undefined} as unknown as IocContainer;
            ApplicationContext.get().diOptions = {iocContainer: fakeContainer};

            assert.equal(ApplicationContext.getIocContainer(), fakeContainer);
        });
    });

    describe("getAppFeatureAdapters()", () => {
        it("defaults an adapter without @Lifecycle metadata to 'application.initialized'", () => {
            const context = ApplicationContext.get();
            const undecorated = makeAdapter();
            context.applicationFeatureAdapters = [undecorated];

            const initialized = ApplicationContext.getAppFeatureAdapters("application.initialized");
            assert.ok(initialized.includes(undecorated));

            const started = ApplicationContext.getAppFeatureAdapters("application.started");
            assert.ok(!started.includes(undecorated));
        });

        it("filters adapters by their @Lifecycle-assigned metadata", () => {
            const context = ApplicationContext.get();

            class PersistenceFeature implements ApplicationFeatureAdapter {
                bind() {}
            }
            Reflect.defineMetadata(
                LIFECYCLE_TYPE_METADATA_KEY,
                "persistence.started" as LifecycleType,
                PersistenceFeature,
            );
            const persistenceAdapter = new PersistenceFeature();

            class StartedFeature implements ApplicationFeatureAdapter {
                bind() {}
            }
            Reflect.defineMetadata(LIFECYCLE_TYPE_METADATA_KEY, "application.started" as LifecycleType, StartedFeature);
            const startedAdapter = new StartedFeature();

            context.applicationFeatureAdapters = [persistenceAdapter, startedAdapter];

            const persistenceResults = ApplicationContext.getAppFeatureAdapters("persistence.started");
            assert.deepEqual(persistenceResults, [persistenceAdapter]);

            const startedResults = ApplicationContext.getAppFeatureAdapters("application.started");
            assert.deepEqual(startedResults, [startedAdapter]);

            const initializedResults = ApplicationContext.getAppFeatureAdapters("application.initialized");
            assert.deepEqual(initializedResults, []);
        });

        it("returns an empty array when there are no adapters registered", () => {
            ApplicationContext.get().applicationFeatureAdapters = [];
            assert.deepEqual(ApplicationContext.getAppFeatureAdapters("application.started"), []);
        });

        it("returns multiple adapters that share the same lifecycle", () => {
            const context = ApplicationContext.get();

            class FeatureOne implements ApplicationFeatureAdapter {
                bind() {}
            }
            class FeatureTwo implements ApplicationFeatureAdapter {
                bind() {}
            }
            Reflect.defineMetadata(LIFECYCLE_TYPE_METADATA_KEY, "application.stopped" as LifecycleType, FeatureOne);
            Reflect.defineMetadata(LIFECYCLE_TYPE_METADATA_KEY, "application.stopped" as LifecycleType, FeatureTwo);

            const one = new FeatureOne();
            const two = new FeatureTwo();
            context.applicationFeatureAdapters = [one, two];

            const results = ApplicationContext.getAppFeatureAdapters("application.stopped");
            assert.deepEqual(results, [one, two]);
        });
    });
});
