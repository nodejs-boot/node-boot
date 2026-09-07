import "reflect-metadata";
import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {NodeBootToolkit} from "@nodeboot/engine";
import {decorateDi} from "@nodeboot/di";
import {
    ApplicationContext,
    ApplicationOptions,
    CONTROLLER_PATH_METADATA_KEY,
    CONTROLLER_VERSION_METADATA_KEY,
    ErrorHandlerInterface,
    TransformerOptions,
} from "@nodeboot/context";

import {Controller} from "../src/decorators/Controller";
import {Controllers} from "../src/decorators/Controllers";
import {Configuration, IS_CONFIGURATION_KEY} from "../src/decorators/Configuration";
import {Configurations} from "../src/decorators/Configurations";
import {ErrorHandler} from "../src/decorators/ErrorHandler";
import {GlobalMiddlewares} from "../src/decorators/GlobalMiddlewares";
import {Interceptor} from "../src/decorators/Interceptor";
import {Interceptors} from "../src/decorators/Interceptors";
import {Middleware} from "../src/decorators/Middleware";
import {Model} from "../src/decorators/Model";
import {NodeBootApplication} from "../src/decorators/NodeBootApplication";
import {PostConstruct} from "../src/decorators/PostConstruct";
import {Property} from "../src/decorators/Property";
import {Service} from "../src/decorators/Service";
import {Component} from "../src/decorators/Component";
import {
    ClassToPlainTransform,
    EnableClassTransformer,
    PlainToClassTransform,
} from "../src/decorators/EnableClassTransformer";
import {ResponseClassTransformOptions} from "../src/decorators/ResponseClassTransformOptions";
import {BeansConfigurationAdapter, PostConstructAdaptor} from "../src/adapters";

beforeEach(() => {
    // MetadataArgsStorage is a global singleton keyed off `global.engineMetadataArgsStorage`.
    // Reset it between tests so the "actions"/"controllers"/... arrays don't leak across tests.
    NodeBootToolkit.reset();
});

describe("@Controller", () => {
    it("sets path metadata, registers controller metadata and adds the class to ApplicationContext.controllerClasses", () => {
        const context = ApplicationContext.get();
        const before = context.controllerClasses.length;

        @Controller("/users")
        class UsersController {}

        assert.equal(Reflect.getMetadata(CONTROLLER_PATH_METADATA_KEY, UsersController), "/users");
        assert.equal(Reflect.hasMetadata(CONTROLLER_VERSION_METADATA_KEY, UsersController), false);

        const controllers = NodeBootToolkit.getMetadataArgsStorage().controllers;
        assert.equal(controllers.length, 1);
        assert.deepEqual(controllers[0], {
            type: "default",
            route: "/users",
            target: UsersController,
            options: undefined,
        });

        assert.equal(context.controllerClasses.length, before + 1);
        assert.ok(context.controllerClasses.includes(UsersController));
    });

    it("prefixes the route with the version and sets version metadata when a version is given", () => {
        @Controller("/users", "v1")
        class UsersV1Controller {}

        assert.equal(Reflect.getMetadata(CONTROLLER_PATH_METADATA_KEY, UsersV1Controller), "/v1/users");
        assert.equal(Reflect.getMetadata(CONTROLLER_VERSION_METADATA_KEY, UsersV1Controller), "v1");

        const controllers = NodeBootToolkit.getMetadataArgsStorage().controllers;
        assert.equal(controllers[0]!.route, "/v1/users");
    });

    it("supports a version with no base route", () => {
        @Controller(undefined, "v2")
        class RootV2Controller {}

        assert.equal(Reflect.getMetadata(CONTROLLER_PATH_METADATA_KEY, RootV2Controller), "/v2");
    });

    it("passes through controller options into the registered metadata", () => {
        const options = {something: true} as any;

        @Controller("/secure", undefined, options)
        class SecureController {}

        const controllers = NodeBootToolkit.getMetadataArgsStorage().controllers;
        assert.equal(controllers[0]!.options, options);
        assert.equal(controllers[0]!.target, SecureController);
    });

    it("applies DI decoration (decorateDi succeeds because typedi is resolvable from @nodeboot/di's own dist)", () => {
        // @Controller calls decorateDi(target) internally but ignores its boolean result.
        // We assert the underlying DI contract directly here since that's what backs the
        // (unobservable-from-outside) DI decoration performed by @Controller/@Service/@Component/etc.
        class Dummy {}
        assert.equal(decorateDi(Dummy), true);
    });
});

