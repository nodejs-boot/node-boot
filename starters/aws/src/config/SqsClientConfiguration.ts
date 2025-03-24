import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext} from "@nodeboot/context";
import {AwsCredentialIdentity} from "./types";
import {AWS_CREDENTIALS_CONFIG_PATH, AWS_SQS_FEATURE} from "../types";

/**
 * Auto-Configuration for AWS SQS Client.
 */
@Configuration({onConfig: "integrations.aws.sqs.region"})
export class SqsClientConfiguration {
    /**
     * Initializes and registers the AWS SQS client.
     * @param {BeansContext} context - The context containing logger, config, and IoC container.
     */
    @Bean()
    public async sqsClient({logger, config, iocContainer}: BeansContext) {
        logger.info("Configuring AWS SQS client");
        try {
            const {SQSClient} = await import("@aws-sdk/client-sqs");
            const region = config.getString("integrations.aws.sqs.region");
            const credentials = config.getOptional<AwsCredentialIdentity>(AWS_CREDENTIALS_CONFIG_PATH);
            if (!credentials) {
                logger.warn(
                    `AWS credentials not found under "${AWS_CREDENTIALS_CONFIG_PATH}". Falling back to default AWS credentials resolver`,
                );
            }

            const client = new SQSClient({region, credentials, logger});
            iocContainer.set(SQSClient, client);

            // Enable AWS SQS feature in the application context
            ApplicationContext.get().applicationFeatures[AWS_SQS_FEATURE] = true;

            logger.info("AWS SQS client successfully configured.");
        } catch (error: any) {
            if (error.code === "MODULE_NOT_FOUND") {
                logger.error(
                    "Error: SQS library not found. Please install '@aws-sdk/client-sqs' to enable SQS support.",
                );
            } else {
                logger.error(`Failed to configure SQS client: ${error.message}`);
            }
        }
    }
}
