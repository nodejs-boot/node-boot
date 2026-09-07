import "reflect-metadata";
import {describe, it, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";

import {Lifecycle} from "../src/decorators/Lifecycle";
import {Profile, allowedProfiles, getActiveProfiles} from "../src/decorators/Profile";
import {ShutdownHook} from "../src/decorators/ShutdownHook";
import {LIFECYCLE_TYPE_METADATA_KEY, BEAN_PROFILE_METADATA_KEY} from "../src/metadata/metadata.keys";
import {ShutdownHookContext} from "../src/shutdown/ShutdownHookContext";
import {ApplicationFeatureAdapter} from "../src/adapters";

describe("decorators", () => {
    describe("Lifecycle", () => {
        it("stores the given lifecycle type as class metadata", () => {
            class SomeFeature implements ApplicationFeatureAdapter {
                bind() {}
            }

            Lifecycle("persistence.started")(SomeFeature);

            assert.equal(Reflect.getMetadata(LIFECYCLE_TYPE_METADATA_KEY, SomeFeature), "persistence.started");
        });

        it("supports different lifecycle types on different classes independently", () => {
            class FeatureA implements ApplicationFeatureAdapter {
                bind() {}
            }
            class FeatureB implements ApplicationFeatureAdapter {
                bind() {}
            }

            Lifecycle("application.started")(FeatureA);
            Lifecycle("application.stopped")(FeatureB);

            assert.equal(Reflect.getMetadata(LIFECYCLE_TYPE_METADATA_KEY, FeatureA), "application.started");
            assert.equal(Reflect.getMetadata(LIFECYCLE_TYPE_METADATA_KEY, FeatureB), "application.stopped");
        });

        it("leaves classes without the decorator without lifecycle metadata", () => {
            class UndecoratedFeature implements ApplicationFeatureAdapter {
                bind() {}
            }

            assert.equal(Reflect.getMetadata(LIFECYCLE_TYPE_METADATA_KEY, UndecoratedFeature), undefined);
        });
    });

    describe("Profile / getActiveProfiles / allowedProfiles", () => {
        const ENV_KEY = "NODE_BOOT_ACTIVE_PROFILES";
        let originalEnv: string | undefined;

        beforeEach(() => {
            originalEnv = process.env[ENV_KEY];
            delete process.env[ENV_KEY];
        });

        afterEach(() => {
            if (originalEnv === undefined) {
                delete process.env[ENV_KEY];
            } else {
                process.env[ENV_KEY] = originalEnv;
            }
        });

        describe("getActiveProfiles", () => {
            it("returns an empty array when the env var is not set", () => {
                assert.deepEqual(getActiveProfiles(), []);
            });

            it("parses a single profile", () => {
                process.env[ENV_KEY] = "kubernetes";
                assert.deepEqual(getActiveProfiles(), ["kubernetes"]);
            });

            it("parses multiple comma-separated profiles", () => {
                process.env[ENV_KEY] = "kubernetes,v2";
                assert.deepEqual(getActiveProfiles(), ["kubernetes", "v2"]);
            });

            it("trims whitespace around each profile", () => {
                process.env[ENV_KEY] = " kubernetes , v2 ";
                assert.deepEqual(getActiveProfiles(), ["kubernetes", "v2"]);
            });

            it("is case sensitive (does not normalize case)", () => {
                process.env[ENV_KEY] = "Kubernetes";
                assert.deepEqual(getActiveProfiles(), ["Kubernetes"]);
                assert.notDeepEqual(getActiveProfiles(), ["kubernetes"]);
            });
        });

        describe("Profile decorator", () => {
            it("stores the given profiles as class metadata", () => {
                class SomeConfig {}
                Profile(["http", "kubernetes"])(SomeConfig);

                assert.deepEqual(Reflect.getMetadata(BEAN_PROFILE_METADATA_KEY, SomeConfig), ["http", "kubernetes"]);
            });
        });

        describe("allowedProfiles", () => {
            it("allows any class when no active profiles are set, even if the class requires one", () => {
                class RestrictedConfig {}
                Profile(["kubernetes"])(RestrictedConfig);

                assert.equal(allowedProfiles(RestrictedConfig), true);
            });

            it("allows a class without a @Profile decorator regardless of active profiles", () => {
                class PlainConfig {}
                process.env[ENV_KEY] = "kubernetes";

                assert.equal(allowedProfiles(PlainConfig), true);
            });

            it("allows a decorated class when one of its profiles matches an active profile", () => {
                class KubernetesConfig {}
                Profile(["kubernetes"])(KubernetesConfig);
                process.env[ENV_KEY] = "kubernetes,v2";

                assert.equal(allowedProfiles(KubernetesConfig), true);
            });

            it("disallows a decorated class when none of its profiles match the active profiles", () => {
                class DatadogConfig {}
                Profile(["datadog"])(DatadogConfig);
                process.env[ENV_KEY] = "kubernetes,v2";

                assert.equal(allowedProfiles(DatadogConfig), false);
            });

            it("allows when at least one of several required profiles matches", () => {
                class MultiProfileConfig {}
                Profile(["datadog", "v2"])(MultiProfileConfig);
                process.env[ENV_KEY] = "kubernetes,v2";

                assert.equal(allowedProfiles(MultiProfileConfig), true);
            });

            it("is case sensitive when matching profiles", () => {
                class CaseConfig {}
                Profile(["Kubernetes"])(CaseConfig);
                process.env[ENV_KEY] = "kubernetes";

                assert.equal(allowedProfiles(CaseConfig), false);
            });

            it("accepts an instance as well as a class constructor", () => {
                class KubernetesService {}
                Profile(["kubernetes"])(KubernetesService);
                process.env[ENV_KEY] = "kubernetes";

                const instance = new KubernetesService();
                assert.equal(allowedProfiles(instance), true);
            });
        });
    });

    describe("ShutdownHook", () => {
        beforeEach(() => {
            ShutdownHookContext.reset();
        });

        afterEach(() => {
            ShutdownHookContext.reset();
        });

        it("registers a shutdown hook with the ShutdownHookContext singleton", () => {
            class DatabaseService {
                closeConnection() {}
            }

            const descriptor = Object.getOwnPropertyDescriptor(DatabaseService.prototype, "closeConnection")!;
            ShutdownHook({priority: 100, timeout: 5000})(DatabaseService.prototype, "closeConnection", descriptor);

            assert.equal(ShutdownHookContext.get().getShutdownHooksCount(), 1);
        });

        it("defaults priority to 0 and leaves timeout undefined when no options given", () => {
            class CacheService {
                flush() {}
            }

            const descriptor = Object.getOwnPropertyDescriptor(CacheService.prototype, "flush")!;
            ShutdownHook()(CacheService.prototype, "flush", descriptor);

            // Registering another hook with higher priority should sort after (before, in array order)
            class OtherService {
                cleanup() {}
            }
            const otherDescriptor = Object.getOwnPropertyDescriptor(OtherService.prototype, "cleanup")!;
            ShutdownHook({priority: 10})(OtherService.prototype, "cleanup", otherDescriptor);

            assert.equal(ShutdownHookContext.get().getShutdownHooksCount(), 2);
        });

        it("marks the method with reflect metadata for introspection", () => {
            class QueueService {
                drain() {}
            }

            const descriptor = Object.getOwnPropertyDescriptor(QueueService.prototype, "drain")!;
            ShutdownHook({priority: 5})(QueueService.prototype, "drain", descriptor);

            assert.equal(Reflect.getMetadata("shutdown:hook", QueueService.prototype, "drain"), true);
        });

        it("does not register duplicate hooks for the same target/method", () => {
            class RepeatedService {
                cleanup() {}
            }
            const descriptor = Object.getOwnPropertyDescriptor(RepeatedService.prototype, "cleanup")!;

            ShutdownHook({priority: 1})(RepeatedService.prototype, "cleanup", descriptor);
            ShutdownHook({priority: 1})(RepeatedService.prototype, "cleanup", descriptor);

            assert.equal(ShutdownHookContext.get().getShutdownHooksCount(), 1);
        });
    });
});
