import { ExpressErrorMiddlewareInterface } from "routing-controllers";
import { Logger } from "winston";
import { Inject, Middleware } from "@node-boot/context";

@Middleware({ type: "after" })
export class ErrorMiddleware implements ExpressErrorMiddlewareInterface {
  @Inject()
  private logger: Logger;

  error(error: any, req: any, res: any, next: (err?: any) => any): void {
    try {
      const status: number = error.status || 500;
      const message: string = error.message || "Something went wrong";

      this.logger.error(
        `[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`
      );
      res.status(status).json({ message });
    } catch (error) {
      next(error);
    }
  }
}
