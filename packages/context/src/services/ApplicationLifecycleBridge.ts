import EventEmitter from "node:events";
import {LifecycleType} from "../types";
import {ApplicationContext} from "../ApplicationContext";
import {Logger} from "winston";
import {Config} from "./Config";

/**
 * ApplicationLifecycleBridge manages the sequential execution of application lifecycle events
 * and ensures that feature adapters are bound in a strict, predictable order.
 *
 * ## Problem Statement
 *
 * Lifecycle events (application.initialized, application.started, persistence.started) are emitted
 * asynchronously and can fire while previous lifecycle adapters are still being bound. This creates
 * race conditions where:
 *
 * - A `persistence.started` adapter might start executing while `application.started` adapters are
 *   still being bound
 * - A persistence adapter requiring an HTTP client (constructed in `application.started`) may fail
 *   because the HTTP client hasn't been registered in the DI container yet
 *
 * ## Solution
 *
 * This class uses a **binding queue** to enforce strict sequential execution:
 *
 * 1. Events can be emitted at any time (asynchronously)
 * 2. When an event fires, its lifecycle is enqueued for adapter binding
 * 3. Only ONE lifecycle's adapters are bound at a time
 * 4. The next lifecycle in the queue waits until the previous one completes
 *
 * This guarantees that:
 * - All `application.initialized` adapters finish before `application.started` adapters begin
 * - All `application.started` adapters finish before `persistence.started` adapters begin
 * - Dependencies registered in earlier lifecycles are available to later ones
 *
 * ## Example Flow
 *
 * ```
 * Time: 0ms  -> application.initialized event fires -> enqueued -> starts binding
 * Time: 50ms -> application.started event fires -> enqueued -> waits
 * Time: 80ms -> persistence.started event fires -> enqueued -> waits
 * Time: 100ms -> application.initialized binding completes -> application.started starts
 * Time: 200ms -> application.started binding completes -> persistence.started starts
 * Time: 300ms -> persistence.started binding completes
 * ```
 *
 * @see {LifecycleType} for available lifecycle events
 * @see {ApplicationContext} for managing application features and adapters
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 *
 */
export class ApplicationLifecycleBridge {
    /**
     * Track lifecycle events that have already been published.
     * This allows late subscribers to react immediately to events that fired before they subscribed.
     */
    private readonly firedEvents = new Set<string>();

    /**
     * Queue to enforce strictly sequential binding of lifecycle adapters.
     * Prevents race conditions where later lifecycle events start binding adapters
     * before earlier lifecycle adapters have finished, which would cause DI issues.
     */
    private readonly bindingQueue: LifecycleType[] = [];

    /**
     * Flag indicating whether a lifecycle adapter binding is currently in progress.
     * Used to prevent concurrent execution of multiple lifecycle bindings.
     */
    private bindingInProgress = false;

    /**
     * Creates a new ApplicationLifecycleBridge instance.
     *
     * @param logger - Winston logger instance for logging lifecycle events and errors
     * @param config - Application configuration object passed to feature adapters during binding
     * @param eventBus - EventEmitter instance for publishing and subscribing to lifecycle events.
     *                   Defaults to a new EventEmitter if not provided.
     */
    constructor(
        private readonly logger: Logger,
        private readonly config: Config,
        private readonly eventBus: EventEmitter = new EventEmitter(),
    ) {}

    /**
     * Publishes a lifecycle event to all subscribers.
     *
     * This method marks the event as "fired" BEFORE emitting it to prevent race conditions
     * where a subscriber might check `hasFired()` immediately after the publish call but
     * before the event is actually emitted.
     *
     * Note: Publishing an event does NOT immediately bind adapters. The event is enqueued
     * and adapters are bound sequentially to prevent DI race conditions.
     *
     * @param lifecycleEvent - The lifecycle event to publish (e.g., "application.initialized")
     *
     * @example
     * ```typescript
     * await bridge.publish("application.initialized");
     * // Event is now marked as fired and all subscribers are notified
     * ```
     */
    async publish(lifecycleEvent: LifecycleType) {
        // Mark fired before emitting to avoid race conditions with late subscriptions right after publish invocation
        this.firedEvents.add(lifecycleEvent.toString());
        this.eventBus.emit(lifecycleEvent);
    }

    /**
     * Returns the underlying EventEmitter instance.
     *
     * This provides direct access to the event bus for advanced use cases where
     * you need to listen to events directly or check event emitter state.
     *
     * @returns The EventEmitter instance used for lifecycle event management
     */
    getEventBus() {
        return this.eventBus;
    }

