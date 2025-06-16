import {
    Action,
    ActionMetadata,
    ErrorHandlerInterface,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
} from "@nodeboot/context";
import {GlobalErrorHandler, NodeBootDriver} from "@nodeboot/engine";
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    HttpError,
} from "@nodeboot/error";

export type GhostServerRequest = {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
    session?: Record<string, any>;
    cookies?: Record<string, string>;
    file?: any;
    files?: any;
};

export type GhostServerResponse = {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: any;
    redirectUrl?: string;
    renderedTemplate?: {template: string; options: any};
    sendCalled?: boolean;
};

export class GhostDriver extends NodeBootDriver<null, Action<GhostServerRequest, GhostServerResponse>> {
    private customErrorHandler?: ErrorHandlerInterface;
    private globalErrorHandler = new GlobalErrorHandler();

    constructor() {
        super();
    }

    initialize() {
        // No HTTP server to initialize
    }

    override registerAction(
        _m: ActionMetadata,
        _a: (action: Action<GhostServerRequest, GhostServerResponse, Function>) => Promise<any>,
    ): void {
        // No actions to register in this driver
    }

    override registerRoutes(): void {
        // No routes to register in this driver
        // This is a no-op since this driver does not handle HTTP requests
    }

    registerMiddleware(middleware: MiddlewareMetadata, _options: NodeBootEngineOptions) {
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.customErrorHandler = middleware.instance as ErrorHandlerInterface;
        }
    }

    async executeAction(
        actionMetadata: ActionMetadata,
        actionData: GhostServerRequest,
        executeAction: (action: Action<GhostServerRequest, GhostServerResponse>) => Promise<any>,
    ): Promise<GhostServerResponse> {
        const response: GhostServerResponse = {
            statusCode: 200,
            headers: {},
            body: undefined,
        };
        const action: Action<GhostServerRequest, GhostServerResponse> = {
            request: actionData,
            response,
        };

        // Authorization check if needed
        if (actionMetadata.isAuthorizedUsed) {
            await this.checkAuthorization(action.request, action.response, actionMetadata);
        }

        try {
            const result = await executeAction(action);
            this.handleSuccess(result, action, actionMetadata);
        } catch (error: any) {
            await this.handleError(error, action, actionMetadata);
        }

        return response;
    }

    async checkAuthorization(
        request: GhostServerRequest,
        response: GhostServerResponse,
        actionMetadata: ActionMetadata,
    ) {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request, response};
        const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

        if (!checkResult) {
            const error =
                actionMetadata.authorizedRoles.length === 0
                    ? new AuthorizationRequiredError("N/A", "N/A")
                    : new AccessDeniedError("N/A", "N/A");
            throw error;
        }
    }

    getParamFromRequest(action: Action<GhostServerRequest, GhostServerResponse>, param: ParamMetadata): any {
        const request = action.request;
        switch (param.type) {
            case "session-param":
                return request.session?.[param.name];
            case "session":
                return request.session;
            case "body":
                return request.body;
            case "body-param":
                return request.body?.[param.name];
            case "param":
                return request.params?.[param.name];
            case "params":
                return request.params;
            case "query":
                return request.query?.[param.name];
            case "queries":
                return request.query;
            case "header":
                return request.headers?.[param.name.toLowerCase()];
            case "headers":
                return request.headers;
            case "cookie":
                return request.cookies?.[param.name];
            case "cookies":
                return request.cookies;
            case "file":
                return request.file;
            case "files":
                return request.files;
            default:
                return undefined;
        }
    }

    async handleError(
        error: any,
        action: Action<GhostServerRequest, GhostServerResponse>,
        actionMetadata?: ActionMetadata,
    ) {
        if (actionMetadata) {
            Object.entries(actionMetadata.headers).forEach(([name, value]) => {
                action.response.headers = action.response.headers || {};
                action.response.headers[name] = value;
            });
        }

        if (error instanceof HttpError && error.httpCode) {
            action.response.statusCode = error.httpCode;
        } else {
            action.response.statusCode = 500;
        }

        if (!error.handled && this.customErrorHandler) {
            await this.customErrorHandler.onError(error, action, actionMetadata);
        } else {
            delete error.handled;
            const parsedError = this.globalErrorHandler.handleError(error);
            action.response.body = parsedError;
        }
    }

    handleSuccess(
        result: any,
        action: Action<GhostServerRequest, GhostServerResponse>,
        actionMetadata: ActionMetadata,
    ) {
        if (result && result === action.response) {
            return;
        }

        // Set status code
        if (result === undefined && actionMetadata.undefinedResultCode) {
            action.response.statusCode = actionMetadata.undefinedResultCode;
            action.response.body = {};
        } else if (result === null) {
            action.response.statusCode = actionMetadata.nullResultCode ?? 204;
            action.response.body = null;
        } else if (actionMetadata.successHttpCode) {
            action.response.statusCode = actionMetadata.successHttpCode;
            action.response.body = result;
        } else {
            action.response.body = result;
        }

        // Headers
        Object.entries(actionMetadata.headers).forEach(([name, value]) => {
            action.response.headers = action.response.headers || {};
            action.response.headers[name] = value;
        });

        // Redirect or template rendering not applicable here, but can be extended if needed
    }
}
