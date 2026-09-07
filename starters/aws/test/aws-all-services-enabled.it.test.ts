/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` - all services enabled.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {S3Client} from "@aws-sdk/client-s3";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {SNSClient} from "@aws-sdk/client-sns";
import {SQSClient} from "@aws-sdk/client-sqs";
import {SecretsManagerClient} from "@aws-sdk/client-secrets-manager";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {
    AWS_DYNAMODB_FEATURE,
    AWS_S3_FEATURE,
    AWS_SECRETS_MANAGER_FEATURE,
    AWS_SNS_FEATURE,
    AWS_SQS_FEATURE,
} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - all services enabled", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-all-services-enabled-test"},
            integrations: {
                aws: {
                    s3: {region: "eu-west-1"},
                    dynamodb: {region: "us-east-1"},
                    sns: {region: "ap-northeast-1"},
                    sqs: {region: "sa-east-1"},
                    secrets: {region: "ca-central-1"},
                },
            },
        });
    });

    test("registers all 5 AWS clients in the IoC container and enables all feature flags", async () => {
        const s3 = Container.get(S3Client);
        const dynamo = Container.get(DynamoDBClient);
        const sns = Container.get(SNSClient);
        const sqs = Container.get(SQSClient);
        const secrets = Container.get(SecretsManagerClient);

        assert.ok(s3 instanceof S3Client);
        assert.ok(dynamo instanceof DynamoDBClient);
        assert.ok(sns instanceof SNSClient);
        assert.ok(sqs instanceof SQSClient);
        assert.ok(secrets instanceof SecretsManagerClient);

        assert.equal(await s3.config.region(), "eu-west-1");
        assert.equal(await dynamo.config.region(), "us-east-1");
        assert.equal(await sns.config.region(), "ap-northeast-1");
        assert.equal(await sqs.config.region(), "sa-east-1");
        assert.equal(await secrets.config.region(), "ca-central-1");

        const features = ApplicationContext.get().applicationFeatures;
        assert.equal(features[AWS_S3_FEATURE], true);
        assert.equal(features[AWS_DYNAMODB_FEATURE], true);
        assert.equal(features[AWS_SNS_FEATURE], true);
        assert.equal(features[AWS_SQS_FEATURE], true);
        assert.equal(features[AWS_SECRETS_MANAGER_FEATURE], true);
    });
});
