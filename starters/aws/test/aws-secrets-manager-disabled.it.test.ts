/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` Secrets Manager - negative case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SecretsManagerClient} from "@aws-sdk/client-secrets-manager";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_SECRETS_MANAGER_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.secrets not configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-aws-secrets-disabled-test"}});
    });

    test("never registers a SecretsManagerClient in the IoC container", () => {
        assert.equal(Container.has(SecretsManagerClient), false);
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_SECRETS_MANAGER_FEATURE], undefined);
    });
});
