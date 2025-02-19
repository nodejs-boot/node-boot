import axios, {AxiosInstance} from "axios";
import {NodeBootAppView} from "@nodeboot/core";
import {Hook} from "./Hook";

/**
 * The `HttpClientHook` class manages multiple HTTP client instances, each cached by its base URL.
 * It automatically infers the base URL from the NodeBoot instance or allows a custom base URL to be provided.
 */
export class HttpClientHook extends Hook {
    private clients: Map<string, AxiosInstance> = new Map();

    override afterStart(bootApp: NodeBootAppView): Promise<void> | void {
        // Provide the server address to the address hook
        const address = `http://localhost:${bootApp.appOptions.port}`;
        this.setState("node-boot-address", address);
        this.setupClient(address);
    }

    /**
     * Resets the HTTP client after tests.
     */
    override async afterTests() {
        this.clients.clear(); // Clear all cached clients
        console.log("All HTTP clients have been reset after tests.");
    }

    use(baseURL?: string) {
        const serverAddress = baseURL ?? this.getState<string>("node-boot-address");
        let instance = this.clients.get(serverAddress!);
        if (!instance && baseURL) {
            instance = this.setupClient(baseURL);
        }

        if (!instance) {
            throw new Error(`No HTTP client instance available for address ${baseURL}`);
        }
        return instance;
    }

    /**
     * Factory method to retrieve the HTTP client with a base URL.
     * If no `baseURL` is specified, it will try to use the address from the NodeBoot instance.
     *
     * @param baseURL - base URL for the HTTP client.
     * @returns The configured Axios instance.
     */
    setupClient(baseURL: string): AxiosInstance {
        // Check if the client already exists for the provided or inferred base URL
        let client = this.clients.get(baseURL);
        if (!client) {
            // If not found, create a new client
            client = axios.create({
                baseURL: baseURL,
                timeout: 15000, // Request timeout in ms
                headers: {
                    "Content-Type": "application/json",
                },
            });

            // Cache the new client
            this.clients.set(baseURL, client);
        }
        return client;
    }
}
