/**
 * The PluginDiscoveryService is used to provide a mechanism to discover endpoints for Backstage plugins.
 *
 * @public
 */
export class PluginDiscoveryService {
    constructor(private readonly baseUrl: string) {}

    /**
     * Returns the internal HTTP base URL for a given plugin, without a trailing slash.
     *
     * @remarks
     *
     * The returned URL should point to a backstage plugin endpoint, with
     * the shortest route possible.
     *
     * This method must always be called just before making each request, as opposed to
     * fetching the URL once when constructing an API client. That is to ensure that more
     * flexible routing patterns can be supported where a different result might be returned each time.
     *
     * For example, asking for the URL for `catalog` may return something
     * like `http://10.1.2.3/api/catalog`
     */
    getPluginUrl(pluginId: string): Promise<string> {
        return Promise.resolve(`${this.baseUrl}/${pluginId}`);
    }
}
