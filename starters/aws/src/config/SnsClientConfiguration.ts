import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext} from "@nodeboot/context";
import {AwsCredentialIdentity} from "./types";
import {AWS_CREDENTIALS_CONFIG_PATH, AWS_SNS_FEATURE} from "../types";

/**
 * Configuration for AWS SNS Client.
 */
@Configuration({onConfig: "integrations.aws.sns.region"})
export class SnsClientConfiguration {
    /**
     * Initializes and registers the AWS SNS client.
     * @param {BeansContext} context - The context containing logger, config, and IoC container.
     */
    @Bean()
    public async snsClient({logger, config, iocContainer}: BeansContext) {
        logger.info("Configuring AWS SNS client");
        try {
            const {SNSClient} = await import("@aws-sdk/client-sns");
            const region = config.getString("integrations.aws.sns.region");
            const credentials = config.getOptional<AwsCredentialIdentity>(AWS_CREDENTIALS_CONFIG_PATH);
            if (!credentials) {
                logger.warn(
                    `AWS credentials not found under "${AWS_CREDENTIALS_CONFIG_PATH}". Falling back to default AWS credentials resolver`,
                );
            }

            const client = new SNSClient({region, credentials, logger});
            iocContainer.set(SNSClient, client);

            // Enable AWS SNS feature in the application context
            ApplicationContext.get().applicationFeatures[AWS_SNS_FEATURE] = true;

            logger.info("AWS SNS client successfully configured.");
        } catch (error: any) {
            if (error.code === "MODULE_NOT_FOUND") {
                logger.error(
                    "Error: SNS library not found. Please install '@aws-sdk/client-sns' to enable SNS support.",
                );
            } else {
                logger.error(`Failed to configure SNS client: ${error.message}`);
            }
        }
    }
}
