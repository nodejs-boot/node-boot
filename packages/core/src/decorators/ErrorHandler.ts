import {ExpressErrorMiddlewareInterface} from "routing-controllers";
import {Middleware} from "./Middleware";
import {ApplicationContext} from "@node-boot/context";
import {FastifyErrorHandlerInterface} from "../middlewares";

/**
 * Marks given class as an ErrorHandler Middleware.
 * Allows to create global Error handler.
 */
export function ErrorHandler<
    T extends new (...args: any[]) =>
        | ExpressErrorMiddlewareInterface
        | FastifyErrorHandlerInterface,
>() {
    return (target: T) => {
        ApplicationContext.get().applicationOptions.customErrorHandler = true;
        Middleware({type: "after"})(target);
    };
}
