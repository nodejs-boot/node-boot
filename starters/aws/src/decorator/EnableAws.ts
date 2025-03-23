import {
    DynamoDBClientConfiguration,
    S3ClientConfiguration,
    SecretsManagerClientConfiguration,
    SnsClientConfiguration,
    SqsClientConfiguration,
} from "../config";

/**
 * Decorator to enable AWS service configurations.
 *
 * This decorator automatically initializes configurations for AWS DynamoDB, S3,
 * Secrets Manager, and SQS clients.
 *
 * @returns {ClassDecorator} The decorator function.
 */
export const EnableAws = (): ClassDecorator => {
    return () => {
        // Autoconfiguration for DynamoDB
        new DynamoDBClientConfiguration();
        // Autoconfiguration for S3
        new S3ClientConfiguration();
        // Autoconfiguration for Secrets Manager
        new SecretsManagerClientConfiguration();
        // Autoconfiguration for SQS
        new SqsClientConfiguration();
        // Autoconfiguration for SNS
        new SnsClientConfiguration();
    };
};
