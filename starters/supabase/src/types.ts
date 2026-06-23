/**
 * Supabase Integration Configuration
 *
 * This configuration type defines the necessary parameters for integrating Supabase services
 * within a Node-Boot application. It is typically loaded from the application's configuration
 * file (e.g., `app-config.yaml`) under the `integrations.supabase` path.
 *
 * These settings allow the Supabase client to authenticate and interact with various Supabase
 * services, such as Database, Authentication, Storage, Realtime, and more.
 *
 * ## Example Configuration (YAML):
 * ```yaml
 * integrations:
 *   supabase:
 *     url: "https://your-project.supabase.co"
 *     anonKey: "your-anon-key"
 *     serviceRoleKey: "your-service-role-key"
 *     options:
 *       auth:
 *         autoRefreshToken: true
 *         persistSession: false
 *       db:
 *         schema: "public"
 * ```
 *
 * ## Usage:
 * The `SupabaseIntegrationConfig` is automatically injected into the `SupabaseConfiguration`
 * class, ensuring that Supabase services are correctly initialized with the provided settings.
 *
 * ```typescript
 * const supabaseConfig = config.get<SupabaseIntegrationConfig>("integrations.supabase");
 * ```
 */
export type SupabaseIntegrationConfig = {
    /**
     * The URL of your Supabase project.
     *
     * This URL is provided when you create a Supabase project and is used to connect
     * to your database and other Supabase services.
     *
     * @example "https://your-project.supabase.co"
     * @see https://supabase.com/docs/guides/api#api-url-and-keys
     */
    url: string;

    /**
     * The anonymous (public) API key for your Supabase project.
     *
     * This key is safe to use in client-side code and provides limited access based
     * on your Row Level Security (RLS) policies.
     *
     * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     * @see https://supabase.com/docs/guides/api#api-url-and-keys
     */
    anonKey?: string;

    /**
     * The service role API key for your Supabase project.
     *
     * This key has full access to your database and should only be used on the server-side.
     * It bypasses Row Level Security policies and should be kept secure.
     *
     * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     * @see https://supabase.com/docs/guides/api#api-url-and-keys
     */
    serviceRoleKey?: string;

    /**
     * Additional configuration options for the Supabase client.
     *
     * These options allow you to customize the behavior of authentication, database,
     * realtime, and other Supabase features.
     *
     * @see https://supabase.com/docs/reference/javascript/initializing
     */
    options?: {
        /**
         * Authentication configuration options.
         */
        auth?: {
            /**
             * Automatically refresh the authentication token before it expires.
             * @default true
             */
            autoRefreshToken?: boolean;

            /**
             * Persist authentication session in local storage.
             * For server-side usage, this is typically set to false.
             * @default true
             */
            persistSession?: boolean;

            /**
             * Detect sessions from other tabs/windows.
             * @default true
             */
            detectSessionInUrl?: boolean;

            /**
             * Storage key prefix for authentication data.
             * @default "sb"
             */
            storageKey?: string;
        };

        /**
         * Database configuration options.
         */
        db?: {
            /**
             * The database schema to use.
             * @default "public"
             */
            schema?: string;
        };

        /**
         * Realtime configuration options.
         */
        realtime?: {
            /**
             * Parameters for realtime connections.
             */
            params?: Record<string, any>;
        };

        /**
         * Global headers to include with all requests.
         */
        global?: {
            headers?: Record<string, string>;
        };
    };
};
