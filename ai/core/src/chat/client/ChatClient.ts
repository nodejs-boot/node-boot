import {ChatModel, ChatOptions} from "../model";
import {CallAroundAdvisor} from "../advisor";
import {ToolCallback, ToolDefinition} from "../../tool";
import {ChatClientPromptSpec} from "./ChatClientPromptSpec";

export interface ChatClientOptions {
    chatModel: ChatModel;
    defaultSystem?: string;
    defaultOptions?: ChatOptions;
    defaultAdvisors?: CallAroundAdvisor[];
    defaultTools?: ToolCallback[];
}

export class ChatClientBuilder {
    private readonly chatModel: ChatModel;
    private defaultSystemText?: string;
    private defaultOptionsValue: ChatOptions = {};
    private readonly defaultAdvisorsList: CallAroundAdvisor[] = [];
    private readonly defaultToolsList: ToolCallback[] = [];

    constructor(chatModel: ChatModel) {
        this.chatModel = chatModel;
        if (chatModel.getDefaultOptions) {
            this.defaultOptionsValue = chatModel.getDefaultOptions();
        }
    }

    defaultSystem(system: string): this {
        this.defaultSystemText = system;
        return this;
    }

    defaultOptions(options: ChatOptions): this {
        this.defaultOptionsValue = {...this.defaultOptionsValue, ...options};
        return this;
    }

    defaultAdvisors(...advisors: CallAroundAdvisor[]): this {
        this.defaultAdvisorsList.push(...advisors);
        return this;
    }

    defaultTools(...tools: Array<ToolCallback | ToolDefinition>): this {
        for (const t of tools) {
            if ("call" in t && typeof t.call === "function") {
                this.defaultToolsList.push(t as ToolCallback);
            }
        }
        return this;
    }

    build(): ChatClient {
        return new ChatClient({
            chatModel: this.chatModel,
            defaultSystem: this.defaultSystemText,
            defaultOptions: this.defaultOptionsValue,
            defaultAdvisors: this.defaultAdvisorsList,
            defaultTools: this.defaultToolsList,
        });
    }
}

export class ChatClient {
    private readonly chatModel: ChatModel;
    private readonly defaultSystem?: string;
    private readonly defaultOptions: ChatOptions;
    private readonly defaultAdvisors: CallAroundAdvisor[];
    private readonly defaultTools: ToolCallback[];

    constructor(options: ChatClientOptions) {
        this.chatModel = options.chatModel;
        this.defaultSystem = options.defaultSystem;
        this.defaultOptions = options.defaultOptions ?? {};
        this.defaultAdvisors = options.defaultAdvisors ?? [];
        this.defaultTools = options.defaultTools ?? [];
    }

    static builder(chatModel: ChatModel): ChatClientBuilder {
        return new ChatClientBuilder(chatModel);
    }

    static create(chatModel: ChatModel): ChatClient {
        return new ChatClientBuilder(chatModel).build();
    }

    prompt(): ChatClientPromptSpec {
        return new ChatClientPromptSpec(this);
    }

    getChatModel(): ChatModel {
        return this.chatModel;
    }

    getDefaultSystem(): string | undefined {
        return this.defaultSystem;
    }

    getDefaultOptions(): ChatOptions {
        return this.defaultOptions;
    }

    getDefaultAdvisors(): CallAroundAdvisor[] {
        return this.defaultAdvisors;
    }

    getDefaultTools(): ToolCallback[] {
        return this.defaultTools;
    }

    mutate(): ChatClientBuilder {
        const b = new ChatClientBuilder(this.chatModel);
        if (this.defaultSystem) b.defaultSystem(this.defaultSystem);
        b.defaultOptions(this.defaultOptions);
        b.defaultAdvisors(...this.defaultAdvisors);
        b.defaultTools(...this.defaultTools);
        return b;
    }
}
