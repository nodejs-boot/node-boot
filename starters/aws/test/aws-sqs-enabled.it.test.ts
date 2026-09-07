/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` SQS - positive case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SQSClient} from "@aws-sdk/client-sqs";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_SQS_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.sqs configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sqs-enabled-test"},
            integrations: {aws: {sqs: {region: "sa-east-1"}}},
        });
    });

    test("registers a real SQSClient configured with the region from app-config", async () => {
        const client = Container.get(SQSClient);

        assert.ok(client instanceof SQSClient);
        assert.equal(await client.config.region(), "sa-east-1");
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_SQS_FEATURE], true);
    });
});
