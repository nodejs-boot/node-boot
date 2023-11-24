import {KoaMiddlewareInterface} from "routing-controllers";
import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";

@Middleware({type: "before"})
export class LoggingMiddleware implements KoaMiddlewareInterface {
    @Inject()
    private logger: Logger;

    use(context: any, next: (err?: any) => Promise<any>): Promise<any> {
        this.logger.info(`Logging Middleware: Incoming request`);
        return next()
            .then(() => {
                console.log("do something after execution");
            })
            .catch(error => {
                console.log("error handling is also here");
            });
    }
}
