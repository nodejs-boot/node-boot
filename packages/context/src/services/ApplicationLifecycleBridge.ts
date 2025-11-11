import EventEmitter from "node:events";
import {LifecycleType} from "../types";
import {ApplicationContext} from "../ApplicationContext";
import {Logger} from "winston";
import {Config} from "./Config";

export class ApplicationLifecycleBridge {
    // Track lifecycle events that have already been published so late subscribers can still react immediately
    private readonly firedEvents = new Set<string>();

    constructor(
        private readonly logger: Logger,
        private readonly config: Config,
        private readonly eventBus: EventEmitter = new EventEmitter(),
    ) {}

    async publish(lifecycleEvent: LifecycleType) {
        // Mark fired before emitting to avoid race conditions with late subscriptions right after publish invocation
        this.firedEvents.add(lifecycleEvent.toString());
        this.eventBus.emit(lifecycleEvent);
    }

    getEventBus() {
        return this.eventBus;
    }

    hasFired(lifecycleEvent: LifecycleType): boolean {
        return this.firedEvents.has(lifecycleEvent.toString());
    }

    subscribe(eventName: string, listener: Function) {
        // If already fired, invoke immediately (microtask scheduling not strictly needed here)
        if (this.firedEvents.has(eventName)) {
            listener();
            return;
        }
        this.eventBus.once(eventName, listener as () => void);
    }

    /**
     * Await the first occurrence of a lifecycle event.
     * Optional timeout (ms) will reject the Promise if the event does not fire.
     * If the event has already fired, resolves immediately.
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
     * and clearing the event bus when the application shuts down
     */
    cleanup() {
        this.logger.debug("Cleaning up ApplicationLifecycleBridge resources");
        this.eventBus.removeAllListeners();
        // Set max listeners to 0 to prevent further additions
        this.eventBus.setMaxListeners(0);
        this.firedEvents.clear();
    }

    /**
     * Get the current number of listeners for monitoring purposes
     */
    getListenerCount(): number {
        return this.eventBus.eventNames().reduce((total, eventName) => {
            return total + this.eventBus.listenerCount(eventName);
        }, 0);
    }

    async listen() {
        this.eventBus.once("application.initialized", () => {
            this.applyLifecycle("application.initialized")
                .then(_ =>
                    this.logger.info(
                        `Lifecycle application feature adapters successfully bind after application.initialized event.`,
                    ),
                )
                .catch(err =>
                    this.logger.error(
                        `Error during lifecycle application feature adapters bind after application.initialized event: ${err}`,
                    ),
                );
        });
        this.eventBus.once("application.started", () => {
            this.applyLifecycle("application.started")
                .then(_ =>
                    this.logger.info(
                        `Lifecycle application feature adapters successfully bind after application.started event.`,
                    ),
                )
                .catch(err =>
                    this.logger.error(
                        `Error during lifecycle application feature adapters bind after application.started event: ${err}`,
                    ),
                );

            // IMPORTANT: If persistence layer is not activated, run persistence started lifecycle after app is running
            if (!ApplicationContext.get().applicationFeatures["persistence"]) {
                // Explicitly publish persistence.started event
                this.publish("persistence.started");
            }
        });
        this.eventBus.once("persistence.started", () => {
            this.applyLifecycle("persistence.started")
                .then(_ =>
                    this.logger.info(
                        `Lifecycle application feature adapters successfully bind after persistence.started event.`,
                    ),
                )
                .catch(err =>
                    this.logger.error(
                        `Error during lifecycle application feature adapters bind after persistence.started event: ${err}`,
                    ),
                );
        });
    }

    async applyLifecycle(lifecycle: LifecycleType) {
        this.logger.info("Applying lifecycle adapters for event: " + lifecycle);

        const iocContainer = ApplicationContext.getIocContainer();
        if (iocContainer) {
            const featureAdapters = ApplicationContext.getAppFeatureAdapters(lifecycle);
            this.logger.info(`Binding ${featureAdapters.length} ${lifecycle} Node-Boot Application Features`);
            for (const featureAdapter of featureAdapters) {
                await featureAdapter.bind({
                    iocContainer,
                    config: this.config,
                    logger: this.logger,
                });
            }

            if (lifecycle === "persistence.started") {
                this.logger.info("All persistence.started lifecycle adapters have been bound.");
                // Publish that adapters have been bound for this lifecycle event
                await this.publish("application.adapters.bound");
            }
        }
    }
}
