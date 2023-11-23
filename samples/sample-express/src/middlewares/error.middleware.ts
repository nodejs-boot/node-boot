import {
  ExpressErrorMiddlewareInterface,
  Middleware
} from "routing-controllers";
import { Service } from "typedi";

@Middleware({ type: "after" })
@Service()
export class ErrorMiddleware implements ExpressErrorMiddlewareInterface {
  error(
    error: any,
    request: any,
    response: any,
    next: (err?: any) => any
  ): void {
    try {
      const status: number = error.status || 500;
      const message: string = error.message || "Something went wrong";

      // logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`);
      response.status(status).json({ message });
    } catch (error) {
      next(error);
    }
  }
}
