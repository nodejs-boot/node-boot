import {MongoQueryRunner} from "typeorm/driver/mongodb/MongoQueryRunner";
import {ClientSession} from "typeorm/driver/mongodb/typings";

type UnknownOptions = Record<string, unknown> | undefined;

/**
 * Mongo query runner with transaction and session propagation support.
 */
export class MongoTransactionalQueryRunner extends MongoQueryRunner {
    private session?: ClientSession;
    private transactionDepth = 0;

    /**
     * Exposes the current active session for advanced use-cases.
     */
    get activeSession(): ClientSession | undefined {
        return this.session;
    }

    override async release(): Promise<void> {
        // MongoDB uses a singleton query runner; releasing must be a no-op.
        // Cleaning session here can break outer transactions when internal operations call release().
    }

    override async [Symbol.asyncDispose](): Promise<void> {
        // Keep consistent with release() no-op semantics for MongoDB driver.
    }

    override async startTransaction(): Promise<void> {
        if (this.isReleased) {
            throw new Error("Cannot start transaction because query runner is released.");
        }

        if (this.isTransactionActive) {
            this.transactionDepth += 1;
            return;
        }

        const session = this.databaseConnection.startSession();
        this.session = session;

        try {
            await this.broadcaster.broadcast("BeforeTransactionStart");
            session.startTransaction();
            this.isTransactionActive = true;
            this.transactionDepth = 1;
            await this.broadcaster.broadcast("AfterTransactionStart");
        } catch (error) {
            await this.cleanupSession();
            throw error;
        }
    }

    override async commitTransaction(): Promise<void> {
        if (!this.isTransactionActive || !this.session) {
            throw new Error("Transaction is not started yet.");
        }

        if (this.transactionDepth > 1) {
            this.transactionDepth -= 1;
            return;
        }

        try {
            await this.broadcaster.broadcast("BeforeTransactionCommit");
            await this.session.commitTransaction();
            await this.broadcaster.broadcast("AfterTransactionCommit");
        } finally {
            this.isTransactionActive = false;
            this.transactionDepth = 0;
            await this.cleanupSession();
        }
    }

    override async rollbackTransaction(): Promise<void> {
        if (!this.isTransactionActive || !this.session) {
            throw new Error("Transaction is not started yet.");
        }

        try {
            await this.broadcaster.broadcast("BeforeTransactionRollback");
            await this.session.abortTransaction();
            await this.broadcaster.broadcast("AfterTransactionRollback");
        } finally {
            this.isTransactionActive = false;
            this.transactionDepth = 0;
            await this.cleanupSession();
        }
    }

    /**
     * Returns a session-aware collection so all runner operations automatically join the active session.
     */
    protected override getCollection(collectionName: string): any {
        const collection = super.getCollection(collectionName);

        if (!this.isTransactionActive || !this.session) {
            return collection;
        }

        return new Proxy(collection, {
            get: (target, propertyKey, receiver) => {
                const original = Reflect.get(target, propertyKey, receiver);
                if (typeof original !== "function") {
                    return original;
                }

                return (...args: unknown[]) => {
                    const method = String(propertyKey);
                    const optionsIndex = this.getOptionsIndex(method);
                    if (optionsIndex >= 0) {
                        const nextArgs = [...args];
                        nextArgs[optionsIndex] = this.withSession(nextArgs[optionsIndex] as UnknownOptions);
                        return original.apply(target, nextArgs);
                    }

                    return original.apply(target, args);
                };
            },
        });
    }

    private getOptionsIndex(method: string): number {
        switch (method) {
            case "aggregate":
            case "bulkWrite":
            case "count":
            case "countDocuments":
            case "createIndex":
            case "deleteMany":
            case "deleteOne":
            case "dropIndex":
            case "find":
            case "findOne":
            case "findOneAndDelete":
            case "insertMany":
            case "insertOne":
            case "rename":
            case "watch":
                return 1;
            case "distinct":
            case "findOneAndReplace":
            case "findOneAndUpdate":
            case "replaceOne":
            case "updateMany":
            case "updateOne":
                return 2;
            case "indexInformation":
            case "initializeOrderedBulkOp":
            case "initializeUnorderedBulkOp":
            case "listIndexes":
                return 0;
            default:
                return -1;
        }
    }

    private withSession(options: UnknownOptions): Record<string, unknown> {
        if (!this.session) {
            return (options ?? {}) as Record<string, unknown>;
        }

        if (!options) {
            return {session: this.session};
        }

        if (typeof options === "object" && !Array.isArray(options)) {
            return {
                ...options,
                session: (options as Record<string, unknown>)["session"] ?? this.session,
            };
        }

        return {session: this.session};
    }

    private async cleanupSession(): Promise<void> {
        if (!this.session) {
            return;
        }

        try {
            if (this.isTransactionActive) {
                await this.session.abortTransaction();
            }
        } finally {
            await this.session.endSession();
            this.session = undefined;
            this.isTransactionActive = false;
            this.transactionDepth = 0;
        }
    }
}
