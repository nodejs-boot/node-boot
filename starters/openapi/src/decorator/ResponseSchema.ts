import {OperationObject, ReferenceObject, ResponsesObject, SchemaObject} from "openapi3-ts";
import {IRoute} from "../types";
import _merge from "lodash.merge";
import {getContentType, getStatusCode} from "../openapi";
import {OpenAPI} from "./OpenAPI";
import {Model} from "./Model";

/**
 * Supplement action with response body type annotation.
 */
export function ResponseSchema(
    responseClass: Function | string,
    options: {
        contentType?: string;
        description?: string;
        statusCode?: string | number;
        isArray?: boolean;
    } = {},
) {
    const setResponseSchema = (source: OperationObject, route: IRoute) => {
        const contentType = options.contentType || getContentType(route);
        const description = options.description || "";
        const isArray = options.isArray || false;
        const statusCode = (options.statusCode || getStatusCode(route)) + "";

        let responseSchemaName = "";

        // Ensure the response class is properly registered with @Model
        if (typeof responseClass === "function" && responseClass.name) {
            responseSchemaName = responseClass.name;

            // Automatically apply the @Model decorator if not already applied
            if (!Reflect.getMetadata("node-boot:model", responseClass.prototype)) {
                Model()(responseClass);
            }
        } else if (typeof responseClass === "string") {
            responseSchemaName = responseClass;
        }

        if (responseSchemaName) {
            const reference: ReferenceObject = {
                $ref: `#/components/schemas/${responseSchemaName}`,
            };
            const schema: SchemaObject = isArray ? {type: "array", items: reference} : reference;

            const responses: ResponsesObject = {
                [statusCode]: {
                    content: {
                        [contentType]: {
                            schema,
                        },
                    },
                    description,
                },
            };

            const oldSchema = source.responses?.[statusCode]?.content?.[contentType]?.schema;

            if (oldSchema?.$ref || oldSchema?.items || oldSchema?.oneOf) {
                // If multiple schemas are needed under the same status code/content type
                const newStatusCodeResponse = _merge({}, source.responses[statusCode], responses[statusCode]);
                const newSchema = oldSchema.oneOf
                    ? {oneOf: [...oldSchema.oneOf, schema]}
                    : {oneOf: [oldSchema, schema]};

                newStatusCodeResponse.content[contentType].schema = newSchema;
                source.responses[statusCode] = newStatusCodeResponse;
                return source;
            }

            return _merge({}, source, {responses});
        }

        return source;
    };

    return OpenAPI(setResponseSchema);
}
