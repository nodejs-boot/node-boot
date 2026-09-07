import {PerplexityAutoConfiguration} from "../config";

/**
 * Enables Perplexity models in NodeBoot AI.
 */
export const EnablePerplexityModel = (): ClassDecorator => {
    return () => {
        new PerplexityAutoConfiguration();
    };
};
