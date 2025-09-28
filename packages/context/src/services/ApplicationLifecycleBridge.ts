import EventEmitter from "node:events";
import {LifecycleType} from "../types";
import {ApplicationContext} from "../ApplicationContext";
import {Logger} from "winston";
import {Config} from "./Config";

export class ApplicationLifecycleBridge {
    constructor(
        private readonly logger: Logger,
        private readonly config: Config,
        private readonly eventBus: EventEmitter = new EventEmitter(),
    ) {}

    async publish(lifecycleEvent: LifecycleType) {
        this.eventBus.emit(lifecycleEvent);
    }

    getEventBus() {
        return this.eventBus;
    }

    subscribe(eventName: string, listener: Function) {
        this.eventBus.once(eventName, () => {
            listener();
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
            this.applyLifecycle("application.initialized");
        });
        this.eventBus.once("application.started", () => {
            this.applyLifecycle("application.started");

            // IMPORTANT: If persistence layer is not activated, run persistence started lifecycle after app is running
            if (!ApplicationContext.get().applicationFeatures["persistence"]) {
                this.applyLifecycle("persistence.started");
            }
        });
        this.eventBus.once("persistence.started", () => {
            this.applyLifecycle("persistence.started");
        });
    }

    applyLifecycle(lifecycle: LifecycleType) {
        const iocContainer = ApplicationContext.getIocContainer();
        if (iocContainer) {
            const featureAdapters = ApplicationContext.getAppFeatureAdapters(lifecycle);
            this.logger.info(`Binding ${featureAdapters.length} ${lifecycle} Node-Boot Application Features`);
            for (const featureAdapter of featureAdapters) {
                featureAdapter.bind({
                    iocContainer,
                    config: this.config,
                    logger: this.logger,
                });
            }
        }
    }
}
