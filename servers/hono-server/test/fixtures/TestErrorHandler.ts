import {ErrorHandler} from "@nodeboot/core";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {HonoRequest, HonoResponse} from "../../src";

/**
 * Regression test target: `c.json()` only *builds* a Response, it has no side effect on its own.
 * A custom error handler must assign the built response back to `response.res` for it to actually
 * be sent - forgetting this previously caused Hono to fall through to its own default response.
 */
@ErrorHandler()
export class TestErrorHandler implements ErrorHandlerInterface<HttpError, HonoRequest, HonoResponse> {
    async onError(error: HttpError, action: Action<HonoRequest, HonoResponse>): Promise<void> {
        const status = error.httpCode ?? 500;
        action.response.res = action.response.json(
            {
                fromCustomHandler: true,
                message: error.message,
                statusCode: status,
            },
            status as any,
        );
    }
}
