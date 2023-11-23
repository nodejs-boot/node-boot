import {ApplicationContext} from "../ApplicationContext";

export function GlobalMiddlewares(middlewares: Function[]): Function {
  return function (target: any) {
    ApplicationContext.get().globalMiddlewares = middlewares;
  };
}
