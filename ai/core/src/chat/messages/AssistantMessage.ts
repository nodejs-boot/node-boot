import {Message, MessageType, ToolCall} from "./Message";

export class AssistantMessage implements Message {
    readonly messageType: MessageType = "assistant";
    readonly text: string;
    readonly metadata: Record<string, any>;
    readonly toolCalls?: ToolCall[];

    constructor(
        textOrOptions:
            | string
            | {
                  text?: string;
                  toolCalls?: ToolCall[];
                  metadata?: Record<string, any>;
              },
    ) {
        if (typeof textOrOptions === "string") {
            this.text = textOrOptions;
            this.metadata = {};
            this.toolCalls = undefined;
        } else {
            this.text = textOrOptions.text ?? "";
            this.toolCalls = textOrOptions.toolCalls;
            this.metadata = textOrOptions.metadata ?? {};
        }
    }
}
