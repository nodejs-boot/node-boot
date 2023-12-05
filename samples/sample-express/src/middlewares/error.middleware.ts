import {ExpressErrorMiddlewareInterface} from "routing-controllers";
import {Logger} from "winston";
import {ErrorHandler} from "@node-boot/core";
import {Inject} from "@node-boot/di";

@ErrorHandler()
export class ErrorMiddleware implements ExpressErrorMiddlewareInterface {
    @Inject()
    private logger: Logger;

    error(error: any, req: any, res: any, next: (err?: any) => any): void {
        try {
            const status: number = error.status || 500;
            const message: string = error.message || "Something went wrong";

            this.logger.error(
                `[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`,
            );
            // FIXME Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
            // FIXME Fix this after refactoring routing-controllers library
            // res.status(status).json({message});
        } catch (error) {
            next(error);
        }
    }
}
