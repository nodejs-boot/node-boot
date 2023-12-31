import {Action} from "../types";

/**
 * Used to create unique typed component identifier.
 * Useful when component has only interface, but don't have a class.
 */
export declare class Token<T> {
    name?: string;

    /**
     * @param name Token name, optional and only used for debugging purposes.
     */
    constructor(name?: string);
}

/**
 * Unique service identifier.
 * Can be some class type, or string id, or instance of Token.
 */
export declare type ServiceIdentifier<T = unknown> = Constructable<T> | CallableFunction | Token<T> | string;

/**
 * Generic type for class definitions.
 * Example usage:
 * ```
 * function createSomeInstance(myClassDefinition: Constructable<MyClass>) {
 *   return new myClassDefinition()
 * }
 * ```
 */
export declare type Constructable<T> = new (...args: any[]) => T;

export type ClassConstructor<T> = {new (...args: any[]): T};

/**
 * Container options.
 */
export interface UseContainerOptions {
    /**
     * If set to true, then default container will be used in the case if given container haven't returned anything.
     */
    fallback?: boolean;

    /**
     * If set to true, then default container will be used in the case if given container thrown an exception.
     */
    fallbackOnErrors?: boolean;
}

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
