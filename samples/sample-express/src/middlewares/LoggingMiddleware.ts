import { ExpressMiddlewareInterface } from "routing-controllers";
import { Inject } from "typedi";
import { Logger } from "winston";
import { Middleware } from "@node-boot/context";

@Middleware({ type: "before" })
export class LoggingMiddleware implements ExpressMiddlewareInterface {
  @Inject()
  private logger: Logger;

  use(request: any, response: any, next: (err?: any) => any): void {
    this.logger.info(`Logging Middleware: Incoming request`);
    next();
  }
}
