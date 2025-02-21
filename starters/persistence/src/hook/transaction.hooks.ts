import {
    runOnTransactionCommit as innerRunOnTransactionCommit,
    runOnTransactionComplete as innerRunOnTransactionComplete,
    runOnTransactionRollback as innerRunOnTransactionRollback,
    wrapInTransaction,
    WrapInTransactionOptions,
} from "typeorm-transactional";

/**
 * Registers a callback to be executed when the current transaction is successfully committed.
 *
 * @param cb - The callback function to execute on transaction commit.
 */
export const runOnTransactionCommit = (cb: () => void) => {
    return innerRunOnTransactionCommit(cb);
};

/**
 * Registers a callback to be executed when the current transaction is rolled back.
 *
 * @param cb - The callback function that receives the error that caused the rollback.
 */
export const runOnTransactionRollback = (cb: (e: Error) => void) => {
    return innerRunOnTransactionRollback(cb);
};

/**
 * Registers a callback to be executed when the current transaction is either committed or rolled back.
 *
 * @param cb - The callback function that receives an optional error (if the transaction was rolled back).
 */
export const runOnTransactionComplete = (cb: (e: Error | undefined) => void) => {
    return innerRunOnTransactionComplete(cb);
};

/**
 * Executes a given function within a transaction.
 *
 * @template F - The function type to be executed inside the transaction.
 * @param fn - The function to be executed within the transaction.
 * @param options - Optional transaction options (e.g., isolation level, propagation).
 * @returns The result of the function execution within the transaction.
 */
export const runInTransaction = <F extends (this: unknown) => ReturnType<F>>(
    fn: F,
    options?: WrapInTransactionOptions,
) => {
    return wrapInTransaction(fn, options)();
};
