import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {BackstageIntegrationConfig} from "./types";
import {CatalogClientProxy} from "../proxy";
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
            // Create and register the Catalog Client Proxy
            const catalogClient = new CatalogClientProxy(backstageConfigs.apiUrl, backstageConfigs.apiKey);
            iocContainer.set(CatalogClient, catalogClient);
            logger.info(
                "Backstage Catalog client successfully configured with configs from app-config.yaml. You can now inject CatalogClient in your services",
            );
        } else {
            logger.warn(
                'Backstage Catalog client was not created. Please provide Backstage integration config ("apiUrl" and "apiKey") under "integrations.backstage" config path in your service app-config.yaml',
            );
        }
    }
}
