/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` - explicit credentials.
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
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";

describe("@nodeboot/starter-aws auto-configuration - explicit credentials configured", () => {
    const accessKeyId = "AKIAIOSFODNN7EXAMPLE";
    const secretAccessKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-credentials-test"},
            integrations: {
                aws: {
                    credentials: {
                        accessKeyId,
                        secretAccessKey,
                    },
                    s3: {region: "us-east-1"},
                    dynamodb: {region: "us-east-1"},
                    sns: {region: "us-east-1"},
                    sqs: {region: "us-east-1"},
                    secrets: {region: "us-east-1"},
                },
            },
        });
    });

    test("wires explicit credentials into all configured AWS clients", async () => {
        const s3 = Container.get(S3Client);
        const dynamo = Container.get(DynamoDBClient);
        const sns = Container.get(SNSClient);
        const sqs = Container.get(SQSClient);
        const secrets = Container.get(SecretsManagerClient);

        const s3Creds = await s3.config.credentials();
        assert.equal(s3Creds.accessKeyId, accessKeyId);
        assert.equal(s3Creds.secretAccessKey, secretAccessKey);

        const dynamoCreds = await dynamo.config.credentials();
        assert.equal(dynamoCreds.accessKeyId, accessKeyId);
        assert.equal(dynamoCreds.secretAccessKey, secretAccessKey);

        const snsCreds = await sns.config.credentials();
        assert.equal(snsCreds.accessKeyId, accessKeyId);
        assert.equal(snsCreds.secretAccessKey, secretAccessKey);

        const sqsCreds = await sqs.config.credentials();
        assert.equal(sqsCreds.accessKeyId, accessKeyId);
        assert.equal(sqsCreds.secretAccessKey, secretAccessKey);

        const secretsCreds = await secrets.config.credentials();
        assert.equal(secretsCreds.accessKeyId, accessKeyId);
        assert.equal(secretsCreds.secretAccessKey, secretAccessKey);
    });
});
