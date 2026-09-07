import {OpenAiAutoConfiguration} from "../config";

/**
 * Enables OpenAI models in NodeBoot AI.
 */
export const EnableOpenAiModels = (): ClassDecorator => {
    return () => {
        new OpenAiAutoConfiguration();
    };
};
