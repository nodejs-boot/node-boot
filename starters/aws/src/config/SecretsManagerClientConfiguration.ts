import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext} from "@nodeboot/context";
import {AwsCredentialIdentity} from "./types";
import {AWS_CREDENTIALS_CONFIG_PATH, AWS_SECRETS_MANAGER_FEATURE} from "../types";

/**
 * Configuration for AWS Secrets Manager Client.
 */
@Configuration({onConfig: "integrations.aws.secrets.region"})
export class SecretsManagerClientConfiguration {
    /**
     * Initializes and registers the AWS Secrets Manager client.
     * @param {BeansContext} context - The context containing logger, config, and IoC container.
     */
    @Bean()
    public async secretsManagerClient({logger, config, iocContainer}: BeansContext) {
        logger.info("Configuring AWS Secrets Manager client");
        try {
            const {SecretsManagerClient} = await import("@aws-sdk/client-secrets-manager");
            const region = config.getString("integrations.aws.secrets.region");
            const credentials = config.getOptional<AwsCredentialIdentity>(AWS_CREDENTIALS_CONFIG_PATH);
            if (!credentials) {
                logger.warn(
                    `AWS credentials not found under "${AWS_CREDENTIALS_CONFIG_PATH}". Falling back to default AWS credentials resolver`,
                );
            }

            const client = new SecretsManagerClient({region, credentials, logger});
            iocContainer.set(SecretsManagerClient, client);

            // Enable AWS SNS feature in the application context
            ApplicationContext.get().applicationFeatures[AWS_SECRETS_MANAGER_FEATURE] = true;

            logger.info("AWS SecretsManager client successfully configured.");
        } catch (error: any) {
            if (error.code === "MODULE_NOT_FOUND") {
                logger.error(
                    "Error: Secrets Manager library not found. Please install @aws-sdk/client-secrets-manager.",
                );
            } else {
                logger.error(`Failed to configure Secrets Manager client: ${error.message}`);
            }
        }
    }
}
