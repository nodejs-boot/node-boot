import {describe, it, mock} from "node:test";
import assert from "node:assert/strict";

import {MongoTransactionalQueryRunner} from "./MongoTransactionalQueryRunner";

describe("MongoTransactionalQueryRunner", () => {
    const createRunner = () => {
        const session = {
            startTransaction: mock.fn(),
            commitTransaction: mock.fn(async () => undefined),
            abortTransaction: mock.fn(async () => undefined),
            endSession: mock.fn(async () => undefined),
        };

        const collection = {
            insertOne: mock.fn(async () => ({acknowledged: true})),
            updateOne: mock.fn(async () => ({acknowledged: true})),
        };

        const db = {
            collection: mock.fn(() => collection),
        };

        const client = {
            startSession: mock.fn(() => session),
            db: mock.fn(() => db),
        };

        const dataSource = {
            driver: {
                database: "facts",
            },
            subscribers: [],
            entityMetadatas: [],
        } as any;

        const runner = new MongoTransactionalQueryRunner(dataSource, client as any);

        return {
            runner,
            session,
            collection,
            client,
        };
    };

    it("starts and commits a transaction", async () => {
        const {runner, session, client} = createRunner();

        await runner.startTransaction();

        assert.equal(client.startSession.mock.callCount(), 1);
        assert.equal(session.startTransaction.mock.callCount(), 1);
        assert.equal(runner.isTransactionActive, true);

        await runner.commitTransaction();

        assert.equal(session.commitTransaction.mock.callCount(), 1);
        assert.equal(session.endSession.mock.callCount(), 1);
        assert.equal(runner.isTransactionActive, false);
    });

    it("rolls back an active transaction", async () => {
        const {runner, session} = createRunner();

        await runner.startTransaction();
        await runner.rollbackTransaction();

        assert.equal(session.abortTransaction.mock.callCount(), 1);
        assert.equal(session.endSession.mock.callCount(), 1);
        assert.equal(runner.isTransactionActive, false);
    });

    it("injects session into operations executed inside a transaction", async () => {
        const {runner, collection, session} = createRunner();

        await runner.startTransaction();

        await runner.insertOne("users", {name: "neo"});
        await runner.updateOne("users", {name: "neo"}, {$set: {name: "neo-v2"}} as any);

        assert.deepEqual(collection?.insertOne?.mock?.calls?.[0]?.arguments, [{name: "neo"}, {session}]);

        assert.deepEqual(collection?.insertOne?.mock?.calls?.[0]?.arguments, [
            {name: "neo"},
            {$set: {name: "neo-v2"}},
            {session},
        ]);
    });

    it("supports nested transactional depth without committing on inner commit", async () => {
        const {runner, session} = createRunner();

        await runner.startTransaction();
        await runner.startTransaction();

        await runner.commitTransaction();

        assert.equal(session.commitTransaction.mock.callCount(), 0);

        await runner.commitTransaction();

        assert.equal(session.commitTransaction.mock.callCount(), 1);
    });
});
