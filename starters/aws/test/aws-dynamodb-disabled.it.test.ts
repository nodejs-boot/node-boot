/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` DynamoDB - negative case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_DYNAMODB_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.dynamodb not configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-aws-dynamodb-disabled-test"}});
    });

    test("never registers a DynamoDBClient in the IoC container", () => {
        assert.equal(Container.has(DynamoDBClient), false);
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_DYNAMODB_FEATURE], undefined);
    });
});
