import {ActionMetadata} from "@nodeboot/context";
import {instanceToPlain} from "class-transformer";
import {NodeBootDriver} from "../core";

export class ResultTransformer {
    constructor(private readonly driver: NodeBootDriver<any>) {}

    transformResult<T = unknown>(result: any, actionMetadata: ActionMetadata): T {
        // check if we need to transform result
        const shouldTransform =
            this.driver.useClassTransformer && // transform only if class-transformer is enabled
            actionMetadata.options?.transformResponse !== false && // don't transform if actionMetadata response transform is disabled
            result instanceof Object && // don't transform primitive types (string/number/boolean)
            !(
                (result instanceof Uint8Array || result.pipe instanceof Function) // don't transform binary data // don't transform streams
            );

        // transform result if needed
        if (shouldTransform) {
            const options = actionMetadata.responseClassTransformOptions || this.driver.classToPlainTransformOptions;
            result = instanceToPlain(result, options);
        }

        return result;
    }
}
