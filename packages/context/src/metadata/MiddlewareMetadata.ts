import {MiddlewareMetadataArgs} from "./args";
import {getFromContainer} from "../ioc";
import {ErrorHandlerInterface, InterceptorInterface, MiddlewareInterface} from "../handlers";

/**
 * Middleware metadata.
 */
export class MiddlewareMetadata {
    /**
     * Indicates if this middleware is global, thous applied to all routes.
     */
    global: boolean;

    /**
     * Object class of the middleware class.
     */
    target: Function;

    /**
     * Execution priority of the middleware.
     */
    priority: number;

    /**
     * Indicates if middleware must be executed after routing action is executed.
     */
    type: "before" | "after";

    constructor(args: MiddlewareMetadataArgs) {
        this.global = args.global;
        this.target = args.target;
        this.priority = args.priority;
        this.type = args.type;
    }

    /**
     * Gets middleware instance from the container.
     */

    /*get instance(): ExpressMiddlewareInterface | KoaMiddlewareInterface | ExpressErrorMiddlewareInterface {
        return getFromContainer<ExpressMiddlewareInterface | KoaMiddlewareInterface | ExpressErrorMiddlewareInterface>(
            this.target,
        );
    }*/

    /**
     * Gets middleware instance from the container.
     */
    get instance(): ErrorHandlerInterface | InterceptorInterface | MiddlewareInterface {
        return getFromContainer<ErrorHandlerInterface | InterceptorInterface>(this.target);
    }
}
