import {DeepSeekAutoConfiguration} from "../config";

/**
 * Enables DeepSeek models in NodeBoot AI.
 */
export const EnableDeepSeekModels = (): ClassDecorator => {
    return () => {
        new DeepSeekAutoConfiguration();
    };
};