describe("@Controllers", () => {
    it("overwrites ApplicationContext.controllerClasses with exactly the given array", () => {
        class A {}
        class B {}

        @Controllers([A, B])
        class Marker {}

        assert.ok(Marker);
        assert.deepEqual(ApplicationContext.get().controllerClasses, [A, B]);
    });
});

describe("@Configuration", () => {
    it("marks the class with IS_CONFIGURATION_KEY and registers a BeansConfigurationAdapter", () => {
        const context = ApplicationContext.get();
        const before = context.configurationAdapters.length;

        @Configuration()
        class AppConfig {}

        assert.equal(Reflect.getMetadata(IS_CONFIGURATION_KEY, AppConfig), true);
        assert.equal(context.configurationAdapters.length, before + 1);
        assert.ok(
            context.configurationAdapters[context.configurationAdapters.length - 1] instanceof
                BeansConfigurationAdapter,
        );
    });

    it("accepts onConfig options without throwing", () => {
        @Configuration({onConfig: "feature.enabled"})
        class ConditionalConfig {}

        assert.equal(Reflect.getMetadata(IS_CONFIGURATION_KEY, ConditionalConfig), true);
    });
});

describe("@Configurations", () => {
    it("eagerly instantiates every configuration class provided", () => {
        let instantiated = 0;
        class ConfigA {
            constructor() {
                instantiated++;
            }
        }
        class ConfigB {
            constructor() {
                instantiated++;
            }
        }

        @Configurations([ConfigA, ConfigB])
        class Marker {}

        assert.ok(Marker);
        assert.equal(instantiated, 2);
    });
});

describe("@ErrorHandler", () => {
    it("registers as an 'after' middleware AND pushes into globalMiddlewares a second time directly", () => {
        // Real (slightly surprising) behavior: @ErrorHandler() internally calls
        // Middleware({type: "after"})(target) -- which itself pushes `target` into
        // ApplicationContext.globalMiddlewares -- and THEN pushes `target` into
        // globalMiddlewares a second time on its own. Net effect: one entry in the
        // MetadataArgsStorage.middlewares array, but TWO entries (of the same class)
        // in ApplicationContext.globalMiddlewares.
        const context = ApplicationContext.get();
        const beforeGlobal = context.globalMiddlewares.length;
        const beforeStorage = NodeBootToolkit.getMetadataArgsStorage().middlewares.length;

        @ErrorHandler()
        class MyErrorHandler implements ErrorHandlerInterface {
            async onError(): Promise<void> {}
        }

        const middlewares = NodeBootToolkit.getMetadataArgsStorage().middlewares;
        assert.equal(middlewares.length, beforeStorage + 1);
        assert.deepEqual(middlewares[middlewares.length - 1], {
            target: MyErrorHandler,
            global: true,
            type: "after",
            priority: 0,
        });

        assert.equal(context.globalMiddlewares.length, beforeGlobal + 2);
        const occurrences = context.globalMiddlewares.filter(mw => mw === MyErrorHandler).length;
        assert.equal(occurrences, 2);
    });
});

describe("@GlobalMiddlewares", () => {
    it("overwrites ApplicationContext.globalMiddlewares with exactly the given array", () => {
        class M1 {}
        class M2 {}

        @GlobalMiddlewares([M1, M2])
        class Marker {}

        assert.ok(Marker);
        assert.deepEqual(ApplicationContext.get().globalMiddlewares, [M1, M2]);
    });
});

describe("@Interceptor", () => {
    it("registers a global interceptor in metadata storage and in ApplicationContext.interceptorClasses", () => {
        const context = ApplicationContext.get();
        const beforeCtx = context.interceptorClasses.length;
        const beforeStorage = NodeBootToolkit.getMetadataArgsStorage().interceptors.length;

        @Interceptor()
        class MyInterceptor {}

        const interceptors = NodeBootToolkit.getMetadataArgsStorage().interceptors;
        assert.equal(interceptors.length, beforeStorage + 1);
        assert.deepEqual(interceptors[interceptors.length - 1], {
            target: MyInterceptor,
            global: true,
            priority: 0,
        });

        assert.equal(context.interceptorClasses.length, beforeCtx + 1);
        assert.ok(context.interceptorClasses.includes(MyInterceptor));
    });

    it("defaults priority to 0 and honors an explicit priority", () => {
        @Interceptor({priority: 5})
        class PriorityInterceptor {}

        const interceptors = NodeBootToolkit.getMetadataArgsStorage().interceptors;
        assert.equal(interceptors[interceptors.length - 1]!.priority, 5);
        assert.equal(interceptors[interceptors.length - 1]!.target, PriorityInterceptor);
    });
});

