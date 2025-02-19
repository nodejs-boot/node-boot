import {HttpError} from "@nodeboot/error";
import {NodeBootDriver} from "../core";

export class GlobalErrorHandler {
    constructor(private readonly driver: NodeBootDriver<any>) {}

    handleError(error: any) {
        if (typeof error.toJSON === "function") {
            return error.toJSON();
        }

        if (error instanceof Error) {
            const processedError: any = {};
            processedError.name = error.name && error.name !== "Error" ? error.name : error.constructor.name;

            if (error.message) {
                processedError.message = error.message;
            }
            if (error.stack && this.driver.developmentMode) processedError.stack = error.stack;

            Object.keys(error)
                .filter(
                    key =>
                        key !== "stack" &&
                        key !== "name" &&
                        key !== "message" &&
                        (!(error instanceof HttpError) || key !== "httpCode"),
                )
                .forEach(key => (processedError[key] = (error as any)[key]));

            return Object.keys(processedError).length > 0 ? processedError : undefined;
        }

        return error;
    }
}
