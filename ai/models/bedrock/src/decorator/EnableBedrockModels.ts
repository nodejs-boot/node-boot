import {BedrockAutoConfiguration} from "../config";

/**
 * Enables Amazon Bedrock models in NodeBoot AI.
 */
export const EnableBedrockModels = (): ClassDecorator => {
    return () => {
        new BedrockAutoConfiguration();
    };
};
