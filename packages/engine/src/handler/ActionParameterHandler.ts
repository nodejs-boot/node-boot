import {plainToInstance} from "class-transformer";
import {validateOrReject, ValidationError} from "class-validator";
import {Param} from "../util";
import {
    AuthorizationRequiredError,
    BadRequestError,
    CurrentUserCheckerNotDefinedError,
    InvalidParamError,
    ParameterParseJsonError,
    ParamRequiredError,
} from "@nodeboot/error";
import {NodeBootDriver} from "../core";
import {Action, ParamMetadata} from "@nodeboot/context";

/**
 * Handles action parameter.
 */
export class ActionParameterHandler<TServer, TDriver extends NodeBootDriver<TServer>> {
    constructor(private readonly driver: TDriver) {}

    /**
     * Handles action parameter.
     */
    async handle(action: Action, param: ParamMetadata): Promise<any> {
        if (param.type === "request") return action.request;
        if (param.type === "response") return action.response;
        if (param.type === "context") return action.context;

        // get parameter value from request and normalize it
        const value = await this.normalizeParamValue(this.driver.getParamFromRequest(action, param), param);
        return this.handleValue(value, action, param);
    }

    /**
     * Handles non-promise value.
     */
    protected async handleValue(value: any, action: Action, param: ParamMetadata): Promise<any> {
        // if transform function is given for this param then apply it
        if (param.transform) {
            value = await param.transform(action, value);
        }

        // if its current-user decorator then get its value
        if (param.type === "current-user") {
            const checker = optionalOf(this.driver.currentUserChecker).orElseThrow(
                () => new CurrentUserCheckerNotDefinedError(),
            );
            value = checker.check(action);
        }

        // check cases when parameter is required but its empty and throw errors in this case
        if (param.required) {
            const isValueEmpty = value === null || value === undefined || value === "";
            const isValueEmptyObject = typeof value === "object" && value !== null && Object.keys(value).length === 0;

            if (param.type === "body" && !param.name && (isValueEmpty || isValueEmptyObject)) {
                // body has a special check and error message
                throw new ParamRequiredError(
                    {
                        method: action.request.method,
                        url: action.request.url,
                    },
                    param,
                );
            } else if (param.type === "current-user" && !value) {
                // current user has a special check as well
                return Promise.reject(new AuthorizationRequiredError(action.request.method, action.request.url));
            } else if (param.name && isValueEmpty) {
                // regular check for all other parameters // todo: figure out something with param.name usage and multiple things params (query params, upload files etc.)
                throw new ParamRequiredError(
                    {
                        method: action.request.method,
                        url: action.request.url,
                    },
                    param,
                );
            }
        }

        return value;
    }

    /**
     * Normalizes parameter value.
     */
    protected async normalizeParamValue(value: any, param: ParamMetadata) {
        if (value === null || value === undefined) return value;

        const isNormalizationNeeded =
            typeof value === "object" && ["queries", "headers", "params", "cookies"].includes(param.type);
        const isTargetPrimitive = ["number", "string", "boolean"].includes(param.targetName);
        const isTransformationNeeded = (param.parse || param.isTargetObject) && param.type !== "param";

        // if param value is an object and param type match, normalize its string properties
        if (isNormalizationNeeded) {
            await Promise.all(
                Object.keys(value).map(async key => {
                    const keyValue = value[key];
                    if (typeof keyValue === "string") {
                        const ParamType: Function | undefined = (Reflect as any).getMetadata(
                            "design:type",
                            param.targetType.prototype,
                            key,
                        );
                        if (ParamType) {
                            const typeString = ParamType.name.toLowerCase();
                            value[key] = await this.normalizeParamValue(keyValue, {
                                ...param,
                                name: key,
                                targetType: ParamType,
                                targetName: typeString,
                            });
                        }
                    }
                }),
            );
        }
        // if value is a string, normalize it to demanded type
        else if (typeof value === "string") {
            switch (param.targetName) {
                case "number":
                case "string":
                case "boolean":
                case "date":
                    return this.extractPrimitiveParam(value, param);
                case "array":
                    return [value];
            }
        } else if (Array.isArray(value)) {
            return value.map(v => {
                const normalizedValue = Param.ofString(v, param).orElseThrow(
                    () => new InvalidParamError(v, param.name, param.targetName),
                );
                return param.isArray ? [normalizedValue] : normalizedValue;
            });
        }

        // if target type is not primitive, transform and validate it
        if (!isTargetPrimitive && isTransformationNeeded) {
            value = await this.parseValue(value, param);
            value = await this.transformValue(value, param);
            value = await this.validateValue(value, param);
        }

        return value;
    }

    private extractPrimitiveParam(value: string, param: ParamMetadata) {
        const normalizedValue = Param.ofString(value, param).orElseThrow(
            () => new InvalidParamError(value, param.name, param.targetName),
        );

        return param.isArray ? [normalizedValue] : normalizedValue;
    }

    /**
     * Parses string value into a JSON object.
     */
    protected async parseValue(value: any, paramMetadata: ParamMetadata): Promise<any> {
        if (typeof value === "string") {
            if (["queries", "query"].includes(paramMetadata.type) && paramMetadata.targetName === "array") {
                return [value];
            } else {
                try {
                    return JSON.parse(value);
                } catch (error) {
                    throw new ParameterParseJsonError(paramMetadata.name, value);
                }
            }
        }
        return value;
    }

    /**
     * Perform class-transformation if enabled.
     */
    protected async transformValue(value: any, paramMetadata: ParamMetadata): Promise<any> {
        if (
            this.driver.useClassTransformer &&
            paramMetadata.actionMetadata.options?.transformRequest !== false &&
            paramMetadata.targetType &&
            paramMetadata.targetType !== Object &&
            !(value instanceof paramMetadata.targetType)
        ) {
            const options = paramMetadata.classTransform || this.driver.plainToClassTransformOptions;
            value = plainToInstance(paramMetadata.targetType, value, options);
        }
        return value;
    }

    /**
     * Perform class-validation if enabled.
     */
    protected async validateValue(value: any, paramMetadata: ParamMetadata): Promise<any> {
        // Validate only if validations is enabled globally via configurations
        if (this.driver.enableValidation && paramMetadata.targetType && paramMetadata.targetType !== Object) {
            const dto: any = plainToInstance(paramMetadata.targetType, value);

            // When enabled globally, still skip validation if disabled by the route
            if (paramMetadata.validate !== false && dto) {
                const options = Object.assign(
                    {
                        forbidUnknownValues: false,
                    },
                    this.driver.validationOptions,
                    paramMetadata.validate,
                );

                try {
                    await validateOrReject(dto, options);
                } catch (validationErrors: any) {
                    const message = validationErrors
                        .map((error: ValidationError) => {
                            const constraints = error.constraints ?? {};
                            return Object.keys(constraints)
                                .map(constraint => `${constraint}->${constraints[constraint]}`)
                                .join(", ");
                        })
                        .join(", ");
                    const error: any = new BadRequestError(message);
                    error.errors = validationErrors.map((validationError: ValidationError) => {
                        delete validationError.target;
                        return validationError;
                    });
                    error.paramName = paramMetadata.name;
                    error.handled = true;
                    throw error;
                }
            }
        }
        return value;
    }
}
