import {Message, UserMessage} from "../chat/messages";
import {ChatOptions} from "../chat/model";

export class Prompt {
    private readonly messages: Message[];
    private readonly options?: ChatOptions;

    constructor(messageOrMessages: string | Message | Message[], options?: ChatOptions) {
        if (typeof messageOrMessages === "string") {
            this.messages = [new UserMessage(messageOrMessages)];
        } else if (Array.isArray(messageOrMessages)) {
            this.messages = [...messageOrMessages];
        } else {
            this.messages = [messageOrMessages];
        }
        this.options = options;
    }

    getInstructions(): Message[] {
        return this.messages;
    }

    getContents(): string {
        return this.messages.map(m => m.text).join("\n");
    }

    getOptions(): ChatOptions | undefined {
        return this.options;
    }

    copy(): Prompt {
        return new Prompt([...this.messages], this.options ? {...this.options} : undefined);
    }
}
