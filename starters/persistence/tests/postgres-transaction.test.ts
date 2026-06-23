import {DataSource} from "typeorm";
import {
    addTransactionalDataSource,
    initializeTransactionalContext,
    IsolationLevel,
    Propagation,
    runInTransaction,
    TransactionalError,
} from "../src/transaction";
import {sleep, getCurrentTransactionId} from "./utils";
import {runOnTransactionCommit, runOnTransactionComplete, runOnTransactionRollback} from "../src";
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import {Counter, User, UserRepository} from "./setup/postgres.setup";

/**
 * NodeBoot Transaction Tests
 * Tests the transactional context, propagation, hooks, and isolation levels
 */
describe("Postgres Transactional (NodeBoot)", () => {
    // Database setup
    const dataSource: DataSource = new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5435,
        username: "postgres",
        password: "postgres",
        database: "test",
        entities: [User, Counter],
        synchronize: true,
    });

    // Initialize transactional context
    initializeTransactionalContext();
    addTransactionalDataSource(dataSource);

    before(async () => {
        await dataSource.initialize();
    });

    after(async () => {
        await dataSource.createEntityManager().clear(User);
        await dataSource.createEntityManager().clear(Counter);
        await dataSource.destroy();
    });

    afterEach(async () => {
        await dataSource.createEntityManager().clear(User);
        await dataSource.createEntityManager().clear(Counter);
    });

    describe("General", () => {
        const sources = [
            {
                name: "DataSource",
                source: dataSource,
            },
            {
                name: "Repository",
                source: dataSource.getRepository(User),
            },
            {
                name: "Entity Manager",
                source: dataSource.createEntityManager(),
            },
            {
                name: "Custom Repository",
                source: new UserRepository(dataSource),
            },
            {
                name: "Query Builder",
                source: () => dataSource.createQueryBuilder(),
            },
        ];

        sources.forEach(({name, source}) => {
            describe(name, () => {
                test("supports basic transactions", async () => {
                    let transactionIdBefore: number | null = null;

                    await runInTransaction(async () => {
                        transactionIdBefore = await getCurrentTransactionId(source);
                        const transactionIdAfter = await getCurrentTransactionId(source);

                        assert.ok(transactionIdBefore, "Transaction ID should exist");
                        assert.strictEqual(transactionIdBefore, transactionIdAfter);
                    });

                    const transactionIdOutside = await getCurrentTransactionId(source);
                    assert.strictEqual(transactionIdOutside, null);
                    assert.notStrictEqual(transactionIdOutside, transactionIdBefore);
                });

                test("supports nested transactions", async () => {
                    await runInTransaction(async () => {
                        const transactionIdBefore = await getCurrentTransactionId(source);

                        await runInTransaction(async () => {
                            const transactionIdAfter = await getCurrentTransactionId(source);
                            assert.strictEqual(transactionIdBefore, transactionIdAfter);
                        });
                    });
                });

                test("supports several concurrent transactions", async () => {
                    let transactionA: number | null = null;
                    let transactionB: number | null = null;
                    let transactionC: number | null = null;

                    await Promise.all([
                        runInTransaction(async () => {
                            transactionA = await getCurrentTransactionId(source);
                        }),
                        runInTransaction(async () => {
                            transactionB = await getCurrentTransactionId(source);
                        }),
                        runInTransaction(async () => {
                            transactionC = await getCurrentTransactionId(source);
                        }),
                    ]);

                    assert.ok(transactionA, "Transaction A should exist");
                    assert.ok(transactionB, "Transaction B should exist");
                    assert.ok(transactionC, "Transaction C should exist");

                    assert.notStrictEqual(transactionA, transactionB);
                    assert.notStrictEqual(transactionA, transactionC);
                    assert.notStrictEqual(transactionB, transactionC);
                });
            });
        });

        describe("Repository", () => {
            test("should not create any intermediate transactions", async () => {
                let transactionIdA: number | null = null;
                let transactionIdB: number | null = null;

                const userRepository = dataSource.getRepository(User);

                await runInTransaction(async () => {
                    transactionIdA = await getCurrentTransactionId(dataSource);
                    await userRepository.save(new User("John Doe", 100));
                });

                await runInTransaction(async () => {
                    transactionIdB = await getCurrentTransactionId(dataSource);
                });

                const transactionDiff = transactionIdB! - transactionIdA!;
                assert.strictEqual(transactionDiff, 1);
            });
        });
    });

    describe("Repository Operations", () => {
        test("supports basic transactions", async () => {
            const userRepository = new UserRepository(dataSource);

            let transactionIdBefore: number | null = null;
            await runInTransaction(async () => {
                transactionIdBefore = await getCurrentTransactionId(userRepository);
                await userRepository.createUser("John Doe");
                const transactionIdAfter = await getCurrentTransactionId(userRepository);

                assert.ok(transactionIdBefore, "Transaction ID should exist");
                assert.strictEqual(transactionIdBefore, transactionIdAfter);
            });

            const transactionIdOutside = await getCurrentTransactionId(userRepository);
            assert.strictEqual(transactionIdOutside, null);
            assert.notStrictEqual(transactionIdOutside, transactionIdBefore);

            const user = await userRepository.findUserByName("John Doe");
            assert.ok(user, "User should be found");
        });

        test("should rollback the transaction if an error is thrown", async () => {
            const userRepository = new UserRepository(dataSource);

            try {
                await runInTransaction(async () => {
                    await userRepository.createUser("John Doe");
                    throw new Error("Rollback transaction");
                });
            } catch {
                // Expected error due to rollback
            }

            const user = await userRepository.findUserByName("John Doe");
            assert.strictEqual(user, null);
        });

        test("supports nested transactions", async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                const transactionIdBefore = await getCurrentTransactionId(userRepository);
                await userRepository.createUser("John Doe");

                await runInTransaction(async () => {
                    const transactionIdAfter = await getCurrentTransactionId(userRepository);
                    assert.strictEqual(transactionIdBefore, transactionIdAfter);
                });
            });
        });

        test("supports several concurrent transactions", async () => {
            const userRepository = new UserRepository(dataSource);

            let transactionA: number | null = null;
            let transactionB: number | null = null;
            let transactionC: number | null = null;

            await Promise.all([
                runInTransaction(async () => {
                    userRepository.createUser("John Doe");
                    transactionA = await getCurrentTransactionId(userRepository);
                }),
                runInTransaction(async () => {
                    userRepository.createUser("Bob Smith");
                    transactionB = await getCurrentTransactionId(userRepository);
                }),
                runInTransaction(async () => {
                    userRepository.createUser("Alice Watson");
                    transactionC = await getCurrentTransactionId(userRepository);
                }),
            ]);

            assert.ok(transactionA, "Transaction A should exist");
            assert.ok(transactionB, "Transaction B should exist");
            assert.ok(transactionC, "Transaction C should exist");

            assert.notStrictEqual(transactionA, transactionB);
            assert.notStrictEqual(transactionA, transactionC);
            assert.notStrictEqual(transactionB, transactionC);
        });

        test("doesn't leak variables to outer scope", async () => {
            let transactionSetup = false;
            let transactionEnded = false;

            const userRepository = new UserRepository(dataSource);

            let transactionIdOutside: number | null = null;

            const transaction = runInTransaction(async () => {
                transactionSetup = true;

                await sleep(500);

                const transactionIdInside = await getCurrentTransactionId(userRepository);

                assert.ok(transactionIdInside, "Transaction ID should exist inside");
                assert.strictEqual(transactionIdOutside, null);
                assert.notStrictEqual(transactionIdInside, transactionIdOutside);

                transactionEnded = true;
            });

            await new Promise<void>(resolve => {
                const interval = setInterval(() => {
                    if (transactionSetup) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 200);
            });

            assert.strictEqual(transactionEnded, false);
            transactionIdOutside = await getCurrentTransactionId(userRepository);
            assert.strictEqual(transactionIdOutside, null);

            assert.strictEqual(transactionEnded, false);

            await transaction;
        });
    });

    describe("Propagation", () => {
        test('should support "REQUIRED" propagation', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                const transactionId = await getCurrentTransactionId(userRepository);
                await userRepository.createUser("John Doe");

                await runInTransaction(
                    async () => {
                        await userRepository.createUser("Bob Smith");
                        const transactionIdNested = await getCurrentTransactionId(userRepository);

                        // We expect the nested transaction to be under the same transaction
                        assert.strictEqual(transactionId, transactionIdNested);
                    },
                    {propagation: Propagation.REQUIRED},
                );
            });
        });

        test('should support "SUPPORTS" propagation if active transaction exists', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                const transactionId = await getCurrentTransactionId(userRepository);
                await userRepository.createUser("John Doe");

                await runInTransaction(
                    async () => {
                        await userRepository.createUser("Bob Smith");
                        const transactionIdNested = await getCurrentTransactionId(userRepository);

                        // We expect the nested transaction to be under the same transaction
                        assert.strictEqual(transactionId, transactionIdNested);
                    },
                    {propagation: Propagation.SUPPORTS},
                );
            });
        });

        test('should support "SUPPORTS" propagation if active transaction doesn\'t exist', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(
                async () => {
                    const transactionId = await getCurrentTransactionId(userRepository);

                    // We expect the code to be executed without a transaction
                    assert.strictEqual(transactionId, null);
                },
                {propagation: Propagation.SUPPORTS},
            );
        });

        test('should support "MANDATORY" propagation if active transaction exists', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                const transactionId = await getCurrentTransactionId(userRepository);

                await runInTransaction(
                    async () => {
                        const transactionIdNested = await getCurrentTransactionId(userRepository);

                        // We expect the nested transaction to be under the same transaction
                        assert.strictEqual(transactionId, transactionIdNested);
                    },
                    {propagation: Propagation.MANDATORY},
                );
            });
        });

        test('should throw an error if "MANDATORY" propagation is used without an active transaction', async () => {
            const userRepository = new UserRepository(dataSource);

            assert.rejects(
                () => runInTransaction(() => userRepository.find(), {propagation: Propagation.MANDATORY}),
                TransactionalError,
            );
        });

        test('should support "REQUIRES_NEW" propagation', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                const transactionId = await getCurrentTransactionId(userRepository);

                await runInTransaction(
                    async () => {
                        const transactionIdNested = await getCurrentTransactionId(userRepository);

                        // We expect the nested transaction to be under a different transaction
                        assert.notStrictEqual(transactionId, transactionIdNested);
                    },
                    {propagation: Propagation.REQUIRES_NEW},
                );

                const transactionIdAfter = await getCurrentTransactionId(userRepository);
                // We expect then the transaction to be the same as before
                assert.strictEqual(transactionId, transactionIdAfter);
            });
        });

        test('should support "NOT_SUPPORTED" propagation', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                const transactionId = await getCurrentTransactionId(userRepository);

                await runInTransaction(
                    async () => {
                        const transactionIdNested = await getCurrentTransactionId(userRepository);

                        // We expect the code to be executed without a transaction
                        assert.strictEqual(transactionIdNested, null);
                    },
                    {propagation: Propagation.NOT_SUPPORTED},
                );

                const transactionIdAfter = await getCurrentTransactionId(userRepository);
                // We expect then the transaction to be the same as before
                assert.strictEqual(transactionId, transactionIdAfter);
            });
        });

        test('should support "NEVER" propagation if active transaction doesn\'t exist', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(
                async () => {
                    const transactionId = await getCurrentTransactionId(userRepository);

                    // We expect the code to be executed without a transaction
                    assert.strictEqual(transactionId, null);
                },
                {propagation: Propagation.NEVER},
            );
        });

        test('should throw an error if "NEVER" propagation is used with an active transaction', async () => {
            const userRepository = new UserRepository(dataSource);

            await runInTransaction(async () => {
                assert.rejects(
                    () => runInTransaction(() => userRepository.find(), {propagation: Propagation.NEVER}),
                    TransactionalError,
                );
            });
        });
    });

    describe("Hooks", () => {
        test('should run "runOnTransactionCommit" hook', async () => {
            const userRepository = new UserRepository(dataSource);
            const commitSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };
            const rollbackSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };
            const completeSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };

            await runInTransaction(async () => {
                await userRepository.createUser("John Doe");
                runOnTransactionCommit(() => commitSpy.fn());
            });

            await sleep(1);

            assert.strictEqual(commitSpy.called, 1);
            assert.strictEqual(rollbackSpy.called, 0);
            assert.strictEqual(completeSpy.called, 0);
        });

        test('should run "runOnTransactionRollback" hook', async () => {
            const userRepository = new UserRepository(dataSource);
            const commitSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };
            const rollbackSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };
            const completeSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };

            try {
                await runInTransaction(async () => {
                    runOnTransactionRollback(() => rollbackSpy.fn());
                    await userRepository.createUser("John Doe");
                    throw new Error("Rollback transaction");
                });
            } catch {
                // Expected error due to rollback
            }

            await sleep(1);

            assert.strictEqual(rollbackSpy.called, 1);
            assert.strictEqual(commitSpy.called, 0);
            assert.strictEqual(completeSpy.called, 0);
        });

        test('should run "runOnTransactionComplete" hook', async () => {
            const userRepository = new UserRepository(dataSource);
            const commitSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };
            const rollbackSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };
            const completeSpy = {
                called: 0,
                fn: function () {
                    this.called++;
                },
            };

            await runInTransaction(async () => {
                await userRepository.createUser("John Doe");
                runOnTransactionComplete(() => completeSpy.fn());
            });

            await sleep(1);

            assert.strictEqual(commitSpy.called, 0);
            assert.strictEqual(rollbackSpy.called, 0);
            assert.strictEqual(completeSpy.called, 1);
        });
    });

    describe("Isolation", () => {
        test("should read the most recent committed rows when using READ COMMITTED isolation level", async () => {
            await runInTransaction(
                async () => {
                    const userRepository = new UserRepository(dataSource);
                    const totalUsers = await userRepository.count();
                    assert.strictEqual(totalUsers, 0);

                    // Outside of the transaction
                    await dataSource.transaction(async manager => {
                        await manager.save(new User("John Doe", 100));
                    });

                    const totalUsers2 = await userRepository.count();
                    assert.strictEqual(totalUsers2, 1);
                },
                {isolationLevel: IsolationLevel.READ_COMMITTED},
            );
        });

        test("shouldn't see the most recent committed rows when using REPEATABLE READ isolation level", async () => {
            await runInTransaction(
                async () => {
                    const userRepository = new UserRepository(dataSource);
                    const totalUsers = await userRepository.count();
                    assert.strictEqual(totalUsers, 0);

                    // Outside of the transaction
                    await dataSource.transaction(async manager => {
                        await manager.save(new User("John Doe", 100));
                    });

                    const totalUsers2 = await userRepository.count();
                    assert.strictEqual(totalUsers2, 0);
                },
                {isolationLevel: IsolationLevel.REPEATABLE_READ},
            );
        });
    });
});
