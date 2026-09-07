import {AssistantMessage, Message, SystemMessage, ToolResponseMessage, UserMessage} from "@nodeboot/ai-core";

/**
 * Common row/document shape shared by {@link ChatMemoryMessageEntity} (SQL) and
 * {@link ChatMemoryMongoMessageEntity} (Mongo). `ChatMemoryRowMapper` only depends on this shape,
 * so the same mapping logic is reused by both `SqlChatMemoryRepository` and
 * `MongoChatMemoryRepository`.
 */
export interface ChatMemoryMessageRow {
    conversationId: string;
    sequenceId: number;
    messageType: string;
    content: string;
    metadata: Record<string, any> | null;
    createdAt: Date;
}

// Reserved metadata keys used to round-trip fields that exist on some Message subtypes but not on
// the base Message interface (tool calls, tool response payload, media attachments).
const TOOL_CALLS_KEY = "__toolCalls";
const MEDIA_KEY = "__media";
const TOOL_CALL_ID_KEY = "__toolCallId";
const TOOL_NAME_KEY = "__toolName";
const TOOL_RESPONSE_DATA_KEY = "__responseData";

/**
 * Populates a (SQL or Mongo) row/entity instance with the data needed to reconstruct `message`
 * later via {@link rowToMessage}.
 */
export function applyMessageToRow<T extends ChatMemoryMessageRow>(
    row: T,
    conversationId: string,
    sequenceId: number,
    message: Message,
): T {
    row.conversationId = conversationId;
    row.sequenceId = sequenceId;
    row.messageType = message.messageType;
    row.content = message.text;
    row.metadata = buildStorableMetadata(message);
    row.createdAt = new Date();
    return row;
}

function buildStorableMetadata(message: Message): Record<string, any> | null {
    const metadata: Record<string, any> = {...(message.metadata ?? {})};

    if (message.messageType === "assistant") {
        const toolCalls = (message as AssistantMessage).toolCalls;
        if (toolCalls?.length) {
            metadata[TOOL_CALLS_KEY] = toolCalls;
        }
    } else if (message.messageType === "user") {
        const media = (message as UserMessage).media;
        if (media?.length) {
            metadata[MEDIA_KEY] = media;
        }
    } else if (message.messageType === "tool") {
        const toolResponse = message as ToolResponseMessage;
        metadata[TOOL_CALL_ID_KEY] = toolResponse.toolCallId;
        metadata[TOOL_NAME_KEY] = toolResponse.name;
        metadata[TOOL_RESPONSE_DATA_KEY] = toolResponse.responseData;
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Reconstructs a `Message` instance from a stored row/document, restoring type-specific fields
 * (tool calls, tool response payload, media attachments) from the reserved metadata keys.
 *
 * @throws {Error} If `row.messageType` isn't one of "user" | "assistant" | "system" | "tool".
 */
export function rowToMessage(row: ChatMemoryMessageRow): Message {
    const metadata: Record<string, any> = {...(row.metadata ?? {})};

    switch (row.messageType) {
        case "user": {
            const media = metadata[MEDIA_KEY];
            delete metadata[MEDIA_KEY];
            return new UserMessage({text: row.content, media, metadata});
        }
        case "assistant": {
            const toolCalls = metadata[TOOL_CALLS_KEY];
            delete metadata[TOOL_CALLS_KEY];
            return new AssistantMessage({text: row.content, toolCalls, metadata});
        }
        case "system":
            return new SystemMessage({text: row.content, metadata});
        case "tool": {
            const toolCallId = metadata[TOOL_CALL_ID_KEY];
            const name = metadata[TOOL_NAME_KEY];
            const responseData = metadata[TOOL_RESPONSE_DATA_KEY];
            delete metadata[TOOL_CALL_ID_KEY];
            delete metadata[TOOL_NAME_KEY];
            delete metadata[TOOL_RESPONSE_DATA_KEY];
            return new ToolResponseMessage({toolCallId, name, responseData, metadata});
        }
        default:
            throw new Error(`Unknown stored chat memory message type: "${row.messageType}"`);
    }
}
