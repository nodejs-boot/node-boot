import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {Profile} from "@nodeboot/context";
import {decorateDi} from "../src/ioc/makeDiDecoration";

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
    it("returns true and applies the real @Service (typedi) decoration when no active profiles are configured", () => {
        class AllowedService {}

        const result = decorateDi(AllowedService);

        assert.equal(result, true);
        // Verify the actual effect: typedi's Container now knows about this class.
        assert.equal(Container.has(AllowedService), true);
    });

    it("registers the target under a custom string id when DiOptions is a string", () => {
        class NamedService {}

        const result = decorateDi(NamedService, "my-named-service");

        assert.equal(result, true);
        assert.equal(Container.has("my-named-service"), true);
    });

    it("registers the target using ServiceOptions (e.g. {id})", () => {
        class OptionsService {}

        const result = decorateDi(OptionsService, {id: "options-service-id"});

        assert.equal(result, true);
        assert.equal(Container.has("options-service-id"), true);
    });

    it("returns false when the target's required profile does not match any active profile", () => {
        @Profile(["special-profile"])
        class RestrictedService {}

        const result = withActiveProfiles("unrelated-profile", () => decorateDi(RestrictedService));

        assert.equal(result, false);
        // Since allowedProfiles() short-circuited, typedi must never have registered it.
        assert.equal(Container.has(RestrictedService), false);
    });

    it("returns true and decorates when the active profile matches the target's required profile", () => {
        @Profile(["matching-profile"])
        class MatchedService {}

        const result = withActiveProfiles("matching-profile", () => decorateDi(MatchedService));

        assert.equal(result, true);
        assert.equal(Container.has(MatchedService), true);
    });

    it("allows classes with no @Profile metadata even when active profiles are configured", () => {
        class UnrestrictedService {}

        const result = withActiveProfiles("some-active-profile", () => decorateDi(UnrestrictedService));

        assert.equal(result, true);
        assert.equal(Container.has(UnrestrictedService), true);
    });
});
