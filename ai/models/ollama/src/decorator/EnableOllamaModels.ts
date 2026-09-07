import {OllamaAutoConfiguration} from "../config";

/**
 * Enables Ollama models in NodeBoot AI.
 */
export const EnableOllamaModels = (): ClassDecorator => {
    return () => {
        new OllamaAutoConfiguration();
    };
};
