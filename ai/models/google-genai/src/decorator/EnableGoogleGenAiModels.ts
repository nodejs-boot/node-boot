import {GoogleGenAiAutoConfiguration} from "../config";

/**
 * Enables Google GenAI models in NodeBoot AI.
 */
export const EnableGoogleGenAiModels = (): ClassDecorator => {
    return () => {
        new GoogleGenAiAutoConfiguration();
    };
};
