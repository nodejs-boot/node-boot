import {MiniMaxAutoConfiguration} from "../config";

/**
 * Enables MiniMax models in NodeBoot AI.
 */
export const EnableMiniMaxModels = (): ClassDecorator => {
    return () => {
        new MiniMaxAutoConfiguration();
    };
};
