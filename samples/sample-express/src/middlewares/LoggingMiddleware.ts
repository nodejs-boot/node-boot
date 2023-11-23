import { ExpressMiddlewareInterface, Middleware } from "routing-controllers";
import { Inject, Service } from "typedi";
import { Logger } from "winston";

@Middleware({ type: "before" })
@Service()
export class LoggingMiddleware implements ExpressMiddlewareInterface {
  @Inject()
  private logger: Logger;

  use(request: any, response: any, next: (err?: any) => any): void {
    this.logger.info(`Logging Middleware: Incoming request`);
    next();
  }
}
