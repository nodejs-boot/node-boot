import {describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import {NodeBootEngine} from "../src/core/NodeBootEngine";
import {createFakeDriver} from "./support/fakeDriver";

describe("NodeBootEngine.executeAction", () => {
    it("passes resolved parameters to the action positionally, preserving falsy values", async () => {
        // Regression test for a bug where `executeAction` filtered out falsy parameter values
        // (undefined/null/0/false/""), shifting every parameter after the falsy one into the
        // wrong position. Concretely: `GET /enrollment-failures?corkSlug=ck_blurry` with an
        // optional, absent `status` query param resolves `status` to `undefined`; the filter
        // used to drop it, so `corkSlug`'s value was passed positionally as `status` instead.
        const driver = createFakeDriver({
            getParamFromRequest: mock.fn((_action: any, param: any) =>
                param.name === "corkSlug" ? "ck_blurry" : undefined,
            ),
        });
        const engine = new NodeBootEngine(driver, {});

        const received: any[] = [];
        const actionMetadata: any = {
            params: [
                {type: "query", name: "status"}, // index 0: optional, absent from the request
                {type: "query", name: "corkSlug"}, // index 1: present
            ],
            callMethod: async (params: any[]) => {
                received.push(...params);
                return "ok";
            },
        };
        const action: any = {request: {method: "GET", url: "/enrollment-failures?corkSlug=ck_blurry"}};

        const result = await (engine as any).executeAction(actionMetadata, action, []);

        assert.deepEqual(received, [undefined, "ck_blurry"]);
        assert.equal(result, "ok");
        assert.equal((driver.handleError as any).mock.callCount(), 0);
    });

    it("preserves other falsy values (0, false, empty string) in their original position", async () => {
        const values: Record<string, any> = {a: 0, b: false, c: "", d: "present"};
        const driver = createFakeDriver({
            getParamFromRequest: mock.fn((_action: any, param: any) => values[param.name]),
        });
        const engine = new NodeBootEngine(driver, {});

        const received: any[] = [];
        const actionMetadata: any = {
            params: [
                {type: "query", name: "a"},
                {type: "query", name: "b"},
                {type: "query", name: "c"},
                {type: "query", name: "d"},
            ],
            callMethod: async (params: any[]) => {
                received.push(...params);
            },
        };
        const action: any = {request: {method: "GET", url: "/"}};

        await (engine as any).executeAction(actionMetadata, action, []);

        assert.deepEqual(received, [0, false, "", "present"]);
    });
});
