import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {AssistantMessage, SystemMessage, ToolResponseMessage, UserMessage} from "@nodeboot/ai-core";
import {applyMessageToRow, ChatMemoryMessageRow, rowToMessage} from "../src/mapping/ChatMemoryRowMapper";

function emptyRow(): ChatMemoryMessageRow {
    return {
        conversationId: "",
        sequenceId: -1,
        messageType: "",
        content: "",
        metadata: null,
        createdAt: new Date(0),
    };
}

describe("ChatMemoryRowMapper", () => {
    it("round-trips a plain UserMessage", () => {
        const row = applyMessageToRow(emptyRow(), "conv-1", 0, new UserMessage("Hello there"));

        assert.equal(row.conversationId, "conv-1");
        assert.equal(row.sequenceId, 0);
        assert.equal(row.messageType, "user");
        assert.equal(row.content, "Hello there");

        const message = rowToMessage(row) as UserMessage;
        assert.ok(message instanceof UserMessage);
        assert.equal(message.text, "Hello there");
        assert.deepEqual(message.media, []);
    });

    it("round-trips a UserMessage with media attachments", () => {
        const media = [{mimeType: "image/png", data: "base64=="}];
        const original = new UserMessage({text: "See attached", media});

        const row = applyMessageToRow(emptyRow(), "conv-1", 0, original);
        const message = rowToMessage(row) as UserMessage;

        assert.ok(message instanceof UserMessage);
        assert.equal(message.text, "See attached");
        assert.deepEqual(message.media, media);
        // Reserved media key must not leak into the reconstructed metadata.
        assert.equal(message.metadata["__media"], undefined);
    });

    it("round-trips a SystemMessage", () => {
        const row = applyMessageToRow(emptyRow(), "conv-1", 0, new SystemMessage("You are a helpful assistant"));
        const message = rowToMessage(row);

        assert.ok(message instanceof SystemMessage);
        assert.equal(message.text, "You are a helpful assistant");
    });

    it("round-trips an AssistantMessage with tool calls", () => {
        const toolCalls = [{id: "call-1", name: "getWeather", arguments: {city: "Lisbon"}}];
        const original = new AssistantMessage({text: "Let me check that", toolCalls});

        const row = applyMessageToRow(emptyRow(), "conv-1", 1, original);
        const message = rowToMessage(row) as AssistantMessage;

        assert.ok(message instanceof AssistantMessage);
        assert.equal(message.text, "Let me check that");
        assert.deepEqual(message.toolCalls, toolCalls);
        assert.equal(message.metadata["__toolCalls"], undefined);
    });

    it("round-trips an AssistantMessage without tool calls", () => {
        const row = applyMessageToRow(emptyRow(), "conv-1", 1, new AssistantMessage("Just text"));
        const message = rowToMessage(row) as AssistantMessage;

        assert.ok(message instanceof AssistantMessage);
        assert.equal(message.toolCalls, undefined);
    });

    it("round-trips a ToolResponseMessage", () => {
        const original = new ToolResponseMessage({
            toolCallId: "call-1",
            name: "getWeather",
            responseData: {temperature: 21},
        });

        const row = applyMessageToRow(emptyRow(), "conv-1", 2, original);
        const message = rowToMessage(row) as ToolResponseMessage;

        assert.ok(message instanceof ToolResponseMessage);
        assert.equal(message.toolCallId, "call-1");
        assert.equal(message.name, "getWeather");
        assert.deepEqual(message.responseData, {temperature: 21});
        assert.equal(message.metadata["__toolCallId"], undefined);
        assert.equal(message.metadata["__toolName"], undefined);
        assert.equal(message.metadata["__responseData"], undefined);
    });

    it("preserves arbitrary user-supplied metadata alongside reserved keys", () => {
        const original = new UserMessage({text: "Hi", metadata: {locale: "en-US"}});
        const row = applyMessageToRow(emptyRow(), "conv-1", 0, original);
        const message = rowToMessage(row);

        assert.equal(message.metadata?.["locale"], "en-US");
    });

    it("stores null metadata when there is nothing to persist", () => {
        const row = applyMessageToRow(emptyRow(), "conv-1", 0, new UserMessage("Hello"));
        assert.equal(row.metadata, null);
    });

    it("throws for an unknown stored message type", () => {
        const row = {...emptyRow(), messageType: "unknown"};
        assert.throws(() => rowToMessage(row), /Unknown stored chat memory message type/);
    });
});
