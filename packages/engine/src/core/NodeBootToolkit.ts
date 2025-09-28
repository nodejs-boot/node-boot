import {MetadataArgsStorage} from "../metadata";
import {NodeBootEngine} from "./NodeBootEngine";
import {ValidationOptions} from "class-validator";
import {NodeBootDriver} from "./NodeBootDriver";
import {ComponentImporter} from "../handler";
import {CustomParameterDecorator, NodeBootEngineOptions} from "@nodeboot/context";

export class NodeBootToolkit {
    // Track if process listeners have been registered to prevent duplicates
    private static processListenersRegistered = false;

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

        // Only register process listeners once to prevent memory leaks
        if (!NodeBootToolkit.processListenersRegistered) {
            process.on("uncaughtException", error => {
                console.error("Uncaught Exception:", error);
                // Prevent the server from crashing
            });

            process.on("unhandledRejection", (reason: any) => {
                console.error("Unhandled Rejection at:", `${reason.message}\n${reason.stack}`);
                // Log, but don't exit
            });

            NodeBootToolkit.processListenersRegistered = true;
        }

        // next create a controller executor
        new NodeBootEngine(driver, options)
            .initialize()
            .registerInterceptors(interceptorClasses)
            .registerMiddlewares("before", middlewareClasses)
            .registerControllers(controllerClasses)
            .registerMiddlewares("after", middlewareClasses); // todo: register only for loaded controllers?
    }

    /**
     * Reset all static state and cleanup resources.
     * Should be called during testing or hot-reload scenarios.
     */
    static reset(): void {
        // Reset metadata storage
        MetadataArgsStorage.reset();

        // Reset process listeners flag
        NodeBootToolkit.processListenersRegistered = false;

        // Note: We don't remove the actual process listeners as they're global
        // and removing them could affect other parts of the application
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

        if (options.classTransformer !== undefined) {
            driver.useClassTransformer = options.classTransformer;
        } else {
            driver.useClassTransformer = true;
        }

        if (options.validation !== undefined) {
            driver.enableValidation = !!options.validation;
            driver.enableValidation = true;
            if (typeof options.validation !== "boolean") {
                driver.validationOptions = options.validation as ValidationOptions;
            }
        } else {
            driver.enableValidation = true;
        }

        driver.classToPlainTransformOptions = options.classToPlainTransformOptions;
        driver.plainToClassTransformOptions = options.plainToClassTransformOptions;

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
