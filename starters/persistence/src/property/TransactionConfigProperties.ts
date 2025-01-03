import {StorageDriver} from "typeorm-transactional/dist/enums/storage-driver";

export interface TransactionConfigProperties {
    /**
     * Controls how many hooks (`commit`, `rollback`, `complete`) can be used simultaneously.
     * If you exceed the number of hooks of same type, you get a warning. This is a useful to find possible memory leaks.
     * You can set this options to `0` or `Infinity` to indicate an unlimited number of listeners.
     */
    maxHookHandlers?: number;
    /**
     * Controls storage driver used for providing persistency during the async request timespan.
     * You can force any of the available drivers with this option.
     * By default, the modern AsyncLocalStorage will be preferred, if it is supported by your runtime.
     */
    storageDriver?: StorageDriver;
}
