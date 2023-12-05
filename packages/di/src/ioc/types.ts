import {ComponentOptions, Constructable, Token} from "@node-boot/context";

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
