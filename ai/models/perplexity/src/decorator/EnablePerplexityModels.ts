import {PerplexityAutoConfiguration} from "../config";

/**
 * Enables Perplexity models in NodeBoot AI.
 */
export const EnablePerplexityModels = (): ClassDecorator => {
    return () => {
        new PerplexityAutoConfiguration();
    };
};
