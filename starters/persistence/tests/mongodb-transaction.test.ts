import {ObjectId} from "mongodb";
import {Column, DataSource, Entity, ObjectIdColumn} from "typeorm";
import {
    addTransactionalDataSource,
    initializeTransactionalContext,
    Propagation,
    runInTransaction,
    TransactionalError,
} from "../src/transaction";
import {MongoTransactionalQueryRunner} from "../src/transaction/mongodb/MongoTransactionalQueryRunner";
import {sleep} from "./utils";
import {runOnTransactionCommit, runOnTransactionComplete, runOnTransactionRollback} from "../src";
import {after, afterEach, before, describe, test} from "node:test";
import * as assert from "node:assert";

@Entity("users")
class MongoUser {
    @ObjectIdColumn()
    _id?: ObjectId;

    @Column()
    name: string;

    @Column()
    money: number;

    constructor(name: string, money: number) {
        this.name = name;
        this.money = money;
    }
}

const getCurrentSessionId = (dataSource: DataSource): string | null => {
    const queryRunner = (dataSource.driver as any)?.queryRunner;
    const session = queryRunner?.activeSession ?? queryRunner?.session;
    const sessionRawId = session?.id?.id ?? session?.id;

    if (!sessionRawId) {
        return null;
    }

    return Buffer.isBuffer(sessionRawId) ? sessionRawId.toString("hex") : JSON.stringify(sessionRawId);
};

const setupMongoTransactionalRunner = (dataSource: DataSource) => {
    if (dataSource.options.type !== "mongodb") {
        return;
    }

    const mongoDriver = dataSource.driver as any;
    const mongoClient = mongoDriver.queryRunner?.databaseConnection;
    if (!mongoClient) {
        return;
    }

    const queryRunner = new MongoTransactionalQueryRunner(dataSource, mongoClient);
    Object.assign(queryRunner, {manager: dataSource.manager});
    (mongoDriver as any).queryRunner = queryRunner;
};

/**
 * MongoDB transactional tests aligned with core Postgres behavior.
 */
