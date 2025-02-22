import {Middleware} from "./Middleware";
import {ApplicationContext, ErrorHandlerInterface} from "@nodeboot/context";

/**
 * Marks given class as an ErrorHandler Middleware.
 * Allows to create global Error handler.
 */
export function ErrorHandler<THandler extends new (...args: any[]) => ErrorHandlerInterface>() {
    return (target: THandler) => {
        Middleware({type: "after"})(target);
        ApplicationContext.get().globalMiddlewares.push(target);
    };
}
