import {AnthropicAutoConfiguration} from "../config";

/**
 * Enables Anthropic models in NodeBoot AI.
 */
export const EnableAnthropicModels = (): ClassDecorator => {
    return () => {
        new AnthropicAutoConfiguration();
    };
};
