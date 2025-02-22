import {PropertyOptions} from "@nodeboot/context";
import {NodeBootToolkit} from "@nodeboot/engine";

export function Property(options: PropertyOptions = {}) {
    return function (object: Object, propertyKey: string) {
        options = Object.assign(
            {},
            {
                name: propertyKey,
                required: true,
                type: Reflect.getMetadata("design:type", object, propertyKey),
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