describe("MongoDB Transactional (NodeBoot)", () => {
    const dataSource: DataSource = new DataSource({
        type: "mongodb",
        url: "mongodb://localhost:27017/test?replicaSet=rs0",
        entities: [MongoUser],
        synchronize: false,
    });

    initializeTransactionalContext();
    addTransactionalDataSource({
        dataSource,
        patch: false,
    });

    let transactionsSupported = false;
    let dataSourceInitialized = false;
    let mongoConnectionAvailable = false;

    const userRepository = () => dataSource.getMongoRepository(MongoUser);

    before(async () => {
        try {
            await Promise.race([
                dataSource.initialize(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("MongoDB connection timeout")), 8000)),
            ]);

            setupMongoTransactionalRunner(dataSource);

            dataSourceInitialized = true;
            mongoConnectionAvailable = true;

            // Probe if the configured MongoDB deployment can start sessions and transactions.
            try {
                await Promise.race([
                    runInTransaction(async () => {
                        await userRepository().findOne({where: {name: "__tx_probe__"}});
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Transaction probe timeout")), 3000)),
                ]);
                transactionsSupported = true;
            } catch (error) {
                console.warn("Transactions not supported:", (error as Error)?.message);
                transactionsSupported = false;
            }
        } catch (error) {
            console.warn("MongoDB not available:", (error as Error)?.message);
            mongoConnectionAvailable = false;
            transactionsSupported = false;
        }
    });

    after(async () => {
        try {
            if (dataSourceInitialized && dataSource.isInitialized) {
                await Promise.race([
                    userRepository().deleteMany({}),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("DeleteMany timeout")), 5000)),
                ]);
            }
        } catch (error) {
            // Ignore cleanup errors
        }

        if (dataSourceInitialized && dataSource.isInitialized) {
            try {
                await Promise.race([
                    dataSource.destroy(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Destroy timeout")), 5000)),
                ]);
            } catch (error) {
                // Ignore destroy errors
            }
        }
    });

    afterEach(async () => {
        try {
            if (dataSourceInitialized && dataSource.isInitialized) {
                await Promise.race([
                    userRepository().deleteMany({}),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("AfterEach deleteMany timeout")), 5000),
                    ),
                ]);
            }
        } catch (error) {
            // Ignore cleanup errors in afterEach
        }
    });

    test("supports basic transactions", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        let sessionIdDuringTx: string | null = null;

        await Promise.race([
            (async () => {
                await runInTransaction(async () => {
                    await userRepository().save(new MongoUser("John Doe", 100));
                    sessionIdDuringTx = getCurrentSessionId(dataSource);
                    const userInTx = await userRepository().findOne({where: {name: "John Doe"}});
                    const sessionIdAfterRead = getCurrentSessionId(dataSource);

                    assert.ok(sessionIdDuringTx, "Session ID should exist after first operation in transaction");
                    assert.strictEqual(sessionIdDuringTx, sessionIdAfterRead);
                    assert.ok(userInTx);
                });

                // A Mongo driver can keep a reusable session object attached to the singleton runner.
                // What matters is that no transaction remains active after the callback resolves.
                assert.strictEqual((dataSource.driver as any)?.queryRunner?.isTransactionActive, false);

                const user = await userRepository().findOne({where: {name: "John Doe"}});
                assert.ok(user, "User should be found after commit");
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("rolls back transaction when an error is thrown", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        await Promise.race([
            (async () => {
                await assert.rejects(async () => {
                    await runInTransaction(async () => {
                        await userRepository().save(new MongoUser("John Doe", 100));
                        throw new Error("Rollback transaction");
                    });
                });

                const user = await userRepository().findOne({where: {name: "John Doe"}});
                assert.strictEqual(user, null);
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("supports nested REQUIRED propagation", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        await Promise.race([
            (async () => {
                await runInTransaction(async () => {
                    const sessionIdBefore = getCurrentSessionId(dataSource);

                    await runInTransaction(
                        async () => {
                            const sessionIdAfter = getCurrentSessionId(dataSource);
                            assert.strictEqual(sessionIdBefore, sessionIdAfter);
                        },
                        {propagation: Propagation.REQUIRED},
                    );
                });
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("throws with MANDATORY propagation when no active transaction exists", async () => {
        await Promise.race([
            assert.rejects(
                () => runInTransaction(() => userRepository().find(), {propagation: Propagation.MANDATORY}),
                TransactionalError,
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("throws with NEVER propagation when active transaction exists", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        await Promise.race([
            (async () => {
                await runInTransaction(async () => {
                    await assert.rejects(
                        () => runInTransaction(() => userRepository().find(), {propagation: Propagation.NEVER}),
                        TransactionalError,
                    );
                });
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("runs runOnTransactionCommit hook", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        await Promise.race([
            (async () => {
                const commitSpy = {
                    called: 0,
                    fn: function () {
                        this.called++;
                    },
                };

                await runInTransaction(async () => {
                    await userRepository().save(new MongoUser("John Doe", 100));
                    runOnTransactionCommit(() => commitSpy.fn());
                });

                await sleep(1);

                assert.strictEqual(commitSpy.called, 1);
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("runs runOnTransactionRollback hook", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        await Promise.race([
            (async () => {
                const rollbackSpy = {
                    called: 0,
                    fn: function () {
                        this.called++;
                    },
                };

                await assert.rejects(async () => {
                    await runInTransaction(async () => {
                        runOnTransactionRollback(() => rollbackSpy.fn());
                        await userRepository().save(new MongoUser("John Doe", 100));
                        throw new Error("Rollback transaction");
                    });
                });

                await sleep(1);

                assert.strictEqual(rollbackSpy.called, 1);
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });

    test("runs runOnTransactionComplete hook", async t => {
        if (!mongoConnectionAvailable) {
            t.skip("MongoDB is not available for testing");
            return;
        }

        if (!transactionsSupported) {
            t.skip("Mongo deployment does not support transactions (replica set/session unavailable)");
            return;
        }

        await Promise.race([
            (async () => {
                const completeSpy = {
                    called: 0,
                    fn: function () {
                        this.called++;
                    },
                };

                await runInTransaction(async () => {
                    await userRepository().save(new MongoUser("John Doe", 100));
                    runOnTransactionComplete(() => completeSpy.fn());
                });

                await sleep(1);

                assert.strictEqual(completeSpy.called, 1);
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 10000)),
        ]);
    });
});
