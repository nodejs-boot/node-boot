import {PropertyOptions} from "@node-boot/context";
import {NodeBootToolkit} from "@node-boot/engine";

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
