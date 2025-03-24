import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext} from "@nodeboot/context";
import {AwsCredentialIdentity} from "./types";
import {AWS_CREDENTIALS_CONFIG_PATH, AWS_DYNAMODB_FEATURE} from "../types";

/**
 * Configuration for AWS DynamoDB Client.
 */
@Configuration({onConfig: "integrations.aws.dynamodb.region"})
export class DynamoDBClientConfiguration {
    /**
     * Initializes and registers the AWS DynamoDB client.
     * @param {BeansContext} context - The context containing logger, config, and IoC container.
     */
    @Bean()
    public async dynamoDBClient({logger, config, iocContainer}: BeansContext) {
        logger.info("Configuring AWS DynamoDB client");
        try {
            const {DynamoDBClient} = await import("@aws-sdk/client-dynamodb");
            const region = config.getString("integrations.aws.dynamodb.region");
            const credentials = config.getOptional<AwsCredentialIdentity>(AWS_CREDENTIALS_CONFIG_PATH);
            if (!credentials) {
                logger.warn(
                    `AWS credentials not found under "${AWS_CREDENTIALS_CONFIG_PATH}". Falling back to default AWS credentials resolver`,
                );
            }

            const client = new DynamoDBClient({region, credentials, logger});
            iocContainer.set(DynamoDBClient, client);

            // Enable AWS S3 feature in the application context
            ApplicationContext.get().applicationFeatures[AWS_DYNAMODB_FEATURE] = true;

            logger.info("AWS DynamoDB client successfully configured.");
        } catch (error: any) {
            if (error.code === "MODULE_NOT_FOUND") {
                logger.error("Error: DynamoDB library not found. Please install @aws-sdk/client-dynamodb.");
            } else {
                logger.error(`Failed to configure DynamoDB client: ${error.message}`);
            }
        }
    }
}
