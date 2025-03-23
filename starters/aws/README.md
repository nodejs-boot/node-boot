# NodeBoot AWS Starter - User Documentation

## Introduction

The NodeBoot AWS Starter package provides seamless integration with AWS services using the AWS SDK v3. It enables
dependency injection and auto-configuration for AWS clients such as DynamoDB, S3, Secrets Manager, SNS, and SQS.

## Enabling AWS Services

1. Firs install the AWS Starter package for NodeBoot:

```sh
npm install @nodeboot/starter-aws
```

2. To enable AWS services in a NodeBoot application, use the `@EnableAws` decorator:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/scan";
import {EnableAws} from "@nodeboot/starter-aws";

@EnableDI(Container)
@EnableAws()
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

> By doing this, the NodeBoot autoconfiguration mechanism will setup AWS clients depending on configurations under the
> "integrations.aws" config path. Clients are optional, so if configuration for a client is provided, the system will
> require the installation of the AWS client package in order to setup the integration. If integration is well
> configured,
> the client is created and added to the Dependency Injection container for later injection into services.

## AWS SDK Configuration

AWS SDK configuration can be done through environment variables, configuration files, or explicitly in the application "
app-config.yaml" file.

### Using `app-config.yaml`

The recommended way to provide configurations in Node-Boot is to use the application config file "app-config.yaml" where
you can provide all sort of configs, including environment variables.

```yaml
integrations:
    aws:
        credentials:
            accessKeyId: "${AWS_ACCESS_KEY_ID}"
            secretAccessKey: "${AWS_SECRET_ACCESS_KEY}"
```

### Using Environment Variables

Set the following environment variables to configure AWS SDK authentication:

```sh
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_SESSION_TOKEN=your-session-token # (Optional)
export AWS_REGION=us-east-1
```

### Using Configuration Files

AWS credentials can be stored in `~/.aws/credentials` and the region in `~/.aws/config`.

**`~/.aws/credentials`**:

```
[default]
aws_access_key_id=your-access-key
aws_secret_access_key=your-secret-key
```

**`~/.aws/config`**:

```
[default]
region=us-east-1
```

> For more information regarding AWS SDK configuration options, please refer
> to
> [Setting_AWS_Credentials](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html#Setting_AWS_Credentials)

## AWS Service-Specific Instructions

### DynamoDB

#### Installation

```sh
npm install @aws-sdk/client-dynamodb
```

#### Configuration

Add the AWS region of your DynamoDB to the config path:

```yaml
integrations:
    aws:
        dynamodb:
            region: "eu-central-1"
```

#### Usage

```typescript
@Service()
export class SampleService {
    constructor(private readonly dynamoDBClient: DynamoDBClient) {}

    async listTables(): Promise<void> {
        const command = new ListTablesCommand({});
        const response = await this.dynamoDBClient.send(command);
        console.log("DynamoDB Tables:", response.TableNames);
    }
}
```

### S3

#### Installation

```sh
npm install @aws-sdk/client-s3
```

#### Configuration

Add the AWS region of your S3 bucket to the config path:

```yaml
integrations:
    aws:
        s3:
            region: "eu-central-1"
```

#### Usage

```typescript
@Service()
export class SampleService {
    constructor(private readonly s3Client: S3Client) {}

    async listBuckets(): Promise<void> {
        const command = new ListBucketsCommand({});
        const response = await this.s3Client.send(command);
        console.log("S3 Buckets:", response.Buckets);
    }
}
```

### Secrets Manager

#### Installation

```sh
npm install @aws-sdk/client-secrets-manager
```

#### Configuration

Add the AWS region of your Secrets Manager to the config path:

```yaml
integrations:
    aws:
        secrets:
            region: "eu-central-1"
```

#### Usage

```typescript
@Service()
export class SampleService {
    constructor(private readonly secretsClient: SecretsManagerClient) {}

    async getSecret(secretName: string): Promise<void> {
        const command = new GetSecretValueCommand({SecretId: secretName});
        const response = await this.secretsClient.send(command);
        console.log("Secret Value:", response.SecretString);
    }
}
```

### SNS

#### Installation

```sh
npm install @aws-sdk/client-sns
```

#### Configuration

Add the AWS region of your SNS topic to the config path:

```yaml
integrations:
    aws:
        sns:
            region: "eu-central-1"
```

#### Usage

```typescript
@Service()
export class SampleService {
    constructor(private readonly snsClient: SNSClient) {}

    async publishMessage(topicArn: string, message: string): Promise<void> {
        const command = new PublishCommand({TopicArn: topicArn, Message: message});
        await this.snsClient.send(command);
        console.log("Message sent to SNS");
    }
}
```

### SQS

#### Installation

```sh
npm install @aws-sdk/client-sqs
```

#### Configuration

Add the AWS region of your SQS queue to the config path:

```yaml
integrations:
    aws:
        sqs:
            region: "eu-central-1"
```

#### Usage

```typescript
@Service()
export class SampleService {
    constructor(readonly sqsClient: SQSClient) {}

    async sendMessage(queueUrl: string, messageBody: string): Promise<void> {
        const command = new SendMessageCommand({QueueUrl: queueUrl, MessageBody: messageBody});
        await this.sqsClient.send(command);
        console.log("Message sent to SQS");
    }
}
```

#### Usage with @SqsListener

```typescript
import {SqsListener} from "@nodeboot/starter-aws";

@Service()
export class SampleService {
    // Using SQS Queue URL hardcoded
    @SqsListener("https://sqs.us-east-1.amazonaws.com/123456789012/my-queue")
    async onMessage(message: any): Promise<void> {
        console.log("Message received from SQS");
    }
}

@Component()
export class SampleComponent {
    // Using SQS queue url with a config placeholder
    @SqsListener("${com.example.aws.sqs.queue-url}")
    async onMessage(message: any): Promise<void> {
        console.log("Message received from SQS");
    }
}
```

In this last case you need provide the config path in your `app-config.yaml` file:

```yaml
com:
    example:
        aws:
            sqs:
                queue-url: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"
```

#### SQS Message Handling

-   The queue is polled continuously for messages using [long polling](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-long-polling.html).
-   Throwing an error (or returning a rejected promise) from the handler function will cause the message to be left on the queue. An [SQS redrive policy](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/SQSDeadLetterQueue.html) can be used to move messages that cannot be processed to a dead letter queue.
-   By default messages are processed one at a time – a new message won't be received until the first one has been processed. To process messages in parallel, use the batchSize option [detailed here](https://bbc.github.io/sqs-consumer/interfaces/ConsumerOptions.html#batchSize).
    -   It's also important to await any processing that you are doing to ensure that messages are processed one at a time.
-   By default, messages that are sent to the handleMessage and handleMessageBatch functions will be considered as processed if they return without an error.
    -   To acknowledge individual messages, please return the message that you want to acknowledge if you are using handleMessage or the messages for handleMessageBatch.
        -   To note, returning an empty object or an empty array will be considered an acknowledgement of no message(s) and will result in no messages being deleted. If you would like to change this behaviour, please use the alwaysAcknowledge option [detailed here](https://bbc.github.io/sqs-consumer/interfaces/ConsumerOptions.html).
        -   By default, if an object or an array is not returned, all messages will be acknowledged.
-   Messages are deleted from the queue once the handler function has completed successfully (the above items should also be taken into account).

## Conclusion

NodeBoot AWS Starter simplifies AWS client integration using dependency injection and dynamic configuration.

For further information, refer to the official AWS SDK
documentation: [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/).
