import {Hook} from "./Hook";

type CleanUpOptions = {
    afterAll?: () => void;
    afterEach?: () => void;
};

/**
 * The `CleanupHook` class allows users to register cleanup functions that are executed
 * after the tests are completed. This hook ensures that any necessary resource
 * cleanup, mock resetting, or other post-test tasks are performed.
 *
 * This hook is invoked during the `afterTests` lifecycle method, where all registered
 * cleanup functions are called.
 */
export class CleanupHook extends Hook {
    /**
     * A list of cleanup functions that will be executed after each test.
     * These functions are registered by the `call` method.
     */
    private cleanupFunctions: (() => void)[] = [];

    /**
     * A list of cleanup functions that will be executed after all tests.
     * These functions are registered by the `call` method.
     */
    private globalCleanupFunctions: (() => void)[] = [];

    /**
     * The constructor initializes the `CleanupHook` with a priority value.
     * The default priority is set to 3 to run after other hooks.
     */
    constructor() {
        super(3); // Set priority to run after other hooks that might register resources (adjust priority as needed)
    }

    /**
     * Registers cleanup functions that will be executed after all tests or after each test
     *
     * @param options - The cleanup functions to register. These functions should
     *                    contain the logic to clean up resources, mock resets,
     *                    or any other necessary actions according to tests lifecycle
     */
    call(options: CleanUpOptions) {
        if (!options.afterEach && !options.afterAll) {
            throw new Error(
                `Invalid cleanUp hook, please provide a cleanUp function. One of "afterEach" or "afterAll"`,
            );
        }
        if (options.afterEach) {
            this.cleanupFunctions.push(options.afterEach);
        }
        if (options.afterEach) {
            this.globalCleanupFunctions.push(options.afterEach);
        }
    }

    /**
     * The `afterTests` lifecycle method is executed after all tests are completed.
     * It iterates over all registered cleanup functions and calls them to ensure
     * proper cleanup is performed.
     *
     * If any errors occur during cleanup, they are caught and logged, allowing
     * the other cleanup functions to continue running.
     *
     * @returns {Promise<void>} A promise that resolves when all cleanup functions have been executed.
     */
    override async afterTests(): Promise<void> {
        console.log("Running cleanup after tests.");

        // Iterate over each registered cleanup function and execute it
        for (const cleanupFn of this.globalCleanupFunctions) {
            try {
                cleanupFn(); // Call the cleanup function
                console.log("Cleanup function executed successfully.");
            } catch (error) {
                console.error("Error during cleanup:", error); // Log errors if any
            }
        }

        // Clear the cleanup functions array after execution to prevent re-running them
        this.globalCleanupFunctions = [];
        this.cleanupFunctions = [];
        console.log("Completed cleanup after tests.");
    }

    /**
     * The `afterEachTest` lifecycle method is executed after each test is completed.
     * It iterates over all registered cleanup functions and calls them to ensure
     * proper cleanup is performed.
     *
     * If any errors occur during cleanup, they are caught and logged, allowing
     * the other cleanup functions to continue running.
     *
     * @returns {Promise<void>} A promise that resolves when all cleanup functions have been executed.
     */
    override async afterEachTest(): Promise<void> {
        console.log("Running cleanup after each test.");

        // Iterate over each registered cleanup function and execute it
        for (const cleanupFn of this.cleanupFunctions) {
            try {
                cleanupFn(); // Call the cleanup function
                console.log("Cleanup function executed successfully.");
            } catch (error) {
                console.error("Error during cleanup:", error);
            }
        }

        console.log("Completed cleanup after each test.");
    }
}
