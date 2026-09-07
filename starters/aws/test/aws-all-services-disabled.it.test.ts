/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` - all services disabled.
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

describe("@nodeboot/starter-aws auto-configuration - all services disabled", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-all-services-disabled-test"},
            integrations: {
                aws: {},
            },
        });
    });

    test("registers no AWS clients in IoC container and enables no feature flags", () => {
        assert.equal(Container.has(S3Client), false);
        assert.equal(Container.has(DynamoDBClient), false);
        assert.equal(Container.has(SNSClient), false);
        assert.equal(Container.has(SQSClient), false);
        assert.equal(Container.has(SecretsManagerClient), false);

        const features = ApplicationContext.get().applicationFeatures;
        assert.equal(features[AWS_S3_FEATURE], undefined);
        assert.equal(features[AWS_DYNAMODB_FEATURE], undefined);
        assert.equal(features[AWS_SNS_FEATURE], undefined);
        assert.equal(features[AWS_SQS_FEATURE], undefined);
        assert.equal(features[AWS_SECRETS_MANAGER_FEATURE], undefined);
    });
});
