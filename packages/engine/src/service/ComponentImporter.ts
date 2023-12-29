import {ClassFiles} from "@node-boot/extension";
import {NodeBootEngineOptions} from "@node-boot/context";

export class ComponentImporter {
    static importInterceptors(options: NodeBootEngineOptions) {
        let interceptorClasses: Function[] = [];
        if (options?.interceptors?.length) {
            interceptorClasses = (options.interceptors as any[]).filter(controller => controller instanceof Function);
            const interceptorDirs = (options.interceptors as any[]).filter(controller => typeof controller === "string");
            interceptorClasses.push(...ClassFiles.loadFromDirectories(interceptorDirs));
        }
        return interceptorClasses;
    }

    static importMiddlewares(options: NodeBootEngineOptions) {
        let middlewareClasses: Function[] = [];
        if (options?.middlewares?.length) {
            middlewareClasses = (options.middlewares as any[]).filter(controller => controller instanceof Function);
            const middlewareDirs = (options.middlewares as any[]).filter(controller => typeof controller === "string");
            middlewareClasses.push(...ClassFiles.loadFromDirectories(middlewareDirs));
        }
        return middlewareClasses;
    }

    static importControllers(options: NodeBootEngineOptions) {
        let controllerClasses: Function[] = [];
        if (options?.controllers?.length) {
            controllerClasses = (options.controllers as any[]).filter(controller => controller instanceof Function);
            const controllerDirs = (options.controllers as any[]).filter(controller => typeof controller === "string");
            controllerClasses.push(...ClassFiles.loadFromDirectories(controllerDirs));
        }
        return controllerClasses;
    }
}