describe("@Interceptors", () => {
    it("overwrites ApplicationContext.interceptorClasses with exactly the given array", () => {
        class I1 {}

        @Interceptors([I1])
        class Marker {}

        assert.ok(Marker);
        assert.deepEqual(ApplicationContext.get().interceptorClasses, [I1]);
    });
});

describe("@Middleware", () => {
    it("registers a middleware in metadata storage and pushes into ApplicationContext.globalMiddlewares", () => {
        const context = ApplicationContext.get();
        const beforeCtx = context.globalMiddlewares.length;

        @Middleware({type: "before"})
        class MyMiddleware {}

        const middlewares = NodeBootToolkit.getMetadataArgsStorage().middlewares;
        assert.deepEqual(middlewares[middlewares.length - 1], {
            target: MyMiddleware,
            global: true,
            type: "before",
            priority: 0,
        });

        assert.equal(context.globalMiddlewares.length, beforeCtx + 1);
        assert.ok(context.globalMiddlewares.includes(MyMiddleware));
    });

    it("supports type 'after' and a custom priority", () => {
        @Middleware({type: "after", priority: 10})
        class AfterMiddleware {}

        const middlewares = NodeBootToolkit.getMetadataArgsStorage().middlewares;
        const entry = middlewares[middlewares.length - 1]!;
        assert.equal(entry.type, "after");
        assert.equal(entry.priority, 10);
        assert.equal(entry.target, AfterMiddleware);
    });
});

describe("@Model", () => {
    it("marks the prototype as a model and registers it in metadata storage", () => {
        @Model()
        class UserModel {}

        assert.equal(Reflect.getMetadata("node-boot:model", UserModel.prototype), true);
        assert.equal(Reflect.hasMetadata("node-boot:model:generic:bindings", UserModel.prototype), false);

        const models = NodeBootToolkit.getMetadataArgsStorage().models;
        assert.equal(models.length, 1);
        assert.deepEqual(models[0], {target: UserModel});
    });

    it("registers generic bindings metadata when bindings are provided", () => {
        @Model({T: "string"})
        class GenericModel {}

        assert.deepEqual(Reflect.getMetadata("node-boot:model:generic:bindings", GenericModel.prototype), {
            T: "string",
        });
    });
});

describe("@NodeBootApplication", () => {
    it("marks the target, replaces applicationOptions/applicationAdapter, and registers a configuration adapter", () => {
        const context = ApplicationContext.get();
        const beforeAdapters = context.configurationAdapters.length;

        const options: ApplicationOptions = {
            name: "TestApp",
            apiOptions: {routePrefix: "/api", nullResultCode: 404, undefinedResultCode: 204},
        };

        @NodeBootApplication(options)
        class TestApp {}

        assert.equal(Reflect.getMetadata("custom:nodeBootApp", TestApp), true);

        // applicationOptions is replaced with a shallow copy (`{...options}`), not the same reference.
        assert.deepEqual(context.applicationOptions, options);
        assert.notEqual(context.applicationOptions, options);

        assert.equal(context.configurationAdapters.length, beforeAdapters + 1);
        assert.ok(
            context.configurationAdapters[context.configurationAdapters.length - 1] instanceof
                BeansConfigurationAdapter,
        );

        assert.ok(context.applicationAdapter);
        const bound = context.applicationAdapter!.bind({} as any);
        assert.equal(bound.routePrefix, "/api");
        assert.deepEqual(bound.defaults, {
            nullResultCode: 404,
            paramOptions: undefined,
            undefinedResultCode: 204,
        });
        assert.equal(bound.controllers, context.controllerClasses);
        assert.equal(bound.middlewares, context.globalMiddlewares);
        assert.equal(bound.currentUserChecker, undefined);
        assert.equal(bound.authorizationChecker, undefined);
    });

    it("works with no options at all", () => {
        @NodeBootApplication()
        class BareApp {}

        assert.equal(Reflect.getMetadata("custom:nodeBootApp", BareApp), true);

        const context = ApplicationContext.get();
        assert.deepEqual(context.applicationOptions, {});

        const bound = context.applicationAdapter!.bind({} as any);
        assert.equal(bound.routePrefix, undefined);
    });
});

describe("@PostConstruct", () => {
    it("registers a PostConstructAdaptor in ApplicationContext.applicationFeatureAdapters", () => {
        const context = ApplicationContext.get();
        const before = context.applicationFeatureAdapters.length;

        class MyService {
            @PostConstruct()
            init() {}
        }

        assert.ok(MyService);
        assert.equal(context.applicationFeatureAdapters.length, before + 1);
        assert.ok(
            context.applicationFeatureAdapters[context.applicationFeatureAdapters.length - 1] instanceof
                PostConstructAdaptor,
        );
    });
});

