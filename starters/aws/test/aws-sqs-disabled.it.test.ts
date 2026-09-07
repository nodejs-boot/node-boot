/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` SQS - negative case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SQSClient} from "@aws-sdk/client-sqs";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_SQS_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.sqs not configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-aws-sqs-disabled-test"}});
    });

    test("never registers an SQSClient in the IoC container", () => {
        assert.equal(Container.has(SQSClient), false);
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_SQS_FEATURE], undefined);
    });
});
