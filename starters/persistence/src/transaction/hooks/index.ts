import {EventEmitter} from "events";

import {getHookInContext, getTransactionalContext, getTransactionalOptions, setHookInContext} from "../common";
import {StorageDriver} from "../storage/driver/interface";

/**
 * Get the hook manager in current transactional context. This function should only be used in hook handlers, otherwise it will throw an error.
 *
 * @throws Will throw an error if there is no hook manager found in the current transactional context, which indicates that the function is being called outside of a transactional context or that the transactional context has not been properly initialized.
 * @returns The EventEmitter instance that manages the hooks for the current transactional context.
 * */
export const getTransactionalContextHook = () => {
    const context = getTransactionalContext();

    const emitter = getHookInContext(context);
    if (!emitter) {
        throw new Error("No hook manager found in context. Are you using @Transactional()?");
    }

    return emitter;
};

/**
 * Runs the given function and triggers the appropriate hooks based on the outcome of the function execution. If the function executes successfully, it will trigger the "commit" and "end" hooks. If the function throws an error, it will trigger the "rollback" and "end" hooks with the error as an argument.
 *
 * @param hook - The EventEmitter instance that manages the hooks for the current transactional context.
 * @param cb - The function to execute. This function can be asynchronous and may return a promise.
 * @returns The result of the executed function if it resolves successfully.
 * @throws The error thrown by the executed function if it rejects or throws an error.
 * */
export const runAndTriggerHooks = async (hook: EventEmitter, cb: () => unknown) => {
    try {
        const result = await Promise.resolve(cb());

        setImmediate(() => {
            hook.emit("commit");

            hook.emit("end", undefined);
            hook.removeAllListeners();
        });

        return result;
    } catch (err) {
        setImmediate(() => {
            hook.emit("rollback", err);

            hook.emit("end", err);
            hook.removeAllListeners();
        });

        throw err;
    }
};

/**
 * Creates a new EventEmitter instance for managing hooks in a new transactional context. The EventEmitter will have its maximum listeners set based on the configuration options for transactional hooks.
 *
 * @param _context - The storage driver instance for the new transactional context. This parameter is currently unused but may be used in future implementations to customize the EventEmitter based on the context.
 * @returns A new EventEmitter instance configured for managing hooks in a transactional context.
 * */
export const createEventEmitterInNewContext = (_context: StorageDriver) => {
    const options = getTransactionalOptions();

    const emitter = new EventEmitter();
    emitter.setMaxListeners(options.maxHookHandlers);
    return emitter;
};

/**
 * */
export const runInNewHookContext = async (context: StorageDriver, cb: () => unknown) => {
    const hook = createEventEmitterInNewContext(context);

    return await context.run(() => {
        setHookInContext(context, hook);

        return runAndTriggerHooks(hook, cb);
    });
};
