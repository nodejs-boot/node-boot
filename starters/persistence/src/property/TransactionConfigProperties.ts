import {StorageDriver} from "typeorm-transactional/dist/enums/storage-driver";

/**
 * Configuration options for transaction hooks and storage driver behavior.
 *
 * Controls limits and persistence mechanisms during transactional lifecycle.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export interface TransactionConfigProperties {
    /**
     * Maximum number of allowed simultaneous hook handlers of the same type
     * (`commit`, `rollback`, `complete`).
     *
     * Exceeding this limit triggers a warning to help detect potential memory leaks.
     *
     * To allow unlimited handlers, set this to `0` or `Infinity`.
     *
     * @default undefined (no explicit limit)
     */
    maxHookHandlers?: number;

    /**
     * Storage driver used to persist transaction context across asynchronous operations.
     *
     * Defaults to using modern `AsyncLocalStorage` if supported by the runtime.
     * You can override this setting to force a specific storage driver.
     *
     * @default StorageDriver.ASYNC_LOCAL_STORAGE (if supported)
     */
    storageDriver?: StorageDriver;
}
