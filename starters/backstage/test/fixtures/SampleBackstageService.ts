import {Service} from "@nodeboot/core";
import {Inject} from "typedi";
import {CatalogClient} from "@backstage/catalog-client";
import {Entity} from "@backstage/catalog-model";
import {BackstageIntegrationConfig, PluginDiscoveryService} from "../../src";

/**
 * Sample service demonstrating injection and usage of Backstage beans
 * auto-configured by `@nodeboot/starter-backstage`.
 */
@Service()
export class SampleBackstageService {
    constructor(
        @Inject()
        public readonly catalogClient: CatalogClient,
        @Inject()
        public readonly discoveryService: PluginDiscoveryService,
        @Inject()
        public readonly config: BackstageIntegrationConfig,
    ) {}

    async getEntities(): Promise<Entity[]> {
        const response = await this.catalogClient.getEntities();
        return response.items;
    }

    async getEntityByName(kind: string, namespace: string, name: string): Promise<Entity | undefined> {
        return this.catalogClient.getEntityByRef({kind, namespace, name});
    }

    async getPluginEndpoint(pluginId: string): Promise<string> {
        return this.discoveryService.getPluginUrl(pluginId);
    }

    getConfiguredApiUrl(): string {
        return this.config.apiUrl;
    }

    getConfiguredApiKey(): string {
        return this.config.apiKey;
    }
}
