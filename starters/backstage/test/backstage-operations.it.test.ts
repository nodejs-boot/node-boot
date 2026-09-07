/**
 * Integration test for Backstage Catalog client operations
 * using the auto-configured CatalogClient proxy against an in-process mock Backstage server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {CatalogClient} from "@backstage/catalog-client";
import {Entity} from "@backstage/catalog-model";
import {useNodeBoot} from "@nodeboot/node-test";
import {BackstageEnabledApp} from "./fixtures/BackstageEnabledApp";
import {
    BackstageMockServerHandle,
    SAMPLE_ENTITIES,
    SAMPLE_LOCATIONS,
    startBackstageMockServer,
} from "./fixtures/backstageMockServer";

const BACKSTAGE_MOCK_PORT = 35982;
let mockServer: BackstageMockServerHandle;

describe("@nodeboot/starter-backstage - Backstage Catalog operations integration tests", () => {
    before(async () => {
        mockServer = await startBackstageMockServer(BACKSTAGE_MOCK_PORT);
    });

    after(async () => {
        if (mockServer) {
            await mockServer.close();
        }
    });

    useNodeBoot(BackstageEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-backstage-operations-test"},
            integrations: {
                backstage: {
                    apiUrl: `http://127.0.0.1:${BACKSTAGE_MOCK_PORT}/api`,
                    apiKey: "secret-backstage-token-xyz",
                },
            },
        });
    });

    // ==========================================
    // 1. Entities Operations
    // ==========================================
    test("Entities: retrieves all entities from catalog", async () => {
        const client = Container.get(CatalogClient);
        const {items} = await client.getEntities();

        assert.ok(Array.isArray(items));
        assert.equal(items.length, SAMPLE_ENTITIES.length);
        assert.equal(items[0]?.metadata.name, "service-catalog");
        assert.equal(items[1]?.metadata.name, "auth-service");
    });

    test("Entities: finds an entity by string ref (positive case)", async () => {
        const client = Container.get(CatalogClient);
        const entity = await client.getEntityByRef("component:default/service-catalog");

        assert.ok(entity);
        assert.equal(entity.kind, "Component");
        assert.equal(entity.metadata.name, "service-catalog");
        assert.equal(entity.metadata.namespace, "default");
    });

    test("Entities: finds an entity by compound ref object (positive case)", async () => {
        const client = Container.get(CatalogClient);
        const entity = await client.getEntityByRef({
            kind: "Component",
            namespace: "default",
            name: "auth-service",
        });

        assert.ok(entity);
        assert.equal(entity.kind, "Component");
        assert.equal(entity.metadata.name, "auth-service");
    });

    test("Entities: returns undefined when entity is not found (negative case)", async () => {
        const client = Container.get(CatalogClient);
        const entity = await client.getEntityByRef("component:default/non-existent-entity");

        assert.equal(entity, undefined);
    });

    test("Entities: retrieves batch entities by refs", async () => {
        const client = Container.get(CatalogClient);
        const response = await client.getEntitiesByRefs({
            entityRefs: ["component:default/service-catalog", "component:default/auth-service"],
        });

        assert.ok(Array.isArray(response.items));
        assert.equal(response.items.length, 2);
        assert.equal(response.items[0]?.metadata.name, "service-catalog");
        assert.equal(response.items[1]?.metadata.name, "auth-service");
    });

    test("Entities: queries entities with search parameters and pagination", async () => {
        const client = Container.get(CatalogClient);
        const response = await client.queryEntities({
            limit: 2,
        });

        assert.ok(Array.isArray(response.items));
        assert.equal(response.items.length, 2);
        assert.equal(response.totalItems, SAMPLE_ENTITIES.length);
        assert.ok(response.pageInfo);
        assert.equal(response.pageInfo.nextCursor, "cursor-next-token");
    });

    test("Entities: retrieves ancestry for an entity", async () => {
        const client = Container.get(CatalogClient);
        const ancestry = await client.getEntityAncestors({
            entityRef: "component:default/service-catalog",
        });

        assert.ok(ancestry);
        assert.equal(ancestry.rootEntityRef, "component:default/service-catalog");
        assert.ok(Array.isArray(ancestry.items));
        assert.equal(ancestry.items.length, 1);
        assert.deepEqual(ancestry.items[0]?.parentEntityRefs, ["group:default/team-platform"]);
    });

    test("Entities: retrieves entity facets", async () => {
        const client = Container.get(CatalogClient);
        const facets = await client.getEntityFacets({
            facets: ["kind"],
        });

        assert.ok(facets);
        assert.ok(facets.facets["kind"]);
        assert.equal(facets.facets["kind"]?.length, 2);
    });

    test("Entities: refreshes an entity by ref", async () => {
        const client = Container.get(CatalogClient);
        // refreshEntity resolves void on 200
        await assert.doesNotReject(async () => {
            await client.refreshEntity("component:default/service-catalog");
        });
    });

    test("Entities: removes an entity by UID", async () => {
        const client = Container.get(CatalogClient);
        await assert.doesNotReject(async () => {
            await client.removeEntityByUid("uid-api-openapi-003");
        });

        const remaining = mockServer.state.entities.find(e => e.metadata.uid === "uid-api-openapi-003");
        assert.equal(remaining, undefined);
    });

    // ==========================================
    // 2. Locations Operations
    // ==========================================
    test("Locations: retrieves all locations", async () => {
        const client = Container.get(CatalogClient);
        const response = await client.getLocations();

        assert.ok(Array.isArray(response.items));
        assert.equal(response.items.length, SAMPLE_LOCATIONS.length);
        assert.equal(response.items[0]?.id, "loc-001");
    });

    test("Locations: retrieves a location by ID (positive case)", async () => {
        const client = Container.get(CatalogClient);
        const location = await client.getLocationById("loc-001");

        assert.ok(location);
        assert.equal(location.id, "loc-001");
        assert.equal(location.type, "url");
    });

    test("Locations: returns undefined when location ID is not found (negative case)", async () => {
        const client = Container.get(CatalogClient);
        const location = await client.getLocationById("loc-non-existent");

        assert.equal(location, undefined);
    });

    test("Locations: retrieves a location by location ref string", async () => {
        const client = Container.get(CatalogClient);
        const locRef = `url:${SAMPLE_LOCATIONS[0]?.target}`;
        const location = await client.getLocationByRef(locRef);

        assert.ok(location);
        assert.equal(location.id, "loc-001");
    });

    test("Locations: retrieves location by entity ref", async () => {
        const client = Container.get(CatalogClient);
        const location = await client.getLocationByEntity("component:default/service-catalog");

        assert.ok(location);
        assert.equal(location.id, "loc-001");
        assert.equal(location.target, "https://github.com/nodejs-boot/node-boot/blob/main/catalog-info.yaml");
    });

    test("Locations: adds a new location", async () => {
        const client = Container.get(CatalogClient);
        const result = await client.addLocation({
            type: "url",
            target: "https://github.com/example/new-service/blob/main/catalog-info.yaml",
        });

        assert.ok(result);
        assert.ok(result.location);
        assert.equal(result.location.target, "https://github.com/example/new-service/blob/main/catalog-info.yaml");
    });

    test("Locations: removes a location by ID", async () => {
        const client = Container.get(CatalogClient);
        await assert.doesNotReject(async () => {
            await client.removeLocationById("loc-002");
        });

        const remaining = mockServer.state.locations.find(l => l.id === "loc-002");
        assert.equal(remaining, undefined);
    });

    // ==========================================
    // 3. Entity Validation Operations
    // ==========================================
    test("Validation: validates a valid entity schema", async () => {
        const client = Container.get(CatalogClient);
        const validEntity: Entity = {
            apiVersion: "backstage.io/v1alpha1",
            kind: "Component",
            metadata: {
                name: "new-valid-service",
            },
        };

        const result = await client.validateEntity(validEntity, "url:https://example.com/catalog.yaml");
        assert.equal(result.valid, true);
    });

    test("Validation: returns valid: false with errors for invalid entity schema", async () => {
        const client = Container.get(CatalogClient);
        const invalidEntity = {
            apiVersion: "backstage.io/v1alpha1",
            // missing kind and metadata.name
        } as unknown as Entity;

        const result = await client.validateEntity(invalidEntity, "url:https://example.com/catalog.yaml");
        assert.equal(result.valid, false);
        assert.ok(Array.isArray(result.errors));
        assert.ok(result.errors.length > 0);
    });

    // ==========================================
    // 4. Authentication / Token Forwarding
    // ==========================================
    test("Auth: forwards configured apiKey as default Bearer token header", async () => {
        const client = Container.get(CatalogClient);
        mockServer.state.requests = [];

        await client.getEntities();

        assert.ok(mockServer.state.requests.length > 0);
        const lastRequest = mockServer.state.requests[mockServer.state.requests.length - 1];
        assert.equal(lastRequest?.headers.authorization, "Bearer secret-backstage-token-xyz");
    });

    test("Auth: forwards custom explicit options token when provided", async () => {
        const client = Container.get(CatalogClient);
        mockServer.state.requests = [];

        await client.getEntities(undefined, {token: "custom-override-token-456"});

        assert.ok(mockServer.state.requests.length > 0);
        const lastRequest = mockServer.state.requests[mockServer.state.requests.length - 1];
        assert.equal(lastRequest?.headers.authorization, "Bearer custom-override-token-456");
    });
});
