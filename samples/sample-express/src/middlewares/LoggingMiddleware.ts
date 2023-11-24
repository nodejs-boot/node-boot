import {ExpressMiddlewareInterface} from "routing-controllers";
import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";

@Middleware({type: "before"})
export class LoggingMiddleware implements ExpressMiddlewareInterface {
    @Inject()
    private logger: Logger;

    use(request: any, response: any, next: (err?: any) => any): void {
        this.logger.info(`Logging Middleware: Incoming request`);
        next();
    }
}
