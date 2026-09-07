import {OllamaAutoConfiguration} from "../config";

/**
 * Enables Ollama models in NodeBoot AI.
 */
export const EnableOllamaModel = (): ClassDecorator => {
    return () => {
        new OllamaAutoConfiguration();
    };
};
