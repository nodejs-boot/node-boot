export type MessageType = "user" | "assistant" | "system" | "tool";

export type MimeType = string;

export interface Media {
    mimeType: MimeType;
    data: string | Buffer | URL;
}

export interface ToolCall {
    id: string;
    name: string;
    type?: string;
    arguments: string | Record<string, any>;
}

export interface Message {
    readonly messageType: MessageType;
    readonly text: string;
    readonly metadata?: Record<string, any>;
    readonly media?: Media[];
}
