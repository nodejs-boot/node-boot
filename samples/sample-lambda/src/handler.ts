import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {LambdaHandler, LambdaServer} from "@nodeboot/lambda-server";
import {LambdaSampleApp} from "./app";

// Reused across warm invocations of the same execution environment.
// Only re-initialized when Lambda spins up a brand-new container (cold start).
let lambdaHandler: LambdaHandler | null = null;

/**
 * AWS Lambda entry point.
 *
 * Configure your Lambda function's handler as `handler.handler` (or `dist/handler.handler`
 * once compiled) and hook it up to API Gateway (or Function URLs) using the
 * `ANY /{proxy+}` Lambda proxy integration so that NodeBoot's internal router can
 * handle every HTTP method and path.
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    // Allows the Lambda execution environment to be frozen/thawed between invocations
    // without waiting for in-flight background tasks tied to the previous invocation.
    context.callbackWaitsForEmptyEventLoop = false;

    if (!lambdaHandler) {
        const app = await new LambdaSampleApp().start();
        const lambdaServer = app.server as LambdaServer;
        lambdaHandler = lambdaServer.getHandler();
    }

    return lambdaHandler(event, context);
};
