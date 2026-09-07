/**
 * Test verifying @SqsListener respect @Profile filtering.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {ProfiledProdSqsListenerService} from "./fixtures/ProfiledProdSqsListenerService";
import {SQSClient} from "@aws-sdk/client-sqs";

describe("@nodeboot/starter-aws - SQS listener profile filtering", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig, useEnv}) => {
        useEnv({
            NODE_BOOT_ACTIVE_PROFILES: "dev,test",
        });
        useConfig({
            app: {name: "starter-aws-sqs-listener-profile-test"},
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

    test("skips registering @SqsListener when active profile does not match @Profile metadata", async () => {
        const sqsClient = Container.get(SQSClient);
        assert.ok(sqsClient);

        const service = Container.get(ProfiledProdSqsListenerService);
        assert.ok(service);
        assert.equal(service.receivedMessages.length, 0);
    });
});
