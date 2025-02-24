import {FirebaseAdminConfiguration} from "../configuration/FirebaseAdminConfiguration";

/**
 * @EnableFirebase Decorator
 *
 * This decorator enables Firebase integration within a Node-Boot application.
 * When applied to the main application class, it registers the `FirebaseAdminConfiguration`,
 * which automatically initializes Firebase services based on the application's configuration.
 *
 * ## Usage:
 * Apply `@EnableFirebase()` to the main application class to enable Firebase services.
 *
 * ```typescript
 * @EnableDI(Container)
 * @EnableFirebase()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class MyApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * This ensures that Firebase beans (e.g., `firebase.auth`, `firebase.firestore`, etc.)
 * are available for dependency injection in other components of the application.
 *
 * @returns {ClassDecorator} - A decorator function that registers the FirebaseAdminConfiguration.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export const EnableFirebase = (): ClassDecorator => {
    return () => {
        // Register Firebase Admin Configuration to enable Firebase services
        new FirebaseAdminConfiguration();
    };
};
