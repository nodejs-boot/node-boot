import {
    AddLocationRequest,
    AddLocationResponse,
    CatalogApi,
    CatalogClient,
    CatalogRequestOptions,
    GetEntitiesByRefsRequest,
    GetEntitiesByRefsResponse,
    GetEntitiesRequest,
    GetEntitiesResponse,
    GetEntityAncestorsRequest,
    GetEntityAncestorsResponse,
    GetEntityFacetsRequest,
    GetEntityFacetsResponse,
    GetLocationsResponse,
    Location,
    QueryEntitiesRequest,
    QueryEntitiesResponse,
    ValidateEntityResponse,
} from "@backstage/catalog-client";
import {CompoundEntityRef, Entity} from "@backstage/catalog-model";

export class CatalogClientProxy implements CatalogApi {
    private readonly catalogClient: CatalogApi;

    constructor(apiUrl: string, private readonly apiKey: string) {
        this.catalogClient = new CatalogClient({
            discoveryApi: {
                getBaseUrl(pluginId: string): Promise<string> {
                    return Promise.resolve(`${apiUrl}/${pluginId}`);
                },
            },
        });
    }

    private useOptions(options?: CatalogRequestOptions): CatalogRequestOptions {
        return {
            token: options?.token ?? this.apiKey,
        };
    }

    getLocations(request?: {}, options?: CatalogRequestOptions): Promise<GetLocationsResponse> {
        return this.catalogClient.getLocations(request, this.useOptions(options));
    }

    getEntities(request?: GetEntitiesRequest, options?: CatalogRequestOptions): Promise<GetEntitiesResponse> {
        return this.catalogClient.getEntities(request, this.useOptions(options));
    }

    getEntitiesByRefs(
        request: GetEntitiesByRefsRequest,
        options?: CatalogRequestOptions,
    ): Promise<GetEntitiesByRefsResponse> {
        return this.catalogClient.getEntitiesByRefs(request, this.useOptions(options));
    }

    queryEntities(request?: QueryEntitiesRequest, options?: CatalogRequestOptions): Promise<QueryEntitiesResponse> {
        return this.catalogClient.queryEntities(request, this.useOptions(options));
    }

    getEntityAncestors(
        request: GetEntityAncestorsRequest,
        options?: CatalogRequestOptions,
    ): Promise<GetEntityAncestorsResponse> {
        return this.catalogClient.getEntityAncestors(request, this.useOptions(options));
    }

    removeEntityByUid(uid: string, options?: CatalogRequestOptions): Promise<void> {
        return this.catalogClient.removeEntityByUid(uid, this.useOptions(options));
    }

    refreshEntity(entityRef: string, options?: CatalogRequestOptions): Promise<void> {
        return this.catalogClient.refreshEntity(entityRef, this.useOptions(options));
    }

    getEntityFacets(
        request: GetEntityFacetsRequest,
        options?: CatalogRequestOptions,
    ): Promise<GetEntityFacetsResponse> {
        return this.catalogClient.getEntityFacets(request, this.useOptions(options));
    }

    getLocationById(id: string, options?: CatalogRequestOptions): Promise<Location | undefined> {
        return this.catalogClient.getLocationById(id, this.useOptions(options));
    }

    getLocationByRef(locationRef: string, options?: CatalogRequestOptions): Promise<Location | undefined> {
        return this.catalogClient.getLocationByRef(locationRef, this.useOptions(options));
    }

    addLocation(location: AddLocationRequest, options?: CatalogRequestOptions): Promise<AddLocationResponse> {
        return this.catalogClient.addLocation(location, this.useOptions(options));
    }

    removeLocationById(id: string, options?: CatalogRequestOptions): Promise<void> {
        return this.catalogClient.removeLocationById(id, this.useOptions(options));
    }

    getEntityByRef(
        entityRef: string | CompoundEntityRef,
        options?: CatalogRequestOptions,
    ): Promise<Entity | undefined> {
        return this.catalogClient.getEntityByRef(entityRef, this.useOptions(options));
    }

    getLocationByEntity(
        entityRef: string | CompoundEntityRef,
        options?: CatalogRequestOptions,
    ): Promise<Location | undefined> {
        return this.catalogClient.getLocationByEntity(entityRef, this.useOptions(options));
    }

    validateEntity(
        entity: Entity,
        locationRef: string,
        options?: CatalogRequestOptions,
    ): Promise<ValidateEntityResponse> {
        return this.catalogClient.validateEntity(entity, locationRef, this.useOptions(options));
    }
}
