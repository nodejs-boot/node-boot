import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {BackstageIntegrationConfig} from "./types";
import {CatalogClientProxy, PluginDiscoveryService} from "../service";
import {CatalogClient} from "@backstage/catalog-client";

/**
 * BackstageConfiguration is responsible for setting up the Backstage catalog client.
 */
@Configuration()
export class BackstageConfiguration {
    /**
     * Configures the Backstage Catalog Client.
     *
     * @param {BeansContext} context - The beans context containing logger, config, and DI container.
     */
    @Bean()
    public backstageCatalog({logger, config, iocContainer}: BeansContext): void {
        logger.info("Configuring Backstage Catalog Client");

        // Retrieve Backstage configuration from the service's app-config.yaml
        const backstageConfigs = config.getOptional<BackstageIntegrationConfig>("integrations.backstage");

        if (backstageConfigs) {
            // Set the config for latter injection
            iocContainer.set(BackstageIntegrationConfig, backstageConfigs);

            // Create and register the Catalog Client Proxy
            const catalogClient = new CatalogClientProxy(backstageConfigs.apiUrl, backstageConfigs.apiKey);
            iocContainer.set(CatalogClient, catalogClient);
            logger.info(
                "Backstage Catalog client successfully configured with configs from app-config.yaml. You can now inject CatalogClient in your services",
            );

            const discovery = new PluginDiscoveryService(backstageConfigs.apiUrl);
            iocContainer.set(PluginDiscoveryService, discovery);
            logger.info(
                "Backstage Plugin endpoint discovery successfully configured. You can now inject PluginDiscoveryService in your services",
            );
        } else {
            logger.warn(
                'Backstage integration not configured. Please provide Backstage integration config ("apiUrl" and "apiKey") under "integrations.backstage" config path in your service app-config.yaml',
            );
        }
    }
}
