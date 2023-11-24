import {Constructable} from "./Constructable";
import {ComponentOptions} from "@node-boot/context";

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

export type Newable<T> = (type?: never) => Constructable<T>;

export interface Abstract<T> {
    prototype: T;
}

export type DiOptions = ComponentOptions | string | Token<unknown>;

export type InjectionOptions<T = unknown> =
    | string
    | symbol
    | Token<T>
    | Abstract<T>
    | Newable<T>;
