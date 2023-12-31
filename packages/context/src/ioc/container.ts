import {UseContainerOptions} from "class-validator";
import {ClassConstructor, IocContainer} from "./types";
import {Action} from "../types";

let userContainer: {get<T>(someClass: ClassConstructor<T> | Function, action?: Action): T};
let userContainerOptions: UseContainerOptions | undefined;

/**
 * Container to be used by this library for inversion control. If container was not implicitly set then by default
 * container simply creates a new instance of the given class.
 */
const defaultContainer: {get<T>(someClass: ClassConstructor<T> | Function): T} = new (class {
    private instances: {type: Function; object: any}[] = [];

    get<T>(someClass: ClassConstructor<T>): T {
        let instance = this.instances.find(instance => instance.type === someClass);
        if (!instance) {
            instance = {type: someClass, object: new someClass()};
            this.instances.push(instance);
        }

        return instance.object;
    }
})();

/**
 * Sets container to be used by this library.
 */
export function useContainer(iocAdapter: IocContainer, options?: UseContainerOptions) {
    userContainer = iocAdapter;
    userContainerOptions = options;
}

/**
 * Gets the IOC container used by this library.
 * @param someClass A class constructor to resolve
 * @param action The request/response context that `someClass` is being resolved for
 */
export function getFromContainer<T>(someClass: ClassConstructor<T> | Function, action?: Action): T {
    if (userContainer) {
        try {
            const instance = userContainer.get(someClass, action);
            if (instance) return instance;

            if (!userContainerOptions || !userContainerOptions.fallback) return instance;
        } catch (error) {
            if (!userContainerOptions || !userContainerOptions.fallbackOnErrors) throw error;
        }
    }
    return defaultContainer.get<T>(someClass);
}
