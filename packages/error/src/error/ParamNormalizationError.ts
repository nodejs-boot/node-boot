import {BadRequestError} from "../http-error";

/**
 * Caused when user query parameter is invalid (cannot be parsed into selected type).
 */
export class InvalidParamError extends BadRequestError {
    override name = "ParamNormalizationError";

    constructor(value: any, parameterName: string, parameterType: string) {
        super(
            `Given parameter ${parameterName} is invalid. Value (${JSON.stringify(
                value,
            )}) cannot be parsed into ${parameterType}.`,
        );

        Object.setPrototypeOf(this, InvalidParamError.prototype);
    }
}
