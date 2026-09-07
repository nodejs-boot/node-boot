/**
 * Integration test for SNS operations using Node-Boot test framework and mock AWS server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {createAwsMockServer} from "./fixtures/awsMockServer";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {CreateTopicCommand, ListTopicsCommand, PublishCommand, SNSClient} from "@aws-sdk/client-sns";

const MOCK_PORT = 34973;
process.env["AWS_ENDPOINT_URL"] = `http://127.0.0.1:${MOCK_PORT}`;
process.env["AWS_ENDPOINT_URL_SNS"] = `http://127.0.0.1:${MOCK_PORT}`;
const mockServer = createAwsMockServer(MOCK_PORT);

describe("@nodeboot/starter-aws - SNS operations integration", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sns-operations-test"},
            integrations: {
                aws: {
                    credentials: {
                        accessKeyId: "test-key",
                        secretAccessKey: "test-secret",
                    },
                    sns: {region: "us-east-1"},
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
        delete process.env["AWS_ENDPOINT_URL_SNS"];
        await mockServer?.close();
    });

    test("creates topic and lists topics using injected SNSClient", async () => {
        const client = Container.get(SNSClient);
        const createRes = await client.send(
            new CreateTopicCommand({
                Name: "test-topic",
            }),
        );

        assert.ok(createRes.TopicArn);
        assert.equal(createRes.TopicArn, "arn:aws:sns:eu-central-1:123456789012:test-topic");

        const listRes = await client.send(new ListTopicsCommand({}));
        assert.ok(listRes.Topics);
        assert.ok(listRes.Topics.length > 0);
    });

    test("publishes message to SNS topic using injected SNSClient", async () => {
        const client = Container.get(SNSClient);
        const topicArn = "arn:aws:sns:eu-central-1:123456789012:test-topic";
        const message = JSON.stringify({event: "ORDER_CREATED", orderId: "12345"});

        const publishRes = await client.send(
            new PublishCommand({
                TopicArn: topicArn,
                Message: message,
            }),
        );

        assert.ok(publishRes.MessageId);
        assert.equal(mockServer.state.publishedSnsMessages.length, 1);
        assert.equal(mockServer.state.publishedSnsMessages[0]?.message, message);
    });
});
