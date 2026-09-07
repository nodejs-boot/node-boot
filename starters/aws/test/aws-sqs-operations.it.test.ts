/**
 * Integration test for SQS operations using Node-Boot test framework and mock AWS server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {createAwsMockServer} from "./fixtures/awsMockServer";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {
    CreateQueueCommand,
    DeleteMessageCommand,
    ReceiveMessageCommand,
    SendMessageCommand,
    SQSClient,
} from "@aws-sdk/client-sqs";

const MOCK_PORT = 34975;
process.env["AWS_ENDPOINT_URL"] = `http://127.0.0.1:${MOCK_PORT}`;
process.env["AWS_ENDPOINT_URL_SQS"] = `http://127.0.0.1:${MOCK_PORT}`;
const mockServer = createAwsMockServer(MOCK_PORT);

describe("@nodeboot/starter-aws - SQS operations integration", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sqs-operations-test"},
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
        delete process.env["AWS_ENDPOINT_URL"];
        delete process.env["AWS_ENDPOINT_URL_SQS"];
        await mockServer?.close();
    });

    test("creates queue and sends message using injected SQSClient", async () => {
        const client = Container.get(SQSClient);
        const queueRes = await client.send(
            new CreateQueueCommand({
                QueueName: "test-queue",
            }),
        );

        assert.ok(queueRes.QueueUrl);
        const queueUrl = queueRes.QueueUrl;

        const sendRes = await client.send(
            new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify({action: "PROCESS_PAYMENT", amount: 100}),
            }),
        );

        assert.ok(sendRes.MessageId);
        assert.equal(mockServer.state.sentSqsMessages.length, 1);
    });

    test("receives and deletes message from queue using injected SQSClient", async () => {
        const client = Container.get(SQSClient);
        const queueUrl = `${mockServer.endpoint}/123456789012/test-queue`;

        mockServer.pushSqsMessage(JSON.stringify({greeting: "Hello from SQS!"}));

        const receiveRes = await client.send(
            new ReceiveMessageCommand({
                QueueUrl: queueUrl,
            }),
        );

        assert.ok(receiveRes.Messages);
        assert.equal(receiveRes.Messages.length, 1);
        const msg = receiveRes.Messages[0];
        assert.ok(msg);
        assert.ok(msg.Body?.includes("Hello from SQS!"));

        const deleteRes = await client.send(
            new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: msg.ReceiptHandle,
            }),
        );

        assert.ok(deleteRes);
    });
});
