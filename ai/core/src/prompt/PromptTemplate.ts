import {Message, UserMessage} from "../chat/messages";
import {Prompt} from "./Prompt";
import {ChatOptions} from "../chat/model";

export class PromptTemplate {
    private readonly template: string;
    private readonly defaultVariables: Record<string, any>;

    constructor(template: string, defaultVariables: Record<string, any> = {}) {
        this.template = template;
        this.defaultVariables = defaultVariables;
    }

    render(variables: Record<string, any> = {}): string {
        const merged = {...this.defaultVariables, ...variables};
        return this.template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
            if (key in merged) {
                const val = merged[key];
                return typeof val === "object" ? JSON.stringify(val) : String(val);
            }
            return match;
        });
    }

    create(variables: Record<string, any> = {}, options?: ChatOptions): Prompt {
        const rendered = this.render(variables);
        return new Prompt(rendered, options);
    }

    createMessage(variables: Record<string, any> = {}): Message {
        const rendered = this.render(variables);
        return new UserMessage(rendered);
    }
}
