import {after, before, describe, it} from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {AssistantMessage, SystemMessage, UserMessage} from "@nodeboot/ai-core";
import {ChatMemoryMessageEntity, SqlChatMemoryRepository} from "../src";

describe("SqlChatMemoryRepository (real TypeORM DataSource, better-sqlite3 in-memory)", () => {
    let dataSource: DataSource;
    let repository: SqlChatMemoryRepository;

    before(async () => {
        dataSource = new DataSource({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [ChatMemoryMessageEntity],
            synchronize: true,
        });
        await dataSource.initialize();
        repository = new SqlChatMemoryRepository(dataSource.getRepository(ChatMemoryMessageEntity));
    });

    after(async () => {
        await dataSource.destroy();
    });

    it("returns an empty conversation when nothing has been saved", async () => {
        assert.deepEqual(await repository.findByConversationId("unknown"), []);
    });

    it("saves and retrieves messages in ascending order", async () => {
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
        await repository.saveAll("conv-2", [new UserMessage("Different conversation")]);

        assert.deepEqual(
            (await repository.findByConversationId("conv-1")).map(m => m.text),
            ["You are helpful", "Hello", "Hi, how can I help?"],
        );
        assert.deepEqual(
            (await repository.findByConversationId("conv-2")).map(m => m.text),
            ["Different conversation"],
        );
    });

    it("replaces (not appends) the stored conversation on subsequent saveAll calls", async () => {
        await repository.saveAll("conv-3", [new UserMessage("First")]);
        await repository.saveAll("conv-3", [new UserMessage("Second"), new UserMessage("Third")]);

        assert.deepEqual(
            (await repository.findByConversationId("conv-3")).map(m => m.text),
            ["Second", "Third"],
        );
    });

    it("clears a conversation when saveAll is called with an empty list", async () => {
        await repository.saveAll("conv-4", [new UserMessage("Temporary")]);
        await repository.saveAll("conv-4", []);

        assert.deepEqual(await repository.findByConversationId("conv-4"), []);
    });

    it("deletes a conversation by id", async () => {
        await repository.saveAll("conv-5", [new UserMessage("To be deleted")]);
        await repository.deleteByConversationId("conv-5");

        assert.deepEqual(await repository.findByConversationId("conv-5"), []);
    });

    it("lists distinct conversation ids", async () => {
        const ids = await repository.findConversationIds();
        assert.ok(ids.includes("conv-1"));
        assert.ok(ids.includes("conv-2"));
        assert.ok(ids.includes("conv-3"));
        assert.equal(new Set(ids).size, ids.length);
    });

    it("preserves metadata and tool calls across the real database round trip", async () => {
        const toolCalls = [{id: "call-1", name: "getWeather", arguments: {city: "Lisbon"}}];
        await repository.saveAll("conv-6", [
            new AssistantMessage({text: "Checking the weather", toolCalls, metadata: {trace: "abc"}}),
        ]);

        const [message] = (await repository.findByConversationId("conv-6")) as AssistantMessage[];
        assert.equal(message!.text, "Checking the weather");
        assert.deepEqual(message!.toolCalls, toolCalls);
        assert.equal(message!.metadata?.["trace"], "abc");
    });
});
