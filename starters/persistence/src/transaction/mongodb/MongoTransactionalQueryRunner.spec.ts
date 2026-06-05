import {MongoTransactionalQueryRunner} from "./MongoTransactionalQueryRunner";

describe("MongoTransactionalQueryRunner", () => {
    const createRunner = () => {
        const session = {
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(async () => undefined),
            abortTransaction: jest.fn(async () => undefined),
            endSession: jest.fn(async () => undefined),
        };

        const collection = {
            insertOne: jest.fn(async () => ({acknowledged: true})),
            updateOne: jest.fn(async () => ({acknowledged: true})),
        };

        const db = {
            collection: jest.fn(() => collection),
        };

        const client = {
            startSession: jest.fn(() => session),
            db: jest.fn(() => db),
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
        expect(client.startSession).toHaveBeenCalledTimes(1);
        expect(session.startTransaction).toHaveBeenCalledTimes(1);
        expect(runner.isTransactionActive).toBe(true);

        await runner.commitTransaction();
        expect(session.commitTransaction).toHaveBeenCalledTimes(1);
        expect(session.endSession).toHaveBeenCalledTimes(1);
        expect(runner.isTransactionActive).toBe(false);
    });

    it("rolls back an active transaction", async () => {
        const {runner, session} = createRunner();

        await runner.startTransaction();
        await runner.rollbackTransaction();

        expect(session.abortTransaction).toHaveBeenCalledTimes(1);
        expect(session.endSession).toHaveBeenCalledTimes(1);
        expect(runner.isTransactionActive).toBe(false);
    });

    it("injects session into operations executed inside a transaction", async () => {
        const {runner, collection, session} = createRunner();

        await runner.startTransaction();
        await runner.insertOne("users", {name: "neo"});
        await runner.updateOne("users", {name: "neo"}, {$set: {name: "neo-v2"}} as any);

        expect(collection.insertOne).toHaveBeenCalledWith({name: "neo"}, {session});
        expect(collection.updateOne).toHaveBeenCalledWith({name: "neo"}, {$set: {name: "neo-v2"}}, {session});
    });

    it("supports nested transactional depth without committing on inner commit", async () => {
        const {runner, session} = createRunner();

        await runner.startTransaction();
        await runner.startTransaction();

        await runner.commitTransaction();
        expect(session.commitTransaction).not.toHaveBeenCalled();

        await runner.commitTransaction();
        expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    });
});
