import {ChatClient} from "./ChatClient";
import {Media, Message, SystemMessage, UserMessage} from "../messages";
import {AdvisedRequest, AdvisedResponse, CallAroundAdvisor, CallAroundAdvisorChain} from "../advisor";
import {ToolCallback, ToolCallingManager, ToolDefinition, ToolRegistry} from "../../tool";
import {ChatOptions, ChatResponse} from "../model";
import {OutputConverter} from "../../output";
import {Prompt, PromptTemplate} from "../../prompt";
import {ChatClientResponseSpec} from "./ChatClientResponseSpec";

export class ChatClientPromptSpec {
    private readonly chatClient: ChatClient;
    private systemText?: string;
    private userText?: string;
    private userMedia: Media[] = [];
    private readonly userParams: Record<string, any> = {};
    private readonly customAdvisors: CallAroundAdvisor[] = [];
    private readonly customTools: ToolCallback[] = [];
    private customOptions: ChatOptions = {};
    private conversationIdValue?: string;
    private outputConverter?: OutputConverter<any>;

    constructor(chatClient: ChatClient) {
        this.chatClient = chatClient;
    }

    system(text: string): this {
        this.systemText = text;
        return this;
    }

    user(text: string, media: Media[] = []): this {
        this.userText = text;
        this.userMedia = media;
        return this;
    }

    param(key: string, value: any): this {
        this.userParams[key] = value;
        return this;
    }

    params(values: Record<string, any>): this {
        Object.assign(this.userParams, values);
        return this;
    }

    advisors(...advisors: CallAroundAdvisor[]): this {
        this.customAdvisors.push(...advisors);
        return this;
    }

    tools(...tools: Array<ToolCallback | ToolDefinition>): this {
        for (const t of tools) {
            if ("call" in t && typeof t.call === "function") {
                this.customTools.push(t as ToolCallback);
            }
        }
        return this;
    }

    options(options: ChatOptions): this {
        this.customOptions = {...this.customOptions, ...options};
        return this;
    }

    conversationId(id: string): this {
        this.conversationIdValue = id;
        return this;
    }

    call(): ChatClientResponseSpec {
        const responsePromise = this.executeCall();
        return new ChatClientResponseSpec(responsePromise, this.outputConverter);
    }

    private async executeCall(): Promise<ChatResponse> {
        const defaultOptions = this.chatClient.getDefaultOptions();
        const mergedOptions: ChatOptions = {
            ...defaultOptions,
            ...this.customOptions,
        };

        // Render system message
        const messages: Message[] = [];
        const effectiveSystem = this.systemText ?? this.chatClient.getDefaultSystem();
        if (effectiveSystem) {
            messages.push(new SystemMessage(effectiveSystem));
        }

        // Render user message with params
        if (this.userText) {
            const template = new PromptTemplate(this.userText);
            const renderedUserText = template.render(this.userParams);
            messages.push(
                new UserMessage({
                    text: renderedUserText,
                    media: this.userMedia,
                }),
            );
        }

        // Merge tools
        const allTools: ToolCallback[] = [...this.chatClient.getDefaultTools(), ...this.customTools];

        // Also check if auto-registered tools from ToolRegistry should be included
        const registryTools = ToolRegistry.get().getAllTools();
        for (const regTool of registryTools) {
            if (!allTools.some(t => t.definition.name === regTool.definition.name)) {
                allTools.push(regTool);
            }
        }

        if (allTools.length > 0) {
            mergedOptions.tools = allTools;
        }

        const initialPrompt = new Prompt(messages, mergedOptions);

        // Advisor pipeline
        const allAdvisors: CallAroundAdvisor[] = [...this.chatClient.getDefaultAdvisors(), ...this.customAdvisors];
        allAdvisors.sort((a, b) => a.getOrder() - b.getOrder());

        const initialRequest: AdvisedRequest = {
            prompt: initialPrompt,
            conversationId: this.conversationIdValue,
            userParams: this.userParams,
            context: {},
        };

        const executeTerminal = async (req: AdvisedRequest): Promise<AdvisedResponse> => {
            const model = this.chatClient.getChatModel();
            let response: ChatResponse;

            if (allTools.length > 0) {
                const manager = new ToolCallingManager(allTools);
                response = await manager.executeToolCalls(model, req.prompt, {
                    context: {
                        conversationId: req.conversationId,
                        metadata: req.context,
                    },
                });
            } else {
                response = await model.call(req.prompt);
            }

            return {
                response,
                context: req.context,
            };
        };

        // Construct advisor execution chain
        let chainIndex = 0;
        const chain: CallAroundAdvisorChain = {
            nextAroundCall: async (req: AdvisedRequest): Promise<AdvisedResponse> => {
                if (chainIndex < allAdvisors.length) {
                    const currentAdvisor = allAdvisors[chainIndex++];
                    if (currentAdvisor) {
                        return currentAdvisor.aroundCall(req, chain);
                    }
                }
                return executeTerminal(req);
            },
        };

        const advisedResponse = await chain.nextAroundCall(initialRequest);
        return advisedResponse.response;
    }
}
