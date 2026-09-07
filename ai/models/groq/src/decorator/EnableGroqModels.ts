import {GroqAutoConfiguration} from "../config";

/**
 * Enables Groq models in NodeBoot AI.
 */
export const EnableGroqModels = (): ClassDecorator => {
    return () => {
        new GroqAutoConfiguration();
    };
};
