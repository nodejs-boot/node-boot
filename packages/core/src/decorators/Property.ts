import {PropertyOptions} from "@nodeboot/context";
import {NodeBootToolkit} from "@nodeboot/engine";

export function Property(options: PropertyOptions = {}) {
    return function (object: Object, propertyKey: string) {
        const resolvedType = Reflect.getMetadata("design:type", object, propertyKey);

        options = Object.assign(
            {},
            {
                name: propertyKey,
                required: options.required,
                type: options.type ?? resolvedType,
            },
            options,
        );

        NodeBootToolkit.getMetadataArgsStorage().modelProperties.push({
            target: object.constructor,
            method: propertyKey,
            options,
        });
    };
}
