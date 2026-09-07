import {Service} from "typedi";
import {MessageEnvelop, SqsListener} from "../../src";

@Service()
export class SampleSqsListenerService {
    public receivedMessages: MessageEnvelop[] = [];

    @SqsListener("https://sqs.us-east-1.amazonaws.com/123456789012/sample-queue")
    async onMessage(envelop: MessageEnvelop): Promise<void> {
        this.receivedMessages.push(envelop);
    }
}
