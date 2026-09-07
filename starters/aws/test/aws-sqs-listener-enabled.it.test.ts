/**
 * Integration test verifying @SqsListener consumes messages and executes handler function.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {SampleSqsListenerService} from "./fixtures/SampleSqsListenerService";
import {createAwsMockServer} from "./fixtures/awsMockServer";
import {SqsListenerAdapter} from "../src/adapter";

const SQS_TEST_PORT = 34976;
process.env["AWS_ENDPOINT_URL"] = `http://127.0.0.1:${SQS_TEST_PORT}`;
process.env["AWS_ENDPOINT_URL_SQS"] = `http://127.0.0.1:${SQS_TEST_PORT}`;
const mockServer = createAwsMockServer(SQS_TEST_PORT);

describe("@nodeboot/starter-aws - SQS listener message consumption", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sqs-listener-enabled-test"},
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

    before(
        () =>
            new Promise<void>(resolve =>
                mockServer.server.listening ? resolve() : mockServer.server.once("listening", resolve),
            ),
    );

    after(async () => {
        SqsListenerAdapter.stopAll();
        delete process.env["AWS_ENDPOINT_URL"];
        delete process.env["AWS_ENDPOINT_URL_SQS"];
        await mockServer?.close();
    });

    test("receives and processes message through @SqsListener decorated handler", async () => {
        const payload = {orderId: "order-456", status: "COMPLETED"};
        const envelope = {
            MessageId: "msg-789",
            Signature: "mock-sig",
            Timestamp: new Date().toISOString(),
            Message: JSON.stringify(payload),
        };

        // Push SQS message in mock server
        mockServer.pushSqsMessage(JSON.stringify(envelope));

        const service = Container.get(SampleSqsListenerService);
        assert.ok(service);

        // Wait up to 3 seconds for sqs-consumer polling cycle to pick up and dispatch message
        const start = Date.now();
        while (service.receivedMessages.length === 0 && Date.now() - start < 3000) {
            await new Promise(r => setTimeout(r, 100));
        }

        assert.ok(service.receivedMessages.length >= 1, "Expected at least 1 received message");
        const received = service.receivedMessages[0];
        assert.equal(received?.messageId, "msg-789");
        assert.deepEqual(received?.message, payload);
    });
});
