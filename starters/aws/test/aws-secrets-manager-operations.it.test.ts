/**
 * Integration test for Secrets Manager operations using Node-Boot test framework and mock AWS server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {createAwsMockServer} from "./fixtures/awsMockServer";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {
    CreateSecretCommand,
    GetSecretValueCommand,
    ListSecretsCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const MOCK_PORT = 34974;
process.env["AWS_ENDPOINT_URL"] = `http://127.0.0.1:${MOCK_PORT}`;
process.env["AWS_ENDPOINT_URL_SECRETS_MANAGER"] = `http://127.0.0.1:${MOCK_PORT}`;
const mockServer = createAwsMockServer(MOCK_PORT);

describe("@nodeboot/starter-aws - Secrets Manager operations integration", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-secrets-operations-test"},
            integrations: {
                aws: {
                    credentials: {
                        accessKeyId: "test-key",
                        secretAccessKey: "test-secret",
                    },
                    secrets: {region: "us-east-1"},
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
        delete process.env["AWS_ENDPOINT_URL_SECRETS_MANAGER"];
        await mockServer?.close();
    });

    test("gets secret value using injected SecretsManagerClient", async () => {
        const client = Container.get(SecretsManagerClient);
        const secretRes = await client.send(
            new GetSecretValueCommand({
                SecretId: "test-secret",
            }),
        );

        assert.ok(secretRes.SecretString);
        const parsed = JSON.parse(secretRes.SecretString);
        assert.equal(parsed.apiKey, "super-secret-key");
    });

    test("creates secret and lists secrets using injected SecretsManagerClient", async () => {
        const client = Container.get(SecretsManagerClient);
        const secretName = "db-password";
        const secretValue = "p@ssw0rd123";

        const createRes = await client.send(
            new CreateSecretCommand({
                Name: secretName,
                SecretString: secretValue,
            }),
        );

        assert.ok(createRes.ARN);
        assert.equal(createRes.Name, secretName);

        const listRes = await client.send(new ListSecretsCommand({}));
        assert.ok(listRes.SecretList);
        const found = listRes.SecretList.find(s => s.Name === secretName);
        assert.ok(found);
    });
});
