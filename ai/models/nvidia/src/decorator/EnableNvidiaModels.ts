import {NvidiaAutoConfiguration} from "../config";

/**
 * Enables Nvidia models in NodeBoot AI.
 */
export const EnableNvidiaModels = (): ClassDecorator => {
    return () => {
        new NvidiaAutoConfiguration();
    };
};
