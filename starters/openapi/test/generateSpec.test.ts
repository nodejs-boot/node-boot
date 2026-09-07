import "reflect-metadata";
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {NodeBootToolkit} from "@nodeboot/engine";
import {
    Body,
    BodyParam,
    Controller,
    Delete,
    Get,
    HeaderParam,
    HttpCode,
    Param,
    Post,
    Put,
    QueryParam,
} from "@nodeboot/core";
import {controllersToSpec, getFullServerPath, parseRoutes, serverToOpenAPIPath} from "../src/openapi";

describe("generateSpec and parseRoutes", () => {
    test("converts express paths to OpenAPI paths", () => {
        assert.equal(serverToOpenAPIPath("/users/:id"), "/users/{id}");
        assert.equal(serverToOpenAPIPath("/orgs/:orgId/repos/:repoId"), "/orgs/{orgId}/repos/{repoId}");
        assert.equal(serverToOpenAPIPath("/static/path"), "/static/path");
    });

    test("parses routes and generates full OpenAPI specification", () => {
        class CreateDto {
            name: string;
        }

        @Controller("/api/v1/items")
        class ItemsController {
            @Get("/")
            listItems(@QueryParam("search") _search: string) {}

            @Get("/:itemId")
            getItem(@Param("itemId") _id: string, @HeaderParam("x-correlation-id") _corrId: string) {}

            @Post("/")
            @HttpCode(201)
            createItem(@Body() _body: CreateDto) {}

            @Put("/:itemId")
            updateItem(@Param("itemId") _id: string, @BodyParam("status") _status: string) {}

            @Delete("/:itemId")
            @HttpCode(204)
            deleteItem(@Param("itemId") _id: string) {}
        }

        const storage = NodeBootToolkit.getMetadataArgsStorage();
        const routes = parseRoutes(storage, {routePrefix: ""});

        assert.ok(routes.length >= 5);
        const itemRoutes = routes.filter(r => r.controller.target === ItemsController);
        assert.equal(itemRoutes.length, 5);

        const listRoute = itemRoutes.find(r => r.action.method === "listItems");
        assert.ok(listRoute);
        assert.equal(getFullServerPath(listRoute!), "/api/v1/items/");

        const spec = controllersToSpec(
            {controllers: [ItemsController]},
            {
                info: {title: "Test Items API", version: "1.0.0"},
                servers: [{url: "http://localhost:3000"}],
            },
        );

        assert.equal(spec.openapi, "3.0.0");
        assert.equal(spec.info.title, "Test Items API");
        assert.equal(spec.servers?.[0]?.url, "http://localhost:3000");

        // Paths
        assert.ok(spec.paths["/api/v1/items/"]);
        assert.ok(spec.paths["/api/v1/items/{itemId}"]);

        // Operations
        const getOp = spec.paths["/api/v1/items/{itemId}"].get;
        assert.ok(getOp);
        assert.equal(
            getOp.parameters?.some((p: any) => p.name === "itemId" && p.in === "path"),
            true,
        );
        assert.equal(
            getOp.parameters?.some((p: any) => p.name === "x-correlation-id" && p.in === "header"),
            true,
        );

        const postOp = spec.paths["/api/v1/items/"].post;
        assert.ok(postOp);
        assert.ok(postOp.requestBody);
        assert.ok(postOp.responses["201"]);

        const deleteOp = spec.paths["/api/v1/items/{itemId}"].delete;
        assert.ok(deleteOp);
        assert.ok(deleteOp.responses["204"]);
    });
});
