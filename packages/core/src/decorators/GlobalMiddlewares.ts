import {ApplicationContext} from "@node-boot/context";

export function GlobalMiddlewares(middlewares: Function[]): Function {
    return function () {
        ApplicationContext.get().globalMiddlewares = middlewares;
    };
}
