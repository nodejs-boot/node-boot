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
    function resolvePrimitiveSchema(primitiveType: string) {
        let primitiveSchema: SchemaObject;
        switch (primitiveType) {
            case "string":
                primitiveSchema = {type: "string"};
                break;
            case "number":
                primitiveSchema = {type: "number"};
                break;
            case "integer":
                primitiveSchema = {type: "integer"};
                break;
            case "boolean":
                primitiveSchema = {type: "boolean"};
                break;
            case "object":
                primitiveSchema = {type: "object"};
                break;
            case "array":
                primitiveSchema = {type: "array", items: {}};
                break;
            default:
                // Fallback for custom types or unknown primitives
                primitiveSchema = {type: "string"};
                break;
        }
        return primitiveSchema;
    }

    const setResponseSchema = (source: OperationObject, route: IRoute) => {
        const contentType = options.contentType || getContentType(route);
        const description = options.description || "";
        const isArray = options.isArray || false;
        const statusCode = (options.statusCode || getStatusCode(route)) + "";

        let responseSchemaName = "";
        let schema: SchemaObject | undefined = undefined;

        // Ensure the response class is properly registered with @Model
        if (typeof responseClass === "function" && responseClass.name) {
            responseSchemaName = responseClass.name;

            // Automatically apply the @Model decorator if not already applied
            if (!Reflect.getMetadata("node-boot:model", responseClass.prototype)) {
                Model()(responseClass);
            }

            const reference: ReferenceObject = {
                $ref: `#/components/schemas/${responseSchemaName}`,
            };
            schema = isArray ? {type: "array", items: reference} : reference;
        } else if (typeof responseClass === "string") {
            // Handle primitive types directly
            const primitiveType = responseClass.toLowerCase();
            const primitiveSchema = resolvePrimitiveSchema(primitiveType);

            schema = isArray ? {type: "array", items: primitiveSchema} : primitiveSchema;
            responseSchemaName = primitiveType; // For tracking purposes
        }

        if (responseSchemaName && schema) {
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
