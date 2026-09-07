import {Prompt} from "../../prompt";
import {ChatResponse} from "../model";

export interface AdvisedRequest {
    prompt: Prompt;
    conversationId?: string;
    userParams?: Record<string, any>;
    context?: Record<string, any>;
}

export interface AdvisedResponse {
    response: ChatResponse;
    context?: Record<string, any>;
}

export interface CallAroundAdvisorChain {
    nextAroundCall(request: AdvisedRequest): Promise<AdvisedResponse>;
}

export interface CallAroundAdvisor {
    getName(): string;
    getOrder(): number;
    aroundCall(request: AdvisedRequest, chain: CallAroundAdvisorChain): Promise<AdvisedResponse>;
}
