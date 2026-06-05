import {AsyncLocalStorageDriver} from "./driver/als";
import type {StorageDriver} from "./driver/interface";

export class Storage {
    private driver: StorageDriver;

    public create() {
        if (this.driver) {
            // We probably should not allow calling this function when driver is already defined
            return this.driver;
        }

        this.driver = new AsyncLocalStorageDriver();

        return this.driver;
    }

    public get() {
        if (!this.driver) {
            throw new Error(
                "No transactional storage defined in your app ... please call initializeTransactionalContext() before application start.",
            );
        }

        return this.driver;
    }
}