describe("@Property", () => {
    it("infers the type from design:type reflection metadata when no explicit type is given", () => {
        class Dto {
            @Property()
            name!: string;
        }

        const props = NodeBootToolkit.getMetadataArgsStorage().modelProperties;
        assert.equal(props.length, 1);
        assert.equal(props[0]!.target, Dto);
        assert.equal(props[0]!.method, "name");
        assert.equal(props[0]!.options.name, "name");
        assert.equal(props[0]!.options.type, String);
        assert.equal(props[0]!.options.required, undefined);
    });

    it("lets explicit options override the inferred defaults", () => {
        class Dto2 {
            @Property({type: "string", required: true, description: "desc"})
            age!: number;
        }

        const props = NodeBootToolkit.getMetadataArgsStorage().modelProperties;
        const entry = props[props.length - 1]!;
        assert.equal(entry.target, Dto2);
        assert.equal(entry.options.type, "string");
        assert.equal(entry.options.required, true);
        assert.equal(entry.options.description, "desc");
    });
});

describe("@Service", () => {
    it("marks the class with the '__isService' runtime marker", () => {
        @Service()
        class MyService {}

        assert.equal(Reflect.getMetadata("__isService", MyService), true);
    });

    it("accepts the name/token/ComponentOptions overloads without throwing", () => {
        @Service("named-service")
        class NamedService {}
        assert.equal(Reflect.getMetadata("__isService", NamedService), true);

        @Service({transient: true})
        class TransientService {}
        assert.equal(Reflect.getMetadata("__isService", TransientService), true);
    });
});

describe("@Component", () => {
    it("does not set the '__isService' marker (that is @Service-only behavior)", () => {
        @Component()
        class MyComponent {}

        assert.equal(Reflect.hasMetadata("__isService", MyComponent), false);
    });

    it("accepts the name/token/ComponentOptions overloads without throwing", () => {
        @Component("named-component")
        class NamedComponent {}

        @Component({global: true})
        class GlobalComponent {}

        assert.ok(NamedComponent);
        assert.ok(GlobalComponent);
    });
});

describe("@EnableClassTransformer", () => {
    it("enables class-transformer and sets both transform option sets from a single call", () => {
        const options: TransformerOptions = {
            enabled: true,
            classToPlain: {excludePrefixes: ["_"]},
            plainToClass: {excludeExtraneousValues: true},
        };

        @EnableClassTransformer(options)
        class Marker {}

        assert.ok(Marker);
        const context = ApplicationContext.get();
        assert.equal(context.classTransformer, true);
        assert.deepEqual(context.classToPlainTransformOptions, options.classToPlain);
        assert.deepEqual(context.plainToClassTransformOptions, options.plainToClass);
    });

    it("defaults 'enabled' to true when no options are given", () => {
        @EnableClassTransformer()
        class Marker2 {}

        assert.ok(Marker2);
        assert.equal(ApplicationContext.get().classTransformer, true);
    });

    it("respects an explicit enabled: false", () => {
        @EnableClassTransformer({enabled: false})
        class Marker3 {}

        assert.ok(Marker3);
        assert.equal(ApplicationContext.get().classTransformer, false);
    });
});

describe("@ClassToPlainTransform / @PlainToClassTransform", () => {
    it("each only sets its own respective transform options on ApplicationContext", () => {
        const classToPlainOptions = {excludePrefixes: ["_"]};

        @ClassToPlainTransform(classToPlainOptions)
        class Marker4 {}

        assert.ok(Marker4);
        assert.deepEqual(ApplicationContext.get().classToPlainTransformOptions, classToPlainOptions);

        const plainToClassOptions = {excludeExtraneousValues: true};

        @PlainToClassTransform(plainToClassOptions)
        class Marker5 {}

        assert.ok(Marker5);
        assert.deepEqual(ApplicationContext.get().plainToClassTransformOptions, plainToClassOptions);
    });
});

describe("@ResponseClassTransformOptions", () => {
    it("registers a 'response-class-transform-options' response handler", () => {
        const options = {excludePrefixes: ["_"]};

        class SampleController {
            @ResponseClassTransformOptions(options)
            getFoo() {}
        }

        const handlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        assert.equal(handlers.length, 1);
        assert.deepEqual(handlers[0], {
            type: "response-class-transform-options",
            value: options,
            target: SampleController,
            method: "getFoo",
        });
    });
});
