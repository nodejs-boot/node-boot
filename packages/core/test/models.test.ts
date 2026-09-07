import "reflect-metadata";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {validate} from "class-validator";
import {CursorPage, CursorRequest, Page, PagingRequest, SortOrder} from "../src/models/PagingAndSorting";
import {emptyPage} from "../src/models/utils";

describe("models/PagingAndSorting", () => {
    describe("PagingRequest", () => {
        it("constructs with no validation errors when page and sortOrder are valid", async () => {
            const request = new PagingRequest();
            request.page = 1;
            request.pageSize = 10;
            request.sortOrder = SortOrder.ASC;
            request.sortField = "name";

            const errors = await validate(request);

            assert.deepEqual(errors, []);
        });

        it("fails validation when page is not positive", async () => {
            const request = new PagingRequest();
            request.page = -1;
            request.sortOrder = SortOrder.ASC;

            const errors = await validate(request);

            assert.equal(errors.length, 1);
            assert.equal(errors[0]!.property, "page");
            assert.ok(errors[0]!.constraints?.["isPositive"]);
        });

        it("fails validation when page is zero", async () => {
            const request = new PagingRequest();
            request.page = 0;
            request.sortOrder = SortOrder.ASC;

            const errors = await validate(request);

            assert.equal(errors.length, 1);
            assert.equal(errors[0]!.property, "page");
        });

        it("fails validation when sortOrder is not a valid SortOrder value", async () => {
            const request = new PagingRequest();
            request.page = 1;
            (request as any).sortOrder = "INVALID_ORDER";

            const errors = await validate(request);

            assert.equal(errors.length, 1);
            assert.equal(errors[0]!.property, "sortOrder");
            assert.ok(errors[0]!.constraints?.["isEnum"]);
        });

        it("accepts DESC as a valid sortOrder", async () => {
            const request = new PagingRequest();
            request.page = 2;
            request.sortOrder = SortOrder.DESC;

            const errors = await validate(request);

            assert.deepEqual(errors, []);
        });
    });

    describe("CursorRequest", () => {
        it("constructs with no validation errors when sortOrder is valid", async () => {
            const request = new CursorRequest();
            request.pageSize = 25;
            request.cursor = "abc123";
            request.sortOrder = SortOrder.ASC;
            request.sortField = "createdAt";

            const errors = await validate(request);

            assert.deepEqual(errors, []);
        });

        it("fails validation when sortOrder is not a valid SortOrder value", async () => {
            const request = new CursorRequest();
            (request as any).sortOrder = "NOT_A_SORT_ORDER";

            const errors = await validate(request);

            assert.equal(errors.length, 1);
            assert.equal(errors[0]!.property, "sortOrder");
            assert.ok(errors[0]!.constraints?.["isEnum"]);
        });

        it("supports lastId for MongoDB-style cursors", async () => {
            const request = new CursorRequest();
            request.lastId = "64f1b2c3d4e5f6a7b8c9d0e1";
            request.sortOrder = SortOrder.DESC;

            const errors = await validate(request);

            assert.deepEqual(errors, []);
            assert.equal(request.lastId, "64f1b2c3d4e5f6a7b8c9d0e1");
        });
    });

    describe("Page", () => {
        it("can be constructed and populated with items", () => {
            const page = new Page<string>();
            page.page = 1;
            page.totalPages = 3;
            page.totalItems = 25;
            page.pageSize = 10;
            page.items = ["a", "b", "c"];

            assert.equal(page.page, 1);
            assert.equal(page.totalPages, 3);
            assert.equal(page.totalItems, 25);
            assert.equal(page.pageSize, 10);
            assert.deepEqual(page.items, ["a", "b", "c"]);
        });
    });

    describe("CursorPage", () => {
        it("can be constructed and populated with items", () => {
            const page = new CursorPage<number>();
            page.pageSize = 5;
            page.cursor = "next-cursor";
            page.lastId = "last-id";
            page.items = [1, 2, 3];

            assert.equal(page.pageSize, 5);
            assert.equal(page.cursor, "next-cursor");
            assert.equal(page.lastId, "last-id");
            assert.deepEqual(page.items, [1, 2, 3]);
        });
    });
});

describe("models/utils", () => {
    describe("emptyPage", () => {
        it("returns a zeroed-out empty page", () => {
            const page = emptyPage<string>();

            assert.deepEqual(page, {
                page: 0,
                pageSize: 0,
                totalPages: 0,
                items: [],
                totalItems: 0,
            });
        });

        it("returns a fresh items array on every call", () => {
            const page1 = emptyPage<string>();
            const page2 = emptyPage<string>();

            assert.notEqual(page1.items, page2.items);
            assert.deepEqual(page1.items, page2.items);
        });
    });
});
