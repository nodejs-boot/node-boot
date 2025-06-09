import {OPEN_API_TYPE_FORMAT, PropertyOptions} from "@nodeboot/context";
import {NodeBootToolkit} from "@nodeboot/engine";
import {ReferenceObject, SchemaObject} from "openapi3-ts";
import {PropertyType} from "@nodeboot/context/src/metadata/options/PropertyOptions";

type PRIMITIVE_TYPE = "string" | "number" | "integer" | "boolean" | "object" | "array" | "date";
type OPEN_API_TYPE = "integer" | "number" | "string" | "boolean" | "object" | "null" | "array";

type FIELD_TYPE = {
    type: PRIMITIVE_TYPE | string;
    openApiType: OPEN_API_TYPE;
    typeFormat?: OPEN_API_TYPE_FORMAT;
};

const PRIMITIVE_TYPE_MAP: Record<string, FIELD_TYPE> = {
    string: {
        type: "string",
        openApiType: "string",
    },
    number: {
        type: "number",
        openApiType: "number",
    },
    integer: {
        type: "integer",
        openApiType: "integer",
    },
    boolean: {
        type: "boolean",
        openApiType: "boolean",
    },
    object: {
        type: "object",
        openApiType: "object",
    },
    array: {
        type: "array",
        openApiType: "array",
    },
    date: {
        type: "date",
        openApiType: "string",
        typeFormat: "date-time",
    },
};

export type Model = {new (): any};

/**
 * Normalizes the provided type (string or Function) and returns its OpenAPI type mapping.
 */
function normalizeType(type: string | Function | undefined): FIELD_TYPE {
    if (!type) return PRIMITIVE_TYPE_MAP["object"]!;
    if (typeof type === "string") {
        return (
            PRIMITIVE_TYPE_MAP[type.toLowerCase()] ?? {
                type: type,
                openApiType: "object",
            }
        );
    }
    return (
        PRIMITIVE_TYPE_MAP[type.name.toLowerCase()] ?? {
            type: type.name,
            openApiType: "object",
        }
    );
}

/**
 * Resolves a property definition for OpenAPI schema.
 */
function resolveProperty(property: Partial<PropertyOptions>, inferredType?: Function): SchemaObject | ReferenceObject {
    const typeName = normalizeType(property.type || inferredType);
    const baseObj: Partial<SchemaObject> = {
        description: property.description,
        example: property.example,
    };

    if (property.nullable) {
        baseObj.nullable = property.nullable;
    }

    if (property.enum) {
        baseObj.enum = property.enum;
    }

    if (typeName.type !== "array") {
        if (PRIMITIVE_TYPE_MAP[typeName.type]) {
            return {
                type: typeName.openApiType,
                format: typeName.typeFormat,
                ...baseObj,
            };
        } else {
            return {
                $ref: `#/components/schemas/${typeName.type}`,
                ...baseObj,
            };
        }
    }

    // Handle arrays
    const itemType = property.itemType;
    let resolvedItems: SchemaObject | ReferenceObject;

    if (!itemType) {
        resolvedItems = {type: "object"};
    } else if (typeof itemType === "function") {
        const itemTypeName = normalizeType(itemType);
        resolvedItems = PRIMITIVE_TYPE_MAP[itemTypeName.type]
            ? {
                  type: itemTypeName.openApiType,
                  format: itemTypeName.typeFormat,
              }
            : {$ref: `#/components/schemas/${itemType.name}`};
    } else if (typeof itemType === "string") {
        const itemTypeName = normalizeType(itemType);
        resolvedItems = PRIMITIVE_TYPE_MAP[itemTypeName.type]
            ? {
                  type: itemTypeName.openApiType,
                  format: itemTypeName.typeFormat,
              }
            : {type: "object"};
    } else {
        resolvedItems = {type: "object"};
    }

    return {
        type: "array",
        items: resolvedItems,
        ...baseObj,
    };
}

/**
 * Resolves a model class into an OpenAPI schema definition.
 */
function resolveModel(model: any, bindings?: Record<string, PropertyType>): SchemaObject {
    if (!model) {
        return {type: "object"};
    }

    const typeName = normalizeType(model);
    if (PRIMITIVE_TYPE_MAP[typeName.type]) {
        return {type: typeName.openApiType, format: typeName.typeFormat};
    }

    const schema: SchemaObject = {type: "object", properties: {}};
    const requiredFields: string[] = [];

    const decoratedProperties = getAllDecoratedProperties(model);
    const decoratedPropertyNames = new Set(decoratedProperties.map(p => p.options.name));

    const prototype = model.prototype;
    const allPropertyNames = new Set([...Object.keys(new model()), ...decoratedPropertyNames]);

    for (const propertyName of allPropertyNames) {
        if (propertyName) {
            const decoratorData = decoratedProperties.find(p => p.options.name === propertyName);
            let propertyType =
                decoratorData?.options.type || Reflect.getMetadata("design:type", prototype, propertyName);

            if (!propertyType) propertyType = "object";

            const resolvedProperty = resolveProperty(
                {
                    ...decoratorData?.options,
                    name: propertyName,
                    type: propertyType,
                    // Resolve item type for raw types
                    itemType:
                        bindings && decoratorData?.options.itemType
                            ? bindings[decoratorData?.options.itemType.toString()]
                            : decoratorData?.options.itemType,
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

function dedupeDecoratedProperties(props: any[]): any[] {
    const seen = new Map<string, any>();

    for (const prop of props) {
        const key = prop.propertyName || prop.options?.name;
        if (key && !seen.has(key)) {
            seen.set(key, prop);
        }
    }

    return Array.from(seen.values());
}

function getAllDecoratedProperties(model: Function): any[] {
    const storage = NodeBootToolkit.getMetadataArgsStorage();
    const allProps: any[] = [];

    let current = model;

    while (current && current !== Object) {
        const props = storage.filterPropertyByTarget(current);
        allProps.push(...props);
        current = Object.getPrototypeOf(current);
    }
    return dedupeDecoratedProperties(allProps);
}

/**
 * Converts an array of model classes into OpenAPI schema definitions.
 */
export function parseDataClasses(dataClasses: Model[]): Record<string, SchemaObject> {
    return dataClasses.reduce((acc, model) => {
        const generics = Reflect.getMetadata("node-boot:model:generic:bindings", model.prototype);
        acc[model.name] = resolveModel(model, generics);
        return acc;
    }, {} as Record<string, SchemaObject>);
}
