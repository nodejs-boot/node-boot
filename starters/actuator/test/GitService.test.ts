import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {GitService} from "../src/service/GitService";

describe("GitService", () => {
    test("handles non-existent git.properties gracefully", async () => {
        const service = new GitService();
        const simpleGit = await service.getGit("simple");
        assert.equal(simpleGit, undefined);

        const fullGit = await service.getGit("full");
        assert.equal(fullGit, undefined);
    });
});
