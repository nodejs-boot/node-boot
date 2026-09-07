import {AdvisedRequest, AdvisedResponse, CallAroundAdvisor, CallAroundAdvisorChain} from "./Advisor";

export class SafeGuardAdvisor implements CallAroundAdvisor {
    private readonly sensitiveWords: string[];
    private readonly order: number;

    constructor(options?: {sensitiveWords?: string[]; order?: number}) {
        this.sensitiveWords = (options?.sensitiveWords ?? []).map(w => w.toLowerCase());
        this.order = options?.order ?? -100; // run early
    }

    getName(): string {
        return "SafeGuardAdvisor";
    }

    getOrder(): number {
        return this.order;
    }

    async aroundCall(request: AdvisedRequest, chain: CallAroundAdvisorChain): Promise<AdvisedResponse> {
        const userMessages = request.prompt.getInstructions().filter(m => m.messageType === "user");
        for (const msg of userMessages) {
            const lower = msg.text.toLowerCase();
            for (const word of this.sensitiveWords) {
                if (lower.includes(word)) {
                    throw new Error(`Content moderation violation: Query contains disallowed term: '${word}'`);
                }
            }
        }
        return chain.nextAroundCall(request);
    }
}
