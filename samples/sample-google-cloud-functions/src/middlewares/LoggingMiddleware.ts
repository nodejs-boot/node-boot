import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse} from "@nodeboot/google-cloud-functions-server";

@Middleware({type: "before"})
export class LoggingMiddleware
    implements MiddlewareInterface<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>
{
    @Inject()
    private logger: Logger;

    async use(action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>): Promise<void> {
        this.logger.info(`Incoming request: ${action.request.method} ${action.request.path}`);
    }
}
