import {NodeBootToolkit} from "@nodeboot/engine";

export function Model(): ClassDecorator {
    return (target: Function) => {
        Reflect.defineMetadata("node-boot:model", true, target.prototype);
        NodeBootToolkit.getMetadataArgsStorage().models.push({target});
    };
}
