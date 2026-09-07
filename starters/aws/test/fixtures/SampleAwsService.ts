import {Service} from "@nodeboot/core";
import {GetObjectCommand, ListBucketsCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {DynamoDBClient, GetItemCommand, ListTablesCommand, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {ListTopicsCommand, PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {GetSecretValueCommand, ListSecretsCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";

@Service()
export class SampleAwsService {
    constructor(
        private readonly s3Client: S3Client,
        private readonly dynamoDbClient: DynamoDBClient,
        private readonly snsClient: SNSClient,
        private readonly sqsClient: SQSClient,
        private readonly secretsManagerClient: SecretsManagerClient,
    ) {}

    // S3 Operations
    async uploadDocument(bucket: string, key: string, content: string): Promise<void> {
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: content,
                ContentType: "text/plain",
            }),
        );
    }

    async getDocument(bucket: string, key: string): Promise<string> {
        const response = await this.s3Client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );
        return (await response.Body?.transformToString()) || "";
    }

    async listBuckets(): Promise<string[]> {
        const response = await this.s3Client.send(new ListBucketsCommand({}));
        return (response.Buckets || []).map(b => b.Name || "");
    }

    // DynamoDB Operations
    async saveRecord(tableName: string, id: string, name: string): Promise<void> {
        await this.dynamoDbClient.send(
            new PutItemCommand({
                TableName: tableName,
                Item: {
                    id: {S: id},
                    name: {S: name},
                },
            }),
        );
    }

    async getRecord(tableName: string, id: string): Promise<{id: string; name: string} | null> {
        const response = await this.dynamoDbClient.send(
            new GetItemCommand({
                TableName: tableName,
                Key: {
                    id: {S: id},
                },
            }),
        );
        if (!response.Item) return null;
        return {
            id: response.Item["id"]?.S || "",
            name: response.Item["name"]?.S || "",
        };
    }

    async listTables(): Promise<string[]> {
        const response = await this.dynamoDbClient.send(new ListTablesCommand({}));
        return response.TableNames || [];
    }

    // SNS Operations
    async publishNotification(topicArn: string, message: string): Promise<string> {
        const response = await this.snsClient.send(
            new PublishCommand({
                TopicArn: topicArn,
                Message: message,
            }),
        );
        return response.MessageId || "";
    }

    async listTopics(): Promise<string[]> {
        const response = await this.snsClient.send(new ListTopicsCommand({}));
        return (response.Topics || []).map(t => t.TopicArn || "");
    }

    // SQS Operations
    async sendQueueMessage(queueUrl: string, messageBody: string): Promise<string> {
        const response = await this.sqsClient.send(
            new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: messageBody,
            }),
        );
        return response.MessageId || "";
    }

    // Secrets Manager Operations
    async getSecret(secretName: string): Promise<string> {
        const response = await this.secretsManagerClient.send(
            new GetSecretValueCommand({
                SecretId: secretName,
            }),
        );
        return response.SecretString || "";
    }

    async listSecrets(): Promise<string[]> {
        const response = await this.secretsManagerClient.send(new ListSecretsCommand({}));
        return (response.SecretList || []).map(s => s.Name || "");
    }
}
