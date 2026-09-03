import {AzureOpenAiAutoConfiguration} from "../config";

/**
 * Enables Azure OpenAI models in NodeBoot AI.
 */
export const EnableAzureOpenAiModels = (): ClassDecorator => {
    return () => {
        new AzureOpenAiAutoConfiguration();
    };
};
