import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {OpenAiConfigProperties} from "./types";
import OpenAI from "openai";

/**
 * Configuration class for setting up OpenAI in a NodeBoot service.
 * @class
 */
@Configuration()
export class OpenAIConfiguration {
    /**
     * Configures the OpenAI client and registers it in the IoC container.
     * @param {BeansContext} context - The beans context containing logger, config, and IoC container.
     */
    @Bean()
    public openAiConfig({logger, config, iocContainer}: BeansContext): void {
        logger.info("Configuring OpenAI Client");

        const openAiConfigs = config.getOptional<OpenAiConfigProperties>("integrations.openai");

        if (openAiConfigs) {
            const openAiClient = new OpenAI(openAiConfigs);

            iocContainer.set(OpenAI, openAiClient);
            logger.info(
                "OpenAI client successfully configured with configs from app-config.yaml. You can now inject OpenAI in your services",
            );
        } else {
            logger.warn(
                'OpenAI integration not configured. Please provide OpenAI integration config ("baseURL" and "apiKey") under "integrations.openai" config path in your service app-config.yaml',
            );
        }
    }
}
