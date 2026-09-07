/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` SNS - positive case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SNSClient} from "@aws-sdk/client-sns";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_SNS_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.sns configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sns-enabled-test"},
            integrations: {aws: {sns: {region: "ca-central-1"}}},
        });
    });

    test("registers a real SNSClient configured with the region from app-config", async () => {
        const client = Container.get(SNSClient);

        assert.ok(client instanceof SNSClient);
        assert.equal(await client.config.region(), "ca-central-1");
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_SNS_FEATURE], true);
    });
});
