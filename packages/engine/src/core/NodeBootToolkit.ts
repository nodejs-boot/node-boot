import {MetadataArgsStorage} from "../metadata";
import {NodeBootEngine} from "./NodeBootEngine";
import {ValidationOptions} from "class-validator";
import {NodeBootDriver} from "./NodeBootDriver";
import {ComponentImporter} from "../service/ComponentImporter";
import {CustomParameterDecorator, NodeBootEngineOptions} from "@node-boot/context";

export class NodeBootToolkit {
    /**
     * Gets metadata args storage.
     * Metadata args storage follows the best practices and stores metadata in a global variable.
     */
    static getMetadataArgsStorage(): MetadataArgsStorage {
        return MetadataArgsStorage.get();
    }

    /**
     * Registers all loaded actions in your application using selected driver.
     */
    static createServer<TServer, TDriver extends NodeBootDriver<TServer>>(
        driver: TDriver,
        options?: NodeBootEngineOptions,
    ): any {
        NodeBootToolkit.createEngine(driver, options);
        return driver.app;
    }

    /**
     * Registers all loaded actions in your express application.
     */
    static createEngine<TServer, TDriver extends NodeBootDriver<TServer>>(
        driver: TDriver,
        options: NodeBootEngineOptions = {},
    ): void {
        // import all controllers, middlewares and error handlers
        const controllerClasses = ComponentImporter.importControllers(options);
        const middlewareClasses = ComponentImporter.importMiddlewares(options);
        const interceptorClasses = ComponentImporter.importInterceptors(options);

        this.configureDriver(driver, options);

        // next create a controller executor
        new NodeBootEngine(driver, options)
            .initialize()
            .registerInterceptors(interceptorClasses)
            .registerMiddlewares("before", middlewareClasses)
            .registerControllers(controllerClasses)
            .registerMiddlewares("after", middlewareClasses); // todo: register only for loaded controllers?
    }

    private static configureDriver<TServer, TDriver extends NodeBootDriver<TServer>>(
        driver: TDriver,
        options: NodeBootEngineOptions,
    ) {
        if (options && options.development !== undefined) {
            driver.developmentMode = options.development;
        } else {
            driver.developmentMode = process.env["NODE_ENV"] !== "production";
        }

        if (options.defaultErrorHandler !== undefined) {
            driver.isDefaultErrorHandlingEnabled = options.defaultErrorHandler;
        } else {
            driver.isDefaultErrorHandlingEnabled = true;
        }

        if (options.classTransformer !== undefined) {
            driver.useClassTransformer = options.classTransformer;
        } else {
            driver.useClassTransformer = true;
        }

        if (options.validation !== undefined) {
            driver.enableValidation = !!options.validation;
            if (typeof options.validation !== "boolean") {
                driver.validationOptions = options.validation as ValidationOptions;
            }
        } else {
            driver.enableValidation = true;
        }

        driver.classToPlainTransformOptions = options.classToPlainTransformOptions;
        driver.plainToClassTransformOptions = options.plainToClassTransformOptions;

        optionalOf(options.errorOverridingMap).ifPresent(it => (driver.errorOverridingMap = it));
        optionalOf(options.routePrefix).ifPresent(it => (driver.routePrefix = it));
        optionalOf(options.currentUserChecker).ifPresent(it => (driver.currentUserChecker = it));
        optionalOf(options.authorizationChecker).ifPresent(it => (driver.authorizationChecker = it));
    }

    /**
     * Registers custom parameter decorator used in the controller actions.
     */
    static createParamDecorator(options: CustomParameterDecorator) {
        return function (object: Object, method: string, index: number) {
            NodeBootToolkit.getMetadataArgsStorage().params.push({
                type: "custom-converter",
                name: "custom-param-decorator",
                object: object,
                method: method,
                index: index,
                parse: false,
                required: options.required,
                transform: options.value,
            });
        };
    }
}
