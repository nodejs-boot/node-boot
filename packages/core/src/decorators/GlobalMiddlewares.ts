import {ApplicationContext} from "@node-boot/context";

export function GlobalMiddlewares(middlewares: Function[]): Function {
    return function (target: any) {
        ApplicationContext.get().globalMiddlewares = middlewares;
    };
}
