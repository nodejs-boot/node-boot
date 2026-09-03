import {AnthropicAutoConfiguration} from "../config";

/**
 * Enables Anthropic models in NodeBoot AI.
 */
export const EnableAnthropicModel = (): ClassDecorator => {
    return () => {
        new AnthropicAutoConfiguration();
    };
};
