import type {ClassTransformOptions} from "class-transformer";
import type {ApplicationOptions, DependencyInjectionOptions} from "./options";
import {
    ActuatorAdapter,
    ApplicationAdapter,
    ApplicationFeatureAdapter,
    ConfigurationAdapter,
    ConfigurationPropertiesAdapter,
    OpenApiBridgeAdapter,
    RepositoriesAdapter,
} from "./adapters";
import {AuthorizationChecker, CurrentUserChecker} from "./checkers";
import {ClassConstructor, IocContainer} from "./ioc";
import {ValidatorOptions} from "class-validator";
import {LIFECYCLE_TYPE_METADATA_KEY} from "./metadata";
import {LifecycleType} from "./types";

export class ApplicationContext {
    private static context: ApplicationContext;

    serverType: string;
    applicationOptions: ApplicationOptions = {};
    diOptions?: DependencyInjectionOptions;
    openApi?: OpenApiBridgeAdapter;
    swaggerUI = false;
    applicationAdapter?: ApplicationAdapter;
    actuatorAdapter?: ActuatorAdapter;
    repositoriesAdapter?: RepositoriesAdapter;
    configurationAdapters: ConfigurationAdapter[] = [];
    configurationPropertiesAdapters: ConfigurationPropertiesAdapter[] = [];
    applicationFeatures = {};
    applicationFeatureAdapters: ApplicationFeatureAdapter[] = [];
    controllerClasses: Function[] = [];
    interceptorClasses: Function[] = [];
    globalMiddlewares: Function[] = [];

    /**
     * Indicates if class-transformer should be used to perform serialization / deserialization.
     */
    classTransformer?: boolean;
    /**
     * Global class transformer options passed to class-transformer during classToPlain operation.
     * This operation is being executed when server returns response to user.
     */
    classToPlainTransformOptions?: ClassTransformOptions;
    /**
     * Global class transformer options passed to class-transformer during plainToClass operation.
     * This operation is being executed when parsing user parameters.
     */
    plainToClassTransformOptions?: ClassTransformOptions;

    authorizationChecker?: ClassConstructor<AuthorizationChecker>;
    /**
     * Special function used to get currently authorized user.
     */
    currentUserChecker?: ClassConstructor<CurrentUserChecker>;

    /**
     * Indicates if class-validator should be used to auto validate objects injected into params.
     * You can also directly pass validator options to enable validator with a given options.
     */
    validation?: boolean | ValidatorOptions;

    static get(): ApplicationContext {
        if (!ApplicationContext.context) {
            ApplicationContext.context = new ApplicationContext();
        }
        return ApplicationContext.context;
    }

    static getIocContainer(): IocContainer | undefined {
        return this.get().diOptions?.iocContainer;
    }

    static getAppFeatureAdapters(lifecycle: LifecycleType) {
        return this.get().applicationFeatureAdapters.filter(adapter => {
            const adapterLifecycle =
                (Reflect.getMetadata(LIFECYCLE_TYPE_METADATA_KEY, adapter.constructor) as LifecycleType) ??
                "application.initialized";
            return lifecycle === adapterLifecycle;
        });
    }
}