    /**
     * Checks whether a specific lifecycle event has already been published.
     *
     * This is useful for late-binding scenarios where a module needs to know if it
     * missed a lifecycle event and should perform initialization immediately.
     *
     * @param lifecycleEvent - The lifecycle event to check (e.g., "application.started")
     * @returns `true` if the event has been published, `false` otherwise
     *
     * @example
     * ```typescript
     * if (bridge.hasFired("application.started")) {
     *   // Perform late initialization
     * }
     * ```
     */
    hasFired(lifecycleEvent: LifecycleType): boolean {
        return this.firedEvents.has(lifecycleEvent.toString());
    }

    /**
     * Subscribe to a lifecycle event with automatic late-binding support.
     *
     * If the event has already fired, the listener is invoked immediately.
     * If the event has not fired yet, the listener is registered and will be invoked
     * when the event is published.
     *
     * This ensures that modules can subscribe to lifecycle events at any time without
     * worrying about whether they've missed the event.
     *
     * @param eventName - The name of the lifecycle event to subscribe to
     * @param listener - The callback function to invoke when the event fires
     *
     * @example
     * ```typescript
     * bridge.subscribe("application.started", () => {
     *   console.log("Application has started!");
     * });
     * ```
     */
    subscribe(eventName: string, listener: Function) {
        // If already fired, invoke immediately (microtask scheduling not strictly needed here)
        if (this.firedEvents.has(eventName)) {
            listener();
            return;
        }
        this.eventBus.once(eventName, listener as () => void);
    }

