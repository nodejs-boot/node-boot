import {MistralAutoConfiguration} from "../config";

/**
 * Enables Mistral models in NodeBoot AI.
 */
export const EnableMistralModels = (): ClassDecorator => {
    return () => {
        new MistralAutoConfiguration();
    };
};
