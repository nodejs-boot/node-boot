import {
    runOnTransactionCommit as innerRunOnTransactionCommit,
    runOnTransactionComplete as innerRunOnTransactionComplete,
    runOnTransactionRollback as innerRunOnTransactionRollback,
    wrapInTransaction,
    WrapInTransactionOptions,
} from "typeorm-transactional";

export const runOnTransactionCommit = (cb: () => void) => {
    return innerRunOnTransactionCommit(cb);
};

export const runOnTransactionRollback = (cb: (e: Error) => void) => {
    return innerRunOnTransactionRollback(cb);
};

export const runOnTransactionComplete = (cb: (e: Error | undefined) => void) => {
    return innerRunOnTransactionComplete(cb);
};

export const runInTransaction = <Func extends (this: unknown) => ReturnType<Func>>(
    fn: Func,
    options?: WrapInTransactionOptions,
) => {
    return wrapInTransaction(fn, options)();
};
