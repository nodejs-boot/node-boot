import {DmrAutoConfiguration} from "../config";

/**
 * Enables Dmr models in NodeBoot AI.
 */
export const EnableDmrModels = (): ClassDecorator => {
    return () => {
        new DmrAutoConfiguration();
    };
};
