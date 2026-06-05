/**
 * Configuration options for transaction hook behavior.
 *
 * Controls limits during the transactional lifecycle.
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
}
