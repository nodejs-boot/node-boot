/**
 * Integration test for `@nodeboot/starter-openapi` with Koa server adapter.
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {useNodeBoot} from "@nodeboot/node-test";
import {OpenApiKoaApp} from "./fixtures/OpenApiKoaApp";

const TEST_PORT = 38204;

describe("@nodeboot/starter-openapi - Koa server adapter", () => {
    const {useHttp} = useNodeBoot(OpenApiKoaApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-openapi-koa-test", port: TEST_PORT},
            openapi: {
                info: {
                    title: "Node-Boot Starter OpenAPI Koa Test",
                    version: "2.6.0",
                    description: "OpenAPI specification on Koa",
                    termsOfService: "https://example.com/terms",
                    contact: {
                        name: "Node-Boot Support",
                        email: "support@nodeboot.io",
                        url: "https://nodeboot.io",
                    },
                    license: {
                        name: "MIT",
                        url: "https://opensource.org/licenses/MIT",
                    },
                },
                servers: [
                    {url: `http://localhost:${TEST_PORT}`, description: "Local development server"},
                    {url: "https://api.example.com/v1", description: "Production server"},
                ],
                security: [{bearerAuth: []}, {apiKeyAuth: []}],
                tags: [
                    {name: "UserOps", description: "User management operations"},
                    {name: "System", description: "System level operations"},
                ],
                externalDocs: {
                    url: "https://docs.nodeboot.io",
                    description: "Node-Boot Documentation",
                },
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                        description: "JWT Bearer Token",
                    },
                    apiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "X-API-KEY",
                        description: "API Key Authentication",
                    },
                },
            },
        });
    });

    let http: ReturnType<typeof useHttp>;

    before(() => {
        http = useHttp();
        http.defaults.validateStatus = () => true;
    });

    test("serves OpenAPI 3.0 spec at /api-docs/swagger.json with all configured metadata", async () => {
        const response = await http.get("/api-docs/swagger.json");

        assert.equal(response.status, 200);
        assert.equal(response.data.openapi?.startsWith("3."), true);
        assert.equal(response.data.info.title, "Node-Boot Starter OpenAPI Koa Test");
        assert.equal(response.data.info.version, "2.6.0");
        assert.equal(response.data.info.description, "OpenAPI specification on Koa");
        assert.equal(response.data.info.termsOfService, "https://example.com/terms");
        assert.equal(response.data.info.contact.name, "Node-Boot Support");
        assert.equal(response.data.info.contact.email, "support@nodeboot.io");
        assert.equal(response.data.info.license.name, "MIT");

        assert.equal(response.data.servers.length, 2);
        assert.equal(response.data.servers[0].url, `http://localhost:${TEST_PORT}`);

        assert.deepEqual(response.data.security, [{bearerAuth: []}, {apiKeyAuth: []}]);
        assert.equal(response.data.externalDocs.url, "https://docs.nodeboot.io");

        assert.ok(response.data.components?.securitySchemes?.bearerAuth);
        assert.equal(response.data.components.securitySchemes.bearerAuth.scheme, "bearer");
        assert.ok(response.data.components?.securitySchemes?.apiKeyAuth);
        assert.equal(response.data.components.securitySchemes.apiKeyAuth.type, "apiKey");
    });

    test("documents controller routes, parameters, and responses", async () => {
        const response = await http.get("/api-docs/swagger.json");
        const paths = response.data.paths;

        assert.ok(paths["/api/v1/users/"]);
        assert.ok(paths["/api/v1/users/"].get);
        assert.ok(paths["/api/v1/users/"].post);
        assert.ok(paths["/api/v1/users/{id}"]);
        assert.ok(paths["/api/v1/users/{id}"].get);
        assert.ok(paths["/api/v1/users/{id}"].put);
        assert.ok(paths["/api/v1/users/{id}"].delete);
        assert.ok(paths["/api/v1/users/search"]);
        assert.ok(paths["/api/v1/users/paginated"]);

        // GET /users/:id path parameter
        const getById = paths["/api/v1/users/{id}"].get;
        assert.equal(
            getById.parameters.some((p: any) => p.name === "id" && p.in === "path"),
            true,
        );
        assert.deepEqual(getById.tags, ["UserOps"]);

        // Search query and header parameters
        const searchOp = paths["/api/v1/users/search"].get;
        assert.equal(
            searchOp.parameters.some((p: any) => p.name === "q" && p.in === "query"),
            true,
        );
        assert.equal(
            searchOp.parameters.some((p: any) => p.name === "x-request-id" && p.in === "header"),
            true,
        );

        // POST /users request body and 201 response
        const postOp = paths["/api/v1/users/"].post;
        assert.ok(postOp.requestBody);
        assert.ok(postOp.responses["201"]);

        // DELETE /users/:id 204 response
        const deleteOp = paths["/api/v1/users/{id}"].delete;
        assert.ok(deleteOp.responses["204"]);
    });

    test("documents model schemas under components.schemas", async () => {
        const response = await http.get("/api-docs/swagger.json");
        const schemas = response.data.components?.schemas;

        assert.ok(schemas);
        assert.ok(schemas.UserModel);
        assert.equal(schemas.UserModel.properties.id.type, "number");
        assert.equal(schemas.UserModel.properties.email.type, "string");
        assert.deepEqual(schemas.UserModel.properties.role.enum, ["ADMIN", "USER", "GUEST"]);
        assert.equal(schemas.UserModel.properties.createdAt.format, "date-time");

        assert.ok(schemas.AddressModel);
        assert.equal(schemas.AddressModel.properties.street.type, "string");

        assert.ok(schemas.CreateUserDto);
        assert.ok(schemas.PaginatedUsersResponse);
    });

    test("serves Swagger UI HTML at /api-docs/", async () => {
        const response = await http.get("/api-docs/");

        assert.equal(response.status, 200);
        assert.ok(response.headers["content-type"]?.includes("text/html"));
        assert.ok(response.data.includes("<title>Swagger UI</title>"));
        assert.ok(response.data.includes('<div id="swagger-ui"></div>'));
        assert.ok(response.data.includes("/api-docs/swagger-config.js"));
    });

    test("serves Swagger UI config script at /api-docs/swagger-config.js", async () => {
        const response = await http.get("/api-docs/swagger-config.js");

        assert.equal(response.status, 200);
        assert.ok(response.headers["content-type"]?.includes("javascript"));
        assert.ok(response.data.includes("SwaggerUIBundle"));
        assert.ok(response.data.includes("/api-docs/swagger.json"));
    });

    test("serves static Swagger UI assets at /api-docs/*", async () => {
        const response = await http.get("/api-docs/swagger-ui.css");

        assert.equal(response.status, 200);
        assert.ok(response.headers["content-type"]?.includes("text/css"));
    });

    test("redirects /docs and /api-docs to /api-docs/", async () => {
        const docsResponse = await http.get("/docs");
        assert.ok(docsResponse.status === 200 || docsResponse.status === 302);
        if (docsResponse.status === 200) {
            assert.ok(docsResponse.data.includes("Swagger UI"));
        } else {
            assert.equal(docsResponse.headers["location"], "/api-docs/");
        }

        const apiDocsResponse = await http.get("/api-docs");
        assert.ok(apiDocsResponse.status === 200 || apiDocsResponse.status === 302);
        if (apiDocsResponse.status === 200) {
            assert.ok(apiDocsResponse.data.includes("Swagger UI"));
        } else {
            assert.equal(apiDocsResponse.headers["location"], "/api-docs/");
        }
    });
});
