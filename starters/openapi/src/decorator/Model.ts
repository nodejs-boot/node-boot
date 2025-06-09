import {NodeBootToolkit} from "@nodeboot/engine";
import {PropertyType} from "@nodeboot/context";

export function Model(bindings?: Record<string, PropertyType>): ClassDecorator {
    return (target: Function) => {
        Reflect.defineMetadata("node-boot:model", true, target.prototype);
        if (bindings) {
            Reflect.defineMetadata("node-boot:model:generic:bindings", bindings, target.prototype);
        }
        NodeBootToolkit.getMetadataArgsStorage().models.push({target});
    };
}
