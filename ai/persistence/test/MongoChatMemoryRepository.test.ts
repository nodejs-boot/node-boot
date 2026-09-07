import {describe, it} from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import {RepositoryType} from "@nodeboot/starter-persistence";
import {AssistantMessage, SystemMessage, UserMessage} from "@nodeboot/ai-core";
import {MongoChatMemoryRepository} from "../src/repository/MongoChatMemoryRepository";
import {ChatMemoryMongoMessageEntity} from "../src/entity/ChatMemoryMongoMessageEntity";

/**
 * `MongoChatMemoryRepository` is exercised here against a hand-rolled fake shaped like a TypeORM
 * `MongoRepository`, rather than a real MongoDB instance. `mongodb-memory-server`'s binaries aren't
 * available offline in this environment; application-level integration tests for Mongo-backed
 * features should follow the `useMongoMemoryServer` pattern instead (see the
 * `nodeboot-test-mongodb` skill). This test focuses on verifying that `MongoChatMemoryRepository`
 * calls the underlying repository/collection APIs correctly and round-trips messages through
 * `ChatMemoryRowMapper`.
 */
class FakeMongoRepository {
    private rows: ChatMemoryMongoMessageEntity[] = [];
    readonly metadata = {tableName: "nodeboot_chat_memory_messages"};

    readonly queryRunner = {
        databaseConnection: {
            db: () => ({
                collection: () => ({
                    distinct: async (field: string) => [...new Set(this.rows.map(row => (row as any)[field]))],
                }),
            }),
        },
    };

    constructor() {
        // Mirrors what @DataRepository would set on the prototype at decoration time.
        Reflect.defineMetadata("custom:repotype", RepositoryType.MONGO, this);
    }

    async find(options: {where: {conversationId: string}; order?: any}): Promise<ChatMemoryMongoMessageEntity[]> {
        return this.rows
            .filter(row => row.conversationId === options.where.conversationId)
            .sort((a, b) => a.sequenceId - b.sequenceId);
    }

    async delete(criteria: {conversationId: string}): Promise<void> {
        this.rows = this.rows.filter(row => row.conversationId !== criteria.conversationId);
    }

    async save(rows: ChatMemoryMongoMessageEntity[]): Promise<void> {
        this.rows.push(...rows);
    }
}

describe("MongoChatMemoryRepository (fake TypeORM MongoRepository)", () => {
    it("returns an empty conversation when nothing has been saved", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);
        assert.deepEqual(await repository.findByConversationId("unknown"), []);
    });

    it("saves and retrieves messages in ascending order", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);

        await repository.saveAll("conv-1", [
            new SystemMessage("You are helpful"),
            new UserMessage("Hello"),
            new AssistantMessage("Hi, how can I help?"),
        ]);

        const messages = await repository.findByConversationId("conv-1");
        assert.deepEqual(
            messages.map(m => [m.messageType, m.text]),
            [
                ["system", "You are helpful"],
                ["user", "Hello"],
                ["assistant", "Hi, how can I help?"],
            ],
        );
    });

    it("keeps conversations isolated from each other", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);

        await repository.saveAll("conv-1", [new UserMessage("First conversation")]);
        await repository.saveAll("conv-2", [new UserMessage("Different conversation")]);

        assert.deepEqual(
            (await repository.findByConversationId("conv-1")).map(m => m.text),
            ["First conversation"],
        );
        assert.deepEqual(
            (await repository.findByConversationId("conv-2")).map(m => m.text),
            ["Different conversation"],
        );
    });

    it("replaces (not appends) the stored conversation on subsequent saveAll calls", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);

        await repository.saveAll("conv-1", [new UserMessage("First")]);
        await repository.saveAll("conv-1", [new UserMessage("Second"), new UserMessage("Third")]);

        assert.deepEqual(
            (await repository.findByConversationId("conv-1")).map(m => m.text),
            ["Second", "Third"],
        );
    });

    it("deletes a conversation by id", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);

        await repository.saveAll("conv-1", [new UserMessage("To be deleted")]);
        await repository.deleteByConversationId("conv-1");

        assert.deepEqual(await repository.findByConversationId("conv-1"), []);
    });

    it("lists distinct conversation ids via the underlying Mongo collection", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);

        await repository.saveAll("conv-1", [new UserMessage("Hello")]);
        await repository.saveAll("conv-2", [new UserMessage("Hi")]);

        const ids = await repository.findConversationIds();
        assert.deepEqual(new Set(ids), new Set(["conv-1", "conv-2"]));
    });

    it("preserves tool calls across the round trip", async () => {
        const repository = new MongoChatMemoryRepository(new FakeMongoRepository() as any);
        const toolCalls = [{id: "call-1", name: "getWeather", arguments: {city: "Lisbon"}}];

        await repository.saveAll("conv-1", [new AssistantMessage({text: "Checking", toolCalls})]);

        const [message] = (await repository.findByConversationId("conv-1")) as AssistantMessage[];
        assert.deepEqual(message!.toolCalls, toolCalls);
    });
});
