import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext, ConfigurationAdapter} from "@nodeboot/context";
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

function makeIocContainer() {
    return {get: mock.fn(), set: mock.fn(), has: mock.fn(), reset: mock.fn()};
}

/**
 * `@Configuration()` on `ValidationsConfiguration` runs as a side effect of the class being
 * imported, pushing a `BeansConfigurationAdapter` for it into the process-wide
 * `ApplicationContext.configurationAdapters` list. This is how the real Node-Boot bootstrap
 * discovers it -- there is no manual registration step for application developers to call.
 */
function findRegisteredAdapter(): ConfigurationAdapter {
    const adapter = ApplicationContext.get().configurationAdapters.find(
        candidate => (candidate as any).target === ValidationsConfiguration,
    );
    assert.ok(
        adapter,
        "expected @Configuration() to have auto-registered a BeansConfigurationAdapter for ValidationsConfiguration",
    );
    return adapter as ConfigurationAdapter;
}

describe("ValidationsConfiguration auto-configuration", () => {
    let originalValidation: any;
    let originalActiveProfiles: string | undefined;

    beforeEach(() => {
        originalValidation = ApplicationContext.get().validation;
        originalActiveProfiles = process.env["NODE_BOOT_ACTIVE_PROFILES"];
    });

    afterEach(() => {
        ApplicationContext.get().validation = originalValidation;
        if (originalActiveProfiles === undefined) {
            delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
        } else {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = originalActiveProfiles;
        }
    });

    it("is auto-registered as a configuration adapter just by being imported, with no manual wiring", () => {
        findRegisteredAdapter();
    });

    it("drives ApplicationContext.validation end-to-end when the auto-registered adapter is bound", async () => {
        const adapter = findRegisteredAdapter();
        const validatorOptions = {whitelist: true, forbidNonWhitelisted: true};
        const config = {getOptional: () => validatorOptions, has: () => true} as any;

        await adapter.bind({logger: makeLogger() as any, config, iocContainer: makeIocContainer() as any} as any);

        assert.deepEqual(ApplicationContext.get().validation, validatorOptions);
    });

    it("falls back to `true` end-to-end when no 'api.validations' config is present", async () => {
        const adapter = findRegisteredAdapter();
        const config = {getOptional: () => undefined, has: () => true} as any;

        await adapter.bind({logger: makeLogger() as any, config, iocContainer: makeIocContainer() as any} as any);

        assert.equal(ApplicationContext.get().validation, true);
    });

    it("still auto-configures under any active profile, since it declares no @Profile restriction", async () => {
        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "some-unrelated-profile";

        const adapter = findRegisteredAdapter();
        const validatorOptions = {stopAtFirstError: true};
        const config = {getOptional: () => validatorOptions, has: () => true} as any;

        await adapter.bind({logger: makeLogger() as any, config, iocContainer: makeIocContainer() as any} as any);

        assert.deepEqual(ApplicationContext.get().validation, validatorOptions);
    });
});
