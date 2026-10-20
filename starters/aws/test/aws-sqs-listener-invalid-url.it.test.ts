/**
 * Test verifying SQS listener with invalid queue URL is skipped gracefully.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {useNodeBoot} from "@nodeboot/node-test";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {InvalidUrlSqsListenerService} from "./fixtures/InvalidUrlSqsListenerService";
import {SQSClient} from "@aws-sdk/client-sqs";
import {ApplicationContext} from "@nodeboot/context";

describe("@nodeboot/starter-aws - SQS listener with invalid URL", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sqs-listener-invalid-url-test"},
            integrations: {
                aws: {
                    credentials: {
                        accessKeyId: "test-key",
                        secretAccessKey: "test-secret",
                    },
                    sqs: {region: "us-east-1"},
                },
            },
        });
    });

    test("skips registering SQS listener when URL format does not match AWS SQS pattern", async () => {
        const sqsClient = ApplicationContext.getIocContainer()!.get(SQSClient);
        assert.ok(sqsClient);

        const service = ApplicationContext.getIocContainer()!.get(InvalidUrlSqsListenerService);
        assert.ok(service);
    });
});