    /**
     * Await the first occurrence of a lifecycle event as a Promise.
     *
     * This method allows you to wait for a lifecycle event in an async/await style.
     * If the event has already fired, the promise resolves immediately.
     *
     * An optional timeout can be specified to reject the promise if the event doesn't
     * fire within the specified time period.
     *
     * @param lifecycleEvent - The lifecycle event to wait for
     * @param timeoutMs - Optional timeout in milliseconds. If specified and the event
     *                    doesn't fire within this time, the promise is rejected.
     * @returns A promise that resolves when the event fires or rejects on timeout
     *
     * @throws Error if the timeout is reached before the event fires
     *
     * @example
     * ```typescript
     * // Wait indefinitely for application.started
     * await bridge.awaitEvent("application.started");
     * console.log("Application has started!");
     *
     * // Wait with a 5-second timeout
     * try {
     *   await bridge.awaitEvent("persistence.started", 5000);
     *   console.log("Persistence layer initialized!");
     * } catch (err) {
     *   console.error("Timeout waiting for persistence.started");
     * }
     * ```
     */
    awaitEvent(lifecycleEvent: LifecycleType, timeoutMs?: number): Promise<void> {
        if (this.hasFired(lifecycleEvent)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const handler = () => {
                if (timeout) clearTimeout(timeout);
                resolve();
            };
            this.eventBus.once(lifecycleEvent.toString(), handler);

            let timeout: NodeJS.Timeout | undefined;
            if (timeoutMs && timeoutMs > 0) {
                timeout = setTimeout(() => {
                    this.eventBus.removeListener(lifecycleEvent.toString(), handler);
                    reject(new Error(`Timeout waiting for event '${lifecycleEvent}'`));
                }, timeoutMs);
            }
        });
    }

    /**
     * Cleanup method to prevent memory leaks by removing all listeners
     * and clearing the event bus when the application shuts down.
     *
     * This method should be called during application shutdown to ensure all
     * event listeners are properly removed and the event bus is cleared.
     *
     * After calling this method, the lifecycle bridge should not be used anymore
     * as it sets max listeners to 0 to prevent further additions.
     *
     * @example
     * ```typescript
     * // During application shutdown
     * bridge.cleanup();
     * ```
     */
    cleanup() {
        this.logger.debug("Cleaning up ApplicationLifecycleBridge resources");
        this.eventBus.removeAllListeners();
        // Set max listeners to 0 to prevent further additions
        this.eventBus.setMaxListeners(0);
        this.firedEvents.clear();
    }

    /**
     * Get the current number of listeners across all events for monitoring purposes.
     *
     * This can be useful for debugging, monitoring, or detecting potential memory leaks
     * where listeners are not being cleaned up properly.
     *
     * @returns The total number of active event listeners across all lifecycle events
     *
     * @example
     * ```typescript
     * const count = bridge.getListenerCount();
     * console.log(`Active listeners: ${count}`);
     * ```
     */
    getListenerCount(): number {
        return this.eventBus.eventNames().reduce((total, eventName) => {
            return total + this.eventBus.listenerCount(eventName);
        }, 0);
    }

    /**
     * Enqueue a lifecycle for adapter binding ensuring strict sequential processing.
     *
     * This is a CRITICAL method that prevents DI race conditions. When a lifecycle event
     * is emitted, this method adds it to the binding queue rather than immediately binding
     * adapters. This ensures that even if multiple lifecycle events fire in rapid succession,
     * their adapters are bound one at a time in the order they were emitted.
     *
     * After adding to the queue, it triggers the queue processor which will handle the
     * lifecycle if no other lifecycle is currently being processed.
     *
     * @param lifecycle - The lifecycle event to enqueue for adapter binding
     *
     * @see processLifecycleQueue for the sequential processing logic
     */
    private enqueueLifecycle(lifecycle: LifecycleType) {
        this.bindingQueue.push(lifecycle);
        this.processLifecycleQueue();
    }

    /**
     * Process the lifecycle binding queue sequentially.
     *
     * This is the HEART of the sequential binding mechanism. It ensures that only ONE
     * lifecycle's adapters are being bound at any given time, preventing DI race conditions.
     *
     * ## How It Works:
     *
     * 1. **Guard Check**: If a binding is already in progress, return immediately.
     *    This prevents concurrent execution.
     *
     * 2. **Dequeue**: Remove the next lifecycle from the queue. If queue is empty, return.
     *
     * 3. **Lock**: Set `bindingInProgress = true` to prevent other lifecycles from starting.
     *
     * 4. **Bind**: Call `applyLifecycle()` to bind all adapters for this lifecycle.
     *    This is awaited, so the next lifecycle won't start until this completes.
     *
     * 5. **Log**: Log success or error messages for monitoring.
     *
     * 6. **Unlock**: Set `bindingInProgress = false` to allow the next lifecycle to process.
     *
     * 7. **Continue**: If more lifecycles are queued, schedule the next one with `setImmediate()`
     *    to avoid deep recursion and give other async operations a chance to run.
     *
     * ## Example Scenario:
     *
     * ```
     * Queue: [application.initialized, application.started, persistence.started]
     *
     * Step 1: Dequeue application.initialized, lock, bind adapters (100ms)
     * Step 2: Unlock, dequeue application.started, lock, bind adapters (150ms)
     * Step 3: Unlock, dequeue persistence.started, lock, bind adapters (80ms)
     * Step 4: Unlock, queue empty, done
     * ```
     *
     * This ensures that even if `persistence.started` fires while `application.initialized`
     * is still binding, it waits its turn in the queue.
     *
     * @private
     */
    private async processLifecycleQueue() {
        if (this.bindingInProgress) return;
        const next = this.bindingQueue.shift();
        if (!next) return;
        this.bindingInProgress = true;
        try {
            await this.applyLifecycle(next);
            // Success log lines matching previous behavior
            if (next === "application.initialized") {
                this.logger.info(
                    `Lifecycle application feature adapters successfully bind after application.initialized event.`,
                );
            } else if (next === "application.started") {
                this.logger.info(
                    `Lifecycle application feature adapters successfully bind after application.started event.`,
                );
            } else if (next === "persistence.started") {
                this.logger.info(
                    `Lifecycle application feature adapters successfully bind after persistence.started event.`,
                );
            }
        } catch (err) {
            if (next === "application.initialized") {
                this.logger.error(
                    `Error during lifecycle application feature adapters bind after application.initialized event: ${err}`,
                );
            } else if (next === "application.started") {
                this.logger.error(
                    `Error during lifecycle application feature adapters bind after application.started event: ${err}`,
                );
            } else if (next === "persistence.started") {
                this.logger.error(
                    `Error during lifecycle application feature adapters bind after persistence.started event: ${err}`,
                );
            }
        } finally {
            this.bindingInProgress = false;
            // Continue with any remaining lifecycles queued while we were binding
            if (this.bindingQueue.length > 0) {
                // Schedule next tick to avoid deep recursion
                setImmediate(() => this.processLifecycleQueue());
            }
        }
    }

    /**
     * Set up lifecycle event listeners for the three main lifecycle phases.
     *
     * This method registers event handlers that enqueue lifecycle adapters for sequential
     * binding when events are emitted. It does NOT block or wait for events - it simply
     * sets up the listeners.
     *
     * ## Lifecycle Flow:
     *
     * 1. **application.initialized**: Fired when the application container is initialized.
     *    - Adapters here typically register core services and infrastructure.
     *
     * 2. **application.started**: Fired when the application/server has started.
     *    - Adapters here typically register HTTP clients, schedulers, etc.
     *    - If persistence is NOT activated, this also triggers persistence.started.
     *
     * 3. **persistence.started**: Fired when database is connected and migrations complete.
     *    - Adapters here typically register repositories, DAOs, etc.
     *    - This is emitted by the persistence module after DB initialization.
     *
     * ## Why Events Are Just Enqueued:
     *
     * Events can fire asynchronously and out of order (e.g., if DB connects very quickly,
     * persistence.started might fire before application.started adapters finish). By
     * enqueuing each event rather than immediately binding, we ensure strict sequential
     * execution regardless of event timing.
     *
     * ## Special Case - No Persistence:
     *
     * If the persistence layer is not activated, there's no persistence module to emit
     * the persistence.started event. In this case, we explicitly publish it after
     * application.started to ensure any persistence-lifecycle adapters still run.
     *
     * @example
     * ```typescript
     * const bridge = new ApplicationLifecycleBridge(logger, config);
     * await bridge.listen(); // Set up event listeners
     * // Now events can be published and will be processed sequentially
     * await bridge.publish("application.initialized");
     * ```
     */
    async listen() {
        // Each event just enqueues its lifecycle; actual binding will be strictly sequential regardless of emit timing
        this.eventBus.once("application.initialized", () => {
            this.enqueueLifecycle("application.initialized");
        });
        this.eventBus.once("application.started", () => {
            this.enqueueLifecycle("application.started");

            // IMPORTANT: If persistence layer is not activated, run persistence started lifecycle after app is running
            if (!ApplicationContext.get().applicationFeatures["persistence"]) {
                // Explicitly publish persistence.started event (will enqueue and wait its turn)
                this.publish("persistence.started");
            }
        });
        this.eventBus.once("persistence.started", () => {
            this.enqueueLifecycle("persistence.started");
        });
    }

    /**
     * Apply (bind) all feature adapters for a specific lifecycle event.
     *
     * This method retrieves all registered feature adapters for the given lifecycle from
     * the ApplicationContext and binds them to the IoC container. Each adapter's `bind()`
     * method is called with the container, config, and logger.
     *
     * ## What Happens During Binding:
     *
     * 1. Retrieve the IoC container from ApplicationContext
     * 2. Get all feature adapters registered for this lifecycle phase
     * 3. For each adapter, call its `bind()` method which:
     *    - Registers services in the DI container
     *    - Sets up configurations
     *    - Initializes resources
     * 4. Track successes and failures for logging
     * 5. After persistence.started, publish "application.adapters.bound" event
     *
     * ## Error Handling:
     *
     * If an adapter fails to bind, the error is logged but execution continues with
     * remaining adapters. This prevents one failing adapter from blocking the entire
     * application startup.
     *
     * ## Why This Runs Sequentially:
     *
     * This method is called by `processLifecycleQueue()` which ensures only ONE lifecycle
     * is being processed at a time. This prevents race conditions where:
     * - A persistence.started adapter tries to use an HTTP client
     * - But the application.started adapter that registers the HTTP client hasn't run yet
     *
     * By running sequentially, we guarantee that all `application.started` adapters finish
     * before any `persistence.started` adapters begin, ensuring dependencies are available.
     *
     * @param lifecycle - The lifecycle event whose adapters should be bound
     *
     * @example
     * ```typescript
     * // This is called internally by processLifecycleQueue
     * await this.applyLifecycle("application.started");
     * // All application.started adapters are now bound and services registered
     * ```
     */
    async applyLifecycle(lifecycle: LifecycleType) {
        this.logger.info("Applying lifecycle adapters for event: " + lifecycle);

        const iocContainer = ApplicationContext.getIocContainer();
        if (iocContainer) {
            const featureAdapters = ApplicationContext.getAppFeatureAdapters(lifecycle);
            this.logger.info(`Binding ${featureAdapters.length} ${lifecycle} Node-Boot Application Features`);
            let failedCount = 0;
            for (const featureAdapter of featureAdapters) {
                try {
                    await featureAdapter.bind({
                        iocContainer,
                        config: this.config,
                        logger: this.logger,
                    });
                } catch (e) {
                    this.logger.error(`Error binding feature adapter for lifecycle ${lifecycle}: ${e}`);
                    failedCount++;
                }
            }

            if (failedCount > 0) {
                this.logger.warn(
                    ` ${failedCount} of ${featureAdapters.length} "${lifecycle}" feature adapters failed to bind.`,
                );
            }
            this.logger.info(
                ` ${featureAdapters.length - failedCount} of ${
                    featureAdapters.length
                } "${lifecycle}" feature adapters bound successfully.`,
            );

            if (lifecycle === "persistence.started") {
                // Publish that adapters have been bound for this lifecycle event
                await this.publish("application.adapters.bound");
            }
        }
    }
}
