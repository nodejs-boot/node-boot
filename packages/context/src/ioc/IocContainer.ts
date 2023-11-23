import type {Action, ClassConstructor} from "routing-controllers";

/**
 * Allows routing controllers to resolve objects using your IoC container
 */
export interface IocContainer<TContainer = unknown> {

    get<T>(someClass: ClassConstructor<T>, action?: Action): T;

    get<T>(id: string, action?: Action): T;

    /**
     * Sets a value for the given type or service name in the container.
     */
    set(type: Function, value: any): TContainer;

    set(name: string, value: any): TContainer;

    has<T>(type: ClassConstructor<T>): boolean;

    has(id: string): boolean;
}
