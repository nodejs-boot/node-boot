import {Middleware} from "./Middleware";
import {ApplicationContext, ErrorHandlerInterface} from "@node-boot/context";

/**
 * Marks given class as an ErrorHandler Middleware.
 * Allows to create global Error handler.
 */
export function ErrorHandler<THandler extends new (...args: any[]) => ErrorHandlerInterface>() {
    return (target: THandler) => {
        ApplicationContext.get().applicationOptions.customErrorHandler = true;
        Middleware({type: "after"})(target);
    };
}
