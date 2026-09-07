/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` SNS - negative case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SNSClient} from "@aws-sdk/client-sns";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_SNS_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.sns not configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-aws-sns-disabled-test"}});
    });

    test("never registers an SNSClient in the IoC container", () => {
        assert.equal(Container.has(SNSClient), false);
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_SNS_FEATURE], undefined);
    });
});
