import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {isValidUrl} from "../src/service/config";

// `loadNodeBootConfig` itself is I/O glue (filesystem discovery via
// `@backstage/config-loader`, `findPaths(__dirname)`, remote config, file
// watchers, etc.) and isn't exercised here: faking that out would mean
// mocking most of `@backstage/config-loader` and would mostly test the mock,
// not this package's logic. `isValidUrl` is the one pure, deterministic
// helper in that module, so it gets direct coverage.
describe("isValidUrl", () => {
    it("returns true for well-formed absolute URLs", () => {
        assert.equal(isValidUrl("https://example.com"), true);
        assert.equal(isValidUrl("http://localhost:3000/app-config.yaml"), true);
        assert.equal(isValidUrl("file:///etc/app-config.yaml"), true);
    });

    it("returns false for plain file paths and other invalid input", () => {
        assert.equal(isValidUrl("./app-config.yaml"), false);
        assert.equal(isValidUrl("app-config.yaml"), false);
        assert.equal(isValidUrl(""), false);
        assert.equal(isValidUrl("not a url"), false);
    });
});
