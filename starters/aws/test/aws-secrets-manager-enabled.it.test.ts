/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` Secrets Manager - positive case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SecretsManagerClient} from "@aws-sdk/client-secrets-manager";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_SECRETS_MANAGER_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.secrets configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-secrets-enabled-test"},
            integrations: {aws: {secrets: {region: "ap-southeast-1"}}},
        });
    });

    test("registers a real SecretsManagerClient configured with the region from app-config", async () => {
        const client = Container.get(SecretsManagerClient);

        assert.ok(client instanceof SecretsManagerClient);
        assert.equal(await client.config.region(), "ap-southeast-1");
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_SECRETS_MANAGER_FEATURE], true);
    });
});
