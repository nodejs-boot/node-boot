/**
 * Integration test for DynamoDB operations using Node-Boot test framework and mock AWS server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {createAwsMockServer} from "./fixtures/awsMockServer";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {
    CreateTableCommand,
    DynamoDBClient,
    GetItemCommand,
    ListTablesCommand,
    PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const MOCK_PORT = 34972;
process.env["AWS_ENDPOINT_URL"] = `http://127.0.0.1:${MOCK_PORT}`;
process.env["AWS_ENDPOINT_URL_DYNAMODB"] = `http://127.0.0.1:${MOCK_PORT}`;
const mockServer = createAwsMockServer(MOCK_PORT);

describe("@nodeboot/starter-aws - DynamoDB operations integration", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-dynamodb-operations-test"},
            integrations: {
                aws: {
                    credentials: {
                        accessKeyId: "test-key",
                        secretAccessKey: "test-secret",
                    },
                    dynamodb: {region: "us-east-1"},
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
        delete process.env["AWS_ENDPOINT_URL_DYNAMODB"];
        await mockServer?.close();
    });

    test("lists DynamoDB tables using injected DynamoDBClient", async () => {
        const client = Container.get(DynamoDBClient);
        const response = await client.send(new ListTablesCommand({}));

        assert.ok(response.TableNames);
        assert.deepEqual(response.TableNames, ["users", "products"]);
    });

    test("creates table, puts item, and gets item using injected DynamoDBClient", async () => {
        const client = Container.get(DynamoDBClient);
        const tableName = "users";

        const createRes = await client.send(
            new CreateTableCommand({
                TableName: tableName,
                AttributeDefinitions: [{AttributeName: "id", AttributeType: "S"}],
                KeySchema: [{AttributeName: "id", KeyType: "HASH"}],
            }),
        );
        assert.equal(createRes.TableDescription?.TableStatus, "ACTIVE");

        await client.send(
            new PutItemCommand({
                TableName: tableName,
                Item: {
                    id: {S: "user-42"},
                    name: {S: "Alice"},
                },
            }),
        );

        const getRes = await client.send(
            new GetItemCommand({
                TableName: tableName,
                Key: {
                    id: {S: "user-42"},
                },
            }),
        );

        assert.ok(getRes.Item);
        assert.equal(getRes.Item["id"]?.S, "user-42");
        assert.equal(getRes.Item["name"]?.S, "Alice");
    });
});
