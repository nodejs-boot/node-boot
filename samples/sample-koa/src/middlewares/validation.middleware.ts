import {plainToInstance} from "class-transformer";
import {validateOrReject, ValidationError} from "class-validator";
import {HttpException} from "../exceptions/httpException";
import {Next, Request} from "koa";

type ReqWithBody = Request & {body?: unknown};

/**
 * @name ValidationMiddleware
 * @description Allows use of decorator and non-decorator based validation
 * @param type dto
 * @param skipMissingProperties When skipping missing properties
 * @param whitelist Even if your object is an instance of a validation class it can contain additional properties that are not defined
 * @param forbidNonWhitelisted If you would rather to have an error thrown when any non-whitelisted properties are present
 */
export const ValidationMiddleware = (
    type: any,
    skipMissingProperties = false,
    whitelist = false,
    forbidNonWhitelisted = false,
) => {
    return (req: ReqWithBody, _res: never, next: Next) => {
        const dto: object = plainToInstance(type, req.body);
        validateOrReject(dto, {
            skipMissingProperties,
            whitelist,
            forbidNonWhitelisted,
        })
            .then(() => {
                req.body = dto;
                return next();
            })
            .catch((errors: ValidationError[]) => {
                const message = errors
                    .map((error: ValidationError) => Object.values(error.constraints ?? {}))
                    .join(", ");
                // void next(new HttpException(400, message));
                throw new HttpException(400, message);
            });
    };
};
