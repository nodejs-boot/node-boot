import {Message, MessageType} from "./Message";

export class SystemMessage implements Message {
    readonly messageType: MessageType = "system";
    readonly text: string;
    readonly metadata: Record<string, any>;

    constructor(textOrOptions: string | {text: string; metadata?: Record<string, any>}) {
        if (typeof textOrOptions === "string") {
            this.text = textOrOptions;
            this.metadata = {};
        } else {
            this.text = textOrOptions.text;
            this.metadata = textOrOptions.metadata ?? {};
        }
    }
}
