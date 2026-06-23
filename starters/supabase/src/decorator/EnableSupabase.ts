import {SupabaseConfiguration} from "../configuration/SupabaseConfiguration";

/**
 * @EnableSupabase Decorator
 *
 * This decorator enables Supabase integration within a Node-Boot application.
 * When applied to the main application class, it registers the `SupabaseConfiguration`,
 * which automatically initializes the Supabase client based on the application's configuration.
 *
 * ## Usage:
 * Apply `@EnableSupabase()` to the main application class to enable Supabase services.
 *
 * ```typescript
 * @EnableDI(Container)
 * @EnableSupabase()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class MyApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * This ensures that the Supabase client (`supabase.client`)
 * is available for dependency injection in other components of the application.
 *
 * @returns {ClassDecorator} - A decorator function that registers the SupabaseConfiguration.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export const EnableSupabase = (): ClassDecorator => {
    return () => {
        // Register Supabase Configuration to enable Supabase services
        new SupabaseConfiguration();
    };
};
