import {EntityManager} from "typeorm";
import {
    DataSourceName,
    getDataSourceByName,
    getEntityManagerByDataSourceName,
    getTransactionalContext,
    setEntityManagerByDataSourceName,
} from "../common";

import {IsolationLevel} from "../enums/isolation-level";
import {Propagation} from "../enums/propagation";
import {TransactionalError} from "../errors/transactional";
import {runInNewHookContext} from "../hooks";

export interface WrapInTransactionOptions {
    /**
     * Name of the transactional data source (defaults to `default`)
     */
    connectionName?: DataSourceName;

    propagation?: Propagation;

    isolationLevel?: IsolationLevel;

    name?: string | symbol;
}

/**
 * Wraps a function in a transaction. The transaction will be started before the function is called and committed after the function is called.
 * If the function throws an error, the transaction will be rolled back.
 *
 * The transaction propagation behavior can be configured using the `propagation` option. By default, it is set to `REQUIRED`, which means that if there is an existing transaction, the function will run within that transaction; otherwise, a new transaction will be started.
 *
 * The transaction isolation level can be configured using the `isolationLevel` option. If not specified, the default isolation level of the database will be used.
 *
 * @param fn - The function to wrap in a transaction.
 * @param options - Optional configuration for the transaction.
 * @returns A new function that wraps the original function in a transaction.
 * */
export const wrapInTransaction = <Fn extends (this: any, ...args: any[]) => ReturnType<Fn>>(
    fn: Fn,
    options?: WrapInTransactionOptions,
) => {
    function wrapper(this: unknown, ...args: unknown[]) {
        const context = getTransactionalContext();
        if (!context) {
            throw new Error(
                "No transactional context defined in your app ... please call initializeTransactionalContext() before application start.",
            );
        }

        const connectionName = options?.connectionName ?? "default";

        const dataSource = getDataSourceByName(connectionName);
        if (!dataSource) {
            throw new Error(
                "No data sources defined in your app ... please call addTransactionalDataSources() before application start.",
            );
        }

        const propagation = options?.propagation ?? Propagation.REQUIRED;
        const isolationLevel = options?.isolationLevel;

        /**
         * Runs the original function within a new hook context without a transaction. This is used for propagation behaviors that require running the function outside of a transaction (e.g., `NEVER`, `NOT_SUPPORTED`) or when there is no existing transaction and the propagation behavior allows running without a transaction (e.g., `SUPPORTS`).
         * The hooks will be properly triggered for the new context, but no transaction will be started. This allows the function to run without a transaction while still allowing hooks to be used if needed.
         *
         * Note: If the original function is an async function, it must be awaited to ensure that any hooks that are triggered within the function are properly handled before the function completes.
         * */
        const runOriginal = () => fn.apply(this, args);

        /**
         * Runs the original function within a new hook context without a transaction. This is used for propagation behaviors that require running the function outside of a transaction (e.g., `NEVER`, `NOT_SUPPORTED`) or when there is no existing transaction and the propagation behavior allows running without a transaction (e.g., `SUPPORTS`).
         * The hooks will be properly triggered for the new context, but no transaction will be started. This allows the function to run without a transaction while still allowing hooks to be used if needed.
         *
         * Note: If the original function is an async function, it must be awaited to ensure that any hooks that are triggered within the function are properly handled before the function completes.
         * */
        const runWithNewHook = () => runInNewHookContext(context, runOriginal);

        /**
         * Runs the original function within a new transaction. The transaction will be committed if the function succeeds and rolled back if it throws an error.
         * The transaction will be started with the specified isolation level if provided, otherwise it will use the default isolation level of the database.
         * The transaction will be started in a new hook context to ensure that hooks are properly triggered for the new transaction.
         * The entity manager for the new transaction will be set in the transactional context before running the original function and cleared after the function is executed to avoid leaking the transaction to other functions that might run in the same context.
         *
         * Note: If the original function is an async function, it must be awaited to ensure that the transaction is properly committed or rolled back based on the outcome of the function.
         * */
        const runWithNewTransaction = () => {
            const transactionCallback = async (entityManager: EntityManager) => {
                setEntityManagerByDataSourceName(context, connectionName, entityManager);

                try {
                    // It must be awaited in case the origin function is an async function
                    return await runOriginal();
                } finally {
                    setEntityManagerByDataSourceName(context, connectionName, null);
                }
            };

            if (isolationLevel) {
                return runInNewHookContext(context, () => {
                    return dataSource.transaction(isolationLevel, transactionCallback);
                });
            } else {
                return runInNewHookContext(context, () => {
                    return dataSource.transaction(transactionCallback);
                });
            }
        };

        /**
         * The main logic for handling transaction propagation behaviors. It checks the current transaction in the context and decides how to run the original function based on the specified propagation behavior.
         *
         * For `MANDATORY`, it requires an existing transaction and throws an error if none is found.
         * For `NESTED`, it always runs the function within a new transaction.
         * For `NEVER`, it requires that there is no existing transaction and throws an error if one is found.
         * For `NOT_SUPPORTED`, it runs the function outside of a transaction, suspending any existing transaction if necessary.
         * For `REQUIRED`, it runs the function within the existing transaction if one exists, or starts a new transaction if none exists.
         * For `REQUIRES_NEW`, it always runs the function within a new transaction, suspending any existing transaction if necessary.
         * For `SUPPORTS`, it runs the function within the existing transaction if one exists, or runs it outside of a transaction if none exists.
         * */
        return context.run(async () => {
            const currentTransaction = getEntityManagerByDataSourceName(context, connectionName);
            switch (propagation) {
                case Propagation.MANDATORY:
                    if (!currentTransaction) {
                        throw new TransactionalError(
                            "No existing transaction found for transaction marked with propagation 'MANDATORY'",
                        );
                    }

                    return runOriginal();

                case Propagation.NESTED:
                    return runWithNewTransaction();

                case Propagation.NEVER:
                    if (currentTransaction) {
                        throw new TransactionalError(
                            "Found an existing transaction, transaction marked with propagation 'NEVER'",
                        );
                    }

                    return runWithNewHook();

                case Propagation.NOT_SUPPORTED:
                    if (currentTransaction) {
                        setEntityManagerByDataSourceName(context, connectionName, null);
                        const result = await runWithNewHook();
                        setEntityManagerByDataSourceName(context, connectionName, currentTransaction);

                        return result;
                    }

                    return runOriginal();

                case Propagation.REQUIRED:
                    if (currentTransaction) {
                        return runOriginal();
                    }

                    return runWithNewTransaction();

                case Propagation.REQUIRES_NEW:
                    return runWithNewTransaction();

                case Propagation.SUPPORTS:
                    return currentTransaction ? runOriginal() : runWithNewHook();
            }
        });
    }

    return wrapper as Fn;
};
