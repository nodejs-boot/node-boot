import type {ClassTransformOptions} from "class-transformer";
import type {ApplicationOptions, DependencyInjectionOptions} from "./options";
import type {ApplicationAdapter, ConfigurationAdapter, ConfigurationPropertiesAdapter} from "./adapters";
import {ActuatorAdapter, OpenApiBridgeAdapter, RepositoriesAdapter} from "./adapters";
import {AuthorizationChecker, CurrentUserChecker} from "./checkers";
import {ClassConstructor, IocContainer} from "./ioc";

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
     * Indicates if cors are enabled.
     * This requires installation of additional module (cors for express and @koa/cors for koa).
     */
    cors?: boolean | Object;

    static get(): ApplicationContext {
        if (!ApplicationContext.context) {
            ApplicationContext.context = new ApplicationContext();
        }
        return ApplicationContext.context;
    }

    static getIocContainer(): IocContainer | undefined {
        return this.get().diOptions?.iocContainer;
    }
}
