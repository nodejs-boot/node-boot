import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {APIGatewayProxyEvent, Context} from "aws-lambda";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<APIGatewayProxyEvent, Context> {
    @Inject()
    private logger: Logger;

    async use(action: Action<APIGatewayProxyEvent, Context>): Promise<void> {
        this.logger.info(`Incoming request: ${action.request.httpMethod} ${action.request.path}`);
    }
}
