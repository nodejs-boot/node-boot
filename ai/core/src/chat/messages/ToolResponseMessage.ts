import {Message, MessageType} from "./Message";

export class ToolResponseMessage implements Message {
    readonly messageType: MessageType = "tool";
    readonly text: string;
    readonly toolCallId: string;
    readonly name: string;
    readonly responseData: any;
    readonly metadata: Record<string, any>;

    constructor(options: {toolCallId: string; name: string; responseData: any; metadata?: Record<string, any>}) {
        this.toolCallId = options.toolCallId;
        this.name = options.name;
        this.responseData = options.responseData;
        this.text =
            typeof options.responseData === "string" ? options.responseData : JSON.stringify(options.responseData);
        this.metadata = options.metadata ?? {};
    }
}
