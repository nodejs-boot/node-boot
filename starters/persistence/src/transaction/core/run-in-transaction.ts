import {wrapInTransaction, WrapInTransactionOptions} from "./wrap-in-transaction";

/**
 * Executes a function within a transaction. The transaction will be started before the function is called and committed after the function is called.
 * If the function throws an error, the transaction will be rolled back.
 *
 * The transaction propagation behavior can be configured using the `propagation` option. By default, it is set to `REQUIRED`, which means that if there is an existing transaction, the function will run within that transaction; otherwise, a new transaction will be started.
 * The transaction isolation level can be configured using the `isolationLevel` option. If not specified, the default isolation level of the database will be used.
 * */
export const runInTransaction = <Func extends (this: unknown) => ReturnType<Func>>(
    fn: Func,
    options?: WrapInTransactionOptions,
) => {
    return wrapInTransaction(fn, options)();
};
