import "reflect-metadata";
import {PropertyOptions} from "@nodeboot/context";
import {NodeBootToolkit} from "@nodeboot/engine";
import {SchemaObject} from "openapi3-ts";

const PRIMITIVE_TYPES = new Set(["string", "number", "boolean"]);

function resolveType(property: PropertyOptions): string {
    let type = "";

    if (typeof property.type === "string") {
        type = (property.type as String).toLowerCase();
    } else {
        type = (property.type as Function).name.toLowerCase();
    }
    return type;
}

function resolveProperty(property: PropertyOptions) {
    const {type: proType, itemType} = property;
    const type = resolveType(property);

    delete property.name;
    delete property.type;
    delete property.required;
    delete property.itemType;
    if (PRIMITIVE_TYPES.has(type)) {
        return Object.assign({}, {type}, property);
    }
    if (type === "array") {
        return {
            type,
            ...property,
            items: resolveModel(itemType as Function),
        };
    }
    return resolveModel(proType as Function);
}

function resolveModel(model: Function): any {
    if (!model) {
        return {type: ""};
    }

    const type = model.name.toLowerCase();
    const properties = NodeBootToolkit.getMetadataArgsStorage().filterPropertyByTarget(model);

    if (PRIMITIVE_TYPES.has(type)) {
        return {type};
    }
    return {
        type: "object",
        required: properties.reduce<string[]>((acc, property) => {
            if (property.options.required && property.options.name) {
                acc.push(property.options.name);
            }
            return acc;
        }, []),
        properties: properties.reduce((acc, property) => {
            acc[property.options.name || ""] = resolveProperty(property.options);
            return acc;
        }, {}),
    };
}

export function parseDataClasses(dataClasses: Function[]): Record<string, SchemaObject> {
    return dataClasses.reduce((acc, model) => {
        acc[model.name] = resolveModel(model);
        return acc;
    }, {} as {[key: string]: any});
}
