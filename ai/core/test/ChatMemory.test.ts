import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {
    AssistantMessage,
    ChatMemory,
    ChatMemoryRepository,
    InMemoryChatMemory,
    InMemoryChatMemoryRepository,
    Message,
    MessageChatMemoryAdvisor,
    MessageWindowChatMemory,
    SystemMessage,
    ToolResponseMessage,
    UserMessage,
} from "../src";

describe("ChatMemory.CONVERSATION_ID", () => {
    it("exposes the conventional conversation id parameter key", () => {
        assert.equal(ChatMemory.CONVERSATION_ID, "chat_memory_conversation_id");
    });
});

describe("InMemoryChatMemoryRepository", () => {
    it("stores and retrieves messages per conversation id", async () => {
        const repository = new InMemoryChatMemoryRepository();

        await repository.saveAll("conv-1", [new UserMessage("Hello")]);
        await repository.saveAll("conv-2", [new UserMessage("Hi there")]);

        assert.deepEqual(
            (await repository.findByConversationId("conv-1")).map(m => m.text),
            ["Hello"],
        );
        assert.deepEqual(
            (await repository.findByConversationId("conv-2")).map(m => m.text),
            ["Hi there"],
        );
        assert.deepEqual(await repository.findByConversationId("unknown"), []);
    });

    it("saveAll replaces (not appends to) the stored conversation", async () => {
        const repository = new InMemoryChatMemoryRepository();

        await repository.saveAll("conv-1", [new UserMessage("First")]);
        await repository.saveAll("conv-1", [new UserMessage("Second")]);

        const stored = await repository.findByConversationId("conv-1");
        assert.equal(stored.length, 1);
        assert.equal(stored[0]!.text, "Second");
    });

    it("findConversationIds returns every known conversation id", async () => {
        const repository = new InMemoryChatMemoryRepository();
        await repository.saveAll("conv-1", [new UserMessage("a")]);
        await repository.saveAll("conv-2", [new UserMessage("b")]);

        const ids = await repository.findConversationIds();
        assert.deepEqual(new Set(ids), new Set(["conv-1", "conv-2"]));
    });

    it("deleteByConversationId removes all messages for that conversation only", async () => {
        const repository = new InMemoryChatMemoryRepository();
        await repository.saveAll("conv-1", [new UserMessage("a")]);
        await repository.saveAll("conv-2", [new UserMessage("b")]);

        await repository.deleteByConversationId("conv-1");

        assert.deepEqual(await repository.findByConversationId("conv-1"), []);
        assert.equal((await repository.findByConversationId("conv-2")).length, 1);
    });

    it("returns independent copies so callers cannot mutate internal state", async () => {
        const repository = new InMemoryChatMemoryRepository();
        await repository.saveAll("conv-1", [new UserMessage("Hello")]);

        const first = await repository.findByConversationId("conv-1");
        first.push(new UserMessage("Mutated"));

        const second = await repository.findByConversationId("conv-1");
        assert.equal(second.length, 1);
    });
});

describe("InMemoryChatMemory", () => {
    it("accumulates messages without any eviction", async () => {
        const memory = new InMemoryChatMemory();

        await memory.add("conv-1", new UserMessage("One"));
        await memory.add("conv-1", [new AssistantMessage("Two"), new UserMessage("Three")]);

        const messages = await memory.get("conv-1");
        assert.deepEqual(
            messages.map(m => m.text),
            ["One", "Two", "Three"],
        );
    });

    it("clear removes all messages for the conversation", async () => {
        const memory = new InMemoryChatMemory();
        await memory.add("conv-1", new UserMessage("One"));

        await memory.clear("conv-1");

        assert.deepEqual(await memory.get("conv-1"), []);
    });

    it("keeps conversations isolated from one another", async () => {
        const memory = new InMemoryChatMemory();
        await memory.add("conv-1", new UserMessage("A"));
        await memory.add("conv-2", new UserMessage("B"));

        assert.deepEqual(
            (await memory.get("conv-1")).map(m => m.text),
            ["A"],
        );
        assert.deepEqual(
            (await memory.get("conv-2")).map(m => m.text),
            ["B"],
        );
    });
});

