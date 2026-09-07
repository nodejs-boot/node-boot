/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` DynamoDB - positive case.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_DYNAMODB_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.dynamodb configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-aws-dynamodb-enabled-test"},
            integrations: {aws: {dynamodb: {region: "us-east-2"}}},
        });
    });

    test("registers a real DynamoDBClient configured with the region from app-config", async () => {
        const client = Container.get(DynamoDBClient);

        assert.ok(client instanceof DynamoDBClient);
        assert.equal(await client.config.region(), "us-east-2");
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_DYNAMODB_FEATURE], true);
    });
});
