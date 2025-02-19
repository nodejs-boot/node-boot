import {ApplicationContext} from "@nodeboot/context";

export function GlobalMiddlewares(middlewares: Function[]): Function {
    return function () {
        ApplicationContext.get().globalMiddlewares = middlewares;
    };
}
