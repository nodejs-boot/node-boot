/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` - positive case.
 *
 * `@EnableAws()` wires up conditional `@Configuration({onConfig: "integrations.aws.<service>..."})`
 * classes for S3/DynamoDB/SQS/SNS/SecretsManager; each only binds its client bean if its own config
 * path exists. This test proves the S3 one actually registers a real, working `S3Client` in the DI
 * container - see `aws-s3-disabled.it.test.ts` for the negative counterpart (config absent).
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {S3Client} from "@aws-sdk/client-s3";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_S3_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.s3 configured", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-s3-enabled-test"},
            integrations: {aws: {s3: {region: "eu-west-1"}}},
        });
    });

    test("registers a real S3Client configured with the region from app-config", async () => {
        // `@nodeboot/node-test`'s own `useService()` resolves against a different (published)
        // `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired the client into.
        const client = Container.get(S3Client);

        assert.ok(client instanceof S3Client);
        // AWS SDK v3 clients store `region` as an async provider function, not a plain string.
        assert.equal(await client.config.region(), "eu-west-1");
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_S3_FEATURE], true);
    });
});
