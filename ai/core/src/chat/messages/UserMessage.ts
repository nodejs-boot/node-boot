import {Media, Message, MessageType} from "./Message";

export class UserMessage implements Message {
    readonly messageType: MessageType = "user";
    readonly text: string;
    readonly metadata: Record<string, any>;
    readonly media: Media[];

    constructor(textOrOptions: string | {text: string; media?: Media[]; metadata?: Record<string, any>}) {
        if (typeof textOrOptions === "string") {
            this.text = textOrOptions;
            this.media = [];
            this.metadata = {};
        } else {
            this.text = textOrOptions.text;
            this.media = textOrOptions.media ?? [];
            this.metadata = textOrOptions.metadata ?? {};
        }
    }
}
