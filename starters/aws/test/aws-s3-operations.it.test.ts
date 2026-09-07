/**
 * Integration test for S3 operations using Node-Boot test framework and mock AWS server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {createAwsMockServer} from "./fixtures/awsMockServer";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand} from "@aws-sdk/client-s3";

const MOCK_PORT = 34971;
process.env["AWS_ENDPOINT_URL"] = `http://127.0.0.1:${MOCK_PORT}`;
process.env["AWS_ENDPOINT_URL_S3"] = `http://127.0.0.1:${MOCK_PORT}`;
const mockServer = createAwsMockServer(MOCK_PORT);

describe("@nodeboot/starter-aws - S3 operations integration", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-s3-operations-test"},
            integrations: {
                aws: {
                    credentials: {
                        accessKeyId: "test-key",
                        secretAccessKey: "test-secret",
                    },
                    s3: {region: "us-east-1"},
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
        delete process.env["AWS_ENDPOINT_URL_S3"];
        await mockServer?.close();
    });

    test("lists S3 buckets using injected S3Client", async () => {
        const client = Container.get(S3Client);
        const response = await client.send(new ListBucketsCommand({}));

        assert.ok(response.Buckets);
        assert.equal(response.Buckets.length, 1);
        assert.equal(response.Buckets[0]?.Name, "test-bucket");
    });

    test("puts and gets an object in S3 using injected S3Client", async () => {
        const client = Container.get(S3Client);
        const bucket = "test-bucket";
        const key = "documents/sample.txt";
        const content = "Hello Node-Boot S3 Integration!";

        await client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: content,
                ContentType: "text/plain",
            }),
        );

        const getResponse = await client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );

        const bodyString = await getResponse.Body?.transformToString();
        assert.equal(bodyString, content);
    });
});
