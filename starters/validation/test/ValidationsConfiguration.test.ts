import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext, BEAN_METADATA_KEY} from "@nodeboot/context";
import {ValidationsConfiguration} from "../src/config";

function makeLogger() {
    return {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        child: mock.fn(),
    };
}

describe("ValidationsConfiguration", () => {
    let originalValidation: any;

    beforeEach(() => {
        originalValidation = ApplicationContext.get().validation;
    });

    afterEach(() => {
        ApplicationContext.get().validation = originalValidation;
    });

    describe("validationConfig()", () => {
        it("applies the validator options found under 'api.validations'", () => {
            const validatorOptions = {whitelist: true, forbidNonWhitelisted: true};
            const logger = makeLogger();
            const config = {getOptional: mock.fn(() => validatorOptions)} as any;

            new ValidationsConfiguration().validationConfig({logger, config} as any);

            assert.equal(config.getOptional.mock.callCount(), 1);
            assert.equal(config.getOptional.mock.calls[0].arguments[0], "api.validations");
            assert.deepEqual(ApplicationContext.get().validation, validatorOptions);
            assert.equal(logger.info.mock.callCount(), 2);
        });

        it("defaults to `true` when no 'api.validations' config is present", () => {
            const logger = makeLogger();
            const config = {getOptional: mock.fn(() => undefined)} as any;

            new ValidationsConfiguration().validationConfig({logger, config} as any);

            assert.equal(ApplicationContext.get().validation, true);
            assert.equal(logger.info.mock.callCount(), 2);
        });
    });

    describe("@Bean metadata", () => {
        it("marks validationConfig() as a discoverable bean factory method", () => {
            const isBean = Reflect.getMetadata(
                BEAN_METADATA_KEY,
                ValidationsConfiguration.prototype,
                "validationConfig",
            );
            assert.equal(isBean, true);
        });
    });
});
