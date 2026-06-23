import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {createClient, SupabaseClient} from "@supabase/supabase-js";
import {SupabaseIntegrationConfig} from "../types";

/**
 * Configuration class responsible for initializing Supabase client
 * and exposing it as an injectable bean in the Node-Boot DI container.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
@Configuration()
export class SupabaseConfiguration {
    /**
     * Initializes the Supabase client based on the application configuration.
     * Reads the Supabase URL and API keys from the `app-config.yaml` file.
     *
     * The client will be initialized with either the service role key (for server-side operations
     * with full access) or the anon key (for client-side operations with RLS policies).
     *
     * @param {BeansContext} context - The DI context containing logger and configuration utilities.
     * @returns {SupabaseClient} - The initialized Supabase client instance.
     */
    @Bean()
    public supabaseClient({logger, config}: BeansContext): SupabaseClient {
        logger.info("Initializing Supabase client");

        // Retrieve Supabase configuration from the app's configuration file
        const supabaseConfig = config.get<SupabaseIntegrationConfig>("integrations.supabase");

        if (!supabaseConfig) {
            logger.error(`No configuration provided for Supabase integration. 
            Please configure "integrations.supabase" in the app-config.yaml with at least "url" and "anonKey" or "serviceRoleKey".`);
            throw new Error("Supabase configuration is missing");
        }

        if (!supabaseConfig.url) {
            logger.error(`Supabase URL is required. 
            Please configure "integrations.supabase.url" in the app-config.yaml.`);
            throw new Error("Supabase URL is missing");
        }

        // Use service role key if available (for server-side operations with full access)
        // Otherwise, use anon key (for client-side operations with RLS policies)
        const apiKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey;

        if (!apiKey) {
            logger.error(`Supabase API key is required. 
            Please configure either "integrations.supabase.serviceRoleKey" or "integrations.supabase.anonKey" in the app-config.yaml.`);
            throw new Error("Supabase API key is missing");
        }

        // Create Supabase client with the provided configuration
        const client = createClient(supabaseConfig.url, apiKey, {
            auth: {
                autoRefreshToken: supabaseConfig.options?.auth?.autoRefreshToken ?? true,
                persistSession: supabaseConfig.options?.auth?.persistSession ?? false,
                detectSessionInUrl: supabaseConfig.options?.auth?.detectSessionInUrl ?? false,
                ...(supabaseConfig.options?.auth?.storageKey && {
                    storageKey: supabaseConfig.options.auth.storageKey,
                }),
            },
            db: {
                schema: supabaseConfig.options?.db?.schema ?? "public",
            },
            ...(supabaseConfig.options?.realtime && {
                realtime: supabaseConfig.options.realtime,
            }),
            ...(supabaseConfig.options?.global && {
                global: supabaseConfig.options.global,
            }),
        });

        const keyType = supabaseConfig.serviceRoleKey ? "service role key" : "anon key";
        logger.info(`🚀 Supabase client successfully configured using ${keyType}`);

        return client as SupabaseClient;
    }
}
