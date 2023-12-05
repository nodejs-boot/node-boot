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
export declare type ServiceIdentifier<T = unknown> =
    | Constructable<T>
    | CallableFunction
    | Token<T>
    | string;

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