describe("MessageWindowChatMemory", () => {
    it("defaults to a window of 20 messages backed by an in-memory repository", async () => {
        const memory = MessageWindowChatMemory.builder().build();

        for (let i = 0; i < 25; i++) {
            await memory.add("conv-1", new UserMessage(`msg-${i}`));
        }

        const messages = await memory.get("conv-1");
        assert.ok(messages.length <= 20);
    });

    it("supports a custom maxMessages via the builder", async () => {
        const memory = MessageWindowChatMemory.builder().maxMessages(4).build();

        await memory.add("conv-1", new UserMessage("u1"));
        await memory.add("conv-1", new AssistantMessage("a1"));
        await memory.add("conv-1", new UserMessage("u2"));
        await memory.add("conv-1", new AssistantMessage("a2"));

        let messages = await memory.get("conv-1");
        assert.deepEqual(
            messages.map(m => m.text),
            ["u1", "a1", "u2", "a2"],
        );

        // Adding a 5th message exceeds maxMessages=4; eviction must snap to the next UserMessage
        // (u2), so the whole u1/a1 turn is dropped together rather than leaving a1 dangling.
        await memory.add("conv-1", new UserMessage("u3"));

        messages = await memory.get("conv-1");
        assert.deepEqual(
            messages.map(m => m.text),
            ["u2", "a2", "u3"],
        );
    });

    it("supports an injected ChatMemoryRepository", async () => {
        const repository: ChatMemoryRepository = new InMemoryChatMemoryRepository();
        const memory = MessageWindowChatMemory.builder().chatMemoryRepository(repository).maxMessages(10).build();

        await memory.add("conv-1", new UserMessage("Hello"));

        // The repository (not just the memory facade) should reflect the write.
        assert.deepEqual(
            (await repository.findByConversationId("conv-1")).map(m => m.text),
            ["Hello"],
        );
    });

    it("always preserves SystemMessage instances even when the window is exceeded", async () => {
        const memory = MessageWindowChatMemory.builder().maxMessages(3).build();

        await memory.add("conv-1", new SystemMessage("You are a helpful assistant"));
        await memory.add("conv-1", new UserMessage("u1"));
        await memory.add("conv-1", new AssistantMessage("a1"));
        await memory.add("conv-1", new UserMessage("u2"));
        await memory.add("conv-1", new AssistantMessage("a2"));

        const messages = await memory.get("conv-1");
        const systemMessages = messages.filter(m => m.messageType === "system");
        assert.equal(systemMessages.length, 1);
        assert.equal(systemMessages[0]!.text, "You are a helpful assistant");
        // System message must still be present alongside the most recent turn.
        assert.deepEqual(
            messages.map(m => m.text),
            ["You are a helpful assistant", "u2", "a2"],
        );
    });

    it("snaps eviction to the next UserMessage across a multi-step tool-calling turn", async () => {
        const memory = MessageWindowChatMemory.builder().maxMessages(5).build();

        // Turn 1: a single user/assistant exchange.
        await memory.add("conv-1", new UserMessage("u1"));
        await memory.add("conv-1", new AssistantMessage("a1"));

        // Turn 2: user message followed by a tool-calling exchange (assistant + tool response + assistant).
        await memory.add("conv-1", new UserMessage("u2"));
        await memory.add(
            "conv-1",
            new AssistantMessage({text: "", toolCalls: [{id: "1", name: "tool", arguments: "{}"}]}),
        );
        await memory.add("conv-1", new ToolResponseMessage({toolCallId: "1", name: "tool", responseData: {ok: true}}));
        await memory.add("conv-1", new AssistantMessage("a2-final"));

        // 6 non-system messages added with maxMessages=5: raw cut lands mid-turn-2, so eviction
        // must snap forward to the next UserMessage, which is also u2 (start of the kept turn),
        // dropping the whole turn-1 (u1/a1) instead of splitting turn 2.
        const messages = await memory.get("conv-1");
        assert.deepEqual(
            messages.map(m => m.text),
            ["u2", "", JSON.stringify({ok: true}), "a2-final"],
        );
        assert.equal(messages[0]!.messageType, "user");
    });

    it("evicts all accumulated messages when maxMessages is smaller than a single turn, until a new turn starts", async () => {
        const memory = MessageWindowChatMemory.builder().maxMessages(2).build();

        await memory.add("conv-1", new UserMessage("u1"));
        await memory.add("conv-1", new AssistantMessage("a1"));
        await memory.add(
            "conv-1",
            new AssistantMessage({text: "", toolCalls: [{id: "1", name: "tool", arguments: "{}"}]}),
        );

        // The raw eviction point falls inside the tool-calling turn and no further UserMessage
        // exists yet to snap forward to, so every non-system message accumulated so far is evicted.
        assert.deepEqual(await memory.get("conv-1"), []);

        // Once a new message arrives it starts accumulating again from the empty base.
        await memory.add("conv-1", new ToolResponseMessage({toolCallId: "1", name: "tool", responseData: {ok: true}}));
        assert.deepEqual(
            (await memory.get("conv-1")).map(m => m.text),
            [JSON.stringify({ok: true})],
        );
    });

    it("throws when constructed with a non-positive maxMessages", () => {
        assert.throws(() => new MessageWindowChatMemory({maxMessages: 0}));
        assert.throws(() => new MessageWindowChatMemory({maxMessages: -1}));
    });

    it("clear removes all messages for the conversation from the underlying repository", async () => {
        const memory = MessageWindowChatMemory.builder().build();
        await memory.add("conv-1", new UserMessage("Hello"));

        await memory.clear("conv-1");

        assert.deepEqual(await memory.get("conv-1"), []);
    });
});

describe("MessageChatMemoryAdvisor conversation id resolution", () => {
    it("throws when no conversation id is available", async () => {
        const {ChatClient} = await import("../src");
        const memory = MessageWindowChatMemory.builder().build();

        const mockModel = {
            async call() {
                return {result: {message: new AssistantMessage("hi")}};
            },
        };

        const client = ChatClient.builder(mockModel as any)
            .defaultAdvisors(new MessageChatMemoryAdvisor({chatMemory: memory}))
            .build();

        await assert.rejects(async () => {
            await client.prompt().user("Hello").call().content();
        }, /ChatMemory\.CONVERSATION_ID/);
    });

    it("resolves the conversation id from .param(ChatMemory.CONVERSATION_ID, ...)", async () => {
        const {ChatClient} = await import("../src");
        const memory = MessageWindowChatMemory.builder().build();

        const mockModel = {
            async call() {
                return {result: {message: new AssistantMessage("hi")}};
            },
        };

        const client = ChatClient.builder(mockModel as any)
            .defaultAdvisors(new MessageChatMemoryAdvisor({chatMemory: memory}))
            .build();

        await client.prompt().user("Hello").param(ChatMemory.CONVERSATION_ID, "conv-xyz").call().content();

        const stored: Message[] = await memory.get("conv-xyz");
        assert.equal(stored.length, 2);
        assert.equal(stored[0]!.text, "Hello");
    });
});
