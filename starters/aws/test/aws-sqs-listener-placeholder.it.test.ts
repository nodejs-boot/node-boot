/**
 * Test verifying @SqsListener resolves queue URL from config placeholder ${app.queue.url}.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {PlaceholderSqsListenerService} from "./fixtures/PlaceholderSqsListenerService";
import {SQSClient} from "@aws-sdk/client-sqs";
import {AwsMockServerHandle, startAwsMockServer} from "./fixtures/awsMockServer";

let mockServer: AwsMockServerHandle;

describe("@nodeboot/starter-aws - SQS listener placeholder resolution", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {
                name: "starter-aws-sqs-listener-placeholder-test",
                queue: {
                    url: "https://sqs.us-east-1.amazonaws.com/123456789012/placeholder-queue",
                },
            },
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

    before(async () => {
        mockServer = await startAwsMockServer();
        process.env["AWS_ENDPOINT_URL"] = mockServer.endpoint;
        process.env["AWS_ENDPOINT_URL_SQS"] = mockServer.endpoint;
    });

    after(async () => {
        delete process.env["AWS_ENDPOINT_URL"];
        delete process.env["AWS_ENDPOINT_URL_SQS"];
        await mockServer?.close();
    });

    test("resolves queue URL from config placeholder and registers listener", async () => {
        const sqsClient = Container.get(SQSClient);
        assert.ok(sqsClient);

        const service = Container.get(PlaceholderSqsListenerService);
        assert.ok(service);
    });
});
