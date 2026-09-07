/**
 * Auto-configuration integration test for `@nodeboot/starter-aws` - negative case.
 *
 * Same `AwsEnabledApp` fixture (still applies `@EnableAws()`), but boots without any
 * `integrations.aws.s3` config - `S3ClientConfiguration`'s `@Configuration({onConfig:
 * "integrations.aws.s3.region"})` gate should skip binding entirely rather than fail.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {S3Client} from "@aws-sdk/client-s3";
import {useNodeBoot} from "@nodeboot/node-test";
import {ApplicationContext} from "@nodeboot/context";
import {AwsEnabledApp} from "./fixtures/AwsEnabledApp";
import {AWS_S3_FEATURE} from "../src/types";

describe("@nodeboot/starter-aws auto-configuration - integrations.aws.s3 not configured", () => {
    useNodeBoot(AwsEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-aws-s3-disabled-test"}});
    });

    test("never registers an S3Client in the IoC container", () => {
        assert.equal(Container.has(S3Client), false);
        assert.equal(ApplicationContext.get().applicationFeatures[AWS_S3_FEATURE], undefined);
    });
});
