import "reflect-metadata";
import {PropertyOptions} from "@nodeboot/context";
import {NodeBootToolkit} from "@nodeboot/engine";
import {SchemaObject} from "openapi3-ts";

const PRIMITIVE_TYPES = new Set(["string", "number", "integer", "boolean", "object"]);
const PRIMITIVE_TYPE_MAP: Record<string, string> = {
    string: "string",
    number: "number",
    integer: "integer",
    boolean: "boolean",
    object: "object",
};

export type Model = {new (): any};

/**
 * Normalizes the provided type (string or Function) and returns its OpenAPI type name.
 */
function normalizeType(type: string | Function | undefined): string {
    if (!type) return "object"; // Default to object if type is unknown
    if (typeof type === "string") {
        return PRIMITIVE_TYPE_MAP[type.toLowerCase()] || "object"; // Default to `object` if unrecognized
    }
    return PRIMITIVE_TYPES.has(type.name.toLowerCase()) ? type.name.toLowerCase() : type.name;
}

/**
 * Resolves a property definition for OpenAPI schema.
 */
function resolveProperty(property: Partial<PropertyOptions>, inferredType?: Function) {
    const typeName = normalizeType(property.type || inferredType);

    const baseObj = {description: property.description, example: property.example};

    // Handle Date explicitly
    if (typeName === "date" || typeName === "Date") {
        return {type: "string", format: "date-time", ...baseObj}; // OpenAPI standard for Date
    }

    // Handle primitive types
    if (PRIMITIVE_TYPES.has(typeName)) {
        return {type: typeName, ...baseObj};
    }

    // Handle array types
    if (typeName === "array" || typeName === "Array") {
        return {
            type: "array",
            items: property.itemType
                ? resolveProperty({type: property.itemType}) // Recursively resolve item type
                : {type: "object"}, // Default to object if no item type is defined
            ...baseObj,
        };
    }

    // Handle object references
    return {$ref: `#/components/schemas/${typeName}`};
}

/**
 * Resolves a model class into an OpenAPI schema definition.
 */
function resolveModel(model: any): SchemaObject {
    if (!model) {
        return {type: "object"};
    }

    const typeName = normalizeType(model);
    if (PRIMITIVE_TYPES.has(typeName)) {
        return {type: typeName as any};
    }

    const schema: SchemaObject = {type: "object", properties: {}};
    const requiredFields: string[] = [];

    // Retrieve properties from decorators
    const decoratedProperties = NodeBootToolkit.getMetadataArgsStorage().filterPropertyByTarget(model);
    const decoratedPropertyNames = new Set(decoratedProperties.map(p => p.options.name));

    // Retrieve all instance properties (decorated + non-decorated)
    const prototype = model.prototype;
    const allPropertyNames = new Set([...Object.keys(new model()), ...decoratedPropertyNames]);

    for (const propertyName of allPropertyNames) {
        if (propertyName) {
            // Retrieve decorator metadata
            const decoratorData = decoratedProperties.find(p => p.options.name === propertyName);
            let propertyType =
                decoratorData?.options.type || Reflect.getMetadata("design:type", prototype, propertyName);

            if (!propertyType) propertyType = String; // Default to string if type is not resolvable

            const resolvedProperty = resolveProperty(
                {
                    ...decoratorData?.options,
                    name: propertyName,
                    type: propertyType,
                },
                propertyType,
            );

            if (decoratorData?.options.required) {
                requiredFields.push(propertyName);
            }

            (schema.properties as any)[propertyName] = resolvedProperty;
        }
    }

    if (requiredFields.length) {
        schema.required = requiredFields;
    }

    return schema;
}

/**
 * Converts an array of model classes into OpenAPI schema definitions.
 */
export function parseDataClasses(dataClasses: Model[]): Record<string, SchemaObject> {
    return dataClasses.reduce((acc, model) => {
        acc[model.name] = resolveModel(model);
        return acc;
    }, {} as Record<string, SchemaObject>);
}
