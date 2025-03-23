import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {AwsCredentialIdentity} from "./types";
import {AWS_CREDENTIALS_CONFIG_PATH, AWS_S3_FEATURE} from "../types";
import {ApplicationContext} from "@nodeboot/context/src";

/**
 * Configuration for AWS S3 Client.
 */
@Configuration({onConfig: "integrations.aws.s3.region"})
export class S3ClientConfiguration {
    /**
     * Initializes and registers the AWS S3 client.
     * @param {BeansContext} context - The context containing logger, config, and IoC container.
     */
    @Bean()
    public async s3Client({logger, config, iocContainer}: BeansContext) {
        logger.info("Configuring AWS S3 client");
        try {
            const {S3Client} = await import("@aws-sdk/client-s3");
            const region = config.getString("integrations.aws.s3.region");
            const credentials = config.getOptional<AwsCredentialIdentity>(AWS_CREDENTIALS_CONFIG_PATH);
            if (!credentials) {
                logger.warn(
                    `AWS credentials not found under "${AWS_CREDENTIALS_CONFIG_PATH}". Falling back to default AWS credentials resolver`,
                );
            }

            const client = new S3Client({region, credentials, logger});
            iocContainer.set(S3Client, client);

            // Enable AWS S3 feature in the application context
            ApplicationContext.get().applicationFeatures[AWS_S3_FEATURE] = true;

            logger.info("AWS S3 client successfully configured.");
        } catch (error: any) {
            if (error.code === "MODULE_NOT_FOUND") {
                logger.error("Error: S3 library not found. Please install @aws-sdk/client-s3.");
            } else {
                logger.error(`Failed to configure S3 client: ${error.message}`);
            }
        }
    }
}
