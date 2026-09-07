/**
 * Negative test verifying SQS listener behavior when SQS feature is disabled.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {SampleSqsListenerService} from "./fixtures/SampleSqsListenerService";
import {AWS_SQS_FEATURE} from "../src/types";
import {ApplicationContext} from "@nodeboot/context";

describe("@nodeboot/starter-aws - SQS listener with SQS disabled", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-sqs-listener-disabled-test"},
        });
    });

    test("handles @SqsListener gracefully when AWS SQS is disabled", async () => {
        // App starts without error even with @SqsListener registered
        assert.equal((ApplicationContext.get().applicationFeatures as any)[AWS_SQS_FEATURE], undefined);

        const service = Container.get(SampleSqsListenerService);
        assert.ok(service);
        assert.equal(service.receivedMessages.length, 0);
    });
});
