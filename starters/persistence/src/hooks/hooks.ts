import {
    runOnTransactionCommit as innerRunOnTransactionCommit,
    runOnTransactionComplete as innerRunOnTransactionComplete,
    runOnTransactionRollback as innerRunOnTransactionRollback,
} from "typeorm-transactional";

export const runOnTransactionCommit = (cb: () => void) => {
    return innerRunOnTransactionCommit(cb);
};

export const runOnTransactionRollback = (cb: (e: Error) => void) => {
    return innerRunOnTransactionRollback(cb);
};

export const runOnTransactionComplete = (
    cb: (e: Error | undefined) => void,
) => {
    return innerRunOnTransactionComplete(cb);
};
