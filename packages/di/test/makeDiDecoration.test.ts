import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Injector} from "@nonnajs/di";
import {Profile} from "@nodeboot/context";
import {decorateDi} from "../src/ioc/makeDiDecoration";
import {createDefaultDiOptions} from "../src/ioc/defaultContainer";

/**
 * Runs `fn` with NODE_BOOT_ACTIVE_PROFILES set to `value`, restoring the previous
 * value afterwards regardless of success/failure.
 */
function withActiveProfiles<T>(value: string, fn: () => T): T {
    const previous = process.env["NODE_BOOT_ACTIVE_PROFILES"];
    process.env["NODE_BOOT_ACTIVE_PROFILES"] = value;
    try {
        return fn();
    } finally {
        if (previous === undefined) {
            delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
        } else {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = previous;
        }
    }
}

describe("decorateDi", () => {
    it("returns true and registers the class with Nonna when no active profiles are configured", () => {
        class AllowedService {}

        const result = decorateDi(AllowedService);

        assert.equal(result, true);
        const injector = Injector.create();
        injector.refresh();
        assert.ok(injector.get(AllowedService) instanceof AllowedService);
    });

    it("returns false when the target's required profile does not match any active profile", () => {
        @Profile(["special-profile"])
        class RestrictedService {}

        const result = withActiveProfiles("unrelated-profile", () => decorateDi(RestrictedService));

        assert.equal(result, false);
        // Since allowedProfiles() short-circuited, nothing must have been registered.
        const injector = Injector.create();
        injector.refresh();
        assert.throws(() => injector.get(RestrictedService));
    });

    it("returns true and decorates when the active profile matches the target's required profile", () => {
        @Profile(["matching-profile"])
        class MatchedService {}

        const result = withActiveProfiles("matching-profile", () => decorateDi(MatchedService));

        assert.equal(result, true);
        const injector = Injector.create();
        injector.refresh();
        assert.ok(injector.get(MatchedService) instanceof MatchedService);
    });

    it("allows classes with no @Profile metadata even when active profiles are configured", () => {
        class UnrestrictedService {}

        const result = withActiveProfiles("some-active-profile", () => decorateDi(UnrestrictedService));

        assert.equal(result, true);
        const injector = Injector.create();
        injector.refresh();
        assert.ok(injector.get(UnrestrictedService) instanceof UnrestrictedService);
    });

    describe("Nonna registration", () => {
        it("also registers the class into Nonna's global registry, resolvable via a fresh Injector", () => {
            class NonnaAllowedService {}

            decorateDi(NonnaAllowedService);

            const injector = Injector.create();
            injector.refresh();
            assert.ok(injector.get(NonnaAllowedService) instanceof NonnaAllowedService);
        });

        it("resolves a string id as a Nonna alias for the same class instance", () => {
            class NonnaNamedService {}

            decorateDi(NonnaNamedService, "nonna-named-service");

            const {iocContainer} = createDefaultDiOptions();
            const byAlias = iocContainer.get<NonnaNamedService>("nonna-named-service");
            const byClass = iocContainer.get(NonnaNamedService);
            assert.ok(byAlias instanceof NonnaNamedService);
            assert.equal(byAlias, byClass);
        });

        it("resolves a ComponentOptions.id as a Nonna alias for the same class instance", () => {
            class NonnaOptionsService {}

            decorateDi(NonnaOptionsService, {id: "nonna-options-service-id"});

            const {iocContainer} = createDefaultDiOptions();
            const byAlias = iocContainer.get<NonnaOptionsService>("nonna-options-service-id");
            assert.ok(byAlias instanceof NonnaOptionsService);
        });

        it("does not register with Nonna when the target's required profile does not match any active profile", () => {
            @Profile(["special-profile"])
            class NonnaRestrictedService {}

            withActiveProfiles("unrelated-profile", () => decorateDi(NonnaRestrictedService));

            const injector = Injector.create();
            injector.refresh();
            assert.throws(() => injector.get(NonnaRestrictedService));
        });
    });
});
